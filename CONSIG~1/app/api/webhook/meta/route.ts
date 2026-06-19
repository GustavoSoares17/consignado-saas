import { NextRequest, NextResponse } from "next/server";
import { markAsRead, sendText } from "@/lib/meta";
import { saveMessage, getThread } from "@/lib/store";
import { generateAIResponse } from "@/lib/ai";

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

  await saveMessage({
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

  // Histórico da conversa (excluindo a mensagem que acabou de ser salva, ela
  // entra separadamente como "latestText" no prompt) para dar contexto à IA.
  const history = await getThread(from);
  const aiReply = await generateAIResponse(history.slice(0, -1), clientName, text);

  if (aiReply) {
    const result = await sendText(from, aiReply);
    const outId = result?.messages?.[0]?.id || `out_${Date.now()}`;
    await saveMessage({
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
