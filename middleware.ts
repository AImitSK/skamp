// middleware.ts - URL-Redirects und Subdomain-Routing
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Host-Detection: Prüfe beide Headers (Vercel Edge kann unterschiedliche verwenden)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || '';

  // Debug-Logging für Vercel (nur für root path)
  if (pathname === '/') {
    console.log('[Middleware] host:', host, 'x-forwarded-host:', forwardedHost, 'pathname:', pathname);
  }

  // Support-Subdomain: Rewrite zu /support/*
  // Prüfe auf support.celeropress.com (mit und ohne Port)
  const isSupportSubdomain =
    host === 'support.celeropress.com' ||
    host.startsWith('support.celeropress.com:') ||
    host === 'support.celeropress.com.';

  if (isSupportSubdomain) {
    // Wenn bereits /support im Pfad, nichts tun
    if (pathname.startsWith('/support')) {
      return NextResponse.next();
    }

    // Rewrite: / -> /support, /de -> /support/de, etc.
    const url = request.nextUrl.clone();
    url.pathname = `/support${pathname}`;
    console.log('[Middleware] Rewriting to:', url.pathname);
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
    // Matcher für alle Pfade außer statische Assets
    // Explizit auch den Root-Pfad / matchen
    '/',
    '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ]
};