import { NextRequest, NextResponse } from 'next/server';
import { getLeads, saveLeads, Lead } from '@/lib/ai-config';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const leads = await getLeads();
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
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
