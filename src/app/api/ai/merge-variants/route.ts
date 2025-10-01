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
      return NextResponse.json(
        { error: 'KI-Service nicht konfiguriert' },
        { status: 500 }
      );
    }

    const { variants } = await request.json();

    if (!variants || variants.length === 0) {
      return NextResponse.json(
        { error: 'Varianten erforderlich' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
  "photoUrl": null
}

WICHTIG: NUR das JSON-Objekt zurückgeben, keine Erklärungen!
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON aus Response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('KI hat kein gültiges JSON zurückgegeben');
    }

    const mergedData = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      mergedData,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error merging variants with AI:', error);

    if (error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json({ error: 'Ungültiger API Key' }, { status: 401 });
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      return NextResponse.json({ error: 'Quota erreicht' }, { status: 429 });
    }

    return NextResponse.json(
      { error: `KI-Merge fehlgeschlagen: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}