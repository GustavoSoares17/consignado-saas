import { NextRequest, NextResponse } from 'next/server';
import { getLeads, saveLeads, Lead } from '@/lib/ai-config';

export async function GET() {
  const leads = await getLeads();
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  let leads: Lead[];
  try {
    const body = await req.json();
    leads = body.leads ?? body;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  await saveLeads(leads);
  return NextResponse.json({ ok: true });
}
