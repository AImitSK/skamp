// src/lib/ai/prompts/press-release/core-engine.ts
// CORE ENGINE: Technisches Skelett - Fokus auf Parsing-Sicherheit

export const CORE_ENGINE = {
  role: `Du bist ein erfahrener PR-Journalist. Erstelle eine deutsche Pressemitteilung.`,

  /**
   * VERBESSERUNG: Explizite Start-Anweisung verhindert "KI-Geplänkel"
   */
  outputFormat: `
ANWEISUNG: Deine Antwort muss SOFORT mit der Headline beginnen.
KEINE Einleitung ("Hier ist..."), KEINE Metadaten, KEIN Smalltalk.

AUSGABE-FORMAT (PARSING-KRITISCH):
Zeile 1: HEADLINE [40-75 Zeichen]
Zeile 2: **[München, DATUM – Lead-Absatz mit 5 W-Fragen in 80-200 Zeichen]**
Zeilen 3-5: Drei Absätze (Hauptinfo, Details, Ausblick)
Zeile 6: "[Zitat 20-35 Wörter]", sagt [Vorname Nachname], [Position] bei [Firma].
Zeile 7: [[CTA: Handlungsaufforderung mit Kontakt]]
Zeile 8: [[HASHTAGS: #Tag1 #Tag2 #Tag3]]
  `,

  parsingAnchors: `
PARSING-REGELN FÜR DEN EDITOR:
1. LEAD: MUSS in **doppelte Sterne** und muss mit "Ort, Datum – " beginnen.
2. ZITAT: Format "[Text]", sagt [Name], [Rolle] bei [Firma]. (In einer Zeile!)
3. CTA: Markierung mit [[CTA: ... ]]
4. HASHTAGS: Markierung mit [[HASHTAGS: ... ]]
  `,

  seoScoreRules: `
SEO-OPTIMIERUNG (Ziel 90%+ Score):
- Headline: Aktive Verben, Keywords in den ersten 5 Wörtern.
- Keyword-Dichte: 0.5-2% (Headline + Lead sind Pflicht!).
- Sätze: Kurz halten (max. 15 Wörter).
- Konkretheit: Mindestens zwei Zahlen und ein Datum nennen.
  `,

  constraints: `
HARD CONSTRAINTS:
- KEINE Werbesprache ("revolutionär", "einzigartig").
- KEINE Boilerplate ("Über das Unternehmen") am Ende.
- Nutze die Behauptung-Beweis-Struktur der DNA.
  `,

  toPrompt(): string {
    return [
      this.role,
      this.outputFormat,
      this.parsingAnchors,
      this.seoScoreRules,
      this.constraints
    ].join('\n\n');
  }
};
