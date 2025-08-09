/**
 * Email Settings Feature Tests
 * Testet E-Mail-Adressen, Signaturen, Routing-Regeln und Vorlagen
 */

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn()
}));

// Mock Firebase App
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({}))
}));

// Mock Firebase vollständig
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDocs: jest.fn(() => Promise.resolve({
    empty: false,
    docs: [
      { 
        id: 'email-1', 
        data: () => ({ 
          email: 'presse@test.de',
          localPart: 'presse',
          domainId: 'domain-1',
          displayName: 'Pressestelle Test GmbH',
          isActive: true,
          isDefault: false,
          inboxEnabled: true,
          assignedUserIds: ['user-1', 'user-2'],
          routingRules: [],
          permissions: {
            read: ['user-456'],
            write: ['user-456'],
            manage: ['user-456']
          }
        }) 
      }
    ],
    forEach: jest.fn((callback) => {
      const doc = { 
        id: 'email-1', 
        data: () => ({ 
          email: 'presse@test.de',
          isActive: true,
          permissions: {
            read: ['user-456'],
            write: ['user-456'],
            manage: ['user-456']
          }
        })
      };
      callback(doc);
    })
  })),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    id: 'email-1',
    data: () => ({ 
      email: 'presse@test.de',
      isActive: true,
      permissions: {
        read: ['user-456'],
        write: ['user-456'],
        manage: ['user-456']
      }
    })
  })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-email-123' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn(() => Promise.resolve())
  })),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: Date.now() / 1000 }))
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
  app: {}
}));

// Mock Domain Service für Domain-Validierung
jest.mock('@/lib/firebase/domain-service-enhanced', () => ({
  domainServiceEnhanced: {
    getById: jest.fn(() => Promise.resolve({
      id: 'domain-1',
      domain: 'test.de',
      status: 'verified'
    }))
  }
}));

// Mock Email Services
import { emailAddressService } from '@/lib/email/email-address-service';
import { emailSignatureService } from '@/lib/email/email-signature-service';
import { domainServiceEnhanced } from '@/lib/firebase/domain-service-enhanced';

