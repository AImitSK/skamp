// src/app/api/ai/generate-headlines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content, currentTitle } = await request.json();

    if (!content || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Nicht genügend Inhalt für Headline-Generierung vorhanden' },
        { status: 400 }
      );
    }

    const prompt = `Erstelle 3 professionelle und prägnante Headlines für diese Pressemitteilung. Die Headlines sollen:
- Aufmerksamkeitserregend und prägnant sein
- Maximal 70 Zeichen lang
- Den Kerninhalt der Pressemitteilung widerspiegeln
- Für deutsche Medien geeignet sein
- SEO-optimiert sein

${currentTitle ? `Aktuelle Headline: "${currentTitle}"` : ''}

Inhalt der Pressemitteilung:
${content}

Gib nur die 3 Headlines zurück, jede in einer neuen Zeile, ohne Nummerierung oder zusätzliche Erklärungen.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener PR-Experte, der prägnante und wirkungsvolle Headlines für Pressemitteilungen erstellt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      return NextResponse.json(
        { error: 'Keine Headlines generiert' },
        { status: 500 }
      );
    }

    // Parse die Headlines aus der Antwort
    const headlines = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^\d+\./)) // Entferne Nummerierungen
      .slice(0, 3); // Maximal 3 Headlines

    if (headlines.length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Headlines generiert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ headlines });

  } catch (error) {
    console.error('Fehler bei Headline-Generierung:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Headline-Generierung' },
      { status: 500 }
    );
  }
}