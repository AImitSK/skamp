/**
 * AI Merge Variants API Route
 *
 * Implementierung basierend auf intelligent-matching-enrichment.md
 * Zeilen 919-1047
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY nicht gesetzt!');
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY nicht gesetzt');
      return NextResponse.json(
        { error: 'KI-Service nicht konfiguriert' },
        { status: 500 }
      );
    }

    const { variants } = await request.json();

    console.log('🤖 AI Merge Request erhalten');
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

    console.log('🚀 Starte Gemini 2.0 Flash Merge...');

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `
Du bist ein Daten-Merge-Experte. Analysiere diese ${variants.length} Varianten eines Journalisten und erstelle die bestmögliche zusammengeführte Version.

**VARIANTEN:**

${variants.map((v: any, i: number) => `
**Variante ${i + 1} (Organisation: ${v.organizationName}):**
\`\`\`json
${JSON.stringify(v.contactData, null, 2)}
\`\`\`
`).join('\n')}

**AUFGABE:**

Erstelle EINE optimale Version mit folgenden Regeln:

1. **Name:** Wähle die vollständigste Form (mit Titel, Vorname, Nachname, Suffix)
2. **E-Mail:** Primäre E-Mail = die geschäftlichste (z.B. @spiegel.de besser als @gmail.com)
3. **Telefon:** Wenn mehrere → nimm die, die in mehreren Varianten vorkommt
4. **Position:** Wähle die spezifischste (z.B. "Politikredakteur" > "Redakteur")
5. **Beats:** KOMBINIERE alle einzigartigen Beats aus allen Varianten
6. **Media Types:** KOMBINIERE alle einzigartigen Types
7. **Social Profiles:** Nimm alle einzigartigen Profile (keine Duplikate)
8. **Webseite:** Nimm geschäftliche Webseite (Firmen-Webseite, nicht private)
9. **Publications:** KOMBINIERE alle einzigartigen Publikations-Namen aus allen Varianten
10. **Company:** Wähle vollständigsten Firmennamen und behalte companyId bei
11. **hasMediaProfile:** true wenn IRGENDEINE Variante es hat

**ANTWORT-FORMAT:**

Gib NUR ein gültiges JSON-Objekt zurück (kein Markdown, kein Text):

{
  "name": {
    "title": "Dr.",
    "firstName": "Maximilian",
    "lastName": "Müller",
    "suffix": null
  },
  "displayName": "Dr. Maximilian Müller",
  "emails": [
    { "email": "m.mueller@spiegel.de", "type": "business", "isPrimary": true }
  ],
  "phones": [
    { "number": "+49 40 1234567", "type": "business", "isPrimary": true }
  ],
  "position": "Politikredakteur",
  "department": "Politik",
  "beats": ["Politik", "Wirtschaft", "Europa"],
  "mediaTypes": ["print", "online"],
  "socialProfiles": [
    { "platform": "Twitter", "url": "https://twitter.com/mmueller", "handle": "@mmueller" }
  ],
  "website": "https://www.spiegel.de",
  "photoUrl": null,
  "companyName": "Spiegel Verlag",
  "companyId": "comp-id-123",
  "hasMediaProfile": true,
  "publications": ["Der Spiegel", "Spiegel Online"]
}

WICHTIG: NUR das JSON-Objekt zurückgeben, keine Erklärungen!
`;

    console.log('📤 Sende Prompt an Gemini...');
    const startTime = Date.now();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const duration = Date.now() - startTime;
    console.log(`⏱️  Gemini Antwort-Zeit: ${duration}ms`);
    console.log(`📥 Gemini Raw Response (erste 500 Zeichen):\n${text.substring(0, 500)}...`);

    // Parse JSON aus Response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ KI hat kein gültiges JSON zurückgegeben');
      console.error('Antwort:', text);
      throw new Error('KI hat kein gültiges JSON zurückgegeben');
    }

    const mergedData = JSON.parse(jsonMatch[0]);

    console.log('✅ AI Merge erfolgreich!');
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
      aiProvider: 'gemini-2.0-flash-exp',
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error merging variants with AI:', error);
    console.error('Stack:', error.stack);

    if (error.message?.includes('API_KEY_INVALID')) {
      console.error('API Key ist ungültig');
      return NextResponse.json({
        success: false,
        error: 'Ungültiger API Key'
      }, { status: 401 });
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
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
        error: `KI-Merge fehlgeschlagen: ${error.message}`
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}