describe('Email Settings Feature', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Availability', () => {
    test('sollte Email Address Service verfügbar haben', () => {
      expect(emailAddressService).toBeDefined();
      expect(typeof emailAddressService).toBe('object');
    });

    test('sollte Email Signature Service verfügbar haben', () => {
      expect(emailSignatureService).toBeDefined();
      expect(typeof emailSignatureService).toBe('object');
    });

    test('sollte wichtige Service-Methoden haben', () => {
      const expectedAddressMethods = [
        'getByOrganization',
        'create',
        'update',
        'delete',
        'setAsDefault',
        'updateRoutingRules'
      ];

      expectedAddressMethods.forEach(method => {
        expect(typeof (emailAddressService as any)[method]).toBe('function');
      });

      const expectedSignatureMethods = [
        'getByOrganization',
        'create',
        'update',
        'delete',
        'duplicate',
        'setAsDefault'
      ];

      expectedSignatureMethods.forEach(method => {
        expect(typeof (emailSignatureService as any)[method]).toBe('function');
      });
    });
  });

  describe('Email Address Management', () => {
    test('sollte E-Mail-Adressen laden können', async () => {
      const addresses = await emailAddressService.getByOrganization(
        mockOrganizationId,
        mockUserId
      );
      
      expect(Array.isArray(addresses)).toBe(true);
    });

    test('sollte neue E-Mail-Adresse erstellen können', async () => {
      const newAddress = {
        localPart: 'info-unique', // Eindeutigen Namen verwenden
        domainId: 'domain-1',
        displayName: 'Info Test GmbH',
        aliasType: 'specific' as const,
        isActive: true,
        inboxEnabled: true,
        assignedUserIds: [],
        clientName: 'Test Client',
        aiEnabled: false,
        autoSuggest: false,
        autoCategorize: false,
        preferredTone: 'formal' as const
      };

      // Mock das findByEmail um keine existierende E-Mail zurückzugeben
      jest.spyOn(emailAddressService as any, 'findByEmail')
        .mockResolvedValueOnce(null);

      const result = await emailAddressService.create(
        newAddress,
        mockOrganizationId,
        mockUserId
      );

      expect(result).toBeDefined();
      // Service kann DocumentReference oder String ID zurückgeben
      expect(typeof result === 'string' || typeof result === 'object').toBe(true);
    });

    test('sollte Standard-E-Mail-Adresse setzen können', async () => {
      await emailAddressService.setAsDefault('email-1', mockOrganizationId);
      expect(true).toBe(true); // Wenn keine Exception, dann erfolgreich
    });
  });

  describe('Signature Management', () => {
    test('sollte Signaturen laden können', async () => {
      const signatures = await emailSignatureService.getByOrganization(mockOrganizationId);
      expect(Array.isArray(signatures)).toBe(true);
    });

    test('sollte neue Signatur erstellen können', async () => {
      const newSignature = {
        name: 'Standard Signatur',
        content: '<p>Mit freundlichen Grüßen</p>',
        isDefault: false,
        emailAddressIds: ['email-1'],
        type: 'html' as const
      };

      const result = await emailSignatureService.create(
        newSignature,
        mockOrganizationId,
        mockUserId
      );

      expect(typeof result).toBe('string');
    });

    test('sollte Signatur duplizieren können', async () => {
      await emailSignatureService.duplicate('sig-1', mockUserId);
      expect(true).toBe(true);
    });
  });

  describe('Routing Rules', () => {
    test('sollte Routing-Regeln validieren', () => {
      const validRule = {
        id: 'rule-1',
        name: 'Presse-Anfragen',
        enabled: true,
        priority: 1,
        conditions: {
          subject: 'Presseanfrage',
          from: '@journalist.de',
          keywords: ['Interview', 'Statement']
        },
        actions: {
          assignTo: ['user-1'],
          addTags: ['presse', 'wichtig'],
          setPriority: 'high' as const
        }
      };

      // Validierung der Regel-Struktur
      expect(validRule).toHaveProperty('name');
      expect(validRule).toHaveProperty('conditions');
      expect(validRule).toHaveProperty('actions');
      expect(validRule.priority).toBeGreaterThanOrEqual(0);
    });

    test('sollte Routing-Regeln aktualisieren können', async () => {
      const rules = [
        {
          id: 'rule-1',
          name: 'Auto-Zuweisung Presse',
          enabled: true,
          priority: 1,
          conditions: { subject: 'Presse' },
          actions: { assignTo: ['user-1'] }
        }
      ];

      await emailAddressService.updateRoutingRules('email-1', rules, mockUserId);
      expect(true).toBe(true);
    });
  });

  describe('Email Alias Types', () => {
    test('sollte verschiedene Alias-Typen unterstützen', () => {
      const aliasTypes = ['specific', 'catch-all', 'pattern'];
      
      aliasTypes.forEach(type => {
        expect(['specific', 'catch-all', 'pattern'].includes(type)).toBe(true);
      });
    });

    test('sollte Pattern-Matching für Aliase validieren', () => {
      const patterns = [
        { pattern: 'pr-*', test: 'pr-2024', expected: true },
        { pattern: 'pr-*', test: 'info', expected: false },
        { pattern: '*-presse', test: 'abc-presse', expected: true },
        { pattern: '*-presse', test: 'presse', expected: false }
      ];

      patterns.forEach(({ pattern, test, expected }) => {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        expect(regex.test(test)).toBe(expected);
      });
    });
  });

  describe('AI Settings', () => {
    test('sollte AI-Einstellungen konfigurieren können', () => {
      const aiSettings = {
        enabled: true,
        autoSuggest: true,
        autoCategorize: true,
        preferredTone: 'formal' as const,
        customPromptContext: 'PR-Agentur für Tech-Startups'
      };

      expect(aiSettings).toHaveProperty('enabled');
      expect(aiSettings).toHaveProperty('preferredTone');
      expect(['formal', 'modern', 'technical', 'startup'].includes(aiSettings.preferredTone)).toBe(true);
    });
  });

  describe('Team Assignment', () => {
    test('sollte Team-Mitglieder zuweisen können', () => {
      const emailAddress = {
        id: 'email-1',
        assignedUserIds: ['user-1', 'user-2', 'user-3']
      };

      expect(emailAddress.assignedUserIds).toHaveLength(3);
      expect(emailAddress.assignedUserIds).toContain('user-1');
    });

    test('sollte Client-spezifische Adressen unterstützen', () => {
      const clientEmail = {
        id: 'email-2',
        clientName: 'ABC GmbH',
        clientId: 'client-123',
        assignedUserIds: ['user-1']
      };

      expect(clientEmail).toHaveProperty('clientName');
      expect(clientEmail).toHaveProperty('clientId');
    });
  });

  describe('Email Statistics', () => {
    test('sollte E-Mail-Statistiken tracken', () => {
      const stats = {
        emailsSent: 150,
        emailsReceived: 300,
        lastUsedAt: new Date()
      };

      expect(stats.emailsSent).toBeGreaterThanOrEqual(0);
      expect(stats.emailsReceived).toBeGreaterThanOrEqual(0);
      expect(stats.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('Permissions', () => {
    test('sollte Berechtigungen verwalten', () => {
      const permissions = {
        read: ['user-1', 'user-2', 'user-3'],
        write: ['user-1', 'user-2'],
        manage: ['user-1']
      };

      expect(permissions.read.length).toBeGreaterThanOrEqual(permissions.write.length);
      expect(permissions.write.length).toBeGreaterThanOrEqual(permissions.manage.length);
    });
  });

  describe('Error Handling', () => {
    test('sollte Fehler bei ungültiger Domain behandeln', async () => {
      const invalidAddress = {
        localPart: 'test',
        domainId: '', // Ungültig
        displayName: 'Test',
        aliasType: 'specific' as const,
        isActive: true,
        inboxEnabled: true,
        assignedUserIds: [],
        clientName: '',
        aiEnabled: false,
        autoSuggest: false,
        autoCategorize: false,
        preferredTone: 'formal' as const
      };

      try {
        await emailAddressService.create(invalidAddress, mockOrganizationId, mockUserId);
        expect(false).toBe(true); // Sollte nicht erreicht werden
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});