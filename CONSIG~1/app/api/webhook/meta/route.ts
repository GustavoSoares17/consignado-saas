import { NextRequest, NextResponse } from "next/server";
import { markAsRead, sendText } from "@/lib/meta";
import { saveMessage } from "@/lib/store";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Webhook] Verificado com sucesso.");
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  processWebhook(body).catch(err => console.error("[Webhook] Erro:", err));
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

async function processWebhook(body: any) {
  if (body.object !== "whatsapp_business_account") return;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change.value;
      if (!val) continue;
      for (const msg of val.messages ?? []) {
        await handleIncomingMessage(msg, val.contacts?.[0]);
      }
    }
  }
}

async function handleIncomingMessage(
  msg: any,
  contact: { profile: { name: string }; wa_id: string } | undefined
) {
  const from       = msg.from;
  const msgId      = msg.id;
  const text       = msg.text?.body ?? "";
  const clientName = contact?.profile?.name ?? from;

  console.log(`[Webhook] Mensagem de ${from} (${clientName}): "${text}"`);

  saveMessage({
    id: msgId,
    from,
    to: process.env.META_PHONE_NUMBER_ID || "me",
    body: text,
    timestamp: Date.now(),
    direction: "inbound",
    status: "received",
    contactName: clientName,
  });

  await markAsRead(msgId);

  const aiReply = await generateAIResponse(text, clientName);
  if (aiReply) {
    const result = await sendText(from, aiReply);
    const outId = result?.messages?.[0]?.id || `out_${Date.now()}`;
    saveMessage({
      id: outId,
      from: process.env.META_PHONE_NUMBER_ID || "me",
      to: from,
      body: aiReply,
      timestamp: Date.now(),
      direction: "outbound",
      status: "sent",
    });
  }
}

async function generateAIResponse(userMessage: string, clientName: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `Olá, ${clientName}! Recebemos sua mensagem e retornaremos em breve. 😊`;
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `Você é um assistente de crédito consignado CLT da GranaTech.
Ajude ${clientName} a contratar o empréstimo consignado. Seja cordial e objetivo.
Responda em português do Brasil. Nunca invente taxas ou valores.`,
          },
          { role: "user", content: userMessage },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) { console.error("[IA] Erro OpenAI:", data); return null; }
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[IA] Erro:", err);
    return null;
  }
}
