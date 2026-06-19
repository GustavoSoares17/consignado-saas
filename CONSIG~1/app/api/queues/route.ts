import { NextRequest, NextResponse } from 'next/server';
import { getQueues, saveQueues, Queue } from '@/lib/ai-config';

export async function GET() {
  const queues = await getQueues();
  return NextResponse.json({ queues });
}

export async function POST(req: NextRequest) {
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
