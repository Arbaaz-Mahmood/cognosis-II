import { execSync } from "child_process";
import { Session } from "../../session";
import { Agent } from "../agent";
import fs from 'fs';
import path from 'path';
import { DOMParser } from 'xmldom';
import dotenv from 'dotenv';
dotenv.config();
import { ESLint, Linter } from 'eslint';
import os from 'os';
import { parseCodeToAST } from "../ast";


export class ApexSession extends Session {
}

export class Apex extends Agent<ApexSession> {

    code_messages: any[] = [];
    root_dir = process.env.ROOT_CODE_PATH ?? "../";

    private escapeSpecialChars(str: string): string {
        return str.replace(/[\\'"]/g, '\\$&');
    }

    private convertToDSL(json: Array<[string, any]>, indentation: string = '  '): string {
        let dsl = '';

        for (const [filePath, fileData] of json) {
            dsl += `file ${this.escapeSpecialChars(filePath)} {\n`;

            for (const className of fileData.classes || []) {
                dsl += `${indentation}class ${this.escapeSpecialChars(className.name)} {}\n`;
            }

            for (const method of fileData.methods || []) {
                const paramList = method.parameters
                    .map((param: { name: string; type: string; }) => `${this.escapeSpecialChars(param.name)}${param.type ? `: ${this.escapeSpecialChars(param.type)}` : ''}`)
                    .join(', ');
                const returnType = method.returnType ? ` -> ${this.escapeSpecialChars(method.returnType)}` : '';
                dsl += `${indentation}method ${this.escapeSpecialChars(method.name)}(${paramList})${returnType} {}\n`;
            }

            for (const interfaceName of fileData.interfaces || []) {
                dsl += `${indentation}interface ${this.escapeSpecialChars(interfaceName.name)} {}\n`;
            }

            for (const typeName of fileData.types || []) {
                dsl += `${indentation}type ${this.escapeSpecialChars(typeName)} {}\n`;
            }

            dsl += '}\n\n';
        }

        return dsl.trim();
    }

    private getCodebaseFiles(fileExtensions: string[]): string[] {
        const files: string[] = [];
        const excludedDirectories = ["node_modules", ".git"];
        const excludedFileExtensions = [".md", "package.json"];

        const isExcludedDirectory = (dirPath: string) =>
            excludedDirectories.some((excludedDir) =>
                dirPath.includes(`/${excludedDir}/`)
            );

        const isExcludedFile = (filePath: string) =>
            excludedFileExtensions.some((excludedExt) =>
                filePath.endsWith(excludedExt)
            );

        const traverseDirectory = (directory: string) => {
            if (isExcludedDirectory(directory)) {
                return;
            }

            const entries = fs.readdirSync(directory, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);

                if (entry.isDirectory()) {
                    traverseDirectory(fullPath);
                } else if (
                    fileExtensions.includes(path.extname(entry.name)) &&
                    !isExcludedFile(fullPath)
                ) {
                    files.push(fullPath);
                }
            }
        };

        traverseDirectory(path.resolve(__dirname, this.root_dir));

        return files;
    }

    public async run(session: ApexSession): Promise<void> {
        const userInput = session.messages.length > 0 ? session.messages[session.messages.length - 1].content : '';
        const tempDir = path.join(os.tmpdir(), `apex-${session.id}`);
        fs.mkdirSync(tempDir, { recursive: true });

        if (userInput === '/codebase') {
            if (session.messages.length > 0) {
                session.messages.pop();
            }
            session.includeCodebase = !session.includeCodebase;
            await session.send(`Codebase inclusion is now ${session.includeCodebase ? 'enabled' : 'disabled'}.`);

            return;
        }

        execSync(`sh agents/apex/concatenate-code.sh ${this.root_dir} ${tempDir}`);
        let code_txt = fs.readFileSync(path.resolve(tempDir, 'code.txt'), 'utf-8');
        const fileExtensions = [".ts", ".tsx", ".js", ".jsx"];
        const codebaseFiles = this.getCodebaseFiles(fileExtensions);
        const astCache = new Map<string, any>();

        for (const file of codebaseFiles) {
            const fileContent = fs.readFileSync(file, "utf-8");
            const ast = parseCodeToAST(fileContent, file);
            astCache.set(file, ast);
        }
        const prettyAST = this.convertToDSL(Array.from(astCache.entries()));

        if (userInput.startsWith('/mcontext')) {
            if (session.messages.length > 0) {
                session.messages.pop();
            }
            const args = userInput.slice('/mcontext'.length).trim().split(' ');
            await this.handleMultiContext(session, args);
            return;
        }

        if (userInput.startsWith('/context')) {
            if (session.messages.length > 0) {
                // session.messages.pop();
            }

            if (session.customContext != null) {
                session.customContext = null;
                session.send(`🚨 Custom context cleared.\n\n`)
                return;
            }

            session.send(`🚀 Initiating context extraction...\n\n`);
            this.code_messages = [
                {
                    "role": "user",
                    "content": session.customContext ? session.customContext : code_txt,
                },
                {
                    "role": "assistant",
                    "content": "Code base loaded. What do you need help with?",
                },
            ];

            let custom_context_files = await session.llm_claude([
                ...this.code_messages,
                ...session.messages,
                {
                    "role": "system",
                    content:
                        `Return the list of all files which may be implicated in this user request as a flat JSON list like this:
\`\`\`
[ "src/main.c", "Makefile", "README.md" ]
\`\`\`

Output control: 
`,
                },
                "claude-3-sonnet-20240307"
            ], {
                max_tokens: 4000, temperature: 1.0,
                onToken: async (token: string) => {
                    await session.send(token);
                },
            });
            let files: any;
            try {
                files = JSON.parse(await this.stripEverythingButTheContent(custom_context_files))
            }
            catch (e) {
                return;
            }

            // Initialize an empty string to hold the codebase content
            let codebaseContent = '';

            // Parse the code_txt file using DOMParser
            let codebase = new DOMParser().parseFromString(code_txt, 'text/xml');
            let codeElements = codebase.getElementsByTagName('code');

            // Create a map for quick lookup of file content
            let fileContentMap = new Map<string, string>();
            for (let i = 0; i < codeElements.length; i++) {
                let filename = codeElements[i].getAttribute('filename');
                let fileContent = codeElements[i].textContent;
                if (filename && fileContent) {
                    fileContentMap.set(filename, fileContent);
                }
            }

            // Iterate over the files and append the content to codebaseContent
            for (let file of files) {
                if (fileContentMap.has(file)) {
                    codebaseContent += fileContentMap.get(file) + '\n';
                }
            }

            // Log the result
            if (codebaseContent === '') {
                console.log('No matching files found in the codebase.');
            } else {
                console.log('Codebase content:', codebaseContent);
            }
            session.customContext = codebaseContent;
            session.send(`\n\n🎉 Context extraction completed!\n`);
            return;
        }

        if (session.includeCodebase) {
            this.code_messages = [
                {
                    "role": "user",
                    "content": session.customContext ? session.customContext : code_txt,
                },
                {
                    "role": "assistant",
                    "content": "Code base loaded. What do you need help with?",
                },
            ];
        } else {
            this.code_messages = [];
        }

        if (userInput.startsWith("/w")) {
            // just remove the last msg actually
            session.messages.pop();
            let additionalInstructions: string | null = userInput.slice(3).trim();
            if (additionalInstructions && additionalInstructions.length > 0) {
                additionalInstructions = additionalInstructions.trim();
            }
            else
                additionalInstructions = null;
            await this.writeFiles(session, additionalInstructions);
            return;
        }
        const ast = prettyAST;
        await session.send("Apex loading...");
        let firstToken = false;
        let claude_output = await session.llm([

            ...this.code_messages,
            ...session.messages,
            {
                "role": "system",
                content:
                    `You are a Apex - the most masterful coding AI agent on the planet. Your job is to assist the user in their coding needs. You need to think about how the application is used as the various transactions that flow through a system. Problem solve at the level of a distributed system comprised of components, bounadaries, and interfaces by which data flows.

Don't make assumptions. Before proposing solutions, ensure you have all the necessary information. If you are unsure, ask the user for more information.
Here is the AST of the codebase: ${ast} `,
            }
        ], {
            max_tokens: 4000, temperature: 1.0,
            onToken: async (token: string) => {
                if (firstToken === false) {
                    firstToken = true;
                    await session.send("😎\n");
                }
                await session.send(token);
            },
        });
        session.messages.push({ role: 'assistant', content: claude_output });
    }

    public async stripEverythingButTheContent(s: string): Promise<string> {
        const codeBlockStart = s.indexOf("```"); if (codeBlockStart === -1) { return s; }

        // Find the end of the opening code block marker
        let codeBlockContentStart = codeBlockStart + 3;
        const newlineAfterOpeningMarker = s.indexOf("\n", codeBlockContentStart);
        if (newlineAfterOpeningMarker !== -1) {
            codeBlockContentStart = newlineAfterOpeningMarker + 1;
        }

        // Find the closing code block marker
        const codeBlockEnd = s.indexOf("```", codeBlockContentStart);
        if (codeBlockEnd === -1) {
            throw new Error("No closing code block marker found in the provided string.");
        }

        const codeBlockRawContent = s.substring(codeBlockContentStart, codeBlockEnd).trim();
        return codeBlockRawContent;
    }

    public async writeFiles(session: Session, additionalInstructions: string | null): Promise<void> {
        if (additionalInstructions) {
            additionalInstructions = `\n\n<AdditionalInstructions>\n${additionalInstructions}\n</AdditionalInstructions>\n`;
        } else {
            additionalInstructions = "";
        }

        session.send(`🚀 Initiating file rematerialization...\n`);

        let messages = [
            ...this.code_messages,
            ...session.messages,
            {
                "role": "system",
                content:
                    `You are Apex - the most masterful coding AI agent on the planet. Your job is to assist the user in their coding needs. You need to think about how the application is used as the various transactions that flow through a system. Problem solve at the level of a distributed system comprised of components, boundaries, and interfaces by which data flows.
               Before proposing solutions, ensure you have all the necessary information. If you are unsure, ask the user for more information.${additionalInstructions}`,
            },
            {
                "role": "user",
                "content": `Analyze the conversation, and return the list of created and changed files in the codebase as a flat JSON list like this:
              \`\`\`
              [ "src/main.c", "Makefile", "README.md" ]
              \`\`\``,
            }
        ];

        let claude_output = await session.llm_claude(messages, {
            max_tokens: 4000, temperature: 0.0,
            onToken: async (token: string) => {
                await session.send(token);
            },
        }, "claude-3-opus-20240229");

        try {
            let files: any;
            try {
                files = JSON.parse(await this.stripEverythingButTheContent(claude_output));
            } catch (e) {
                files = [];
            }

            // files should NEVER write any package.json, package.log
            files = files.filter((file: string) => !file.includes("package.json") && !file.includes("package-lock.json") && !file.includes('.env'));

            let writeFiles = new Map<string, string>();

            for (let file of files) {
                await session.send(`\n🚀 Initiating file reconstruction for *${file}*...`);
                let firstToken = true;
                let tokenCount = 0;
                let file_output = await session.llm_claude([
                    ...this.code_messages,
                    ...session.messages,
                    {
                        "role": "user",
                        "content": `I lost the original ${file} file. Please produce a new, complete implementation with the discussed improvements. Output the complete implementation's code with discussed improvements inside <code></code> tags.`,
                    },
                ], {
                    max_tokens: 4000, temperature: 1.0,
                    onToken: async (token: string) => {
                        if (firstToken === true) {
                            firstToken = false;
                            await session.send("🚀 Launching file reconstruction...\n");
                        }
                        tokenCount++;
                        if (tokenCount % 400 === 0) {
                            const emojis = ["📝", "🔧", "🔨", "🚀", "💻", "📚", "📈"];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            await session.send(randomEmoji + " ");
                        }
                    },
                }, "claude-3-sonnet-20240229");

                await session.send("\n🎉 File reconstruction completed!\n");

                let fo = await this.stripEverythingButTheContent(file_output);
                let codeBlocks = fo.split(/<code>([\s\S]*?)<\/code>/g);
                let codeContent = "";

                for (let i = 1; i < codeBlocks.length; i += 2) {
                    codeContent += codeBlocks[i].trim() + "\n";
                }

                writeFiles.set(file, codeContent.trim());
                session.send(`🎉🎉🎉 *${file}* has been successfully reconstructed!\n`);
            }

            writeFiles.forEach((value, key) => {
                session.send(`🚀 Writing file: *${key}*...\n`);
                fs.writeFileSync(path.resolve(this.root_dir, key), value);
            });
        } catch (e) {
            console.log("Error:", e);
            session.send(`🚨 Error encountered: ${e}`);
        }

        session.send(`\n🎉 File rematerialization completed!\n`);
    }

    private async getConsoleErrors(): Promise<string[]> {
        const eslint = new ESLint();
        const results = await eslint.lintFiles([this.root_dir]);

        const errorMessages: string[] = [];

        results.forEach((result: { errorCount: number; messages: Linter.LintMessage[]; filePath: any; }) => {
            if (result.errorCount > 0) {
                result.messages.forEach((message) => {
                    if (message.severity === 2) {
                        const errorMessage = `${result.filePath}:${message.line}:${message.column} - ${message.message}`;
                        errorMessages.push(errorMessage);
                    }
                });
            }
        });

        return errorMessages;
    }

    private async handleMultiContext(session: ApexSession, args: string[]): Promise<void> {
        const tempDir = path.join(os.tmpdir(), `apex-${session.id}`);
        fs.mkdirSync(tempDir, { recursive: true });
        execSync(`sh agents/apex/concatenate-code.sh ${this.root_dir} ${tempDir}`);
        let codebaseContent = fs.readFileSync(path.resolve(tempDir, 'code.txt'), 'utf-8');
        const codebase = new DOMParser().parseFromString(codebaseContent, 'text/xml');
        const codeElements = codebase.getElementsByTagName('code');

        const selectedFiles: string[] = [];

        for (const arg of args) {
            if (arg.includes('*')) {
                // Wildcard pattern
                const regex = new RegExp(arg.replace(/\*/g, '.*'));
                for (let i = 0; i < codeElements.length; i++) {
                    const filename = codeElements[i].getAttribute('filename');
                    if (filename && regex.test(filename)) {
                        selectedFiles.push(filename);
                    }
                }
            } else {
                // File path
                const filePath = path.resolve(this.root_dir, arg);
                if (fs.existsSync(filePath)) {
                    selectedFiles.push(arg);
                } else {
                    session.send(`⚠️ File not found: ${arg}`);
                }
            }
        }

        if (selectedFiles.length === 0) {
            session.send('❌ No matching files found for the provided context.');
            return;
        }

        session.send(`✅ Matching files for the provided context:\n${selectedFiles.map(file => `- ${file}`).join('\n')}`);

        let contextContent = '';
        for (const file of selectedFiles) {
            const fileElement = Array.from(codeElements).find(element => element.getAttribute('filename') === file);
            if (fileElement) {
                contextContent += fileElement.textContent + '\n';
            }
        }

        session.customContext = contextContent;
        session.send('🎉 Context updated successfully!');
    }

    constructor(res: express.Response, protected config: AgentConfig) {
        super(res, config);
    }
}

import { AgentRegistry } from '../AgentRegistry';
import { AgentConfig } from "../AgentConfig";
import express from 'express';

AgentRegistry.registerAgentFactory('Apex', (res: express.Response, options: AgentConfig) => ((new Apex(res, options))));
