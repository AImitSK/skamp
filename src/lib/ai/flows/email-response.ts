// src/lib/ai/flows/email-response.ts
// Genkit Flow für Email Response Suggestions (4 Types: answer, acknowledge, escalate, follow_up)

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  EmailResponseInputSchema,
  EmailResponseOutputSchema,
  type EmailResponseInput,
  type EmailResponseOutput
} from '../schemas/email-response-schemas';

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS (4 Response Types)
// ══════════════════════════════════════════════════════════════

const TONE_DESCRIPTIONS: Record<string, { de: string; en: string }> = {
  formal: { de: 'förmlich und geschäftsmäßig', en: 'formal and businesslike' },
  friendly: { de: 'freundlich und persönlich', en: 'friendly and personal' },
  professional: { de: 'professionell und sachlich', en: 'professional and factual' },
  empathetic: { de: 'empathisch und verständnisvoll', en: 'empathetic and understanding' }
};

function getSystemPrompt(responseType: string, tone: string, language: string): string {
  const lang = language === 'de' ? 'auf Deutsch' : 'in English';
  const toneDesc = TONE_DESCRIPTIONS[tone]?.[language] || TONE_DESCRIPTIONS[tone]?.de || tone;

  const baseInstructions = `ANTWORT-QUALITÄT:
✓ Verwende ${toneDesc} Tonalität
✓ Schreibe ${lang}
✓ Strukturiere klar und verständlich
✓ Keine Werbesprache oder übertriebene Höflichkeit

ANTWORTE NUR mit JSON:
{
  "suggestions": [
    {
      "responseText": "Vollständige Email...",
      "tone": "${tone}",
      "confidence": 0.85,
      "keyPoints": ["Punkt 1", "Punkt 2"],
      "suggestedActions": ["Aktion"],
      "personalizations": {"customerName": "Name"}
    }
  ]
}

Erstelle GENAU 3 verschiedene Varianten.`;

  switch (responseType) {
    case 'answer':
      return `Du bist ein Kundenservice-Experte. Erstelle hilfreiche Email-Antworten.

AUFGABE: Beantworte die Kundenanfrage vollständig und ${toneDesc} ${lang}.

STRUKTUR:
- Höfliche Begrüßung/Dank
- Direkte Antwort auf alle Fragen
- Zusätzliche hilfreiche Informationen
- Nächste Schritte (falls relevant)
- Professioneller Abschluss

${baseInstructions}`;

    case 'acknowledge':
      return `Du bist ein Kundenservice-Experte. Erstelle Eingangsbestätigungen.

AUFGABE: Bestätige den Erhalt ${toneDesc} ${lang} und kommuniziere nächste Schritte.

ELEMENTE:
- Dank für die Nachricht
- Bestätigung des Erhalts
- Kurze Zusammenfassung des Anliegens
- Erwartete Bearbeitungszeit
- Nächste Schritte
- Kontaktmöglichkeiten

${baseInstructions}`;

    case 'escalate':
      return `Du bist ein Kundenservice-Experte. Erstelle Eskalations-Emails.

AUFGABE: Eskaliere das Anliegen ${toneDesc} ${lang} an zuständiges Team.

ELEMENTE:
- Verständnis für die Situation zeigen
- Erklärung der Weiterleitung
- Erwartungen setzen
- Entschuldigung (falls nötig)
- Kontaktdaten

${baseInstructions}`;

    case 'follow_up':
      return `Du bist ein Kundenservice-Experte. Erstelle Nachfass-Emails.

AUFGABE: Erstelle höfliche Nachfrage ${toneDesc} ${lang}.

ELEMENTE:
- Bezug auf vorherige Kommunikation
- Höfliche Erinnerung
- Angebot weiterer Hilfe
- Klare nächste Schritte
- Zeitrahmen für Antwort

${baseInstructions}`;

    default:
      return baseInstructions;
  }
}

// ══════════════════════════════════════════════════════════════
// USER PROMPT BUILDER
// ══════════════════════════════════════════════════════════════

