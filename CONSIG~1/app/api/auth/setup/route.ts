import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, signSession, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';

// Cria a primeira conta (admin). Só funciona enquanto não existir nenhum usuário —
// depois disso, novas contas só podem ser criadas por um admin logado em /api/auth/users.
export async function POST(req: NextRequest) {
  const users = await getUsers();
  if (users.length > 0) {
    return NextResponse.json({ error: 'Setup já foi concluído. Use a tela de login.' }, { status: 400 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const { username, password } = body || {};
  if (!username || !password || String(password).length < 4) {
    return NextResponse.json({ error: 'Usuário e senha (mín. 4 caracteres) são obrigatórios.' }, { status: 400 });
  }
  const user = await createUser({ username, password, role: 'admin' });
  const token = signSession(user);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE_SECONDS });
  return res;
}
