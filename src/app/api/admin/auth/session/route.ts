import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminSession } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const sessionStatus = hasValidAdminSession(req);

    if (sessionStatus === 'misconfigured') {
      return NextResponse.json(
        { authenticated: false, error: 'Server configuration error. ADMIN_SESSION_SECRET must be set.' },
        { status: 500 }
      );
    }

    const authenticated = sessionStatus === 'authorized';
    return NextResponse.json(
      { authenticated },
      { status: authenticated ? 200 : 401 }
    );
  } catch (error: any) {
    console.error('Admin session check error:', error);
    return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
  }
}















