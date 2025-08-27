/**
 * Intelligente Hashtag-Erkennung und -Verarbeitung für das PR-SEO System
 * 
 * Diese Klasse bietet umfassende Funktionalitäten zur automatischen
 * Erkennung, Validierung und Bewertung von Hashtags in deutschen PR-Texten.
 * 
 * @author Claude AI
 * @version 1.0.0
 */

// Branchenspezifische Hashtag-Mappings
const INDUSTRY_HASHTAGS: Record<string, string[]> = {
  'technologie': [
    '#TechNews', '#Innovation', '#Digitalisierung', '#KI', '#Software',
    '#IT', '#Digital', '#Tech', '#Startup', '#Künstliche Intelligenz',
    '#DataScience', '#CloudComputing', '#Cybersecurity', '#IoT', '#Blockchain'
  ],
  'finanz': [
    '#Fintech', '#Investment', '#Banking', '#Wirtschaft', '#Börse',
    '#Finance', '#Finanzen', '#Geld', '#Kapital', '#Versicherung',
    '#Kredite', '#Anlage', '#Trading', '#Kryptowährung', '#Steuer'
  ],
  'gesundheit': [
    '#Healthcare', '#Medizin', '#Gesundheit', '#Pharma', '#DigitalHealth',
    '#Wellness', '#Fitness', '#Ernährung', '#Therapie', '#Medtech',
    '#Telemedizin', '#Prävention', '#Rehabilitation', '#Pflege', '#Arzt'
  ],
  'automobil': [
    '#Automotive', '#Auto', '#Elektromobilität', '#EMobility', '#Mobilität',
    '#Fahrzeug', '#Transport', '#Logistik', '#Verkehr', '#CarTech',
    '#AutonomesfahFahren', '#Nachhaltigkeit', '#Elektroauto', '#Hybrid'
  ],
  'energie': [
    '#Energie', '#Nachhaltigkeit', '#Renewable', '#Solar', '#Wind',
    '#Umwelt', '#GreenTech', '#Klimaschutz', '#Energiewende', '#Clean Energy',
    '#Photovoltaik', '#Windkraft', '#Wasserstoff', '#Bioenergie', '#Smart Grid'
  ],
  'einzelhandel': [
    '#Retail', '#Handel', '#Ecommerce', '#Shopping', '#Verbraucher',
    '#OnlineHandel', '#Einzelhandel', '#Kunden', '#Service', '#Verkauf',
    '#B2C', '#Marktplatz', '#Omnichannel', '#CustomerExperience', '#POS'
  ],
  'immobilien': [
    '#Immobilien', '#RealEstate', '#Bau', '#Architektur', '#Wohnen',
    '#PropTech', '#Investition', '#Makler', '#Hausbau', '#Smart Home',
    '#Stadtentwicklung', '#Gewerbe', '#Miete', '#Kauf', '#Sanierung'
  ]
};

// Allgemeine PR-relevante Hashtags
const GENERAL_PR_HASHTAGS = [
  '#PressRelease', '#Pressemitteilung', '#News', '#Neuigkeiten', '#Ankündigung',
  '#NewProduct', '#NeuesProdukt', '#Launch', '#Markteinführung', '#Update',
  '#Partnership', '#Kooperation', '#Zusammenarbeit', '#Award', '#Auszeichnung',
  '#Event', '#Veranstaltung', '#Konferenz', '#Messe', '#Webinar',
  '#Expansion', '#Wachstum', '#Milestone', '#Meilenstein', '#Success',
  '#B2B', '#B2C', '#Corporate', '#Business', '#Unternehmen'
];

interface HashtagAnalysis {
  hashtag: string;
  score: number;
  reasons: string[];
  isKeywordRelevant: boolean;
  isIndustryRelevant: boolean;
  length: number;
  hasGermanChars: boolean;
}

interface HashtagQualityResult {
  totalScore: number;
  averageScore: number;
  bestHashtags: HashtagAnalysis[];
  suggestions: string[];
}

/**
 * Service für intelligente Hashtag-Erkennung und -Verarbeitung
 */
export class HashtagDetector {
  
