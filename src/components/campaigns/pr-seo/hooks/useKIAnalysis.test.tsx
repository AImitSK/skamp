// src/components/campaigns/pr-seo/hooks/useKIAnalysis.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import { useKIAnalysis } from './useKIAnalysis';
import { apiClient } from '@/lib/api/api-client';

// Mock apiClient
jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    post: jest.fn()
  }
}));

describe('useKIAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with isAnalyzing false', () => {
    const { result } = renderHook(() => useKIAnalysis());

    expect(result.current.isAnalyzing).toBe(false);
    expect(result.current.analyzeKeyword).toBeDefined();
  });

  it('should set isAnalyzing to true during analysis', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: 85,
      contextQuality: 80,
      targetAudience: 'B2B',
      tonality: 'Sachlich',
      relatedTerms: ['Tech', 'Innovation']
    });

    const { result } = renderHook(() => useKIAnalysis());

    act(() => {
      result.current.analyzeKeyword('Innovation', 'Test text with innovation');
    });

    expect(result.current.isAnalyzing).toBe(true);

    await waitFor(() => {
      expect(result.current.isAnalyzing).toBe(false);
    });
  });

  it('should return KI metrics on successful analysis', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: 85,
      contextQuality: 80,
      targetAudience: 'B2B',
      tonality: 'Sachlich',
      relatedTerms: ['Tech', 'Innovation', 'Digital']
    });

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics).toEqual({
      semanticRelevance: 85,
      contextQuality: 80,
      targetAudience: 'B2B',
      tonality: 'Sachlich',
      relatedTerms: ['Tech', 'Innovation', 'Digital']
    });
  });

  it('should clamp semanticRelevance to 0-100 range', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: 150,
      contextQuality: 80
    });

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics?.semanticRelevance).toBe(100);
  });

  it('should clamp semanticRelevance negative values to 0', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: -10,
      contextQuality: 80
    });

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics?.semanticRelevance).toBe(0);
  });

  it('should limit relatedTerms to 3 items', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: 85,
      contextQuality: 80,
      relatedTerms: ['Term1', 'Term2', 'Term3', 'Term4', 'Term5']
    });

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics?.relatedTerms).toHaveLength(3);
    expect(metrics?.relatedTerms).toEqual(['Term1', 'Term2', 'Term3']);
  });

  it('should return fallback values on API error', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics).toEqual({
      semanticRelevance: 50,
      contextQuality: 50,
      targetAudience: 'Unbekannt',
      tonality: 'Neutral',
      relatedTerms: []
    });
  });

  it('should return fallback values on unsuccessful response', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: false
    });

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics).toEqual({
      semanticRelevance: 50,
      contextQuality: 50,
      targetAudience: 'Unbekannt',
      tonality: 'Neutral',
      relatedTerms: []
    });
  });

  it('should call API with correct parameters', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: 85,
      contextQuality: 80
    });

    const { result } = renderHook(() => useKIAnalysis());

    await act(async () => {
      await result.current.analyzeKeyword('Innovation', 'Test text content');
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/ai/analyze-keyword-seo', {
      keyword: 'Innovation',
      text: 'Test text content'
    });
  });

  it('should handle empty relatedTerms gracefully', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: 85,
      contextQuality: 80,
      relatedTerms: null
    });

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics?.relatedTerms).toEqual([]);
  });

  it('should handle missing optional fields', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      semanticRelevance: 85
    });

    const { result } = renderHook(() => useKIAnalysis());

    let metrics;
    await act(async () => {
      metrics = await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(metrics?.semanticRelevance).toBe(85);
    expect(metrics?.contextQuality).toBe(50); // Default fallback
    expect(metrics?.targetAudience).toBe('Unbekannt');
    expect(metrics?.tonality).toBe('Neutral');
  });

  it('should set isAnalyzing to false after error', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useKIAnalysis());

    await act(async () => {
      await result.current.analyzeKeyword('Innovation', 'Test text');
    });

    expect(result.current.isAnalyzing).toBe(false);
  });
});
