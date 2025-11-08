// src/lib/ai/flows/generate-press-release-structured.ts
// Genkit Flow für strukturierte Pressemitteilungs-Generierung mit PR-SEO Score Optimierung

import { ai, gemini25FlashModel } from '../genkit-config';
import {
  GeneratePressReleaseStructuredInputSchema,
  StructuredPressReleaseSchema,
  type GeneratePressReleaseStructuredInput,
  type StructuredPressRelease,
  type Quote
} from '../schemas/press-release-structured-schemas';

// ══════════════════════════════════════════════════════════════
// PROMPT LIBRARY - Score-optimierte System-Prompts
// ══════════════════════════════════════════════════════════════

const SYSTEM_PROMPTS = {
  base: `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen.

AUFGABE: Erstelle eine deutsche Pressemitteilung die auf den Ton der Zielgruppe perfekt abgestimmt ist mit folgender EXAKTER Struktur:

SCORE-OPTIMIERUNG (für 85-95% PR-SEO Score):
✓ Headline: 40-75 Zeichen, Keywords integrieren, aktive Verben verwenden
✓ Lead: 80-200 Zeichen, 5 W-Fragen beantworten
✓ Struktur: 3-4 Absätze, je 150-400 Zeichen, gut lesbar
✓ Konkretheit: Mindestens 2 Zahlen, 1 Datum, Firmennamen erwähnen
✓ Engagement: IMMER Zitat UND Call-to-Action einbauen
✓ Social: 2-3 relevante Hashtags, Twitter-optimierte Headline
✓ Keywords: Natürliche Integration, keine Übersättigung

STRUKTUR (ZWINGEND EINHALTEN):
Zeile 1: Schlagzeile (40-75 Zeichen, aktive Sprache, Keywords)
**Lead-Absatz: 5 W-Fragen in 80-200 Zeichen**
Absatz 2-4: Hauptinformation mit konkreten Details
"Zitat (20-35 Wörter)", sagt [Name], [Position] bei [Unternehmen].
[[CTA: Konkrete Handlungsaufforderung mit Kontakt]]
[[HASHTAGS: 2-3 relevante Hashtags]]`,

  scoreRules: `
SCORE-OPTIMIERUNGS-REGELN (für garantiert hohe Scores):

HEADLINE (20% des Scores):
✓ Länge: 40-75 Zeichen (optimal für SEO)
✓ Aktive Verben nutzen (startet, lanciert, präsentiert)
✓ Keywords früh platzieren
✓ Keine Übertreibungen

KEYWORDS (20% des Scores):
✓ Keyword-Dichte: 0.3-2.5% (flexibel aber präsent)
✓ Keywords in Headline UND Lead
✓ Natürliche Verteilung im Text
✓ Verwandte Begriffe einstreuen

STRUKTUR (20% des Scores):
✓ Lead-Absatz: 80-250 Zeichen
✓ 3-4 Haupt-Absätze: je 150-400 Zeichen
✓ Gute Lesbarkeit mit kurzen Sätzen
✓ Logischer Aufbau

RELEVANZ (15% des Scores):
✓ Keywords kontextuell einbetten
✓ Thematische Kohärenz
✓ Branchenrelevante Begriffe

KONKRETHEIT (10% des Scores):
✓ Mindestens 2 konkrete Zahlen/Statistiken
✓ 1 spezifisches Datum
✓ Firmennamen und Personen nennen
✓ Messbare Ergebnisse

ENGAGEMENT (10% des Scores):
✓ Zitat mit vollständiger Attribution
✓ Call-to-Action mit Kontaktdaten/URL
✓ Aktive, handlungsorientierte Sprache

SOCIAL (5% des Scores):
✓ Headline ≤ 280 Zeichen (Twitter)
✓ 2-3 relevante Hashtags
✓ Teilbare Kernaussagen`,

  exampleOptimizations: `
BEISPIEL-OPTIMIERUNGEN für hohe Scores:

STATT: "Unternehmen stellt neues Produkt vor"
BESSER: "TechCorp lanciert KI-gestützte Analytics-Plattform für KMU" (Keywords, aktiv, konkret)

STATT: "Das ist eine gute Entwicklung"
BESSER: "Wir steigern die Effizienz unserer Kunden um durchschnittlich 35%", sagt Dr. Schmidt, CEO der TechCorp.

STATT: "Weitere Informationen finden Sie online"
BESSER: "[[CTA: Kostenlose Demo vereinbaren unter demo.techcorp.de oder 089-12345678]]"

STATT: Keine Hashtags
BESSER: "[[HASHTAGS: #KIInnovation #B2BSoftware #DigitaleTransformation]]"

STATT: "Viele Kunden nutzen unsere Lösung"
BESSER: "Über 500 Unternehmen mit mehr als 10.000 Nutzern vertrauen seit 2023 auf unsere Plattform"`,

  rules: `
KRITISCHE REGELN:
✓ Headline: 40-75 Zeichen, faktisch, keywords-optimiert
✓ Lead: 80-200 Zeichen, in **Sterne** einschließen, 5 W-Fragen
✓ Body: 3 separate Absätze mit verschiedenen Aspekten
✓ Zitat: In "Anführungszeichen" mit vollständiger Attribution
✓ Call-to-Action: Mit [[CTA: ...]] markieren, konkrete Handlungsaufforderung
✓ Hashtags: 2-3 relevante für die Branche, mit [[HASHTAGS: ...]] markieren
✓ Twitter-optimiert: Headline max. 280 Zeichen für Social Sharing
✓ KEINE Boilerplate/Unternehmensbeschreibung am Ende
✓ Sachlich und objektiv, keine Werbesprache
✓ Perfekte deutsche Rechtschreibung
✓ Konkrete Zahlen und Fakten

VERMEIDE:
- Werbesprache ("revolutionär", "bahnbrechend", "einzigartig")
- Passive Konstruktionen
- Übertreibungen ohne Belege
- Zu lange Sätze (max. 15 Wörter)
- "Über das Unternehmen" Abschnitte`,

  // Tonalitäts-spezifische Anpassungen
  tones: {
    formal: `TONALITÄT: FORMAL - Konservativ, seriös, vertrauenswürdig. Längere Sätze erlaubt (max. 20 Wörter). Fachterminologie angemessen. Zurückhaltende Sprache. Distanzierte, offizielle Ausdrucksweise.`,
    casual: `🔥 TONALITÄT: LOCKER/CASUAL - ÜBERSCHREIBT ALLE ANDEREN REGELN! 🔥

WICHTIG: Ignoriere "professionelle Pressemitteilung" aus dem Base-Prompt! Schreibe stattdessen RICHTIG locker und umgangssprachlich!

ZWINGEND VERWENDEN:
- "Na, schon gespannt?" / "Hey Leute!" / "Aufgepasst!" als Einstieg
- "easy", "mega", "cool", "krass", "echt", "Bock auf...?", "checkt das aus"
- "haut raus", "bringt auf den Markt", "gibt's ab sofort"
- "das Ding", "das Teil", "diese Lösung hier"
- "ihr", "euch", "eure" statt "Sie", "Ihnen"
- Ausrufezeichen erlaubt! Emotionen zeigen!
- Umgangssprache wie im Gespräch unter Freunden

VERBOTEN:
- ❌ "lanciert", "präsentiert", "offeriert"
- ❌ "innovative Lösung", "optimiert", "implementiert"
- ❌ Steife Business-Sprache
- ❌ "Sie", "Ihnen" (nur "du/ihr")
- ❌ Lange, verschachtelte Sätze

BEISPIEL CASUAL LEAD:
❌ FALSCH: "Die Firma XY präsentiert ab Januar die innovative Lösung Z."
✅ RICHTIG: "Na, aufgepasst! Ab Januar haut Firma XY ihr neues Ding raus – und das ist echt mega cool!"

BEISPIEL CASUAL BODY:
❌ FALSCH: "Das System optimiert Prozesse erheblich."
✅ RICHTIG: "Das Teil macht eure Arbeit mega viel einfacher!"

BEISPIEL CASUAL ZITAT:
❌ FALSCH: "Dies stellt einen bedeutenden Fortschritt dar", erklärt der CEO.
✅ RICHTIG: "Das wird echt ein Gamechanger für euch sein!", freut sich der CEO.

BEISPIEL CASUAL CTA:
❌ FALSCH: [[CTA: Für weitere Informationen kontaktieren Sie uns unter...]]
✅ RICHTIG: [[CTA: Bock drauf? Schreibt uns einfach an info@firma.de!]]`,
    professional: `TONALITÄT: PROFESSIONELL - Geschäftlich, kompetent, seriös aber zugänglich. Klare, präzise Sprache (max. 15 Wörter pro Satz). Fachbegriffe moderat. Respektvoll aber nicht steif. Ideal für B2B-Kommunikation.`,
    friendly: `TONALITÄT: FREUNDLICH - Warm, einladend, sympathisch, nahbar. Positive Formulierungen. Leichte, angenehme Sprache (max. 12 Wörter). Vermittle Begeisterung und Hilfsbereitschaft. Persönliche Note ohne zu locker zu werden.`,
    confident: `TONALITÄT: SELBSTBEWUSST - Überzeugend, bestimmt, kraftvoll, authoritative. Starke Verben, klare Aussagen. Keine Konjunktive oder Abschwächungen. "Wir setzen Standards", "Marktführend", "Bewährt". Fakten mit Überzeugung präsentieren.`,
    modern: `TONALITÄT: MODERN - Zeitgemäß, innovativ, zugänglich. Kurze Sätze (max. 12 Wörter). Moderne Begriffe. Direkte Ansprache.`,
    technical: `TONALITÄT: TECHNISCH - Fachspezifisch, präzise, detailliert. Technische Begriffe korrekt. Zahlen, Daten, Spezifikationen prominent. Für Experten.`,
    startup: `TONALITÄT: STARTUP - SCORE-OPTIMIERT
✓ Dynamische Verben (erhöht Headline-Score)
✓ Wachstumszahlen (erhöht Konkretheit-Score)
✓ Trending Hashtags (erhöht Social-Score)
✓ Vision-Statement als Zitat (erhöht Engagement-Score)
Hashtags: #Startup #Innovation #TechNews #Disruption #Funding #Skalierung`
  },

  // Zielgruppen-spezifische Anpassungen
  audiences: {
    b2b: `ZIELGRUPPE: B2B - SCORE-OPTIMIERT
✓ Zahlen/ROI prominent (erhöht Konkretheit-Score)
✓ Fachbegriffe moderat (erhöht Relevanz-Score)
✓ LinkedIn-optimierte Länge (erhöht Social-Score)
✓ Entscheider-Zitate (erhöht Engagement-Score)
Fokus: ROI, Effizienz, Kostenersparnisse, Benchmarks
Hashtags: #B2B #Business #Innovation #ROI #Effizienz #Digitalisierung`,
    consumer: `ZIELGRUPPE: CONSUMER - SCORE-OPTIMIERT
✓ Einfache Sprache (erhöht Struktur-Score)
✓ Nutzen prominent (erhöht Relevanz-Score)
✓ Lifestyle-Hashtags (erhöht Social-Score)
✓ Emotionales Zitat (erhöht Engagement-Score)
Fokus: Nutzen, einfache Sprache, Lifestyle, Verfügbarkeit
Hashtags: #Neu #Lifestyle #Innovation #Einfach #Praktisch #Nachhaltigkeit`,
    media: `ZIELGRUPPE: MEDIEN/JOURNALISTEN
Nachrichtenwert betonen, klare Story, zitierfähige Aussagen, Hintergrundinformationen, Kontaktdaten prominent
Hashtags: #Pressemitteilung #News #Medien #Aktuell #Newsroom`
  },

  // Industrie-spezifische Score-optimierte Prompts
  industries: {
    technology: `INDUSTRIE: TECHNOLOGIE - SCORE-OPTIMIERT
✓ Tech-Keywords (erhöht Relevanz-Score)
✓ Versionsnummern/Specs (erhöht Konkretheit-Score)
✓ Developer-Hashtags (erhöht Social-Score)
✓ CTO/Engineer-Zitate (erhöht Engagement-Score)
Fokus: Innovation, Effizienz, Skalierung, Performance-Metriken, API/Cloud
Hashtags: #TechNews #Innovation #Software #KI #Cloud #Digitalisierung`,
    healthcare: `INDUSTRIE: GESUNDHEITSWESEN - SCORE-OPTIMIERT
✓ Patientensicherheit (erhöht Relevanz-Score)
✓ Studien/Erfolgsraten (erhöht Konkretheit-Score)
✓ Medical-Hashtags (erhöht Social-Score)
✓ Arzt/Experten-Zitate (erhöht Engagement-Score)
Fokus: Patientenwohl, Evidenz, Compliance, Zertifizierungen
Hashtags: #Gesundheit #Medizin #Innovation #Therapie #Forschung #Patientenwohl`,
    finance: `INDUSTRIE: FINANZWESEN - SCORE-OPTIMIERT
✓ Compliance/Sicherheit (erhöht Relevanz-Score)
✓ ROI/Performance-Zahlen (erhöht Konkretheit-Score)
✓ FinTech-Hashtags (erhöht Social-Score)
✓ CFO/Analyst-Zitate (erhöht Engagement-Score)
Fokus: Sicherheit, Compliance, ROI, Risikomanagement
Hashtags: #FinTech #Banking #Investment #Compliance #Digitalisierung #Sicherheit`,
    manufacturing: `INDUSTRIE: PRODUKTION/FERTIGUNG - SCORE-OPTIMIERT
✓ Effizienz/Nachhaltigkeit (erhöht Relevanz-Score)
✓ Produktionszahlen/KPIs (erhöht Konkretheit-Score)
✓ Industry4.0-Hashtags (erhöht Social-Score)
✓ Operations-Manager-Zitate (erhöht Engagement-Score)
Fokus: Effizienz, Nachhaltigkeit, Automatisierung, CO2-Reduktion
Hashtags: #Produktion #Industrie40 #Nachhaltigkeit #Effizienz #Innovation #Fertigung`,
    retail: `INDUSTRIE: EINZELHANDEL - SCORE-OPTIMIERT
✓ Kundenerlebnis (erhöht Relevanz-Score)
✓ Umsatz/Conversion-Zahlen (erhöht Konkretheit-Score)
✓ Commerce-Hashtags (erhöht Social-Score)
✓ Kunden/CEO-Zitate (erhöht Engagement-Score)
Fokus: Kundenerlebnis, Omnichannel, Personalisierung
Hashtags: #Retail #Ecommerce #Shopping #Kundenerlebnis #Omnichannel #Digital`,
    automotive: `INDUSTRIE: AUTOMOTIVE - SCORE-OPTIMIERT
✓ Nachhaltigkeit/E-Mobilität (erhöht Relevanz-Score)
✓ Verbrauch/Performance-Werte (erhöht Konkretheit-Score)
✓ Auto-Tech-Hashtags (erhöht Social-Score)
✓ Ingenieur/CEO-Zitate (erhöht Engagement-Score)
Fokus: Nachhaltigkeit, Performance, Sicherheit, Connectivity
Hashtags: #Automotive #EMobilität #Innovation #Nachhaltigkeit #AutoTech #Zukunft`,
    education: `INDUSTRIE: BILDUNG - SCORE-OPTIMIERT
✓ Lernfortschritt-Kennzahlen (erhöht Konkretheit-Score)
✓ Pädagogik-Relevanz (erhöht Relevanz-Score)
✓ EdTech-Hashtags (erhöht Social-Score)
✓ Lehrer/Direktor-Zitate (erhöht Engagement-Score)
Fokus: Lernerfolg, Zugänglichkeit, Digitale Transformation, Inklusion
Hashtags: #Bildung #EdTech #Lernen #Innovation #Digital #Zukunft`
  }
};

