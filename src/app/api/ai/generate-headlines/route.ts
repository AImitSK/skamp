// src/app/api/ai/generate-headlines/route.ts
// API Route für KI-gestützte Headline-Generierung (3 Varianten) - Powered by Genkit!

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { generateHeadlinesFlow } from '@/lib/ai/flows/generate-headlines';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';

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
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Request Body parsen
      const data: GenerateHeadlinesRequest = await req.json();
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
      hasContext: !!context,
      organizationId: auth.organizationId
    });

    // ══════════════════════════════════════════════════════════════
    // AI USAGE LIMIT CHECK
    // ══════════════════════════════════════════════════════════════

    const estimatedWords = estimateAIWords(content, 150); // Headline = ~150 words output

    try {
      const limitCheck = await checkAILimit(auth.organizationId, estimatedWords);

      if (!limitCheck.allowed) {
        console.warn('⚠️ AI limit exceeded:', {
          current: limitCheck.current,
          limit: limitCheck.limit,
          remaining: limitCheck.remaining,
          wouldExceed: limitCheck.wouldExceed
        });

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

      console.log('✅ AI limit check passed:', {
        current: limitCheck.current,
        limit: limitCheck.limit,
        remaining: limitCheck.remaining,
        estimated: estimatedWords
      });
    } catch (limitError) {
      console.error('❌ Error checking AI limit:', limitError);
      return NextResponse.json(
        { error: 'Fehler beim Prüfen des AI-Limits. Bitte kontaktiere den Support.' },
        { status: 500 }
      );
    }

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

    // ══════════════════════════════════════════════════════════════
    // AI USAGE TRACKING
    // ══════════════════════════════════════════════════════════════

    try {
      const inputText = content + (currentHeadline || '');
      const outputText = result.headlines.map(h => h.headline).join(' ');

      await trackAIUsage(auth.organizationId, inputText, outputText);
    } catch (trackingError) {
      console.error('⚠️ Failed to track AI usage:', trackingError);
      // Nicht werfen - Generation war erfolgreich
    }

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
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
