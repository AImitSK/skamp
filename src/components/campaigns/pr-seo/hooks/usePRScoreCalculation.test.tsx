// src/components/campaigns/pr-seo/hooks/usePRScoreCalculation.test.tsx

import { renderHook, waitFor } from '@testing-library/react';
import { usePRScoreCalculation } from './usePRScoreCalculation';
import { SEOScoreCalculator } from '../utils/seo-score-calculator';
import { PRMetricsCalculator } from '../utils/pr-metrics-calculator';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import type { KeywordMetrics, PRScoreBreakdown } from '../types';

// Mock dependencies
jest.mock('../utils/seo-score-calculator');
jest.mock('../utils/pr-metrics-calculator');
jest.mock('@/lib/ai/seo-keyword-service');

describe('usePRScoreCalculation', () => {
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

  const mockPRMetrics = {
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

  const mockKeywordScoreData = {
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

  const mockBreakdown: PRScoreBreakdown = {
    headline: 85,
    keywords: 80,
    structure: 75,
    relevance: 70,
    concreteness: 65,
    engagement: 80,
    social: 60
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (PRMetricsCalculator.calculate as jest.Mock).mockReturnValue(mockPRMetrics);
    (seoKeywordService.calculateKeywordScore as jest.Mock).mockReturnValue(mockKeywordScoreData);
    (SEOScoreCalculator.calculatePRScore as jest.Mock).mockReturnValue({
      totalScore: 75,
      breakdown: mockBreakdown,
      recommendations: ['Empfehlung 1', 'Empfehlung 2']
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      usePRScoreCalculation('content', 'title', [], [])
    );

    expect(result.current.prScore).toBeDefined();
    expect(result.current.scoreBreakdown).toBeDefined();
    expect(result.current.recommendations).toBeDefined();
  });

  it('should calculate PR score on mount', async () => {
    renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(SEOScoreCalculator.calculatePRScore).toHaveBeenCalled();
    });
  });

  it('should calculate PR metrics first', async () => {
    renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(PRMetricsCalculator.calculate).toHaveBeenCalledWith('content', 'title', ['Innovation']);
    });
  });

  it('should calculate keyword score data', async () => {
    renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(seoKeywordService.calculateKeywordScore).toHaveBeenCalledWith(
        ['Innovation'],
        'content',
        baseKeywordMetrics
      );
    });
  });

  it('should pass keyword score data to SEO calculator', async () => {
    renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(SEOScoreCalculator.calculatePRScore).toHaveBeenCalledWith(
        mockPRMetrics,
        baseKeywordMetrics,
        'content',
        'title',
        ['Innovation'],
        mockKeywordScoreData
      );
    });
  });

  it('should update prScore state', async () => {
    const { result } = renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(result.current.prScore).toBe(75);
    });
  });

  it('should update scoreBreakdown state', async () => {
    const { result } = renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(result.current.scoreBreakdown).toEqual(mockBreakdown);
    });
  });

  it('should update recommendations state', async () => {
    const { result } = renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(result.current.recommendations).toEqual(['Empfehlung 1', 'Empfehlung 2']);
    });
  });

  it('should update keywordScoreData state', async () => {
    const { result } = renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics)
    );

    await waitFor(() => {
      expect(result.current.keywordScoreData).toEqual(mockKeywordScoreData);
    });
  });

  it('should call onSeoScoreChange callback when provided', async () => {
    const mockCallback = jest.fn();

    renderHook(() =>
      usePRScoreCalculation('content', 'title', ['Innovation'], baseKeywordMetrics, mockCallback)
    );

    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith({
        totalScore: 75,
        breakdown: mockBreakdown,
        hints: ['Empfehlung 1', 'Empfehlung 2'],
        keywordMetrics: baseKeywordMetrics
      });
    });
  });

  it('should recalculate when content changes', async () => {
    const { rerender } = renderHook(
      ({ content }) => usePRScoreCalculation(content, 'title', ['Innovation'], baseKeywordMetrics),
      { initialProps: { content: 'old content' } }
    );

    jest.clearAllMocks();

    rerender({ content: 'new content' });

    await waitFor(() => {
      expect(SEOScoreCalculator.calculatePRScore).toHaveBeenCalled();
    });
  });

  it('should recalculate when documentTitle changes', async () => {
    const { rerender } = renderHook(
      ({ title }) => usePRScoreCalculation('content', title, ['Innovation'], baseKeywordMetrics),
      { initialProps: { title: 'old title' } }
    );

    jest.clearAllMocks();

    rerender({ title: 'new title' });

    await waitFor(() => {
      expect(SEOScoreCalculator.calculatePRScore).toHaveBeenCalled();
    });
  });

  it('should recalculate when keywords change', async () => {
    const { rerender } = renderHook(
      ({ keywords }) => usePRScoreCalculation('content', 'title', keywords, baseKeywordMetrics),
      { initialProps: { keywords: ['Innovation'] } }
    );

    jest.clearAllMocks();

    rerender({ keywords: ['Innovation', 'Tech'] });

    await waitFor(() => {
      expect(SEOScoreCalculator.calculatePRScore).toHaveBeenCalled();
    });
  });

  it('should recalculate when keywordMetrics change', async () => {
    const { rerender } = renderHook(
      ({ metrics }) => usePRScoreCalculation('content', 'title', ['Innovation'], metrics),
      { initialProps: { metrics: baseKeywordMetrics } }
    );

    jest.clearAllMocks();

    const updatedMetrics = [
      { ...baseKeywordMetrics[0], semanticRelevance: 90 }
    ];

    rerender({ metrics: updatedMetrics });

    await waitFor(() => {
      expect(SEOScoreCalculator.calculatePRScore).toHaveBeenCalled();
    });
  });
});