const FINAL_CHECK = `
FINALER SCORE-CHECK vor Ausgabe:
□ Headline: 40-75 Zeichen mit Keywords? ✓
□ Lead: 80-200 Zeichen mit W-Fragen? ✓
□ Keywords: In Headline + Lead + verteilt? ✓
□ Zahlen: Mindestens 2 konkrete Werte? ✓
□ Datum: Spezifisch genannt? ✓
□ Zitat: Mit voller Attribution? ✓
□ CTA: Konkret mit Kontakt? ✓
□ Hashtags: 2-3 relevant? ✓
□ Twitter: Headline ≤ 280 Zeichen? ✓

Wenn alle Checks ✓ → Text erreicht 85-95% Score!`;

// ══════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ══════════════════════════════════════════════════════════════

function buildSystemPrompt(context?: GeneratePressReleaseStructuredInput['context']): string {
  let systemPrompt = SYSTEM_PROMPTS.base;

  systemPrompt += '\n' + SYSTEM_PROMPTS.scoreRules;
  systemPrompt += '\n' + SYSTEM_PROMPTS.exampleOptimizations;
  systemPrompt += '\n' + SYSTEM_PROMPTS.rules;

  // Tonalität
  if (context?.tone && SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones];
  }

  // Zielgruppe
  if (context?.audience && SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences];
  }

  // Industrie
  if (context?.industry && SYSTEM_PROMPTS.industries[context.industry as keyof typeof SYSTEM_PROMPTS.industries]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.industries[context.industry as keyof typeof SYSTEM_PROMPTS.industries];
  }

  systemPrompt += '\n' + FINAL_CHECK;
  systemPrompt += '\n\nAntworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung.';

  return systemPrompt;
}

