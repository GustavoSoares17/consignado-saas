import { redis, dbAddToSet, dbSetMembers } from './db';

export interface Message {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  direction: 'inbound' | 'outbound';
  status: 'received' | 'sent' | 'delivered' | 'read';
  contactName?: string;
}

interface Thread {
  messages: Message[];
  contactName: string;
}

// Fallback em memória apenas para `next dev` sem Redis configurado.
const memThreads = new Map<string, Thread>();
const CONTACTS_SET = 'gt:contacts';

function threadKey(phone: string) {
  return `gt:thread:${phone}`;
}

export async function saveMessage(msg: Message): Promise<void> {
  const phone = msg.direction === 'inbound' ? msg.from : msg.to;

  if (redis) {
    const key = threadKey(phone);
    const raw = await redis.get<Thread>(key);
    const thread: Thread = raw || { messages: [], contactName: phone };
    if (!thread.messages.find((m) => m.id === msg.id)) thread.messages.push(msg);
    if (msg.contactName) thread.contactName = msg.contactName;
    await redis.set(key, thread);
    await dbAddToSet(CONTACTS_SET, phone);
    return;
  }

  const thread = memThreads.get(phone) || { messages: [], contactName: phone };
  if (!thread.messages.find((m) => m.id === msg.id)) thread.messages.push(msg);
  if (msg.contactName) thread.contactName = msg.contactName;
  memThreads.set(phone, thread);
}

export async function getThread(phone: string): Promise<Message[]> {
  if (redis) {
    const thread = await redis.get<Thread>(threadKey(phone));
    return (thread?.messages || []).sort((a, b) => a.timestamp - b.timestamp);
  }
  return (memThreads.get(phone)?.messages || []).sort((a, b) => a.timestamp - b.timestamp);
}

export async function getContacts() {
  const list: { phone: string; name: string; lastMessage: Message | null; unreadCount: number }[] = [];

  if (redis) {
    const phones = await dbSetMembers(CONTACTS_SET);
    for (const phone of phones) {
      const thread = await redis.get<Thread>(threadKey(phone));
      if (!thread) continue;
      const sorted = thread.messages.slice().sort((a, b) => b.timestamp - a.timestamp);
      const unread = thread.messages.filter((m) => m.direction === 'inbound' && m.status === 'received').length;
      list.push({ phone, name: thread.contactName, lastMessage: sorted[0] || null, unreadCount: unread });
    }
  } else {
    memThreads.forEach((thread, phone) => {
      const sorted = thread.messages.slice().sort((a, b) => b.timestamp - a.timestamp);
      const unread = thread.messages.filter((m) => m.direction === 'inbound' && m.status === 'received').length;
      list.push({ phone, name: thread.contactName, lastMessage: sorted[0] || null, unreadCount: unread });
    });
  }

  return list.sort((a, b) => (b.lastMessage?.timestamp ?? 0) - (a.lastMessage?.timestamp ?? 0));
}

export async function markAllRead(phone: string): Promise<void> {
  if (redis) {
    const key = threadKey(phone);
    const thread = await redis.get<Thread>(key);
    if (!thread) return;
    thread.messages.forEach((m) => { if (m.direction === 'inbound') m.status = 'read'; });
    await redis.set(key, thread);
    return;
  }
  const thread = memThreads.get(phone);
  if (!thread) return;
  thread.messages.forEach((m) => { if (m.direction === 'inbound') m.status = 'read'; });
}
