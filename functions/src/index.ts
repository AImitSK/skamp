// functions/src/index.ts - Sichere Version mit Authentication
import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {GoogleGenerativeAI} from "@google/generative-ai";

setGlobalOptions({ maxInstances: 10 });

// Gemini API Key als Secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

interface GenerateRequest {
  prompt: string;
  mode: 'generate' | 'improve';
  existingContent?: string;
}

export const generatePressRelease = onCall(
  { 
    secrets: [geminiApiKey],
    cors: true
  },
  async (request) => {
    try {
      // AUTHENTICATION CHECK - Nur angemeldete User
      if (!request.auth) {
        throw new Error('Authentifizierung erforderlich. Bitte melde dich an.');
      }

      const data = request.data as GenerateRequest;
      const { prompt, mode, existingContent } = data;

      if (!prompt || prompt.trim() === '') {
        throw new Error('Prompt ist erforderlich');
      }

      logger.info('Generating press release with Gemini', { 
        userId: request.auth.uid,
        userEmail: request.auth.token.email, 
        mode, 
        promptLength: prompt.length 
      });

      // Gemini initialisieren
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // System-Prompt vorbereiten
      let systemPrompt: string;
      let userPrompt: string;

      if (mode === 'improve' && existingContent) {
        systemPrompt = `Du bist ein erfahrener PR-Experte und verbesserst bestehende deutsche Pressemitteilungen.

VERBESSERUNGS-GUIDELINES:
- Behalte die grundlegende Struktur bei
- Verbessere Klarheit und Verständlichkeit
- Nutze journalistische Standards
- Achte auf perfekte deutsche Rechtschreibung
- Optimiere für die Zielgruppe
- Behalte HTML-Formatierung bei

Antworte NUR mit der verbesserten Pressemitteilung im HTML-Format.`;

        userPrompt = `Bestehende Pressemitteilung:
${existingContent}

Verbesserungsanfrage: ${prompt}

Bitte verbessere die Pressemitteilung entsprechend der Anfrage:`;

      } else {
        systemPrompt = `Du bist ein erfahrener PR-Experte und Journalist. Erstelle professionelle deutsche Pressemitteilungen.

STRUKTUR einer perfekten Pressemitteilung:
1. **Headline**: Aussagekräftig, max. 80 Zeichen, fesselt Journalisten
2. **Lead**: Beantwortet die 5 W-Fragen (Wer, Was, Wann, Wo, Warum)
3. **Body**: Detaillierte Informationen, Hintergründe, Kontext
4. **Zitate**: Authentische Statements (nutze Platzhalter wie "[CEO Name]")
5. **Boilerplate**: Kurze Unternehmensbeschreibung
6. **Kontakt**: Pressekontakt-Platzhalter

STIL-GUIDELINES:
- Sachlich und objektiv, keine Werbesprache
- Kurze, prägnante Sätze (max. 20 Wörter)
- Aktive Sprache, präsente Zeit
- Journalistischer Stil, faktenfokussiert
- Perfekte deutsche Rechtschreibung
- HTML-Format mit <h1>, <p>, <blockquote> Tags

Antworte NUR mit der fertigen Pressemitteilung im HTML-Format.`;

        userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${prompt}`;
      }

      // Gemini Anfrage
      const result = await model.generateContent([
        { text: systemPrompt },
        { text: userPrompt }
      ]);

      const response = await result.response;
      const generatedText = response.text();

      if (!generatedText || generatedText.trim() === '') {
        throw new Error('Keine Antwort von Gemini erhalten');
      }

      logger.info('Press release generated successfully with Gemini', { 
        userId: request.auth.uid,
        outputLength: generatedText.length,
        model: "gemini-1.5-flash"
      });

      return {
        success: true,
        generatedText: generatedText,
        mode: mode,
        aiProvider: 'gemini',
        userId: request.auth.uid
      };

    } catch (error: any) {
      logger.error('Error generating press release with Gemini', { 
        error: error.message,
        userId: request.auth?.uid,
        stack: error.stack
      });

      // Spezifische Fehlerbehandlung für Gemini
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Ungültiger Gemini API Key');
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        throw new Error('Gemini Quota erreicht. Bitte versuche es später erneut.');
      } else if (error.message?.includes('SAFETY')) {
        throw new Error('Content wurde von Gemini Safety-Filtern blockiert. Bitte formuliere anders.');
      }

      throw new Error(`Fehler bei der KI-Generierung: ${error.message}`);
    }
  }
);

// Template-Generator
export const getTemplates = onCall(
  { cors: true },
  async (request) => {
    // AUTHENTICATION CHECK
    if (!request.auth) {
      throw new Error('Authentifizierung erforderlich. Bitte melde dich an.');
    }

    logger.info('Templates requested', { 
      userId: request.auth.uid,
      userEmail: request.auth.token.email 
    });

    return {
      success: true,
      templates: [
        {
          title: 'Produktankündigung',
          prompt: 'Innovative Produkteinführung, die ein wichtiges Branchenproblem löst und den Markt revolutioniert'
        },
        {
          title: 'Strategische Partnerschaft',
          prompt: 'Strategische Partnerschaft zwischen zwei führenden Unternehmen mit erheblichen Synergien'
        },
        {
          title: 'Unternehmensmeilenstein',
          prompt: 'Wichtiger Unternehmensmeilenstein wie Wachstum, Expansion oder Jubiläum'
        },
        {
          title: 'Auszeichnung',
          prompt: 'Erhaltene Branchenauszeichnung oder Award, der Expertise unterstreicht'
        },
        {
          title: 'Führungswechsel',
          prompt: 'Wichtige Personalentscheidung oder Ernennung neuer Führungskraft'
        },
        {
          title: 'Forschungsergebnisse',
          prompt: 'Neue Forschungsergebnisse oder Studie mit wichtigen Branchenerkenntnissen'
        },
        {
          title: 'Event-Ankündigung',
          prompt: 'Wichtiges Unternehmensevent wie Konferenz, Produktvorstellung oder Branchenmesse'
        }
      ]
    };
  }
);

// Health Check
export const healthCheck = onCall(
  { cors: true },
  async (request) => {
    // OPTIONAL: Auth check für Health Check
    const isAuthenticated = !!request.auth;
    
    logger.info('Health check requested', { 
      isAuthenticated,
      userId: request.auth?.uid 
    });
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'SKAMP Gemini AI Assistant',
      version: '1.0.0',
      authenticated: isAuthenticated,
      cors: 'enabled'
    };
  }
);