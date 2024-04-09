
import { Session } from "../session";
import axios from 'axios';
import fs from 'fs';

import * as express from 'express';
import dotenv from 'dotenv';
import { AgentConfig } from "./AgentConfig";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


export abstract class Agent<T extends Session> {
    res: express.Response;
    visible: boolean = true;
    
    constructor(res: express.Response, protected config: AgentConfig) {
        this.res = res;
    }
    
    public abstract run(session: T): Promise<void>;

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
            return "<error>";
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
                        'xi-api-key': '976e8c1ee950f36360931692b64e5ae5',
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
            return "<error>";
        }
    }

    public async sendAudio(audioData: Buffer): Promise<void> {
        this.res.write(`data: ${JSON.stringify({ type: 'audio', data: audioData.toString('base64') })}\n\n`);
    }
}
