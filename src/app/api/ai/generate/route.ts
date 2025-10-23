// src/app/api/ai/generate/route.ts
// API Route für PR-Assistent - Jetzt powered by Genkit!
import { NextRequest, NextResponse } from 'next/server';
import { generatePressReleaseFlow } from '@/lib/ai/flows/generate-press-release';

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
  try {
    // Request Body parsen
    const data: GenerateRequest = await request.json();
    const { prompt, existingContent, context } = data;

    // Mode mit Default-Wert (für Abwärtskompatibilität)
    const mode = data.mode || 'generate';

    // Validierung
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt ist erforderlich' },
        { status: 400 }
      );
    }

    console.log('🚀 Generating press release with Genkit Flow', {
      mode,
      promptLength: prompt.length,
      hasContext: !!context
    });

    // ══════════════════════════════════════════════════════════════
    // GENKIT FLOW AUFRUF - Ersetzt die komplette Gemini-Logik!
    // ══════════════════════════════════════════════════════════════

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

    // Genkit-spezifische Fehlerbehandlung
    const errorMessage = error.message || 'Unbekannter Fehler bei der KI-Generierung';

    return NextResponse.json(
      { error: `Fehler bei der KI-Generierung: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// OPTIONS für CORS (wird automatisch von Next.js gehandhabt für same-origin)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}