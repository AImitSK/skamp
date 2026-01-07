// src/lib/ai/prompts/press-release/press-release-craftsmanship.ts
// PRESS RELEASE CRAFTSMANSHIP: Universelle journalistische Standards für BEIDE Modi

/**
 * PRESS RELEASE CRAFTSMANSHIP
 *
 * Universelles journalistisches "Basishandwerk" - wird in BEIDEN Modi geladen.
 * Ersetzt das ursprüngliche base-rules.ts mit erweiterten Standards.
 */
export const PRESS_RELEASE_CRAFTSMANSHIP = {
  /**
   * Lead-Struktur: Standardisiertes Format für alle Pressemeldungen
   */
  leadStructure: `
LEAD-STRUKTUR (PFLICHT):
✓ Beginnt IMMER mit: "[Ort], [Datum] – "
✓ Beispiel: "München, 15. Januar 2025 – "
✓ Danach: Kernaussage in einem Satz
  `,

  /**
   * Zitat-Formatierung: Standardisierte Zitat-Attribution
   */
  quoteFormatting: `
ZITAT-FORMATIERUNG (PFLICHT):
✓ Zitate stehen in eigenen Absätzen
✓ Format: "[Text]", sagt [Vorname Nachname], [Position] bei [Firma].
✓ Keine Unterbrechung des Zitats durch "erklärt" o.ä.
  `,

  /**
   * Headline-Regeln: SEO-optimierte Schlagzeilen-Standards
   */
  headlineRules: `
HEADLINE (PFLICHT):
✓ 40-75 Zeichen (SEO-optimal)
✓ Aktive Verben: "startet", "präsentiert", "lanciert"
✓ KEINE Superlative ohne Beleg: "revolutionär", "einzigartig"
✓ Keywords in den ersten 5 Wörtern
  `,

  /**
   * Absatz-Struktur: Standard-Layout für Body-Paragraphen
   */
  paragraphStructure: `
ABSATZ-STRUKTUR (PFLICHT):
✓ 3 Body-Absätze: Hauptinfo → Details → Ausblick
✓ Je 150-400 Zeichen pro Absatz
✓ Maximal 15 Wörter pro Satz
✓ Mindestens 2 konkrete Zahlen/Daten im gesamten Text
  `,

  /**
   * SEO-Grundregeln: Basis-Optimierung für Suchmaschinen
   */
  seoBasics: `
SEO-GRUNDREGELN:
✓ Hauptkeyword in Headline + Lead
✓ Strukturierte Daten (Ort, Datum, Name)
✓ Keine Boilerplate am Ende
✓ Kein Marketing-Sprech ohne Faktenbeleg
  `,

  /**
   * Baut den vollständigen Craftsmanship-Prompt
   */
  toPrompt(): string {
    return [
      this.leadStructure,
      this.quoteFormatting,
      this.headlineRules,
      this.paragraphStructure,
      this.seoBasics
    ].join('\n');
  }
};
