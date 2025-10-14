import { sql } from '@vercel/postgres';

export interface ChatLog {
  id: string;
  session_id: string;
  user_name: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  chat_log_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

/**
 * Initialize database tables
 * Run this once to set up the schema
 */
export async function initDatabase() {
  try {
    // Create chat_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create chat_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_log_id UUID NOT NULL REFERENCES chat_logs(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index on session_id for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON chat_logs(session_id)
    `;

    // Create index on chat_log_id for faster message retrieval
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_log_id ON chat_messages(chat_log_id)
    `;

    // Create index on created_at for sorting
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC)
    `;

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

/**
 * Create or get existing chat log for a session
 */
export async function upsertChatLog(sessionId: string, userName: string): Promise<ChatLog> {
  const result = await sql`
    INSERT INTO chat_logs (session_id, user_name)
    VALUES (${sessionId}, ${userName})
    ON CONFLICT (session_id)
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  return result.rows[0] as ChatLog;
}

/**
 * Add a message to a chat log
 */
export async function addChatMessage(
  chatLogId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const result = await sql`
    INSERT INTO chat_messages (chat_log_id, role, content)
    VALUES (${chatLogId}, ${role}, ${content})
    RETURNING *
  `;

  // Update the chat log's updated_at timestamp
  await sql`
    UPDATE chat_logs
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = ${chatLogId}
  `;

  return result.rows[0] as ChatMessage;
}

/**
 * Get all chat logs with pagination
 */
export async function getChatLogs(
  page: number = 1,
  limit: number = 50
): Promise<{ logs: ChatLog[]; total: number }> {
  const offset = (page - 1) * limit;

  const [logsResult, countResult] = await Promise.all([
    sql`
      SELECT * FROM chat_logs
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`SELECT COUNT(*) as count FROM chat_logs`
  ]);

  return {
    logs: logsResult.rows as ChatLog[],
    total: parseInt(countResult.rows[0].count)
  };
}

/**
 * Get messages for a specific chat log
 */
export async function getChatMessages(chatLogId: string): Promise<ChatMessage[]> {
  const result = await sql`
    SELECT * FROM chat_messages
    WHERE chat_log_id = ${chatLogId}
    ORDER BY created_at ASC
  `;

  return result.rows as ChatMessage[];
}

/**
 * Get a chat log with all its messages
 */
export async function getChatLogWithMessages(sessionId: string): Promise<{
  log: ChatLog | null;
  messages: ChatMessage[];
}> {
  const logResult = await sql`
    SELECT * FROM chat_logs
    WHERE session_id = ${sessionId}
  `;

  if (logResult.rows.length === 0) {
    return { log: null, messages: [] };
  }

  const log = logResult.rows[0] as ChatLog;
  const messages = await getChatMessages(log.id);

  return { log, messages };
}

/**
 * Delete chat logs by IDs
 */
export async function deleteChatLogs(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const result = await sql`
    DELETE FROM chat_logs
    WHERE id = ANY(${ids})
    RETURNING id
  `;

  return result.rowCount || 0;
}

/**
 * Search chat logs by user name or content
 */
export async function searchChatLogs(
  query: string,
  page: number = 1,
  limit: number = 50
): Promise<{ logs: ChatLog[]; total: number }> {
  const offset = (page - 1) * limit;
  const searchPattern = `%${query}%`;

  const [logsResult, countResult] = await Promise.all([
    sql`
      SELECT DISTINCT cl.*
      FROM chat_logs cl
      LEFT JOIN chat_messages cm ON cl.id = cm.chat_log_id
      WHERE cl.user_name ILIKE ${searchPattern}
         OR cm.content ILIKE ${searchPattern}
      ORDER BY cl.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(DISTINCT cl.id) as count
      FROM chat_logs cl
      LEFT JOIN chat_messages cm ON cl.id = cm.chat_log_id
      WHERE cl.user_name ILIKE ${searchPattern}
         OR cm.content ILIKE ${searchPattern}
    `
  ]);

  return {
    logs: logsResult.rows as ChatLog[],
    total: parseInt(countResult.rows[0].count)
  };
}
