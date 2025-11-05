import { NextRequest, NextResponse } from 'next/server';
import { getChatLogById } from '@/lib/blob-db';
import { getNZDateString } from '@/lib/timezone';

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
 * Escape CSV field value
 */
function escapeCSV(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * POST /api/admin/chat-logs/export
 * Export chat logs to CSV format
 */
export async function POST(req: NextRequest) {
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

    // CSV Header
    const csvRows: string[] = [
      'Chat ID,Session ID,User Name,Message Number,Timestamp,Role,Message Content'
    ];

    // Fetch each chat log and add to CSV
    for (const id of ids) {
      const { log, messages } = await getChatLogById(id);

      if (log && messages.length > 0) {
        messages.forEach((message, index) => {
          const row = [
            escapeCSV(log.id),
            escapeCSV(log.session_id),
            escapeCSV(log.user_name),
            (index + 1).toString(),
            escapeCSV(message.created_at),
            escapeCSV(message.role),
            escapeCSV(message.content)
          ].join(',');

          csvRows.push(row);
        });
      }
    }

    const csvContent = csvRows.join('\n');

    // Return CSV with appropriate headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="chat-logs-${getNZDateString()}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Error exporting chat logs:', error);
    return NextResponse.json(
      { error: 'Failed to export chat logs', details: error.message },
      { status: 500 }
    );
  }
}
