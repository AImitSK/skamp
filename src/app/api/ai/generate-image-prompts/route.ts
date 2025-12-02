// src/app/api/ai/generate-image-prompts/route.ts
// API Route für KI-gestützte Bildprompt-Generierung (3 Varianten) - Powered by Genkit!

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { generateImagePromptsFlow } from '@/lib/ai/flows/generate-image-prompts';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';

interface GenerateImagePromptsRequest {
  content: string;
  context?: {
    industry?: string;
    tone?: string;
    companyName?: string;
  };
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Request Body parsen
      const data: GenerateImagePromptsRequest = await req.json();
      const { content, context } = data;

      // Validierung
      if (!content || content.trim() === '') {
        return NextResponse.json(
          { error: 'Content ist erforderlich' },
          { status: 400 }
        );
      }

      if (content.trim().length < 100) {
        return NextResponse.json(
          { error: 'Content zu kurz (mind. 100 Zeichen benötigt für sinnvolle Bildvorschläge)' },
          { status: 400 }
        );
      }

      console.log('🎨 Bildprompt-Generierung mit Genkit Flow', {
        contentLength: content.length,
        hasContext: !!context,
        organizationId: auth.organizationId
      });

      // ══════════════════════════════════════════════════════════════
      // AI USAGE LIMIT CHECK
      // ══════════════════════════════════════════════════════════════

      // Bildprompt-Generierung = ~200 Wörter Output (3 Prompts + Beschreibungen)
      const estimatedWords = estimateAIWords(content, 200);

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

      const result = await generateImagePromptsFlow({
        content,
        context: context || null
      });

      console.log('✅ Bildprompts erfolgreich generiert mit Genkit', {
        suggestionCount: result.suggestions.length,
        styles: result.suggestions.map(s => s.style)
      });

      // ══════════════════════════════════════════════════════════════
      // AI USAGE TRACKING
      // ══════════════════════════════════════════════════════════════

      try {
        const inputText = content;
        const outputText = result.suggestions.map(s => `${s.prompt} ${s.description}`).join(' ');

        await trackAIUsage(auth.organizationId, inputText, outputText);
      } catch (trackingError) {
        console.error('⚠️ Failed to track AI usage:', trackingError);
        // Nicht werfen - Generation war erfolgreich
      }

      // Response im erwarteten Format
      return NextResponse.json({
        success: true,
        suggestions: result.suggestions,
        analysisNote: result.analysisNote,
        aiProvider: 'genkit',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Error generating image prompts with Genkit:', error);

      const errorMessage = error.message || 'Unbekannter Fehler bei der Bildprompt-Generierung';

      return NextResponse.json(
        { error: `Fehler bei der Bildprompt-Generierung: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
