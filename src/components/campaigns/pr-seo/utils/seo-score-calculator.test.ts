// src/components/campaigns/pr-seo/utils/seo-score-calculator.test.ts

import { SEOScoreCalculator } from './seo-score-calculator';
import type { PRMetrics, KeywordMetrics, KeywordScoreData } from '../types';

// Mock HashtagDetector
jest.mock('@/lib/hashtag-detector', () => ({
  HashtagDetector: {
    detectHashtags: jest.fn((text: string) => {
      const matches = text.match(/#\w+/g) || [];
      return matches.map(tag => tag.substring(1));
    }),
    assessHashtagQuality: jest.fn((hashtags: string[], keywords: string[]) => ({
      averageScore: 75,
      breakdown: {}
    }))
  }
}));

// Mock seoKeywordService
jest.mock('@/lib/ai/seo-keyword-service', () => ({
  seoKeywordService: {
    calculateKeywordScore: jest.fn(() => ({
      baseScore: 40,
      aiBonus: 20,
      totalScore: 60,
      hasAIAnalysis: true,
      breakdown: {
        keywordPosition: 15,
        keywordDistribution: 10,
        keywordVariations: 5,
        naturalFlow: 5,
        contextRelevance: 5,
        aiRelevanceBonus: 20,
        fallbackBonus: 0
      }
    }))
  }
}));

describe('SEOScoreCalculator', () => {
  const basePRMetrics: PRMetrics = {
    headlineLength: 60,
    headlineHasKeywords: true,
    headlineHasActiveVerb: true,
    leadLength: 150,
    leadHasNumbers: true,
    leadKeywordMentions: 2,
    quoteCount: 1,
    avgQuoteLength: 100,
    hasActionVerbs: true,
    hasLearnMore: true,
    avgParagraphLength: 200,
    hasBulletPoints: true,
    hasSubheadings: true,
    numberCount: 5,
    hasSpecificDates: true,
    hasCompanyNames: true
  };

  const baseKeywordMetrics: KeywordMetrics[] = [
    {
      keyword: 'Innovation',
      density: 1.5,
      occurrences: 3,
      inHeadline: true,
      inFirstParagraph: true,
      distribution: 'gut',
      semanticRelevance: 85,
      contextQuality: 80,
      targetAudience: 'B2B',
      tonality: 'Sachlich'
    }
  ];

  describe('calculatePRScore', () => {
    it('should return zero score when no keywords', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        [],
        'Test text',
        'Title',
        []
      );

      expect(result.totalScore).toBe(0);
    });

    it('should calculate total score correctly with all good metrics', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text with good metrics',
        'Title',
        ['Innovation']
      );

      expect(result.totalScore).toBeGreaterThan(50);
      expect(result.breakdown).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should return breakdown with all categories', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      expect(result.breakdown.headline).toBeDefined();
      expect(result.breakdown.keywords).toBeDefined();
      expect(result.breakdown.structure).toBeDefined();
      expect(result.breakdown.relevance).toBeDefined();
      expect(result.breakdown.concreteness).toBeDefined();
      expect(result.breakdown.engagement).toBeDefined();
      expect(result.breakdown.social).toBeDefined();
    });

    it('should calculate headline score correctly', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Good Title with Innovation',
        ['Innovation']
      );

      expect(result.breakdown.headline).toBeGreaterThan(60);
    });

    it('should penalize too short headline', () => {
      const shortHeadlinePRMetrics = { ...basePRMetrics, headlineLength: 15 };
      const result = SEOScoreCalculator.calculatePRScore(
        shortHeadlinePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Short',
        ['Innovation']
      );

      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('zu kurz')])
      );
    });

    it('should penalize too long headline', () => {
      const longHeadlinePRMetrics = { ...basePRMetrics, headlineLength: 120 };
      const result = SEOScoreCalculator.calculatePRScore(
        longHeadlinePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Very Long Headline with lots of words that makes it too long for optimal SEO',
        ['Innovation']
      );

      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('zu lang')])
      );
    });

    it('should recommend adding keywords to headline', () => {
      const noKeywordsPRMetrics = { ...basePRMetrics, headlineHasKeywords: false };
      const result = SEOScoreCalculator.calculatePRScore(
        noKeywordsPRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title without keywords',
        ['Innovation']
      );

      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('Keywords in Headline')])
      );
    });

    it('should penalize keyword stuffing in headline', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Innovation Innovation Innovation',
        ['Innovation']
      );

      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('Keyword-Stuffing')])
      );
    });

    it('should calculate keyword score using keywordScoreData', () => {
      const keywordScoreData: KeywordScoreData = {
        baseScore: 50,
        aiBonus: 30,
        totalScore: 80,
        hasAIAnalysis: true,
        breakdown: {
          keywordPosition: 15,
          keywordDistribution: 15,
          keywordVariations: 10,
          naturalFlow: 5,
          contextRelevance: 5,
          aiRelevanceBonus: 30,
          fallbackBonus: 0
        }
      };

      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title',
        ['Innovation'],
        keywordScoreData
      );

      expect(result.breakdown.keywords).toBe(80);
    });

    it('should generate keyword-specific recommendations', () => {
      const lowDensityMetrics: KeywordMetrics[] = [{
        keyword: 'Innovation',
        density: 0.1,
        occurrences: 0,
        inHeadline: false,
        inFirstParagraph: false,
        distribution: 'schlecht'
      }];

      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        lowDensityMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      const hasInnovationRecommendation = result.recommendations.some(rec => rec.includes('Innovation'));
      expect(hasInnovationRecommendation).toBe(true);
    });

    it('should calculate structure score based on thresholds', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      expect(result.breakdown.structure).toBeGreaterThan(0);
    });

    it('should recommend shortening paragraphs if too long', () => {
      // B2B max is 500, tolerance is 1.3x = 650, so use 700 to be clearly too long
      const longParagraphMetrics = { ...basePRMetrics, avgParagraphLength: 700 };
      const result = SEOScoreCalculator.calculatePRScore(
        longParagraphMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      // Überprüfe ob "kürzen" oder "Absatz" in den Empfehlungen vorkommt
      const hasAbsatzRecommendation = result.recommendations.some(rec =>
        rec.toLowerCase().includes('absätz') || rec.toLowerCase().includes('kürzen')
      );
      expect(hasAbsatzRecommendation).toBe(true);
    });

    it('should calculate relevance score from semantic metrics', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      expect(result.breakdown.relevance).toBeGreaterThan(0);
    });

    it('should calculate concreteness score from numbers and dates', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      expect(result.breakdown.concreteness).toBeGreaterThan(0);
    });

    it('should recommend adding concrete data', () => {
      const vaguePRMetrics: PRMetrics = {
        ...basePRMetrics,
        numberCount: 0,
        hasSpecificDates: false,
        hasCompanyNames: false
      };

      const result = SEOScoreCalculator.calculatePRScore(
        vaguePRMetrics,
        baseKeywordMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      const hasZahlenRecommendation = result.recommendations.some(rec => rec.includes('Zahlen, Daten'));
      expect(hasZahlenRecommendation).toBe(true);
    });

    it('should calculate engagement score from quotes and CTA', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        '<p>Test text</p><blockquote data-type="pr-quote">Quote</blockquote>',
        'Title',
        ['Innovation']
      );

      expect(result.breakdown.engagement).toBeGreaterThan(0);
    });

    it('should recommend adding quotes', () => {
      const noQuotesPRMetrics = { ...basePRMetrics, quoteCount: 0 };
      const result = SEOScoreCalculator.calculatePRScore(
        noQuotesPRMetrics,
        baseKeywordMetrics,
        'Test text without quotes',
        'Title',
        ['Innovation']
      );

      const hasZitatRecommendation = result.recommendations.some(rec => rec.includes('Zitat'));
      expect(hasZitatRecommendation).toBe(true);
    });

    it('should recommend adding CTA', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text without CTA',
        'Title',
        ['Innovation']
      );

      const hasCTARecommendation = result.recommendations.some(rec => rec.includes('Call-to-Action'));
      expect(hasCTARecommendation).toBe(true);
    });

    it('should calculate social score based on title length and hashtags', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text #Innovation #Tech',
        'Title',
        ['Innovation']
      );

      expect(result.breakdown.social).toBeGreaterThan(0);
    });

    it('should recommend hashtags for social media', () => {
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        'Test text without hashtags',
        'Title',
        ['Innovation']
      );

      const hasHashtagRecommendation = result.recommendations.some(rec => rec.includes('Hashtags'));
      expect(hasHashtagRecommendation).toBe(true);
    });

    it('should handle PR type modifiers', () => {
      const productText = 'Neues Produkt auf dem Markt';
      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        baseKeywordMetrics,
        productText,
        'Produktlaunch',
        ['Innovation']
      );

      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should handle B2B audience thresholds', () => {
      const b2bMetrics: KeywordMetrics[] = [{
        ...baseKeywordMetrics[0],
        targetAudience: 'B2B'
      }];

      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        b2bMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should handle B2C audience thresholds', () => {
      const b2cMetrics: KeywordMetrics[] = [{
        ...baseKeywordMetrics[0],
        targetAudience: 'B2C'
      }];

      const result = SEOScoreCalculator.calculatePRScore(
        { ...basePRMetrics, avgParagraphLength: 100 },
        b2cMetrics,
        'Test text',
        'Title',
        ['Innovation']
      );

      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should recommend KI analysis update', () => {
      const noAIMetrics: KeywordMetrics[] = [{
        keyword: 'Innovation',
        density: 1.5,
        occurrences: 3,
        inHeadline: true,
        inFirstParagraph: true,
        distribution: 'gut'
      }];

      const keywordScoreData: KeywordScoreData = {
        baseScore: 50,
        aiBonus: 10,
        totalScore: 60,
        hasAIAnalysis: false,
        breakdown: {
          keywordPosition: 15,
          keywordDistribution: 15,
          keywordVariations: 10,
          naturalFlow: 5,
          contextRelevance: 5,
          aiRelevanceBonus: 0,
          fallbackBonus: 10
        }
      };

      const result = SEOScoreCalculator.calculatePRScore(
        basePRMetrics,
        noAIMetrics,
        'Test text',
        'Title',
        ['Innovation'],
        keywordScoreData
      );

      const hasKIRecommendation = result.recommendations.some(rec => rec.includes('KI-Analyse'));
      expect(hasKIRecommendation).toBe(true);
    });
  });
});
