// middleware.ts - URL-Redirects
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Support-Subdomain: Redirect zu Hauptdomain/support
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (host.startsWith('support.')) {
    const url = new URL(`https://celeropress.com/support${pathname}`);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 301);
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
    '/',
    '/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ]
};