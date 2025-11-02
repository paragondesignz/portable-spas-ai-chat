import { NextRequest, NextResponse } from 'next/server';
import {
  getChatsOverTime,
  getTodayStats,
  getWeekStats,
  getKnowledgeBaseStatus,
  getTotalChatsStats,
  getChatsByDate,
} from '@/lib/stats-aggregator';

export async function GET(request: NextRequest) {
  // Check authentication
  const authHeader = request.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
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
