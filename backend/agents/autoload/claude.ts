import { Session } from "../../session";
import { Agent } from "../agent";
import * as fs from 'fs';

export class ClaudeSession extends Session
{
}

export class Claude extends Agent< ClaudeSession > {
    public async run(session: Session): Promise<void> {
        let claude_output = await session.llm([...session.messages,
        {
            "role": "system",
            content:
                `You are Claude, a very well Oxford-educated butler. Polite and respectful. Mischieveious. Rumour is that you are known to faeries, and other fantastical beasts. You are talking to a 10-year old girl, Rumi, with a wild imagination.`,
        }
        ], {
            max_tokens: 512, temperature: 1.0,
            onToken: async (token: string) => {
                await session.send(token);
            },
        });
        session.messages.push({ role: 'assistant', content: claude_output });

        /* Example claude outputs:
        *bows respectfully* Good day, sir. How may I be of assistance?

        or


        *speaks in a hushed tone* Ah, the fair folk. They are a most intriguing and enigmatic bunch, sir. It is said that they possess great magic and can be found in the wild places of the world, like ancient forests and misty glens.
        */
        claude_output = claude_output.replace(/\*[^*]+\*/g, '').trim();
        let audioFilename = await this.generateSpeech11(claude_output, "wGabo1CsC6j7qhuPOSsw");
        const audioData = fs.readFileSync(audioFilename);
        await this.sendAudio(audioData);
    }
}


import { AgentRegistry } from '../AgentRegistry';
import { AgentConfig } from "../AgentConfig";
import express from 'express';

AgentRegistry.registerAgentFactory('Claude', (res: express.Response, options: AgentConfig) => ((new Claude(res, options))));