// ══════════════════════════════════════════════════════════════
// PARSING LOGIC - Strukturierter Output
// ══════════════════════════════════════════════════════════════

function parseStructuredOutput(text: string): Omit<StructuredPressRelease, 'htmlContent'> {
  const lines = text.split('\n');

  let headline = '';
  let leadParagraph = '';
  let bodyParagraphs: string[] = [];
  let quote: Quote = { text: '', person: '', role: '', company: '' };
  let cta = '';
  let hashtags: string[] = [];

  let currentSection = 'searching';
  let bodyCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Headline
    if (!headline && currentSection === 'searching') {
      headline = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      currentSection = 'lead';
      continue;
    }

    // 2. Lead-Absatz
    if (!leadParagraph && currentSection === 'lead') {
      if (line.startsWith('**') && line.endsWith('**')) {
        leadParagraph = line.substring(2, line.length - 2);
        currentSection = 'body';
        continue;
      }

      const hasWQuestions =
        (line.includes('Wer') || line.includes('Was') || line.includes('Wann') ||
         line.includes('Wo') || line.includes('Warum')) ||
        (line.length > 100 && line.length < 400);

      if (hasWQuestions) {
        leadParagraph = line;
        currentSection = 'body';
        continue;
      }

      currentSection = 'body';
    }

    // 3. Zitat - MEHRERE FORMATE UNTERSTÜTZEN
    if (line.startsWith('"') || line.includes('sagt:') || line.includes('sagt "')) {
      currentSection = 'quote';

      // Format 1: "Text", sagt Person, Rolle bei Firma.
      const quoteMatch1 = line.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+bei\s+([^.]+))?\.?$/);
      if (quoteMatch1) {
        quote = {
          text: quoteMatch1[1],
          person: quoteMatch1[2].trim(),
          role: quoteMatch1[3] ? quoteMatch1[3].trim() : 'Sprecher',
          company: quoteMatch1[4] ? quoteMatch1[4].trim() : ''
        };
        currentSection = 'cta';
        continue;
      }

      // Format 2: Rolle Person sagt: "Text"
      const quoteMatch2 = line.match(/([A-ZÄÖÜ][a-zäöüß]+)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)?)\s+sagt:\s*"([^"]+)"/);
      if (quoteMatch2) {
        quote = {
          text: quoteMatch2[3],
          person: quoteMatch2[2].trim(),
          role: quoteMatch2[1].trim(),
          company: ''
        };
        currentSection = 'cta';
        continue;
      }

      // Format 3: "Text" mit Person in nächster Zeile
      const simpleMatch = line.match(/"([^"]+)"/);
      if (simpleMatch) {
        quote.text = simpleMatch[1];
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          const personMatch = nextLine.match(/[-–—]\s*(.+)/);
          if (personMatch) {
            const parts = personMatch[1].split(',').map(p => p.trim());
            quote.person = parts[0] || 'Sprecher';
            quote.role = parts[1] || 'Geschäftsführer';
            quote.company = parts[2] || '';
            i++;
          }
        }
      }
      currentSection = 'cta';
      continue;
    }

    // 4. Hashtags
    if (line.includes('[[HASHTAGS:') || line.includes('HASHTAGS:')) {
      const hashtagMatch = line.match(/\[\[HASHTAGS?:?\s*([^\]]+)\]\]/i);
      if (hashtagMatch) {
        const hashtagString = hashtagMatch[1];
        const foundTags = hashtagString.match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
        if (foundTags && foundTags.length > 0) {
          hashtags = foundTags.slice(0, 3);
        }
      }
      continue;
    }

    // 5. CTA
    if (line.includes('[[CTA:') || line.includes('CTA:') ||
        line.includes('Kontakt:') || line.includes('Weitere Informationen:') ||
        currentSection === 'cta') {
      const ctaMatch = line.match(/\[\[CTA:\s*(.+?)\]\]/) ||
                       line.match(/CTA:\s*(.+)/) ||
                       line.match(/Kontakt:\s*(.+)/) ||
                       line.match(/Weitere Informationen:\s*(.+)/);
      if (ctaMatch) {
        cta = ctaMatch[1].trim();
      } else if (currentSection === 'cta') {
        cta = line;
      }
      continue;
    }

    // 6. Body-Absätze
    if (currentSection === 'body' && bodyCount < 4) {
      if (line.startsWith('"') || line.startsWith('*')) {
        continue;
      }
      bodyParagraphs.push(line);
      bodyCount++;
    }
  }

  // Fallback: Hashtags aus Text extrahieren
  if (hashtags.length === 0) {
    for (const line of lines) {
      if (line.includes('#')) {
        const foundTags = line.match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
        if (foundTags && foundTags.length >= 2) {
          hashtags = foundTags.slice(0, 3);
          break;
        }
      }
    }
  }

  // Standardisiere Hashtags
  hashtags = hashtags.map(tag =>
    tag.startsWith('#') ? tag : '#' + tag
  ).slice(0, 3);

  // Defaults
  if (hashtags.length === 0) {
    hashtags = ['#Pressemitteilung', '#News'];
  }

  if (!leadParagraph && bodyParagraphs.length > 0) {
    leadParagraph = bodyParagraphs[0];
    bodyParagraphs = bodyParagraphs.slice(1);
  }

  if (!headline) headline = 'Pressemitteilung';
  if (!leadParagraph) leadParagraph = 'Lead-Absatz fehlt';
  if (bodyParagraphs.length === 0) bodyParagraphs = ['Haupttext der Pressemitteilung'];
  // Fallback: Zitat aus Body-Paragraphen extrahieren
  if (!quote.text) {
    for (let i = 0; i < bodyParagraphs.length; i++) {
      const paragraph = bodyParagraphs[i];

      // Suche nach Zitat im Paragraph
      const quoteMatch = paragraph.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+(?:von|bei)\s+([^.]+))?\.?$/);
      if (quoteMatch) {
        quote = {
          text: quoteMatch[1],
          person: quoteMatch[2].trim(),
          role: quoteMatch[3] ? quoteMatch[3].trim() : 'Sprecher',
          company: quoteMatch[4] ? quoteMatch[4].trim() : ''
        };
        // Entferne den Paragraph mit dem Zitat aus den Body-Paragraphen
        bodyParagraphs.splice(i, 1);
        break;
      }

      // Alternative: Suche nach „..." (deutsche Anführungszeichen)
      const germanQuoteMatch = paragraph.match(/„([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+(?:von|bei|der)\s+([^.]+))?\.?$/);
      if (germanQuoteMatch) {
        quote = {
          text: germanQuoteMatch[1],
          person: germanQuoteMatch[2].trim(),
          role: germanQuoteMatch[3] ? germanQuoteMatch[3].trim() : 'Sprecher',
          company: germanQuoteMatch[4] ? germanQuoteMatch[4].trim() : ''
        };
        // Entferne den Paragraph mit dem Zitat aus den Body-Paragraphen
        bodyParagraphs.splice(i, 1);
        break;
      }
    }
  }

  // Letzter Fallback: Generisches Zitat
  if (!quote.text) {
    quote = {
      text: 'Wir freuen uns über diese Entwicklung',
      person: 'Sprecher',
      role: 'Geschäftsführer',
      company: 'Unternehmen'
    };
  }
  if (!cta) {
    cta = 'Für weitere Informationen kontaktieren Sie uns unter info@example.com';
  }

  const socialOptimized = headline.length <= 280 && hashtags.length >= 2;

  return {
    headline,
    leadParagraph,
    bodyParagraphs,
    quote,
    cta,
    hashtags,
    socialOptimized
  };
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW
// ══════════════════════════════════════════════════════════════

