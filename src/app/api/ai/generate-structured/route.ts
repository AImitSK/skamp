// src/app/api/ai/generate-structured/route.ts - ENHANCED mit Prompt Library
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
}

interface StructuredGenerateRequest {
  prompt: string;
  context?: {
    industry?: string;
    tone?: string;
    audience?: string;
    companyName?: string;
  };
}

interface StructuredPressRelease {
  headline: string;
  leadParagraph: string;
  bodyParagraphs: string[];
  quote: {
    text: string;
    person: string;
    role: string;
    company: string;
  };
  cta: string; // Call-to-Action statt Boilerplate
  hashtags: string[]; // NEU - Array von Hashtags
  socialOptimized: boolean; // NEU - Flag für Social-Media-Optimierung
}

// System-Prompts aus der Prompt Library - SCORE-OPTIMIERT
const SYSTEM_PROMPTS = {
  base: `Du bist ein erfahrener PR-Experte und Journalist mit 15+ Jahren Erfahrung bei führenden deutschen Medienunternehmen.

AUFGABE: Erstelle eine professionelle deutsche Pressemitteilung mit folgender EXAKTER Struktur:

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
  - Beispiele: "Weitere Informationen unter www.firma.de/produkt"
  - "Kontaktieren Sie unser Presseteam unter presse@firma.de"
  - "Vereinbaren Sie einen Demo-Termin unter www.firma.de/demo"
✓ Hashtags: 2-3 relevante für die Branche, mit [[HASHTAGS: ...]] markieren
✓ Twitter-optimiert: Headline max. 280 Zeichen für Social Sharing
✓ Hashtag-Format: #Relevant #Branchen #Keywords (deutsch/englisch gemischt OK)
✓ Deutsche Hashtags bevorzugen wo sinnvoll (#Digitalisierung, #Nachhaltigkeit)
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
    formal: `
TONALITÄT: FORMAL
- Konservativ, seriös, vertrauenswürdig
- Längere, komplexere Sätze erlaubt (max. 20 Wörter)
- Fachterminologie wenn angemessen
- Zurückhaltende, objektive Sprache
- Förmliche Anrede und Struktur`,

    modern: `
TONALITÄT: MODERN
- Zeitgemäß, innovativ, zugänglich
- Kurze, prägnante Sätze (max. 12 Wörter)
- Moderne Begriffe, aber nicht übertrieben
- Leicht verständlich, aktiv
- Direkte Ansprache`,

    technical: `
TONALITÄT: TECHNISCH
- Fachspezifisch, präzise, detailliert
- Technische Begriffe korrekt verwenden
- Zahlen, Daten, Spezifikationen prominent
- Sachlich und faktenorientiert
- Für Experten geschrieben`,

    startup: `
TONALITÄT: Startup - SCORE-OPTIMIERT  
✓ Dynamische Verben (erhöht Headline-Score)
✓ Wachstumszahlen (erhöht Konkretheit-Score)
✓ Trending Hashtags (erhöht Social-Score)
✓ Vision-Statement als Zitat (erhöht Engagement-Score)
- Dynamisch, visionär, mutig
- Wachstums- und Zukunftsfokus
- Etwas emotionaler, aber professionell
- Marktveränderung betonen
- Disruptive Sprache erlaubt
- Hashtags: #Startup #Innovation #TechNews #Disruption #Funding #Skalierung`
  },

  // Zielgruppen-spezifische Anpassungen
  audiences: {
    b2b: `
ZIELGRUPPE: B2B - SCORE-OPTIMIERT
✓ Zahlen/ROI prominent (erhöht Konkretheit-Score)
✓ Fachbegriffe moderat (erhöht Relevanz-Score)
✓ LinkedIn-optimierte Länge (erhöht Social-Score)
✓ Entscheider-Zitate (erhöht Engagement-Score)
- Fokus auf ROI, Effizienz, Kostenersparnisse
- Technische Details und Spezifikationen
- Branchenkontext und Marktanalyse
- Zitate von Entscheidern (C-Level)
- Zahlen, Daten, Benchmarks
- Hashtags: #B2B #Business #Innovation #ROI #Effizienz #Digitalisierung`,

    consumer: `
ZIELGRUPPE: Consumer - SCORE-OPTIMIERT
✓ Einfache Sprache (erhöht Struktur-Score)
✓ Nutzen prominent (erhöht Relevanz-Score)
✓ Lifestyle-Hashtags (erhöht Social-Score)
✓ Emotionales Zitat (erhöht Engagement-Score)
- Fokus auf Nutzen für Endverbraucher
- Einfache, verständliche Sprache
- Praktische Anwendungsbeispiele
- Emotionaler Bezug und Lifestyle
- Verfügbarkeit und Preise prominent
- Hashtags: #Neu #Lifestyle #Innovation #Einfach #Praktisch #Nachhaltigkeit`,

    media: `
ZIELGRUPPE: MEDIEN/JOURNALISTEN
- Nachrichtenwert und Aktualität betonen
- Klare Story mit Spannungsbogen
- Zitierfähige Aussagen
- Hintergrundinformationen
- Kontaktdaten prominent
- Hashtags: #Pressemitteilung #News #Medien #Aktuell #Newsroom`
  },

  // Industrie-spezifische Score-optimierte Prompts
  industries: {
    technology: `
INDUSTRIE: TECHNOLOGIE - SCORE-OPTIMIERT
✓ Tech-Keywords verwenden (erhöht Relevanz-Score)
✓ Versionsnummern/Specs (erhöht Konkretheit-Score)
✓ Developer-optimierte Hashtags (erhöht Social-Score)
✓ CTO/Engineer-Zitate (erhöht Engagement-Score)
- Fokus auf Innovation, Effizienz, Skalierung
- Technische Spezifikationen und Features
- Performance-Metriken und Benchmarks
- API/Integration/Cloud-Aspekte erwähnen
- Zahlen: Ladezeiten, Kapazität, Nutzer
- Hashtags: #TechNews #Innovation #Software #KI #Cloud #Digitalisierung`,

    healthcare: `
INDUSTRIE: GESUNDHEITSWESEN - SCORE-OPTIMIERT
✓ Patientensicherheit betonen (erhöht Relevanz-Score)
✓ Studien/Erfolgsraten (erhöht Konkretheit-Score)
✓ Medical-Hashtags (erhöht Social-Score)
✓ Arzt/Experten-Zitate (erhöht Engagement-Score)
- Fokus auf Patientenwohl und Sicherheit
- Klinische Studien und Evidenz
- Compliance und Zertifizierungen
- Medizinische Fachbegriffe moderat einsetzen
- Zahlen: Erfolgsraten, Patientenzahlen
- Hashtags: #Gesundheit #Medizin #Innovation #Therapie #Forschung #Patientenwohl`,

    finance: `
INDUSTRIE: FINANZWESEN - SCORE-OPTIMIERT
✓ Compliance/Sicherheit (erhöht Relevanz-Score)
✓ ROI/Performance-Zahlen (erhöht Konkretheit-Score)
✓ FinTech-Hashtags (erhöht Social-Score)
✓ CFO/Analyst-Zitate (erhöht Engagement-Score)
- Fokus auf Sicherheit, Compliance, Performance
- Regulatorische Aspekte und Zertifizierungen
- ROI, Kosteneinsparungen, Effizienzgewinne
- Risikomanagement und Transparenz
- Zahlen: AUM, Transaktionsvolumen, Einsparungen
- Hashtags: #FinTech #Banking #Investment #Compliance #Digitalisierung #Sicherheit`,

    manufacturing: `
INDUSTRIE: PRODUKTION/FERTIGUNG - SCORE-OPTIMIERT
✓ Effizienz/Nachhaltigkeit (erhöht Relevanz-Score)
✓ Produktionszahlen/KPIs (erhöht Konkretheit-Score)
✓ Industry4.0-Hashtags (erhöht Social-Score)
✓ Operations-Manager-Zitate (erhöht Engagement-Score)
- Fokus auf Effizienz, Nachhaltigkeit, Qualität
- Produktionskapazitäten und Durchsätze
- Umweltaspekte und CO2-Reduktion
- Automatisierung und Industrie 4.0
- Zahlen: Stückzahlen, Einsparungen, CO2-Reduktion
- Hashtags: #Produktion #Industrie40 #Nachhaltigkeit #Effizienz #Innovation #Fertigung`,

    retail: `
INDUSTRIE: EINZELHANDEL - SCORE-OPTIMIERT
✓ Kundenerlebnis-Focus (erhöht Relevanz-Score)
✓ Umsatz/Conversion-Zahlen (erhöht Konkretheit-Score)
✓ Commerce-Hashtags (erhöht Social-Score)
✓ Kunden-/CEO-Zitate (erhöht Engagement-Score)
- Fokus auf Kundenerlebnis und Convenience
- Omnichannel-Ansätze und Digitalisierung
- Verfügbarkeit, Preise und Aktionen
- Customer Journey und Personalisierung
- Zahlen: Filialen, Online-Traffic, Conversion
- Hashtags: #Retail #Ecommerce #Shopping #Kundenerlebnis #Omnichannel #Digital`,

    automotive: `
INDUSTRIE: AUTOMOTIVE - SCORE-OPTIMIERT
✓ Nachhaltigkeit/E-Mobilität (erhöht Relevanz-Score)
✓ Verbrauch/Performance-Werte (erhöht Konkretheit-Score)
✓ Auto-Tech-Hashtags (erhöht Social-Score)
✓ Ingenieur/CEO-Zitate (erhöht Engagement-Score)
- Fokus auf Nachhaltigkeit und E-Mobilität
- Technische Spezifikationen und Performance
- Sicherheitsfeatures und Innovationen
- Autonomes Fahren und Connectivity
- Zahlen: Reichweite, PS, Verbrauch, CO2-Werte
- Hashtags: #Automotive #EMobilität #Innovation #Nachhaltigkeit #AutoTech #Zukunft`,

    education: `
INDUSTRIE: BILDUNG - SCORE-OPTIMIERT
✓ Lernfortschritt-Kennzahlen (erhöht Konkretheit-Score)
✓ Pädagogik-Relevanz (erhöht Relevanz-Score)
✓ EdTech-Hashtags (erhöht Social-Score)
✓ Lehrer/Direktor-Zitate (erhöht Engagement-Score)
- Fokus auf Lernerfolg und Zugänglichkeit
- Pädagogische Konzepte und Methoden
- Digitale Transformation im Bildungsbereich
- Inklusion und Chancengleichheit
- Zahlen: Schülerzahlen, Erfolgsquoten, Reichweite
- Hashtags: #Bildung #EdTech #Lernen #Innovation #Digital #Zukunft`
  }
};

