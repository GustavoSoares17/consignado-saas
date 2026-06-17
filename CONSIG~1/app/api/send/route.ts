/**
 * POST /api/send
 * Endpoint interno para disparar mensagens manualmente pelo dashboard.
 *
 * Body:
 *   { to: "11987654321", type: "text", text: "Olá!" }
 *   { to: "11987654321", type: "template", template: "recuperacao_biometria_v1", params: ["João", "https://link.com"] }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendText, sendTemplate } from "@/lib/meta";

export async function POST(req: NextRequest) {
  // Autenticação básica por API key interna
  const auth = req.headers.get("x-api-key");
  if (auth !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { to, type } = body;

  if (!to || !type) {
    return NextResponse.json({ error: "Campos obrigatórios: to, type" }, { status: 400 });
  }

  try {
    if (type === "text") {
      const { text } = body;
      if (!text) return NextResponse.json({ error: "Campo text obrigatório" }, { status: 400 });

      const result = await sendText(to, text);
      return NextResponse.json({ ok: true, messageId: result.messages[0].id });
    }

    if (type === "template") {
      const { template, lang = "pt_BR", params = [] } = body;
      if (!template) return NextResponse.json({ error: "Campo template obrigatório" }, { status: 400 });

      const components = params.length > 0
        ? [{ type: "body" as const, parameters: params.map((p: string) => ({ type: "text" as const, text: p })) }]
        : [];

      const result = await sendTemplate(to, template, lang, components);
      return NextResponse.json({ ok: true, messageId: result.messages[0].id });
    }

    return NextResponse.json({ error: "type deve ser 'text' ou 'template'" }, { status: 400 });

  } catch (err: any) {
    console.error("[/api/send] Erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
