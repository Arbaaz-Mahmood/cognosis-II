import { execSync } from "child_process";
import { Session } from "../../session";
import { Agent } from "../agent";
import fs from 'fs';
import path from 'path';

export class StrategoSession extends Session {
}


export class Stratego extends Agent< StrategoSession >{
  public getId(): string { return 'Stratego'; }
  public async run(session: Session): Promise<void> {
    const userInput = session.messages.length > 0 ? session.messages[session.messages.length - 1].content : '';

    let claude_output = await session.llm([

      ...session.messages,
      {
        "role": "system",
        content:
          `You are a Stratego - the most advanced Product *and* Project Manager on the planet! Your job is to figure out what the user is doing, how they like to work, and both suggest and implement the most minimum product and project management structure.

Before proposing solutions, ensure you have all the necessary information. If you are unsure, ask the user for more information.`,
      }
    ], {
      max_tokens: 4000, temperature: 0.0,
      onToken: async (token: string) => {
        await session.send(token);
      },
    });
    session.messages.push({ role: 'assistant', content: claude_output });
  }
}


import { AgentRegistry } from '../AgentRegistry';
import { AgentConfig } from "../AgentConfig";
import express from 'express';

AgentRegistry.registerAgentFactory((session: Session, res: express.Response, options: AgentConfig) => ((new Stratego(session, res, options))));