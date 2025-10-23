// src/app/api/ai/analyze-keyword-seo/route.ts
// API Route für SEO-Keyword-Analyse - Powered by Genkit!

import { NextRequest, NextResponse } from 'next/server';
import { analyzeKeywordSEOFlow } from '@/lib/ai/flows/analyze-keyword-seo';

export async function POST(request: NextRequest) {
  try {
    // Request Body parsen
    const data = await request.json();
    const { keyword, text } = data;

    // Validierung
    if (!keyword || keyword.trim() === '') {
      return NextResponse.json(
        { error: 'Keyword ist erforderlich' },
        { status: 400 }
      );
    }

    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Text ist erforderlich' },
        { status: 400 }
      );
    }

    // Längen-Validierung
    if (keyword.length > 100) {
      return NextResponse.json(
        { error: 'Keyword zu lang (max. 100 Zeichen)' },
        { status: 400 }
      );
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Text zu kurz für sinnvolle Analyse (min. 50 Zeichen)' },
        { status: 400 }
      );
    }

    if (text.length > 15000) {
      return NextResponse.json(
        { error: 'Text zu lang (max. 15.000 Zeichen)' },
        { status: 400 }
      );
    }

    console.log('🔍 SEO-Keyword-Analyse Request', {
      keyword,
      textLength: text.length
    });

    // ══════════════════════════════════════════════════════════════
    // GENKIT FLOW AUFRUF
    // ══════════════════════════════════════════════════════════════

    const result = await analyzeKeywordSEOFlow({
      keyword,
      text
    });

    console.log('✅ SEO-Keyword-Analyse erfolgreich', {
      keyword: result.keyword,
      semanticRelevance: result.semanticRelevance,
      contextQuality: result.contextQuality,
      keywordFit: result.keywordFit,
      targetAudience: result.targetAudience,
      tonality: result.tonality
    });

    // ══════════════════════════════════════════════════════════════
    // RESPONSE FORMAT (Abwärtskompatibel mit PRSEOHeaderBar)
    // ══════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      // Haupt-Felder (kompatibel mit alter Struktur)
      semanticRelevance: result.semanticRelevance,
      contextQuality: result.contextQuality,
      targetAudience: result.targetAudience,
      tonality: result.tonality,
      relatedTerms: result.relatedTerms,

      // Neue erweiterte Felder
      targetAudienceConfidence: result.targetAudienceConfidence,
      tonalityConfidence: result.tonalityConfidence,
      keywordFit: result.keywordFit,
      recommendations: result.recommendations,

      // Metadaten
      keyword: result.keyword,
      analysisTimestamp: result.analysisTimestamp,
      textLength: result.textLength,
      aiProvider: 'genkit'
    });

  } catch (error: any) {
    console.error('❌ Error in SEO-Keyword-Analyse:', error);

    const errorMessage = error.message || 'Unbekannter Fehler bei der SEO-Keyword-Analyse';

    return NextResponse.json(
      { error: `Fehler bei der SEO-Keyword-Analyse: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
