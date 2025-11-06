import { NextRequest, NextResponse } from 'next/server';
import { attachAdminSessionCookie, verifyAdminPassword } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const verification = verifyAdminPassword(password);

    if (verification === 'misconfigured') {
      return NextResponse.json(
        { error: 'Server configuration error. ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set.' },
        { status: 500 }
      );
    }

    if (verification === 'unauthorized') {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    const sessionStatus = attachAdminSessionCookie(response);

    if (sessionStatus === 'misconfigured') {
      return NextResponse.json(
        { error: 'Server configuration error. ADMIN_SESSION_SECRET must be set.' },
        { status: 500 }
      );
    }

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Failed to process login' }, { status: 500 });
  }
}




