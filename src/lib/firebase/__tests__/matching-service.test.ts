/**
 * Integration Tests für Matching Service
 *
 * Testet die Hauptfunktion importCandidateWithAutoMatching
 */

import { importCandidateWithAutoMatching } from '../matching-service';

// Mock Firebase config ZUERST (bevor matching-service importiert wird)
jest.mock('@/lib/firebase/config', () => ({
  db: {},
  storage: {}
}));

// Mock Firebase client-init
jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
  storage: {},
  auth: {},
  app: {}
}));

// Mock API Client (wird von matching-service importiert)
jest.mock('@/lib/api/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

// Mock CRM Service (wird von matching-service importiert)
jest.mock('@/lib/firebase/crm-service-enhanced', () => ({
  contactsEnhancedService: {
    create: jest.fn(),
    getAll: jest.fn()
  }
}));

// Mock Reference Service (wird von matching-service importiert)
jest.mock('@/lib/firebase/reference-service', () => ({
  referenceService: {
    createReference: jest.fn()
  }
}));

// Mock Matching Dependencies
jest.mock('@/lib/matching/company-finder', () => ({
  findCompanyBySignals: jest.fn(),
  findOrCreateCompany: jest.fn()
}));

jest.mock('@/lib/matching/publication-finder', () => ({
  findPublications: jest.fn(),
  createPublication: jest.fn()
}));

jest.mock('@/lib/matching/enrichment-engine', () => ({
  enrichCompanyData: jest.fn(),
  enrichPublicationData: jest.fn(),
  enrichCompany: jest.fn()
}));

jest.mock('@/lib/matching/data-merger', () => ({
  mergeVariantsWithAI: jest.fn()
}));

// Mock useAutoGlobal Hook
jest.mock('@/lib/hooks/useAutoGlobal', () => ({
  SUPER_ADMIN_EMAIL: 'test@example.com',
  useAutoGlobal: jest.fn(() => false)
}));

// Mock publication-helpers
jest.mock('@/lib/utils/publication-helpers', () => ({
  migrateToMonitoringConfig: jest.fn((pubData) => {
    // Simuliert Migration von alten Feldern zu monitoringConfig
    if (pubData.domain || pubData.website) {
      return {
        websiteUrl: pubData.website || `https://${pubData.domain}`,
        rssFeeds: [],
        socialMediaHandles: {}
      };
    }
    return null;
  })
}));

describe('Matching Service Integration', () => {
  // Importiere Firestore-Mocks aus globalem Setup
  const { getDoc, addDoc, updateDoc, Timestamp } = require('firebase/firestore');
  const { findOrCreateCompany } = require('@/lib/matching/company-finder');
  const { findPublications, createPublication } = require('@/lib/matching/publication-finder');
  const { enrichCompany } = require('@/lib/matching/enrichment-engine');
  const { contactsEnhancedService } = require('@/lib/firebase/crm-service-enhanced');

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
      // Mock candidate retrieval
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => mockCandidate
      });

      // Mock company matching/creation
      findOrCreateCompany.mockResolvedValue({
        companyId: 'company123',
        companyName: 'Der Spiegel Verlag',
        method: 'exact_name',
        confidence: 'high',
        wasCreated: false
      });

      // Mock company enrichment
      enrichCompany.mockResolvedValue({
        enriched: true,
        conflicts: []
      });

      // Mock getDoc für Company-Lookup (existiert bereits)
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'company123',
        data: () => ({ name: 'Der Spiegel Verlag' })
      });

      // Mock publication matching
      findPublications.mockResolvedValue([
        {
          publicationId: 'pub123',
          publicationName: 'Der Spiegel',
          matchType: 'exact_name',
          confidence: 100
        }
      ]);

      // Mock contact creation
      contactsEnhancedService.create.mockResolvedValue('contact123');

      // Mock candidate update
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        userEmail: 'test@example.com',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.contactId).toBe('contact123');
      expect(result.companyMatch).toBeDefined();
      expect(result.companyMatch?.companyId).toBe('company123');
      expect(result.companyMatch?.companyName).toBe('Der Spiegel Verlag');
      expect(result.publicationMatches).toHaveLength(1);
      expect(result.publicationMatches?.[0].publicationId).toBe('pub123');
    });

    it('should handle company matching without publications', async () => {
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

      findOrCreateCompany.mockResolvedValue({
        companyId: 'company123',
        companyName: 'Der Spiegel Verlag',
        method: 'fuzzy_name',
        confidence: 'medium',
        wasCreated: false
      });

      enrichCompany.mockResolvedValue({ enriched: false, conflicts: [] });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'company123',
        data: () => ({ name: 'Der Spiegel Verlag' })
      });

      contactsEnhancedService.create.mockResolvedValue('contact123');
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        userEmail: 'test@example.com',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.companyMatch).toBeDefined();
      expect(result.publicationMatches).toBeUndefined(); // No publications
    });

    it('should handle contact without company', async () => {
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
            // kein companyName!
          }
        }]
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => candidateNoCompany
      });

      contactsEnhancedService.create.mockResolvedValue('contact123');
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        userEmail: 'test@example.com',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.contactId).toBe('contact123');
      expect(result.companyMatch).toBeUndefined();
      expect(result.publicationMatches).toBeUndefined();
    });

    it('should handle candidate not found', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false
      });

      const result = await importCandidateWithAutoMatching({
        candidateId: 'nonexistent',
        selectedVariantIndex: 0,
        userId: 'user123',
        userEmail: 'test@example.com',
        organizationId: 'org123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Kandidat nicht gefunden');
    });

    it('should handle errors gracefully', async () => {
      getDoc.mockRejectedValue(new Error('Database error'));

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        userEmail: 'test@example.com',
        organizationId: 'org123'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should enforce strict company-publication hierarchy', async () => {
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
            // kein companyName!
          }
        }]
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => candidateMediaNoCompany
      });

      contactsEnhancedService.create.mockResolvedValue('contact123');
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        userEmail: 'test@example.com',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.companyMatch).toBeUndefined();
      expect(result.publicationMatches).toBeUndefined(); // NO publications without company

      // findPublications should NOT be called if no company
      expect(findPublications).not.toHaveBeenCalled();
    });

    it('should include enrichment results in response', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'candidate123',
        data: () => mockCandidate
      });

      findOrCreateCompany.mockResolvedValue({
        companyId: 'company123',
        companyName: 'Der Spiegel Verlag',
        method: 'database_analysis',
        confidence: 'high',
        wasCreated: false
      });

      // Mock company enrichment with conflicts
      enrichCompany.mockResolvedValue({
        enriched: true,
        conflicts: [{ field: 'address', action: 'flagged_for_review' }]
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'company123',
        data: () => ({ name: 'Der Spiegel Verlag' })
      });

      findPublications.mockResolvedValue([
        {
          publicationId: 'pub123',
          publicationName: 'Der Spiegel',
          matchType: 'fuzzy_name',
          confidence: 90
        }
      ]);

      // Mock getDoc für Publication-Lookup
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'pub123',
        data: () => ({
          name: 'Der Spiegel',
          // Alte Felder für Migration
          domain: 'spiegel.de'
        })
      });

      contactsEnhancedService.create.mockResolvedValue('contact123');
      updateDoc.mockResolvedValue(undefined);

      const result = await importCandidateWithAutoMatching({
        candidateId: 'candidate123',
        selectedVariantIndex: 0,
        userId: 'user123',
        userEmail: 'test@example.com',
        organizationId: 'org123'
      });

      expect(result.success).toBe(true);
      expect(result.companyMatch?.wasEnriched).toBe(true);
      expect(result.publicationMatches?.[0]).toBeDefined();
    });
  });
});