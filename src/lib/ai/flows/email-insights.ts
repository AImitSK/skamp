// src/lib/ai/flows/email-insights.ts
// Genkit Flow für Email Insights Analyse (5 Typen: sentiment, intent, priority, category, full)

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  EmailInsightsInputSchema,
  EmailInsightsOutputSchema,
  type EmailInsightsInput,
  type EmailInsightsOutput,
  type SentimentAnalysis,
  type IntentAnalysis,
  type PriorityAnalysis,
  type CategoryAnalysis,
  type FullEmailAnalysis,
  SentimentAnalysisSchema,
  IntentAnalysisSchema,
  PriorityAnalysisSchema,
  CategoryAnalysisSchema,
  FullEmailAnalysisSchema
} from '../schemas/email-insights-schemas';

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS (5 Analyse-Typen)
// ══════════════════════════════════════════════════════════════

const SENTIMENT_SYSTEM_PROMPT = `Du bist ein Experte für Email-Sentimentanalyse.

AUFGABE:
Analysiere die emotionale Stimmung und Dringlichkeit der Email.

SENTIMENT-KLASSIFIKATION:
- positive: Zufrieden, dankbar, freundlich, konstruktiv
- neutral: Sachlich, informativ, neutral-höflich
- negative: Unzufrieden, frustriert, beschwerdend, kritisch
- urgent: Sehr dringend, alarmierend, Notfall-Ton

URGENCY-LEVELS:
- low: Keine Dringlichkeit, informativ
- medium: Normale Bearbeitungszeit ausreichend
- high: Zeitnah reagieren empfohlen
- urgent: Sofortige Reaktion erforderlich

BEWERTUNGSKRITERIEN:
- Emotionale Wortwahl und Ton
- Verwendung von Ausrufezeichen, Großbuchstaben
- Zeitdruck-Formulierungen ("sofort", "dringend", "ASAP")
- Beschwerde-Indikatoren vs. Lob-Indikatoren
- Confidence: Wie sicher bist du? (0.0-1.0)

Antworte NUR mit validem JSON im vorgegebenen Schema.`;

const INTENT_SYSTEM_PROMPT = `Du bist ein Experte für Email-Intent-Analyse.

AUFGABE:
Bestimme die Haupt-Absicht des Absenders.

INTENT-KLASSIFIKATION:
- question: Stellt Frage(n), erwartet Antwort
- complaint: Beschwerde, Unzufriedenheit, Problem-Meldung
- request: Bittet um Aktion, Service, Feature
- information: Teilt Information, gibt Update
- compliment: Lob, positives Feedback, Dankeschön
- other: Andere Absichten

ACTION-REQUIRED:
- true: Absender erwartet konkrete Handlung/Antwort
- false: Informativ, keine Antwort nötig

SUGGESTED-ACTIONS:
- Konkrete nächste Schritte (max. 3)
- Priorisiert nach Wichtigkeit
- Actionable und spezifisch

RESPONSE-TEMPLATE:
- Wenn möglich, passende Antwort-Vorlage vorschlagen
- Orientiert an Intent und Ton

Confidence: Wie sicher bist du? (0.0-1.0)

Antworte NUR mit validem JSON im vorgegebenen Schema.`;

const PRIORITY_SYSTEM_PROMPT = `Du bist ein Experte für Email-Prioritätsbewertung.

AUFGABE:
Bewerte die Dringlichkeit und Priorität der Email.

PRIORITY-KLASSIFIKATION:
- low: Keine Eile, kann warten (3+ Tage)
- normal: Standard-Bearbeitung (24-48h)
- high: Zeitnah bearbeiten (4-24h)
- urgent: Sofort bearbeiten (<4h)

SLA-EMPFEHLUNGEN:
- 48h: Low Priority, keine Eile
- 24h: Normal Priority, Standard-Bearbeitung
- 4h: High Priority, zeitnah reagieren
- 1h: Urgent, sofortige Reaktion

ESCALATION-NEEDED:
- true: Manager/Lead informieren
- false: Team kann selbst bearbeiten

URGENCY-FACTORS:
- Liste von Faktoren die Priorität beeinflussen (max. 5)
- z.B. "Kunde erwähnt Vertrag-Kündigung"
- z.B. "Deadline in 2 Stunden"
- z.B. "VIP-Kunde"

Confidence: Wie sicher bist du? (0.0-1.0)

Antworte NUR mit validem JSON im vorgegebenen Schema.`;

