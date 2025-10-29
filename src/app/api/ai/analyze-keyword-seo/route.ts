// src/app/api/ai/analyze-keyword-seo/route.ts
// API Route für SEO-Keyword-Analyse - Powered by Genkit!

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { analyzeKeywordSEOFlow } from '@/lib/ai/flows/analyze-keyword-seo';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();
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
        textLength: text.length,
        organizationId: auth.organizationId
      });

      const estimatedWords = estimateAIWords(text, 300);

      try {
        const limitCheck = await checkAILimit(auth.organizationId, estimatedWords);

        if (!limitCheck.allowed) {
          return NextResponse.json(
            {
              error: `AI-Limit erreicht! Du hast bereits ${limitCheck.current} von ${limitCheck.limit} AI-Wörtern verwendet. Noch verfügbar: ${limitCheck.remaining} Wörter.`,
              limitInfo: {
                current: limitCheck.current,
                limit: limitCheck.limit,
                remaining: limitCheck.remaining,
                wouldExceed: limitCheck.wouldExceed,
                requestedAmount: estimatedWords
              }
            },
            { status: 429 }
          );
        }
      } catch (limitError) {
        console.error('❌ Error checking AI limit:', limitError);
        return NextResponse.json(
          { error: 'Fehler beim Prüfen des AI-Limits. Bitte kontaktiere den Support.' },
          { status: 500 }
        );
      }

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

      try {
        await trackAIUsage(auth.organizationId, text, JSON.stringify(result));
      } catch (trackingError) {
        console.error('⚠️ Failed to track AI usage:', trackingError);
      }

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
  });
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