  // Regex für deutsche Hashtag-Erkennung mit Umlauten
  private static readonly HASHTAG_REGEX = /#[a-zA-ZäöüÄÖÜß0-9_]+/g;
  private static readonly MIN_HASHTAG_LENGTH = 2;
  private static readonly MAX_HASHTAG_LENGTH = 50;
  private static readonly OPTIMAL_MIN_LENGTH = 5;
  private static readonly OPTIMAL_MAX_LENGTH = 25;

  /**
   * Extrahiert alle Hashtags aus einem Text
   * @param text - Der zu analysierende Text
   * @returns Array von gefundenen Hashtags (ohne #-Symbol)
   */
  static detectHashtags(text: string): string[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // HTML-Tags und CSS-Werte entfernen, um nur reinen Text zu verarbeiten
    const cleanText = text
      .replace(/<[^>]*>/g, ' ') // HTML-Tags entfernen
      .replace(/style\s*=\s*"[^"]*"/g, ' ') // style-Attribute entfernen
      .replace(/class\s*=\s*"[^"]*"/g, ' ') // class-Attribute entfernen
      .replace(/#[0-9a-fA-F]{3,6}\b/g, ' '); // Hex-Farbcodes entfernen (#005fab, #fff, etc.)

    const matches = cleanText.match(this.HASHTAG_REGEX);
    if (!matches) {
      return [];
    }

    // Hashtags normalisieren (# entfernen, Duplikate filtern, validieren)
    const hashtags = matches
      .map(hashtag => hashtag.substring(1)) // # entfernen
      .filter((hashtag, index, array) => array.indexOf(hashtag) === index) // Duplikate entfernen
      .filter(hashtag => this.isValidHashtag(hashtag)); // Validierung

    return hashtags;
  }

  /**
   * Validiert einen einzelnen Hashtag
   * @param hashtag - Der zu validierende Hashtag (ohne #)
   * @returns true wenn gültig, false andernfalls
   */
  static isValidHashtag(hashtag: string): boolean {
    if (!hashtag || typeof hashtag !== 'string') {
      return false;
    }

    // Längen-Validierung
    if (hashtag.length < this.MIN_HASHTAG_LENGTH || hashtag.length > this.MAX_HASHTAG_LENGTH) {
      return false;
    }

    // Format-Validierung: nur erlaubte Zeichen
    const validFormat = /^[a-zA-ZäöüÄÖÜß0-9_]+$/.test(hashtag);
    if (!validFormat) {
      return false;
    }

    // Nicht nur aus Zahlen oder Unterstrichen bestehen
    if (/^[0-9_]+$/.test(hashtag)) {
      return false;
    }

    // Mindestens ein Buchstabe enthalten
    if (!/[a-zA-ZäöüÄÖÜß]/.test(hashtag)) {
      return false;
    }

    return true;
  }

  /**
   * Extrahiert relevante Hashtags basierend auf gegebenen Keywords
   * @param text - Der zu analysierende Text
   * @param keywords - Array von relevanten Keywords
   * @returns Array von keyword-relevanten Hashtags
   */
  static extractRelevantHashtags(text: string, keywords: string[]): string[] {
    const allHashtags = this.detectHashtags(text);
    
    if (!keywords || keywords.length === 0) {
      return allHashtags;
    }

    // Keywords in Kleinbuchstaben für Vergleich
    const lowerKeywords = keywords.map(kw => kw.toLowerCase());

    const relevantHashtags = allHashtags.filter(hashtag => {
      const lowerHashtag = hashtag.toLowerCase();
      return lowerKeywords.some(keyword => 
        lowerHashtag.includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(lowerHashtag)
      );
    });

    return relevantHashtags;
  }

  /**
   * Bewertet die Qualität von Hashtags basierend auf verschiedenen Kriterien
   * @param hashtags - Array von Hashtags (ohne #)
   * @param keywords - Relevante Keywords für Bewertung
   * @returns Qualitätsbewertung mit Score und Details
   */
  static assessHashtagQuality(hashtags: string[], keywords: string[] = []): HashtagQualityResult {
    if (!hashtags || hashtags.length === 0) {
      return {
        totalScore: 0,
        averageScore: 0,
        bestHashtags: [],
        suggestions: this.generateGenericSuggestions()
      };
    }

    const analyses: HashtagAnalysis[] = hashtags.map(hashtag => 
      this.analyzeHashtag(hashtag, keywords)
    );

    // Sortierung nach Score
    analyses.sort((a, b) => b.score - a.score);

    const totalScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0);
    const averageScore = totalScore / analyses.length;

    // Beste Hashtags (Score > Durchschnitt)
    const bestHashtags = analyses.filter(analysis => analysis.score >= averageScore);

    return {
      totalScore: Math.round(totalScore),
      averageScore: Math.round(averageScore * 100) / 100,
      bestHashtags: bestHashtags.slice(0, 10), // Top 10
      suggestions: this.generateSuggestedHashtags('', this.detectIndustryFromKeywords(keywords))
    };
  }

