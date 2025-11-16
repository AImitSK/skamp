import { ReportDataCollector } from '../../core/data-collector';
import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { brandingService } from '@/lib/firebase/branding-service';
import type { PRCampaign } from '@/types/pr';
import type { EmailCampaignSend } from '@/types/email';
import type { MediaClipping } from '@/types/monitoring';
import type { BrandingSettings } from '@/types/branding';
import { Timestamp } from 'firebase/firestore';

// Mock alle Firebase Services
jest.mock('@/lib/firebase/pr-service');
jest.mock('@/lib/firebase/email-campaign-service');
jest.mock('@/lib/firebase/clipping-service');
jest.mock('@/lib/firebase/branding-service');

describe('ReportDataCollector', () => {
  let collector: ReportDataCollector;
  const testCampaignId = 'campaign-123';
  const testOrganizationId = 'org-456';

  beforeEach(() => {
    collector = new ReportDataCollector();
    jest.clearAllMocks();
  });

  describe('collect', () => {
    it('sollte Campaign nicht gefunden Error werfen wenn Campaign nicht existiert', async () => {
      (prService.getById as jest.Mock).mockResolvedValue(null);

      await expect(
        collector.collect(testCampaignId, testOrganizationId)
      ).rejects.toThrow('Kampagne nicht gefunden');

      expect(prService.getById).toHaveBeenCalledWith(testCampaignId);
    });

    it('sollte alle Daten parallel sammeln und zusammenführen', async () => {
      const sentAtDate = new Date('2024-01-15T10:00:00Z');
      const sentAtTimestamp = {
        toDate: () => sentAtDate
      } as any;

      const mockCampaign: Partial<PRCampaign> = {
        id: testCampaignId,
        title: 'Test Campaign',
        sentAt: sentAtTimestamp
      };

      const mockSends: EmailCampaignSend[] = [
        {
          id: 'send-1',
          campaignId: testCampaignId,
          contactId: 'contact-1',
          email: 'test@example.com',
          status: 'delivered',
          sentAt: Timestamp.fromDate(new Date('2024-01-15T10:05:00Z'))
        } as EmailCampaignSend
      ];

      const mockClippings: MediaClipping[] = [
        {
          id: 'clipping-1',
          campaignId: testCampaignId,
          outletName: 'Test Outlet',
          reach: 10000,
          sentiment: 'positive',
          publishedAt: Timestamp.fromDate(new Date('2024-01-16T08:00:00Z'))
        } as MediaClipping
      ];

      const mockBranding: BrandingSettings = {
        organizationId: testOrganizationId,
        primaryColor: '#FF5733',
        companyName: 'Test Company'
      } as BrandingSettings;

      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (emailCampaignService.getSends as jest.Mock).mockResolvedValue(mockSends);
      (clippingService.getByCampaignId as jest.Mock).mockResolvedValue(mockClippings);
      (brandingService.getBrandingSettings as jest.Mock).mockResolvedValue(mockBranding);

      const result = await collector.collect(testCampaignId, testOrganizationId);

      expect(result).toEqual({
        campaignId: testCampaignId,
        organizationId: testOrganizationId,
        campaignTitle: 'Test Campaign',
        sentAt: sentAtDate,
        sends: mockSends,
        clippings: mockClippings,
        branding: mockBranding
      });

      expect(emailCampaignService.getSends).toHaveBeenCalledWith(
        testCampaignId,
        { organizationId: testOrganizationId }
      );
      expect(clippingService.getByCampaignId).toHaveBeenCalledWith(
        testCampaignId,
        { organizationId: testOrganizationId }
      );
      expect(brandingService.getBrandingSettings).toHaveBeenCalledWith(testOrganizationId);
    });

    it('sollte Fallback-Werte verwenden wenn Campaign.title fehlt', async () => {
      const sentAtTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      } as any;

      const mockCampaign: Partial<PRCampaign> = {
        id: testCampaignId,
        title: undefined,
        sentAt: sentAtTimestamp
      };

      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (emailCampaignService.getSends as jest.Mock).mockResolvedValue([]);
      (clippingService.getByCampaignId as jest.Mock).mockResolvedValue([]);
      (brandingService.getBrandingSettings as jest.Mock).mockResolvedValue(null);

      const result = await collector.collect(testCampaignId, testOrganizationId);

      expect(result.campaignTitle).toBe('Monitoring Report');
    });

    it('sollte aktuelles Datum verwenden wenn Campaign.sentAt fehlt', async () => {
      const mockCampaign: Partial<PRCampaign> = {
        id: testCampaignId,
        title: 'Test Campaign',
        sentAt: undefined
      };

      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (emailCampaignService.getSends as jest.Mock).mockResolvedValue([]);
      (clippingService.getByCampaignId as jest.Mock).mockResolvedValue([]);
      (brandingService.getBrandingSettings as jest.Mock).mockResolvedValue(null);

      const beforeCall = new Date();
      const result = await collector.collect(testCampaignId, testOrganizationId);
      const afterCall = new Date();

      expect(result.sentAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.sentAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('sollte leere Arrays zurückgeben wenn Email Sends fehlschlagen', async () => {
      const sentAtTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      } as any;

      const mockCampaign: Partial<PRCampaign> = {
        id: testCampaignId,
        title: 'Test Campaign',
        sentAt: sentAtTimestamp
      };

      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (emailCampaignService.getSends as jest.Mock).mockRejectedValue(
        new Error('Firestore error')
      );
      (clippingService.getByCampaignId as jest.Mock).mockResolvedValue([]);
      (brandingService.getBrandingSettings as jest.Mock).mockResolvedValue(null);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await collector.collect(testCampaignId, testOrganizationId);

      expect(result.sends).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der Email Sends:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('sollte leere Arrays zurückgeben wenn Clippings fehlschlagen', async () => {
      const sentAtTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      } as any;

      const mockCampaign: Partial<PRCampaign> = {
        id: testCampaignId,
        title: 'Test Campaign',
        sentAt: sentAtTimestamp
      };

      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (emailCampaignService.getSends as jest.Mock).mockResolvedValue([]);
      (clippingService.getByCampaignId as jest.Mock).mockRejectedValue(
        new Error('Firestore error')
      );
      (brandingService.getBrandingSettings as jest.Mock).mockResolvedValue(null);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await collector.collect(testCampaignId, testOrganizationId);

      expect(result.clippings).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Fehler beim Laden der Clippings:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('sollte null zurückgeben wenn Branding fehlschlägt', async () => {
      const mockCampaign: Partial<PRCampaign> = {
        id: testCampaignId,
        title: 'Test Campaign',
        sentAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z'))
      };

      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (emailCampaignService.getSends as jest.Mock).mockResolvedValue([]);
      (clippingService.getByCampaignId as jest.Mock).mockResolvedValue([]);
      (brandingService.getBrandingSettings as jest.Mock).mockRejectedValue(
        new Error('Branding not found')
      );

      const result = await collector.collect(testCampaignId, testOrganizationId);

      expect(result.branding).toBeNull();
    });

    it('sollte alle Fehler-Fälle kombiniert handhaben', async () => {
      const sentAtTimestamp = {
        toDate: () => new Date('2024-01-15T10:00:00Z')
      } as any;

      const mockCampaign: Partial<PRCampaign> = {
        id: testCampaignId,
        title: 'Test Campaign',
        sentAt: sentAtTimestamp
      };

      (prService.getById as jest.Mock).mockResolvedValue(mockCampaign);
      (emailCampaignService.getSends as jest.Mock).mockRejectedValue(new Error('Sends error'));
      (clippingService.getByCampaignId as jest.Mock).mockRejectedValue(
        new Error('Clippings error')
      );
      (brandingService.getBrandingSettings as jest.Mock).mockRejectedValue(
        new Error('Branding error')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await collector.collect(testCampaignId, testOrganizationId);

      expect(result.sends).toEqual([]);
      expect(result.clippings).toEqual([]);
      expect(result.branding).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);

      consoleWarnSpy.mockRestore();
    });
  });
});
