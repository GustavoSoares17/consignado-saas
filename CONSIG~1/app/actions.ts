'use server';

import { sendText, sendTemplate, TemplateComponent } from '@/lib/meta';
import { saveMessage } from '@/lib/store';
import { getSession } from '@/lib/auth';

export async function sendMessageAction(to: string, text: string) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado.' };
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

export async function sendTemplateAction(
  to: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[],
  previewText?: string
) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Não autenticado.' };
  try {
    const result = await sendTemplate(to, templateName, languageCode, components);
    const msgId = result?.messages?.[0]?.id || `out_${Date.now()}`;
    await saveMessage({
      id: msgId,
      from: process.env.META_PHONE_NUMBER_ID || 'system',
      to,
      body: previewText || `[Template: ${templateName}]`,
      timestamp: Date.now(),
      direction: 'outbound',
      status: 'sent',
    });
    return { ok: true, msgId };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao enviar template.' };
  }
}