  /**
   * Analysiert einen einzelnen Hashtag und bewertet dessen Qualität
   * @param hashtag - Der zu analysierende Hashtag
   * @param keywords - Relevante Keywords
   * @returns Detaillierte Analyse des Hashtags
   */
  private static analyzeHashtag(hashtag: string, keywords: string[]): HashtagAnalysis {
    let score = 0;
    const reasons: string[] = [];
    const lowerHashtag = hashtag.toLowerCase();
    const lowerKeywords = keywords.map(kw => kw.toLowerCase());

    // Längen-Bewertung
    if (hashtag.length >= this.OPTIMAL_MIN_LENGTH && hashtag.length <= this.OPTIMAL_MAX_LENGTH) {
      score += 10;
      reasons.push('Optimale Länge');
    } else if (hashtag.length < this.OPTIMAL_MIN_LENGTH) {
      score -= 3;
      reasons.push('Etwas kurz');
    } else {
      score -= 5;
      reasons.push('Zu lang');
    }

    // Keyword-Relevanz
    const isKeywordRelevant = lowerKeywords.some(keyword => 
      lowerHashtag.includes(keyword) || keyword.includes(lowerHashtag)
    );
    if (isKeywordRelevant) {
      score += 15;
      reasons.push('Keyword-relevant');
    }

    // Branchen-Relevanz
    const isIndustryRelevant = this.isIndustryRelevant(hashtag);
    if (isIndustryRelevant) {
      score += 10;
      reasons.push('Branchenrelevant');
    }

    // Deutsche Zeichen (bevorzugt)
    const hasGermanChars = /[äöüÄÖÜß]/.test(hashtag);
    if (hasGermanChars) {
      score += 5;
      reasons.push('Deutsche Zeichen');
    }

    // CamelCase-Erkennung (bessere Lesbarkeit)
    if (this.hasCamelCase(hashtag)) {
      score += 5;
      reasons.push('Gute Lesbarkeit (CamelCase)');
    }

    // Generische Hashtags abwerten
    if (this.isGenericHashtag(hashtag)) {
      score -= 5;
      reasons.push('Zu generisch');
    }

    // PR-Relevanz
    if (this.isPRRelevant(hashtag)) {
      score += 8;
      reasons.push('PR-relevant');
    }

    // Mindest-Score: 0
    score = Math.max(0, score);

    return {
      hashtag: `#${hashtag}`,
      score,
      reasons,
      isKeywordRelevant,
      isIndustryRelevant,
      length: hashtag.length,
      hasGermanChars
    };
  }

