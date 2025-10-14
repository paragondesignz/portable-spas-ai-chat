import { NextRequest, NextResponse } from 'next/server';
import { getChatLogById } from '@/lib/blob-db';

export const runtime = 'nodejs';

/**
 * Verify admin authentication
 */
function verifyAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  return token === adminPassword;
}

/**
 * GET /api/admin/chat-logs/[id]
 * Get a specific chat log with all messages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!verifyAuth(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    console.log('[CHAT-LOG-API] Fetching chat log with ID:', id);

    const { log, messages } = await getChatLogById(id);

    console.log('[CHAT-LOG-API] Result:', log ? `Found log with ${messages.length} messages` : 'Not found');

    if (!log) {
      console.log('[CHAT-LOG-API] Chat log not found for ID:', id);
      return NextResponse.json(
        { error: 'Chat log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      log,
      messages
    });

  } catch (error: any) {
    console.error('[CHAT-LOG-API] Error fetching chat log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat log', details: error.message },
      { status: 500 }
    );
  }
}
