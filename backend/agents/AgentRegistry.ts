import { Session } from "../session";
import { AgentConfig } from "./AgentConfig";
import { Agent, AgentSessionState } from "./agent";
import * as express from 'express';

export class AgentRegistry {
  private static agents: Map<string, (session: Session, res: express.Response, config: AgentConfig) => Agent<AgentSessionState>> = new Map();

  public static registerAgentFactory(agentFactory: (session: Session, res: express.Response, config: AgentConfig) => Agent<AgentSessionState>) {
    let name = agentFactory(null as any, null as any, null as any).getId();
    if (this.agents.has(name)) {
      throw new Error(`Agent with name ${name} is already registered.`);
    }
    console.log(`Registering agent: ${name}`);
    this.agents.set(name, agentFactory);
  }

  public static getAgent(session: Session, res: express.Response, config: AgentConfig, name: string): Agent<AgentSessionState> | undefined {
    const factory = this.agents.get(name);
    let agent = factory ? factory(session, res, config) : undefined;
    return agent;
  }

  public static getAgentNames(): string[] {
    return Array.from(this.agents.keys()).filter(name => {
      const agentFactory = this.agents.get(name);
      if (agentFactory) {
        const agent = agentFactory(null as any, null as any, null as any);
        return agent.visible;
      }
      return false;
    });
  }
}