# Apex User Guide

Apex is an advanced AI coding assistant designed to help you with your coding needs. It can understand your codebase, answer questions, provide explanations, and offer suggestions for improvements or bug fixes.

## Getting Started

To start using Apex, simply open your chat interface and select the "Apex" avatar. Apex will load your codebase and be ready to assist you.

## Asking Questions

You can ask Apex any question related to your codebase. Apex will analyze the relevant files and provide a detailed response. Some examples of questions you can ask:

- "How does the user authentication system work?"
- "What is the purpose of the `SessionManager` class?"
- "How can I improve the performance of the database queries?"

Apex will do its best to understand your question and provide an accurate and helpful response.

## Requesting Explanations

If you come across a piece of code that you don't understand, you can ask Apex to explain it to you. Simply copy and paste the code snippet into the chat, and Apex will provide a detailed explanation of what the code does and how it works.

## Suggesting Improvements

Apex can also offer suggestions for improving your codebase. If you have a specific piece of code that you think could be optimized or refactored, you can ask Apex for suggestions. Apex will analyze the code and provide recommendations based on best practices and coding standards.

## Reporting Bugs

If you encounter a bug in your codebase, you can describe the issue to Apex and ask for help in identifying the cause and finding a solution. Provide as much detail as possible about the bug, including any error messages, expected behavior, and steps to reproduce the issue. Apex will investigate the problem and offer guidance on how to fix it.

## Special Commands

Apex supports a few special commands that you can use to control its behavior:

- `/codebase`: Toggles the inclusion of the codebase in Apex's responses. If enabled, Apex will have access to your entire codebase when answering questions. If disabled, Apex will only consider the conversation context.
- `/context <description of code you wish to include in context>`: Extracts relevant files from the codebase based on the current conversation context. This can be useful for focusing Apex's attention on specific parts of the codebase.
- `/w`: Instructs Apex to write the suggested changes to the actual files in your codebase. Use this command with caution, as it will modify your files.

## /mcontext Command

The `/mcontext` command allows you to manually specify files or wildcards for context inclusion. This is useful when you want to quickly add specific files to the context without waiting for the AI to determine the relevant context.

### Usage

/mcontext <file1> <file2> ... <wildcard1> <wildcard2> ...

- `<file1>`, `<file2>`, etc., are relative file paths within the codebase.
- `<wildcard1>`, `<wildcard2>`, etc., are wildcard patterns to match multiple files.

### Examples

- `/mcontext backend/agents/apex.ts backend/session.ts`: Includes the specified files in the context.
- `/mcontext *apex* backend/session.ts`: Matches files containing "apex" and the specific file "backend/session.ts".

The command will provide feedback on the matching files and update the context accordingly.


## Tips for Best Results

To get the most out of Apex, keep the following tips in mind:

- Be specific and clear in your questions and requests.
- Provide enough context for Apex to understand your intent.
- If Apex's response doesn't fully address your question, follow up with clarifying questions.
- Review Apex's suggestions carefully before applying them to your codebase.
- Use the special commands judiciously to control Apex's behavior as needed.

With Apex by your side, you can streamline your coding workflow, improve code quality, and overcome challenges more efficiently. Happy coding!