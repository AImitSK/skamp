/**
 * Unit Tests für keyword-extraction-service.ts
 * Plan 02: Automatische Keyword-Extraktion + Auto-Confirm Logik
 */

// Mock Firebase Admin vor dem Import
jest.mock('@/lib/firebase/admin-init', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  }
}));

import {
  extractCompanyKeywords,
  checkAutoConfirm,
  determineConfidence
} from '../keyword-extraction-service';

describe('extractCompanyKeywords', () => {
  it('extrahiert alle Firmennamen-Varianten', () => {
    const result = extractCompanyKeywords({
      name: 'TechVision GmbH',
      officialName: 'TechVision Solutions GmbH',
      tradingName: 'TechVision'
    });

    expect(result.all).toContain('TechVision GmbH');
    expect(result.all).toContain('TechVision');
    expect(result.all).toContain('TechVision Solutions GmbH');
    expect(result.all).toContain('TechVision Solutions');
    expect(result.primary).toBe('TechVision GmbH');
  });

  it('entfernt GmbH Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'TestCompany GmbH' });
    expect(result.all).toContain('TestCompany');
    expect(result.all).toContain('TestCompany GmbH');
  });

  it('entfernt AG Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'TestCompany AG' });
    expect(result.all).toContain('TestCompany');
    expect(result.all).toContain('TestCompany AG');
  });

  it('entfernt Ltd. Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'TestCompany Ltd.' });
    expect(result.all).toContain('TestCompany');
    expect(result.all).toContain('TestCompany Ltd.');
  });

  it('entfernt Inc. Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'TestCompany Inc.' });
    expect(result.all).toContain('TestCompany');
    expect(result.all).toContain('TestCompany Inc.');
  });

  it('entfernt LLC Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'TestCompany LLC' });
    expect(result.all).toContain('TestCompany');
    expect(result.all).toContain('TestCompany LLC');
  });

  it('entfernt UG Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'TestCompany UG' });
    expect(result.all).toContain('TestCompany');
    expect(result.all).toContain('TestCompany UG');
  });

  it('entfernt KG Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'TestCompany KG' });
    expect(result.all).toContain('TestCompany');
    expect(result.all).toContain('TestCompany KG');
  });

  it('behandelt Firmennamen ohne Rechtsform', () => {
    const result = extractCompanyKeywords({ name: 'SimpleCompany' });
    expect(result.all).toContain('SimpleCompany');
    expect(result.primary).toBe('SimpleCompany');
  });

  it('behandelt leeren Namen', () => {
    const result = extractCompanyKeywords({ name: '' });
    expect(result.all).toHaveLength(0);
    expect(result.primary).toBe('');
  });

  it('filtert zu kurze Keywords', () => {
    const result = extractCompanyKeywords({ name: 'A GmbH' });
    // "A" wird gefiltert (< 2 Zeichen)
    expect(result.all.some(k => k === 'A')).toBe(false);
    expect(result.all).toContain('A GmbH');
  });

  it('inkludiert tradingName wenn vorhanden', () => {
    const result = extractCompanyKeywords({
      name: 'Mustermann Consulting GmbH',
      tradingName: 'MuCo'
    });
    expect(result.all).toContain('MuCo');
  });

  it('behandelt officialName der gleich wie name ist', () => {
    const result = extractCompanyKeywords({
      name: 'TestCompany GmbH',
      officialName: 'TestCompany GmbH'
    });
    // Sollte keine Duplikate haben
    const uniqueCount = new Set(result.all).size;
    expect(uniqueCount).toBe(result.all.length);
  });
});

