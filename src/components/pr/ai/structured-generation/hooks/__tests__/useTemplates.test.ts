// src/components/pr/ai/structured-generation/hooks/__tests__/useTemplates.test.ts
/**
 * Tests für useTemplates Hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useTemplates } from '../useTemplates';
import { apiClient } from '@/lib/api/api-client';

// Mock apiClient
jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    get: jest.fn()
  }
}));

// Mock template-categorizer
jest.mock('../../utils/template-categorizer', () => ({
  categorizeTemplate: jest.fn((title: string) => 'corporate'),
  extractDescription: jest.fn((prompt: string) => 'Test description')
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('useTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Erfolgreiche Datenladung', () => {
    it('sollte Templates laden und verarbeiten', async () => {
      const mockTemplates = [
        { title: 'Template 1', prompt: 'Prompt 1' },
        { title: 'Template 2', prompt: 'Prompt 2' }
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        templates: mockTemplates
      });

      const { result } = renderHook(() => useTemplates());

      // Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.templates).toEqual([]);
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify processed templates
      expect(result.current.templates).toHaveLength(2);
      expect(result.current.templates[0]).toEqual({
        id: 'template-0',
        title: 'Template 1',
        category: 'corporate',
        prompt: 'Prompt 1',
        description: 'Test description'
      });
      expect(result.current.error).toBeNull();
    });

    it('sollte apiClient.get mit korrektem Pfad aufrufen', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        templates: []
      });

      renderHook(() => useTemplates());

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/api/ai/templates');
      });
    });

    it('sollte jeden Template mit eindeutiger ID versehen', async () => {
      const mockTemplates = [
        { title: 'T1', prompt: 'P1' },
        { title: 'T2', prompt: 'P2' },
        { title: 'T3', prompt: 'P3' }
      ];

      mockApiClient.get.mockResolvedValue({
        success: true,
        templates: mockTemplates
      });

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.templates[0].id).toBe('template-0');
      expect(result.current.templates[1].id).toBe('template-1');
      expect(result.current.templates[2].id).toBe('template-2');
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte Fehler setzen wenn API-Call fehlschlägt', async () => {
      const errorMessage = 'Network error';
      mockApiClient.get.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.templates).toEqual([]);
    });

    it('sollte Fehler setzen wenn Response-Format ungültig ist', async () => {
      mockApiClient.get.mockResolvedValue({
        success: false
      });

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Invalid response format');
      expect(result.current.templates).toEqual([]);
    });

    it('sollte Fehler setzen wenn templates-Array fehlt', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Invalid response format');
      expect(result.current.templates).toEqual([]);
    });

    it('sollte generischen Fehler anzeigen wenn Error-Objekt keine Message hat', async () => {
      mockApiClient.get.mockRejectedValue({});

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load templates');
      expect(result.current.templates).toEqual([]);
    });
  });

  describe('shouldLoad Parameter', () => {
    it('sollte Templates laden wenn shouldLoad=true (default)', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        templates: []
      });

      renderHook(() => useTemplates(true));

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalled();
      });
    });

    it('sollte Templates laden wenn shouldLoad nicht übergeben wird', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        templates: []
      });

      renderHook(() => useTemplates());

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalled();
      });
    });

    it('sollte NICHT laden wenn shouldLoad=false', async () => {
      const { result } = renderHook(() => useTemplates(false));

      expect(result.current.loading).toBe(false);
      expect(result.current.templates).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('sollte neu laden wenn shouldLoad von false zu true wechselt', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        templates: []
      });

      const { result, rerender } = renderHook(
        ({ shouldLoad }) => useTemplates(shouldLoad),
        { initialProps: { shouldLoad: false } }
      );

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result.current.loading).toBe(false);

      rerender({ shouldLoad: true });

      // Loading wird asynchron gesetzt (useEffect), daher waitFor verwenden
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Leere Template-Liste', () => {
    it('sollte leeres Array zurückgeben wenn keine Templates vorhanden', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        templates: []
      });

      const { result } = renderHook(() => useTemplates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.templates).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });
});
