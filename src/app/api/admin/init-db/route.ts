import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Initialize database tables
 * POST /api/admin/init-db
 * Requires admin authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = req.headers.get('authorization');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (token !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Initialize database
    await initDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });

  } catch (error: any) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize database',
        details: error.message
      },
      { status: 500 }
    );
  }
}
