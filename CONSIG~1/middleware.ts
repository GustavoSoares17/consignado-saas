import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'gt_session';

// Gate leve (apenas verifica se existe um cookie de sessão) — roda no Edge Runtime,
// onde os módulos Node (crypto) usados para validar a assinatura não estão disponíveis.
// A validação real (assinatura + papel/role) acontece em cada Route Handler / Server
// Action, que corre em runtime Node.js (ver lib/auth.ts -> getSession()).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon');

  if (isPublic) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
