// src/components/campaigns/pr-seo/utils/pr-metrics-calculator.test.ts

import { PRMetricsCalculator } from './pr-metrics-calculator';

describe('PRMetricsCalculator', () => {
  describe('calculate', () => {
    const keywords = ['Software', 'Innovation'];

    it('should calculate headline length correctly', () => {
      const title = 'Neue Software revolutioniert den Markt';
      const text = '<p>Content</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.headlineLength).toBe(title.length);
    });

    it('should detect keywords in headline', () => {
      const title = 'Software und Innovation im Fokus';
      const text = '<p>Content</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.headlineHasKeywords).toBe(true);
    });

    it('should detect NO keywords in headline', () => {
      const title = 'Allgemeiner Titel ohne Keywords';
      const text = '<p>Content</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.headlineHasKeywords).toBe(false);
    });

    it('should detect active verbs in headline', () => {
      const title = 'Unternehmen startet neue Initiative';
      const text = '<p>Content</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.headlineHasActiveVerb).toBe(true);
    });

    it('should detect NO active verbs in headline', () => {
      const title = 'Bericht über aktuelle Entwicklungen';
      const text = '<p>Content</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.headlineHasActiveVerb).toBe(false);
    });

    it('should calculate lead length from first paragraph', () => {
      const title = 'Title';
      const text = '<p>Dies ist der Lead-Absatz mit ausreichendem Inhalt für eine gute Bewertung</p><p>Zweiter Absatz</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.leadLength).toBeGreaterThan(50);
    });

    it('should detect numbers in lead', () => {
      const title = 'Title';
      const text = '<p>Im Jahr 2024 wurden 100 Millionen Euro investiert</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.leadHasNumbers).toBe(true);
    });

    it('should detect NO numbers in lead', () => {
      const title = 'Title';
      const text = '<p>Ein Absatz ohne Zahlen</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.leadHasNumbers).toBe(false);
    });

    it('should count keyword mentions in lead', () => {
      const title = 'Title';
      const text = '<p>Software und Innovation sind wichtig. Software wird häufiger verwendet.</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.leadKeywordMentions).toBe(3);
    });

    it('should count PR quotes correctly', () => {
      const title = 'Title';
      const text = '<p>Text</p><blockquote data-type="pr-quote">Ein Zitat</blockquote><blockquote>Zweites Zitat</blockquote>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.quoteCount).toBe(2);
    });

    it('should detect action verbs in text', () => {
      const title = 'Title';
      const text = '<p>Besuchen Sie jetzt unsere Website und erfahren Sie mehr</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.hasActionVerbs).toBe(true);
    });

    it('should detect learn-more phrases', () => {
      const title = 'Title';
      const text = '<p>Mehr erfahren über unsere Produkte</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.hasLearnMore).toBe(true);
    });

    it('should calculate average paragraph length', () => {
      const title = 'Title';
      const text = '<p>Dies ist ein Absatz mit mehreren Wörtern.</p><p>Ein zweiter Absatz mit noch mehr Wörtern und Text.</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.avgParagraphLength).toBeGreaterThan(0);
    });

    it('should detect bullet points in UL lists', () => {
      const title = 'Title';
      const text = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.hasBulletPoints).toBe(true);
    });

    it('should detect bullet points in OL lists', () => {
      const title = 'Title';
      const text = '<ol><li>Item 1</li><li>Item 2</li></ol>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.hasBulletPoints).toBe(true);
    });

    it('should detect subheadings', () => {
      const title = 'Title';
      const text = '<h2>Subheading</h2><p>Content</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.hasSubheadings).toBe(true);
    });

    it('should count numbers in text', () => {
      const title = 'Title';
      const text = '<p>Im Jahr 2024 wurden 100 Millionen Euro und 50% Wachstum erzielt</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.numberCount).toBeGreaterThan(0);
    });

    it('should detect specific dates', () => {
      const title = 'Title';
      const text = '<p>Das Event findet am 15.03.2024 statt</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.hasSpecificDates).toBe(true);
    });

    it('should detect company names', () => {
      const title = 'Title';
      const text = '<p>Acme Solutions GmbH und TechCorp AG kooperieren</p>';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.hasCompanyNames).toBe(true);
    });

    it('should handle empty text', () => {
      const title = 'Title';
      const text = '';
      const result = PRMetricsCalculator.calculate(text, title, keywords);

      expect(result.leadLength).toBe(0);
      expect(result.avgParagraphLength).toBe(0);
      expect(result.quoteCount).toBe(0);
    });
  });

  describe('getActiveVerbs', () => {
    it('should return an array of active verbs', () => {
      const verbs = PRMetricsCalculator.getActiveVerbs();

      expect(Array.isArray(verbs)).toBe(true);
      expect(verbs.length).toBeGreaterThan(0);
    });

    it('should include common business verbs', () => {
      const verbs = PRMetricsCalculator.getActiveVerbs();

      expect(verbs).toContain('startet');
      expect(verbs).toContain('präsentiert');
      expect(verbs).toContain('entwickelt');
    });

    it('should include innovation verbs', () => {
      const verbs = PRMetricsCalculator.getActiveVerbs();

      expect(verbs).toContain('innoviert');
      expect(verbs).toContain('revolutioniert');
    });

    it('should include marketing verbs', () => {
      const verbs = PRMetricsCalculator.getActiveVerbs();

      expect(verbs).toContain('führt ein');
      expect(verbs).toContain('erweitert');
    });
  });
});
