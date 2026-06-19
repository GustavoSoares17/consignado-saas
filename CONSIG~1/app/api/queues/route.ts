import { NextRequest, NextResponse } from 'next/server';
import { getQueues, saveQueues, Queue } from '@/lib/ai-config';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const queues = await getQueues();
  return NextResponse.json({ queues });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
  let queues: Queue[];
  try {
    const body = await req.json();
    queues = body.queues ?? body;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  await saveQueues(queues);
  return NextResponse.json({ ok: true });
}
