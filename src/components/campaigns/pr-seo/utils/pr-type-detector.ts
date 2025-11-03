// src/components/campaigns/pr-seo/utils/pr-type-detector.ts

import type { PRTypeInfo, PRTypeModifiers, AudienceThresholds } from '../types';

/**
 * PR-Typ-Detector
 * Erkennt PR-Typ und liefert typ-spezifische Bewertungsmodifikatoren
 */
export class PRTypeDetector {
  /**
   * Erkennt den PR-Typ aus Content und Titel
   * @param content - Der HTML-Text-Inhalt
   * @param title - Der Titel
   * @returns PR-Typ-Informationen
   */
  static detectType(content: string, title: string): PRTypeInfo {
    const cleanContent = content.replace(/<[^>]*>/g, '').toLowerCase();

    return {
      isProduct: /\b(produkt|service|lösung|software|app|plattform|tool)\b/i.test(cleanContent),
      isFinancial: /\b(umsatz|gewinn|quartal|geschäftsjahr|bilanz|finanzen|ergebnis)\b/i.test(cleanContent),
      isPersonal: /\b(ernennung|beförderung|new hire|verstorben|nachruf|award)\b/i.test(cleanContent),
      isResearch: /\b(studie|umfrage|forschung|analyse|bericht|whitepaper)\b/i.test(cleanContent),
      isCrisis: /\b(entschuldigung|bedauern|korrektur|richtigstellung|stellungnahme)\b/i.test(cleanContent),
      isEvent: /\b(veranstaltung|konferenz|messe|webinar|event|termin)\b/i.test(cleanContent)
    };
  }

  /**
   * Liefert PR-Typ-spezifische Modifikatoren für Bewertung
   * @param content - Der HTML-Text-Inhalt
   * @param title - Der Titel
   * @returns Modifikatoren für Headline-Bewertung
   */
  static getModifiers(content: string, title: string): PRTypeModifiers {
    const prType = this.detectType(content, title);
    const cleanTitle = title.toLowerCase();

    let headlineModifier = 0;
    let verbImportance = 15; // Standard
    let recommendationSuffix = '';

    if (prType.isFinancial || prType.isResearch) {
      // Finanz/Research PR: Verben weniger wichtig, Zahlen wichtiger
      verbImportance = 5;
      headlineModifier = cleanTitle.match(/\d+/g) ? 10 : 0; // Zahlen-Bonus
      recommendationSuffix = ' (Zahlen und Fakten wichtiger als aktive Sprache)';
    } else if (prType.isPersonal) {
      // Personal PR: Verben optional, Titel/Namen wichtig
      verbImportance = 8;
      headlineModifier = /\b(dr\.|prof\.|ceo|cto|direktor)\b/i.test(cleanTitle) ? 8 : 0;
      recommendationSuffix = ' (bei Personal-PR sind Titel und Position wichtiger)';
    } else if (prType.isCrisis) {
      // Crisis PR: Sachlichkeit wichtiger als Dynamik
      verbImportance = 3;
      headlineModifier = /\b(erklärt|stellt klar|informiert)\b/i.test(cleanTitle) ? 12 : 0;
      recommendationSuffix = ' (bei Crisis-PR ist sachliche Kommunikation wichtiger)';
    } else if (prType.isProduct || prType.isEvent) {
      // Product/Event PR: Verben sehr wichtig für Action
      verbImportance = 25;
      recommendationSuffix = ' (bei Produkt/Event-PR verstärken aktive Verben die Wirkung)';
    }

    return {
      headlineModifier,
      verbImportance,
      recommendationSuffix,
      prType
    };
  }

  /**
   * Liefert zielgruppen-spezifische Schwellenwerte
   * @param targetAudience - Die Zielgruppe ('B2B', 'B2C', 'Verbraucher', etc.)
   * @returns Schwellenwerte für Bewertung
   */
  static getThresholds(targetAudience: string): AudienceThresholds {
    switch (targetAudience) {
      case 'B2B':
        return {
          paragraphLength: { min: 150, max: 500 },  // Längere Absätze OK
          sentenceComplexity: { max: 25 },          // Komplexere Sätze erlaubt
          technicalTerms: { bonus: 10 }             // Fachbegriffe positiv
        };
      case 'B2C':
        return {
          paragraphLength: { min: 80, max: 250 },   // Kürzere Absätze
          sentenceComplexity: { max: 15 },          // Einfachere Sätze
          technicalTerms: { penalty: 5 }            // Fachbegriffe negativ
        };
      case 'Verbraucher':
        return {
          paragraphLength: { min: 60, max: 200 },   // Sehr kurze Absätze
          sentenceComplexity: { max: 12 },          // Sehr einfache Sätze
          technicalTerms: { penalty: 10 }           // Fachbegriffe sehr negativ
        };
      default:
        return {
          paragraphLength: { min: 100, max: 300 },
          sentenceComplexity: { max: 20 },
          technicalTerms: { neutral: 0 }
        };
    }
  }
}
