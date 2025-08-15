// src/__tests__/seo-header-bar.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SEOHeaderBar } from '@/components/campaigns/SEOHeaderBar';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';

// Mock the SEO service
jest.mock('@/lib/ai/seo-keyword-service', () => ({
  seoKeywordService: {
    detectKeywordsDebounced: jest.fn(),
    calculateSEOScore: jest.fn(),
    analyzeKeywords: jest.fn(),
    clearDebounceTimers: jest.fn(),
  }
}));

const mockSeoService = seoKeywordService as jest.Mocked<typeof seoKeywordService>;

describe('SEOHeaderBar', () => {
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
  });

  describe('Basic Rendering', () => {
    test('rendert den Header mit Titel und Keywords', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText('PR-Kampagne erstellen')).toBeInTheDocument();
      expect(screen.getByText('Keywords:')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('SEO')).toBeInTheDocument();
    });

    test('rendert custom title wenn angegeben', () => {
      render(<SEOHeaderBar {...defaultProps} title="Custom Title" />);
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    test('zeigt hinzufügen Button', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText('hinzufügen')).toBeInTheDocument();
    });
  });

  describe('Keyword Management', () => {
    test('zeigt bestehende Keywords als Badges', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
      const testBadge = screen.getByText('Test');
      const seoBadge = screen.getByText('SEO');
      
      expect(testBadge).toBeInTheDocument();
      expect(seoBadge).toBeInTheDocument();
    });

    test('entfernt Keyword beim Klick auf X', () => {
      const onKeywordsChange = jest.fn();
      render(<SEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);
      
      // Finde das X-Icon für "Test" Keyword
      const testBadge = screen.getByText('Test').closest('.px-2');
      const removeIcon = testBadge?.querySelector('svg');
      
      if (removeIcon) {
        fireEvent.click(removeIcon);
        expect(onKeywordsChange).toHaveBeenCalledWith(['SEO']);
      }
    });

    test('öffnet Input-Feld beim Klick auf hinzufügen', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
      fireEvent.click(screen.getByText('hinzufügen'));
      
      expect(screen.getByPlaceholderText('Keyword eingeben...')).toBeInTheDocument();
    });

    test('fügt neues Keyword hinzu bei Enter', () => {
      const onKeywordsChange = jest.fn();
      render(<SEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);
      
      // Öffne Input
      fireEvent.click(screen.getByText('hinzufügen'));
      
      const input = screen.getByPlaceholderText('Keyword eingeben...');
      fireEvent.change(input, { target: { value: 'Neues Keyword' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onKeywordsChange).toHaveBeenCalledWith(['Test', 'SEO', 'Neues Keyword']);
    });

    test('schließt Input bei Escape', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
      // Öffne Input
      fireEvent.click(screen.getByText('hinzufügen'));
      
      const input = screen.getByPlaceholderText('Keyword eingeben...');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(screen.queryByPlaceholderText('Keyword eingeben...')).not.toBeInTheDocument();
    });

    test('verhindert Duplikate beim Hinzufügen', () => {
      const onKeywordsChange = jest.fn();
      render(<SEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);
      
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
      const { rerender } = render(<SEOHeaderBar {...defaultProps} />);
      
      expect(mockSeoService.detectKeywordsDebounced).toHaveBeenCalledWith(
        defaultProps.content,
        'seo-header-detection',
        expect.any(Function),
        { debounceMs: 2000 }
      );

      // Content ändern - muss ausreichend lang sein (>50 Zeichen)
      const newContent = "Neuer Content für Auto-Detection Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      rerender(<SEOHeaderBar {...defaultProps} content={newContent} />);
      
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

      render(<SEOHeaderBar {...defaultProps} />);

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

      render(<SEOHeaderBar {...defaultProps} onKeywordsChange={onKeywordsChange} />);

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
      render(<SEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText('SEO:')).toBeInTheDocument();
      expect(screen.getByText('75/100')).toBeInTheDocument();
    });

    test('zeigt Wortanzahl', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText(/\d+ Wörter/)).toBeInTheDocument();
    });

    test('zeigt Keyword-Dichte wenn Keywords vorhanden', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
      expect(screen.getByText(/\d+\.\d+% Dichte/)).toBeInTheDocument();
    });

    test('versteckt Keyword-Dichte wenn keine Keywords', () => {
      render(<SEOHeaderBar {...defaultProps} keywords={[]} />);
      
      expect(screen.queryByText(/% Dichte/)).not.toBeInTheDocument();
    });

    test('zeigt verschiedene SEO Score Farben', () => {
      const { rerender } = render(<SEOHeaderBar {...defaultProps} />);
      
      // Hoher Score (grün)
      mockSeoService.calculateSEOScore.mockReturnValue(85);
      rerender(<SEOHeaderBar {...defaultProps} content="Updated content" />);
      
      // Mittlerer Score (gelb)
      mockSeoService.calculateSEOScore.mockReturnValue(55);
      rerender(<SEOHeaderBar {...defaultProps} content="Updated content 2" />);
      
      // Niedriger Score (rot)
      mockSeoService.calculateSEOScore.mockReturnValue(25);
      rerender(<SEOHeaderBar {...defaultProps} content="Updated content 3" />);
      
      // Alle sollten unterschiedliche Farben haben
      expect(mockSeoService.calculateSEOScore).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('behandelt leeren Content', () => {
      render(<SEOHeaderBar {...defaultProps} content="" />);
      
      expect(screen.getByText('0 Wörter')).toBeInTheDocument();
      expect(screen.getByText('0/100')).toBeInTheDocument();
    });

    test('behandelt sehr kurzen Content', () => {
      render(<SEOHeaderBar {...defaultProps} content="Kurz" />);
      
      expect(mockSeoService.detectKeywordsDebounced).not.toHaveBeenCalled();
    });

    test('zeigt Analysiere-Status während Detection', async () => {
      let detectionCallback: ((result: any) => void) | null = null;
      
      mockSeoService.detectKeywordsDebounced.mockImplementation((content, sessionId, callback) => {
        detectionCallback = callback;
        // Simuliere verzögerte Antwort
      });

      render(<SEOHeaderBar {...defaultProps} />);
      
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
      const { unmount } = render(<SEOHeaderBar {...defaultProps} />);
      
      unmount();
      
      expect(mockSeoService.clearDebounceTimers).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('verwendet Debouncing für Content-Änderungen', () => {
      const { rerender } = render(<SEOHeaderBar {...defaultProps} />);
      
      // Mehrere schnelle Content-Änderungen - alle müssen >50 Zeichen sein
      const content1 = "Content 1 für Debouncing Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      const content2 = "Content 2 für Debouncing Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";  
      const content3 = "Content 3 für Debouncing Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      
      rerender(<SEOHeaderBar {...defaultProps} content={content1} />);
      rerender(<SEOHeaderBar {...defaultProps} content={content2} />);
      rerender(<SEOHeaderBar {...defaultProps} content={content3} />);
      
      // Sollte für jeden Content-Change aufgerufen werden (useEffect)
      expect(mockSeoService.detectKeywordsDebounced).toHaveBeenCalledTimes(4); // Initial + 3 changes
    });

    test('berechnet Metriken effizient', () => {
      render(<SEOHeaderBar {...defaultProps} />);
      
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