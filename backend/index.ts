
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import multer from 'multer';
import * as db from './Database';
import { Session } from './session';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import { Null } from './agents/autoload/null';
import { AgentRegistry } from './agents/AgentRegistry';
import { AgentConfig } from './agents/AgentConfig';

dotenv.config();

const ENABLED_AGENTS = process.env.ENABLED_AGENTS ? process.env.ENABLED_AGENTS.split(',') : [];

import path from 'path';

// Automatically load and register agents
const agentsDir = path.join(__dirname, 'agents/autoload');
fs.readdirSync(agentsDir).forEach((file) => {
  if (file.endsWith('.ts')) {
    require(path.join(agentsDir, file));
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const app = express();
const PORT = 3001;
let sessions = new Map<string, Session>();
const fingerprintTable = new db.FingerprintTable();
const messageTable = new db.SessionMessageTable();
const completionTable = new db.CompletionTable();

app.use(bodyParser.json());

async function runAgent(req: any, res: any) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Transfer-Encoding': 'chunked',
  });
  res.flushHeaders();

  let { sessionId, message, fingerprint, avatar, sex_orientation, gender } = req.query;
  // Remove the avatar prefix from the sessionId if it exists
  sessionId = (sessionId as string).replace(/_avatar\d+/, '');

  console.log('sessionId:', sessionId);
  await fingerprintTable.saveFingerprint(fingerprint as string, sessionId as string);

  res.chunkedEncoding = true;

  let session = sessions.get(sessionId as string);
  if (!session) {
    session = new Session(sessionId as string, res, avatar as string);
    sessions.set(sessionId as string, session);

    // Create the session entry in the "sessions" table
    const sessionTable = new db.SessionTable();
    await sessionTable.addSession(sessionId as string, avatar as string);
  }
  session.res = res;
  session.messages.push({ role: 'user', content: message as string });
  await messageTable.addMessage(sessionId as string, avatar as string, 'user', message as string);

  let agent;
  // Does the user message contain a global-level /slash command?
  let runAgent = true;
  if (message.startsWith('/')) {
    const [command, ...args] = message.split(' ');
    if (command === '/reset') {
      session.messages = [];
      session = new Session(sessionId as string, res, avatar as string);
      sessions.set(sessionId as string, session);
      runAgent = false;
    }
  }

  if (runAgent) {
    console.log(`Running agent ${avatar} for session ${sessionId} with message: ${message}`)
    let agent = AgentRegistry.getAgent(session, res, {} as AgentConfig, avatar as string);
    if (!agent) {
      console.log('No agent found for', avatar);
      await session.send(`No agent found for ${avatar}\n\n`).catch(e => console.error(e));
      agent = new Null(session, res, {} as AgentConfig);
    }

    let state = agent.sessionStateFactory();
    session.agentState.set(agent.getId(), state);

    try {
      await agent!.run(session);
      if (session.messages.length > 0) {
        let lastMessage = session.messages[session.messages.length - 1];
        console.log('💥💥💥 Absolute Baller Log 💥💥💥: Last message from session:', lastMessage, '💥 This log is 100x more baller than your average log! 💥');
        console.log('Session ID:', sessionId, 'Avatar:', avatar, 'Last Message Role:', lastMessage.role, 'Last Message Content:', lastMessage.content);
        await messageTable.addMessage(sessionId as string, avatar as string, lastMessage.role, lastMessage.content);

        // Log the completion
        await session.logCompletion(
          session.messages,
          session.baseSystemPrompt.content,
          { temperature: 0.7, max_tokens: 256 }, // Replace with actual settings used
          lastMessage.role,
          lastMessage.content
        );
      }
    } catch (e) {
      console.error(e);
      session.send("Error: `" + e + "`").catch(e => console.error(e));
    }
  }

  res.end();
}

app.get('/api/chat-stream', async (req, res) => {
  runAgent(req, res);
});

app.get('/api/messages', async (req, res) => {
  let { sessionId, avatar } = req.query;

  console.log('Retrieving messages for session:', sessionId, 'and avatar:', avatar);

  // Remove the avatar prefix from the sessionId if it exists
  sessionId = (sessionId as string).replace(/_avatar\d+/, '');

  const messages = await messageTable.getMessagesBySessionId(sessionId as string, avatar as string);
  console.log('Retrieved messages:', messages);
  res.json(messages);
});

const upload = multer({ dest: 'uploads/' });
app.post('/api/audio', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No audio file uploaded');
  }

  let audioFilePath = req.file.path;
  // Make a copy of it
  fs.copyFileSync(audioFilePath, `${req.file.filename}.ogg`);
  console.log('Audio file uploaded:', audioFilePath);
  audioFilePath = `${req.file.filename}.ogg`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const transcription = response.data.text;
    console.log('Transcription:', transcription);
    res.json({ transcription });
  } catch (error: any) {
    console.error('Error transcribing audio:', error.response.data);
    res.status(500).send('Error transcribing audio');
  } finally {
    // Delete the uploaded audio file
    fs.unlinkSync(audioFilePath);
  }
});

app.get('/api/agents', (req, res) => {
  const agentNames = AgentRegistry.getAgentNames();
  res.json({ agents: agentNames });
});


const sessionTable = new db.SessionTable();
sessionTable.initialize().then(() => {
  messageTable.initialize().then(() => {
    completionTable.initialize().then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }).catch((error: any) => {
      console.error('Error initializing the completions table:', error);
    });
  }).catch((error: any) => {
    console.error('Error initializing the message table:', error);
  });
}).catch((error: any) => {
  console.error('Error initializing the session table:', error);
});
