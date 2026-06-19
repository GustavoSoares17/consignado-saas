/**
 * Meta WhatsApp Cloud API — helpers de envio
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const BASE_URL = "https://graph.facebook.com/v19.0";

const PHONE_ID  = process.env.META_PHONE_NUMBER_ID!;
const TOKEN     = process.env.META_ACCESS_TOKEN!;
const WABA_ID   = process.env.META_WABA_ID!;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface MetaTextPayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: { body: string; preview_url?: boolean };
}

export interface MetaTemplatePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: "body" | "header" | "button";
  sub_type?: "url" | "quick_reply";
  index?: number;
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type: "text" | "image" | "document" | "video";
  text?: string;
  image?: { link: string };
}

export interface MetaTemplateInfo {
  name: string;
  language: string;
  status: string;
  bodyText: string;
  varCount: number;
}

export interface IncomingMessage {
  from: string;          // número do cliente (ex: "5511987654321")
  id: string;            // ID da mensagem
  timestamp: string;
  type: "text" | "image" | "audio" | "document" | "button" | "interactive";
  text?: { body: string };
  button?: { payload: string; text: string };
}

export interface WebhookEntry {
  id: string;
  changes: {
    value: {
      messaging_product: "whatsapp";
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: { profile: { name: string }; wa_id: string }[];
      messages?: IncomingMessage[];
      statuses?: {
        id: string;
        status: "sent" | "delivered" | "read" | "failed";
        timestamp: string;
        recipient_id: string;
      }[];
    };
    field: string;
  }[];
}

// ─── Funções de envio ────────────────────────────────────────────────────────

async function callAPI(payload: object): Promise<Response> {
  return fetch(`${BASE_URL}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Envia mensagem de texto simples.
 * Funciona APENAS dentro da janela de 24h.
 */
export async function sendText(to: string, text: string) {
  const payload: MetaTextPayload = {
    messaging_product: "whatsapp",
    to: formatPhone(to),
    type: "text",
    text: { body: text, preview_url: false },
  };

  const res = await callAPI(payload);
  const data = await res.json();

  if (!res.ok) {
    console.error("[Meta] Erro ao enviar texto:", data);
    throw new Error(data?.error?.message ?? "Erro Meta API");
  }

  return data as { messages: [{ id: string }] };
}

/**
 * Envia um template aprovado pela Meta.
 * Usado para iniciar conversa OU quando a janela de 24h expirou.
 *
 * @example
 * await sendTemplate("5511987654321", "recuperacao_biometria_v1", "pt_BR", [
 *   { type: "body", parameters: [{ type: "text", text: "João" }, { type: "text", text: "https://link.com" }] }
 * ]);
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string = "pt_BR",
  components: TemplateComponent[] = []
) {
  const payload: MetaTemplatePayload = {
    messaging_product: "whatsapp",
    to: formatPhone(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 && { components }),
    },
  };

  const res = await callAPI(payload);
  const data = await res.json();

  if (!res.ok) {
    console.error("[Meta] Erro ao enviar template:", data);
    throw new Error(data?.error?.message ?? "Erro Meta API");
  }

  return data as { messages: [{ id: string }] };
}

/**
 * Lista os templates de mensagem aprovados pela Meta para a WABA configurada.
 * Usado no disparo em massa, já que mensagens fora da janela de 24h exigem template.
 */
export async function listTemplates(): Promise<MetaTemplateInfo[]> {
  if (!WABA_ID || !TOKEN) return [];
  const res = await fetch(
    `${BASE_URL}/${WABA_ID}/message_templates?fields=name,status,language,components&limit=200`,
    { headers: { Authorization: `Bearer ${TOKEN}` } }
  );
  const data = await res.json();
  if (!res.ok) {
    console.error("[Meta] Erro ao listar templates:", data);
    return [];
  }
  const items = (data?.data || []) as any[];
  return items
    .filter((t) => t.status === "APPROVED")
    .map((t) => {
      const body = (t.components || []).find((c: any) => c.type === "BODY");
      const bodyText = body?.text || "";
      const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
      const varCount = matches.length
        ? Math.max(...matches.map((m: string) => parseInt(m.replace(/\D/g, ""), 10)))
        : 0;
      return { name: t.name, language: t.language, status: t.status, bodyText, varCount };
    });
}

/**
 * Marca uma mensagem como lida (exibe os dois checks azuis).
 */
export async function markAsRead(messageId: string) {
  const res = await fetch(`${BASE_URL}/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
  return res.json();
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Garante que o número esteja no formato internacional sem + ou espaços.
 * Entrada: "11 98765-4321" → Saída: "5511987654321"
 * Entrada: "+5511987654321" → Saída: "5511987654321"
 */
export function formatPhone(phone: string): string {
  let n = phone.replace(/\D/g, "");
  if (n.length === 10 || n.length === 11) n = "55" + n;
  return n;
}

/**
 * Verifica se a janela de 24h ainda está aberta com base no timestamp
 * da última mensagem recebida do cliente.
 */
export function isWithin24hWindow(lastClientMessageAt: Date): boolean {
  const diff = Date.now() - lastClientMessageAt.getTime();
  return diff < 24 * 60 * 60 * 1000;
}
