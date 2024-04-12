import { Session } from "../session";
import axios from 'axios';
import fs from 'fs';

import * as express from 'express';
import dotenv from 'dotenv';
import { AgentConfig } from "./AgentConfig";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export class AgentSessionState {
}

export abstract class Agent< T extends AgentSessionState > {
    res: express.Response;
    visible: boolean = true;
    session: Session;

    constructor(session: Session, res: express.Response, protected config: AgentConfig) {
        this.res = res;
        this.session = session;
    }

    public abstract getId(): string;
    public abstract run(session: Session): Promise<void>;
    public sessionStateFactory(): T {
        return new AgentSessionState() as T;
    }

    public s(): T {
        if (!this.session.agentState.has(this.getId())) {
            throw new Error(`Agent ${this.getId()} does not have a session state`);
        }
        return this.session.agentState.get(this.getId()) as T;
    }

    async generateSpeech(str: string, voice: "onyx" | "shimmer"): Promise<string> {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/audio/speech',
                {
                    model: 'tts-1',
                    voice: voice,
                    input: str,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'stream',
                }
            );

            // Random filename
            const outputFilename = `speech-${Math.random().toString(36).substring(7)}.mp3`;
            const writeStream = fs.createWriteStream(outputFilename);
            response.data.pipe(writeStream);

            let p = new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            await p;
            return outputFilename;
        } catch (error: any) {
            console.error('Error generating speech:', error);
            return "";
        }
    }

    async generateSpeech11(str: string, voice: string): Promise<string> {
        try {
            const response = await axios.post(
                'https://api.elevenlabs.io/v1/text-to-speech/' + voice,
                {
                    text: str,
                    voice_settings: {
                        stability: 0,
                        similarity_boost: 0.25,
                        style_exaggeration: 1.0
                    }
                },
                {
                    headers: {
                        'xi-api-key': ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'stream',
                }
            );

            const outputFilename = `speech-${Math.random().toString(36).substring(7)}.mp3`;
            const writeStream = fs.createWriteStream(outputFilename);
            response.data.pipe(writeStream);

            let p = new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            await p;
            return outputFilename;
        } catch (error: any) {
            console.error('Error generating speech with ElevenLabs:', error);
            return "Error generating speech";
        }
    }

    public async sendAudio(audioData: Buffer): Promise<void> {
        this.res.write(`data: ${JSON.stringify({ type: 'audio', data: audioData.toString('base64') })}\n\n`);
    }
}