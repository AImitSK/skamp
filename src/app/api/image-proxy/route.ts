// src/app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy für externe Bilder in E-Mails
 *
 * Erlaubte Domains:
 * - googleusercontent.com (Gmail Signaturen, Avatare)
 * - gravatar.com (Gravatar Avatare)
 * - firebasestorage.googleapis.com (Firebase Storage)
 */

const ALLOWED_DOMAINS = [
  'googleusercontent.com',
  'gravatar.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'gstatic.com',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validierung: Nur erlaubte Domains
    const url = new URL(imageUrl);
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      url.hostname.endsWith(domain)
    );

    if (!isAllowed) {
      console.warn(`[image-proxy] Blocked URL from domain: ${url.hostname}`);
      return NextResponse.json(
        { error: `Domain not allowed: ${url.hostname}` },
        { status: 403 }
      );
    }

    console.info(`[image-proxy] Proxying image from: ${url.hostname}`);

    // Bild vom externen Server laden
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'CeleroPress-Image-Proxy/1.0',
      },
    });

    if (!response.ok) {
      console.error(`[image-proxy] Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch image from external source' },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Validierung: Nur Bild-Content-Types erlauben
    if (!contentType.startsWith('image/')) {
      console.warn(`[image-proxy] Invalid content-type: ${contentType}`);
      return NextResponse.json(
        { error: 'Invalid content type - only images allowed' },
        { status: 400 }
      );
    }

    // Image als Response zurückgeben mit korrekten Headern
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable', // 24 Stunden Cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[image-proxy] Error proxying image:', error);
    return NextResponse.json(
      { error: 'Internal server error while proxying image' },
      { status: 500 }
    );
  }
}

// OPTIONS Handler für CORS Pre-flight Requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
