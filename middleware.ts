// middleware.ts - URL-Redirects und Subdomain-Routing
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Support-Subdomain: Rewrite zu /support/*
  if (host === 'support.celeropress.com' || host.startsWith('support.celeropress.com:')) {
    // Wenn bereits /support im Pfad, nichts tun
    if (pathname.startsWith('/support')) {
      return NextResponse.next();
    }

    // Rewrite: / -> /support, /de -> /support/de, etc.
    const url = request.nextUrl.clone();
    url.pathname = `/support${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Redirect Team-Freigabe URLs zu Info-Seite
  if (pathname.startsWith('/freigabe-intern/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/freigabe-nicht-mehr-verfuegbar';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Support-Subdomain: alle Pfade
    '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ]
};