import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsers, createUser, deleteUser, setPassword, verifySession, toPublic, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  const users = await getUsers();
  return NextResponse.json({ users: users.map(toPublic) });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const { username, password, role, queueId } = body || {};
  if (role === 'partner' && !queueId) {
    return NextResponse.json({ error: 'Selecione a fila do parceiro.' }, { status: 400 });
  }
  try {
    const user = await createUser({ username, password, role: role === 'admin' ? 'admin' : 'partner', queueId });
    return NextResponse.json({ ok: true, user: toPublic(user) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao criar usuário.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao remover usuário.' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const { id, password } = body || {};
  if (!id || !password) return NextResponse.json({ error: 'id e password são obrigatórios.' }, { status: 400 });
  try {
    await setPassword(id, password);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao alterar senha.' }, { status: 400 });
  }
}
