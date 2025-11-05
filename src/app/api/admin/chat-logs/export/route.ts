import { NextRequest, NextResponse } from 'next/server';
import { getChatLogById } from '@/lib/blob-db';
import { getNZDateString } from '@/lib/timezone';
import { authorizeAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

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
    const authStatus = authorizeAdminRequest(req);

    if (authStatus === 'misconfigured') {
      return NextResponse.json(
        { error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.' },
        { status: 500 }
      );
    }

    if (authStatus !== 'authorized') {
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
