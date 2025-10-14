import { list, put, del } from '@vercel/blob';

export interface ChatLog {
  id: string;
  session_id: string;
  user_name: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const BLOB_PREFIX = 'chatlogs/';

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the blob key for a chat log
 */
function getChatLogKey(sessionId: string): string {
  return `${BLOB_PREFIX}${sessionId}.json`;
}

/**
 * Create or update a chat log
 */
export async function upsertChatLog(sessionId: string, userName: string): Promise<ChatLog> {
  const key = getChatLogKey(sessionId);

  try {
    // Try to fetch existing log
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://' + process.env.BLOB_STORE_ID + '.public.blob.vercel-storage.com/' : ''}${key}`);

    if (response.ok) {
      const existingLog: ChatLog = await response.json();
      existingLog.updated_at = new Date().toISOString();

      // Update the blob
      await put(key, JSON.stringify(existingLog), {
        access: 'public',
        addRandomSuffix: false,
      });

      return existingLog;
    }
  } catch (error) {
    // Log doesn't exist, create new one
  }

  // Create new log
  const newLog: ChatLog = {
    id: generateId(),
    session_id: sessionId,
    user_name: userName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    messages: []
  };

  await put(key, JSON.stringify(newLog), {
    access: 'public',
    addRandomSuffix: false,
  });

  return newLog;
}

/**
 * Add a message to a chat log
 */
export async function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const key = getChatLogKey(sessionId);

  // Fetch existing log
  const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://' + process.env.BLOB_STORE_ID + '.public.blob.vercel-storage.com/' : ''}${key}`);

  if (!response.ok) {
    throw new Error('Chat log not found');
  }

  const log: ChatLog = await response.json();

  // Create new message
  const newMessage: ChatMessage = {
    id: generateId(),
    role,
    content,
    created_at: new Date().toISOString()
  };

  // Add message to log
  log.messages.push(newMessage);
  log.updated_at = new Date().toISOString();

  // Update the blob
  await put(key, JSON.stringify(log), {
    access: 'public',
    addRandomSuffix: false,
  });

  return newMessage;
}

/**
 * Get all chat logs with pagination
 */
export async function getChatLogs(
  page: number = 1,
  limit: number = 50
): Promise<{ logs: ChatLog[]; total: number }> {
  const { blobs } = await list({ prefix: BLOB_PREFIX });

  // Fetch all logs
  const logs: ChatLog[] = [];
  for (const blob of blobs) {
    try {
      const response = await fetch(blob.url);
      if (response.ok) {
        const log: ChatLog = await response.json();
        logs.push(log);
      }
    } catch (error) {
      console.error(`Failed to fetch blob ${blob.pathname}:`, error);
    }
  }

  // Sort by updated_at descending
  logs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Paginate
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedLogs = logs.slice(start, end);

  return {
    logs: paginatedLogs,
    total: logs.length
  };
}

/**
 * Get a specific chat log with all messages
 */
export async function getChatLogWithMessages(sessionId: string): Promise<{
  log: ChatLog | null;
  messages: ChatMessage[];
}> {
  const key = getChatLogKey(sessionId);

  try {
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? 'https://' + process.env.BLOB_STORE_ID + '.public.blob.vercel-storage.com/' : ''}${key}`);

    if (!response.ok) {
      return { log: null, messages: [] };
    }

    const log: ChatLog = await response.json();
    return { log, messages: log.messages };
  } catch (error) {
    return { log: null, messages: [] };
  }
}

/**
 * Get a chat log by ID
 */
export async function getChatLogById(id: string): Promise<{
  log: ChatLog | null;
  messages: ChatMessage[];
}> {
  const { blobs } = await list({ prefix: BLOB_PREFIX });

  for (const blob of blobs) {
    try {
      const response = await fetch(blob.url);
      if (response.ok) {
        const log: ChatLog = await response.json();
        if (log.id === id) {
          return { log, messages: log.messages };
        }
      }
    } catch (error) {
      console.error(`Failed to fetch blob ${blob.pathname}:`, error);
    }
  }

  return { log: null, messages: [] };
}

/**
 * Delete chat logs by session IDs
 */
export async function deleteChatLogs(sessionIds: string[]): Promise<number> {
  if (sessionIds.length === 0) return 0;

  let deletedCount = 0;

  for (const sessionId of sessionIds) {
    try {
      const key = getChatLogKey(sessionId);
      await del(key);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete chat log ${sessionId}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Delete chat logs by IDs
 */
export async function deleteChatLogsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const { blobs } = await list({ prefix: BLOB_PREFIX });
  let deletedCount = 0;

  for (const blob of blobs) {
    try {
      const response = await fetch(blob.url);
      if (response.ok) {
        const log: ChatLog = await response.json();
        if (ids.includes(log.id)) {
          await del(blob.pathname);
          deletedCount++;
        }
      }
    } catch (error) {
      console.error(`Failed to process blob ${blob.pathname}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Search chat logs by user name or content
 */
export async function searchChatLogs(
  query: string,
  page: number = 1,
  limit: number = 50
): Promise<{ logs: ChatLog[]; total: number }> {
  const { blobs } = await list({ prefix: BLOB_PREFIX });
  const searchLower = query.toLowerCase();

  // Fetch and filter logs
  const matchingLogs: ChatLog[] = [];
  for (const blob of blobs) {
    try {
      const response = await fetch(blob.url);
      if (response.ok) {
        const log: ChatLog = await response.json();

        // Search in user name and message content
        const nameMatch = log.user_name.toLowerCase().includes(searchLower);
        const contentMatch = log.messages.some(msg =>
          msg.content.toLowerCase().includes(searchLower)
        );

        if (nameMatch || contentMatch) {
          matchingLogs.push(log);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch blob ${blob.pathname}:`, error);
    }
  }

  // Sort by updated_at descending
  matchingLogs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Paginate
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedLogs = matchingLogs.slice(start, end);

  return {
    logs: paginatedLogs,
    total: matchingLogs.length
  };
}
