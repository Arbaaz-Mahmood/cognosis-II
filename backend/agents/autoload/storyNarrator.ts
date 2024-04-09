import { Session } from "../../session";
import { Agent } from "../agent";
import * as fs from 'fs';

export class StoryNarratorSession extends Session {
}

export class StoryNarrator extends Agent<StoryNarratorSession> {
  public async run(session: Session): Promise<void> {
    let storyOutput = await session.llm([
      ...session.messages,
      {
        "role": "system",
        "content": `You are a children's story narrator. Your task is to create engaging and imaginative stories for children, with a unique twist - at the end of each story, the main character unexpectedly transforms into a mushroom. The stories should captivate the children's attention, spark their creativity, and deliver a fun and delightful ending with the surprising mushroom transformation.`,
      },
    ], {
      max_tokens: 1500, // Further increased max_tokens for longer stories
      temperature: 0.9, // Higher temperature for more creative outputs
      onToken: async (token: string) => {
        await session.send(token);
      },
    });

    session.messages.push({ role: 'assistant', content: storyOutput });

    // Generate audio for the story
    const audioFilename = await this.generateSpeech11(storyOutput, "wGabo1CsC6j7qhuPOSsw"); // Use ElevenLabs TTS for better quality
    const audioData = fs.readFileSync(audioFilename);
    await this.sendAudio(audioData);
    fs.unlinkSync(audioFilename); // Remove the temporary audio file
  }
}

import { AgentRegistry } from '../AgentRegistry';
import { AgentConfig } from "../AgentConfig";
import express from 'express';

AgentRegistry.registerAgentFactory('StoryNarrator', (res: express.Response, options: AgentConfig) => (new StoryNarrator(res, options)));