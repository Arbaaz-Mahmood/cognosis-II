import { Session } from "../session";
import { AgentConfig } from "./AgentConfig";
import { Agent } from "./agent";
import * as express from 'express';

export class AgentRegistry {
  private static agents: Map<string, (res: express.Response, config: AgentConfig) => Agent<Session>> = new Map();

  public static registerAgentFactory(name: string, agentFactory: (res: express.Response, config: AgentConfig) => Agent<Session>) {
    console.log(`Registering agent: ${name}`)
    this.agents.set(name, agentFactory);
  }

  public static getAgent(res: express.Response, config: AgentConfig, name: string): Agent<Session> | undefined {
    const factory = this.agents.get(name);
    return factory ? factory(res, config) : undefined;
  }

  public static getAgentNames(): string[] {
    return Array.from(this.agents.keys()).filter(name => {
      const agentFactory = this.agents.get(name);
      if (agentFactory) {
        const agent = agentFactory(null as any, null as any);
        return agent.visible;
      }
      return false;
    });
  }
}