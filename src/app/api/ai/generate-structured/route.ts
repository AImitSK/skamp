// src/app/api/ai/generate-structured/route.ts
// API Route für strukturierte PR-Generierung - Jetzt powered by Genkit!
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { generatePressReleaseStructuredFlow } from '@/lib/ai/flows/generate-press-release-structured';
import { expertAssistantFlow } from '@/lib/ai/flows/expert-assistant';
import { checkAILimit } from '@/lib/usage/usage-tracker';
import { estimateAIWords, trackAIUsage } from '@/lib/ai/helpers/usage-tracker';

interface StructuredGenerateRequest {
  prompt: string;
  /** Modus: 'standard' (default) oder 'expert' (AI Sequenz) */
  mode?: 'standard' | 'expert';
  /** Projekt-ID für Experten-Modus (lädt Kernbotschaft) */
  projectId?: string;
  /** Company-ID für Experten-Modus (lädt DNA Synthese) */
  companyId?: string;
  context?: {
    industry?: string;
    tone?: string;
    audience?: string;
    companyName?: string;
  };
  documentContext?: {
    documents: Array<{
      fileName: string;
      plainText: string;
      excerpt: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Request Body parsen
      const data: StructuredGenerateRequest = await req.json();
      const { prompt, context, documentContext, mode, projectId, companyId } = data;

      // ══════════════════════════════════════════════════════════════
      // EXPERTEN-MODUS: AI Sequenz (DNA Synthese + Kernbotschaft)
      // ══════════════════════════════════════════════════════════════
      if (mode === 'expert') {
        if (!projectId) {
          return NextResponse.json(
            { error: 'Projekt-ID erforderlich für Experten-Modus' },
            { status: 400 }
          );
        }

        console.log('🧪 Experten-Modus: AI Sequenz mit Genkit Flow', {
          projectId,
          companyId,
          promptLength: prompt?.length || 0,
          organizationId: auth.organizationId
        });

        if (!companyId) {
          console.warn('⚠️ Keine companyId übergeben - DNA Synthese wird nicht geladen');
        }

        // AI Usage Limit Check
        const estimatedWords = estimateAIWords(prompt || '', 1000);
        const limitCheck = await checkAILimit(auth.organizationId, estimatedWords);

        if (!limitCheck.allowed) {
          return NextResponse.json(
            {
              error: `AI-Limit erreicht! Du hast bereits ${limitCheck.current} von ${limitCheck.limit} AI-Wörtern verwendet.`,
              limitInfo: limitCheck
            },
            { status: 429 }
          );
        }

        // Expert Assistant Flow aufrufen (lädt DNA Synthese + Kernbotschaft automatisch)
        const expertResult = await expertAssistantFlow({
          projectId,
          companyId,
          userPrompt: prompt || 'Erstelle eine Pressemeldung basierend auf der DNA Synthese und Kernbotschaft.',
          language: 'de',
          outputFormat: 'pressrelease'
        });

        // AI Usage tracken
        const outputText = expertResult.structured.headline +
          expertResult.structured.leadParagraph +
          expertResult.structured.bodyParagraphs.join(' ');
        try {
          await trackAIUsage(auth.organizationId, prompt || '', outputText);
        } catch (trackingError) {
          console.error('⚠️ Failed to track AI usage:', trackingError);
        }

        // Response im strukturierten Format (wie generatePressReleaseStructuredFlow)
        const rawText = `${expertResult.structured.headline}\n\n${expertResult.structured.leadParagraph}\n\n${expertResult.structured.bodyParagraphs.join('\n\n')}`;

        return NextResponse.json({
          success: true,
          structured: expertResult.structured,
          headline: expertResult.structured.headline,
          htmlContent: expertResult.structured.htmlContent,
          rawText,
          aiProvider: 'genkit-expert',
          timestamp: new Date().toISOString(),
          usedDNASynthese: expertResult.usedDNASynthese,
          usedKernbotschaft: expertResult.usedKernbotschaft
        });
      }

      // ══════════════════════════════════════════════════════════════
      // STANDARD-MODUS: Normale Generierung
      // ══════════════════════════════════════════════════════════════

    // Validierung: Prompt ODER Dokumente erforderlich
    if ((!prompt || prompt.trim() === '') && !documentContext?.documents?.length) {
      return NextResponse.json(
        { error: 'Prompt oder Dokumente erforderlich' },
        { status: 400 }
      );
    }

    // Validierung Dokumenten-Kontext
    if (documentContext?.documents) {
      if (documentContext.documents.length > 3) {
        return NextResponse.json(
          { error: 'Maximal 3 Dokumente erlaubt' },
          { status: 400 }
        );
      }

      const totalSize = documentContext.documents.reduce(
        (sum, doc) => sum + doc.plainText.length,
        0
      );

      if (totalSize > 15000) {
        return NextResponse.json(
          { error: 'Dokumente-Kontext zu groß (max. 15000 Zeichen)' },
          { status: 400 }
        );
      }
    }

    console.log('🚀 Strukturierte PR-Generierung mit Genkit Flow', {
      mode: 'generate',
      promptLength: prompt.length,
      hasContext: !!context,
      hasDocuments: !!documentContext?.documents?.length,
      documentCount: documentContext?.documents?.length || 0,
      organizationId: auth.organizationId
    });

    // ══════════════════════════════════════════════════════════════
    // AI USAGE LIMIT CHECK
    // ══════════════════════════════════════════════════════════════

    const docText = documentContext?.documents?.map(d => d.plainText).join(' ') || '';
    const estimatedWords = estimateAIWords(prompt + docText, 800);

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
    // GENKIT FLOW AUFRUF - Ersetzt die komplette Prompt Library!
    // ══════════════════════════════════════════════════════════════

    const result = await generatePressReleaseStructuredFlow({
      prompt,
      context: context || null,
      documentContext: documentContext || null
    });

    console.log('✅ Strukturierte PR erfolgreich generiert mit Genkit', {
      headline: result.headline.substring(0, 50) + '...',
      bodyParagraphs: result.bodyParagraphs.length,
      hashtags: result.hashtags.length,
      socialOptimized: result.socialOptimized
    });

    // ══════════════════════════════════════════════════════════════
    // AI USAGE TRACKING
    // ══════════════════════════════════════════════════════════════

    try {
      const inputText = prompt + docText;
      const outputText = result.headline + result.leadParagraph + result.bodyParagraphs.join(' ');
      await trackAIUsage(auth.organizationId, inputText, outputText);
    } catch (trackingError) {
      console.error('⚠️ Failed to track AI usage:', trackingError);
    }

    // Response im Format, das der Frontend erwartet
    return NextResponse.json({
      success: true,
      structured: {
        headline: result.headline,
        leadParagraph: result.leadParagraph,
        bodyParagraphs: result.bodyParagraphs,
        quote: result.quote,
        cta: result.cta,
        hashtags: result.hashtags,
        socialOptimized: result.socialOptimized
      },
      headline: result.headline,
      htmlContent: result.htmlContent,
      rawText: `${result.headline}\n\n${result.leadParagraph}\n\n${result.bodyParagraphs.join('\n\n')}`,
      aiProvider: 'genkit',
      timestamp: new Date().toISOString(),
      usedDocuments: documentContext?.documents?.length || 0,
      documentNames: documentContext?.documents?.map(d => d.fileName) || []
    });

    } catch (error: any) {
      console.error('❌ Error generating structured PR with Genkit:', error);

      const errorMessage = error.message || 'Unbekannter Fehler bei der strukturierten KI-Generierung';

      return NextResponse.json(
        { error: `Fehler bei der strukturierten KI-Generierung: ${errorMessage}` },
        { status: 500 }
      );
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