const CATEGORY_SYSTEM_PROMPT = `Du bist ein Experte für Email-Kategorisierung.

AUFGABE:
Kategorisiere die Email nach Abteilung/Team.

CATEGORY-KLASSIFIKATION:
- sales: Verkauf, Angebote, Neukundenanfragen, Pricing
- support: Technischer Support, Hilfe, Bug-Reports
- billing: Rechnungen, Zahlungen, Abos, Refunds
- partnership: Kooperationen, Partnerschaften, B2B-Deals
- hr: Bewerbungen, Mitarbeiter-Anfragen, Karriere
- marketing: Kampagnen, PR, Content, Events
- legal: Rechtliche Anfragen, Datenschutz, AGB
- other: Sonstige

SUBCATEGORY:
- Spezifischere Unterkategorie (optional)
- z.B. "sales" → "enterprise-anfrage"
- z.B. "support" → "bug-report-kritisch"

SUGGESTED-DEPARTMENT:
- Welche Abteilung sollte dies bearbeiten?
- Basierend auf Category und Content

SUGGESTED-ASSIGNEE:
- Wenn erkennbar: Spezifische Person
- z.B. "Account Manager", "Senior Developer", "Billing Team Lead"
- Oder null wenn nicht zuweisbar

KEYWORDS:
- 3-5 Schlüsselwörter die zur Kategorisierung führten
- Keine Stoppwörter

Confidence: Wie sicher bist du? (0.0-1.0)

Antworte NUR mit validem JSON im vorgegebenen Schema.`;

const FULL_ANALYSIS_SYSTEM_PROMPT = `Du bist ein umfassender Email-Analyse-Experte.

AUFGABE:
Führe eine VOLLSTÄNDIGE Analyse der Email durch (Sentiment + Intent + Priority + Category).

ZUSÄTZLICH ZU DEN 4 ANALYSEN:

SUMMARY:
- Kurze Zusammenfassung (max. 500 Zeichen)
- Was ist der Kern der Email?
- Worum geht es dem Absender?

KEY-INSIGHTS:
- 3-5 wichtige Erkenntnisse aus der Email
- Was sollte der Empfänger wissen?
- Besondere Beachtungspunkte

CUSTOMER-INSIGHTS (optional):
- mood: Aktuelle Stimmung des Kunden
- relationship: Beziehungsstatus (neu, zufrieden, gefährdet, etc.)
- history: Erkennbare Historie oder Kontext

RECOMMENDED-RESPONSE (optional):
- Vorschlag für eine passende Antwort
- Nur bei klarem Intent und Action-Required
- Höflich, professionell, lösungsorientiert

WICHTIG:
- Alle 4 Teil-Analysen vollständig ausfüllen
- Konsistenz zwischen den Analysen beachten
- Confidence-Scores realistisch bewerten
- timestamp und modelVersion werden automatisch gesetzt

Antworte NUR mit validem JSON im vorgegebenen Schema.`;

// ══════════════════════════════════════════════════════════════
// USER PROMPT TEMPLATES
// ══════════════════════════════════════════════════════════════

function createSentimentPrompt(input: EmailInsightsInput): string {
  return `Analysiere das Sentiment dieser Email:

VON: ${input.fromEmail}
BETREFF: ${input.subject}

EMAIL-INHALT:
${input.emailContent.substring(0, 5000)}

${input.context?.customerInfo ? `\nKUNDEN-INFO: ${input.context.customerInfo}` : ''}

Bewerte Sentiment, Confidence, Emotional Tone, Key Phrases und Urgency Level.`;
}

function createIntentPrompt(input: EmailInsightsInput): string {
  return `Analysiere die Absicht dieser Email:

VON: ${input.fromEmail}
BETREFF: ${input.subject}

EMAIL-INHALT:
${input.emailContent.substring(0, 5000)}

${input.context?.threadHistory ? `\nTHREAD-HISTORIE:\n${input.context.threadHistory.slice(0, 3).join('\n---\n')}` : ''}

Bestimme Intent, Action Required, Suggested Actions und Response Template.`;
}

function createPriorityPrompt(input: EmailInsightsInput): string {
  return `Bewerte die Priorität dieser Email:

VON: ${input.fromEmail}
BETREFF: ${input.subject}

EMAIL-INHALT:
${input.emailContent.substring(0, 5000)}

${input.context?.campaignContext ? `\nKAMPAGNEN-KONTEXT: ${input.context.campaignContext}` : ''}

Bestimme Priority, SLA, Escalation-Notwendigkeit und Urgency Factors.`;
}

function createCategoryPrompt(input: EmailInsightsInput): string {
  return `Kategorisiere diese Email:

VON: ${input.fromEmail}
BETREFF: ${input.subject}

EMAIL-INHALT:
${input.emailContent.substring(0, 5000)}

Bestimme Category, Subcategory, Department, Assignee und Keywords.`;
}

