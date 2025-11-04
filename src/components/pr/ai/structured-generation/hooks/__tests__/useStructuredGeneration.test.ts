// src/components/pr/ai/structured-generation/hooks/__tests__/useStructuredGeneration.test.ts
/**
 * Tests für useStructuredGeneration Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useStructuredGeneration } from '../useStructuredGeneration';
import { apiClient } from '@/lib/api/api-client';
import * as validation from '../../utils/validation';

// Mock apiClient
jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    post: jest.fn()
  }
}));

// Mock validation
jest.mock('../../utils/validation');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockValidation = validation as jest.Mocked<typeof validation>;

describe('useStructuredGeneration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('sollte initialen State korrekt setzen', () => {
      const { result } = renderHook(() => useStructuredGeneration());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(typeof result.current.generate).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Standard-Modus', () => {
    it('sollte erfolgreiche Generierung durchführen', async () => {
      const mockResponse = {
        success: true,
        structured: {
          headline: 'Test Headline',
          leadParagraph: 'Lead text',
          bodyParagraphs: ['Body 1', 'Body 2'],
          quote: null,
          cta: 'Call to action',
          boilerplate: null,
          hashtags: [],
          socialOptimized: false
        },
        headline: 'Test Headline',
        htmlContent: '<p>HTML content</p>',
        aiProvider: 'gemini',
        timestamp: '2025-01-01T00:00:00.000Z'
      };

      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStructuredGeneration());

      let response: any;

      await act(async () => {
        response = await result.current.generate({
          mode: 'standard',
          prompt: 'Test prompt',
          context: { tone: 'modern', audience: 'b2b' },
          selectedDocuments: []
        });
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.result).toEqual(mockResponse);
      expect(result.current.error).toBeNull();
      expect(response).toEqual(mockResponse);
    });

    it('sollte Request-Body korrekt für Standard-Modus bauen', async () => {
      const mockResponse = {
        success: true,
        structured: { headline: 'Test', leadParagraph: 'Lead', bodyParagraphs: [], quote: null, cta: null, boilerplate: null, hashtags: [], socialOptimized: false },
        headline: 'Test',
        htmlContent: '<p>Test</p>'
      };

      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStructuredGeneration());

      await act(async () => {
        await result.current.generate({
          mode: 'standard',
          prompt: '  Test prompt  ',
          context: {
            industry: 'Tech',
            tone: 'modern',
            audience: 'b2b',
            companyName: 'Test GmbH'
          },
          selectedDocuments: []
        });
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/ai/generate-structured', {
        prompt: 'Test prompt',
        context: {
          industry: 'Tech',
          tone: 'modern',
          audience: 'b2b',
          companyName: 'Test GmbH'
        }
      });
    });
  });

  describe('Expert-Modus', () => {
    it('sollte erfolgreiche Generierung im Expert-Modus durchführen', async () => {
      const mockResponse = {
        success: true,
        structured: { headline: 'Expert', leadParagraph: 'Lead', bodyParagraphs: [], quote: null, cta: null, boilerplate: null, hashtags: [], socialOptimized: false },
        headline: 'Expert',
        htmlContent: '<p>Expert</p>'
      };

      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStructuredGeneration());

      const mockDocuments = [
        {
          id: 'doc1',
          fileName: 'test.celero-doc',
          plainText: 'Test content',
          excerpt: 'Test content',
          wordCount: 100,
          createdAt: new Date()
        }
      ];

      await act(async () => {
        await result.current.generate({
          mode: 'expert',
          prompt: 'Custom instructions',
          context: {},
          selectedDocuments: mockDocuments
        });
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/ai/generate-structured', {
        prompt: 'Custom instructions',
        documentContext: {
          documents: mockDocuments
        }
      });
    });

    it('sollte Default-Prompt verwenden wenn Prompt leer ist im Expert-Modus', async () => {
      const mockResponse = {
        success: true,
        structured: { headline: 'Expert', leadParagraph: 'Lead', bodyParagraphs: [], quote: null, cta: null, boilerplate: null, hashtags: [], socialOptimized: false },
        headline: 'Expert',
        htmlContent: '<p>Expert</p>'
      };

      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStructuredGeneration());

      const mockDocuments = [
        {
          id: 'doc1',
          fileName: 'test.celero-doc',
          plainText: 'Test',
          excerpt: 'Test',
          wordCount: 100,
          createdAt: new Date()
        }
      ];

      await act(async () => {
        await result.current.generate({
          mode: 'expert',
          prompt: '   ',
          context: {},
          selectedDocuments: mockDocuments
        });
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/ai/generate-structured', {
        prompt: 'Erstelle eine professionelle Pressemitteilung basierend auf den bereitgestellten Strategiedokumenten.',
        documentContext: {
          documents: mockDocuments
        }
      });
    });
  });

  describe('Validierung', () => {
    it('sollte Fehler setzen wenn Validierung fehlschlägt', async () => {
      mockValidation.validateInput.mockReturnValue({
        isValid: false,
        error: 'Validierungsfehler'
      });

      const { result } = renderHook(() => useStructuredGeneration());

      let response: any;

      await act(async () => {
        response = await result.current.generate({
          mode: 'standard',
          prompt: '',
          context: {},
          selectedDocuments: []
        });
      });

      expect(result.current.error).toBe('Validierungsfehler');
      expect(result.current.result).toBeNull();
      expect(response).toBeNull();
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('sollte Generic-Fehler setzen wenn Validierung ohne Error-Message fehlschlägt', async () => {
      mockValidation.validateInput.mockReturnValue({
        isValid: false
      });

      const { result } = renderHook(() => useStructuredGeneration());

      await act(async () => {
        await result.current.generate({
          mode: 'standard',
          prompt: '',
          context: {},
          selectedDocuments: []
        });
      });

      expect(result.current.error).toBe('Validierung fehlgeschlagen');
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte Fehler behandeln wenn API-Call fehlschlägt', async () => {
      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useStructuredGeneration());

      await act(async () => {
        await result.current.generate({
          mode: 'standard',
          prompt: 'Test',
          context: { tone: 'modern', audience: 'b2b' },
          selectedDocuments: []
        });
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.result).toBeNull();
    });

    it('sollte generische Fehlermeldung anzeigen wenn Error-Objekt keine Message hat', async () => {
      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockRejectedValue({});

      const { result } = renderHook(() => useStructuredGeneration());

      await act(async () => {
        await result.current.generate({
          mode: 'standard',
          prompt: 'Test',
          context: { tone: 'modern', audience: 'b2b' },
          selectedDocuments: []
        });
      });

      expect(result.current.error).toBe('Generierung fehlgeschlagen');
    });

    it('sollte Fehler setzen wenn Response unvollständig ist (kein success)', async () => {
      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockResolvedValue({});

      const { result } = renderHook(() => useStructuredGeneration());

      await act(async () => {
        await result.current.generate({
          mode: 'standard',
          prompt: 'Test',
          context: { tone: 'modern', audience: 'b2b' },
          selectedDocuments: []
        });
      });

      expect(result.current.error).toBe('Unvollständige Antwort vom Server');
      expect(result.current.result).toBeNull();
    });

    it('sollte Fehler setzen wenn Response unvollständig ist (kein structured)', async () => {
      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockResolvedValue({
        success: true
      });

      const { result } = renderHook(() => useStructuredGeneration());

      await act(async () => {
        await result.current.generate({
          mode: 'standard',
          prompt: 'Test',
          context: { tone: 'modern', audience: 'b2b' },
          selectedDocuments: []
        });
      });

      expect(result.current.error).toBe('Unvollständige Antwort vom Server');
    });
  });

  describe('Loading-State', () => {
    it('sollte isGenerating während API-Call auf true setzen', async () => {
      mockValidation.validateInput.mockReturnValue({ isValid: true });

      let resolvePromise: any;
      mockApiClient.post.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useStructuredGeneration());

      act(() => {
        result.current.generate({
          mode: 'standard',
          prompt: 'Test',
          context: { tone: 'modern', audience: 'b2b' },
          selectedDocuments: []
        });
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      act(() => {
        resolvePromise({
          success: true,
          structured: { headline: 'Test', leadParagraph: 'Lead', bodyParagraphs: [], quote: null, cta: null, boilerplate: null, hashtags: [], socialOptimized: false },
          headline: 'Test',
          htmlContent: '<p>Test</p>'
        });
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe('reset()', () => {
    it('sollte State komplett zurücksetzen', async () => {
      const mockResponse = {
        success: true,
        structured: { headline: 'Test', leadParagraph: 'Lead', bodyParagraphs: [], quote: null, cta: null, boilerplate: null, hashtags: [], socialOptimized: false },
        headline: 'Test',
        htmlContent: '<p>Test</p>'
      };

      mockValidation.validateInput.mockReturnValue({ isValid: true });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useStructuredGeneration());

      await act(async () => {
        await result.current.generate({
          mode: 'standard',
          prompt: 'Test',
          context: { tone: 'modern', audience: 'b2b' },
          selectedDocuments: []
        });
      });

      expect(result.current.result).toEqual(mockResponse);

      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });
  });
});
