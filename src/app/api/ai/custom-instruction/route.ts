// src/app/api/ai/custom-instruction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Key aus Umgebungsvariablen
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY ist nicht in den Umgebungsvariablen gesetzt!');
}

interface CustomInstructionRequest {
  originalText: string;
  instruction: string;
}

export async function POST(request: NextRequest) {
  try {
    // API Key Check - wie in generate route
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY ist nicht verfügbar in custom-instruction route');
    }

    // Request Body parsen
    const data: CustomInstructionRequest = await request.json();
    const { originalText, instruction } = data;

    // Validierung
    if (!originalText || originalText.trim() === '') {
      return NextResponse.json(
        { error: 'Original Text ist erforderlich' },
        { status: 400 }
      );
    }

    if (!instruction || instruction.trim() === '') {
      return NextResponse.json(
        { error: 'Anweisung ist erforderlich' },
        { status: 400 }
      );
    }


    // Gemini initialisieren
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'API Key nicht verfügbar' },
        { status: 500 }
      );
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

    // ULTRA-PRÄZISER System-Prompt nur für Custom Instructions
    const systemPrompt = `Du bist ein präziser Text-Editor. Du machst AUSSCHLIESSLICH die angeforderte Änderung und behältst alles andere 1:1 bei.

ABSOLUTE REGELN:
- Ändere NUR das, was explizit in der Anweisung steht
- KEINE Umformulierungen, KEINE Ergänzungen, KEINE Kürzungen
- KEINE Verbesserungen oder Optimierungen  
- KEINE Formatierung hinzufügen oder entfernen
- EXAKT die gleiche Textstruktur beibehalten
- Antworte NUR mit dem minimal veränderten Text

BEISPIELE:
Original: "Firma ABC bietet Services an."
Anweisung: "Firma heißt jetzt XYZ"
Antwort: "Firma XYZ bietet Services an."

Original: "Das Produkt kostet 100€ und ist verfügbar."
Anweisung: "Preis auf 150€ ändern"
Antwort: "Das Produkt kostet 150€ und ist verfügbar."

WICHTIG: Mache wirklich NUR die eine spezifische Änderung!`;

    const userPrompt = `ORIGINALTEXT (EXAKT beibehalten außer der spezifischen Änderung):
${originalText}

SPEZIFISCHE ÄNDERUNG:
${instruction}

Mache nur diese eine Änderung und behalte alles andere exakt bei:`;


    // KI-Anfrage mit Error Handling
    let generatedText: string;
    try {
      const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
      const response = await result.response;
      generatedText = response.text();
    } catch (geminiError) {
      console.error('Gemini API Error:', geminiError);
      return NextResponse.json(
        { error: 'KI-Verarbeitung fehlgeschlagen', details: geminiError instanceof Error ? geminiError.message : String(geminiError) },
        { status: 500 }
      );
    }


    return NextResponse.json({
      generatedText,
      originalText,
      instruction
    });

  } catch (error) {
    console.error('Custom Instruction API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Anweisung' },
      { status: 500 }
    );
  }
}