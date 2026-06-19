import { NextRequest, NextResponse } from 'next/server';
import { getAIConfig, saveAIConfig, AIConfig } from '@/lib/ai-config';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const cfg = await getAIConfig();
  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  let cfg: AIConfig;
  try {
    cfg = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  await saveAIConfig(cfg);
  return NextResponse.json({ ok: true });
}
