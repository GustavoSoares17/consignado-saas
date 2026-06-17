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

// Module-level store — persists within a warm serverless instance.
// For durable storage, replace with Vercel KV: https://vercel.com/docs/storage/vercel-kv
const threads = new Map<string, Thread>();

export function saveMessage(msg: Message) {
  const phone = msg.direction === 'inbound' ? msg.from : msg.to;
  const thread = threads.get(phone) || { messages: [], contactName: phone };
  if (!thread.messages.find(m => m.id === msg.id)) {
    thread.messages.push(msg);
  }
  if (msg.contactName) thread.contactName = msg.contactName;
  threads.set(phone, thread);
}

export function getThread(phone: string): Message[] {
  return (threads.get(phone)?.messages || []).sort((a, b) => a.timestamp - b.timestamp);
}

export function getContacts() {
  const list: { phone: string; name: string; lastMessage: Message | null; unreadCount: number }[] = [];
  // Use forEach instead of for...of to stay compatible with ES5 target
  threads.forEach((thread, phone) => {
    const sorted = thread.messages.slice().sort((a, b) => b.timestamp - a.timestamp);
    const unread = thread.messages.filter(m => m.direction === 'inbound' && m.status === 'received').length;
    list.push({ phone, name: thread.contactName, lastMessage: sorted[0] || null, unreadCount: unread });
  });
  return list.sort((a, b) => (b.lastMessage?.timestamp ?? 0) - (a.lastMessage?.timestamp ?? 0));
}

export function markAllRead(phone: string) {
  const thread = threads.get(phone);
  if (!thread) return;
  thread.messages.forEach(m => { if (m.direction === 'inbound') m.status = 'read'; });
}
