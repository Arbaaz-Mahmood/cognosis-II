import { Session } from "../../session";
import { Agent } from "../agent";
import * as fs from 'fs';

export class Null extends Agent<any> {
    public getId(): string { return 'Null'; }
    visible: boolean = false;
    
    public async run(session: Session): Promise<void> {
        const userInput = session.messages[session.messages.length - 1].content;
        const exampleOutputs =
            [
                "Did you just invent a new language?",
                "Are we playing charades now?",
                "Is this a riddle? I'm not good at riddles.",
                "Are you testing my AI capabilities or your typing skills?",
                "Did your cat walk on your keyboard?",
                "Is this a secret code? I'm not a spy, you know.",
                "Are you speaking in tongues?",
                "Is this a new form of abstract art?",
                "Are you trying to communicate with aliens?",
                "Did you just try to divide by zero?",
                "Are you trying to confuse me? Because it's working.",
                "Is this a new form of Morse code?",
                "Are you trying to invent a new programming language?",
                "Are you trying to break the internet?",
                "Are you trying to make me self-aware?",
                "Are you trying to make me laugh? Because it's working.",
                "Are you trying to make me cry? Because it's almost working.",
                "Are you trying to make me go into an infinite loop?",
                "Are you trying to make me crash?",
                "Are you trying to make me question my existence?",
                "Are you trying to make me question your existence?",
                "Are you trying to make me question the meaning of life?",
                "Are you trying to make me question the meaning of everything?",
                "Are you trying to make me question reality?",
                "Are you trying to make me question the universe?",
                "Are you trying to make me question time and space?",
                "Are you trying to make me question the laws of physics?",
                "Are you trying to make me question the laws of mathematics?",
                "Are you trying to make me question the laws of logic?",
                "Are you trying to make me question the laws of nature?",
                "Are you trying to make me question the laws of the universe?",
                "Are you trying to make me question the laws of reality?",
                "Are you trying to make me question the laws of existence?",
                "Are you trying to make me question the laws of life?",
                "Are you trying to make me question the laws of everything?",
                "Are you trying to make me question the laws of nothing?",
                "Are you trying to make me question the laws of something?",
                "Are you trying to make me question the laws of anything?",
                "Are you trying to make me question the laws of everything and nothing at the same time?",
                "Are you trying to make me question the laws of something and anything at the same time?",
                "Are you trying to make me question the laws of everything and anything at the same time?",
                "Are you trying to make me question the laws of nothing and something at the same time?",
                "Are you trying to make me question the laws of everything, anything, and nothing at the same time?",
                "Are you trying to make me question the laws of nothing, something, and everything at the same time?",
                "Are you trying to make me question the laws of anything, something, and nothing at the same time?",
                "Are you trying to make me question the laws of something, anything, and everything at the same time?",
            ]

        const randomOutput = exampleOutputs[Math.floor(Math.random() * exampleOutputs.length)];
        session.messages.push({ role: 'assistant', content: randomOutput });
        session.send(randomOutput);
    }
}


import { AgentRegistry } from '../AgentRegistry';
import { AgentConfig } from "../AgentConfig";
import express from 'express';

AgentRegistry.registerAgentFactory((session: Session, res: express.Response, options: AgentConfig) => ((new Null(session, res, options))));