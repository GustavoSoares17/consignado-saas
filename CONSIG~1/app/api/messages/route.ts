import { NextRequest, NextResponse } from 'next/server';
import { saveMessage, getThread, getContacts, markAllRead, Message } from '@/lib/store';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (phone) {
    await markAllRead(phone);
    return NextResponse.json({ messages: await getThread(phone) });
  }
  return NextResponse.json({ contacts: await getContacts() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const msg: Message = await req.json();
  await saveMessage(msg);
  return NextResponse.json({ ok: true });
}
