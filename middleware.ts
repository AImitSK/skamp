// middleware.ts - URL-Redirects
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect Team-Freigabe URLs zu Info-Seite
  if (pathname.startsWith('/freigabe-intern/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/freigabe-nicht-mehr-verfuegbar';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/freigabe-intern/:path*']
};