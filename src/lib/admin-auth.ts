import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export type AdminAuthStatus = 'authorized' | 'unauthorized' | 'misconfigured';

const SESSION_COOKIE_NAME = 'ps_admin_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 hours

function getEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

function getAdminPassword(): string | null {
  return getEnv('ADMIN_PASSWORD');
}

function getSessionSecret(): string | null {
  return getEnv('ADMIN_SESSION_SECRET');
}

function hashValue(value: string): Buffer {
  return crypto.createHash('sha256').update(value).digest();
}

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = hashValue(a);
  const hashB = hashValue(b);
  return crypto.timingSafeEqual(hashA, hashB);
}

interface SessionPayload {
  exp: number;
  nonce: string;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (typeof parsed.exp === 'number' && typeof parsed.nonce === 'string') {
      return parsed as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function validateSessionToken(token: string): AdminAuthStatus {
  const secret = getSessionSecret();
  if (!secret) {
    return 'misconfigured';
  }

  const [payloadEncoded, signature] = token.split('.');
  if (!payloadEncoded || !signature) {
    return 'unauthorized';
  }

  const expectedSignature = signPayload(payloadEncoded, secret);
  if (!timingSafeCompare(signature, expectedSignature)) {
    return 'unauthorized';
  }

  const payload = decodePayload(payloadEncoded);
  if (!payload) {
    return 'unauthorized';
  }

  if (payload.exp < Date.now()) {
    return 'unauthorized';
  }

  return 'authorized';
}

function createSessionToken(secret: string): string {
  const payload: SessionPayload = {
    exp: Date.now() + SESSION_DURATION_MS,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  const payloadEncoded = encodePayload(payload);
  const signature = signPayload(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

export function verifyAdminPassword(input: string): AdminAuthStatus {
  const password = getAdminPassword();
  if (!password) {
    return 'misconfigured';
  }

  return timingSafeCompare(input, password) ? 'authorized' : 'unauthorized';
}

export function authorizeAdminRequest(req: NextRequest): AdminAuthStatus {
  const password = getAdminPassword();
  if (!password) {
    return 'misconfigured';
  }

  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    const sessionStatus = validateSessionToken(sessionToken);
    if (sessionStatus !== 'unauthorized') {
      return sessionStatus;
    }
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return timingSafeCompare(token, password) ? 'authorized' : 'unauthorized';
  }

  return 'unauthorized';
}

export function attachAdminSessionCookie(response: NextResponse): AdminAuthStatus {
  const secret = getSessionSecret();
  if (!secret) {
    return 'misconfigured';
  }

  const token = createSessionToken(secret);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
    path: '/',
  });

  return 'authorized';
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
}

export function hasValidAdminSession(req: NextRequest): AdminAuthStatus {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return 'unauthorized';
  }
  return validateSessionToken(sessionToken);
}














