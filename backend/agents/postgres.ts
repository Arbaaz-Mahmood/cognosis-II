import { Session } from "../session";
import { Agent } from "./agent";
import fs from 'fs';
import { Client } from 'pg';
import { AgentRegistry } from './AgentRegistry';
import { AgentConfig } from "./AgentConfig";
import express from 'express';
import dotenv from 'dotenv';


export class Postgresql extends Agent< any > {
    public getId(): string {
        return 'Postgresql';
    }
    private client: Client;

    constructor(session: Session, res: express.Response) {
        dotenv.config();

        super(session, res, {} as any );

        this.client = new Client({
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            host: process.env.PG_HOST,
            database: process.env.PG_DATABASE,
            port: Number(process.env.PG_PORT) || 5432, // Default PostgreSQL port
        });
    }

    public async run(session: Session): Promise<void> {
        const userInput = session.messages[session.messages.length - 1].content;
        let messages = [...session.messages];

        try {
            await this.client.connect();

            for (let x = 1; x <= 5; x++) {
                // Ask Claude what to do
                let claud_resp = await session.llm_claude([...messages,
                {
                    role: "system",
                    content:
                        `You are a PostgreSQL execution machine. You take in user requests, and turn them into PostgreSQL commands. If you want to learn about the schema, you're going to have to execute PostgreSQL commands. You can do this by using this output:

<postgresql> select ai_insights from campaign_interviews where campaign_id = '9b964261-b1ff-4fac-b626-2983b0b7abc6' and completed_reason = 'completed' </postgresql>

Otherwise, just speak beautiful markdown. If there is nothing more to do on a query, just say "done" and I will stop asking you to execute queries.`,
                },
                ]);

                session.send(claud_resp);
                session.messages.push({ role: 'assistant', content: claud_resp });
                /* Grab anything inside <postgres> */
                let postgres_command = claud_resp.match(/<postgresql>([\s\S]*?)<\/postgresql>/);
                if (postgres_command) {
                    // Execute the user's query
                    let resp = `Query executed successfully. Results:\n\n`;
                    const result = await this.client.query(postgres_command[1]).catch((error) => { return { shit: "fuck", error: error } });
                    // Search for error in result
                    if ((<any>result)["error"]) {
                        resp = `Failure:\n<error>\n${(<any>result).error}\n</error>\n`;
                    }
                    else {
                        // Generate the response based on the query result
                        // Send result as a markdown table
                        resp += '|';
                        for (let col of (<any>result).fields) {
                            resp += ` ${col.name} |`;
                        }
                        resp += '\n';
                        resp += '|';
                        for (let col of (<any>result).fields) {
                            resp += ' --- |';
                        }
                        resp += '\n';
                        for (let row of (<any>result).rows) {
                            resp += '|';
                            for (let col of (<any>result).fields) {
                                resp += ` ${row[col.name]} |`;
                            }
                            resp += '\n';
                        }
                    }
                    session.send(resp);

                    session.messages.push({ role: 'user', content: resp });
                }
                else {
                    break;
                }
            }
        } catch (error: any) {
            console.error('Error executing query:', error);
            let resp = `An error occurred while executing the query: ${error.message}`;
            session.messages.push({ role: 'assistant', content: resp });
        } finally {
            await this.client.end();
        }
        fs.appendFileSync('log.txt', JSON.stringify(session.messages, null, 2));
    }
}

AgentRegistry.registerAgentFactory((session: Session, res: express.Response, options: AgentConfig) => ((new Postgresql(session, res))) );