  /**
   * Generiert Hashtag-Vorschläge basierend auf Content und Branche
   * @param content - Der PR-Content
   * @param industry - Die Branche (optional)
   * @returns Array von vorgeschlagenen Hashtags
   */
  static generateSuggestedHashtags(content: string, industry?: string): string[] {
    const suggestions: Set<string> = new Set();

    // Branchenspezifische Hashtags hinzufügen
    if (industry && INDUSTRY_HASHTAGS[industry.toLowerCase()]) {
      INDUSTRY_HASHTAGS[industry.toLowerCase()].forEach(tag => suggestions.add(tag));
    }

    // Allgemeine PR-Hashtags hinzufügen
    GENERAL_PR_HASHTAGS.slice(0, 5).forEach(tag => suggestions.add(tag));

    // Content-basierte Hashtags generieren
    if (content) {
      const contentKeywords = this.extractKeywordsFromContent(content);
      contentKeywords.forEach(keyword => {
        if (keyword.length >= 3) {
          suggestions.add(`#${this.toCamelCase(keyword)}`);
        }
      });
    }

    // Automatisch erkannte Branche
    const detectedIndustry = this.detectIndustryFromContent(content);
    if (detectedIndustry && INDUSTRY_HASHTAGS[detectedIndustry]) {
      INDUSTRY_HASHTAGS[detectedIndustry].slice(0, 3).forEach(tag => suggestions.add(tag));
    }

    return Array.from(suggestions).slice(0, 15); // Top 15 Vorschläge
  }

  /**
   * Erkennt die Branche aus Keywords
   */
  private static detectIndustryFromKeywords(keywords: string[]): string {
    if (!keywords || keywords.length === 0) return '';

    const lowerKeywords = keywords.map(kw => kw.toLowerCase());
    
    for (const [industry, hashtags] of Object.entries(INDUSTRY_HASHTAGS)) {
      const industryMatches = hashtags.some(hashtag => 
        lowerKeywords.some(keyword => 
          hashtag.toLowerCase().includes(keyword) || keyword.includes(hashtag.toLowerCase().replace('#', ''))
        )
      );
      if (industryMatches) {
        return industry;
      }
    }

    return '';
  }

  /**
   * Erkennt die Branche aus dem Content
   */
  private static detectIndustryFromContent(content: string): string {
    if (!content) return '';

    const lowerContent = content.toLowerCase();
    
    // Branche basierend auf Schlüsselwörtern im Content erkennen
    const industryKeywords: Record<string, string[]> = {
      'technologie': ['software', 'digital', 'ki', 'tech', 'innovation', 'app', 'plattform', 'it'],
      'finanz': ['bank', 'finanz', 'geld', 'investment', 'kredit', 'versicherung', 'börse'],
      'gesundheit': ['gesundheit', 'medizin', 'pharma', 'arzt', 'patient', 'therapie', 'wellness'],
      'automobil': ['auto', 'fahrzeug', 'mobility', 'transport', 'elektro', 'hybrid'],
      'energie': ['energie', 'solar', 'wind', 'umwelt', 'nachhaltig', 'green', 'klima'],
      'einzelhandel': ['handel', 'shop', 'verkauf', 'kunde', 'retail', 'e-commerce'],
      'immobilien': ['immobilie', 'wohnen', 'bau', 'miete', 'haus', 'gebäude']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return industry;
      }
    }