describe('checkAutoConfirm', () => {
  const companyKeywords = ['TechVision GmbH', 'TechVision'];

  describe('company_in_title', () => {
    it('bestätigt bei Firmenname im Titel (exakt)', () => {
      const result = checkAutoConfirm(
        { title: 'TechVision stellt neues Produkt vor', content: 'Heute wurde...' },
        companyKeywords,
        []
      );

      expect(result.shouldConfirm).toBe(true);
      expect(result.reason).toBe('company_in_title');
      expect(result.companyMatch.found).toBe(true);
      expect(result.companyMatch.inTitle).toBe(true);
    });

    it('bestätigt bei Firmenname mit GmbH im Titel', () => {
      const result = checkAutoConfirm(
        { title: 'TechVision GmbH erhält Auszeichnung', content: 'Die Firma...' },
        companyKeywords,
        []
      );

      expect(result.shouldConfirm).toBe(true);
      expect(result.reason).toBe('company_in_title');
    });

    it('bestätigt case-insensitive', () => {
      const result = checkAutoConfirm(
        { title: 'TECHVISION macht Schlagzeilen', content: 'Heute...' },
        companyKeywords,
        []
      );

      expect(result.shouldConfirm).toBe(true);
      expect(result.reason).toBe('company_in_title');
    });
  });

  describe('company_plus_seo', () => {
    it('bestätigt bei Firmenname im Content + hohem SEO-Score', () => {
      const result = checkAutoConfirm(
        {
          title: 'Neues Smart Home Produkt auf dem Markt',
          content: 'TechVision hat heute sein Smart Home Hub vorgestellt.'
        },
        companyKeywords,
        ['Smart Home', 'Hub']
      );

      expect(result.shouldConfirm).toBe(true);
      expect(result.reason).toBe('company_plus_seo');
      expect(result.seoScore).toBeGreaterThanOrEqual(70);
    });

    it('berechnet SEO-Score korrekt bei Titel-Match', () => {
      const result = checkAutoConfirm(
        {
          title: 'Smart Home Hub Neuigkeiten',
          content: 'TechVision ist dabei.'
        },
        companyKeywords,
        ['Smart Home', 'Hub']
      );

      // Beide Keywords im Titel = 4/4 = 100%
      expect(result.seoScore).toBe(100);
    });
  });

  describe('company_only', () => {
    it('verweigert bei Firmenname nur im Content ohne SEO-Match', () => {
      const result = checkAutoConfirm(
        {
          title: 'Branchennews der Woche',
          content: 'Unter anderem berichtet TechVision von neuen Entwicklungen.'
        },
        companyKeywords,
        ['Smart Home', 'Hub']
      );

      expect(result.shouldConfirm).toBe(false);
      expect(result.reason).toBe('company_only');
      expect(result.companyMatch.found).toBe(true);
      expect(result.companyMatch.inTitle).toBe(false);
    });

    it('verweigert bei niedrigem SEO-Score', () => {
      const result = checkAutoConfirm(
        {
          title: 'Technologie News',
          content: 'TechVision wurde erwähnt.'
        },
        companyKeywords,
        ['Smart Home', 'Hub', 'IoT', 'Automatisierung']
      );

      expect(result.shouldConfirm).toBe(false);
      expect(result.reason).toBe('company_only');
      expect(result.seoScore).toBeLessThan(70);
    });
  });

  describe('no_company_match', () => {
    it('verweigert ohne Firmenname-Match', () => {
      const result = checkAutoConfirm(
        {
          title: 'Smart Home Markt wächst',
          content: 'Der Markt für Smart Home Produkte expandiert weiter.'
        },
        companyKeywords,
        ['Smart Home']
      );

      expect(result.shouldConfirm).toBe(false);
      expect(result.reason).toBe('no_company_match');
      expect(result.companyMatch.found).toBe(false);
    });

    it('gibt seoScore 0 zurück bei no_company_match', () => {
      const result = checkAutoConfirm(
        { title: 'Andere Firma News', content: 'Keine Relevanz.' },
        companyKeywords,
        ['Smart Home']
      );

      expect(result.seoScore).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('behandelt leeren Content', () => {
      const result = checkAutoConfirm(
        { title: 'TechVision Update', content: '' },
        companyKeywords,
        []
      );

      expect(result.shouldConfirm).toBe(true);
      expect(result.reason).toBe('company_in_title');
    });

    it('behandelt leere Keywords', () => {
      const result = checkAutoConfirm(
        { title: 'Some Article', content: 'Some content' },
        [],
        []
      );

      expect(result.shouldConfirm).toBe(false);
      expect(result.reason).toBe('no_company_match');
    });

    it('behandelt null/undefined content gracefully', () => {
      const result = checkAutoConfirm(
        { title: 'TechVision News', content: undefined as unknown as string },
        companyKeywords,
        []
      );

      expect(result.shouldConfirm).toBe(true);
    });

    it('priorisiert Titel-Match über Content-Match', () => {
      const result = checkAutoConfirm(
        {
          title: 'TechVision stellt vor',
          content: 'TechVision GmbH hat heute...'
        },
        companyKeywords,
        []
      );

      // Sollte Titel-Match melden, nicht Content-Match
      expect(result.companyMatch.inTitle).toBe(true);
      expect(result.reason).toBe('company_in_title');
    });
  });
});

describe('determineConfidence', () => {
  it('gibt very_high bei company_in_title', () => {
    const result = determineConfidence({
      shouldConfirm: true,
      reason: 'company_in_title',
      companyMatch: { found: true, inTitle: true, matchedKeyword: 'Test' },
      seoScore: 100
    });

    expect(result).toBe('very_high');
  });

  it('gibt high bei company_plus_seo', () => {
    const result = determineConfidence({
      shouldConfirm: true,
      reason: 'company_plus_seo',
      companyMatch: { found: true, inTitle: false, matchedKeyword: 'Test' },
      seoScore: 80
    });

    expect(result).toBe('high');
  });

  it('gibt medium bei company_only', () => {
    const result = determineConfidence({
      shouldConfirm: false,
      reason: 'company_only',
      companyMatch: { found: true, inTitle: false, matchedKeyword: 'Test' },
      seoScore: 30
    });

    expect(result).toBe('medium');
  });

  it('gibt low bei no_company_match', () => {
    const result = determineConfidence({
      shouldConfirm: false,
      reason: 'no_company_match',
      companyMatch: { found: false, inTitle: false, matchedKeyword: null },
      seoScore: 0
    });

    expect(result).toBe('low');
  });

  it('gibt low bei undefined result', () => {
    const result = determineConfidence(undefined);
    expect(result).toBe('low');
  });
});
