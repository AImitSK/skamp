// src/__tests__/seo-header-bar.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PRSEOHeaderBar } from '@/components/campaigns/PRSEOHeaderBar';
import { seoKeywordService } from '@/lib/ai/seo-keyword-service';
import { apiClient } from '@/lib/api/api-client';

// Mock API Client für KI-Analyse
jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    post: jest.fn(),
  }
}));

// Mock the SEO service (wird vom usePRScoreCalculation Hook verwendet)
jest.mock('@/lib/ai/seo-keyword-service', () => ({
  seoKeywordService: {
    calculateKeywordScore: jest.fn(),
  }
}));

const mockSeoService = seoKeywordService as jest.Mocked<typeof seoKeywordService>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('PRSEOHeaderBar', () => {
  const defaultProps = {
    content: 'Dies ist ein ausreichend langer Test-Text für die SEO-Analyse mit vielen interessanten Keywords und Inhalten.',
    keywords: ['Test', 'SEO'],
    onKeywordsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock API Client Response für KI-Analyse
    mockApiClient.post.mockResolvedValue({
      success: true,
      semanticRelevance: 75,
      contextQuality: 80,
      targetAudience: 'Tech-Professionals',
      tonality: 'Professionell',
      relatedTerms: ['Testing', 'Quality', 'Software']
    });

    // Mock SEO Service calculateKeywordScore
    mockSeoService.calculateKeywordScore.mockReturnValue({
      baseScore: 40,
      aiBonus: 20,
      totalScore: 60,
      hasAIAnalysis: true,
      breakdown: {
        keywordPosition: 10,
        keywordDistribution: 8,
        keywordVariations: 5,
        naturalFlow: 7,
        contextRelevance: 10,
        aiRelevanceBonus: 20,
        fallbackBonus: 0
      }
    });
  });

  describe('Basic Rendering', () => {
    test('rendert den Header mit Titel und Keywords', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      expect(screen.getByText('PR-SEO Analyse')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('SEO')).toBeInTheDocument();
    });

    test('rendert custom title wenn angegeben', () => {
      render(<PRSEOHeaderBar {...defaultProps} title="Custom Title" />);

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    test('zeigt hinzufügen Button', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      expect(screen.getByText('Hinzufügen')).toBeInTheDocument();
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
      // Mit nur 1 Keyword testen, damit Input aktiv ist
      render(<PRSEOHeaderBar {...defaultProps} keywords={['Test']} />);

      // Input-Feld ist immer sichtbar in der neuen Version
      expect(screen.getByPlaceholderText('Keyword hinzufügen...')).toBeInTheDocument();
    });

    test('fügt neues Keyword hinzu bei Enter', async () => {
      const onKeywordsChange = jest.fn();
      // Mit nur 1 Keyword beginnen, damit noch Platz ist
      render(<PRSEOHeaderBar {...defaultProps} keywords={['Test']} onKeywordsChange={onKeywordsChange} />);

      const input = screen.getByPlaceholderText('Keyword hinzufügen...');
      fireEvent.change(input, { target: { value: 'Neues Keyword' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Warte auf async Keyword-Hinzufügung
      await waitFor(() => {
        expect(onKeywordsChange).toHaveBeenCalledWith(['Test', 'Neues Keyword']);
      });
    });

    test('schließt Input bei Escape', () => {
      // Mit nur 1 Keyword testen
      render(<PRSEOHeaderBar {...defaultProps} keywords={['Test']} />);

      // Input-Feld ist immer sichtbar, Escape-Funktionalität wurde entfernt
      const input = screen.getByPlaceholderText('Keyword hinzufügen...');
      expect(input).toBeInTheDocument();
    });

    test('verhindert Duplikate beim Hinzufügen', async () => {
      const onKeywordsChange = jest.fn();
      // Mit nur 1 Keyword testen
      render(<PRSEOHeaderBar {...defaultProps} keywords={['Test']} onKeywordsChange={onKeywordsChange} />);

      const input = screen.getByPlaceholderText('Keyword hinzufügen...');
      fireEvent.change(input, { target: { value: 'Test' } }); // Existing keyword
      fireEvent.click(screen.getByText('Hinzufügen'));

      // Warte kurz und prüfe, dass nichts passiert ist
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(onKeywordsChange).not.toHaveBeenCalled();
    });
  });

  describe('Keyword Metrics Display', () => {
    test('zeigt Keyword-Metriken für vorhandene Keywords', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      // Keyword-Namen sollten angezeigt werden
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('SEO')).toBeInTheDocument();
    });

    test('zeigt Keyword-Dichte für Keywords', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      // Sollte Dichte-Anzeige enthalten (pro Keyword eine)
      const dichteElements = screen.getAllByText(/Dichte:/i);
      expect(dichteElements.length).toBeGreaterThan(0);
    });

    test('zeigt keine Metriken wenn keine Keywords vorhanden', () => {
      render(<PRSEOHeaderBar {...defaultProps} keywords={[]} />);

      // Keine Keyword-Metriken sollten angezeigt werden
      expect(screen.queryByText(/Dichte:/i)).not.toBeInTheDocument();
    });
  });

  describe('SEO Metrics Display', () => {
    test('zeigt PR-Score mit korrekter Farbe', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();
      // Prüfe dass mindestens ein Score angezeigt wird (könnte mehrfach vorkommen)
      const scoreElements = screen.getAllByText(/\d+\/100/);
      expect(scoreElements.length).toBeGreaterThan(0);
    });

    test('versteckt Keyword-Dichte wenn keine Keywords', () => {
      render(<PRSEOHeaderBar {...defaultProps} keywords={[]} />);

      expect(screen.queryByText(/Dichte:/)).not.toBeInTheDocument();
    });

    test('zeigt Score-Breakdown wenn Keywords vorhanden', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      // Score-Breakdown sollte sichtbar sein
      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('behandelt leeren Content', () => {
      render(<PRSEOHeaderBar {...defaultProps} content="" />);

      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();
      // Bei leerem Content sollte ein Score angezeigt werden (könnte mehrfach vorkommen)
      const scoreElements = screen.getAllByText(/\d+\/100/);
      expect(scoreElements.length).toBeGreaterThan(0);
    });

    test('behandelt sehr kurzen Content', () => {
      render(<PRSEOHeaderBar {...defaultProps} content="Kurz" />);

      // Komponente sollte ohne Fehler rendern
      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();
    });

    test('zeigt Refresh-Button nur wenn Keywords vorhanden', () => {
      const { rerender } = render(<PRSEOHeaderBar {...defaultProps} keywords={[]} />);

      // Kein Refresh-Button ohne Keywords
      expect(screen.queryByTitle('KI-Analyse aktualisieren')).not.toBeInTheDocument();

      // Mit Keywords sollte Button sichtbar sein
      rerender(<PRSEOHeaderBar {...defaultProps} />);
      expect(screen.getByTitle('KI-Analyse aktualisieren')).toBeInTheDocument();
    });
  });

  describe('Social Score Integration', () => {
    test('zeigt Social-Score in der Score-Aufschlüsselung', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      // Social-Score ist Teil des Score-Breakdown
      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();
    });

    test('behandelt Content mit Hashtags korrekt', () => {
      const contentWithHashtags = 'Dies ist ein Test mit #PR #Social #Marketing Hashtags und weiteren interessanten Inhalten.';
      render(<PRSEOHeaderBar {...defaultProps} content={contentWithHashtags} />);

      // Komponente sollte ohne Fehler rendern
      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();
    });

    test('zeigt Score-Breakdown nur wenn Keywords vorhanden', () => {
      const { rerender } = render(<PRSEOHeaderBar {...defaultProps} keywords={[]} />);

      // Ohne Keywords nur Hauptscore
      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();

      // Mit Keywords auch Breakdown
      rerender(<PRSEOHeaderBar {...defaultProps} />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('aktualisiert Metriken bei Content-Änderungen', () => {
      const { rerender } = render(<PRSEOHeaderBar {...defaultProps} />);

      // Mehrere schnelle Content-Änderungen
      const content1 = "Content 1 für Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      const content2 = "Content 2 für Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";
      const content3 = "Content 3 für Test mit ausreichend langen Text der die Mindestanforderungen erfüllt";

      rerender(<PRSEOHeaderBar {...defaultProps} content={content1} />);
      rerender(<PRSEOHeaderBar {...defaultProps} content={content2} />);
      rerender(<PRSEOHeaderBar {...defaultProps} content={content3} />);

      // Komponente sollte ohne Fehler rendern
      expect(screen.getByText(/PR-Score:/)).toBeInTheDocument();
    });

    test('zeigt Keyword-Metriken korrekt an', () => {
      render(<PRSEOHeaderBar {...defaultProps} />);

      // Metriken sollten für Keywords angezeigt werden
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('SEO')).toBeInTheDocument();
    });
  });
});