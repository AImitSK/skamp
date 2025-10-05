import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route zum Testen ob RSS Feed URLs existieren
 * Diese serverseitige Validierung umgeht CORS-Probleme
 */
export async function POST(request: NextRequest) {
  try {
    const { websiteUrl } = await request.json();

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL ist erforderlich' },
        { status: 400 }
      );
    }

    // Standard RSS Feed Patterns
    const patterns = [
      '/feed',
      '/rss',
      '/feed.xml',
      '/rss.xml',
      '/atom.xml',
      '/index.xml',
      '/feeds/posts/default' // Blogger
    ];

    const baseUrl = new URL(websiteUrl).origin;
    const foundFeeds: string[] = [];

    // Teste jeden Pattern
    for (const pattern of patterns) {
      const testUrl = baseUrl + pattern;

      try {
        // HEAD Request um nur Header zu prüfen (schneller)
        const response = await fetch(testUrl, {
          method: 'HEAD',
          // Timeout nach 5 Sekunden
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SKAMP-RSS-Detector/1.0)',
          },
        });

        // Nur erfolgreiche Responses (200-299) als gefunden markieren
        if (response.ok) {
          foundFeeds.push(testUrl);
        }
      } catch (error) {
        // Ignoriere Fehler (404, Timeout, etc.) und teste weiter
        console.log(`RSS Feed nicht gefunden: ${testUrl}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      foundFeeds,
      totalFound: foundFeeds.length,
    });

  } catch (error) {
    console.error('RSS Detection Error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der RSS Feed Erkennung' },
      { status: 500 }
    );
  }
}
