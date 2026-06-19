import { NextRequest, NextResponse } from 'next/server';
import { saveMessage, getThread, getContacts, markAllRead, Message } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (phone) {
    await markAllRead(phone);
    return NextResponse.json({ messages: await getThread(phone) });
  }
  return NextResponse.json({ contacts: await getContacts() });
}

export async function POST(req: NextRequest) {
  const msg: Message = await req.json();
  await saveMessage(msg);
  return NextResponse.json({ ok: true });
}
