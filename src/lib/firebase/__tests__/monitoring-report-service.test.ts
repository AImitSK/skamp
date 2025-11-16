import type { RawReportData } from '@/lib/monitoring-report/core/data-collector';
import type { EmailStats, ClippingStats, TimelineData } from '@/lib/monitoring-report/types';

// Mock Firestore BEFORE any imports that use it
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, collection, id) => ({ _path: `${collection}/${id}` })),
  getDoc: jest.fn(),
  getFirestore: jest.fn(() => ({})),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date
    }))
  }
}));

jest.mock('@/lib/firebase/client-init', () => ({
  db: {}
}));

jest.mock('@/lib/monitoring-report/core/data-collector');
jest.mock('@/lib/monitoring-report/core/stats-calculator');
jest.mock('@/lib/monitoring-report/core/timeline-builder');
jest.mock('@/lib/monitoring-report/generators/html-generator');
jest.mock('@/lib/monitoring-report/generators/pdf-generator');
jest.mock('@/lib/monitoring-report/delivery/download-handler');
jest.mock('@/lib/firebase/media-service');

const mockFirestore = require('firebase/firestore');

import { monitoringReportService } from '../monitoring-report-service';
import { reportDataCollector } from '@/lib/monitoring-report/core/data-collector';
import { reportStatsCalculator } from '@/lib/monitoring-report/core/stats-calculator';
import { timelineBuilder } from '@/lib/monitoring-report/core/timeline-builder';
import { htmlGenerator } from '@/lib/monitoring-report/generators/html-generator';
import { pdfGenerator } from '@/lib/monitoring-report/generators/pdf-generator';
import { downloadHandler } from '@/lib/monitoring-report/delivery/download-handler';
import { mediaService } from '@/lib/firebase/media-service';