// Verbesserte Parsing-Funktion für strukturierte Ausgabe
function parseStructuredOutput(text: string): StructuredPressRelease {
  
  const lines = text.split('\n');
  
  let headline = '';
  let leadParagraph = '';
  let bodyParagraphs: string[] = [];
  let quote = { text: '', person: '', role: '', company: '' };
  let cta = '';
  
  let currentSection = 'searching'; // searching, lead, body, quote, boilerplate
  let bodyCount = 0;
  let hashtags: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    
    // 1. Headline - erste nicht-leere Zeile
    if (!headline && currentSection === 'searching') {
      headline = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
      currentSection = 'lead';
      continue;
    }
    
    // 2. Lead-Absatz - verschiedene Formate erkennen
    if (!leadParagraph && currentSection === 'lead') {
      // Format 1: **Text in Sternen**
      if (line.startsWith('**') && line.endsWith('**')) {
        leadParagraph = line.substring(2, line.length - 2);
        currentSection = 'body';
        continue;
      }
      
      // Format 2: Erster Absatz nach Headline (wenn er W-Fragen beantwortet)
      const hasWQuestions = 
        (line.includes('Wer') || line.includes('Was') || line.includes('Wann') || 
         line.includes('Wo') || line.includes('Warum')) ||
        (line.length > 100 && line.length < 400); // Typische Lead-Länge
      
      if (hasWQuestions) {
        leadParagraph = line;
        currentSection = 'body';
        continue;
      }
      
      // Wenn keine typischen Lead-Merkmale, gehe zu Body
      currentSection = 'body';
    }
    
    // 3. Zitat erkennen
    if (line.startsWith('"')) {
      currentSection = 'quote';
      
      // Verschiedene Zitat-Formate parsen
      const quoteMatch = line.match(/"([^"]+)"[,\s]*sagt\s+([^,]+?)(?:,\s*([^,]+?))?(?:\s+bei\s+([^.]+))?\.?$/);
      if (quoteMatch) {
        quote = {
          text: quoteMatch[1],
          person: quoteMatch[2].trim(),
          role: quoteMatch[3] ? quoteMatch[3].trim() : 'Sprecher',
          company: quoteMatch[4] ? quoteMatch[4].trim() : ''
        };
      } else {
        // Einfacheres Format nur mit Zitat
        const simpleMatch = line.match(/"([^"]+)"/);
        if (simpleMatch) {
          quote.text = simpleMatch[1];
          // Versuche Person aus nachfolgenden Zeilen zu extrahieren
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            const personMatch = nextLine.match(/[-–—]\s*(.+)/);
            if (personMatch) {
              const parts = personMatch[1].split(',').map(p => p.trim());
              quote.person = parts[0] || 'Sprecher';
              quote.role = parts[1] || 'Geschäftsführer';
              quote.company = parts[2] || '';
              i++; // Skip next line
            }
          }
        }
      }
      currentSection = 'cta';
      continue;
    }
    
    // 4. Hashtags erkennen
    if (line.includes('[[HASHTAGS:') || line.includes('HASHTAGS:')) {
      const hashtagMatch = line.match(/\[\[HASHTAGS?:?\s*([^\]]+)\]\]/i);
      if (hashtagMatch) {
        const hashtagString = hashtagMatch[1];
        const foundTags = hashtagString.match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
        if (foundTags && foundTags.length > 0) {
          hashtags = foundTags.slice(0, 3); // Max 3 Hashtags
        }
      }
      continue;
    }
    
    // 5. CTA erkennen
    if (line.includes('[[CTA:') || line.includes('CTA:') || 
        line.includes('Kontakt:') || line.includes('Weitere Informationen:') ||
        currentSection === 'cta') {
      // Extrahiere CTA Text
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
    
    // 6. Body-Absätze sammeln
    if (currentSection === 'body' && bodyCount < 3) {
      // Skip wenn es wie ein Zitat oder Boilerplate aussieht
      if (line.startsWith('"') || line.startsWith('*')) {
        continue;
      }
      
      bodyParagraphs.push(line);
      bodyCount++;
    }
  }
  
  // Nachbearbeitung und Validierung
  
  // Fallback: Hashtags aus Zeilen mit mehreren #hashtags extrahieren
  if (hashtags.length === 0) {
    for (const line of lines) {
      if (line.includes('#')) {
        const foundTags = line.match(/#[a-zA-ZäöüÄÖÜß0-9_]+/g);
        if (foundTags && foundTags.length >= 2) {
          hashtags = foundTags.slice(0, 3); // Max 3 Hashtags
          break;
        }
      }
    }
  }
  
  // Standardisiere Hashtags (mit #-Zeichen)
  hashtags = hashtags.map(tag => 
    tag.startsWith('#') ? tag : '#' + tag
  ).slice(0, 3);
  
  // Defaults für Hashtags wenn keine gefunden
  if (hashtags.length === 0) {
    hashtags = ['#Pressemitteilung', '#News'];
  }
  
  // Wenn kein Lead gefunden wurde, nimm ersten Body-Absatz
  if (!leadParagraph && bodyParagraphs.length > 0) {
    leadParagraph = bodyParagraphs[0];
    bodyParagraphs = bodyParagraphs.slice(1);
  }
  
  // Defaults für fehlende Elemente
  if (!headline) headline = 'Pressemitteilung';
  if (!leadParagraph) leadParagraph = 'Lead-Absatz fehlt';
  if (bodyParagraphs.length === 0) bodyParagraphs = ['Haupttext der Pressemitteilung'];
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
  
  
  // Social Media Optimization Check
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

// Finale Score-Check-Anweisung
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

// Score-optimierter Prompt-Builder mit Kontext
function buildSystemPrompt(context?: StructuredGenerateRequest['context']): string {
  let systemPrompt = SYSTEM_PROMPTS.base;
  
  // NEU: Score-Optimierungs-Regeln hinzufügen
  systemPrompt += '\n' + SYSTEM_PROMPTS.scoreRules;
  systemPrompt += '\n' + SYSTEM_PROMPTS.exampleOptimizations;
  
  // Bestehende Regeln
  systemPrompt += '\n' + SYSTEM_PROMPTS.rules;
  
  // Tonalität mit Score-Optimierung
  if (context?.tone && SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.tones[context.tone as keyof typeof SYSTEM_PROMPTS.tones];
  }
  
  // Zielgruppe mit Score-Optimierung
  if (context?.audience && SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.audiences[context.audience as keyof typeof SYSTEM_PROMPTS.audiences];
  }
  
  // NEU: Industrie-spezifische Optimierung
  if (context?.industry && SYSTEM_PROMPTS.industries[context.industry as keyof typeof SYSTEM_PROMPTS.industries]) {
    systemPrompt += '\n' + SYSTEM_PROMPTS.industries[context.industry as keyof typeof SYSTEM_PROMPTS.industries];
  }
  
  // NEU: Finaler Score-Check
  systemPrompt += '\n' + FINAL_CHECK;
  
  // Finale Anweisung
  systemPrompt += '\n\nAntworte AUSSCHLIESSLICH mit der strukturierten Pressemitteilung.';
  
  return systemPrompt;
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'KI-Service ist nicht konfiguriert' },
        { status: 500 }
      );
    }

    const data: StructuredGenerateRequest = await request.json();
    const { prompt, context } = data;

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt ist erforderlich' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Dynamisch System-Prompt basierend auf Kontext erstellen
    const systemPrompt = buildSystemPrompt(context);

    // Kontext-Info für User-Prompt
    let contextInfo = '';
    if (context?.industry) {
      contextInfo += `\nBRANCHE: ${context.industry}`;
    }
    if (context?.companyName) {
      contextInfo += `\nUNTERNEHMEN: ${context.companyName}`;
    }

    const userPrompt = `Erstelle eine professionelle Pressemitteilung für: ${prompt}${contextInfo}`;

    // Gemini Anfrage mit dynamischem Prompt
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt }
    ]);

    const response = await result.response;
    const generatedText = response.text();

    if (!generatedText || generatedText.trim() === '') {
      return NextResponse.json(
        { error: 'Keine Antwort von Gemini erhalten' },
        { status: 500 }
      );
    }

    // Strukturierte Ausgabe parsen
    const structured = parseStructuredOutput(generatedText);

    // HTML für Editor generieren mit verbesserter Formatierung
    const htmlContent = `
<p><strong>${structured.leadParagraph}</strong></p>

${structured.bodyParagraphs.map(p => `<p>${p}</p>`).join('\n\n')}

<blockquote>
  <p>"${structured.quote.text}"</p>
  <footer>— ${structured.quote.person}, ${structured.quote.role}${structured.quote.company ? ` bei ${structured.quote.company}` : ''}</footer>
</blockquote>

<p><span data-type="cta-text" class="cta-text font-bold text-black">${structured.cta}</span></p>
`;

    return NextResponse.json({
      success: true,
      structured: structured,
      headline: structured.headline,
      htmlContent: htmlContent.trim(),
      rawText: generatedText,
      aiProvider: 'gemini',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {

    // Spezifische Fehlerbehandlung
    if (error.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { error: 'Ungültiger Gemini API Key' },
        { status: 401 }
      );
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      return NextResponse.json(
        { error: 'Gemini Quota erreicht. Bitte versuche es später erneut.' },
        { status: 429 }
      );
    } else if (error.message?.includes('SAFETY')) {
      return NextResponse.json(
        { error: 'Content wurde von Gemini Safety-Filtern blockiert. Bitte formuliere anders.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: `Fehler bei der strukturierten KI-Generierung: ${error.message}` },
        { status: 500 }
      );
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}