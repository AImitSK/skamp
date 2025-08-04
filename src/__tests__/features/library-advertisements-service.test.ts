// src/__tests__/features/library-advertisements-service.test.ts

import { advertisementService } from '@/lib/firebase/library-service';
import type { Advertisement, AdvertisementType, PriceModel } from '@/types/library';

// Mock Firebase
jest.mock('@/lib/firebase/client-init', () => ({
  db: {},
}));

// Mock-Daten
const mockAdvertisement: Advertisement = {
  id: 'test-ad-1',
  organizationId: 'org-1',
  name: 'Test Anzeige',
  displayName: 'Premium Display Anzeige',
  type: 'display_banner' as AdvertisementType,
  status: 'active',
  publicationIds: ['pub-1', 'pub-2'],
  description: 'Eine Test-Anzeige für Unit Tests',
  specifications: {
    format: 'digital',
    digitalSpecs: {
      dimensions: { width: 728, height: 90 },
      fileFormats: ['jpg', 'png', 'gif'],
      maxFileSize: 150
    }
  },
  pricing: {
    priceModel: 'cpm' as PriceModel,
    listPrice: { amount: 15.50, currency: 'EUR' },
    discounts: {
      volume: [
        { threshold: 10, discountPercent: 5 },
        { threshold: 50, discountPercent: 10 }
      ],
      agency: 15,
      earlyBooking: {
        daysInAdvance: 30,
        discountPercent: 5
      }
    },
    surcharges: [
      { type: 'Premium Platzierung', amount: { amount: 25, currency: 'EUR' } }
    ]
  },
  availability: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    blackoutDates: [
      {
        start: new Date('2024-12-24'),
        end: new Date('2024-12-26'),
        reason: 'Weihnachtspause'
      }
    ]
  },
  materials: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user-1',
  updatedBy: 'user-1'
};

const mockContext = {
  organizationId: 'org-1',
  userId: 'user-1'
};