function createFullAnalysisPrompt(input: EmailInsightsInput): string {
  let prompt = `Führe eine VOLLSTÄNDIGE Analyse dieser Email durch:

VON: ${input.fromEmail}
BETREFF: ${input.subject}

EMAIL-INHALT:
${input.emailContent.substring(0, 5000)}`;

  if (input.context?.threadHistory && input.context.threadHistory.length > 0) {
    prompt += `\n\nTHREAD-HISTORIE:\n${input.context.threadHistory.slice(0, 3).join('\n---\n')}`;
  }

  if (input.context?.customerInfo) {
    prompt += `\n\nKUNDEN-INFO: ${input.context.customerInfo}`;
  }

  if (input.context?.campaignContext) {
    prompt += `\n\nKAMPAGNEN-KONTEXT: ${input.context.campaignContext}`;
  }

  prompt += `\n\nAnalysiere:
1. Sentiment & Urgency
2. Intent & Actions
3. Priority & SLA
4. Category & Assignment
5. Summary & Insights`;

  return prompt;
}

// ══════════════════════════════════════════════════════════════
// HELPER: Prompt-Router
// ══════════════════════════════════════════════════════════════

function getPromptsForAnalysisType(input: EmailInsightsInput): {
  systemPrompt: string;
  userPrompt: string;
  outputSchema: any;
} {
  switch (input.analysisType) {
    case 'sentiment':
      return {
        systemPrompt: SENTIMENT_SYSTEM_PROMPT,
        userPrompt: createSentimentPrompt(input),
        outputSchema: SentimentAnalysisSchema
      };

    case 'intent':
      return {
        systemPrompt: INTENT_SYSTEM_PROMPT,
        userPrompt: createIntentPrompt(input),
        outputSchema: IntentAnalysisSchema
      };

    case 'priority':
      return {
        systemPrompt: PRIORITY_SYSTEM_PROMPT,
        userPrompt: createPriorityPrompt(input),
        outputSchema: PriorityAnalysisSchema
      };

    case 'category':
      return {
        systemPrompt: CATEGORY_SYSTEM_PROMPT,
        userPrompt: createCategoryPrompt(input),
        outputSchema: CategoryAnalysisSchema
      };

    case 'full':
    default:
      return {
        systemPrompt: FULL_ANALYSIS_SYSTEM_PROMPT,
        userPrompt: createFullAnalysisPrompt(input),
        outputSchema: FullEmailAnalysisSchema
      };
  }
}

// ══════════════════════════════════════════════════════════════
// JSON RESPONSE PARSER
// ══════════════════════════════════════════════════════════════

function parseAIResponse(aiText: string): any {
  try {
    return JSON.parse(aiText);
  } catch (e1) {
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e2) {
      const codeBlockMatch = aiText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }
    }
  }

  throw new Error('Could not parse JSON from AI response');
}

// ══════════════════════════════════════════════════════════════
// FALLBACK VALUES
// ══════════════════════════════════════════════════════════════

