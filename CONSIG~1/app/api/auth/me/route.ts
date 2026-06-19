import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUsers, verifySession, toPublic, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const users = await getUsers();
  if (users.length === 0) {
    return NextResponse.json({ needsSetup: true, user: null });
  }
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session) return NextResponse.json({ needsSetup: false, user: null });
  const user = users.find((u) => u.id === session.id);
  if (!user) return NextResponse.json({ needsSetup: false, user: null });
  return NextResponse.json({ needsSetup: false, user: toPublic(user) });
}
