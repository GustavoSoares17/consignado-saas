import { NextRequest, NextResponse } from 'next/server';
import { getAIConfig, saveAIConfig, AIConfig } from '@/lib/ai-config';

export async function GET() {
  const cfg = await getAIConfig();
  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  let cfg: AIConfig;
  try {
    cfg = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  await saveAIConfig(cfg);
  return NextResponse.json({ ok: true });
}
