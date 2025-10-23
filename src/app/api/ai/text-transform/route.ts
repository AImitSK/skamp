// src/app/api/ai/text-transform/route.ts
// API Route für Text-Transformationen im Editor - Powered by Genkit!
import { NextRequest, NextResponse } from 'next/server';
import { textTransformFlow } from '@/lib/ai/flows/text-transform';

export async function POST(request: NextRequest) {
  try {
    // Request Body parsen
    const data = await request.json();
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
      hasFullDocument: !!fullDocument
    });

    // ══════════════════════════════════════════════════════════════
    // GENKIT FLOW AUFRUF
    // ══════════════════════════════════════════════════════════════

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

    // ══════════════════════════════════════════════════════════════
    // RESPONSE FORMAT
    // ══════════════════════════════════════════════════════════════

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
}

// OPTIONS für CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