describe('AdvertisementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('sollte ein neues Werbemittel erstellen', async () => {
      // Mock der create-Methode
      const createSpy = jest.spyOn(advertisementService, 'create').mockResolvedValue('new-ad-id');

      const newAdData = {
        ...mockAdvertisement,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        createdBy: undefined,
        updatedBy: undefined
      };

      const result = await advertisementService.create(newAdData, mockContext);

      expect(result).toBe('new-ad-id');
      expect(createSpy).toHaveBeenCalledWith(newAdData, mockContext);
    });

    it('sollte Fehler werfen bei fehlendem Namen', async () => {
      const createSpy = jest.spyOn(advertisementService, 'create').mockImplementation(async (data) => {
        if (!data.name?.trim()) {
          throw new Error('Name ist erforderlich');
        }
        return 'test-id';
      });

      const invalidData = { ...mockAdvertisement, name: '', id: undefined };

      await expect(advertisementService.create(invalidData, mockContext))
        .rejects.toThrow('Name ist erforderlich');
    });

    it('sollte Fehler werfen bei fehlenden Publikationen', async () => {
      const createSpy = jest.spyOn(advertisementService, 'create').mockImplementation(async (data) => {
        if (!data.publicationIds || data.publicationIds.length === 0) {
          throw new Error('Mindestens eine Publikation muss zugeordnet werden');
        }
        return 'test-id';
      });

      const invalidData = { ...mockAdvertisement, publicationIds: [], id: undefined };

      await expect(advertisementService.create(invalidData, mockContext))
        .rejects.toThrow('Mindestens eine Publikation muss zugeordnet werden');
    });
  });

  describe('calculatePrice', () => {
    it('sollte Basispreis ohne Rabatte berechnen', () => {
      const result = advertisementService.calculatePrice(mockAdvertisement, {});

      expect(result.basePrice).toBe(15.50);
      expect(result.totalPrice).toBe(40.50); // 15.50 + 25 Aufpreis
      expect(result.currency).toBe('EUR');
      expect(result.discounts).toHaveLength(0);
      expect(result.surcharges).toHaveLength(1);
    });

    it('sollte Mengenrabatt korrekt anwenden', () => {
      const result = advertisementService.calculatePrice(mockAdvertisement, {
        quantity: 15
      });

      expect(result.discounts).toHaveLength(1);
      expect(result.discounts[0].type).toBe('Mengenrabatt');
      expect(result.discounts[0].percent).toBe(5);
      expect(result.discounts[0].amount).toBeCloseTo(0.775); // 5% von 15.50
    });

    it('sollte höchsten Mengenrabatt bei mehreren Schwellen anwenden', () => {
      const result = advertisementService.calculatePrice(mockAdvertisement, {
        quantity: 60
      });

      expect(result.discounts).toHaveLength(1);
      expect(result.discounts[0].percent).toBe(10); // Höherer Rabatt
    });

    it('sollte Agenturprovision anwenden', () => {
      const result = advertisementService.calculatePrice(mockAdvertisement, {
        isAgency: true
      });

      expect(result.discounts.some(d => d.type === 'Agenturprovision')).toBe(true);
      const agencyDiscount = result.discounts.find(d => d.type === 'Agenturprovision');
      expect(agencyDiscount?.percent).toBe(15);
    });

    it('sollte Frühbucherrabatt anwenden', () => {
      const result = advertisementService.calculatePrice(mockAdvertisement, {
        daysInAdvance: 35
      });

      expect(result.discounts.some(d => d.type === 'Frühbucherrabatt')).toBe(true);
    });

    it('sollte mehrere Rabatte kombinieren', () => {
      const result = advertisementService.calculatePrice(mockAdvertisement, {
        quantity: 20,
        isAgency: true,
        daysInAdvance: 40
      });

      expect(result.discounts).toHaveLength(3);
      expect(result.discounts.some(d => d.type === 'Mengenrabatt')).toBe(true);
      expect(result.discounts.some(d => d.type === 'Agenturprovision')).toBe(true);
      expect(result.discounts.some(d => d.type === 'Frühbucherrabatt')).toBe(true);
    });

    it('sollte Preis mit Menge multiplizieren', () => {
      const singleResult = advertisementService.calculatePrice(mockAdvertisement, {});
      const multipleResult = advertisementService.calculatePrice(mockAdvertisement, {
        quantity: 3
      });

      expect(multipleResult.totalPrice).toBeCloseTo(singleResult.totalPrice * 3);
    });
  });

  describe('isAvailable', () => {
    it('sollte true für verfügbare Termine zurückgeben', () => {
      const testDate = new Date('2024-06-15');
      const result = advertisementService.isAvailable(mockAdvertisement, testDate);

      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('sollte false für Datum vor Startdatum zurückgeben', () => {
      const testDate = new Date('2023-12-15');
      const result = advertisementService.isAvailable(mockAdvertisement, testDate);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Verfügbar ab');
    });

    it('sollte false für Datum nach Enddatum zurückgeben', () => {
      const testDate = new Date('2025-01-15');
      const result = advertisementService.isAvailable(mockAdvertisement, testDate);

      expect(result.available).toBe(false);
      expect(result.reason).toContain('Nur verfügbar bis');
    });

    it('sollte false für Blackout-Dates zurückgeben', () => {
      const testDate = new Date('2024-12-25'); // Weihnachten
      const result = advertisementService.isAvailable(mockAdvertisement, testDate);

      expect(result.available).toBe(false);
      expect(result.reason).toBe('Weihnachtspause');
    });
  });

  describe('searchAdvertisements', () => {
    beforeEach(() => {
      // Mock getAll to return test data
      jest.spyOn(advertisementService, 'getAll').mockResolvedValue([
        mockAdvertisement,
        {
          ...mockAdvertisement,
          id: 'test-ad-2',
          name: 'Banner Anzeige',
          type: 'banner' as AdvertisementType,
          pricing: {
            ...mockAdvertisement.pricing,
            listPrice: { amount: 25.00, currency: 'EUR' }
          }
        }
      ]);
    });

    it('sollte nach Namen suchen', async () => {
      const searchSpy = jest.spyOn(advertisementService, 'searchAdvertisements').mockImplementation(
        async (orgId, filters) => {
          const allAds = await advertisementService.getAll(orgId);
          if (filters.search) {
            return allAds.filter(ad => 
              ad.name.toLowerCase().includes(filters.search!.toLowerCase())
            );
          }
          return allAds;
        }
      );

      const result = await advertisementService.searchAdvertisements('org-1', {
        search: 'Banner'
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Banner Anzeige');
    });

    it('sollte nach Typ filtern', async () => {
      const searchSpy = jest.spyOn(advertisementService, 'searchAdvertisements').mockImplementation(
        async (orgId, filters) => {
          const allAds = await advertisementService.getAll(orgId);
          if (filters.types) {
            return allAds.filter(ad => filters.types!.includes(ad.type));
          }
          return allAds;
        }
      );

      const result = await advertisementService.searchAdvertisements('org-1', {
        types: ['banner']
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('banner');
    });

    it('sollte nach Preisbereich filtern', async () => {
      const searchSpy = jest.spyOn(advertisementService, 'searchAdvertisements').mockImplementation(
        async (orgId, filters) => {
          const allAds = await advertisementService.getAll(orgId);
          let filtered = allAds;
          
          if (filters.minPrice !== undefined) {
            filtered = filtered.filter(ad => ad.pricing.listPrice.amount >= filters.minPrice!);
          }
          if (filters.maxPrice !== undefined) {
            filtered = filtered.filter(ad => ad.pricing.listPrice.amount <= filters.maxPrice!);
          }
          
          return filtered;
        }
      );

      const result = await advertisementService.searchAdvertisements('org-1', {
        minPrice: 20.00
      });

      expect(result).toHaveLength(1);
      expect(result[0].pricing.listPrice.amount).toBe(25.00);
    });
  });

  describe('duplicate', () => {
    it('sollte Werbemittel duplizieren', async () => {
      const getByIdSpy = jest.spyOn(advertisementService, 'getById').mockResolvedValue(mockAdvertisement);
      const createSpy = jest.spyOn(advertisementService, 'create').mockResolvedValue('duplicated-ad-id');

      const result = await advertisementService.duplicate('test-ad-1', mockContext, {
        newName: 'Kopierte Anzeige'
      });

      expect(result).toBe('duplicated-ad-id');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Kopierte Anzeige',
          status: 'draft'
        }),
        mockContext
      );
    });

    it('sollte Fehler werfen wenn Original nicht gefunden', async () => {
      jest.spyOn(advertisementService, 'getById').mockResolvedValue(null);

      await expect(advertisementService.duplicate('non-existent', mockContext))
        .rejects.toThrow('Werbemittel nicht gefunden');
    });
  });
});