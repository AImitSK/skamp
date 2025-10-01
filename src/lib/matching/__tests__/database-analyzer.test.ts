/**
 * Tests für Database Analyzer
 *
 * Testet die Analyse von bestehenden Daten zum Lernen von Company-Patterns
 */

import { analyzeCompanyDatabase } from '../database-analyzer';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn()
}));

// Mock Firebase config
jest.mock('@/lib/firebase/config', () => ({
  db: {}
}));

// Mock string similarity
jest.mock('../string-similarity', () => ({
  extractDomain: jest.fn((input: string) => {
    if (input === 'max@spiegel.de') return 'spiegel.de';
    if (input === 'journalist@bild.de') return 'bild.de';
    if (input === 'editor@sz.de') return 'sz.de';
    if (input === 'test@faz.net') return 'faz.net';
    return null;
  }),
  domainsMatch: jest.fn((domain1: string, domain2: string) => {
    return domain1 === domain2;
  })
}));

describe('Database Analyzer', () => {
  // Mock data
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
      id: 'company3',
      name: 'Süddeutsche Zeitung',
      website: 'https://sz.de',
      isReference: false
    },
    {
      id: 'ref-company1',
      name: 'Premium Reference Company',
      isReference: true
    }
  ];

  const mockContacts = [
    {
      id: 'contact1',
      emails: [{ email: 'max@spiegel.de', isPrimary: true }],
      companyId: 'company1',
      companyName: 'Der Spiegel Verlag'
    },
    {
      id: 'contact2',
      emails: [{ email: 'anna@spiegel.de', isPrimary: true }],
      companyId: 'company1',
      companyName: 'Spiegel Verlag'
    },
    {
      id: 'contact3',
      emails: [{ email: 'journalist@bild.de', isPrimary: true }],
      companyId: 'company2',
      companyName: 'BILD'
    },
    {
      id: 'contact4',
      emails: [{ email: 'editor@sz.de', isPrimary: true }],
      companyId: 'company3',
      companyName: 'SZ'
    },
    {
      id: 'contact5',
      emails: [{ email: 'test@faz.net', isPrimary: true }],
      companyId: null, // Kein Link
      companyName: 'FAZ'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCompanyDatabase', () => {
    it('should find company by email domain match', async () => {
      // Mock Firestore responses
      const { getDocs } = require('firebase/firestore');

      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.filter(c => !c.isReference).map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: mockContacts.map(contact => ({
            id: contact.id,
            data: () => contact
          }))
        });

      const signals = {
        companyNames: ['Der Spiegel'],
        emailDomains: ['spiegel.de'],
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      expect(result).toBeDefined();
      expect(result?.companyId).toBe('company1');
      expect(result?.companyName).toBe('Der Spiegel Verlag');
      expect(result?.matchType).toBe('database_analysis');
      expect(result?.confidence).toBeGreaterThan(70);
    });

    it('should exclude reference companies', async () => {
      const { getDocs } = require('firebase/firestore');

      // Include reference company in first query response
      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: mockContacts.map(contact => ({
            id: contact.id,
            data: () => contact
          }))
        });

      const signals = {
        companyNames: ['Premium Reference Company'],
        emailDomains: [],
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      // Should not match reference company
      expect(result?.companyName).not.toBe('Premium Reference Company');
    });

    it('should calculate confidence based on contact count', async () => {
      const { getDocs } = require('firebase/firestore');

      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.filter(c => !c.isReference).map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: mockContacts.map(contact => ({
            id: contact.id,
            data: () => contact
          }))
        });

      const signals = {
        companyNames: [],
        emailDomains: ['spiegel.de'], // 2 contacts have spiegel.de
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      expect(result).toBeDefined();
      expect(result?.confidence).toBeGreaterThan(80); // 2 contacts = higher confidence
    });

    it('should prefer companies with more matching contacts', async () => {
      const { getDocs } = require('firebase/firestore');

      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.filter(c => !c.isReference).map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: [
            // 2 contacts for spiegel.de
            ...mockContacts.filter(c => c.emails[0].email.includes('spiegel.de')),
            // 1 contact for bild.de
            ...mockContacts.filter(c => c.emails[0].email.includes('bild.de'))
          ].map(contact => ({
            id: contact.id,
            data: () => contact
          }))
        });

      const signals = {
        companyNames: [],
        emailDomains: ['spiegel.de', 'bild.de'],
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      expect(result).toBeDefined();
      // Should prefer Spiegel (2 contacts) over BILD (1 contact)
      expect(result?.companyName).toBe('Der Spiegel Verlag');
    });

    it('should handle website matching', async () => {
      const { getDocs } = require('firebase/firestore');

      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.filter(c => !c.isReference).map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: []
        });

      const signals = {
        companyNames: [],
        emailDomains: [],
        websites: ['https://spiegel.de']
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      expect(result).toBeDefined();
      expect(result?.companyName).toBe('Der Spiegel Verlag');
      expect(result?.matchType).toBe('website');
    });

    it('should return null if no matches found', async () => {
      const { getDocs } = require('firebase/firestore');

      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.filter(c => !c.isReference).map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: []
        });

      const signals = {
        companyNames: ['Apple Inc'],
        emailDomains: ['apple.com'],
        websites: ['https://apple.com']
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      expect(result).toBeNull();
    });

    it('should handle empty signals', async () => {
      const signals = {
        companyNames: [],
        emailDomains: [],
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      expect(result).toBeNull();
    });

    it('should handle contacts without company links correctly', async () => {
      const { getDocs } = require('firebase/firestore');

      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.filter(c => !c.isReference).map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: [
            // Contact without companyId (should be ignored for linking)
            {
              id: 'contact5',
              data: () => ({
                id: 'contact5',
                emails: [{ email: 'test@faz.net', isPrimary: true }],
                companyId: null,
                companyName: 'FAZ'
              })
            }
          ]
        });

      const signals = {
        companyNames: [],
        emailDomains: ['faz.net'],
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      // Should not find match because contact has no companyId
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle firestore errors gracefully', async () => {
      const { getDocs } = require('firebase/firestore');

      getDocs.mockRejectedValue(new Error('Firestore error'));

      const signals = {
        companyNames: ['Test Company'],
        emailDomains: ['test.com'],
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      expect(result).toBeNull();
    });

    it('should handle malformed contact data', async () => {
      const { getDocs } = require('firebase/firestore');

      getDocs
        .mockResolvedValueOnce({
          docs: mockCompanies.filter(c => !c.isReference).map(company => ({
            id: company.id,
            data: () => company
          }))
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'bad-contact',
              data: () => ({
                id: 'bad-contact',
                emails: null, // Malformed
                companyId: 'company1'
              })
            }
          ]
        });

      const signals = {
        companyNames: [],
        emailDomains: ['spiegel.de'],
        websites: []
      };

      const result = await analyzeCompanyDatabase(signals, 'test-org');

      // Should handle gracefully and return null
      expect(result).toBeNull();
    });
  });
});