describe('monitoringReportService', () => {
  const testCampaignId = 'campaign-123';
  const testOrganizationId = 'org-456';
  const testUserId = 'user-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('collectReportData', () => {
    it('sollte alle Daten sammeln und Report-Daten zusammenführen', async () => {
      const mockRawData: RawReportData = {
        campaignId: testCampaignId,
        organizationId: testOrganizationId,
        campaignTitle: 'Test Campaign',
        sentAt: new Date('2024-01-15T10:00:00Z'),
        sends: [],
        clippings: [],
        branding: null
      };

      const mockEmailStats: EmailStats = {
        totalSent: 100,
        delivered: 95,
        opened: 50,
        clicked: 20,
        bounced: 5,
        openRate: 50,
        clickRate: 40,
        ctr: 20,
        conversionRate: 10
      };

      const mockClippingStats: ClippingStats = {
        totalClippings: 10,
        totalReach: 100000,
        totalAVE: 50000,
        avgReach: 10000,
        sentimentDistribution: {
          positive: 7,
          neutral: 2,
          negative: 1
        },
        topOutlets: [],
        outletTypeDistribution: []
      };

      const mockTimeline: TimelineData[] = [
        { date: '15. Jan. 2024', clippings: 3, reach: 30000 }
      ];

      (reportDataCollector.collect as jest.Mock).mockResolvedValue(mockRawData);
      (reportStatsCalculator.calculateEmailStats as jest.Mock).mockReturnValue(mockEmailStats);
      (reportStatsCalculator.calculateClippingStats as jest.Mock).mockReturnValue(
        mockClippingStats
      );
      (timelineBuilder.buildTimeline as jest.Mock).mockReturnValue(mockTimeline);

      const result = await monitoringReportService.collectReportData(
        testCampaignId,
        testOrganizationId
      );

      expect(result).toMatchObject({
        campaignId: testCampaignId,
        organizationId: testOrganizationId,
        reportTitle: 'Test Campaign',
        emailStats: mockEmailStats,
        clippingStats: mockClippingStats,
        timeline: mockTimeline
      });

      expect(reportDataCollector.collect).toHaveBeenCalledWith(
        testCampaignId,
        testOrganizationId
      );
      expect(reportStatsCalculator.calculateEmailStats).toHaveBeenCalledWith(
        mockRawData.sends,
        mockRawData.clippings
      );
      expect(reportStatsCalculator.calculateClippingStats).toHaveBeenCalledWith(
        mockRawData.clippings
      );
      expect(timelineBuilder.buildTimeline).toHaveBeenCalledWith(mockRawData.clippings);
    });

    it('sollte Report-Period von sentAt bis jetzt setzen', async () => {
      const sentAt = new Date('2024-01-15T10:00:00Z');

      const mockRawData: RawReportData = {
        campaignId: testCampaignId,
        organizationId: testOrganizationId,
        campaignTitle: 'Test Campaign',
        sentAt,
        sends: [],
        clippings: [],
        branding: null
      };

      (reportDataCollector.collect as jest.Mock).mockResolvedValue(mockRawData);
      (reportStatsCalculator.calculateEmailStats as jest.Mock).mockReturnValue({} as EmailStats);
      (reportStatsCalculator.calculateClippingStats as jest.Mock).mockReturnValue(
        {} as ClippingStats
      );
      (timelineBuilder.buildTimeline as jest.Mock).mockReturnValue([]);

      const beforeCall = new Date();
      const result = await monitoringReportService.collectReportData(
        testCampaignId,
        testOrganizationId
      );
      const afterCall = new Date();

      expect(result.reportPeriod.start).toEqual(sentAt);
      expect(result.reportPeriod.end.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.reportPeriod.end.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('generateReportHTML', () => {
    it('sollte HTML aus Report-Daten generieren', async () => {
      const mockReportData = {
        campaignId: testCampaignId,
        organizationId: testOrganizationId,
        reportTitle: 'Test Report'
      } as any;

      const mockHTML = '<html><body>Test Report</body></html>';

      (htmlGenerator.generate as jest.Mock).mockResolvedValue(mockHTML);

      const result = await monitoringReportService.generateReportHTML(mockReportData);

      expect(result).toBe(mockHTML);
      expect(htmlGenerator.generate).toHaveBeenCalledWith(mockReportData);
    });
  });

  describe('generatePDFReport', () => {
    it('sollte kompletten PDF-Report-Flow durchführen (Server-Upload)', async () => {
      const mockRawData: RawReportData = {
        campaignId: testCampaignId,
        organizationId: testOrganizationId,
        campaignTitle: 'Test Campaign',
        sentAt: new Date('2024-01-15T10:00:00Z'),
        sends: [],
        clippings: [],
        branding: null
      };

      const mockHTML = '<html><body>Test Report</body></html>';
      const mockFileName = 'Monitoring_Report_campaign-123_1234567890.pdf';
      const mockPDFResult = {
        success: true,
        needsClientUpload: false,
        pdfUrl: 'https://example.com/report.pdf'
      };

      (reportDataCollector.collect as jest.Mock).mockResolvedValue(mockRawData);
      (reportStatsCalculator.calculateEmailStats as jest.Mock).mockReturnValue({} as EmailStats);
      (reportStatsCalculator.calculateClippingStats as jest.Mock).mockReturnValue(
        {} as ClippingStats
      );
      (timelineBuilder.buildTimeline as jest.Mock).mockReturnValue([]);
      (htmlGenerator.generate as jest.Mock).mockResolvedValue(mockHTML);
      (pdfGenerator.generateFileName as jest.Mock).mockReturnValue(mockFileName);
      (pdfGenerator.generate as jest.Mock).mockResolvedValue(mockPDFResult);

      const result = await monitoringReportService.generatePDFReport(
        testCampaignId,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual({
        pdfUrl: 'https://example.com/report.pdf',
        fileSize: 0
      });

      expect(pdfGenerator.generate).toHaveBeenCalledWith(
        mockHTML,
        expect.objectContaining({
          campaignId: testCampaignId,
          organizationId: testOrganizationId,
          userId: testUserId,
          fileName: mockFileName
        })
      );

      expect(downloadHandler.upload).not.toHaveBeenCalled();
    });

    it('sollte Client-Upload durchführen wenn needsClientUpload=true', async () => {
      const mockRawData: RawReportData = {
        campaignId: testCampaignId,
        organizationId: testOrganizationId,
        campaignTitle: 'Test Campaign',
        sentAt: new Date('2024-01-15T10:00:00Z'),
        sends: [],
        clippings: [],
        branding: null
      };

      const mockHTML = '<html><body>Test Report</body></html>';
      const mockFileName = 'Monitoring_Report_campaign-123_1234567890.pdf';
      const mockPDFResult = {
        success: true,
        needsClientUpload: true,
        pdfBase64: 'base64encodedstring'
      };

      const mockFile = new File(['test'], mockFileName, { type: 'application/pdf' });

      const mockUploadResult = {
        pdfUrl: 'https://storage.example.com/report.pdf',
        fileSize: 1024
      };

      (reportDataCollector.collect as jest.Mock).mockResolvedValue(mockRawData);
      (reportStatsCalculator.calculateEmailStats as jest.Mock).mockReturnValue({} as EmailStats);
      (reportStatsCalculator.calculateClippingStats as jest.Mock).mockReturnValue(
        {} as ClippingStats
      );
      (timelineBuilder.buildTimeline as jest.Mock).mockReturnValue([]);
      (htmlGenerator.generate as jest.Mock).mockResolvedValue(mockHTML);
      (pdfGenerator.generateFileName as jest.Mock).mockReturnValue(mockFileName);
      (pdfGenerator.generate as jest.Mock).mockResolvedValue(mockPDFResult);
      (pdfGenerator.base64ToFile as jest.Mock).mockReturnValue(mockFile);
      (downloadHandler.upload as jest.Mock).mockResolvedValue(mockUploadResult);

      const result = await monitoringReportService.generatePDFReport(
        testCampaignId,
        testOrganizationId,
        testUserId
      );

      expect(result).toEqual(mockUploadResult);

      expect(pdfGenerator.base64ToFile).toHaveBeenCalledWith(
        'base64encodedstring',
        mockFileName
      );

      expect(downloadHandler.upload).toHaveBeenCalledWith(
        mockFile,
        testCampaignId,
        testOrganizationId,
        testUserId
      );
    });

    it('sollte Fehler mit Details werfen wenn Generation fehlschlägt', async () => {
      const mockError = new Error('PDF generation failed');

      (reportDataCollector.collect as jest.Mock).mockRejectedValue(mockError);

      await expect(
        monitoringReportService.generatePDFReport(
          testCampaignId,
          testOrganizationId,
          testUserId
        )
      ).rejects.toThrow('PDF-Report-Generierung fehlgeschlagen:');
    });
  });

  describe('getAnalysenFolderLink', () => {
    it('sollte Link zum Analysen-Ordner generieren', async () => {
      const mockCampaignDoc = {
        exists: () => true,
        data: () => ({
          projectId: 'project-123'
        })
      };

      const mockFolders = [
        {
          id: 'folder-project',
          name: 'P-project-1',
          parentFolderId: null
        },
        {
          id: 'folder-analysen',
          name: 'Analysen',
          parentFolderId: 'folder-project'
        }
      ];

      mockFirestore.getDoc.mockResolvedValue(mockCampaignDoc);
      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(mockFolders);

      const result = await monitoringReportService.getAnalysenFolderLink(
        testCampaignId,
        testOrganizationId
      );

      expect(result).toBe('/dashboard/projects/project-123?tab=daten&folder=folder-analysen');
    });

    it('sollte null zurückgeben wenn Campaign kein Project hat', async () => {
      const mockCampaignDoc = {
        exists: () => true,
        data: () => ({
          projectId: undefined
        })
      };

      mockFirestore.getDoc.mockResolvedValue(mockCampaignDoc);

      const result = await monitoringReportService.getAnalysenFolderLink(
        testCampaignId,
        testOrganizationId
      );

      expect(result).toBeNull();
    });

    it('sollte Fallback-Link ohne Analysen-Ordner generieren', async () => {
      const mockCampaignDoc = {
        exists: () => true,
        data: () => ({
          projectId: 'project-123'
        })
      };

      const mockFolders = [
        {
          id: 'folder-project',
          name: 'P-project-1',
          parentFolderId: null
        }
      ];

      mockFirestore.getDoc.mockResolvedValue(mockCampaignDoc);
      (mediaService.getAllFoldersForOrganization as jest.Mock).mockResolvedValue(mockFolders);

      const result = await monitoringReportService.getAnalysenFolderLink(
        testCampaignId,
        testOrganizationId
      );

      expect(result).toBe('/dashboard/projects/project-123?tab=daten');
    });

    it('sollte null bei Fehler zurückgeben', async () => {
      mockFirestore.getDoc.mockRejectedValue(new Error('Firestore error'));

      const result = await monitoringReportService.getAnalysenFolderLink(
        testCampaignId,
        testOrganizationId
      );

      expect(result).toBeNull();
    });

    it('sollte null zurückgeben wenn Campaign nicht existiert', async () => {
      const mockCampaignDoc = {
        exists: () => false,
        data: () => null
      };

      mockFirestore.getDoc.mockResolvedValue(mockCampaignDoc);

      const result = await monitoringReportService.getAnalysenFolderLink(
        testCampaignId,
        testOrganizationId
      );

      expect(result).toBeNull();
    });
  });
});