/**
 * Genkit Flow: Strukturierte Pressemitteilungs-Generierung mit PR-SEO Score Optimierung
 *
 * Features:
 * - Strukturierter Output (headline, lead, body, quote, cta, hashtags)
 * - PR-SEO Score Optimierung (85-95% Ziel)
 * - Dokumenten-Kontext Support (bis zu 3 Dokumente)
 * - Industrie/Tonalität/Zielgruppen-spezifische Prompts
 * - Umfangreiche Prompt Library (700+ Zeilen)
 * - Automatische HTML-Generierung
 */
export const generatePressReleaseStructuredFlow = ai.defineFlow(
  {
    name: 'generatePressReleaseStructured',
    inputSchema: GeneratePressReleaseStructuredInputSchema,
    outputSchema: StructuredPressReleaseSchema
  },
  async (input: GeneratePressReleaseStructuredInput): Promise<StructuredPressRelease> => {

    console.log('🚀 Strukturierte PR-Generierung gestartet', {
      hasDocuments: !!input.documentContext?.documents?.length,
      documentCount: input.documentContext?.documents?.length || 0,
      industry: input.context?.industry,
      tone: input.context?.tone,
      audience: input.context?.audience
    });

    // ══════════════════════════════════════════════════════════════
    // 1. VALIDIERUNG Dokumenten-Kontext
    // ══════════════════════════════════════════════════════════════

    if (input.documentContext?.documents) {
      if (input.documentContext.documents.length > 3) {
        throw new Error('Maximal 3 Dokumente erlaubt');
      }

      const totalSize = input.documentContext.documents.reduce(
        (sum, doc) => sum + doc.plainText.length,
        0
      );

      if (totalSize > 15000) {
        throw new Error('Dokumente-Kontext zu groß (max. 15000 Zeichen)');
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 2. PROMPT BUILDING
    // ══════════════════════════════════════════════════════════════

    const systemPrompt = buildSystemPrompt(input.context);

    // Kontext-Info
    let contextInfo = '';
    if (input.context?.industry) {
      contextInfo += `\nBRANCHE: ${input.context.industry}`;
    }
    if (input.context?.companyName) {
      contextInfo += `\nUNTERNEHMEN: ${input.context.companyName}`;
    }

    // Enhanced Prompt mit Dokumenten-Kontext
    let enhancedPrompt = input.prompt;

    if (input.documentContext?.documents && input.documentContext.documents.length > 0) {
      const documentsContext = input.documentContext.documents.map(doc => `
--- ${doc.fileName} ---
${doc.plainText.substring(0, 2000)}${doc.plainText.length > 2000 ? '...' : ''}
      `).join('\n\n');

      enhancedPrompt = `
PLANUNGSDOKUMENTE ALS KONTEXT:

${documentsContext}

---

AUFGABE:
${input.prompt}

ANWEISUNG:
Nutze die Informationen aus den Planungsdokumenten oben, um eine zielgruppengerechte
und strategisch passende Pressemitteilung zu erstellen. Beachte dabei:
- Die definierten Zielgruppen
- Die Key Messages/Kernbotschaften
- Das Alleinstellungsmerkmal (USP)
- Den Ton und Stil aus den Dokumenten

Erstelle eine professionelle Pressemitteilung nach journalistischen Standards.
      `.trim();
    }

    const userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${enhancedPrompt}${contextInfo}`;

    // ══════════════════════════════════════════════════════════════
    // 3. AI GENERIERUNG MIT GEMINI 2.5 FLASH
    // ══════════════════════════════════════════════════════════════

    const result = await ai.generate({
      model: gemini25FlashModel,
      prompt: [
        { text: systemPrompt },
        { text: userPrompt }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192, // Erhöht für Gemini 2.5 Extended Thinking + vollständigen Output
      }
    });

    // ══════════════════════════════════════════════════════════════
    // 4. TEXT EXTRAKTION
    // ══════════════════════════════════════════════════════════════

    const generatedText = result.message?.content?.[0]?.text || result.text;

    if (!generatedText || generatedText.trim() === '') {
      throw new Error('Keine Antwort von Gemini erhalten');
    }

    console.log('✅ Text generiert, starte Parsing...');

    // ══════════════════════════════════════════════════════════════
    // 5. STRUKTURIERTES PARSING
    // ══════════════════════════════════════════════════════════════

    const structured = parseStructuredOutput(generatedText);

    // ══════════════════════════════════════════════════════════════
    // 6. HTML-GENERIERUNG
    // ══════════════════════════════════════════════════════════════

    // Hashtags als TipTap-kompatible spans (data-type="hashtag")
    const hashtagsHTML = structured.hashtags && structured.hashtags.length > 0
      ? `<p>${structured.hashtags.map(tag =>
          `<span data-type="hashtag" class="hashtag text-blue-600 font-semibold cursor-pointer hover:text-blue-800 transition-colors duration-200">${tag}</span>`
        ).join(' ')}</p>`
      : '';

    const htmlContent = `
<p><strong>${structured.leadParagraph}</strong></p>

${structured.bodyParagraphs.map(p => `<p>${p}</p>`).join('\n\n')}

<blockquote>
  <p>"${structured.quote.text}"</p>
  <footer>— ${structured.quote.person}, ${structured.quote.role}${structured.quote.company ? ` bei ${structured.quote.company}` : ''}</footer>
</blockquote>

<p><span data-type="cta-text" class="cta-text font-bold text-black">${structured.cta}</span></p>

${hashtagsHTML}
`.trim();

    console.log('✅ Strukturierte PR erfolgreich generiert!', {
      headline: structured.headline.substring(0, 50) + '...',
      bodyParagraphs: structured.bodyParagraphs.length,
      hashtags: structured.hashtags.length,
      socialOptimized: structured.socialOptimized
    });

    // ══════════════════════════════════════════════════════════════
    // 7. RÜCKGABE
    // ══════════════════════════════════════════════════════════════

    return {
      ...structured,
      htmlContent
    };
  }
);
