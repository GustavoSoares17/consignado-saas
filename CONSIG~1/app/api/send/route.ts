import { NextRequest, NextResponse } from "next/server";
import { sendText, sendTemplate } from "@/lib/meta";
import { saveMessage } from "@/lib/store";

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (INTERNAL_API_KEY && apiKey !== INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { to, type = "text", text, templateName, templateLanguage = "pt_BR", templateComponents } = body;

  if (!to) return NextResponse.json({ error: "Campo 'to' obrigatório" }, { status: 400 });

  try {
    let result: any;
    if (type === "template") {
      if (!templateName) return NextResponse.json({ error: "Campo 'templateName' obrigatório" }, { status: 400 });
      result = await sendTemplate(to, templateName, templateLanguage, templateComponents);
    } else {
      if (!text) return NextResponse.json({ error: "Campo 'text' obrigatório" }, { status: 400 });
      result = await sendText(to, text);
      const msgId = result?.messages?.[0]?.id || `out_${Date.now()}`;
      await saveMessage({
        id: msgId,
        from: process.env.META_PHONE_NUMBER_ID || "me",
        to,
        body: text,
        timestamp: Date.now(),
        direction: "outbound",
        status: "sent",
      });
    }
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("[Send] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro ao enviar" }, { status: 500 });
  }
}
