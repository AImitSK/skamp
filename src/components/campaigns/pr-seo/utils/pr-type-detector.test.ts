// src/components/campaigns/pr-seo/utils/pr-type-detector.test.ts

import { PRTypeDetector } from './pr-type-detector';
import type { PRTypeInfo, PRTypeModifiers, AudienceThresholds } from '../types';

describe('PRTypeDetector', () => {
  describe('detectType', () => {
    it('should detect product PR type', () => {
      const content = 'Unser neues Produkt revolutioniert die Software-Branche';
      const title = 'Neue Software-Lösung';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isProduct).toBe(true);
      expect(result.isFinancial).toBe(false);
      expect(result.isPersonal).toBe(false);
    });

    it('should detect financial PR type', () => {
      const content = 'Das Unternehmen meldet für das Geschäftsjahr einen Umsatz von 10 Millionen';
      const title = 'Quartalszahlen 2024';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isFinancial).toBe(true);
      expect(result.isProduct).toBe(false);
    });

    it('should detect personal PR type', () => {
      const content = 'Wir freuen uns, die Ernennung von Max Mustermann zum neuen CEO bekannt zu geben';
      const title = 'Neue Führungskraft';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isPersonal).toBe(true);
      expect(result.isProduct).toBe(false);
    });

    it('should detect research PR type', () => {
      const content = 'Eine neue Studie zeigt, dass 80% der Unternehmen Digitalisierung priorisieren';
      const title = 'Studienergebnisse';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isResearch).toBe(true);
      expect(result.isProduct).toBe(false);
    });

    it('should detect crisis PR type', () => {
      const content = 'Das Unternehmen bedauert den Vorfall und bittet um Entschuldigung mit einer Richtigstellung';
      const title = 'Stellungnahme';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isCrisis).toBe(true);
      expect(result.isProduct).toBe(false);
    });

    it('should detect event PR type', () => {
      const content = 'Wir laden Sie herzlich zu unserer Konferenz am 15. März ein';
      const title = 'Einladung zur Messe';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isEvent).toBe(true);
      expect(result.isProduct).toBe(false);
    });

    it('should detect multiple PR types simultaneously', () => {
      const content = 'Neue Produkt-Studie zeigt Marktpotenzial';
      const title = 'Produktforschung';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isProduct).toBe(true);
      expect(result.isResearch).toBe(true);
    });

    it('should return all false for generic content', () => {
      const content = 'Ein Text ohne spezifische PR-Marker';
      const title = 'Allgemeiner Titel';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isProduct).toBe(false);
      expect(result.isFinancial).toBe(false);
      expect(result.isPersonal).toBe(false);
      expect(result.isResearch).toBe(false);
      expect(result.isCrisis).toBe(false);
      expect(result.isEvent).toBe(false);
    });

    it('should be case-insensitive', () => {
      const content = 'NEUE SOFTWARE-LÖSUNG IM ANGEBOT';
      const title = 'PRODUKT';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isProduct).toBe(true);
    });

    it('should work with HTML content', () => {
      const content = '<p>Unser <strong>neues Produkt</strong> ist verfügbar</p>';
      const title = 'Launch';
      const result = PRTypeDetector.detectType(content, title);

      expect(result.isProduct).toBe(true);
    });
  });

  describe('getModifiers', () => {
    it('should return high verb importance for product PR', () => {
      const content = 'Neues Produkt auf dem Markt';
      const title = 'Produktlaunch';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.verbImportance).toBe(25);
      expect(result.prType.isProduct).toBe(true);
    });

    it('should return low verb importance for financial PR', () => {
      const content = 'Quartalszahlen zeigen Gewinnsteigerung mit höherem Umsatz im Geschäftsjahr';
      const title = 'Q4 Ergebnis';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.verbImportance).toBe(5);
      expect(result.prType.isFinancial).toBe(true);
    });

    it('should add headline modifier for financial PR with numbers', () => {
      const content = 'Umsatz steigt auf 100 Millionen';
      const title = 'Umsatz 100M Euro';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.headlineModifier).toBe(10);
    });

    it('should add headline modifier for personal PR with titles', () => {
      const content = 'Ernennung zum neuen Direktor';
      const title = 'Dr. Max Mustermann wird CEO';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.headlineModifier).toBe(8);
    });

    it('should add headline modifier for crisis PR with clarifying verbs', () => {
      const content = 'Stellungnahme zum Vorfall mit Entschuldigung und Korrektur';
      const title = 'Unternehmen erklärt Situation';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.headlineModifier).toBe(12);
      expect(result.verbImportance).toBe(3);
    });

    it('should return standard verb importance for generic PR', () => {
      const content = 'Allgemeine Unternehmensnews';
      const title = 'Update';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.verbImportance).toBe(15);
      expect(result.headlineModifier).toBe(0);
    });

    it('should include recommendation suffix for PR types', () => {
      const content = 'Neue Studie veröffentlicht';
      const title = 'Forschungsergebnis';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.recommendationSuffix).toContain('Zahlen und Fakten');
    });

    it('should return PRTypeInfo as part of modifiers', () => {
      const content = 'Event-Ankündigung';
      const title = 'Veranstaltung';
      const result = PRTypeDetector.getModifiers(content, title);

      expect(result.prType).toBeDefined();
      expect(result.prType.isEvent).toBe(true);
    });
  });

  describe('getThresholds', () => {
    it('should return B2B thresholds', () => {
      const result = PRTypeDetector.getThresholds('B2B');

      expect(result.paragraphLength.min).toBe(150);
      expect(result.paragraphLength.max).toBe(500);
      expect(result.sentenceComplexity.max).toBe(25);
      expect(result.technicalTerms.bonus).toBe(10);
    });

    it('should return B2C thresholds', () => {
      const result = PRTypeDetector.getThresholds('B2C');

      expect(result.paragraphLength.min).toBe(80);
      expect(result.paragraphLength.max).toBe(250);
      expect(result.sentenceComplexity.max).toBe(15);
      expect(result.technicalTerms.penalty).toBe(5);
    });

    it('should return Verbraucher thresholds', () => {
      const result = PRTypeDetector.getThresholds('Verbraucher');

      expect(result.paragraphLength.min).toBe(60);
      expect(result.paragraphLength.max).toBe(200);
      expect(result.sentenceComplexity.max).toBe(12);
      expect(result.technicalTerms.penalty).toBe(10);
    });

    it('should return default thresholds for unknown audience', () => {
      const result = PRTypeDetector.getThresholds('UnknownAudience');

      expect(result.paragraphLength.min).toBe(100);
      expect(result.paragraphLength.max).toBe(300);
      expect(result.sentenceComplexity.max).toBe(20);
      expect(result.technicalTerms.neutral).toBe(0);
    });

    it('should handle empty string as default', () => {
      const result = PRTypeDetector.getThresholds('');

      expect(result.paragraphLength.min).toBe(100);
      expect(result.paragraphLength.max).toBe(300);
    });
  });
});
