import { NextRequest, NextResponse } from 'next/server';
import { getChatLogs, deleteChatLogsByIds, searchChatLogs } from '@/lib/blob-db';

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
 * GET /api/admin/chat-logs
 * Get all chat logs with pagination and search
 */
export async function GET(req: NextRequest) {
  try {
    if (!verifyAuth(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Blob storage is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json(
        {
          error: 'Blob storage not configured',
          details: 'Please create Vercel Blob storage in your project settings'
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const query = searchParams.get('query');

    let result;
    if (query) {
      result = await searchChatLogs(query, page, limit);
    } else {
      result = await getChatLogs(page, limit);
    }

    return NextResponse.json({
      logs: result.logs,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit)
    });

  } catch (error: any) {
    console.error('Error fetching chat logs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch chat logs',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/chat-logs
 * Delete multiple chat logs by IDs
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAuth(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { ids }: { ids: string[] } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids array is required' },
        { status: 400 }
      );
    }

    const deletedCount = await deleteChatLogsByIds(ids);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} chat log(s)`
    });

  } catch (error: any) {
    console.error('Error deleting chat logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat logs', details: error.message },
      { status: 500 }
    );
  }
}
