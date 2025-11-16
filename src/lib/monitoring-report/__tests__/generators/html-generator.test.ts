import { HTMLGenerator } from '../../generators/html-generator';
import { generateReportHTML } from '../../templates/report-template';
import type { MonitoringReportData } from '../../types';
import type { BrandingSettings } from '@/types/branding';

jest.mock('../../templates/report-template');

describe('HTMLGenerator', () => {
  let generator: HTMLGenerator;

  beforeEach(() => {
    generator = new HTMLGenerator();
    jest.clearAllMocks();
  });

  const mockReportData: MonitoringReportData = {
    campaignId: 'campaign-123',
    organizationId: 'org-456',
    reportTitle: 'Test Report',
    reportPeriod: {
      start: new Date('2024-01-15'),
      end: new Date('2024-01-31')
    },
    branding: {
      organizationId: 'org-456',
      primaryColor: '#FF5733',
      companyName: 'Test Company'
    } as BrandingSettings,
    emailStats: {
      totalSent: 100,
      delivered: 95,
      opened: 50,
      clicked: 20,
      bounced: 5,
      openRate: 50,
      clickRate: 40,
      ctr: 20,
      conversionRate: 10
    },
    clippingStats: {
      totalClippings: 10,
      totalReach: 100000,
      totalAVE: 50000,
      avgReach: 10000,
      sentimentDistribution: {
        positive: 7,
        neutral: 2,
        negative: 1
      },
      topOutlets: [
        { name: 'Outlet A', reach: 50000, clippingsCount: 5 }
      ],
      outletTypeDistribution: [
        { type: 'online', count: 6, reach: 60000, percentage: 60 }
      ]
    },
    timeline: [
      { date: '15. Jan. 2024', clippings: 3, reach: 30000 }
    ],
    clippings: [],
    sends: []
  };

  describe('generate', () => {
    it('sollte HTML aus Report-Daten generieren', async () => {
      const mockHTML = '<html><body>Test Report</body></html>';
      (generateReportHTML as jest.Mock).mockReturnValue(mockHTML);

      const result = await generator.generate(mockReportData);

      expect(result).toBe(mockHTML);
      expect(generateReportHTML).toHaveBeenCalledWith(mockReportData);
    });

    it('sollte Template-Funktion mit Report-Daten aufrufen', async () => {
      const mockHTML = '<html><body>Custom Report</body></html>';
      (generateReportHTML as jest.Mock).mockReturnValue(mockHTML);

      await generator.generate(mockReportData);

      expect(generateReportHTML).toHaveBeenCalledTimes(1);
      expect(generateReportHTML).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignId: 'campaign-123',
          organizationId: 'org-456',
          reportTitle: 'Test Report'
        })
      );
    });

    it('sollte Fehler vom Template propagieren', async () => {
      const templateError = new Error('Template rendering failed');
      (generateReportHTML as jest.Mock).mockImplementation(() => {
        throw templateError;
      });

      await expect(generator.generate(mockReportData)).rejects.toThrow(
        'Template rendering failed'
      );
    });
  });

  describe('generateWithTemplate', () => {
    it('sollte Custom-Template-Funktion verwenden', async () => {
      const customTemplate = jest.fn().mockReturnValue(
        '<html><body>Custom Template</body></html>'
      );

      const result = await generator.generateWithTemplate(
        mockReportData,
        customTemplate
      );

      expect(result).toBe('<html><body>Custom Template</body></html>');
      expect(customTemplate).toHaveBeenCalledWith(mockReportData);
      expect(generateReportHTML).not.toHaveBeenCalled();
    });

    it('sollte Report-Daten an Custom-Template übergeben', async () => {
      const customTemplate = jest.fn((data: MonitoringReportData) => {
        return `<html><body>${data.reportTitle}</body></html>`;
      });

      const result = await generator.generateWithTemplate(
        mockReportData,
        customTemplate
      );

      expect(result).toBe('<html><body>Test Report</body></html>');
      expect(customTemplate).toHaveBeenCalledWith(mockReportData);
    });

    it('sollte Fehler vom Custom-Template propagieren', async () => {
      const customTemplate = jest.fn().mockImplementation(() => {
        throw new Error('Custom template error');
      });

      await expect(
        generator.generateWithTemplate(mockReportData, customTemplate)
      ).rejects.toThrow('Custom template error');
    });

    it('sollte mit verschiedenen Custom-Templates arbeiten', async () => {
      const template1 = jest.fn().mockReturnValue('<html>Template 1</html>');
      const template2 = jest.fn().mockReturnValue('<html>Template 2</html>');

      const result1 = await generator.generateWithTemplate(mockReportData, template1);
      const result2 = await generator.generateWithTemplate(mockReportData, template2);

      expect(result1).toBe('<html>Template 1</html>');
      expect(result2).toBe('<html>Template 2</html>');
    });
  });
});