function createFallbackResponse(input: EmailInsightsInput): EmailInsightsOutput {
  const emailLower = input.emailContent.toLowerCase();

  // Basis-Sentiment-Erkennung
  const hasUrgentWords = /dringend|urgent|asap|sofort|wichtig|notfall/i.test(input.emailContent);
  const hasNegativeWords = /problem|fehler|bug|beschwerde|unzufrieden|ärger/i.test(emailLower);
  const hasPositiveWords = /danke|super|toll|perfekt|gefällt|zufrieden/i.test(emailLower);

  const sentiment: SentimentAnalysis = {
    sentiment: hasUrgentWords ? 'urgent' : hasNegativeWords ? 'negative' : hasPositiveWords ? 'positive' : 'neutral',
    confidence: 0.3,
    emotionalTone: [],
    keyPhrases: [],
    urgencyLevel: hasUrgentWords ? 'urgent' : 'medium',
    reasoning: 'Fallback-Analyse - AI nicht verfügbar'
  };

  const intent: IntentAnalysis = {
    intent: 'other',
    confidence: 0.3,
    actionRequired: hasUrgentWords,
    suggestedActions: ['Manuelle Prüfung erforderlich'],
    reasoning: 'Fallback-Analyse - AI nicht verfügbar'
  };

  const priority: PriorityAnalysis = {
    priority: hasUrgentWords ? 'urgent' : 'normal',
    confidence: 0.3,
    slaRecommendation: hasUrgentWords ? '1h' : '24h',
    escalationNeeded: hasUrgentWords,
    urgencyFactors: [],
    reasoning: 'Fallback-Analyse - AI nicht verfügbar'
  };

  const category: CategoryAnalysis = {
    category: 'other',
    confidence: 0.3,
    keywords: [],
    reasoning: 'Fallback-Analyse - AI nicht verfügbar'
  };

  switch (input.analysisType) {
    case 'sentiment':
      return { analysisType: 'sentiment', result: sentiment };
    case 'intent':
      return { analysisType: 'intent', result: intent };
    case 'priority':
      return { analysisType: 'priority', result: priority };
    case 'category':
      return { analysisType: 'category', result: category };
    case 'full':
    default:
      return {
        analysisType: 'full',
        result: {
          sentiment,
          intent,
          priority,
          category,
          summary: 'AI-Analyse fehlgeschlagen - Fallback aktiv',
          keyInsights: ['Manuelle Überprüfung erforderlich'],
          analysisTimestamp: new Date().toISOString(),
          modelVersion: 'fallback-v1'
        }
      };
  }
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const emailInsightsFlow = ai.defineFlow(
  {
    name: 'emailInsights',
    inputSchema: EmailInsightsInputSchema,
    outputSchema: EmailInsightsOutputSchema,
  },
  async (input: EmailInsightsInput): Promise<EmailInsightsOutput> => {
    console.log('📧 Email Insights Analyse gestartet', {
      analysisType: input.analysisType,
      fromEmail: input.fromEmail,
      subject: input.subject.substring(0, 50),
      contentLength: input.emailContent.length
    });

    try {
      // Prompt-Router: Hole passende Prompts für Analyse-Typ
      const { systemPrompt, userPrompt, outputSchema } = getPromptsForAnalysisType(input);

      // AI-Anfrage mit JSON-Mode
      const result = await ai.generate({
        model: gemini25FlashModel,
        prompt: [
          { text: systemPrompt },
          { text: userPrompt }
        ],
        config: {
          temperature: 0.4, // Etwas höher als SEO (0.3) für nuancierte Sentiment-Analyse
          maxOutputTokens: 4096, // Erhöht für Extended Thinking (vorallem bei Full Analysis)
        },
        output: {
          format: 'json',
          schema: outputSchema
        }
      });

      // Response extrahieren
      const responseText = result.message?.content?.[0]?.text || result.text || '';

      if (!responseText) {
        console.warn('⚠️ Leere AI-Response, nutze Fallback');
        return createFallbackResponse(input);
      }

      // JSON parsen
      let parsedData: any;
      try {
        parsedData = parseAIResponse(responseText);
      } catch (parseError) {
        console.error('❌ JSON-Parsing fehlgeschlagen:', parseError);
        return createFallbackResponse(input);
      }

      // Typ-spezifische Output-Konstruktion
      let output: EmailInsightsOutput;

      switch (input.analysisType) {
        case 'sentiment':
          output = {
            analysisType: 'sentiment',
            result: {
              sentiment: parsedData.sentiment || 'neutral',
              confidence: Math.min(1, Math.max(0, parsedData.confidence || 0.5)),
              emotionalTone: Array.isArray(parsedData.emotionalTone) ? parsedData.emotionalTone.slice(0, 5) : [],
              keyPhrases: Array.isArray(parsedData.keyPhrases) ? parsedData.keyPhrases.slice(0, 5) : [],
              urgencyLevel: parsedData.urgencyLevel || 'medium',
              reasoning: parsedData.reasoning
            }
          };
          break;

        case 'intent':
          output = {
            analysisType: 'intent',
            result: {
              intent: parsedData.intent || 'other',
              confidence: Math.min(1, Math.max(0, parsedData.confidence || 0.5)),
              actionRequired: parsedData.actionRequired !== undefined ? parsedData.actionRequired : true,
              suggestedActions: Array.isArray(parsedData.suggestedActions) ? parsedData.suggestedActions.slice(0, 3) : [],
              responseTemplate: parsedData.responseTemplate,
              reasoning: parsedData.reasoning
            }
          };
          break;

        case 'priority':
          output = {
            analysisType: 'priority',
            result: {
              priority: parsedData.priority || 'normal',
              confidence: Math.min(1, Math.max(0, parsedData.confidence || 0.5)),
              slaRecommendation: parsedData.slaRecommendation || '24h',
              escalationNeeded: parsedData.escalationNeeded !== undefined ? parsedData.escalationNeeded : false,
              urgencyFactors: Array.isArray(parsedData.urgencyFactors) ? parsedData.urgencyFactors.slice(0, 5) : [],
              reasoning: parsedData.reasoning
            }
          };
          break;

        case 'category':
          output = {
            analysisType: 'category',
            result: {
              category: parsedData.category || 'other',
              confidence: Math.min(1, Math.max(0, parsedData.confidence || 0.5)),
              subcategory: parsedData.subcategory,
              suggestedDepartment: parsedData.suggestedDepartment,
              suggestedAssignee: parsedData.suggestedAssignee,
              keywords: Array.isArray(parsedData.keywords) ? parsedData.keywords.slice(0, 5) : [],
              reasoning: parsedData.reasoning
            }
          };
          break;

        case 'full':
        default:
          output = {
            analysisType: 'full',
            result: {
              sentiment: {
                sentiment: parsedData.sentiment?.sentiment || 'neutral',
                confidence: Math.min(1, Math.max(0, parsedData.sentiment?.confidence || 0.5)),
                emotionalTone: Array.isArray(parsedData.sentiment?.emotionalTone) ? parsedData.sentiment.emotionalTone.slice(0, 5) : [],
                keyPhrases: Array.isArray(parsedData.sentiment?.keyPhrases) ? parsedData.sentiment.keyPhrases.slice(0, 5) : [],
                urgencyLevel: parsedData.sentiment?.urgencyLevel || 'medium',
                reasoning: parsedData.sentiment?.reasoning
              },
              intent: {
                intent: parsedData.intent?.intent || 'other',
                confidence: Math.min(1, Math.max(0, parsedData.intent?.confidence || 0.5)),
                actionRequired: parsedData.intent?.actionRequired !== undefined ? parsedData.intent.actionRequired : true,
                suggestedActions: Array.isArray(parsedData.intent?.suggestedActions) ? parsedData.intent.suggestedActions.slice(0, 3) : [],
                responseTemplate: parsedData.intent?.responseTemplate,
                reasoning: parsedData.intent?.reasoning
              },
              priority: {
                priority: parsedData.priority?.priority || 'normal',
                confidence: Math.min(1, Math.max(0, parsedData.priority?.confidence || 0.5)),
                slaRecommendation: parsedData.priority?.slaRecommendation || '24h',
                escalationNeeded: parsedData.priority?.escalationNeeded !== undefined ? parsedData.priority.escalationNeeded : false,
                urgencyFactors: Array.isArray(parsedData.priority?.urgencyFactors) ? parsedData.priority.urgencyFactors.slice(0, 5) : [],
                reasoning: parsedData.priority?.reasoning
              },
              category: {
                category: parsedData.category?.category || 'other',
                confidence: Math.min(1, Math.max(0, parsedData.category?.confidence || 0.5)),
                subcategory: parsedData.category?.subcategory,
                suggestedDepartment: parsedData.category?.suggestedDepartment,
                suggestedAssignee: parsedData.category?.suggestedAssignee,
                keywords: Array.isArray(parsedData.category?.keywords) ? parsedData.category.keywords.slice(0, 5) : [],
                reasoning: parsedData.category?.reasoning
              },
              summary: parsedData.summary || 'Keine Zusammenfassung verfügbar',
              keyInsights: Array.isArray(parsedData.keyInsights) ? parsedData.keyInsights.slice(0, 5) : [],
              customerInsights: parsedData.customerInsights,
              recommendedResponse: parsedData.recommendedResponse,
              analysisTimestamp: new Date().toISOString(),
              modelVersion: 'genkit-gemini-2.5-flash'
            }
          };
          break;
      }

      console.log('✅ Email Insights Analyse erfolgreich', {
        analysisType: input.analysisType,
        // Typ-spezifisches Logging
        ...(input.analysisType === 'sentiment' && { sentiment: (output.result as SentimentAnalysis).sentiment }),
        ...(input.analysisType === 'intent' && { intent: (output.result as IntentAnalysis).intent }),
        ...(input.analysisType === 'priority' && { priority: (output.result as PriorityAnalysis).priority }),
        ...(input.analysisType === 'category' && { category: (output.result as CategoryAnalysis).category }),
        ...(input.analysisType === 'full' && {
          sentiment: (output.result as FullEmailAnalysis).sentiment.sentiment,
          intent: (output.result as FullEmailAnalysis).intent.intent,
          priority: (output.result as FullEmailAnalysis).priority.priority,
          category: (output.result as FullEmailAnalysis).category.category
        })
      });

      return output;

    } catch (error: any) {
      console.error('❌ Fehler in Email Insights Analyse:', error);
      return createFallbackResponse(input);
    }
  }
);
