'use server';

import { sendText } from '@/lib/meta';
import { saveMessage } from '@/lib/store';

export async function sendMessageAction(to: string, text: string) {
  const result = await sendText(to, text);
  const msgId = result?.messages?.[0]?.id || `out_${Date.now()}`;
  await saveMessage({
    id: msgId,
    from: process.env.META_PHONE_NUMBER_ID || 'system',
    to,
    body: text,
    timestamp: Date.now(),
    direction: 'outbound',
    status: 'sent',
  });
  return { ok: true, msgId };
}
