// src/app/api/ai/text-transform/route.ts
// API Route für Text-Transformationen im Editor - Powered by Genkit!
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { textTransformFlow } from '@/lib/ai/flows/text-transform';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      const data = await req.json();
    const { text, action, tone, instruction, fullDocument } = data;

    // Validierung
    if (!text || text.trim() === '') {
      return NextResponse.json(
        { error: 'Text ist erforderlich' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action ist erforderlich' },
        { status: 400 }
      );
    }

    // Action-spezifische Validierung
    if (action === 'change-tone' && !tone) {
      return NextResponse.json(
        { error: 'Tone parameter ist erforderlich für change-tone action' },
        { status: 400 }
      );
    }

    if (action === 'custom' && !instruction) {
      return NextResponse.json(
        { error: 'Instruction parameter ist erforderlich für custom action' },
        { status: 400 }
      );
    }

      console.log('🔄 Text transformation request', {
        action,
        textLength: text.length,
        hasTone: !!tone,
        hasInstruction: !!instruction,
        hasFullDocument: !!fullDocument,
        organizationId: auth.organizationId
      });

      const estimatedWords = estimateAIWords(text + (fullDocument || ''), Math.ceil(text.split(' ').length * 1.2));

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

      const result = await textTransformFlow({
      text,
      action,
      tone: tone || null,
      instruction: instruction || null,
      fullDocument: fullDocument || null
    });

      console.log('✅ Text transformation successful', {
        action: result.action,
        originalLength: result.originalLength,
        transformedLength: result.transformedLength,
        wordCountChange: result.wordCountChange
      });

      try {
        const inputText = text + (fullDocument || '');
        await trackAIUsage(auth.organizationId, inputText, result.transformedText);
      } catch (trackingError) {
        console.error('⚠️ Failed to track AI usage:', trackingError);
      }

      return NextResponse.json({
      success: true,
      generatedText: result.transformedText, // Alias für Abwärtskompatibilität
      transformedText: result.transformedText,
      action: result.action,
      metrics: {
        originalLength: result.originalLength,
        transformedLength: result.transformedLength,
        wordCountChange: result.wordCountChange
      },
      aiProvider: 'genkit',
      timestamp: result.timestamp
    });

    } catch (error: any) {
      console.error('❌ Error in text transformation:', error);

      const errorMessage = error.message || 'Unbekannter Fehler bei der Text-Transformation';

      return NextResponse.json(
        { error: `Fehler bei der Text-Transformation: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
