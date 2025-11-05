import { list } from '@vercel/blob';
import { ChatLog } from './blob-db';
import { format, parseISO } from 'date-fns';
import { getNZDate, getNZStartOfDay, getNZDateString, subtractNZDays } from './timezone';

// Simple in-memory cache with 10-minute TTL
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch all chat logs from Vercel Blob
 */
async function getAllChatLogs(): Promise<ChatLog[]> {
  const cacheKey = 'all_chat_logs';
  const cached = getCached<ChatLog[]>(cacheKey);
  if (cached) return cached;

  const { blobs } = await list({ prefix: 'chatlogs/' });

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

  setCache(cacheKey, logs);
  return logs;
}

/**
 * Get chats and messages aggregated by day for the specified number of days
 */
export async function getChatsOverTime(days: number = 30): Promise<Array<{
  date: string;
  chats: number;
  messages: number;
  users: string[];
}>> {
  const cacheKey = `chats_over_time_${days}`;
  const cached = getCached<Array<{ date: string; chats: number; messages: number; users: string[] }>>(cacheKey);
  if (cached) return cached;

  const logs = await getAllChatLogs();
  const endDate = getNZStartOfDay();
  const startDate = subtractNZDays(endDate, days - 1);

  // Create a map for each day
  const dayMap = new Map<string, { chats: number; messages: number; users: Set<string> }>();

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = getNZDateString(subtractNZDays(endDate, i));
    dayMap.set(date, { chats: 0, messages: 0, users: new Set() });
  }

  // Aggregate data
  logs.forEach(log => {
    const createdDate = getNZDateString(log.created_at);

    if (dayMap.has(createdDate)) {
      const day = dayMap.get(createdDate)!;
      day.chats++;
      day.users.add(log.user_name);
      day.messages += log.messages.length;
    }
  });

  // Convert to array and sort by date
  const result = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      chats: data.chats,
      messages: data.messages,
      users: Array.from(data.users)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  setCache(cacheKey, result);
  return result;
}

/**
 * Get stats for today vs yesterday
 */
export async function getTodayStats(): Promise<{
  today: number;
  yesterday: number;
  percentChange: number;
}> {
  const cacheKey = 'today_stats';
  const cached = getCached<{ today: number; yesterday: number; percentChange: number }>(cacheKey);
  if (cached) return cached;

  const logs = await getAllChatLogs();
  const today = getNZDateString();
  const yesterday = getNZDateString(subtractNZDays(getNZDate(), 1));

  let todayCount = 0;
  let yesterdayCount = 0;

  logs.forEach(log => {
    const logDate = getNZDateString(log.created_at);
    if (logDate === today) todayCount++;
    if (logDate === yesterday) yesterdayCount++;
  });

  const percentChange = yesterdayCount === 0
    ? (todayCount > 0 ? 100 : 0)
    : ((todayCount - yesterdayCount) / yesterdayCount) * 100;

  const result = { today: todayCount, yesterday: yesterdayCount, percentChange };
  setCache(cacheKey, result);
  return result;
}

/**
 * Get stats for this week vs last week
 */
export async function getWeekStats(): Promise<{
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
}> {
  const cacheKey = 'week_stats';
  const cached = getCached<{ thisWeek: number; lastWeek: number; percentChange: number }>(cacheKey);
  if (cached) return cached;

  const logs = await getAllChatLogs();
  const today = getNZDate();
  const weekAgo = subtractNZDays(today, 7);
  const twoWeeksAgo = subtractNZDays(today, 14);

  let thisWeekCount = 0;
  let lastWeekCount = 0;

  logs.forEach(log => {
    const logDate = parseISO(log.created_at);
    if (logDate >= weekAgo) {
      thisWeekCount++;
    } else if (logDate >= twoWeeksAgo && logDate < weekAgo) {
      lastWeekCount++;
    }
  });

  const percentChange = lastWeekCount === 0
    ? (thisWeekCount > 0 ? 100 : 0)
    : ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;

  const result = { thisWeek: thisWeekCount, lastWeek: lastWeekCount, percentChange };
  setCache(cacheKey, result);
  return result;
}

/**
 * Get knowledge base status
 */
