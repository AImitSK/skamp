// src/app/api/proxy-firebase-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

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

    // Validierung: Nur Firebase Storage URLs erlauben
    if (!imageUrl.includes('firebasestorage.googleapis.com')) {
      return NextResponse.json(
        { error: 'Only Firebase Storage URLs are allowed' },
        { status: 400 }
      );
    }

    // Firebase Storage Image server-seitig laden
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch image from Firebase Storage' },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Image als Response zurückgeben mit korrekten Headern
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 1 Stunde Cache
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error proxying Firebase image:', error);
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