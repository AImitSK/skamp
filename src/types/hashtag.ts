// src/types/hashtag.ts
/**
 * TypeScript-Definitionen für das Hashtag-System
 * Social-Media-optimierte Pressemitteilungen
 */

/**
 * Basis-Hashtag Interface
 */
export interface Hashtag {
  /** Der Hashtag-Text ohne # */
  text: string;
  /** Vollständiger Hashtag mit # */
  fullText: string;
  /** Position im Text (optional für Analytics) */
  position?: number;
  /** Häufigkeit der Verwendung in der Organisation */
  frequency?: number;
  /** Kategorie des Hashtags (optional) */
  category?: HashtagCategory;
}

/**
 * Kategorien für Hashtag-Organisation
 */
export type HashtagCategory = 
  | 'branding'      // #CeleroPress, #UnternehmenXY
  | 'industry'      // #TechNews, #Marketing
  | 'event'         // #CeBIT2024, #WebSummit
  | 'product'       // #ProductLaunch, #NewFeature
  | 'topic'         // #Nachhaltigkeit, #Innovation
  | 'location'      // #Berlin, #Deutschland
  | 'custom';       // Benutzerdefinierte Kategorie

/**
 * Hashtag-Validierung Optionen
 */
export interface HashtagValidationOptions {
  /** Minimale Länge (Standard: 2) */
  minLength: number;
  /** Maximale Länge (Standard: 50) */
  maxLength: number;
  /** Erlaubte Zeichen Pattern */
  allowedPattern: RegExp;
  /** Deutsche Umlaute erlauben (Standard: true) */
  allowGermanChars: boolean;
  /** Zahlen erlauben (Standard: true) */
  allowNumbers: boolean;
  /** Unterstriche erlauben (Standard: true) */
  allowUnderscores: boolean;
}

/**
 * Hashtag-Vorschlag für Autocomplete
 */
export interface HashtagSuggestion {
  /** Der vorgeschlagene Hashtag */
  hashtag: Hashtag;
  /** Relevanz-Score (0-100) */
  relevance: number;
  /** Grund für den Vorschlag */
  reason: 'frequent' | 'similar' | 'trending' | 'related';
}

/**
 * Hashtag-Statistiken für Analytics
 */
export interface HashtagStats {
  /** Anzahl der Verwendungen */
  usageCount: number;
  /** Letzte Verwendung */
  lastUsed: Date;
  /** Erste Verwendung */
  firstUsed: Date;
  /** Durchschnittliche Engagement-Rate */
  averageEngagement?: number;
  /** In welchen Kampagnen verwendet */
  campaigns: string[];
}

/**
 * Hashtag-Konfiguration für Organization
 */
export interface HashtagConfig {
  /** Organization ID */
  organizationId: string;
  /** Validierungs-Optionen */
  validation: HashtagValidationOptions;
  /** Automatische Vorschläge aktiviert */
  autoSuggestEnabled: boolean;
  /** Maximale Anzahl Hashtags pro Pressemitteilung */
  maxHashtagsPerPress: number;
  /** Gesperrte/Verbotene Hashtags */
  blockedHashtags: string[];
  /** Bevorzugte Hashtags für diese Organisation */
  preferredHashtags: Hashtag[];
}

/**
 * Hashtag-Export für verschiedene Plattformen
 */
export interface HashtagExport {
  /** Ziel-Platform */
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'generic';
  /** Angepasster Hashtag-Text */
  formattedText: string;
  /** Platform-spezifische Beschränkungen beachtet */
  compliant: boolean;
  /** Warnung bei Nicht-Konformität */
  warning?: string;
}

/**
 * Standard Hashtag-Validierungs-Konfiguration
 */
export const DEFAULT_HASHTAG_CONFIG: HashtagValidationOptions = {
  minLength: 2,
  maxLength: 50,
  allowedPattern: /^[a-zA-ZäöüÄÖÜß0-9_]+$/,
  allowGermanChars: true,
  allowNumbers: true,
  allowUnderscores: true
};

/**
 * Hashtag-Utilities Type Guards
 */
export const isValidHashtag = (text: string, options: HashtagValidationOptions = DEFAULT_HASHTAG_CONFIG): boolean => {
  if (!text || text.length < options.minLength || text.length > options.maxLength) {
    return false;
  }
  return options.allowedPattern.test(text);
};

/**
 * Extrahiert alle Hashtags aus einem Text
 */
export const extractHashtags = (text: string): Hashtag[] => {
  const hashtagRegex = /#[a-zA-ZäöüÄÖÜß0-9_]{2,50}/g;
  const matches = text.match(hashtagRegex) || [];
  
  return matches.map((match, index) => ({
    text: match.substring(1), // Ohne #
    fullText: match,
    position: text.indexOf(match)
  }));
};

/**
 * Multi-Tenancy: Hashtag mit Organization-Context
 */
export interface OrganizationHashtag extends Hashtag {
  /** Organization ID für Multi-Tenancy */
  organizationId: string;
  /** Erstellt von User ID */
  createdBy: string;
  /** Erstellungsdatum */
  createdAt: Date;
  /** Statistiken für diese Organization */
  stats: HashtagStats;
}