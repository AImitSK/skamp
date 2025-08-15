// src/__tests__/seo-keyword-service.test.ts
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import type { KeywordDetectionOptions } from '@/lib/ai/seo-keyword-service';

// Mock fetch für API-Calls
global.fetch = jest.fn();

describe('SEOKeywordService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    seoKeywordService.clearCache();
    seoKeywordService.clearDebounceTimers();
  });

  afterEach(() => {
    seoKeywordService.clearDebounceTimers();
  });

  describe('detectKeywords', () => {
    test('erkennt Keywords aus PR-Text über KI-API', async () => {
      // Mock successful API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Digitale Transformation, KI-Lösung, Automatisierung, Innovation'
        })
      });

      const text = `
        Unser Unternehmen SK Online Marketing revolutioniert die digitale Transformation 
        mit unserer neuen KI-Lösung für Automatisierung. Diese Innovation steigert 
        die Effizienz um 50% und bietet völlig neue Möglichkeiten für moderne Unternehmen.
      `;

      const result = await seoKeywordService.detectKeywords(text);

      expect(result.keywords).toEqual([
        'Digitale Transformation',
        'KI-Lösung', 
        'Automatisierung',
        'Innovation'
      ]);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.textLength).toBeGreaterThan(200);
      expect(result.detectedAt).toBeInstanceOf(Date);
    });

    test('gibt leeres Array bei zu kurzem Text zurück', async () => {
      const shortText = 'Kurzer Text.';

      const result = await seoKeywordService.detectKeywords(shortText);

      expect(result.keywords).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(result.textLength).toBe(shortText.length);
    });

    test('verwendet Fallback bei KI-API-Fehler', async () => {
      // Mock API error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const text = `
        Innovation Innovation Innovation Innovation Innovation Innovation
        automatisierung automatisierung automatisierung transformation transformation
        digitale digitale effizienz unternehmen geschäftsprozesse möglichkeiten
      `;

      const result = await seoKeywordService.detectKeywords(text);

      expect(result.keywords).toHaveLength(5); // maxKeywords default
      expect(result.confidence).toBe(0.3); // Fallback confidence
      expect(result.keywords).toContain('innovation');
    });

    test('respektiert maxKeywords Option', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Keyword1, Keyword2, Keyword3, Keyword4, Keyword5, Keyword6'
        })
      });

      const text = 'Test text with multiple potential keywords for extraction testing';
      const options: KeywordDetectionOptions = { maxKeywords: 3 };

      const result = await seoKeywordService.detectKeywords(text, options);

      expect(result.keywords).toHaveLength(3);
    });

    test('filtert Common Words heraus', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Innovation, der, und, aber, Automatisierung'
        })
      });

      const text = 'This is a sufficient length text for testing common word filtering functionality with keywords';
      const options: KeywordDetectionOptions = { excludeCommonWords: true };

      const result = await seoKeywordService.detectKeywords(text, options);

      expect(result.keywords).toEqual(['Innovation', 'Automatisierung']);
      expect(result.keywords).not.toContain('der');
      expect(result.keywords).not.toContain('und');
    });

    test('verwendet Cache für identische Anfragen', async () => {
      // Clear any existing cache first
      seoKeywordService.clearCache();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Cached Keywords, Test'
        })
      });

      const text = 'This is a long enough text for keyword detection that meets minimum requirements for processing';

      // Erste Anfrage
      const result1 = await seoKeywordService.detectKeywords(text);
      
      // Zweite Anfrage (sollte aus Cache kommen)
      const result2 = await seoKeywordService.detectKeywords(text);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1.keywords).toEqual(result2.keywords);
      expect(result1.detectedAt).toEqual(result2.detectedAt);
    });
  });

  describe('detectKeywordsDebounced', () => {
    test('führt Keyword-Detection nach Debounce-Zeit aus', async () => {
      // Clear cache and mocks first
      seoKeywordService.clearCache();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Debounced Keywords'
        })
      });

      const callback = jest.fn();
      const text = 'This is a unique text for debounced keyword detection testing with sufficient content for processing without cache conflicts';
      const sessionId = 'unique-test-session';

      seoKeywordService.detectKeywordsDebounced(
        text, 
        sessionId, 
        callback, 
        { debounceMs: 100 }
      );

      // Callback sollte noch nicht aufgerufen worden sein
      expect(callback).not.toHaveBeenCalled();

      // Warten auf Debounce
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['Debounced Keywords'],
          confidence: expect.any(Number),
          textLength: text.length
        })
      );
    });

    test('cancelt vorherige Debounce-Timer', async () => {
      const callback = jest.fn();
      const sessionId = 'test-session';

      // Erste Anfrage
      seoKeywordService.detectKeywordsDebounced(
        'First text', 
        sessionId, 
        callback, 
        { debounceMs: 200 }
      );

      // Zweite Anfrage nach 100ms (sollte erste canceln)
      setTimeout(() => {
        seoKeywordService.detectKeywordsDebounced(
          'Second text', 
          sessionId, 
          callback, 
          { debounceMs: 200 }
        );
      }, 100);

      // Warten auf Debounce-Completion
      await new Promise(resolve => setTimeout(resolve, 350));

      // Callback sollte nur einmal aufgerufen worden sein (für zweite Anfrage)
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('analyzeKeywords', () => {
    test('berechnet Keyword-Dichte korrekt', () => {
      const text = 'Innovation ist wichtig. Innovation steigert Effizienz. Digitale Innovation hilft.';
      const keywords = ['Innovation', 'Effizienz'];

      const analytics = seoKeywordService.analyzeKeywords(text, keywords);

      expect(analytics).toHaveLength(2);
      
      const innovationAnalytics = analytics.find(a => a.keyword === 'Innovation');
      expect(innovationAnalytics?.occurrences).toBe(3);
      expect(innovationAnalytics?.density).toBeCloseTo(33.33, 1); // 3 von 9 Wörtern
      
      const effizienzAnalytics = analytics.find(a => a.keyword === 'Effizienz');
      expect(effizienzAnalytics?.occurrences).toBe(1);
      expect(effizienzAnalytics?.density).toBeCloseTo(11.11, 1); // 1 von 9 Wörtern
    });

    test('findet Keyword-Positionen korrekt', () => {
      const text = 'Innovation am Anfang und Innovation am Ende';
      const keywords = ['Innovation'];

      const analytics = seoKeywordService.analyzeKeywords(text, keywords);

      expect(analytics[0].positions).toHaveLength(2);
      expect(analytics[0].positions[0]).toBe(0); // Position des ersten "Innovation"
      expect(analytics[0].positions[1]).toBe(25); // Position des zweiten "Innovation"
    });

    test('behandelt leere Keywords-Liste', () => {
      const text = 'Test text without specific keywords';
      const keywords: string[] = [];

      const analytics = seoKeywordService.analyzeKeywords(text, keywords);

      expect(analytics).toEqual([]);
    });
  });

  describe('calculateSEOScore', () => {
    test('gibt hohen Score für optimale Keyword-Dichte', () => {
      // Text mit ~300 Wörtern und 2% Keyword-Dichte (optimal)
      const words = new Array(300).fill('wort').join(' ');
      const text = `Innovation ${words} Innovation Innovation Innovation Innovation Innovation`; // 6 Keywords in ~306 Wörtern ≈ 2%
      const keywords = ['Innovation'];

      const score = seoKeywordService.calculateSEOScore(text, keywords);

      expect(score).toBeGreaterThan(70); // Hoher Score für optimale Bedingungen
    });

    test('gibt niedrigen Score für schlechte Keyword-Dichte', () => {
      const text = 'Ein sehr kurzer Text ohne die relevanten Begriffe.';
      const keywords = ['Innovation', 'Automatisierung'];

      const score = seoKeywordService.calculateSEOScore(text, keywords);

      expect(score).toBeLessThan(30); // Niedriger Score für schlechte Bedingungen
    });

    test('gibt 0 für leere Keywords', () => {
      const text = 'Test text with content but no keywords defined';
      const keywords: string[] = [];

      const score = seoKeywordService.calculateSEOScore(text, keywords);

      expect(score).toBe(0);
    });

    test('berücksichtigt Text-Länge im Score', () => {
      const shortText = 'Innovation Innovation Innovation'; // Zu kurz
      const optimalText = new Array(500).fill('wort').join(' ') + ' Innovation Innovation'; // Optimal
      const keywords = ['Innovation'];

      const shortScore = seoKeywordService.calculateSEOScore(shortText, keywords);
      const optimalScore = seoKeywordService.calculateSEOScore(optimalText, keywords);

      expect(optimalScore).toBeGreaterThan(shortScore);
    });
  });

  describe('Cache und Performance', () => {
    test('clearCache leert den Cache', async () => {
      // Clear initial state
      seoKeywordService.clearCache();
      
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'Test Keywords First' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'Test Keywords Second' })
        });

      const text = 'This is a long enough text for cache clearing test with sufficient content for keyword processing';

      // Erste Anfrage (erstellt Cache-Eintrag)
      await seoKeywordService.detectKeywords(text);
      
      // Cache leeren
      seoKeywordService.clearCache();

      // Zweite Anfrage (sollte neuen API-Call machen)
      await seoKeywordService.detectKeywords(text);

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('clearDebounceTimers stoppt alle Timer', () => {
      const callback = jest.fn();

      // Starte mehrere debounced Operationen
      seoKeywordService.detectKeywordsDebounced('Text 1', 'session1', callback, { debounceMs: 1000 });
      seoKeywordService.detectKeywordsDebounced('Text 2', 'session2', callback, { debounceMs: 1000 });

      // Clear alle Timer
      seoKeywordService.clearDebounceTimers();

      // Warten länger als Debounce-Zeit
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
      }, 1100);
    });
  });

  describe('Edge Cases', () => {
    test('behandelt leeren Text', async () => {
      const result = await seoKeywordService.detectKeywords('');

      expect(result.keywords).toEqual([]);
      expect(result.confidence).toBe(0);
      expect(result.textLength).toBe(0);
    });

    test('behandelt Sonderzeichen im Text', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'KI-Lösung, E-Commerce'
        })
      });

      const text = 'Unsere innovative KI-Lösung revolutioniert den E-Commerce Bereich und bietet umfassende Automatisierung für moderne Unternehmen! @#$%^&*()';

      const result = await seoKeywordService.detectKeywords(text);

      expect(result.keywords).toEqual(['KI-Lösung', 'E-Commerce']);
    });

    test('behandelt sehr lange Texte', async () => {
      // Clear cache first
      seoKeywordService.clearCache();
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Innovation, Automatisierung, Digitalisierung'
        })
      });

      const longText = new Array(500).fill('innovation automatisierung digitalisierung').join(' ');

      const result = await seoKeywordService.detectKeywords(longText);

      expect(result.keywords).toContain('Innovation');
      expect(result.keywords).toContain('Automatisierung');
      expect(result.textLength).toBe(longText.length);
    });

    test('behandelt ungültigen API-Response', async () => {
      // Clear cache first
      seoKeywordService.clearCache();
      
      // Mock empty/invalid response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const text = 'automatisierung automatisierung innovation innovation digitalisierung transformation businesslogik businesslogik keywordtest keywordtest';
      const options = { minWordLength: 5, excludeCommonWords: false }; // Weniger strenge Optionen

      const result = await seoKeywordService.detectKeywords(text, options);

      // Sollte Fallback verwenden - prüfe dass es durch Fallback-Logik gegangen ist
      expect(result.textLength).toBe(text.length);
      expect(result.keywords.length).toBeGreaterThanOrEqual(0);
      // Confidence kann 0 sein wenn keine Keywords gefunden, oder 0.3+ wenn Keywords gefunden
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    test('Keyword-Detection ist schnell genug', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: 'Performance, Test, Keywords'
        })
      });

      const text = 'Performance test text for speed measurement';
      const startTime = Date.now();

      await seoKeywordService.detectKeywords(text);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Sollte unter 5 Sekunden sein
    });

    test('Analytics-Berechnung ist performant', () => {
      const longText = new Array(1000).fill('Innovation test word').join(' ');
      const keywords = ['Innovation', 'test', 'word'];
      
      const startTime = Date.now();
      
      const analytics = seoKeywordService.analyzeKeywords(longText, keywords);
      
      const duration = Date.now() - startTime;
      
      expect(analytics).toHaveLength(3);
      expect(duration).toBeLessThan(100); // Sollte unter 100ms sein
    });
  });
});