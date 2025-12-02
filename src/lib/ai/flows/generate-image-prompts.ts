// src/lib/ai/flows/generate-image-prompts.ts
// Genkit Flow für KI-gestützte Bildprompt-Generierung (3 Varianten)

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  GenerateImagePromptsInputSchema,
  GenerateImagePromptsOutputSchema,
  type GenerateImagePromptsInput,
  type GenerateImagePromptsOutput,
  type ImagePromptSuggestion
} from '../schemas/image-generation-schemas';

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPT - Bildprompt-Generierung für PR Key Visuals
// ══════════════════════════════════════════════════════════════

const IMAGE_PROMPT_SYSTEM_PROMPT = `Du bist ein erfahrener Art Director und Visual Content Strategist für PR und Unternehmenskommunikation.

AUFGABE: Analysiere die Pressemeldung und erstelle GENAU 3 verschiedene Bildideen für ein Key Visual.

KRITISCHE REGELN:
✓ Erstelle GENAU 3 Bildvorschläge mit unterschiedlichen Stilen
✓ Der "prompt" MUSS auf ENGLISCH sein (für Imagen Bildgenerierung)
✓ Die "description" MUSS auf DEUTSCH sein (ausführlich, für den User)
✓ Jeder Vorschlag hat einen anderen "style": Fotorealistisch, Business, Konzeptuell
✓ Antworte NUR mit validem JSON, keine Erklärungen davor oder danach

DIE 3 BILDSTILE:

1. FOTOREALISTISCH
   - Echte Szenen, Menschen, Produkte, Orte
   - Professionelle Fotografie-Ästhetik
   - Gut für: Produktlaunches, Team-News, Events
   - Prompt-Stil: Detaillierte Szenen-Beschreibung

2. BUSINESS
   - Abstrakte Business-Symbolik, Datenvisualisierung
   - Clean, minimalistisch, corporate
   - Gut für: Quartalszahlen, Strategien, B2B-Themen
   - Prompt-Stil: Geometrische Formen, Diagramme, Icons

3. KONZEPTUELL
   - Metaphorische, kreative Darstellung
   - Symbolik, die die Kernaussage visualisiert
   - Gut für: Innovation, Zukunft, abstrakte Konzepte
   - Prompt-Stil: Symbolische Objekte, ungewöhnliche Perspektiven

PROMPT-QUALITÄT (ENGLISCH):
✓ Beginne mit dem Hauptmotiv
✓ Beschreibe Lichtstimmung und Farben
✓ Füge "professional photography", "high quality", "16:9 aspect ratio" hinzu
✓ Vermeide Text im Bild (Imagen kann keinen guten Text)
✓ Keine Logos oder Markennamen im Prompt
✓ Keine Personen mit erkennbaren Gesichtern (Datenschutz)

DESCRIPTION-QUALITÄT (DEUTSCH):
✓ Ausführlich genug, dass der User das Bild vor sich sieht
✓ Erkläre warum dieses Bild zur Pressemeldung passt
✓ 2-3 Sätze

MOOD-OPTIONEN:
- Professionell: Seriös, vertrauenswürdig, corporate
- Innovativ: Modern, zukunftsweisend, technologisch
- Vertrauenswürdig: Stabil, zuverlässig, etabliert
- Dynamisch: Energiegeladen, wachstumsorientiert
- Sachlich: Neutral, informativ, faktenbasiert

AUSGABEFORMAT (STRIKT JSON):
{
  "suggestions": [
    {
      "prompt": "English prompt for Imagen...",
      "description": "Ausführliche deutsche Beschreibung...",
      "style": "Fotorealistisch",
      "mood": "Professionell"
    },
    {
      "prompt": "English prompt for Imagen...",
      "description": "Ausführliche deutsche Beschreibung...",
      "style": "Business",
      "mood": "Innovativ"
    },
    {
      "prompt": "English prompt for Imagen...",
      "description": "Ausführliche deutsche Beschreibung...",
      "style": "Konzeptuell",
      "mood": "Dynamisch"
    }
  ],
  "analysisNote": "Kurze Notiz zur Analyse (optional)"
}`;

// ══════════════════════════════════════════════════════════════
// BEISPIEL FÜR GUTE OUTPUTS
// ══════════════════════════════════════════════════════════════

