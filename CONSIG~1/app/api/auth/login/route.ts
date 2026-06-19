import { NextRequest, NextResponse } from 'next/server';
import { findByUsername, verifyPassword, signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const { username, password } = body || {};
  if (!username || !password) return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 });
  const user = await findByUsername(username);
  if (!user || !verifyPassword(password, user)) {
    return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
  }
  const token = signSession(user);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE_SECONDS });
  return res;
}
