
import sqlite3 from 'better-sqlite3';
import { LLMMessage } from './session';

export const DB_FILE_PATH = 'database.db';

export interface User {
  id: number;
  name: string;
  email: string;
}

export class UserDatabase {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3(DB_FILE_PATH);
  }

  async initialize() {
    this.db.prepare('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)').run();
  }

  async getUserById(id: number): Promise<User | null> {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }

  async createUser(name: string, email: string): Promise<User> {
    const result = this.db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    return { id: Number(result.lastInsertRowid), name, email };
  }

  async updateUser(id: number, name: string, email: string): Promise<User | null> {
    const result = this.db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
    if (result.changes === 0) {
      return null;
    }
    return { id, name, email };
  }

  async deleteUser(id: number): Promise<User | null> {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return null;
    }
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { id, name: user.name, email: user.email };
  }
}

export class SessionTable {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3(DB_FILE_PATH);
  }

  async initialize() {
    this.db.prepare('CREATE TABLE IF NOT EXISTS sessions (id TEXT, avatar TEXT, PRIMARY KEY (id, avatar))').run();
  }

  async getSessions(): Promise<{ id: string; avatar: string }[]> {
    return this.db.prepare('SELECT * FROM sessions').all() as { id: string; avatar: string }[];
  }

  async getSession(id: string, avatar: string): Promise<{ id: string; avatar: string } | null> {
    const session = this.db.prepare('SELECT * FROM sessions WHERE id = ? AND avatar = ?').get(id, avatar) as any;
    return session ? { id: session.id, avatar: session.avatar } : null;
  }

  async addSession(id: string, avatar: string): Promise<void> {
    const existingSession = await this.getSession(id, avatar);
    if (existingSession) {
      console.log(`Session with id ${id} and avatar ${avatar} already exists. Skipping insertion.`);
      return;
    }
    this.db.prepare('INSERT INTO sessions (id, avatar) VALUES (?, ?)').run(id, avatar);
    console.log(`Added new session with id ${id} and avatar ${avatar}.`);
  }
}

export class SessionMessageTable {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3(DB_FILE_PATH);
  }

  async initialize() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS session_messages (
        id INTEGER PRIMARY KEY,
        session_id TEXT,
        avatar TEXT,
        role TEXT,
        content TEXT,
        FOREIGN KEY (session_id, avatar) REFERENCES sessions (id, avatar)
      )
    `).run();
  }

  async getMessagesBySessionId(sessionId: string, avatar: string): Promise<Array<LLMMessage>> {
    return this.db.prepare('SELECT id, role, content FROM session_messages WHERE session_id = ? AND avatar = ? ORDER BY id ASC').all(sessionId, avatar) as LLMMessage[];
  }

  async addMessage(sessionId: string, avatar: string, role: string, content: string): Promise<number> {
    const result = this.db.prepare('INSERT INTO session_messages (session_id, avatar, role, content) VALUES (?, ?, ?, ?)').run(sessionId, avatar, role, content);
    return result.lastInsertRowid as number;
  }
}

export class FingerprintTable {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3(DB_FILE_PATH);
    this.createTableIfNotExists();
  }

  private createTableIfNotExists() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS fingerprints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fingerprint TEXT,
        sessionId TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  }

  async saveFingerprint(fingerprint: string, sessionId: string): Promise<void> {
    this.db.prepare('INSERT INTO fingerprints (fingerprint, sessionId) VALUES (?, ?)').run(fingerprint, sessionId);
  }
}

export class CompletionTable {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3(DB_FILE_PATH);
  }

  async initialize() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS completions (
        id INTEGER PRIMARY KEY,
        session_id TEXT,
        session_message_id INTEGER,
        role TEXT,
        content TEXT,
        messages JSON,
        system_prompt TEXT,
        settings JSON,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Create an index on the session_id column for faster lookups
    this.db.prepare(`
      CREATE INDEX IF NOT EXISTS completions_session_id_idx ON completions (session_id)
    `).run();
  }

  async addCompletion(
    session_id: string,
    avatar: string,
    session_message_id: number,
    role: string,
    content: string,
    messages: any,
    system_prompt: string,
    settings: any
  ): Promise<void> {
    // Check if the session exists in the "sessions" table
    const sessionExists = (this.db.prepare(`
      SELECT COUNT(*) as count FROM sessions WHERE id = ? AND avatar = ?
    `).get(session_id, avatar) as { count: number }).count > 0;

    if (!sessionExists) {
      throw new Error(`Session with ID ${session_id} and avatar ${avatar} does not exist.`);
    }
  
    // Insert the completion record
    this.db.prepare(`
      INSERT INTO completions (
        session_id,
        session_message_id,
        role,
        content,
        messages,
        system_prompt,
        settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(session_id, session_message_id, role, content, JSON.stringify(messages), system_prompt, JSON.stringify(settings));
  }

  
  async getCompletionsBySessionId(sessionId: string): Promise<any[]> {
    return this.db.prepare(`
      SELECT * FROM completions WHERE session_id = ? ORDER BY timestamp ASC
    `).all(sessionId);
  }
}
