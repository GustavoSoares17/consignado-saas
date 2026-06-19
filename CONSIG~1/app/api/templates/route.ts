import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { listTemplates } from '@/lib/meta';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  try {
    const templates = await listTemplates();
    return NextResponse.json({ templates });
  } catch (err: any) {
    console.error('[api/templates] erro:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao buscar templates.' }, { status: 500 });
  }
}
