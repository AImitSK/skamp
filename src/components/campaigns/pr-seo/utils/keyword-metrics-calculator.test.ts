// src/components/campaigns/pr-seo/utils/keyword-metrics-calculator.test.ts

import { KeywordMetricsCalculator } from './keyword-metrics-calculator';
import type { KeywordMetrics } from '../types';

describe('KeywordMetricsCalculator', () => {
  describe('calculateBasicMetrics', () => {
    const documentTitle = 'Software revolutioniert Digitalisierung';
    const text = '<p>Die neue Software für Digitalisierung ist verfügbar. Digitalisierung wird immer wichtiger. Unternehmen setzen auf Software und Digitalisierung.</p>';

    it('should calculate keyword density correctly', () => {
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Digitalisierung', text, documentTitle);

      expect(result.keyword).toBe('Digitalisierung');
      expect(result.density).toBeGreaterThan(0);
      expect(result.occurrences).toBe(3);
    });

    it('should detect keyword in headline', () => {
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', text, documentTitle);

      expect(result.inHeadline).toBe(true);
      expect(result.keyword).toBe('Software');
    });

    it('should detect keyword NOT in headline', () => {
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Unternehmen', text, documentTitle);

      expect(result.inHeadline).toBe(false);
    });

    it('should detect keyword in first paragraph', () => {
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', text, documentTitle);

      expect(result.inFirstParagraph).toBe(true);
    });

    it('should detect keyword NOT in first paragraph', () => {
      const longText = '<p>Erste Zeile ohne Keyword</p><p>Software kommt später vor</p>';
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', longText, documentTitle);

      expect(result.inFirstParagraph).toBe(false);
    });

    it('should return zero density for non-existent keyword', () => {
      const result = KeywordMetricsCalculator.calculateBasicMetrics('NonExistent', text, documentTitle);

      expect(result.density).toBe(0);
      expect(result.occurrences).toBe(0);
    });

    it('should calculate distribution as "gut" for well-distributed keywords', () => {
      const spreadText = '<p>Software am Anfang</p><p>Text in der Mitte</p><p>Software in der Mitte</p><p>Mehr Text</p><p>Software am Ende</p>';
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', spreadText, documentTitle);

      expect(result.distribution).toBe('gut');
    });

    it('should calculate distribution as "mittel" for moderately distributed keywords', () => {
      const spreadText = '<p>Software am Anfang</p><p>Text</p><p>Software zweites Vorkommen</p>';
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', spreadText, documentTitle);

      expect(result.distribution).toBe('mittel');
    });

    it('should calculate distribution as "schlecht" for poorly distributed keywords', () => {
      const spreadText = '<p>Software</p>';
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', spreadText, documentTitle);

      expect(result.distribution).toBe('schlecht');
    });

    it('should be case-insensitive', () => {
      const result = KeywordMetricsCalculator.calculateBasicMetrics('SOFTWARE', text, documentTitle);

      expect(result.occurrences).toBe(2);
      expect(result.inHeadline).toBe(true);
    });

    it('should strip HTML tags correctly', () => {
      const htmlText = '<div><strong>Software</strong> ist <em>wichtig</em></div>';
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', htmlText, documentTitle);

      expect(result.occurrences).toBe(1);
    });

    it('should handle empty text', () => {
      const result = KeywordMetricsCalculator.calculateBasicMetrics('Software', '', documentTitle);

      expect(result.density).toBe(0);
      expect(result.occurrences).toBe(0);
      expect(result.distribution).toBe('schlecht');
    });
  });

  describe('updateMetrics', () => {
    const keyword = 'Innovation';
    const text = '<p>Innovation ist der Schlüssel zur Innovation</p>';
    const documentTitle = 'Innovation im Fokus';

    it('should update basic metrics while preserving KI data', () => {
      const existingMetrics: KeywordMetrics = {
        keyword: 'Innovation',
        density: 5,
        occurrences: 2,
        inHeadline: false,
        inFirstParagraph: false,
        distribution: 'schlecht',
        semanticRelevance: 85,
        contextQuality: 90,
        targetAudience: 'B2B',
        tonality: 'Sachlich',
        relatedTerms: ['Technologie', 'Entwicklung']
      };

      const result = KeywordMetricsCalculator.updateMetrics(keyword, text, documentTitle, existingMetrics);

      expect(result.inHeadline).toBe(true); // Neu berechnet
      expect(result.semanticRelevance).toBe(85); // Erhalten
      expect(result.contextQuality).toBe(90); // Erhalten
      expect(result.targetAudience).toBe('B2B'); // Erhalten
      expect(result.tonality).toBe('Sachlich'); // Erhalten
      expect(result.relatedTerms).toEqual(['Technologie', 'Entwicklung']); // Erhalten
    });

    it('should calculate new basic metrics without existing data', () => {
      const result = KeywordMetricsCalculator.updateMetrics(keyword, text, documentTitle);

      expect(result.keyword).toBe('Innovation');
      expect(result.occurrences).toBe(2);
      expect(result.semanticRelevance).toBeUndefined();
      expect(result.contextQuality).toBeUndefined();
    });

    it('should handle empty existing metrics', () => {
      const result = KeywordMetricsCalculator.updateMetrics(keyword, text, documentTitle, undefined);

      expect(result.inHeadline).toBe(true);
      expect(result.semanticRelevance).toBeUndefined();
    });
  });
});
