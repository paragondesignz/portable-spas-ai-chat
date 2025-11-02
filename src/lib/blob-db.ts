import { list, put, del } from '@vercel/blob';

export interface ChatLog {
  id: string;
  session_id: string;
  user_name: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  // Contact/Callback fields
  contact_email?: string;
  contact_phone?: string;
  callback_requested?: boolean;
  callback_requested_at?: string;
  callback_notes?: string;
  contacted?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const BLOB_PREFIX = 'chatlogs/';

// Simple in-memory lock to prevent concurrent writes to the same session
const sessionLocks = new Map<string, Promise<any>>();

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
    // Try to fetch existing log by listing blobs with prefix
    const { blobs } = await list({ prefix: key });

    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const existingLog: ChatLog = await response.json();
        existingLog.updated_at = new Date().toISOString();

        // Delete old and create new blob (Vercel Blob doesn't support in-place updates)
        await del(blobs[0].url);
        await put(key, JSON.stringify(existingLog), {
          access: 'public',
          addRandomSuffix: false,
        });

        return existingLog;
      }
    }
  } catch (error) {
    console.error('Error checking for existing log:', error);
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
 * Add multiple messages to a chat log in a single operation
 * This is much faster and more reliable than adding messages one at a time
 */
export async function addChatMessages(
  sessionId: string,
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  userName?: string
): Promise<ChatMessage[]> {
  // Wait for any pending operations on this session to complete
  if (sessionLocks.has(sessionId)) {
    console.log(`[BLOB-DB] Waiting for existing operation to complete for session: ${sessionId}`);
    await sessionLocks.get(sessionId);
  }

  // Create a promise for this operation
  const operationPromise = (async () => {
    try {
      console.log(`[BLOB-DB] addChatMessages called - adding ${messages.length} messages`);
      const key = getChatLogKey(sessionId);

      // Fetch existing log
      const { blobs } = await list({ prefix: key });
      console.log('[BLOB-DB] Found', blobs.length, 'existing blobs for session');

      let log: ChatLog;

      if (blobs.length === 0) {
        // Create new chat log if it doesn't exist
        console.log('[BLOB-DB] Chat log not found, creating new one for session:', sessionId);
        log = {
          id: generateId(),
          session_id: sessionId,
          user_name: userName || 'Anonymous',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          messages: []
        };
      } else {
        // Fetch the content first
        console.log('[BLOB-DB] Fetching existing log from:', blobs[0].url);
        const response = await fetch(blobs[0].url);
        if (!response.ok) {
          throw new Error('Failed to fetch chat log');
        }

        log = await response.json();
        console.log('[BLOB-DB] Existing log has', log.messages.length, 'messages');

        // Delete old blob (we'll create a new one with updated content)
        console.log('[BLOB-DB] Deleting old blob');
        await del(blobs[0].url);
      }

      // Create all new messages
      const newMessages: ChatMessage[] = messages.map(msg => ({
        id: generateId(),
        role: msg.role,
        content: msg.content,
        created_at: new Date().toISOString()
      }));

      // Add all messages to log
      log.messages.push(...newMessages);
      log.updated_at = new Date().toISOString();

      console.log('[BLOB-DB] About to save blob. Current message count:', log.messages.length);
      console.log('[BLOB-DB] New messages:', newMessages.map(m => `${m.role}: ${m.content.substring(0, 30)}...`));

      // Create new blob with updated content in one operation
      const result = await put(key, JSON.stringify(log), {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log('[BLOB-DB] Blob saved successfully with', messages.length, 'new messages. URL:', result.url);

      return newMessages;
    } finally {
      // Clean up the lock when done
      sessionLocks.delete(sessionId);
    }
  })();

  // Store the promise so other operations can wait for it
  sessionLocks.set(sessionId, operationPromise);

  return operationPromise;
}

/**
 * Add a single message to a chat log
 * For adding multiple messages, use addChatMessages() instead for better performance
 */
export async function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  userName?: string
): Promise<ChatMessage> {
  const messages = await addChatMessages(sessionId, [{ role, content }], userName);
  return messages[0];
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
    const { blobs } = await list({ prefix: key });

    if (blobs.length === 0) {
      return { log: null, messages: [] };
    }

    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      return { log: null, messages: [] };
    }

    const log: ChatLog = await response.json();
    return { log, messages: log.messages };
  } catch (error) {
    console.error('Error fetching chat log:', error);
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
  console.log('[BLOB-DB] getChatLogById called with ID:', id);
  const { blobs } = await list({ prefix: BLOB_PREFIX });
  console.log('[BLOB-DB] Found', blobs.length, 'total chat log blobs');

  for (const blob of blobs) {
    try {
      const response = await fetch(blob.url);
      if (response.ok) {
        const log: ChatLog = await response.json();
        console.log('[BLOB-DB] Checking log:', log.id, 'against:', id);
        if (log.id === id) {
          console.log('[BLOB-DB] Match found! Returning log with', log.messages.length, 'messages');
          return { log, messages: log.messages };
        }
      }
    } catch (error) {
      console.error(`[BLOB-DB] Failed to fetch blob ${blob.pathname}:`, error);
    }
  }

  console.log('[BLOB-DB] No matching log found for ID:', id);
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

/**
 * Update contact information for a chat log
 */
export async function updateContactInfo(
  sessionId: string,
  contactData: {
    email?: string;
    phone?: string;
    notes?: string;
  }
): Promise<ChatLog | null> {
  const key = getChatLogKey(sessionId);

  try {
    // Fetch existing log
    const { blobs } = await list({ prefix: key });

    if (blobs.length === 0) {
      console.error('Chat log not found for session:', sessionId);
      return null;
    }

    const response = await fetch(blobs[0].url);
    if (!response.ok) {
      throw new Error('Failed to fetch chat log');
    }

    const log: ChatLog = await response.json();

    // Update contact fields
    log.contact_email = contactData.email;
    log.contact_phone = contactData.phone;
    log.callback_requested = true;
    log.callback_requested_at = new Date().toISOString();
    log.callback_notes = contactData.notes;
    log.contacted = false;
    log.updated_at = new Date().toISOString();

    // Delete old blob
    await del(blobs[0].url);

    // Create new blob with updated content
    await put(key, JSON.stringify(log), {
      access: 'public',
      addRandomSuffix: false,
    });

    return log;
  } catch (error) {
    console.error('Error updating contact info:', error);
    return null;
  }
}
