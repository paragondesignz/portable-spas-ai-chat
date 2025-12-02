import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    clearAdminSessionCookie(response);
    return response;
  } catch (error: any) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}















