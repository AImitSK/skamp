// src/app/api/ai/generate/route.ts
// API Route für PR-Assistent - Jetzt powered by Genkit!
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { generatePressReleaseFlow } from '@/lib/ai/flows/generate-press-release';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';

interface GenerateRequest {
  prompt: string;
  mode: 'generate' | 'improve';
  existingContent?: string;
  context?: {
    industry?: string;
    tone?: string;
    audience?: string;
  };
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data: GenerateRequest = await req.json();
      const { prompt, existingContent, context } = data;
      const mode = data.mode || 'generate';

      if (!prompt || prompt.trim() === '') {
        return NextResponse.json(
          { error: 'Prompt ist erforderlich' },
          { status: 400 }
        );
      }

      console.log('🚀 Generating press release with Genkit Flow', {
        mode,
        promptLength: prompt.length,
        hasContext: !!context,
        organizationId: auth.organizationId
      });

      const estimatedWords = estimateAIWords(prompt + (existingContent || ''), 800);

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

      const result = await generatePressReleaseFlow({
      prompt,
      mode,
      existingContent: existingContent || null,
      context: context || null
    });

      console.log('✅ Press release generated successfully with Genkit', {
        outputLength: result.generatedText.length,
        mode: result.mode,
        postProcessed: result.postProcessed
      });

      try {
        const inputText = prompt + (existingContent || '');
        await trackAIUsage(auth.organizationId, inputText, result.generatedText);
      } catch (trackingError) {
        console.error('⚠️ Failed to track AI usage:', trackingError);
      }

      return NextResponse.json({
      success: true,
      generatedText: result.generatedText,
      mode: result.mode,
      aiProvider: 'genkit',  // ← Jetzt Genkit statt direkt Gemini!
      timestamp: result.timestamp,
      postProcessed: result.postProcessed
    });

    } catch (error: any) {
      console.error('❌ Error generating press release with Genkit:', error);

      const errorMessage = error.message || 'Unbekannter Fehler bei der KI-Generierung';

      return NextResponse.json(
        { error: `Fehler bei der KI-Generierung: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

// OPTIONS für CORS (wird automatisch von Next.js gehandhabt für same-origin)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}