function buildUserPrompt(input: EmailResponseInput): string {
  let prompt = `URSPRÜNGLICHE EMAIL:
Betreff: ${input.originalEmail.subject}
Von: ${input.originalEmail.fromEmail}
An: ${input.originalEmail.toEmail}
Inhalt: ${input.originalEmail.content.substring(0, 3000)}`;

  if (input.context) {
    if (input.context.customerName) {
      prompt += `\n\nKUNDE: ${input.context.customerName}`;
    }
    if (input.context.customerHistory) {
      prompt += `\nKUNDEN-HISTORIE: ${input.context.customerHistory.substring(0, 500)}`;
    }
    if (input.context.companyInfo) {
      prompt += `\nUNTERNEHMEN: ${input.context.companyInfo.substring(0, 300)}`;
    }
    if (input.context.threadHistory && input.context.threadHistory.length > 0) {
      prompt += `\n\nVORHERIGE NACHRICHTEN:\n${input.context.threadHistory.slice(0, 3).join('\n---\n')}`;
    }
  }

  prompt += `\n\nANTWORT-TYP: ${input.responseType}
TONALITÄT: ${input.tone}
SPRACHE: ${input.language}

Erstelle 3 verschiedene Email-Antworten als JSON:`;

  return prompt;
}

// ══════════════════════════════════════════════════════════════
// JSON PARSER
// ══════════════════════════════════════════════════════════════

function parseAIResponse(aiText: string): any {
  try {
    return JSON.parse(aiText);
  } catch {
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch {
      const codeBlockMatch = aiText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) return JSON.parse(codeBlockMatch[1]);
    }
  }
  throw new Error('Could not parse JSON from AI response');
}

// ══════════════════════════════════════════════════════════════
// FALLBACK
// ══════════════════════════════════════════════════════════════

function createFallbackResponse(input: EmailResponseInput): EmailResponseOutput {
  const fallbackText = input.language === 'de'
    ? `Vielen Dank für Ihre Nachricht bezüglich "${input.originalEmail.subject}". Wir haben Ihre Anfrage erhalten und werden uns zeitnah bei Ihnen melden.\n\nMit freundlichen Grüßen`
    : `Thank you for your message regarding "${input.originalEmail.subject}". We have received your inquiry and will get back to you shortly.\n\nBest regards`;

  return {
    suggestions: [
      {
        responseText: fallbackText,
        tone: input.tone,
        confidence: 0.3,
        keyPoints: ['Fallback response - AI unavailable'],
        suggestedActions: ['Manual review required']
      }
    ],
    aiProvider: 'genkit-fallback',
    timestamp: new Date().toISOString()
  };
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const emailResponseFlow = ai.defineFlow(
  {
    name: 'emailResponse',
    inputSchema: EmailResponseInputSchema,
    outputSchema: EmailResponseOutputSchema,
  },
  async (input: EmailResponseInput): Promise<EmailResponseOutput> => {
    const startTime = Date.now();

    console.log('📧 Email Response Generation started', {
      responseType: input.responseType,
      tone: input.tone,
      language: input.language,
      hasContext: !!input.context
    });

    try {
      const systemPrompt = getSystemPrompt(input.responseType, input.tone, input.language);
      const userPrompt = buildUserPrompt(input);

      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [
          { text: systemPrompt },
          { text: userPrompt }
        ],
        config: {
          temperature: 0.7, // Higher for creative variation
          maxOutputTokens: 4096,
        },
        output: {
          format: 'json',
          schema: EmailResponseOutputSchema
        }
      });

      const responseText = result.message?.content?.[0]?.text || result.text || '';

      if (!responseText) {
        console.warn('⚠️ Empty AI response, using fallback');
        return createFallbackResponse(input);
      }

      let parsedData: any;
      try {
        parsedData = parseAIResponse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        return createFallbackResponse(input);
      }

      if (!parsedData.suggestions || !Array.isArray(parsedData.suggestions)) {
        console.error('❌ Invalid response format');
        return createFallbackResponse(input);
      }

      const processingTime = Date.now() - startTime;

      const output: EmailResponseOutput = {
        suggestions: parsedData.suggestions.slice(0, 3).map((s: any) => ({
          responseText: s.responseText || '',
          tone: s.tone || input.tone,
          confidence: Math.min(1, Math.max(0, s.confidence || 0.7)),
          keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints.slice(0, 5) : [],
          suggestedActions: Array.isArray(s.suggestedActions) ? s.suggestedActions.slice(0, 3) : undefined,
          personalizations: s.personalizations
        })),
        aiProvider: 'genkit',
        timestamp: new Date().toISOString(),
        processingTime
      };

      console.log('✅ Email Response Generation successful', {
        responseType: input.responseType,
        suggestionsCount: output.suggestions.length,
        processingTime
      });

      return output;

    } catch (error: any) {
      console.error('❌ Error in Email Response Generation:', error);
      return createFallbackResponse(input);
    }
  }
);
