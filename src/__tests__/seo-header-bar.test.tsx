// src/__tests__/seo-header-bar.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PRSEOHeaderBar } from '@/components/campaigns/PRSEOHeaderBar';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import { HashtagDetector } from '@/lib/hashtag-detector';

// Mock the SEO service
jest.mock('@/lib/ai/seo-keyword-service', () => ({
  seoKeywordService: {
    detectKeywordsDebounced: jest.fn(),
    calculateSEOScore: jest.fn(),
    analyzeKeywords: jest.fn(),
    clearDebounceTimers: jest.fn(),
    calculateKeywordScore: jest.fn(),
  }
}));

// Mock HashtagDetector
jest.mock('@/lib/hashtag-detector', () => ({
  HashtagDetector: {
    detectHashtags: jest.fn(),
    assessHashtagQuality: jest.fn(),
  }
}));

const mockSeoService = seoKeywordService as jest.Mocked<typeof seoKeywordService>;
const mockHashtagDetector = HashtagDetector as jest.Mocked<typeof HashtagDetector>;

describe('PRSEOHeaderBar', () => {
  const defaultProps = {
    content: 'Dies ist ein ausreichend langer Test-Text für die SEO-Analyse mit vielen interessanten Keywords und Inhalten.',
    keywords: ['Test', 'SEO'],
    onKeywordsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockSeoService.calculateSEOScore.mockReturnValue(75);
    mockSeoService.analyzeKeywords.mockReturnValue([
      { keyword: 'Test', density: 2.5, occurrences: 2, positions: [0, 10] },
      { keyword: 'SEO', density: 1.8, occurrences: 1, positions: [5] }
    ]);
    mockSeoService.calculateKeywordScore.mockReturnValue({
      baseScore: 40,
      aiBonus: 20,
      totalScore: 60,
      hasAIAnalysis: false,
      breakdown: {
        keywordPosition: 10,
        keywordDistribution: 8,
        keywordVariations: 5,
        naturalFlow: 7,
        contextRelevance: 10,
        aiRelevanceBonus: 0,
        fallbackBonus: 20
      }
    });
    
    // Mock HashtagDetector
    mockHashtagDetector.detectHashtags.mockReturnValue(['Test', 'SEO', 'PR']);
    mockHashtagDetector.assessHashtagQuality.mockReturnValue({
      totalScore: 180,
      averageScore: 60,
      bestHashtags: [],
      suggestions: ['#PressRelease', '#News']
    });
  });

  describe('Basic Rendering', () => {
    test('rendert den Header mit Titel und Keywords', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText('PR-Kampagne erstellen')).toBeInTheDocument();
      expect(screen.getByText('Keywords:')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('SEO')).toBeInTheDocument();
    });

    test('rendert custom title wenn angegeben', () => {
      render(<PRSEOHeaderBar {...defaultProps} title="Custom Title" />);
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    test('zeigt hinzufügen Button', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText('hinzufügen')).toBeInTheDocument();
    });
  });

  describe('Keyword Management', () => {
    test('zeigt bestehende Keywords als Badges', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      const testBadge = screen.getByText('Test');
      const seoBadge = screen.getByText('SEO');
      
      expect(testBadge).toBeInTheDocument();
      expect(seoBadge).toBeInTheDocument();
    });

    test('entfernt Keyword beim Klick auf X', () => {
      const onKeywordsChange = jest.fn();
      render(<PRSEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);
      
      // Finde das X-Icon für "Test" Keyword
      const testBadge = screen.getByText('Test').closest('.px-2');
      const removeIcon = testBadge?.querySelector('svg');
      
      if (removeIcon) {
        fireEvent.click(removeIcon);
        expect(onKeywordsChange).toHaveBeenCalledWith(['SEO']);
      }
    });

    test('öffnet Input-Feld beim Klick auf hinzufügen', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      fireEvent.click(screen.getByText('hinzufügen'));
      
      expect(screen.getByPlaceholderText('Keyword eingeben...')).toBeInTheDocument();
    });

    test('fügt neues Keyword hinzu bei Enter', () => {
      const onKeywordsChange = jest.fn();
      render(<PRSEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);
      
      // Öffne Input
      fireEvent.click(screen.getByText('hinzufügen'));
      
      const input = screen.getByPlaceholderText('Keyword eingeben...');
      fireEvent.change(input, { target: { value: 'Neues Keyword' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onKeywordsChange).toHaveBeenCalledWith(['Test', 'SEO', 'Neues Keyword']);
    });

    test('schließt Input bei Escape', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      // Öffne Input
      fireEvent.click(screen.getByText('hinzufügen'));
      
      const input = screen.getByPlaceholderText('Keyword eingeben...');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(screen.queryByPlaceholderText('Keyword eingeben...')).not.toBeInTheDocument();
    });

    test('verhindert Duplikate beim Hinzufügen', () => {
      const onKeywordsChange = jest.fn();
      render(<PRSEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);
      
      // Öffne Input
      fireEvent.click(screen.getByText('hinzufügen'));
      
      const input = screen.getByPlaceholderText('Keyword eingeben...');
      fireEvent.change(input, { target: { value: 'Test' } }); // Existing keyword
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onKeywordsChange).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Detection Integration', () => {
    test('ruft detectKeywordsDebounced auf bei Content-Änderung', () => {
      const { rerender } = render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(mockSeoService.detectKeywordsDebounced).toHaveBeenCalledWith(
        defaultProps.content,
        'seo-header-detection',
        expect.any(Function),
        { debounceMs: 2000 }
      );

      // Content ändern - muss ausreichend lang sein (>50 Zeichen)
      const newContent = "Neuer Content für Auto-Detection Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      rerender(<PRSEOHeaderBar {...defaultProps} content={newContent} />);
      
      expect(mockSeoService.detectKeywordsDebounced).toHaveBeenCalledTimes(2);
      expect(mockSeoService.detectKeywordsDebounced).toHaveBeenLastCalledWith(
        newContent,
        'seo-header-detection',
        expect.any(Function),
        { debounceMs: 2000 }
      );
    });

    test('zeigt auto-detected Keywords als Vorschläge', async () => {
      // Simuliere Callback für auto-detection
      let detectionCallback: ((result: any) => void) | null = null;
      
      mockSeoService.detectKeywordsDebounced.mockImplementation((content, sessionId, callback) => {
        detectionCallback = callback;
      });

      render(<PRSEOHeaderBar {...defaultProps} />);

      // Simuliere Auto-Detection Ergebnis
      if (detectionCallback) {
        detectionCallback({
          keywords: ['Innovation', 'Automatisierung', 'Digitalisierung'],
          confidence: 0.8,
          detectedAt: new Date(),
          textLength: 100
        });
      }

      await waitFor(() => {
        expect(screen.getByText('+ Innovation')).toBeInTheDocument();
        expect(screen.getByText('+ Automatisierung')).toBeInTheDocument();
      });
    });

    test('fügt auto-detected Keyword hinzu beim Klick', async () => {
      const onKeywordsChange = jest.fn();
      let detectionCallback: ((result: any) => void) | null = null;
      
      mockSeoService.detectKeywordsDebounced.mockImplementation((content, sessionId, callback) => {
        detectionCallback = callback;
      });

      render(<PRSEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);

      // Simuliere Auto-Detection
      if (detectionCallback) {
        detectionCallback({
          keywords: ['Innovation'],
          confidence: 0.8,
          detectedAt: new Date(),
          textLength: 100
        });
      }

      await waitFor(() => {
        const suggestionBadge = screen.getByText('+ Innovation');
        fireEvent.click(suggestionBadge);
        
        expect(onKeywordsChange).toHaveBeenCalledWith(['Test', 'SEO', 'Innovation']);
      });
    });
  });

  describe('SEO Metrics Display', () => {
    test('zeigt SEO Score mit korrekter Farbe', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText('SEO:')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    test('zeigt Wortanzahl', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText(/\d+ Wörter/)).toBeInTheDocument();
    });

    test('zeigt Keyword-Dichte wenn Keywords vorhanden', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText(/\d+\.\d+% Dichte/)).toBeInTheDocument();
    });

    test('versteckt Keyword-Dichte wenn keine Keywords', () => {
      render(<PRSEOHeaderBar {...defaultProps} keywords={[]} />);
      
      expect(screen.queryByText(/% Dichte/)).not.toBeInTheDocument();
    });

    test('zeigt verschiedene SEO Score Farben', () => {
      const { rerender } = render(<PRSEOHeaderBar {...defaultProps} />);
      
      // Hoher Score (grün)
      mockSeoService.calculateSEOScore.mockReturnValue(85);
      rerender(<PRSEOHeaderBar {...defaultProps} content="Updated content" />);
      
      // Mittlerer Score (gelb)
      mockSeoService.calculateSEOScore.mockReturnValue(55);
      rerender(<PRSEOHeaderBar {...defaultProps} content="Updated content 2" />);
      
      // Niedriger Score (rot)
      mockSeoService.calculateSEOScore.mockReturnValue(25);
      rerender(<PRSEOHeaderBar {...defaultProps} content="Updated content 3" />);
      
      // Alle sollten unterschiedliche Farben haben
      expect(mockSeoService.calculateSEOScore).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('behandelt leeren Content', () => {
      render(<PRSEOHeaderBar {...defaultProps} content="" />);
      
      expect(screen.getByText('0 Wörter')).toBeInTheDocument();
      expect(screen.getByText('0/100')).toBeInTheDocument();
    });

    test('behandelt sehr kurzen Content', () => {
      render(<PRSEOHeaderBar {...defaultProps} content="Kurz" />);
      
      expect(mockSeoService.detectKeywordsDebounced).not.toHaveBeenCalled();
    });

    test('zeigt Analysiere-Status während Detection', async () => {
      let detectionCallback: ((result: any) => void) | null = null;
      
      mockSeoService.detectKeywordsDebounced.mockImplementation((content, sessionId, callback) => {
        detectionCallback = callback;
        // Simuliere verzögerte Antwort
      });

      render(<PRSEOHeaderBar {...defaultProps} />);
      
      // Sollte Analysiere-Status zeigen bevor Callback aufgerufen wird
      await waitFor(() => {
        expect(screen.getByText('Analysiere...')).toBeInTheDocument();
      });

      // Callback aufrufen um Status zu beenden
      if (detectionCallback) {
        detectionCallback({
          keywords: [],
          confidence: 0,
          detectedAt: new Date(),
          textLength: 100
        });
      }

      await waitFor(() => {
        expect(screen.queryByText('Analysiere...')).not.toBeInTheDocument();
      });
    });

    test('cleaned up timers on unmount', () => {
      const { unmount } = render(<PRSEOHeaderBar {...defaultProps} />);
      
      unmount();
      
      expect(mockSeoService.clearDebounceTimers).toHaveBeenCalled();
    });
  });

  describe('Social Score Integration', () => {
    test('zeigt Social-Score in der Score-Aufschlüsselung', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText(/Social:/)).toBeInTheDocument();
    });

    test('erkennt Hashtags im Content automatisch', () => {
      const contentWithHashtags = 'Dies ist ein Test mit #PR #Social #Marketing Hashtags und weiteren interessanten Inhalten.';
      render(<PRSEOHeaderBar {...defaultProps} content={contentWithHashtags} />);
      
      expect(mockHashtagDetector.detectHashtags).toHaveBeenCalledWith(contentWithHashtags);
    });

    test('zeigt Headline-Länge für Social-Media-Optimierung', () => {
      const longTitle = 'Dies ist eine sehr lange Headline die über 280 Zeichen lang ist und daher für Twitter zu lang wäre und Social-Media-Optimierung benötigt um die Reichweite zu maximieren und die Performance zu verbessern.';
      render(
        <PRSEOHeaderBar 
          {...defaultProps} 
          documentTitle={longTitle}
        />
      );
      
      // Sollte Headline-Länge anzeigen
      expect(screen.getByText(/Headline-Länge:/)).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(longTitle.length.toString()))).toHaveLength(2); // In Social-Details + Empfehlungen
    });

    test('zeigt erkannte Hashtags in der Social-Score Details-Box', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      // Sollte die ersten 5 Hashtags anzeigen
      expect(screen.getByText('#Test')).toBeInTheDocument();
      expect(screen.getByText('#SEO')).toBeInTheDocument(); 
      expect(screen.getByText('#PR')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('verwendet Debouncing für Content-Änderungen', () => {
      const { rerender } = render(<PRSEOHeaderBar {...defaultProps} />);
      
      // Mehrere schnelle Content-Änderungen - alle müssen >50 Zeichen sein
      const content1 = "Content 1 für Debouncing Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      const content2 = "Content 2 für Debouncing Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";  
      const content3 = "Content 3 für Debouncing Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      
      rerender(<PRSEOHeaderBar {...defaultProps} content={content1} />);
      rerender(<PRSEOHeaderBar {...defaultProps} content={content2} />);
      rerender(<PRSEOHeaderBar {...defaultProps} content={content3} />);
      
      // Sollte für jeden Content-Change aufgerufen werden (useEffect)
      expect(mockSeoService.detectKeywordsDebounced).toHaveBeenCalledTimes(4); // Initial + 3 changes
    });

    test('berechnet Metriken effizient', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);
      
      expect(mockSeoService.calculateSEOScore).toHaveBeenCalledWith(
        defaultProps.content,
        defaultProps.keywords
      );
      expect(mockSeoService.analyzeKeywords).toHaveBeenCalledWith(
        defaultProps.content,
        defaultProps.keywords
      );
    });
  });
});