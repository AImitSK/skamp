// src/components/campaigns/pr-seo/types.ts

/**
 * Keyword-Metriken inkl. KI-Analyse
 */
export interface KeywordMetrics {
  keyword: string;
  density: number;
  occurrences: number;
  inHeadline: boolean;
  inFirstParagraph: boolean;
  distribution: 'gut' | 'mittel' | 'schlecht';
  semanticRelevance?: number;
  contextQuality?: number;
  relatedTerms?: string[];
  targetAudience?: string;  // 'B2B', 'B2C', 'Verbraucher', etc.
  tonality?: string;        // 'Sachlich', 'Emotional', 'Verkäuferisch', etc.
}

/**
 * PR-spezifische Metriken
 */
export interface PRMetrics {
  headlineLength: number;
  headlineHasKeywords: boolean;
  headlineHasActiveVerb: boolean;
  leadLength: number;
  leadHasNumbers: boolean;
  leadKeywordMentions: number;
  quoteCount: number;
  avgQuoteLength: number;
  hasActionVerbs: boolean;
  hasLearnMore: boolean;
  avgParagraphLength: number;
  hasBulletPoints: boolean;
  hasSubheadings: boolean;
  numberCount: number;
  hasSpecificDates: boolean;
  hasCompanyNames: boolean;
}

/**
 * PR-Score-Aufschlüsselung nach Kategorien
 */
export interface PRScoreBreakdown {
  headline: number;
  keywords: number;
  structure: number;
  relevance: number;
  concreteness: number;
  engagement: number;
  social: number;
}

/**
 * Keyword-Score-Daten mit Bonus-System
 */
export interface KeywordScoreData {
  baseScore: number;
  aiBonus: number;
  totalScore: number;
  hasAIAnalysis: boolean;
  breakdown: {
    keywordPosition: number;
    keywordDistribution: number;
    keywordVariations: number;
    naturalFlow: number;
    contextRelevance: number;
    aiRelevanceBonus: number;
    fallbackBonus: number;
  };
}

/**
 * Props für PRSEOHeaderBar Hauptkomponente
 */
export interface PRSEOHeaderBarProps {
  title?: string;
  content: string;
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  documentTitle?: string;
  className?: string;
  onSeoScoreChange?: (scoreData: {
    totalScore: number;
    breakdown: PRScoreBreakdown;
    hints: string[];
    keywordMetrics: KeywordMetrics[];
  }) => void;
  hashtags?: string[];
}

/**
 * Props für KI-Analysis-Box
 */
export interface KIAnalysisBoxProps {
  metrics: KeywordMetrics;
  isLoading: boolean;
}

/**
 * Props für Keyword-Input-Komponente
 */
export interface KeywordInputProps {
  keywords: string[];
  onAddKeyword: (keyword: string) => void;
  maxKeywords?: number;
}

/**
 * Props für Keyword-Metriken-Card
 */
export interface KeywordMetricsCardProps {
  metrics: KeywordMetrics;
  isAnalyzing: boolean;
  onRemove: () => void;
}

/**
 * Props für Score-Breakdown-Grid
 */
export interface ScoreBreakdownGridProps {
  breakdown: PRScoreBreakdown;
}

/**
 * Props für Empfehlungen-Liste
 */
export interface RecommendationsListProps {
  recommendations: string[];
}

/**
 * PR-Typ-Erkennung
 */
export interface PRTypeInfo {
  isProduct: boolean;
  isFinancial: boolean;
  isPersonal: boolean;
  isResearch: boolean;
  isCrisis: boolean;
  isEvent: boolean;
}

/**
 * PR-Typ-spezifische Modifikatoren
 */
export interface PRTypeModifiers {
  headlineModifier: number;
  verbImportance: number;
  recommendationSuffix: string;
  prType: PRTypeInfo;
}

/**
 * Zielgruppen-spezifische Schwellenwerte
 */
export interface AudienceThresholds {
  paragraphLength: { min: number; max: number };
  sentenceComplexity: { max: number };
  technicalTerms: { bonus?: number; penalty?: number; neutral?: number };
}
