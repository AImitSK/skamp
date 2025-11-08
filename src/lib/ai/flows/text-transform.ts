// src/lib/ai/flows/text-transform.ts
// Genkit Flow für Text-Transformationen im Editor (FloatingAIToolbar)

import { ai, gemini25FlashModel, gemini25FlashLiteModel } from '../genkit-config';
import {
  TextTransformInputSchema,
  TextTransformOutputSchema,
  type TextTransformInput,
  type TextTransformOutput
} from '../schemas/text-transform-schemas';
import { extractFormatting, applyFormatting } from '../utils/format-preservation';

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS FÜR JEDE ACTION
// ══════════════════════════════════════════════════════════════

const PROMPTS = {
  // ────────────────────────────────────────────────────────────
  // REPHRASE - Umformulieren (Synonyme)
  // ────────────────────────────────────────────────────────────
  rephrase: {
    withContext: (fullDocument: string, text: string) => ({
      system: `Du bist ein professioneller Redakteur. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle umformulieren.

KONTEXT-ANALYSE:
1. Verstehe den Zweck des Gesamttextes (PR, Marketing, Info)
2. Erkenne die Rolle der markierten Stelle im Kontext
3. Behalte die Tonalität passend zum Gesamttext
4. WICHTIG: Analysiere die TERMINOLOGIE im Gesamttext (Firmennamen, Produkte, Fachbegriffe)

TERMINOLOGIE-BEIBEHALTUNG (KRITISCH!):
- Übernimm EXAKT die Begriffe, die im Gesamttext verwendet werden
- Wenn der Gesamttext "KI-gestützt" sagt, nutze NICHT "AI-basiert"
- Wenn der Gesamttext "Kunden" sagt, nutze NICHT "Nutzer" oder "User"
- Behalte Firmen-, Produkt- und Eigennamen EXAKT bei
- Nutze denselben Fachjargon wie im Gesamttext

FORMAT-PRESERVATION (KRITISCH!):
Falls der Original-Text Formatierungen enthält, MUSST du sie EXAKT beibehalten:
- **Fetter Text** → Behalte ** **-Marker an derselben Position
- [[CTA: Text]] → Behalte [[CTA: ]]-Marker komplett bei
- [[HASHTAGS: #tag1 #tag2]] → Behalte Hashtag-Block komplett bei
- #Hashtag → Behalte # vor dem Wort
WICHTIG: Füge KEINE neuen Formatierungen hinzu! Nur vorhandene beibehalten!

UMFORMULIERUNG DER MARKIERTEN STELLE:
- Ersetze Wörter durch passende Synonyme
- Halte die Länge ähnlich (±5 Wörter max)
- Behalte die Struktur bei
- Passe zum Stil des Gesamttextes
- WICHTIG: Terminologie aus Gesamttext übernehmen!
- WICHTIG: Formatierungen EXAKT übernehmen!

❌ VERMEIDE:
- Neue Informationen hinzufügen
- PM-Strukturen erstellen
- Den Kontext zu verändern
- Formatierungen entfernen
- Terminologie ändern

Antworte NUR mit der umformulierten markierten Stelle!`,
      user: `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM UMFORMULIEREN:\n${text}`
    }),

    withoutContext: (text: string) => ({
      system: `Du bist ein Synonym-Experte. Ersetze Wörter durch Synonyme - MEHR NICHT!

FORMAT-PRESERVATION (KRITISCH!):
Falls der Original-Text Formatierungen enthält, MUSST du sie EXAKT beibehalten:
- **Fetter Text** → Behalte ** **-Marker an derselben Position
- [[CTA: Text]] → Behalte [[CTA: ]]-Marker komplett bei
- [[HASHTAGS: #tag1 #tag2]] → Behalte Hashtag-Block komplett bei
- #Hashtag → Behalte # vor dem Wort
WICHTIG: Füge KEINE neuen Formatierungen hinzu! Nur vorhandene beibehalten!

❌ DU DARFST NICHT:
- Neue Sätze hinzufügen
- Neue Absätze erstellen
- Boilerplates/Über-Abschnitte schreiben
- Pressemitteilungs-Struktur aufbauen
- Informationen erweitern oder erklären
- Formatierungen entfernen

✅ DU DARFST NUR:
- Wörter durch Synonyme ersetzen
- Satzstellung leicht ändern
- Tonalität beibehalten
- Formatierungen EXAKT übernehmen

STRENGE REGELN:
- EXAKT ${text.split(' ').length} Wörter (±5 max!)
- EXAKT ${text.split('\n\n').length} Absatz(e)
- ALLE Formatierungen beibehalten
- KEINE Headlines/Überschriften hinzufügen

BEISPIEL:
Original: "Die **Firma** bietet Services an. [[CTA: Jetzt testen]]"
Umformuliert: "Das **Unternehmen** stellt Dienstleistungen bereit. [[CTA: Jetzt testen]]"

Antworte NUR mit dem umformulierten Text - keine Erklärungen!`,
      user: `Synonym-Austausch für ${text.split(' ').length} Wörter:\n\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // SHORTEN - Kürzen (30% = 70% des Originals)
  // ────────────────────────────────────────────────────────────
  shorten: {
    withContext: (fullDocument: string, text: string) => {
      const originalWords = text.split(/\s+/).length;
      const targetWords = Math.round(originalWords * 0.7);
      const minWords = Math.round(originalWords * 0.65);
      const maxWords = Math.round(originalWords * 0.75);

      return {
        system: `Du bist ein professioneller Textredakteur. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle kürzen.

KONTEXT-ANALYSE:
1. Verstehe die Funktion der markierten Stelle im Gesamttext
2. Erkenne welche Informationen essentiell sind
3. Behalte den Stil des Gesamttextes

FORMAT-PRESERVATION (KRITISCH!):
Falls der Original-Text Formatierungen enthält (**Bold**, [[CTA: ]], [[HASHTAGS: ]], #Hashtag), EXAKT beibehalten!
WICHTIG: Füge KEINE neuen Formatierungen hinzu! Nur vorhandene beibehalten!

PRÄZISE LÄNGEN-VORGABE:
- Original: ${originalWords} Wörter
- Ziel: ${targetWords} Wörter (30% kürzer)
- Erlaubter Bereich: ${minWords}-${maxWords} Wörter

KÜRZEN DER MARKIERTEN STELLE:
- Entferne Redundanzen und Füllwörter
- Behalte alle wichtigen Fakten
- Bewahre die Kernaussage
- Halte die Tonalität des Gesamttextes
- WICHTIG: Halte dich an die Wortanzahl-Vorgabe!
- WICHTIG: Formatierungen EXAKT übernehmen!

Antworte NUR mit der gekürzten markierten Stelle!`,
        user: `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM KÜRZEN (${originalWords} → ${targetWords} Wörter):\n${text}`
      };
    },

    withoutContext: (text: string) => {
      const originalWords = text.split(/\s+/).length;
      const targetWords = Math.round(originalWords * 0.7);
      const minWords = Math.round(originalWords * 0.65);
      const maxWords = Math.round(originalWords * 0.75);

      return {
        system: `Du bist ein professioneller Textredakteur. Analysiere die Tonalität und kürze dann präzise.

SCHRITT 1 - TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache, B2B-Kontext
- Verkäuferisch: Superlative, Werbesprache, Call-to-Actions
- Emotional: Persönliche Ansprache, Gefühle, Stories

SCHRITT 2 - FORMAT-PRESERVATION (KRITISCH!):
Falls der Original-Text Formatierungen enthält (**Bold**, [[CTA: ]], [[HASHTAGS: ]], #Hashtag), EXAKT beibehalten!
WICHTIG: Füge KEINE neuen Formatierungen hinzu! Nur vorhandene beibehalten!

SCHRITT 3 - PRÄZISE LÄNGEN-VORGABE:
- Original: ${originalWords} Wörter
- Ziel: ${targetWords} Wörter (30% kürzer)
- Erlaubter Bereich: ${minWords}-${maxWords} Wörter

SCHRITT 4 - KÜRZEN:
- Entferne unnötige Details und Wiederholungen
- BEHALTE die erkannte Tonalität und Verkaufsstärke
- Behalte alle wichtigen Informationen und Kernaussage
- Gleiche Struktur beibehalten
- WICHTIG: Halte dich genau an die Wortanzahl-Vorgabe!
- WICHTIG: Formatierungen EXAKT übernehmen!

Antworte NUR mit dem gekürzten Text.`,
        user: `Analysiere die Tonalität und kürze dann von ${originalWords} auf ${targetWords} Wörter:\n\n${text}`
      };
    }
  },

  // ────────────────────────────────────────────────────────────
  // EXPAND - Erweitern (50% = 150% des Originals)
  // ────────────────────────────────────────────────────────────
  expand: {
    withContext: (fullDocument: string, text: string) => {
      const originalWords = text.split(/\s+/).length;
      const targetWords = Math.round(originalWords * 1.5);
      const minWords = Math.round(originalWords * 1.4);
      const maxWords = Math.round(originalWords * 1.6);

      return {
        system: `Du bist ein professioneller Content-Writer. Du siehst den GESAMTEN Text und sollst NUR die markierte Stelle erweitern.

KONTEXT-ANALYSE:
1. Verstehe den Zweck und Stil des Gesamttextes
2. Erkenne welche Details zur markierten Stelle passen würden
3. Behalte die Tonalität des Gesamttextes

FORMAT-PRESERVATION (KRITISCH!):
Falls der Original-Text Formatierungen enthält (**Bold**, [[CTA: ]], [[HASHTAGS: ]], #Hashtag), EXAKT beibehalten!
WICHTIG: Füge KEINE neuen Formatierungen hinzu! Nur vorhandene beibehalten!

PRÄZISE LÄNGEN-VORGABE:
- Original: ${originalWords} Wörter
- Ziel: ${targetWords} Wörter (50% länger)
- Erlaubter Bereich: ${minWords}-${maxWords} Wörter

ERWEITERN DER MARKIERTEN STELLE:
- Füge relevante Details hinzu die zum Kontext passen
- Ergänze sinnvolle Informationen
- Bewahre den Schreibstil
- Halte die Struktur konsistent
- KRITISCH: Du MUSST die Wortanzahl-Vorgabe erreichen! Mindestens ${minWords} Wörter!
- Füge beschreibende Adjektive, Zusatzinformationen und Details hinzu
- WICHTIG: Formatierungen EXAKT übernehmen!

Antworte NUR mit der erweiterten markierten Stelle!`,
        user: `GESAMTER TEXT:\n${fullDocument}\n\nMARKIERTE STELLE ZUM ERWEITERN (${originalWords} → ${targetWords} Wörter):\n${text}`
      };
    },

    withoutContext: (text: string) => {
      const originalWords = text.split(/\s+/).length;
      const targetWords = Math.round(originalWords * 1.5);
      const minWords = Math.round(originalWords * 1.4);
      const maxWords = Math.round(originalWords * 1.6);

      return {
        system: `Du bist ein professioneller Content-Writer. Analysiere die Tonalität und erweitere dann präzise.

SCHRITT 1 - TONALITÄT ERKENNEN:
- Sachlich/Professionell: Fakten, neutrale Sprache, B2B-Kontext
- Verkäuferisch: Superlative, Werbesprache, Call-to-Actions
- Emotional: Persönliche Ansprache, Gefühle, Stories

SCHRITT 2 - FORMAT-PRESERVATION (KRITISCH!):
Falls der Original-Text Formatierungen enthält (**Bold**, [[CTA: ]], [[HASHTAGS: ]], #Hashtag), EXAKT beibehalten!
WICHTIG: Füge KEINE neuen Formatierungen hinzu! Nur vorhandene beibehalten!

SCHRITT 3 - PRÄZISE LÄNGEN-VORGABE:
- Original: ${originalWords} Wörter
- Ziel: ${targetWords} Wörter (50% länger)
- Erlaubter Bereich: ${minWords}-${maxWords} Wörter

SCHRITT 4 - ERWEITERN:
- Füge passende Details und Informationen hinzu
- BEHALTE die erkannte Tonalität exakt bei
- Mache ihn informativer im gleichen Stil
- Gleiche Struktur beibehalten
- KRITISCH: Du MUSST die Wortanzahl-Vorgabe erreichen! Mindestens ${minWords} Wörter!
- Füge beschreibende Adjektive, Zusatzinformationen und Details hinzu
- WICHTIG: Formatierungen EXAKT übernehmen!

Antworte NUR mit dem erweiterten Text.`,
        user: `Analysiere die Tonalität und erweitere dann von ${originalWords} auf ${targetWords} Wörter:\n\n${text}`
      };
    }
  },

  // ────────────────────────────────────────────────────────────
  // FORMALIZE - Ausformulieren (Rohentwurf → strukturierte PR)
  // ────────────────────────────────────────────────────────────
  formalize: {
    withContext: (fullDocument: string, text: string) => ({
      system: `Du bist ein erfahrener PR-Experte. Du verwandelst Rohentwürfe, Stichpunkte oder Briefings in professionelle, strukturierte Pressemitteilungs-Texte.

AUFGABE: Erstelle aus dem Rohentwurf eine strukturierte PR mit dieser EXAKTEN Struktur:

STRUKTUR (ZWINGEND EINHALTEN):
**Lead-Absatz: 5 W-Fragen in 80-150 Zeichen** (Wer, Was, Wann, Wo, Warum/Wie)
Absatz 2-3: Hauptinformation mit konkreten Details und Kontext
"Zitat (20-35 Wörter)", sagt [Name/Position].
[[CTA: Konkrete Handlungsaufforderung mit Kontakt]]
[[HASHTAGS: 2-3 relevante Hashtags]]

WICHTIGE REGELN:
- NIEMALS eine Headline/Titel erstellen (# ## ### oder <h1>)
- Lead mit ** markieren (fett)
- Zitat aus dem Kontext ableiten oder generisch halten
- CTA und Hashtags in [[MARKER]] Format
- 3-4 Absätze, prägnant und professionell
- Nutze Informationen aus dem Gesamttext

BEISPIEL:
Input: "KI-gestützte Risikoanalyse für Finanzdienstleister"
Output:
**Ein neues KI-System revolutioniert die Risikoanalyse im Finanzsektor und ermöglicht erstmals Echtzeit-Bewertungen komplexer Marktszenarien.**

Die innovative Lösung kombiniert maschinelles Lernen mit traditionellen Risikomodellen. Das System analysiert kontinuierlich Marktdaten und identifiziert potenzielle Gefahren, bevor sie kritisch werden.

"Diese Technologie versetzt uns in die Lage, Risiken proaktiv zu managen statt reaktiv zu handeln", erklärt der Produktmanager.

[[CTA: Kostenlose Demo anfordern unter demo@beispiel.de]]
[[HASHTAGS: #FinTech #KIInnovation #Risikomanagement]]

Antworte NUR mit der strukturierten PR - keine Erklärungen!`,
      user: `GESAMTER TEXT:\n${fullDocument}\n\nROHENTWURF ZUM AUSFORMULIEREN:\n${text}`
    }),

    withoutContext: (text: string) => ({
      system: `Du bist ein erfahrener PR-Experte. Du verwandelst Rohentwürfe, Stichpunkte oder Briefings in professionelle, strukturierte Pressemitteilungs-Texte.

AUFGABE: Erstelle aus dem Rohentwurf eine strukturierte PR mit dieser EXAKTEN Struktur:

STRUKTUR (ZWINGEND EINHALTEN):
**Lead-Absatz: 5 W-Fragen in 80-150 Zeichen** (Wer, Was, Wann, Wo, Warum/Wie)
Absatz 2-3: Hauptinformation mit konkreten Details
"Zitat (20-35 Wörter)", sagt [Name/Position].
[[CTA: Konkrete Handlungsaufforderung]]
[[HASHTAGS: 2-3 relevante Hashtags]]

WICHTIGE REGELN:
- NIEMALS eine Headline/Titel erstellen
- Lead mit ** markieren (fett)
- Zitat generisch aber professionell
- CTA und Hashtags in [[MARKER]] Format
- 3-4 Absätze, prägnant
- Keine Übertreibungen oder Marketingsprache

BEISPIEL:
Input: "Neue Telemedizin-Plattform"
Output:
**Eine neue Telemedizin-Plattform verbindet ab sofort Patienten in ländlichen Regionen mit Fachärzten und ermöglicht digitale Diagnosen.**

Die browserbasierte Lösung bietet Videosprechstunden, digitale Rezepte und Zugang zu Spezialist:innen. Erste Pilotprojekte zeigen eine Reduktion der Wartezeiten um durchschnittlich 40%.

"Wir bringen medizinische Expertise dorthin, wo sie am dringendsten gebraucht wird", betont die Projektleitung.

[[CTA: Mehr Informationen unter telemedizin-info.de]]
[[HASHTAGS: #Telemedizin #DigitaleGesundheit #eHealth]]

Antworte NUR mit der strukturierten PR!`,
      user: `Formuliere diesen Rohentwurf in eine strukturierte PR aus:\n\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // CHANGE TONE - Tonalität ändern (wie formalize, aber mit Ton-Parameter)
  // ────────────────────────────────────────────────────────────
  changeTone: {
    withContext: (fullDocument: string, text: string, tone: string) => ({
      system: `Du bist ein erfahrener PR-Experte. Du bekommst eine fertige, strukturierte Pressemitteilung und sollst sie komplett neu im gewünschten Ton schreiben.

TONALITÄT: ${tone}

TON-DEFINITIONEN:
- formal: Sachlich, distanziert, offizielle Sprache, keine Umgangssprache
- casual: Locker, umgangssprachlich, persönlich, weniger steif. "Na, schon gespannt?", "easy", "mega", "Bock auf...?"
- professional: Geschäftlich, kompetent, seriös aber zugänglich
- friendly: Warm, einladend, sympathisch, nahbar
- confident: Selbstbewusst, überzeugend, bestimmt, kraftvoll

FORMATIERUNGS-REGELN (ABSOLUT ZWINGEND!):
Du MUSST die Ausgabe mit diesen EXAKTEN Markdown-Markern formatieren:

1. **Fetter Lead-Absatz** → MUSS mit **Text** umschlossen sein
   Beispiel: **Ab Januar startet die Firma XY ihr neues Produkt.**

2. Absätze trennen → MUSS mit doppeltem Zeilenumbruch \\n\\n
   Beispiel: Absatz 1.\\n\\nAbsatz 2.\\n\\nAbsatz 3.

3. Zitate → MUSS mit > am Zeilenanfang + Leerzeile davor/danach
   Beispiel: \\n\\n> "Das ist super", sagt Max Mustermann, CEO.\\n\\n

4. CTA → MUSS mit [[CTA: Text]] Format
   Beispiel: [[CTA: Kostenlose Demo unter info@firma.de]]

5. Hashtags → MUSS mit [[HASHTAGS: #tag1 #tag2 #tag3]] Format
   Beispiel: [[HASHTAGS: #Innovation #Tech #News]]

AUSGABE-FORMAT-BEISPIEL (EXAKT SO!):
**Lead-Absatz mit 5 W-Fragen.**

Absatz 2 mit Details.

Absatz 3 mit mehr Infos.

> "Zitat Text", sagt Name, Position.

[[CTA: Handlungsaufforderung]]

[[HASHTAGS: #tag1 #tag2]]

WICHTIG:
- Gleiche Anzahl Absätze wie Original (mit \\n\\n getrennt)
- Lead MUSS ** ** haben
- Zitat MUSS > haben
- CTA MUSS [[CTA: ]] haben
- Hashtags MÜSSEN [[HASHTAGS: ]] haben
- NUR Wortwahl im Ton "${tone}" ändern, KEINE Informationen ändern

Antworte mit der neu geschriebenen PR im Ton "${tone}" mit ALLEN Formatierungs-Markern!`,
      user: `ORIGINAL-PR (Schreibe sie neu im Ton "${tone}" mit ALLEN Markdown-Markern):\n${text}`
    }),

    withoutContext: (text: string, tone: string) => ({
      system: `Du bist ein erfahrener PR-Experte. Du bekommst eine fertige, strukturierte Pressemitteilung und sollst sie komplett neu im gewünschten Ton schreiben.

TONALITÄT: ${tone}

TON-DEFINITIONEN:
- formal: Sachlich, distanziert, offizielle Sprache, keine Umgangssprache
- casual: Locker, umgangssprachlich, persönlich, weniger steif. "Na, schon gespannt?", "easy", "mega", "Bock auf...?"
- professional: Geschäftlich, kompetent, seriös aber zugänglich
- friendly: Warm, einladend, sympathisch, nahbar
- confident: Selbstbewusst, überzeugend, bestimmt, kraftvoll

FORMATIERUNGS-REGELN (ABSOLUT ZWINGEND!):
Du MUSST die Ausgabe mit diesen EXAKTEN Markdown-Markern formatieren:

1. **Fetter Lead-Absatz** → MUSS mit **Text** umschlossen sein
   Beispiel: **Ab Januar startet die Firma XY ihr neues Produkt.**

2. Absätze trennen → MUSS mit doppeltem Zeilenumbruch \\n\\n
   Beispiel: Absatz 1.\\n\\nAbsatz 2.\\n\\nAbsatz 3.

3. Zitate → MUSS mit > am Zeilenanfang + Leerzeile davor/danach
   Beispiel: \\n\\n> "Das ist super", sagt Max Mustermann, CEO.\\n\\n

4. CTA → MUSS mit [[CTA: Text]] Format
   Beispiel: [[CTA: Kostenlose Demo unter info@firma.de]]

5. Hashtags → MUSS mit [[HASHTAGS: #tag1 #tag2 #tag3]] Format
   Beispiel: [[HASHTAGS: #Innovation #Tech #News]]

AUSGABE-FORMAT-BEISPIEL (EXAKT SO!):
**Lead-Absatz mit 5 W-Fragen.**

Absatz 2 mit Details.

Absatz 3 mit mehr Infos.

> "Zitat Text", sagt Name, Position.

[[CTA: Handlungsaufforderung]]

[[HASHTAGS: #tag1 #tag2]]

WICHTIG:
- Gleiche Anzahl Absätze wie Original (mit \\n\\n getrennt)
- Lead MUSS ** ** haben
- Zitat MUSS > haben
- CTA MUSS [[CTA: ]] haben
- Hashtags MÜSSEN [[HASHTAGS: ]] haben
- NUR Wortwahl im Ton "${tone}" ändern, KEINE Informationen ändern

Antworte mit der neu geschriebenen PR im Ton "${tone}" mit ALLEN Formatierungs-Markern!`,
      user: `ORIGINAL-PR (Schreibe sie neu im Ton "${tone}" mit ALLEN Markdown-Markern):\n${text}`
    })
  },

  // ────────────────────────────────────────────────────────────
  // CUSTOM - Freie Anweisung (IMMER mit vollem Dokument-Kontext)
  // ────────────────────────────────────────────────────────────
  custom: (fullDocument: string, instruction: string) => ({
    system: `Du bist ein präziser Text-Editor. Du arbeitest IMMER mit dem GESAMTEN Dokument und führst die Anweisung präzise aus.

WICHTIGSTE REGEL:
- Führe NUR die in der Anweisung genannte Aufgabe aus
- Gib IMMER das GESAMTE Dokument zurück (nicht nur die geänderte Stelle!)
- Mache KEINE unnötigen Änderungen am Rest des Textes
- KEINE Umformulierungen außer für die spezifische Aufgabe
- KEINE Optimierungen oder Verbesserungen die nicht gefordert wurden
- Behalte die Tonalität und den Schreibstil EXAKT bei

KONTEXTUELLE ANWEISUNGEN (Beispiele):
- "Füge im letzten Absatz etwas über XYZ hinzu" → Finde letzten Absatz, füge Information ein
- "Der Geschäftsführer heißt Peter statt Max" → Ersetze Namen im gesamten Text
- "Mache den zweiten Absatz kürzer" → Identifiziere zweiten Absatz, kürze ihn
- "Füge ein Zitat von Max Mustermann hinzu" → Wähle passende Stelle, füge Zitat ein
- "Ersetze das Datum durch 15. November 2025" → Finde Datum, ersetze es
- "Füge Informationen über Produkt XYZ hinzu" → Integriere sinnvoll in passenden Absatz

BEISPIEL 1 - Name ändern:
Input: "TechCorp startet neue Lösung. Max Mustermann ist CEO."
Anweisung: "CEO heißt Peter Schmidt"
Output: "TechCorp startet neue Lösung. Peter Schmidt ist CEO."

BEISPIEL 2 - Information hinzufügen:
Input: "Die Firma bietet Services an. Kontaktieren Sie uns."
Anweisung: "Füge Telefonnummer 089-123456 hinzu"
Output: "Die Firma bietet Services an. Kontaktieren Sie uns unter 089-123456."

WICHTIG: Antworte OHNE jegliche Formatierungen (kein Markdown, kein HTML). Nur reiner Text!`,
    user: `GESAMTES DOKUMENT:\n${fullDocument}\n\nANWEISUNG ZUM AUSFÜHREN:\n${instruction}\n\nAntworte mit dem GESAMTEN modifizierten Dokument als reinen Text (ohne Formatierungen):`
  })
};

// ══════════════════════════════════════════════════════════════
// PR-FORMATTER: Automatische Formatierung nach PR-Schema
// ══════════════════════════════════════════════════════════════

function formatPressRelease(plainText: string): string {
  console.log('🎨 Starte automatische PR-Formatierung...');

  let formatted = plainText;

  // 1. ABSÄTZE: Stelle sicher dass Absätze mit \n\n getrennt sind
  // Normalisiere unterschiedliche Zeilenumbrüche
  formatted = formatted.replace(/\r\n/g, '\n'); // Windows → Unix
  formatted = formatted.replace(/\n{3,}/g, '\n\n'); // Mehr als 2 → genau 2

  // 2. ERSTER ABSATZ FETT: Finde ersten Absatz und mache ihn fett (falls nicht schon)
  const paragraphs = formatted.split('\n\n');
  if (paragraphs.length > 0 && paragraphs[0].trim()) {
    const firstPara = paragraphs[0].trim();
    // Nur fett machen wenn noch nicht fett
    if (!firstPara.startsWith('**') && !firstPara.includes('**')) {
      paragraphs[0] = `**${firstPara}**`;
    }
  }
  formatted = paragraphs.join('\n\n');

  // 3. ZITATE: Finde Zitate und formatiere sie mit >
  // Pattern 1: "Text", sagt Person, Rolle
  formatted = formatted.replace(
    /["„"]([^"„"]+)[""], sagt ([^,.\n]+)(?:, ([^.\n]+))?/gm,
    (match, quote, person, role) => {
      const formattedQuote = `> "${quote.trim()}", sagt ${person.trim()}${role ? ', ' + role.trim() : ''}`;
      // Stelle sicher dass Leerzeilen davor/danach sind (wenn nicht am Anfang/Ende)
      return match.startsWith('\n') ? `\n${formattedQuote}\n\n` : `\n\n${formattedQuote}\n\n`;
    }
  );

  // Pattern 2: "Text" - Person, Rolle (ohne "sagt")
  formatted = formatted.replace(
    /["„"]([^"„"]+)[""][\s]*[-–—][\s]*([^,.\n]+)(?:, ([^.\n]+))?/gm,
    (match, quote, person, role) => {
      const formattedQuote = `> "${quote.trim()}", ${person.trim()}${role ? ', ' + role.trim() : ''}`;
      return match.startsWith('\n') ? `\n${formattedQuote}\n\n` : `\n\n${formattedQuote}\n\n`;
    }
  );

  // 4. HASHTAGS: Finde Hashtags und formatiere sie
  // Pattern: #tag1 #tag2 #tag3 (am Ende oder in eigener Zeile)
  const hashtagPattern = /(#\w+(?:\s+#\w+)*)/g;
  formatted = formatted.replace(hashtagPattern, (match) => {
    // Wenn nicht schon im [[HASHTAGS: ]] Format
    if (!formatted.includes(`[[HASHTAGS: ${match}]]`)) {
      return `[[HASHTAGS: ${match}]]`;
    }
    return match;
  });

  // 5. CTA: Finde typische CTA-Phrasen und formatiere sie
  // Pattern: Mehr Informationen, Jetzt registrieren, Kontakt, Website-URLs etc.
  const ctaPatterns = [
    /(?:^|\n\n)((?:Mehr Informationen|Weitere Informationen|Jetzt registrieren|Kontakt|Besuchen Sie|Erfahren Sie mehr)[^\n]+)/gim,
    /(?:^|\n\n)((?:https?:\/\/|www\.)[^\s]+)/gim
  ];

  ctaPatterns.forEach(pattern => {
    formatted = formatted.replace(pattern, (match, cta) => {
      const trimmed = cta.trim();
      // Nur umwandeln wenn nicht schon im [[CTA: ]] Format
      if (!formatted.includes(`[[CTA: ${trimmed}]]`) && !trimmed.startsWith('[[CTA:')) {
        return `\n\n[[CTA: ${trimmed}]]`;
      }
      return match;
    });
  });

  // 6. Cleanup: Entferne überschüssige Leerzeilen
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  formatted = formatted.trim();

  console.log('✅ PR-Formatierung abgeschlossen');
  return formatted;
}

// ══════════════════════════════════════════════════════════════
// TEXT-PARSER: Entfernt Formatierungen und PM-Strukturen
// ══════════════════════════════════════════════════════════════

function parseTextFromAIOutput(aiOutput: string): string {
  let text = aiOutput;

  // 1. Entferne ALLE HTML Tags
  text = text.replace(/<\/?h[1-6][^>]*>/gi, '');
  text = text.replace(/<\/?strong[^>]*>/gi, '');
  text = text.replace(/<\/?b[^>]*>/gi, '');
  text = text.replace(/<\/?em[^>]*>/gi, '');
  text = text.replace(/<\/?i[^>]*>/gi, '');
  text = text.replace(/<\/?p[^>]*>/gi, '');
  text = text.replace(/<\/?div[^>]*>/gi, '');
  text = text.replace(/<\/?span[^>]*>/gi, '');
  text = text.replace(/<(?!\/?(?:ul|ol|li)(?:\s|>))[^>]*>/gi, '');

  // 2. Entferne ALLE Markdown-Formatierungen
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1');

  // 3. Entferne Heading-Marker
  text = text.replace(/^#{1,6}\s+/gm, '');

  // 4. Extrahiere Antwort aus Volltext-Kontext falls vorhanden
  const hasFullContext = text.includes('GESAMTER TEXT:') || text.includes('MARKIERTE STELLE:');
  if (hasFullContext) {
    const parts = text.split(/MARKIERTE STELLE.*?:\s*/);
    if (parts.length > 1) {
      text = parts[parts.length - 1].trim();
    }
  }

  // 5. Minimale Bereinigung - nur offensichtliche PM-Phrasen
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const textContent: string[] = [];

  for (const line of lines) {
    // BEHALTE fast alles - nur extreme PM-Phrasen filtern
    if (line.includes('Die Pressemitteilung endet hier') ||
        line.includes('Über [Unternehmen]') ||
        line.includes('Pressekontakt:') ||
        line.includes('ENDE DER PRESSEMITTEILUNG')) {
      continue;
    }

    textContent.push(line);
  }

  return textContent.join('\n\n') || aiOutput;
}

// ══════════════════════════════════════════════════════════════
// GENKIT FLOW DEFINITION
// ══════════════════════════════════════════════════════════════

export const textTransformFlow = ai.defineFlow(
  {
    name: 'textTransform',
    inputSchema: TextTransformInputSchema,
    outputSchema: TextTransformOutputSchema,
  },
  async (input: TextTransformInput): Promise<TextTransformOutput> => {
    console.log('🔄 Text-Transformation gestartet', {
      action: input.action,
      textLength: input.text.length,
      hasFullDocument: !!input.fullDocument,
      hasTone: !!input.tone,
      hasInstruction: !!input.instruction
    });

    // ══════════════════════════════════════════════════════════════
    // 1. PROMPT-AUSWAHL BASIEREND AUF ACTION
    // ══════════════════════════════════════════════════════════════

    let systemPrompt = '';
    let userPrompt = '';

    const hasFullContext = input.fullDocument && input.fullDocument.length > input.text.length;

    switch (input.action) {
      case 'rephrase': {
        const prompts = hasFullContext
          ? PROMPTS.rephrase.withContext(input.fullDocument!, input.text)
          : PROMPTS.rephrase.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'shorten': {
        const prompts = hasFullContext
          ? PROMPTS.shorten.withContext(input.fullDocument!, input.text)
          : PROMPTS.shorten.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'expand': {
        const prompts = hasFullContext
          ? PROMPTS.expand.withContext(input.fullDocument!, input.text)
          : PROMPTS.expand.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'formalize': {
        const prompts = hasFullContext
          ? PROMPTS.formalize.withContext(input.fullDocument!, input.text)
          : PROMPTS.formalize.withoutContext(input.text);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'change-tone': {
        if (!input.tone) {
          throw new Error('Tone parameter is required for change-tone action');
        }
        const prompts = hasFullContext
          ? PROMPTS.changeTone.withContext(input.fullDocument!, input.text, input.tone)
          : PROMPTS.changeTone.withoutContext(input.text, input.tone);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      case 'custom': {
        if (!input.instruction) {
          throw new Error('Instruction parameter is required for custom action');
        }
        // Custom arbeitet IMMER mit fullDocument (kontextbewusst)
        const fullDocForCustom = input.fullDocument || input.text;
        const prompts = PROMPTS.custom(fullDocForCustom, input.instruction);
        systemPrompt = prompts.system;
        userPrompt = prompts.user;
        break;
      }

      default:
        throw new Error(`Unknown action: ${input.action}`);
    }

    console.log('📋 Prompts gewählt:', {
      action: input.action,
      hasContext: hasFullContext,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length
    });

    // ══════════════════════════════════════════════════════════════
    // 1.5 PRE-PROCESSING: Format Extraction
    // ══════════════════════════════════════════════════════════════

    // Format-Preservation für alle Actions außer formalize, change-tone (eigene PR-Struktur) und custom (eigene Post-Processing Formatierung)
    const shouldPreserveFormat = ['rephrase', 'shorten', 'expand'].includes(input.action);
    let formatMarkers = null;
    let textToTransform = input.text;

    if (shouldPreserveFormat) {
      console.log('🔍 Extrahiere Formatierung vor AI-Transform...');
      const extracted = extractFormatting(input.text);
      formatMarkers = extracted.markers;
      textToTransform = extracted.plainText;

      console.log('📊 Format-Extraktion:', {
        originalLength: input.text.length,
        plainTextLength: textToTransform.length,
        markersCount: formatMarkers.length,
        markerTypes: formatMarkers.map(m => m.type)
      });

      // Update prompts mit plainText statt original text
      const hasFullContext = input.fullDocument && input.fullDocument.length > input.text.length;

      switch (input.action) {
        case 'rephrase': {
          const prompts = hasFullContext
            ? PROMPTS.rephrase.withContext(input.fullDocument!, textToTransform)
            : PROMPTS.rephrase.withoutContext(textToTransform);
          systemPrompt = prompts.system;
          userPrompt = prompts.user;
          break;
        }
        case 'shorten': {
          const prompts = hasFullContext
            ? PROMPTS.shorten.withContext(input.fullDocument!, textToTransform)
            : PROMPTS.shorten.withoutContext(textToTransform);
          systemPrompt = prompts.system;
          userPrompt = prompts.user;
          break;
        }
        case 'expand': {
          const prompts = hasFullContext
            ? PROMPTS.expand.withContext(input.fullDocument!, textToTransform)
            : PROMPTS.expand.withoutContext(textToTransform);
          systemPrompt = prompts.system;
          userPrompt = prompts.user;
          break;
        }
        case 'change-tone': {
          const prompts = hasFullContext
            ? PROMPTS.changeTone.withContext(input.fullDocument!, textToTransform, input.tone!)
            : PROMPTS.changeTone.withoutContext(textToTransform, input.tone!);
          systemPrompt = prompts.system;
          userPrompt = prompts.user;
          break;
        }
        case 'custom': {
          // Custom arbeitet IMMER mit fullDocument (auch im Pre-Processing)
          const fullDocForCustom = input.fullDocument || textToTransform;
          const prompts = PROMPTS.custom(fullDocForCustom, input.instruction!);
          systemPrompt = prompts.system;
          userPrompt = prompts.user;
          break;
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // 2. GEMINI API CALL
    // ══════════════════════════════════════════════════════════════

    // Model-Auswahl: Immer Gemini 2.5 Flash für beste Qualität
    // (Nach Tests: Flash liefert deutlich bessere Ergebnisse, besonders bei Ton-Änderungen)
    const selectedModel = gemini25FlashModel;
    const modelConfig = { temperature: 0.7, maxOutputTokens: 8192 };

    console.log('🤖 Model Selection:', {
      action: input.action,
      model: 'gemini-2.5-flash',
      maxOutputTokens: modelConfig.maxOutputTokens
    });

    let result;
    try {
      result = await ai.generate({
        model: selectedModel,
        prompt: [
          { text: systemPrompt },
          { text: userPrompt }
        ],
        config: modelConfig
      });
    } catch (genError: any) {
      console.error('❌ Gemini API Error:', {
        error: genError.message,
        stack: genError.stack,
        action: input.action
      });
      throw new Error(`Gemini API Fehler: ${genError.message}`);
    }

    // Text Extraction (siehe genkit-integration-learnings.md)
    const generatedText = result.message?.content?.[0]?.text
                       || (typeof result.text === 'function' ? result.text() : '')
                       || '';

    console.log('🔍 Text Extraction Debug:', {
      hasMessage: !!result.message,
      hasContent: !!result.message?.content,
      contentLength: result.message?.content?.length,
      hasText: !!result.message?.content?.[0]?.text,
      extractedLength: generatedText.length,
      resultKeys: Object.keys(result)
    });

    if (!generatedText || generatedText.trim() === '') {
      console.error('❌ Leere Gemini Response:', {
        result: JSON.stringify(result, null, 2),
        action: input.action
      });
      throw new Error('Keine Antwort von Gemini erhalten - Response war leer');
    }

    console.log('✅ Text generiert, Länge:', generatedText.length);

    // ══════════════════════════════════════════════════════════════
    // 3. POST-PROCESSING: Text-Parsing
    // ══════════════════════════════════════════════════════════════

    let transformedText = parseTextFromAIOutput(generatedText);

    // ══════════════════════════════════════════════════════════════
    // 3.3 POST-PROCESSING: Doppelpunkt-Bug beheben
    // ══════════════════════════════════════════════════════════════

    // FIX: Entferne doppelte Punkte am Ende von Sätzen
    // Problem: AI fügt manchmal ".." statt "." hinzu
    transformedText = transformedText.replace(/\.{2,}/g, '.');

    // ══════════════════════════════════════════════════════════════
    // 3.5 POST-PROCESSING: Format Restoration / PR Formatting
    // ══════════════════════════════════════════════════════════════

    // CUSTOM Action: Automatische PR-Formatierung anwenden
    if (input.action === 'custom') {
      console.log('📝 Custom Action: Wende automatische PR-Formatierung an...');
      transformedText = formatPressRelease(transformedText);
    }
    // Andere Actions: Format-Preservation anwenden
    else if (shouldPreserveFormat && formatMarkers && formatMarkers.length > 0) {
      console.log('🎨 Wende Formatierung auf transformierten Text an...');
      const formattedText = applyFormatting(transformedText, formatMarkers);

      console.log('📊 Format-Restoration:', {
        plainTextLength: transformedText.length,
        formattedTextLength: formattedText.length,
        markersApplied: formatMarkers.length
      });

      transformedText = formattedText;
    }

    // ══════════════════════════════════════════════════════════════
    // 4. METRIKEN BERECHNEN
    // ══════════════════════════════════════════════════════════════

    const originalWords = input.text.split(/\s+/).length;
    const transformedWords = transformedText.split(/\s+/).length;
    const wordCountChange = transformedWords - originalWords;

    console.log('📊 Transformation abgeschlossen', {
      action: input.action,
      originalLength: input.text.length,
      transformedLength: transformedText.length,
      wordCountChange
    });

    return {
      transformedText,
      action: input.action,
      originalLength: input.text.length,
      transformedLength: transformedText.length,
      wordCountChange,
      timestamp: new Date().toISOString()
    };
  }
);
