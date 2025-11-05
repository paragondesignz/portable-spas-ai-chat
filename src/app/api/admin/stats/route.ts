import { NextRequest, NextResponse } from 'next/server';
import {
  getChatsOverTime,
  getTodayStats,
  getWeekStats,
  getKnowledgeBaseStatus,
  getTotalChatsStats,
  getChatsByDate,
} from '@/lib/stats-aggregator';
import { authorizeAdminRequest } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const authStatus = authorizeAdminRequest(request);

  if (authStatus === 'misconfigured') {
    return NextResponse.json(
      { error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.' },
      { status: 500 }
    );
  }

  if (authStatus !== 'authorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = parseInt(searchParams.get('range') || '30', 10);
    const dateParam = searchParams.get('date');

    // If date is provided, return chats for that specific date
    if (dateParam) {
      const chats = await getChatsByDate(dateParam);
      return NextResponse.json({ chats });
    }

    // Otherwise, return full dashboard stats
    const [chatsOverTime, todayStats, weekStats, kbStatus, totalStats] = await Promise.all([
      getChatsOverTime(range),
      getTodayStats(),
      getWeekStats(),
      getKnowledgeBaseStatus(),
      getTotalChatsStats(),
    ]);

    return NextResponse.json({
      chatsOverTime,
      today: todayStats,
      week: weekStats,
      knowledgeBase: kbStatus,
      total: totalStats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