export async function getKnowledgeBaseStatus(): Promise<{
  fileCount: number;
  lastProductSync: string | null;
  lastBlogSync: string | null;
  productSyncStatus: 'fresh' | 'warning' | 'stale';
  blogSyncStatus: 'fresh' | 'warning' | 'stale';
}> {
  const cacheKey = 'kb_status';
  const cached = getCached<{
    fileCount: number;
    lastProductSync: string | null;
    lastBlogSync: string | null;
    productSyncStatus: 'fresh' | 'warning' | 'stale';
    blogSyncStatus: 'fresh' | 'warning' | 'stale';
  }>(cacheKey);
  if (cached) return cached;

  let fileCount = 0;
  let lastProductSync: string | null = null;
  let lastBlogSync: string | null = null;

  try {
    // Fetch files directly from Pinecone Assistant API
    const response = await fetch(
      `https://prod-1-data.ke.pinecone.io/assistant/files/${process.env.PINECONE_ASSISTANT_NAME}`,
      {
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const files = data.files || [];
      fileCount = files.length;

      // Find most recent product catalog and blog sync files
      const productFiles = files.filter((f: any) => f.name.startsWith('product-catalog-'));
      const blogFiles = files.filter((f: any) => f.name.match(/^(articles|news)-blog-/));

      if (productFiles.length > 0) {
        const mostRecent = productFiles.reduce((latest: any, current: any) => {
          const latestDate = latest.created_on ? new Date(latest.created_on) : new Date(0);
          const currentDate = current.created_on ? new Date(current.created_on) : new Date(0);
          return currentDate > latestDate ? current : latest;
        });
        lastProductSync = mostRecent.created_on || null;
      }

      if (blogFiles.length > 0) {
        const mostRecent = blogFiles.reduce((latest: any, current: any) => {
          const latestDate = latest.created_on ? new Date(latest.created_on) : new Date(0);
          const currentDate = current.created_on ? new Date(current.created_on) : new Date(0);
          return currentDate > latestDate ? current : latest;
        });
        lastBlogSync = mostRecent.created_on || null;
      }
    }
  } catch (error) {
    console.error('Error fetching knowledge base status:', error);
    // Return default values on error
  }

  // Determine sync status based on age
  const getStatus = (syncDate: string | null, staleDays: number = 4, warningDays: number = 3): 'fresh' | 'warning' | 'stale' => {
    if (!syncDate) return 'stale';
    const daysSince = (Date.now() - new Date(syncDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > staleDays) return 'stale';
    if (daysSince > warningDays) return 'warning';
    return 'fresh';
  };

  const result = {
    fileCount,
    lastProductSync,
    lastBlogSync,
    productSyncStatus: getStatus(lastProductSync, 4, 3), // Products sync every 3 days
    blogSyncStatus: getStatus(lastBlogSync, 9, 7), // Blog syncs weekly
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Get total chat count and trend
 */
export async function getTotalChatsStats(): Promise<{
  total: number;
  last30Days: number;
  percentChange: number;
}> {
  const cacheKey = 'total_chats_stats';
  const cached = getCached<{ total: number; last30Days: number; percentChange: number }>(cacheKey);
  if (cached) return cached;

  const logs = await getAllChatLogs();
  const thirtyDaysAgo = subtractNZDays(getNZDate(), 30);
  const sixtyDaysAgo = subtractNZDays(getNZDate(), 60);

  let last30Days = 0;
  let previous30Days = 0;

  logs.forEach(log => {
    const logDate = parseISO(log.created_at);
    if (logDate >= thirtyDaysAgo) {
      last30Days++;
    } else if (logDate >= sixtyDaysAgo && logDate < thirtyDaysAgo) {
      previous30Days++;
    }
  });

  const percentChange = previous30Days === 0
    ? (last30Days > 0 ? 100 : 0)
    : ((last30Days - previous30Days) / previous30Days) * 100;

  const result = { total: logs.length, last30Days, percentChange };
  setCache(cacheKey, result);
  return result;
}

/**
 * Get chats for a specific date
 */
export async function getChatsByDate(date: string): Promise<ChatLog[]> {
  const logs = await getAllChatLogs();

  return logs.filter(log => {
    const logDate = getNZDateString(log.created_at);
    return logDate === date;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
