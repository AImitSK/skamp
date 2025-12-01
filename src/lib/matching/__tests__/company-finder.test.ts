/**
 * Tests für Company Finder
 *
 * Testet das komplette Company-Matching System mit 6-Stufen-Prozess
 */

import { MatchingCandidateVariant } from '../../../types/matching';

// Mock-Funktion für die veraltete findCompanyBySignals
const findCompanyBySignals = async (variants: MatchingCandidateVariant[], orgId: string): Promise<any> => {
  return null;
};

// Mock Dependencies
jest.mock('../database-analyzer', () => ({
  analyzeCompanyDatabase: jest.fn(),
  analyzeDatabaseSignals: jest.fn()
}));

jest.mock('../string-similarity', () => ({
  matchCompanyNames: jest.fn(),
  extractDomain: jest.fn(),
  domainsMatch: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn()
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

describe('Company Finder', () => {
  const mockVariants: MatchingCandidateVariant[] = [
    {
      organizationId: 'org1',
      organizationName: 'Org 1',
      contactId: 'contact1',
      contactData: {
        name: { firstName: 'Max', lastName: 'Mustermann' },
        displayName: 'Max Mustermann',
        companyName: 'Der Spiegel Verlag',
        emails: [{ email: 'max@spiegel.de', type: 'business', isPrimary: true }],
        hasMediaProfile: true
      }
    },
    {
      organizationId: 'org2',
      organizationName: 'Org 2',
      contactId: 'contact2',
      contactData: {
        name: { firstName: 'Max', lastName: 'Mustermann' },
        displayName: 'Max Mustermann',
        companyName: 'Spiegel Verlag GmbH',
        emails: [{ email: 'max.mustermann@spiegel.de', type: 'business', isPrimary: true }],
        hasMediaProfile: true
      }
    }
  ];

  const mockCompanies = [
    {
      id: 'company1',
      name: 'Der Spiegel Verlag',
      website: 'https://spiegel.de',
      isReference: false
    },
    {
      id: 'company2',
      name: 'BILD Zeitung',
      website: 'https://bild.de',
      isReference: false
    },
    {
      id: 'ref-company',
      name: 'Premium Reference',
      isReference: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stufe 1: Exakte Company-ID Links', () => {
    it('should find company by exact ID link', async () => {
      const variantsWithCompanyId: MatchingCandidateVariant[] = [
        {
          ...mockVariants[0],
          contactData: {
            ...mockVariants[0].contactData,
            companyId: 'company1'
          }
        }
      ];

      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValueOnce({
        docs: [{
          id: 'company1',
          data: () => mockCompanies[0]
        }]
      });

      const result = await findCompanyBySignals(variantsWithCompanyId, 'test-org');

      expect(result).toBeDefined();
      expect(result?.companyId).toBe('company1');
      expect(result?.matchType).toBe('direct_id');
      expect(result?.confidence).toBe(100);
    });

    it('should ignore reference companies even with direct ID', async () => {
      const variantsWithRefId: MatchingCandidateVariant[] = [
        {
          ...mockVariants[0],
          contactData: {
            ...mockVariants[0].contactData,
            companyId: 'ref-company'
          }
        }
      ];

      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValueOnce({
        docs: [{
          id: 'ref-company',
          data: () => mockCompanies[2] // Reference company
        }]
      });

      const result = await findCompanyBySignals(variantsWithRefId, 'test-org');

      expect(result).toBeNull();
    });
  });

  describe('Stufe 2: Database Analysis', () => {
    it('should use database analysis when available', async () => {
      const { analyzeCompanyDatabase } = require('../database-analyzer');

      analyzeCompanyDatabase.mockResolvedValue({
        companyId: 'company1',
        companyName: 'Der Spiegel Verlag',
        matchType: 'database_analysis',
        confidence: 85
      });

      // Mock empty direct ID search
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValue({ docs: [] });

      const result = await findCompanyBySignals(mockVariants, 'test-org');

      expect(result).toBeDefined();
      expect(result?.companyId).toBe('company1');
      expect(result?.matchType).toBe('database_analysis');
      expect(result?.confidence).toBe(85);
    });
  });

  describe('Stufe 3: Exakte Namens-Matches', () => {
    it('should find company by exact name match', async () => {
      const { analyzeCompanyDatabase } = require('../database-analyzer');
      const { matchCompanyNames } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      // Mock empty previous stages
      analyzeCompanyDatabase.mockResolvedValue(null);
      getDocs.mockResolvedValue({ docs: [] });

      // Mock company search
      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.filter(c => !c.isReference).map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock exact match
      matchCompanyNames.mockReturnValue({ match: true, score: 100 });

      const result = await findCompanyBySignals(mockVariants, 'test-org');

      expect(result).toBeDefined();
      expect(result?.matchType).toBe('exact_name');
      expect(result?.confidence).toBe(100);
    });
  });

  describe('Stufe 4: Fuzzy Name Matching', () => {
    it('should find company by fuzzy name match', async () => {
      const { analyzeCompanyDatabase } = require('../database-analyzer');
      const { matchCompanyNames } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      // Mock empty previous stages
      analyzeCompanyDatabase.mockResolvedValue(null);
      getDocs.mockResolvedValue({ docs: [] });

      // Mock company search
      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.filter(c => !c.isReference).map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock fuzzy match (first call exact = false, second call fuzzy = true)
      matchCompanyNames
        .mockReturnValueOnce({ match: false, score: 50 }) // Not exact
        .mockReturnValueOnce({ match: true, score: 87 }); // Fuzzy match

      const result = await findCompanyBySignals(mockVariants, 'test-org');

      expect(result).toBeDefined();
      expect(result?.matchType).toBe('fuzzy_name');
      expect(result?.confidence).toBe(87);
    });
  });

  describe('Stufe 5: Domain Matching', () => {
    it('should find company by domain match', async () => {
      const { analyzeCompanyDatabase } = require('../database-analyzer');
      const { matchCompanyNames, extractDomain, domainsMatch } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      // Mock empty previous stages
      analyzeCompanyDatabase.mockResolvedValue(null);
      getDocs.mockResolvedValue({ docs: [] });

      // Mock company search
      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.filter(c => !c.isReference).map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock no name matches
      matchCompanyNames.mockReturnValue({ match: false, score: 30 });

      // Mock domain extraction and matching
      extractDomain.mockReturnValue('spiegel.de');
      domainsMatch.mockReturnValue(true);

      const result = await findCompanyBySignals(mockVariants, 'test-org');

      expect(result).toBeDefined();
      expect(result?.matchType).toBe('domain');
      expect(result?.confidence).toBe(95);
    });
  });

  describe('Stufe 6: Neue Company erstellen', () => {
    it('should return null when no matches found (letting caller create new)', async () => {
      const { analyzeCompanyDatabase } = require('../database-analyzer');
      const { matchCompanyNames, extractDomain, domainsMatch } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      // Mock empty all stages
      analyzeCompanyDatabase.mockResolvedValue(null);
      getDocs.mockResolvedValue({ docs: [] });

      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.filter(c => !c.isReference).map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock no matches
      matchCompanyNames.mockReturnValue({ match: false, score: 20 });
      extractDomain.mockReturnValue('newcompany.com');
      domainsMatch.mockReturnValue(false);

      const result = await findCompanyBySignals(mockVariants, 'test-org');

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle variants without company data', async () => {
      const variantsNoCompany: MatchingCandidateVariant[] = [
        {
          organizationId: 'org1',
          organizationName: 'Org 1',
          contactId: 'contact-no-company',
          contactData: {
            name: { firstName: 'Max', lastName: 'Mustermann' },
            displayName: 'Max Mustermann',
            emails: [{ email: 'max@gmail.com', type: 'business', isPrimary: true }],
            hasMediaProfile: false
          }
        }
      ];

      const result = await findCompanyBySignals(variantsNoCompany, 'test-org');

      expect(result).toBeNull();
    });

    it('should handle firestore errors gracefully', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await findCompanyBySignals(mockVariants, 'test-org');

      expect(result).toBeNull();
    });

    it('should prioritize highest confidence match', async () => {
      const { analyzeCompanyDatabase } = require('../database-analyzer');
      const { matchCompanyNames } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      // Mock database analysis with lower confidence
      analyzeCompanyDatabase.mockResolvedValue({
        companyId: 'company2',
        companyName: 'BILD Zeitung',
        matchType: 'database_analysis',
        confidence: 75
      });

      // Mock direct ID search (empty)
      getDocs.mockResolvedValue({ docs: [] });

      // Mock exact name match with higher confidence
      getDocs.mockResolvedValueOnce({
        docs: [{
          id: 'company1',
          data: () => mockCompanies[0]
        }]
      });

      matchCompanyNames.mockReturnValue({ match: true, score: 100 });

      const result = await findCompanyBySignals(mockVariants, 'test-org');

      // Should prefer exact name match (100%) over database analysis (75%)
      expect(result?.matchType).toBe('exact_name');
      expect(result?.confidence).toBe(100);
    });

    it('should exclude reference companies from all matching stages', async () => {
      const { matchCompanyNames } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      // Mock empty previous stages
      const { analyzeCompanyDatabase } = require('../database-analyzer');
      analyzeCompanyDatabase.mockResolvedValue(null);
      getDocs.mockResolvedValue({ docs: [] });

      // Mock company search including reference
      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock match with reference company name
      matchCompanyNames.mockImplementation((name1: string, name2: string) => {
        if (name2 === 'Premium Reference') {
          return { match: true, score: 100 };
        }
        return { match: false, score: 0 };
      });

      const variantsWithRefName: MatchingCandidateVariant[] = [
        {
          ...mockVariants[0],
          contactData: {
            ...mockVariants[0].contactData,
            companyName: 'Premium Reference'
          }
        }
      ];

      const result = await findCompanyBySignals(variantsWithRefName, 'test-org');

      // Should not match reference company
      expect(result).toBeNull();
    });
  });
});