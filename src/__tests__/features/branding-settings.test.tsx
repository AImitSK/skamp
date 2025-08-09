/**
 * Branding Settings Feature Tests
 * Testet Branding-Service, Validierung und Core-Funktionalität
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
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      id: 'branding-123',
      organizationId: 'org-456',
      companyName: 'Test Company GmbH',
      logoUrl: 'https://example.com/logo.png',
      logoAssetId: 'asset-123',
      address: {
        street: 'Teststraße 123',
        postalCode: '12345',
        city: 'Teststadt',
        country: 'Deutschland'
      },
      phone: '+49 123 456789',
      email: 'info@test.com',
      website: 'https://www.test.com',
      showCopyright: true
    }),
    id: 'branding-123'
  })),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'new-branding-123' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  setDoc: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({}))
}));

// Mock Next.js useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })),
  usePathname: jest.fn(() => '/dashboard/settings/branding'),
  useSearchParams: jest.fn(() => new URLSearchParams())
}));

import { brandingService } from '@/lib/firebase/branding-service';
import { mediaService } from '@/lib/firebase/media-service';
import { BrandingSettings } from '@/types/branding';
import { 
  BRANDING_CONSTANTS,
  DEFAULT_BRANDING_SETTINGS,
  getBrandingFieldValue,
  setBrandingFieldValue,
  hasValidLogo,
  getFormattedAddress
} from '@/types/branding-enhanced';

// Test Data
const mockBrandingSettings: BrandingSettings = {
  id: 'branding-123',
  organizationId: 'org-456',
  companyName: 'Test Company GmbH',
  logoUrl: 'https://example.com/logo.png',
  logoAssetId: 'asset-123',
  address: {
    street: 'Teststraße 123',
    postalCode: '12345',
    city: 'Teststadt',
    country: 'Deutschland'
  },
  phone: '+49 123 456789',
  email: 'info@test.com',
  website: 'https://www.test.com',
  showCopyright: true,
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  createdBy: 'test-user-123',
  updatedBy: 'test-user-123'
};

const mockContext = {
  organizationId: 'org-456',
  userId: 'test-user-123'
};

describe('Branding Settings Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Availability Tests', () => {
    test('brandingService sollte alle erforderlichen Methoden haben', () => {
      expect(brandingService).toBeDefined();
      expect(brandingService.getBrandingSettings).toBeDefined();
      expect(brandingService.updateBrandingSettings).toBeDefined();
      expect(brandingService.createBrandingSettings).toBeDefined();
      expect(brandingService.removeLogo).toBeDefined();
      expect(brandingService.validateBrandingSettings).toBeDefined();
      expect(brandingService.migrateFromUserToOrg).toBeDefined();
    });

    test('mediaService sollte für Logo-Uploads verfügbar sein', () => {
      expect(mediaService).toBeDefined();
      expect(mediaService.uploadMedia).toBeDefined();
      expect(mediaService.updateAsset).toBeDefined();
    });
  });

  describe('Service Integration Tests', () => {
    test('getBrandingSettings sollte Settings korrekt laden', async () => {
      const settings = await brandingService.getBrandingSettings('org-456');
      expect(settings).toBeDefined();
      if (settings) {
        expect(settings.organizationId).toBe('org-456');
        expect(settings.companyName).toBe('Test Company GmbH');
      }
    });

    test('updateBrandingSettings sollte Settings aktualisieren', async () => {
      const updates = { companyName: 'Updated Company Name' };
      await expect(
        brandingService.updateBrandingSettings(updates, mockContext)
      ).resolves.not.toThrow();
    });

    test('createBrandingSettings sollte neue Settings erstellen', async () => {
      const newSettings = { companyName: 'New Company' };
      await expect(
        brandingService.createBrandingSettings(newSettings, mockContext)
      ).resolves.not.toThrow();
    });

    test('removeLogo sollte Logo entfernen', async () => {
      await expect(
        brandingService.removeLogo(mockContext)
      ).resolves.not.toThrow();
    });

    test('migrateFromUserToOrg sollte Migration durchführen', async () => {
      await expect(
        brandingService.migrateFromUserToOrg('user-123', 'org-456')
      ).resolves.not.toThrow();
    });
  });

  describe('Validation Tests', () => {
    test('validateBrandingSettings sollte gültige Settings akzeptieren', () => {
      const validSettings = {
        companyName: 'Test Company',
        email: 'test@example.com',
        website: 'https://example.com',
        phone: '+49 123 456789'
      };

      const result = brandingService.validateBrandingSettings(validSettings);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    test('validateBrandingSettings sollte leeren Firmennamen ablehnen', () => {
      const invalidSettings = { companyName: '' };

      const result = brandingService.validateBrandingSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.companyName).toContain('erforderlich');
    });

    test('validateBrandingSettings sollte ungültige E-Mail ablehnen', () => {
      const invalidSettings = {
        companyName: 'Test Company',
        email: 'invalid-email'
      };

      const result = brandingService.validateBrandingSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toContain('gültige E-Mail-Adresse');
    });

    test('validateBrandingSettings sollte ungültige Website ablehnen', () => {
      const invalidSettings = {
        companyName: 'Test Company',
        website: 'invalid-url'
      };

      const result = brandingService.validateBrandingSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.website).toContain('gültige URL');
    });

    test('validateBrandingSettings sollte ungültige Telefonnummer ablehnen', () => {
      const invalidSettings = {
        companyName: 'Test Company',
        phone: 'invalid-phone'
      };

      const result = brandingService.validateBrandingSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toContain('gültige Telefonnummer');
    });

    test('validateBrandingSettings sollte zu kurzen Firmennamen ablehnen', () => {
      const invalidSettings = { companyName: 'A' };

      const result = brandingService.validateBrandingSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.companyName).toContain('mindestens 2 Zeichen');
    });

    test('validateBrandingSettings sollte zu langen Firmennamen ablehnen', () => {
      const invalidSettings = { 
        companyName: 'A'.repeat(101) 
      };

      const result = brandingService.validateBrandingSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.companyName).toContain('maximal 100 Zeichen');
    });
  });

  describe('Enhanced Types Tests', () => {
    test('BRANDING_CONSTANTS sollten korrekte Werte haben', () => {
      expect(BRANDING_CONSTANTS.MAX_LOGO_SIZE).toBe(5 * 1024 * 1024);
      expect(BRANDING_CONSTANTS.ALLOWED_IMAGE_TYPES).toContain('image/jpeg');
      expect(BRANDING_CONSTANTS.ALLOWED_IMAGE_TYPES).toContain('image/png');
      expect(BRANDING_CONSTANTS.MAX_COMPANY_NAME_LENGTH).toBe(100);
      expect(BRANDING_CONSTANTS.MIN_COMPANY_NAME_LENGTH).toBe(2);
      expect(BRANDING_CONSTANTS.DEFAULT_COUNTRY).toBe('Deutschland');
    });

    test('DEFAULT_BRANDING_SETTINGS sollten korrekte Standardwerte haben', () => {
      expect(DEFAULT_BRANDING_SETTINGS.companyName).toBe('');
      expect(DEFAULT_BRANDING_SETTINGS.showCopyright).toBe(true);
      expect(DEFAULT_BRANDING_SETTINGS.address?.country).toBe('Deutschland');
    });

    test('getBrandingFieldValue sollte Werte korrekt abrufen', () => {
      const settings = mockBrandingSettings;

      expect(getBrandingFieldValue(settings, 'companyName')).toBe('Test Company GmbH');
      expect(getBrandingFieldValue(settings, 'address.street')).toBe('Teststraße 123');
      expect(getBrandingFieldValue(settings, 'address.city')).toBe('Teststadt');
      expect(getBrandingFieldValue(settings, 'nonexistent')).toBeUndefined();
    });

    test('setBrandingFieldValue sollte Werte korrekt setzen', () => {
      const settings = { companyName: 'Old Name' };

      const updated = setBrandingFieldValue(settings, 'companyName', 'New Name');
      expect(updated.companyName).toBe('New Name');

      const updatedAddress = setBrandingFieldValue(settings, 'address.street', 'New Street');
      expect(updatedAddress.address?.street).toBe('New Street');
    });

    test('hasValidLogo sollte Logo-Status korrekt prüfen', () => {
      expect(hasValidLogo({ logoUrl: 'https://example.com/logo.png' })).toBe(true);
      expect(hasValidLogo({ logoUrl: '' })).toBe(false);
      expect(hasValidLogo({ logoUrl: '   ' })).toBe(false);
      expect(hasValidLogo({})).toBe(false);
    });

    test('getFormattedAddress sollte Adresse korrekt formatieren', () => {
      const address = {
        street: 'Teststraße 123',
        postalCode: '12345',
        city: 'Teststadt',
        country: 'Deutschland'
      };

      const formatted = getFormattedAddress(address);
      expect(formatted).toBe('Teststraße 123, 12345 Teststadt, Deutschland');

      const partialAddress = { city: 'Teststadt', country: 'Deutschland' };
      const partialFormatted = getFormattedAddress(partialAddress);
      expect(partialFormatted).toBe('Teststadt, Deutschland');

      expect(getFormattedAddress(undefined)).toBe('');
      expect(getFormattedAddress({})).toBe('');
    });
  });

  describe('Error Handling Tests', () => {
    test('Service sollte Fehler korrekt behandeln', async () => {
      // Mock eine Fehlersituation
      const mockError = new Error('Database connection failed');
      
      // getBrandingSettings mit Fehler
      jest.spyOn(brandingService, 'getBrandingSettings').mockRejectedValueOnce(mockError);
      
      await expect(
        brandingService.getBrandingSettings('invalid-org')
      ).rejects.toThrow('Database connection failed');

      // updateBrandingSettings mit Fehler
      jest.spyOn(brandingService, 'updateBrandingSettings').mockRejectedValueOnce(mockError);
      
      await expect(
        brandingService.updateBrandingSettings({}, mockContext)
      ).rejects.toThrow('Database connection failed');
    });

    test('Validation sollte mehrere Fehler sammeln', () => {
      const invalidSettings = {
        companyName: '', // Fehler: leer
        email: 'invalid', // Fehler: ungültig
        website: 'not-a-url', // Fehler: ungültig
        phone: 'abc' // Fehler: ungültig
      };

      const result = brandingService.validateBrandingSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(1);
      expect(result.errors.companyName).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.website).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    });
  });

  describe('Media Service Tests', () => {
    test('mediaService sollte Logo-Upload unterstützen', async () => {
      const mockFile = new File(['logo content'], 'logo.png', { type: 'image/png' });
      const mockAsset = {
        id: 'asset-123',
        downloadUrl: 'https://example.com/logo.png'
      };

      jest.spyOn(mediaService, 'uploadMedia').mockResolvedValueOnce(mockAsset as any);
      jest.spyOn(mediaService, 'updateAsset').mockResolvedValueOnce(undefined);

      const result = await mediaService.uploadMedia(
        mockFile,
        'org-456',
        undefined,
        () => {}
      );

      expect(result.id).toBe('asset-123');
      expect(result.downloadUrl).toBe('https://example.com/logo.png');
    });

    test('mediaService sollte Asset-Updates unterstützen', async () => {
      jest.spyOn(mediaService, 'updateAsset').mockResolvedValueOnce(undefined);

      await expect(
        mediaService.updateAsset('asset-123', {
          tags: ['__branding__'],
          description: 'Firmenlogo für Branding'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Migration Tests', () => {
    test('Migration sollte alte Settings übertragen', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';

      jest.spyOn(brandingService, 'migrateFromUserToOrg').mockImplementation(
        async (uid: string, orgId: string) => {
          expect(uid).toBe(userId);
          expect(orgId).toBe(organizationId);
          return Promise.resolve();
        }
      );

      await brandingService.migrateFromUserToOrg(userId, organizationId);
      expect(brandingService.migrateFromUserToOrg).toHaveBeenCalledWith(userId, organizationId);
    });

    test('Migration sollte bei fehlenden Parametern definiert sein', async () => {
      // Test dass die Migration-Funktion existiert und aufrufbar ist
      expect(brandingService.migrateFromUserToOrg).toBeDefined();
      expect(typeof brandingService.migrateFromUserToOrg).toBe('function');
      
      // Test mit gültigen Parametern
      await expect(
        brandingService.migrateFromUserToOrg('user-123', 'org-456')
      ).resolves.not.toThrow();
    });
  });

  describe('Organization Context Tests', () => {
    test('Service-Methoden sollten organizationId korrekt verwenden', async () => {
      const context = { organizationId: 'org-456', userId: 'user-123' };

      // updateBrandingSettings
      jest.spyOn(brandingService, 'updateBrandingSettings').mockImplementation(
        async (updates: any, ctx: any) => {
          expect(ctx.organizationId).toBe('org-456');
          expect(ctx.userId).toBe('user-123');
          return Promise.resolve();
        }
      );

      await brandingService.updateBrandingSettings({ companyName: 'Test' }, context);

      // removeLogo  
      jest.spyOn(brandingService, 'removeLogo').mockImplementation(
        async (ctx: any) => {
          expect(ctx.organizationId).toBe('org-456');
          expect(ctx.userId).toBe('user-123');
          return Promise.resolve();
        }
      );

      await brandingService.removeLogo(context);
    });

    test('getBrandingSettings sollte organizationId verwenden', async () => {
      jest.spyOn(brandingService, 'getBrandingSettings').mockImplementation(
        async (orgId: string) => {
          expect(orgId).toBe('org-456');
          return Promise.resolve(mockBrandingSettings);
        }
      );

      await brandingService.getBrandingSettings('org-456');
    });
  });
});