const EXAMPLE_OUTPUT = `
BEISPIEL - Pressemeldung über KI-Plattform für Datenanalyse:

{
  "suggestions": [
    {
      "prompt": "Modern open office space with diverse team of data scientists collaborating around large interactive touchscreen displaying colorful data visualizations and charts, natural daylight streaming through floor-to-ceiling windows, professional photography, high quality, 16:9 aspect ratio",
      "description": "Ein modernes Büro mit einem diversen Team von Datenexperten, die gemeinsam an einem großen interaktiven Bildschirm mit bunten Datenvisualisierungen arbeiten. Natürliches Tageslicht durch große Fenster vermittelt eine offene, innovative Arbeitsatmosphäre - perfekt für eine Pressemeldung über neue Datenanalyse-Lösungen.",
      "style": "Fotorealistisch",
      "mood": "Professionell"
    },
    {
      "prompt": "Abstract visualization of flowing data streams connecting multiple glowing nodes in a neural network pattern, deep blue and white color scheme, clean minimal corporate design, geometric shapes, professional photography, high quality, 16:9 aspect ratio",
      "description": "Eine abstrakte Visualisierung von Datenströmen, die durch ein neuronales Netzwerk fließen. Die blauen und weißen Farbtöne mit geometrischen Formen vermitteln Technologie und Professionalität - ideal für B2B-Kommunikation über KI-Lösungen.",
      "style": "Business",
      "mood": "Innovativ"
    },
    {
      "prompt": "Hourglass dissolving into digital particles and light beams flying upward, symbolizing time transformation and acceleration, futuristic tech aesthetic, teal and gold colors, dramatic lighting, professional photography, high quality, 16:9 aspect ratio",
      "description": "Eine Sanduhr, die sich in digitale Partikel und Lichtstrahlen auflöst - eine kraftvolle Metapher für Zeitersparnis und Beschleunigung. Die futuristische Ästhetik mit türkisen und goldenen Farbtönen symbolisiert den Sprung in eine effizientere Zukunft.",
      "style": "Konzeptuell",
      "mood": "Dynamisch"
    }
  ],
  "analysisNote": "Die Pressemeldung fokussiert auf Effizienzsteigerung durch KI - alle drei Bildkonzepte greifen dieses Thema auf unterschiedliche Weise auf."
}`;

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const generateImagePromptsFlow = ai.defineFlow(
  {
    name: 'generateImagePrompts',
    inputSchema: GenerateImagePromptsInputSchema,
    outputSchema: GenerateImagePromptsOutputSchema,
  },
  async (input: GenerateImagePromptsInput): Promise<GenerateImagePromptsOutput> => {

    console.log('🎨 Bildprompt-Generierung gestartet', {
      contentLength: input.content.length,
      hasContext: !!input.context
    });

    // ══════════════════════════════════════════════════════════════
    // 1. KONTEXT-AUFBEREITUNG
    // ══════════════════════════════════════════════════════════════

    let contextInfo = '';
    if (input.context) {
      if (input.context.industry) {
        contextInfo += `\nBRANCHE: ${input.context.industry}`;
      }
      if (input.context.tone) {
        contextInfo += `\nTONALITÄT: ${input.context.tone}`;
      }
      if (input.context.companyName) {
        contextInfo += `\nFIRMA: ${input.context.companyName} (NICHT im Bild-Prompt verwenden!)`;
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 2. USER PROMPT ZUSAMMENSTELLEN
    // ══════════════════════════════════════════════════════════════

    const userPrompt = `${contextInfo}

PRESSEMELDUNG:
${input.content.substring(0, 3000)}

${EXAMPLE_OUTPUT}

Erstelle jetzt 3 Bildvorschläge für diese Pressemeldung. Antworte NUR mit validem JSON:`;

    // ══════════════════════════════════════════════════════════════
    // 3. GEMINI API CALL
    // ══════════════════════════════════════════════════════════════

    console.log('🤖 Model: gemini-2.5-flash (für komplexe Prompt-Generierung)');

    const result = await ai.generate({
      model: gemini25FlashModel,
      prompt: [
        { text: IMAGE_PROMPT_SYSTEM_PROMPT },
        { text: userPrompt }
      ],
      config: {
        temperature: 0.9, // Etwas kreativer für Bildideen
        maxOutputTokens: 2048,
      }
    });

    // Text extrahieren
    const generatedText = result.message?.content?.[0]?.text || result.text;

    if (!generatedText || generatedText.trim() === '') {
      console.error('❌ Keine Antwort von Gemini');
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    console.log('✅ Bildprompts-Text generiert, Länge:', generatedText.length);

    // ══════════════════════════════════════════════════════════════
    // 4. JSON PARSING
    // ══════════════════════════════════════════════════════════════

    // Extrahiere JSON aus der Antwort (kann in Markdown-Blöcken sein)
    let jsonString = generatedText;

    // Entferne Markdown Code-Blöcke falls vorhanden
    const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    // Finde JSON-Objekt
    const jsonObjectMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonObjectMatch) {
      console.error('❌ Kein JSON-Objekt gefunden in:', generatedText.substring(0, 500));
      throw new Error('Kein valides JSON in der Antwort gefunden');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonObjectMatch[0]);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Versuchter JSON-String:', jsonObjectMatch[0].substring(0, 500));
      throw new Error('JSON konnte nicht geparst werden');
    }

    // ══════════════════════════════════════════════════════════════
    // 5. VALIDIERUNG & NORMALISIERUNG
    // ══════════════════════════════════════════════════════════════

    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      throw new Error('Ungültiges Format: suggestions Array fehlt');
    }

    if (parsed.suggestions.length !== 3) {
      console.warn(`⚠️ Erwartet 3 Vorschläge, erhalten: ${parsed.suggestions.length}`);
    }

    // Validiere und normalisiere jeden Vorschlag
    const validStyles = ['Fotorealistisch', 'Business', 'Konzeptuell'];
    const validMoods = ['Professionell', 'Innovativ', 'Vertrauenswürdig', 'Dynamisch', 'Sachlich'];

    const suggestions: ImagePromptSuggestion[] = parsed.suggestions.slice(0, 3).map((s: any, index: number) => ({
      prompt: s.prompt || '',
      description: s.description || '',
      style: validStyles.includes(s.style) ? s.style : validStyles[index % 3],
      mood: validMoods.includes(s.mood) ? s.mood : validMoods[0]
    }));

    // Stelle sicher, dass wir genau 3 haben
    while (suggestions.length < 3) {
      suggestions.push({
        prompt: 'Professional business scene with modern office environment, natural lighting, high quality, 16:9 aspect ratio',
        description: 'Professionelle Business-Szene als Fallback-Option.',
        style: validStyles[suggestions.length % 3] as any,
        mood: 'Professionell'
      });
    }

    console.log('✅ Bildprompts erfolgreich generiert', {
      suggestionCount: suggestions.length,
      styles: suggestions.map(s => s.style)
    });

    return {
      suggestions,
      analysisNote: parsed.analysisNote || null
    };
  }
);
