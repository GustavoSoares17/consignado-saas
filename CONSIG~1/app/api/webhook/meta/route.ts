/**
 * Webhook Meta WhatsApp Cloud API
 *
 * GET  /api/webhook/meta  → verificação do webhook pelo Meta
 * POST /api/webhook/meta  → recebimento de mensagens e status em tempo real
 */

import { NextRequest, NextResponse } from "next/server";
import { markAsRead, sendText, sendTemplate, formatPhone, isWithin24hWindow } from "@/lib/meta";

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!; // string que você define

// ─── GET: verificação do webhook ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Webhook] Meta verificou o webhook com sucesso.");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("[Webhook] Token de verificação inválido:", token);
  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: recebimento de mensagens ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Meta espera HTTP 200 em até 20s — responda rápido e processe em background
  processWebhook(body).catch((err) =>
    console.error("[Webhook] Erro ao processar:", err)
  );

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

// ─── Processamento ───────────────────────────────────────────────────────────
async function processWebhook(body: any) {
  if (body.object !== "whatsapp_business_account") return;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const val = change.value;
      if (!val) continue;

      // ── Mensagens recebidas ──
      for (const msg of val.messages ?? []) {
        await handleIncomingMessage(msg, val.contacts?.[0]);
      }

      // ── Atualizações de status (enviado, entregue, lido) ──
      for (const status of val.statuses ?? []) {
        await handleStatusUpdate(status);
      }
    }
  }
}

async function handleIncomingMessage(
  msg: any,
  contact: { profile: { name: string }; wa_id: string } | undefined
) {
  const from      = msg.from;              // ex: "5511987654321"
  const msgId     = msg.id;
  const text      = msg.text?.body ?? "";
  const clientName = contact?.profile?.name ?? "Cliente";

  console.log(`[Webhook] Mensagem de ${from} (${clientName}): "${text}"`);

  // 1. Marca como lida (dois checks azuis)
  await markAsRead(msgId);

  // 2. Salve no banco de dados aqui (Prisma/Supabase/etc.)
  //    Exemplo com Prisma:
  //
  // await prisma.message.create({
  //   data: {
  //     externalId: msgId,
  //     from,
  //     body: text,
  //     direction: "INBOUND",
  //     lead: { connect: { phone: formatPhone(from) } },
  //   },
  // });

  // 3. Atualiza a janela de 24h do lead
  //
  // await prisma.lead.update({
  //   where: { phone: formatPhone(from) },
  //   data: { lastMessageAt: new Date() },
  // });

  // 4. Gera resposta via IA (OpenAI)
  const aiReply = await generateAIResponse(text, clientName);

  // 5. Envia resposta (estamos dentro da janela de 24h pois cliente acabou de escrever)
  if (aiReply) {
    await sendText(from, aiReply);

    console.log(`[Webhook] Resposta enviada para ${from}: "${aiReply}"`);

    // Salve a mensagem enviada no banco também:
    // await prisma.message.create({ data: { from: PHONE_ID, to: from, body: aiReply, direction: "OUTBOUND" } });
  }
}

async function handleStatusUpdate(status: any) {
  // status.status = "sent" | "delivered" | "read" | "failed"
  console.log(`[Webhook] Status de ${status.recipient_id}: ${status.status}`);

  // Atualize no banco:
  // await prisma.message.updateMany({
  //   where: { externalId: status.id },
  //   data: { status: status.status.toUpperCase() },
  // });
}

// ─── IA: gera resposta com OpenAI ────────────────────────────────────────────
async function generateAIResponse(
  userMessage: string,
  clientName: string
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[IA] OPENAI_API_KEY não configurada. Usando resposta padrão.");
    return `Olá, ${clientName}! Recebemos sua mensagem e entraremos em contato em breve.`;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `Você é um assistente de crédito consignado CLT.
Seu objetivo é ajudar o cliente ${clientName} a retomar o processo de contratação.
Seja sempre cordial, objetivo e profissional.
Responda em português do Brasil.
Se o cliente demonstrar interesse, incentive-o a continuar clicando no link que foi enviado.
Nunca invente informações sobre taxas ou valores — diga que o consultor confirmará os detalhes.`,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[IA] Erro OpenAI:", data);
      return null;
    }

    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[IA] Erro ao chamar OpenAI:", err);
    return null;
  }
}
