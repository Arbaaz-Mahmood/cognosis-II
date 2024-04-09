# Based GPT

Based GPT is an advanced AI-powered chat application that leverages state-of-the-art language models to deliver intelligent and context-aware responses to user queries. The application features a modular architecture, consisting of a backend server built with Express.js and TypeScript, and a sleek frontend user interface crafted with React.

## Key Features

- 🧠 Intelligent chat interface powered by cutting-edge language models
- 🎯 Context-aware responses tailored to user input and conversation history
- 🧩 Extensible architecture supporting multiple query planners and agents
- 🌊 Real-time streaming of AI-generated responses via Server-Sent Events (SSE)
- 💾 Persistent storage of session data and messages using SQLite

## Prerequisites

To run Based GPT, ensure that you have the following installed:

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/based-gpt.git
   ```

2. Navigate to the project directory:

   ```bash
   cd based-gpt
   ```

3. Install the dependencies for both the backend and frontend:

   ```bash
   npm install
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

## Configuration

1. Create a `.env` file in the `backend` directory and provide the necessary configuration:

   ```
   API_TOKEN=your_api_token
   ```

   Replace `your_api_token` with your actual API token.

2. Optionally, you can modify the `PORT` constant in `backend/index.ts` to change the port on which the backend server runs (default is 3001).

## Running the Application

1. Start the backend server:

   ```bash
   cd backend
   npm start
   ```

   The backend server will start running on `http://localhost:3001`.

2. In a separate terminal, start the frontend development server:

   ```bash
   cd frontend
   npm start
   ```

   The frontend server will start running on `http://localhost:3000`.

3. Open your web browser and visit `http://localhost:3000` to access the Based GPT chat application.

## Architecture Overview

Based GPT follows a client-server architecture, with the backend server handling chat logic, language model communication, and session management using SQLite. The frontend, built with React, communicates with the backend via HTTP requests and SSE for real-time updates.

The backend server is designed with extensibility in mind, allowing seamless integration of custom query planners and agents. The main components of the backend include:

- `Session`: Represents a chat session, manages conversation context and messages, and provides an interface for interacting with language models.
- `Agent`: An abstract base class for implementing custom agents that process user queries and generate responses.
- `QueryPlanner`: An abstract base class for implementing query planners that generate plans to solve user queries.
- `Database`: Provides an interface for interacting with the SQLite database to store and retrieve session data and messages.

The frontend is composed of several key components:

- `App`: The main component that serves as the entry point for the application. It manages the overall state and functionality of the chat interface.
- `ChatWindow`: Renders the chat messages and handles the display of user and assistant messages.
- `AvatarSelector`: Allows users to select an avatar for their chat session.
- `PreferencesPopup`: Enables users to set their preferences, such as theme and language.

## Writing Custom Agents

Based GPT allows you to write custom agents to handle specific tasks or domains. To create a new agent, follow these steps:

1. Create a new TypeScript file in the `backend/agents` directory, e.g., `my-agent.ts`.

2. Define a new class that extends the `Agent` abstract base class:

   ```typescript
   import { Session } from "../session";
   import { Agent } from "./agent";

   export class MyAgent extends Agent {
     public async run(session: Session): Promise<void> {
       // Implement the agent's logic here
     }
   }
   ```

3. Implement the `run` method to define the agent's behavior. The `session` parameter provides access to the current chat session, allowing you to retrieve user messages, send responses, and interact with language models.

4. Use the `session.llm` method to send messages to the language model and receive generated responses. Customize the parameters such as `temperature` and `max_tokens` to control the generation process.

5. Use the `session.send` method to send responses back to the client in real-time using SSE.

6. Register your custom agent in the `backend/index.ts` file by importing it and adding it to the list of available agents.

## APIs and Endpoints

Based GPT exposes several APIs and endpoints for interacting with the application:

- `/api/chat-stream`: Initiates a chat session and streams AI-generated responses in real-time using SSE.
- `/api/messages`: Retrieves the chat history for a specific session.
- `/api/audio`: Accepts audio files for transcription using the OpenAI Whisper API.

For detailed information on request/response formats and authentication requirements, please refer to the API documentation.

## Data Persistence

Based GPT uses SQLite to persist session data and messages. The `Database` classes in the `backend/Database.ts` file provide an interface for interacting with the SQLite database. The main tables used for data storage are:

- `sessions`: Stores information about chat sessions, including session ID and associated avatar.
- `session_messages`: Stores the messages exchanged within each chat session, including the message role (user or assistant) and content.

The `Session` class in `backend/session.ts` provides methods for loading and saving session data and messages to the database.

## Contributing

Contributions to Based GPT are welcome! If you encounter any issues or have suggestions for improvements, please open an issue or submit a pull request on the GitHub repository.

To contribute to the project, please follow these guidelines:

1. Fork the repository and create a new branch for your feature or bug fix.
2. Ensure that your code adheres to the project's coding style and conventions.
3. Write clear and concise commit messages explaining your changes.
4. Submit a pull request to the main repository, describing your changes and their benefits.

## Future Enhancements

Here are some potential enhancements and features planned for Based GPT:

- 🌐 Multilingual support for chat interactions
- 🎨 Customizable chat themes and avatars
- 📊 Analytics and insights on chat sessions and user engagement
- 🔒 Enhanced security measures and user authentication
- 🤝 Integration with external services and APIs

If you have any ideas or suggestions for future enhancements, please feel free to open an issue or contribute to the project.

## License

This project is licensed under the MIT License.

---

🚀 Experience the power of AI-driven conversations with Based GPT! Unleash the potential of advanced language models and revolutionize the way you interact with chatbots. Start building intelligent, context-aware applications today! 🌟
