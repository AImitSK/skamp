/**
 * Integration Tests für Matching Service
 *
 * Testet die Hauptfunktion importCandidateWithAutoMatching
 */

import { importCandidateWithAutoMatching } from '../matching-service';

// Mock all dependencies
jest.mock('@/lib/matching/company-finder', () => ({
  findCompanyBySignals: jest.fn()
}));

jest.mock('@/lib/matching/publication-finder', () => ({
  findPublications: jest.fn()
}));

jest.mock('@/lib/matching/enrichment-engine', () => ({
  enrichCompanyData: jest.fn(),
  enrichPublicationData: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  Timestamp: {
    now: jest.fn(() => 'mock-timestamp')
  }
}));

jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

describe('Matching Service Integration', () => {
  const mockCandidate = {
    id: 'candidate123',
    variants: [
      {
        organizationId: 'org1',
        organizationName: 'Org 1',
        contactData: {
          name: { firstName: 'Max', lastName: 'Mustermann' },
          displayName: 'Max Mustermann',
          companyName: 'Der Spiegel Verlag',
          emails: [{ email: 'max@spiegel.de', isPrimary: true }],
          hasMediaProfile: true,
          publications: ['Der Spiegel']
        }
      },
      {
        organizationId: 'org2',
        organizationName: 'Org 2',
        contactData: {
          name: { firstName: 'Max', lastName: 'Mustermann' },
          displayName: 'Max Mustermann',
          companyName: 'Spiegel Verlag GmbH',
          emails: [{ email: 'max.mustermann@spiegel.de', isPrimary: true }],
          hasMediaProfile: true,
          publications: ['Spiegel Online']
        }
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('importCandidateWithAutoMatching', () => {
    it('should successfully import candidate with company and publication matching', async () => {
      const { getDoc, addDoc, updateDoc } = require('firebase/firestore');
      const { findCompanyBySignals } = require('@/lib/matching/company-finder');
      const { findPublications } = require('@/lib/matching/publication-finder');
      const { enrichCompanyData, enrichPublicationData } = require('@/lib/matching/enrichment-engine');

      // Mock candidate retrieval
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => mockCandidate
      });

      // Mock company matching
      findCompanyBySignals.mockResolvedValue({
        companyId: 'company123',
        companyName: 'Der Spiegel Verlag',
        matchType: 'exact_name',
        confidence: 100
      });

      // Mock publication matching
      findPublications.mockResolvedValue([
        {
          publicationId: 'pub123',
          publicationName: 'Der Spiegel',
          matchType: 'exact_name',
          confidence: 100,
          source: 'Name match'
        }
      ]);

      // Mock enrichment
      enrichCompanyData.mockResolvedValue({ enriched: true, conflicts: [] });
      enrichPublicationData.mockResolvedValue({ enriched: false, conflicts: [] });

      // Mock contact creation
      addDoc.mockResolvedValue({ id: 'contact123' });

      // Mock candidate update
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.contactId).toBe('contact123');
      expect(result.companyMatch).toEqual({
        companyId: 'company123',
        companyName: 'Der Spiegel Verlag',
        matchType: 'exact_name',
        confidence: 100,
        wasCreated: false,
        wasEnriched: true
      });
      expect(result.publicationMatches).toHaveLength(1);
      expect(result.publicationMatches?.[0].publicationId).toBe('pub123');
    });

    it('should handle company matching without publications', async () => {
      const { getDoc, addDoc, updateDoc } = require('firebase/firestore');
      const { findCompanyBySignals } = require('@/lib/matching/company-finder');
      const { enrichCompanyData } = require('@/lib/matching/enrichment-engine');

      // Mock candidate without media profile
      const candidateNoMedia = {
        ...mockCandidate,
        variants: [{
          ...mockCandidate.variants[0],
          contactData: {
            ...mockCandidate.variants[0].contactData,
            hasMediaProfile: false
          }
        }]
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => candidateNoMedia
      });

      findCompanyBySignals.mockResolvedValue({
        companyId: 'company123',
        companyName: 'Der Spiegel Verlag',
        matchType: 'fuzzy_name',
        confidence: 85
      });

      enrichCompanyData.mockResolvedValue({ enriched: false, conflicts: [] });
      addDoc.mockResolvedValue({ id: 'contact123' });
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.companyMatch).toBeDefined();
      expect(result.publicationMatches).toBeUndefined(); // No publications
    });

    it('should handle contact without company', async () => {
      const { getDoc, addDoc, updateDoc } = require('firebase/firestore');
      const { findCompanyBySignals } = require('@/lib/matching/company-finder');

      // Mock candidate without company
      const candidateNoCompany = {
        ...mockCandidate,
        variants: [{
          ...mockCandidate.variants[0],
          contactData: {
            name: { firstName: 'Max', lastName: 'Mustermann' },
            displayName: 'Max Mustermann',
            emails: [{ email: 'max@freelancer.com', isPrimary: true }],
            hasMediaProfile: false
          }
        }]
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => candidateNoCompany
      });

      // No company found
      findCompanyBySignals.mockResolvedValue(null);

      addDoc.mockResolvedValue({ id: 'contact123' });
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.contactId).toBe('contact123');
      expect(result.companyMatch).toBeUndefined();
      expect(result.publicationMatches).toBeUndefined();
    });

    it('should handle candidate not found', async () => {
      const { getDoc } = require('firebase/firestore');

      getDoc.mockResolvedValueOnce({
        exists: () => false
      });

      const result = await importCandidateWithAutoMatching({
        candidateId: 'nonexistent',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Kandidat nicht gefunden');
    });

    it('should handle errors gracefully', async () => {
      const { getDoc } = require('firebase/firestore');

      getDoc.mockRejectedValue(new Error('Database error'));

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should enforce strict company-publication hierarchy', async () => {
      const { getDoc, addDoc, updateDoc } = require('firebase/firestore');
      const { findCompanyBySignals } = require('@/lib/matching/company-finder');
      const { findPublications } = require('@/lib/matching/publication-finder');

      // Mock candidate WITH media profile but NO company
      const candidateMediaNoCompany = {
        ...mockCandidate,
        variants: [{
          ...mockCandidate.variants[0],
          contactData: {
            name: { firstName: 'Max', lastName: 'Mustermann' },
            displayName: 'Max Mustermann',
            emails: [{ email: 'max@freelancer.com', isPrimary: true }],
            hasMediaProfile: true,
            publications: ['Independent Blog']
          }
        }]
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => candidateMediaNoCompany
      });

      // No company found
      findCompanyBySignals.mockResolvedValue(null);

      addDoc.mockResolvedValue({ id: 'contact123' });
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.companyMatch).toBeUndefined();
      expect(result.publicationMatches).toBeUndefined(); // NO publications without company

      // findPublications should NOT be called if no company
      expect(findPublications).not.toHaveBeenCalled();
    });

    it('should include enrichment results in response', async () => {
      const { getDoc, addDoc, updateDoc } = require('firebase/firestore');
      const { findCompanyBySignals } = require('@/lib/matching/company-finder');
      const { findPublications } = require('@/lib/matching/publication-finder');
      const { enrichCompanyData, enrichPublicationData } = require('@/lib/matching/enrichment-engine');

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => mockCandidate
      });

      findCompanyBySignals.mockResolvedValue({
        companyId: 'company123',
        companyName: 'Der Spiegel Verlag',
        matchType: 'database_analysis',
        confidence: 95
      });

      findPublications.mockResolvedValue([
        {
          publicationId: 'pub123',
          publicationName: 'Der Spiegel',
          matchType: 'fuzzy_name',
          confidence: 90,
          source: 'Fuzzy match'
        }
      ]);

      // Mock enrichment with conflicts
      enrichCompanyData.mockResolvedValue({
        enriched: true,
        conflicts: [{ field: 'address', action: 'flagged_for_review' }]
      });

      enrichPublicationData.mockResolvedValue({
        enriched: true,
        conflicts: []
      });

      addDoc.mockResolvedValue({ id: 'contact123' });
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.companyMatch?.wasEnriched).toBe(true);
      expect(result.publicationMatches?.[0].wasEnriched).toBe(true);
    });
  });
});