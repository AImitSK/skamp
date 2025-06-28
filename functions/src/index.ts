// functions/src/index.ts - Mit public invoker
import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {GoogleGenerativeAI} from "@google/generative-ai";

setGlobalOptions({ maxInstances: 10 });

// Gemini API Key als Secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// CORS Helper Function
function setCorsHeaders(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
}

interface GenerateRequest {
  prompt: string;
  mode: 'generate' | 'improve';
  existingContent?: string;
}

export const generatePressRelease = onRequest(
  { 
    secrets: [geminiApiKey],
    invoker: "public"  // ← ÖFFENTLICH ZUGÄNGLICH
  },
  async (req, res) => {
    // CORS Headers setzen
    setCorsHeaders(res);
    
    // Preflight Request
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      // Nur POST erlauben
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const data = req.body as GenerateRequest;
      const { prompt, mode, existingContent } = data;

      if (!prompt || prompt.trim() === '') {
        res.status(400).json({ error: 'Prompt ist erforderlich' });
        return;
      }

      logger.info('Generating press release with Gemini', { 
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
        res.status(500).json({ error: 'Keine Antwort von Gemini erhalten' });
        return;
      }

      logger.info('Press release generated successfully with Gemini', { 
        outputLength: generatedText.length,
        model: "gemini-1.5-flash"
      });

      res.status(200).json({
        success: true,
        generatedText: generatedText,
        mode: mode,
        aiProvider: 'gemini'
      });

    } catch (error: any) {
      logger.error('Error generating press release with Gemini', { 
        error: error.message,
        stack: error.stack
      });

      // Spezifische Fehlerbehandlung für Gemini
      if (error.message?.includes('API_KEY_INVALID')) {
        res.status(401).json({ error: 'Ungültiger Gemini API Key' });
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        res.status(429).json({ error: 'Gemini Quota erreicht. Bitte versuche es später erneut.' });
      } else if (error.message?.includes('SAFETY')) {
        res.status(400).json({ error: 'Content wurde von Gemini Safety-Filtern blockiert. Bitte formuliere anders.' });
      } else {
        res.status(500).json({ error: `Fehler bei der KI-Generierung: ${error.message}` });
      }
    }
  }
);

// Template-Generator
export const getTemplates = onRequest(
  {
    invoker: "public"  // ← ÖFFENTLICH ZUGÄNGLICH
  },
  async (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    logger.info('Templates requested');

    res.status(200).json({
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
        }
      ]
    });
  }
);

// Health Check
export const healthCheck = onRequest(
  {
    invoker: "public"  // ← ÖFFENTLICH ZUGÄNGLICH
  },
  async (req, res) => {
    setCorsHeaders(res);
    
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    logger.info('Health check requested');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'SKAMP Gemini AI Assistant',
      version: '1.0.0',
      cors: 'enabled'
    });
  }
);