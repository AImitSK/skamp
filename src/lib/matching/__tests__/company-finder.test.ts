/**
 * Tests für Company Finder
 *
 * Testet das komplette Company-Matching System mit findOrCreateCompany
 */

import { MatchingCandidateVariant } from '../../../types/matching';
import { findOrCreateCompany, CompanyMatchResult } from '../company-finder';

// Mock Dependencies
jest.mock('../database-analyzer', () => ({
  analyzeDatabaseSignals: jest.fn()
}));

jest.mock('../string-similarity', () => ({
  findBestCompanyMatches: jest.fn()
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

jest.mock('@/lib/firebase/crm-service-enhanced', () => ({
  companiesEnhancedService: {
    create: jest.fn()
  }
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
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console.logs in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Database Analysis Match', () => {
    it('should find company via database analysis with high confidence', async () => {
      const { analyzeDatabaseSignals } = require('../database-analyzer');
      const { getDocs } = require('firebase/firestore');

      // Mock companies in database
      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock database analysis result
      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: { id: 'company1', name: 'Der Spiegel Verlag' },
        confidence: 0.95,
        evidence: { emailDomainMatches: 5, websiteMatches: 3 }
      });

      const result = await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      expect(result.companyId).toBe('company1');
      expect(result.companyName).toBe('Der Spiegel Verlag');
      expect(result.method).toBe('database_analysis');
      expect(result.confidence).toBe('high');
      expect(result.wasCreated).toBe(false);
    });

    it('should use medium confidence for scores between 0.7 and 0.9', async () => {
      const { analyzeDatabaseSignals } = require('../database-analyzer');
      const { getDocs } = require('firebase/firestore');

      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: { id: 'company1', name: 'Der Spiegel Verlag' },
        confidence: 0.75,
        evidence: {}
      });

      const result = await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      expect(result.confidence).toBe('medium');
      expect(result.method).toBe('database_analysis');
    });
  });

  describe('Fuzzy Name Matching', () => {
    it('should find company via fuzzy match when DB analysis fails', async () => {
      const { analyzeDatabaseSignals } = require('../database-analyzer');
      const { findBestCompanyMatches } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      // Mock companies
      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock low DB analysis confidence
      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: null,
        confidence: 0.5,
        evidence: {}
      });

      // Mock fuzzy match success
      findBestCompanyMatches.mockReturnValue([
        {
          id: 'company1',
          name: 'Der Spiegel Verlag',
          score: 88
        }
      ]);

      const result = await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      expect(result.companyId).toBe('company1');
      expect(result.method).toBe('fuzzy_match');
      expect(result.confidence).toBe('medium');
      expect(result.wasCreated).toBe(false);
    });

    it('should use high confidence for fuzzy match >= 90%', async () => {
      const { analyzeDatabaseSignals } = require('../database-analyzer');
      const { findBestCompanyMatches } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: null,
        confidence: 0.5,
        evidence: {}
      });

      findBestCompanyMatches.mockReturnValue([
        {
          id: 'company1',
          name: 'Der Spiegel Verlag',
          score: 92
        }
      ]);

      const result = await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      expect(result.confidence).toBe('high');
    });
  });

  describe('Exact Name Match', () => {
    it('should find company via exact name match', async () => {
      const { analyzeDatabaseSignals } = require('../database-analyzer');
      const { findBestCompanyMatches } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');

      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      // Mock failed previous stages
      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: null,
        confidence: 0.5,
        evidence: {}
      });

      findBestCompanyMatches.mockReturnValue([]);

      const result = await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      expect(result.companyId).toBe('company1');
      expect(result.companyName).toBe('Der Spiegel Verlag');
      expect(result.method).toBe('exact_match');
      expect(result.confidence).toBe('high');
      expect(result.wasCreated).toBe(false);
    });
  });

  describe('Create New Company', () => {
    it('should create new company when no match found', async () => {
      const { analyzeDatabaseSignals } = require('../database-analyzer');
      const { findBestCompanyMatches } = require('../string-similarity');
      const { getDocs } = require('firebase/firestore');
      const { companiesEnhancedService } = require('@/lib/firebase/crm-service-enhanced');

      // Mock no existing companies
      getDocs.mockResolvedValueOnce({ docs: [] });

      // Mock service create
      companiesEnhancedService.create.mockResolvedValue('new-company-id');

      const result = await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      expect(result.companyId).toBe('new-company-id');
      expect(result.companyName).toBe('Der Spiegel Verlag');
      expect(result.method).toBe('created_new');
      expect(result.confidence).toBe('low');
      expect(result.wasCreated).toBe(true);

      expect(companiesEnhancedService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Der Spiegel Verlag',
          organizationId: 'org1',
          isReference: false
        }),
        expect.objectContaining({
          organizationId: 'org1',
          userId: 'user1',
          autoGlobalMode: false
        })
      );
    });

    it('should handle autoGlobalMode correctly', async () => {
      const { getDocs } = require('firebase/firestore');
      const { companiesEnhancedService } = require('@/lib/firebase/crm-service-enhanced');

      getDocs.mockResolvedValueOnce({ docs: [] });
      companiesEnhancedService.create.mockResolvedValue('new-company-id');

      await findOrCreateCompany(mockVariants, 'org1', 'user1', true);

      expect(companiesEnhancedService.create).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          autoGlobalMode: true
        })
      );
    });
  });

  describe('Reference Company Filtering', () => {
    it('should exclude reference companies from matching', async () => {
      const { analyzeDatabaseSignals } = require('../database-analyzer');
      const { getDocs } = require('firebase/firestore');

      const companiesWithRef = [
        ...mockCompanies,
        {
          id: 'ref-company',
          name: 'Premium Reference',
          isReference: true
        }
      ];

      getDocs.mockResolvedValueOnce({
        docs: companiesWithRef.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: null,
        confidence: 0.5,
        evidence: {}
      });

      await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      // Verify analyzeDatabaseSignals was called with filtered companies (no references)
      expect(analyzeDatabaseSignals).toHaveBeenCalledWith(
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({ id: 'company1' }),
          expect.objectContaining({ id: 'company2' })
        ]),
        'org1'
      );

      // Should not contain reference company
      const callArgs = analyzeDatabaseSignals.mock.calls[0][1];
      expect(callArgs.find((c: any) => c.id === 'ref-company')).toBeUndefined();
    });

    it('should exclude companies with ref- prefix in ID', async () => {
      const { getDocs } = require('firebase/firestore');

      const companiesWithRefPattern = [
        ...mockCompanies,
        {
          id: 'ref-123',
          name: 'Company with ref ID',
          isReference: false // not marked as reference, but has ref- pattern
        }
      ];

      getDocs.mockResolvedValueOnce({
        docs: companiesWithRefPattern.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      const { analyzeDatabaseSignals } = require('../database-analyzer');
      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: null,
        confidence: 0.5,
        evidence: {}
      });

      await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      const callArgs = analyzeDatabaseSignals.mock.calls[0][1];
      expect(callArgs.find((c: any) => c.id === 'ref-123')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle variants without company name', async () => {
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

      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValueOnce({ docs: [] });

      const result = await findOrCreateCompany(variantsNoCompany, 'org1', 'user1', false);

      expect(result.companyId).toBeNull();
      expect(result.companyName).toBeNull();
      expect(result.confidence).toBe('none');
      expect(result.method).toBe('none');
      expect(result.wasCreated).toBe(false);
    });

    it('should handle firestore errors gracefully', async () => {
      const { getDocs } = require('firebase/firestore');
      getDocs.mockRejectedValue(new Error('Firestore error'));

      const { companiesEnhancedService } = require('@/lib/firebase/crm-service-enhanced');
      companiesEnhancedService.create.mockResolvedValue('new-company-id');

      const result = await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      // Should fallback to creating new company
      expect(result.wasCreated).toBe(true);
      expect(result.method).toBe('created_new');
    });

    it('should handle deleted companies correctly', async () => {
      const { getDocs } = require('firebase/firestore');

      const companiesWithDeleted = [
        ...mockCompanies,
        {
          id: 'deleted-company',
          name: 'Deleted Company',
          deletedAt: new Date(),
          isReference: false
        }
      ];

      getDocs.mockResolvedValueOnce({
        docs: companiesWithDeleted.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      const { analyzeDatabaseSignals } = require('../database-analyzer');
      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: null,
        confidence: 0.5,
        evidence: {}
      });

      await findOrCreateCompany(mockVariants, 'org1', 'user1', false);

      const callArgs = analyzeDatabaseSignals.mock.calls[0][1];
      expect(callArgs.find((c: any) => c.id === 'deleted-company')).toBeUndefined();
    });
  });

  describe('Signal Extraction', () => {
    it('should extract signals from multiple variants', async () => {
      const multiVariants: MatchingCandidateVariant[] = [
        {
          organizationId: 'org1',
          organizationName: 'Org 1',
          contactId: 'contact1',
          contactData: {
            name: { firstName: 'Max', lastName: 'Mustermann' },
            displayName: 'Max Mustermann',
            companyName: 'Der Spiegel Verlag',
            emails: [{ email: 'max@spiegel.de', type: 'business', isPrimary: true }],
            website: 'https://spiegel.de',
            companyId: 'existing-company',
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

      const { getDocs } = require('firebase/firestore');
      const { analyzeDatabaseSignals } = require('../database-analyzer');

      getDocs.mockResolvedValueOnce({
        docs: mockCompanies.map(company => ({
          id: company.id,
          data: () => company
        }))
      });

      analyzeDatabaseSignals.mockResolvedValue({
        topMatch: null,
        confidence: 0.5,
        evidence: {}
      });

      await findOrCreateCompany(multiVariants, 'org1', 'user1', false);

      // Verify signals were extracted and passed to analyzer
      const callArgs = analyzeDatabaseSignals.mock.calls[0][0];

      // Should have extracted email domains
      expect(callArgs.emailDomains).toContain('spiegel.de');

      // Should have extracted websites
      expect(callArgs.websites).toContain('spiegel.de');

      // Should have extracted company names
      expect(callArgs.companyNames).toContain('Der Spiegel Verlag');
      expect(callArgs.companyNames).toContain('Spiegel Verlag GmbH');

      // Should have extracted company IDs
      expect(callArgs.companyIds).toContain('existing-company');
    });
  });
});
