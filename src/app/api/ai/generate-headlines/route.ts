// src/app/api/ai/generate-headlines/route.ts
// API Route für KI-gestützte Headline-Generierung (3 Varianten) - Powered by Genkit!

import { NextRequest, NextResponse } from 'next/server';
import { generateHeadlinesFlow } from '@/lib/ai/flows/generate-headlines';

interface GenerateHeadlinesRequest {
  content: string;
  currentHeadline?: string;
  context?: {
    industry?: string;
    tone?: string;
    audience?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Request Body parsen
    const data: GenerateHeadlinesRequest = await request.json();
    const { content, currentHeadline, context } = data;

    // Validierung
    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Content ist erforderlich' },
        { status: 400 }
      );
    }

    if (content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content zu kurz (mind. 50 Zeichen benötigt)' },
        { status: 400 }
      );
    }

    console.log('🎯 Headlines-Generierung mit Genkit Flow', {
      contentLength: content.length,
      hasCurrentHeadline: !!currentHeadline,
      hasContext: !!context
    });

    // ══════════════════════════════════════════════════════════════
    // GENKIT FLOW AUFRUF
    // ══════════════════════════════════════════════════════════════

    const result = await generateHeadlinesFlow({
      content,
      currentHeadline: currentHeadline || null,
      context: context || null
    });

    console.log('✅ Headlines erfolgreich generiert mit Genkit', {
      headlineCount: result.headlines.length,
      avgLength: Math.round(result.headlines.reduce((sum, h) => sum + h.length, 0) / result.headlines.length),
      avgSeoScore: Math.round(result.headlines.reduce((sum, h) => sum + h.seoScore, 0) / result.headlines.length)
    });

    // Response im erwarteten Format
    return NextResponse.json({
      success: true,
      headlines: result.headlines,
      analysisNote: result.analysisNote,
      aiProvider: 'genkit',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error generating headlines with Genkit:', error);

    const errorMessage = error.message || 'Unbekannter Fehler bei der Headline-Generierung';

    return NextResponse.json(
      { error: `Fehler bei der Headline-Generierung: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
