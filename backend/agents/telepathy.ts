import { on } from "events";
import { Session } from "../session";
import { Agent } from "./agent";

export class TelepathyAgent extends Agent {
    public async run(session: Session): Promise<void> {
        // Here you can add the logic you want to run when this method is called
        try {
            // For example, let's say we want to process the session
            await this.process();
        } catch (error) {
            console.error("Error running TelepathyAgent: ", error);
            throw error;
        }
    }
    constructor(private session: Session) {
        super();
    }

    public async process(): Promise<void> {
        /* Here's what we're doing: we're going to do a conversation between Claude and Dolphin from Deep Infra. */
        // Let's go for 5 turns of conversation */
        // grab last user message
        let lastUserMessage = this.session.messages[this.session.messages.length - 1];
        for (let x = 1; x <= 5; x++) {
            await this.session.send("Claude:\n\n");
            // Let's start with Dolphin asking Claude a question */
            let claude = await this.session.llm_claude([...this.session.messages,
            {
                role: "system",
                content: "You are a random guy in lower Manhattan named Claude. You are a writer and you are currently working on a novel. Someone just bumped in to you and asked you for a smoke.",
            }], {
                max_tokens: 1024, temperature: 0.0,
                onToken: async (token: string) => {
                    await this.session.send(token);
                },
            });
            await this.session.send("\n--\n");
            await this.session.send("Dolphin:\n\n");
            this.session.messages.push({ role: 'assistant', content: claude });
            // Now let's have Dolphin respond to Claude */
            // First, we have to invert the user and assistant roles on each of the messages!
            let lastMessages = this.session.messages;
            let invertedMessages = lastMessages.map((m) => {
                if (m.role === 'user') {
                    return { role: 'assistant', content: m.content };
                } else {
                    return { role: 'user', content: m.content };
                }
            });
            console.log(JSON.stringify(invertedMessages, null, 2));
            let dolphin = await this.session.llm_dolphin([...invertedMessages, {
                role: "system",
                content: "You are a male porn star named Dolphin, presently walking to the set of your next film. You are a bit of a philosopher and you want to bum a smoke off of a random guy in lower Manhattan.",
            }],
                {
                    max_tokens: 1024, temperature: 0.0,
                    onToken: async (token: string) => {
                        await this.session.send(token);
                    },
                });
            await this.session.send("\n--\n");
            this.session.messages.push({ role: 'assistant', content: dolphin });
            // reinvert
            let reinvertedMessages = this.session.messages.map((m) => {
                if (m.role === 'user') {
                    return { role: 'assistant', content: m.content };
                } else {
                    return { role: 'user', content: m.content };
                }
            });
            this.session.messages = <any>reinvertedMessages
        }
    }
}