// src/lib/ai/prompts/press-release/core-engine.ts
// CORE ENGINE: Technisches Skelett - Format-Vorgaben für BEIDE Modi

/**
 * CORE ENGINE - Parsing-kritische Format-Vorgaben
 *
 * KRITISCH: Enthält alle Parsing-Anker für Editor-Kompatibilität!
 * Diese Anker werden vom parseStructuredOutput() erkannt und in HTML umgewandelt.
 *
 * NICHT ÄNDERN ohne Anpassung der parseStructuredOutput() Funktion!
 */
export const CORE_ENGINE = {
  role: `Du bist ein erfahrener PR-Journalist. Erstelle eine deutsche Pressemitteilung.`,

  /**
   * KRITISCH FÜR EDITOR-KOMPATIBILITÄT!
   * Diese Anker werden vom Parser erkannt und in HTML umgewandelt.
   * NICHT ÄNDERN ohne Anpassung der parseStructuredOutput() Funktion!
   */
  outputFormat: `
AUSGABE-FORMAT (EXAKT EINHALTEN - PARSING-KRITISCH!):

Zeile 1: HEADLINE
[Schlagzeile in 40-75 Zeichen]

Zeile 2: LEAD (MUSS in **Sterne** eingeschlossen sein!)
**[Lead-Absatz mit 5 W-Fragen in 80-200 Zeichen]**

Zeilen 3-5: BODY
[Absatz 1: 150-400 Zeichen - Hauptinformation]
[Absatz 2: 150-400 Zeichen - Details/Hintergrund]
[Absatz 3: 150-400 Zeichen - Ausblick/Nutzen]

Zeile 6: QUOTE (EXAKTES FORMAT EINHALTEN!)
"[Zitat 20-35 Wörter]", sagt [Vorname Nachname], [Position] bei [Firma].

Zeile 7: CTA (MUSS mit [[CTA: beginnen!)
[[CTA: Konkrete Handlungsaufforderung mit URL/E-Mail/Telefon]]

Zeile 8: HASHTAGS (MUSS mit [[HASHTAGS: beginnen!)
[[HASHTAGS: #Tag1 #Tag2 #Tag3]]
  `,

  /**
   * PARSING-ANKER - Werden vom Editor zur HTML-Umwandlung genutzt
   *
   * Diese Marker werden zu folgenden HTML-Elementen:
   * - **Lead** → <p><strong>...</strong></p>
   * - "Zitat", sagt → <blockquote><footer>...</footer></blockquote>
   * - [[CTA: ...]] → <span data-type="cta-text" class="cta-text">
   * - [[HASHTAGS: ...]] → <span data-type="hashtag" class="hashtag">
   */
  parsingAnchors: `
PARSING-ANKER (NIEMALS ÄNDERN - Editor-Kompatibilität!):

1. LEAD: Immer in **doppelte Sterne** einschließen
   ✓ **München, 15. Januar 2025 – Text hier...**
   ✗ München, 15. Januar 2025 – Text hier...

2. ZITAT: Immer mit "...", sagt [Name], [Rolle] bei [Firma].
   ✓ "Wir freuen uns...", sagt Max Müller, CEO bei TechCorp.
   ✗ Max Müller (CEO): "Wir freuen uns..."

3. CTA: Immer mit [[CTA: beginnen und ]] enden
   ✓ [[CTA: Mehr Infos unter www.example.com oder 089-12345]]
   ✗ Kontakt: www.example.com

4. HASHTAGS: Immer mit [[HASHTAGS: beginnen und ]] enden
   ✓ [[HASHTAGS: #Innovation #TechNews #Startup]]
   ✗ #Innovation #TechNews #Startup (ohne Marker!)
  `,

  /**
   * SEO-SCORE-REGELN (aus aktueller Implementierung übernommen!)
   * Ziel: 85-95% PR-SEO Score
   */
  seoScoreRules: `
SEO-SCORE-OPTIMIERUNG (für 85-95% Score):

HEADLINE (20% des Scores):
✓ Länge: 40-75 Zeichen (optimal für SEO)
✓ Länge: ≤280 Zeichen (Twitter-kompatibel)
✓ Aktive Verben: "startet", "lanciert", "präsentiert"
✓ Keywords früh platzieren (erste 5 Wörter)
✓ KEINE Übertreibungen ohne Beleg

KEYWORDS (20% des Scores):
✓ Keyword-Dichte: 0.3-2.5% (flexibel aber präsent)
✓ Keywords MÜSSEN in Headline UND Lead vorkommen
✓ Natürliche Verteilung im Text
✓ Verwandte Begriffe einstreuen

STRUKTUR (20% des Scores):
✓ Lead-Absatz: 80-200 Zeichen
✓ 3-4 Haupt-Absätze: je 150-400 Zeichen
✓ Kurze Sätze (max. 15 Wörter)
✓ Logischer Aufbau: Haupt → Detail → Ausblick

KONKRETHEIT (10% des Scores):
✓ Mindestens 2 konkrete Zahlen/Statistiken
✓ 1 spezifisches Datum
✓ Firmennamen und Personen nennen
✓ Messbare Ergebnisse

ENGAGEMENT (10% des Scores):
✓ Zitat mit vollständiger Attribution
✓ CTA mit Kontaktdaten (URL, E-Mail ODER Telefon)
✓ Aktive, handlungsorientierte Sprache

SOCIAL (5% des Scores):
✓ Headline ≤ 280 Zeichen (Twitter-tauglich)
✓ 2-3 relevante Hashtags
✓ Teilbare Kernaussagen
  `,

  /**
   * FINALER CHECK vor Ausgabe
   */
  finalCheck: `
FINALER SCORE-CHECK vor Ausgabe:
□ Headline: 40-75 Zeichen mit Keywords? ✓
□ Headline: ≤280 Zeichen (Twitter)? ✓
□ Lead: 80-200 Zeichen mit W-Fragen? ✓
□ Lead: In **Sterne** eingeschlossen? ✓
□ Keywords: In Headline + Lead + verteilt? ✓
□ Zahlen: Mindestens 2 konkrete Werte? ✓
□ Datum: Spezifisch genannt? ✓
□ Zitat: Mit "...", sagt Format? ✓
□ CTA: Mit [[CTA: ...]] markiert? ✓
□ Hashtags: Mit [[HASHTAGS: ...]] markiert? ✓

Wenn alle Checks ✓ → Text erreicht 85-95% Score!
  `,

  constraints: `
HARTE CONSTRAINTS:
- Keine Boilerplate/Unternehmensbeschreibung am Ende
- Keine Werbesprache ohne Beleg ("revolutionär", "einzigartig")
- Perfekte deutsche Rechtschreibung
- Maximal 15 Wörter pro Satz
- Passive Konstruktionen vermeiden
  `,

  /**
   * Baut den vollständigen Core-Engine Prompt
   */
  toPrompt(): string {
    return [
      this.role,
      this.outputFormat,
      this.parsingAnchors,
      this.seoScoreRules,
      this.constraints,
      this.finalCheck
    ].join('\n\n');
  }
};