    return '';
  }

  /**
   * Extrahiert Keywords aus Content
   */
  private static extractKeywordsFromContent(content: string): string[] {
    if (!content) return [];

    // Einfache Keyword-Extraktion (Wörter > 4 Zeichen, häufig verwendet)
    const words = content
      .toLowerCase()
      .replace(/[^\wäöüß\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && word.length < 20);

    // Worthäufigkeit zählen
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Top Keywords (mindestens 2x verwendet oder wichtige Einzelwörter)
    return Object.entries(wordCount)
      .filter(([_, count]) => count >= 2 || this.isImportantWord(words[0]))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);
  }

  /**
   * Prüft ob ein Wort wichtig ist (auch bei einmaliger Verwendung)
   */
  private static isImportantWord(word: string): boolean {
    const importantWords = [
      'innovation', 'technologie', 'digital', 'nachhaltig', 'zukunft',
      'entwicklung', 'lösung', 'service', 'produkt', 'unternehmen'
    ];
    return importantWords.includes(word.toLowerCase());
  }

  /**
   * Prüft ob Hashtag branchenrelevant ist
   */
  private static isIndustryRelevant(hashtag: string): boolean {
    const lowerHashtag = hashtag.toLowerCase();
    return Object.values(INDUSTRY_HASHTAGS)
      .flat()
      .some(industryTag => industryTag.toLowerCase().replace('#', '') === lowerHashtag);
  }

  /**
   * Prüft ob Hashtag CamelCase verwendet
   */
  private static hasCamelCase(hashtag: string): boolean {
    return /[a-z][A-Z]/.test(hashtag);
  }

  /**
   * Prüft ob Hashtag zu generisch ist
   */
  private static isGenericHashtag(hashtag: string): boolean {
    const genericTags = ['news', 'info', 'update', 'neu', 'gut', 'toll', 'super'];
    return genericTags.includes(hashtag.toLowerCase());
  }

  /**
   * Prüft ob Hashtag PR-relevant ist
   */
  private static isPRRelevant(hashtag: string): boolean {
    const lowerHashtag = hashtag.toLowerCase();
    return GENERAL_PR_HASHTAGS
      .some(prTag => prTag.toLowerCase().replace('#', '') === lowerHashtag);
  }

  /**
   * Konvertiert String zu CamelCase
   */
  private static toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-zA-ZäöüÄÖÜß0-9\s]/g, '')
      .split(' ')
      .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Generiert generische Hashtag-Vorschläge
   */
  private static generateGenericSuggestions(): string[] {
    return [
      '#PressRelease',
      '#News',
      '#Business',
      '#Innovation',
      '#NewProduct',
      '#Corporate',
      '#Announcement',
      '#B2B',
      '#Update',
      '#Launch'
    ];
  }

  /**
   * Kombiniert Keywords zu potentiellen Hashtags
   * @param keywords - Array von Keywords
   * @returns Array von kombinierten Hashtag-Vorschlägen
   */
  static combineKeywordsToHashtags(keywords: string[]): string[] {
    if (!keywords || keywords.length < 2) {
      return [];
    }

    const combinations: string[] = [];
    
    // Zwei-Wort-Kombinationen
    for (let i = 0; i < keywords.length - 1; i++) {
      for (let j = i + 1; j < keywords.length; j++) {
        const combined = this.toCamelCase(`${keywords[i]} ${keywords[j]}`);
        if (combined.length <= this.MAX_HASHTAG_LENGTH) {
          combinations.push(`#${combined}`);
        }
      }
    }

    return combinations.slice(0, 10); // Top 10 Kombinationen
  }

  /**
   * Analysiert Hashtag-Performance und gibt Optimierungsvorschläge
   * @param hashtags - Bestehende Hashtags
   * @param keywords - Relevante Keywords
   * @returns Optimierungsvorschläge
   */
  static getOptimizationSuggestions(hashtags: string[], keywords: string[]): {
    toRemove: string[];
    toAdd: string[];
    toImprove: Array<{current: string, suggested: string, reason: string}>;
  } {
    const analysis = this.assessHashtagQuality(hashtags, keywords);
    
    // Schwache Hashtags zum Entfernen
    const toRemove = analysis.bestHashtags
      .filter(h => h.score < 10)
      .map(h => h.hashtag);

    // Neue Hashtags vorschlagen
    const existing = hashtags.map(h => h.toLowerCase());
    const toAdd = this.generateSuggestedHashtags('', '')
      .filter(suggestion => !existing.includes(suggestion.toLowerCase()))
      .slice(0, 5);

    // Verbesserungsvorschläge
    const toImprove: Array<{current: string, suggested: string, reason: string}> = [];
    
    hashtags.forEach(hashtag => {
      const withoutHash = hashtag.replace('#', '');
      
      // CamelCase-Verbesserung
      if (!this.hasCamelCase(withoutHash) && withoutHash.includes(' ')) {
        toImprove.push({
          current: hashtag,
          suggested: `#${this.toCamelCase(withoutHash)}`,
          reason: 'Bessere Lesbarkeit durch CamelCase'
        });
      }
      
      // Längen-Optimierung
      if (withoutHash.length > this.OPTIMAL_MAX_LENGTH) {
        const shortened = withoutHash.substring(0, this.OPTIMAL_MAX_LENGTH);
        toImprove.push({
          current: hashtag,
          suggested: `#${shortened}`,
          reason: 'Länge optimieren'
        });
      }
    });

    return { toRemove, toAdd, toImprove: toImprove.slice(0, 5) };
  }
}

export default HashtagDetector;