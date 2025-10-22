/**
 * AI Merge Variants API Route (mit Genkit)
 *
 * Nutzt offiziellen Firebase Genkit Flow für KI-gestütztes Daten-Merging
 * https://firebase.google.com/docs/genkit
 */

import { NextRequest, NextResponse } from 'next/server';
import { mergeVariantsFlow } from '@/lib/ai/flows/merge-variants';

export async function POST(request: NextRequest) {
  try {
    const { variants } = await request.json();

    console.log('🤖 AI Merge Request erhalten (Genkit)');
    console.log(`📊 Anzahl Varianten: ${variants?.length || 0}`);

    if (!variants || variants.length === 0) {
      console.error('❌ Keine Varianten übergeben');
      return NextResponse.json(
        { error: 'Varianten erforderlich' },
        { status: 400 }
      );
    }

    // Bei nur einer Variante: Direkt zurückgeben (kein Merge nötig)
    if (variants.length === 1) {
      console.log('ℹ️  Nur 1 Variante → Kein Merge nötig, gebe Original zurück');
      return NextResponse.json({
        success: true,
        mergedData: variants[0].contactData,
        usedAi: false,
        reason: 'single_variant'
      });
    }

    console.log('🚀 Starte Genkit Flow: mergeVariantsFlow...');
    const startTime = Date.now();

    // ✅ Genkit Flow aufrufen (läuft server-side!)
    const mergedData = await mergeVariantsFlow({ variants });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Genkit Flow Antwort-Zeit: ${duration}ms`);

    console.log('✅ AI Merge erfolgreich (Genkit)!');
    console.log('📋 Gemergter Datensatz:');
    console.log(`   - Name: ${mergedData.displayName}`);
    console.log(`   - E-Mails: ${mergedData.emails?.length || 0}`);
    console.log(`   - Telefone: ${mergedData.phones?.length || 0}`);
    console.log(`   - Position: ${mergedData.position || 'N/A'}`);
    console.log(`   - Company: ${mergedData.companyName || 'N/A'}`);
    console.log(`   - Beats: ${mergedData.beats?.length || 0}`);
    console.log(`   - Publications: ${mergedData.publications?.length || 0}`);
    console.log(`   - hasMediaProfile: ${mergedData.hasMediaProfile || false}`);
    console.log(`   - Social Profiles: ${mergedData.socialProfiles?.length || 0}`);

    return NextResponse.json({
      success: true,
      mergedData,
      usedAi: true,
      aiProvider: 'genkit-gemini-2.0-flash',
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error merging variants with Genkit:', error);
    console.error('Stack:', error.stack);

    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('GOOGLE_GENAI_API_KEY')) {
      console.error('API Key ist ungültig oder nicht gesetzt');
      return NextResponse.json({
        success: false,
        error: 'Ungültiger API Key oder GOOGLE_GENAI_API_KEY nicht gesetzt'
      }, { status: 401 });
    } else if (error.message?.includes('QUOTA_EXCEEDED') || error.message?.includes('429')) {
      console.error('Gemini Quota überschritten');
      return NextResponse.json({
        success: false,
        error: 'Quota erreicht'
      }, { status: 429 });
    }

    console.error(`Genereller Fehler: ${error.message}`);
    return NextResponse.json(
      {
        success: false,
        error: `Genkit-Merge fehlgeschlagen: ${error.message}`
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}