import { PDFGenerator } from '../../generators/pdf-generator';
import type { PDFGenerationRequest } from '../../generators/pdf-generator';

describe('PDFGenerator', () => {
  let generator: PDFGenerator;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    generator = new PDFGenerator('/api/generate-pdf');
    originalFetch = global.fetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('generate', () => {
    const mockRequest: PDFGenerationRequest = {
      campaignId: 'campaign-123',
      organizationId: 'org-456',
      userId: 'user-789',
      html: '<html><body>Test</body></html>',
      title: 'Test Report',
      fileName: 'test-report.pdf'
    };

    it('sollte PDF erfolgreich generieren', async () => {
      const mockResponse = {
        success: true,
        pdfBase64: 'base64encodedstring',
        pdfUrl: 'https://example.com/report.pdf'
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await generator.generate(mockRequest.html, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/generate-pdf',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('sollte Default-Optionen verwenden wenn nicht angegeben', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, pdfUrl: 'https://example.com/report.pdf' })
      });

      await generator.generate(mockRequest.html, mockRequest);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.options).toEqual({
        format: 'A4',
        orientation: 'portrait',
        printBackground: true,
        waitUntil: 'networkidle0'
      });
    });

    it('sollte Custom-Optionen verwenden', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, pdfUrl: 'https://example.com/report.pdf' })
      });

      const customRequest = {
        ...mockRequest,
        options: {
          format: 'Letter' as const,
          orientation: 'landscape' as const,
          printBackground: false,
          waitUntil: 'load' as const
        }
      };

      await generator.generate(customRequest.html, customRequest);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.options).toEqual({
        format: 'Letter',
        orientation: 'landscape',
        printBackground: false,
        waitUntil: 'load'
      });
    });

    it('sollte Fehler werfen wenn API-Call fehlschlägt', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(
        generator.generate(mockRequest.html, mockRequest)
      ).rejects.toThrow('PDF-API Fehler 500: Internal Server Error');
    });

    it('sollte Fehler werfen wenn PDF-Generation fehlschlägt', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Puppeteer rendering failed'
        })
      });

      await expect(
        generator.generate(mockRequest.html, mockRequest)
      ).rejects.toThrow('PDF-Generation fehlgeschlagen: Puppeteer rendering failed');
    });

    it('sollte alle Request-Daten an API senden', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, pdfUrl: 'https://example.com/report.pdf' })
      });

      await generator.generate(mockRequest.html, mockRequest);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody).toMatchObject({
        campaignId: 'campaign-123',
        organizationId: 'org-456',
        userId: 'user-789',
        title: 'Test Report',
        fileName: 'test-report.pdf',
        html: '<html><body>Test</body></html>',
        mainContent: '<html><body>Test</body></html>',
        clientName: 'Test Report',
        boilerplateSections: []
      });
    });

    it('sollte Custom API Endpoint verwenden', async () => {
      const customGenerator = new PDFGenerator('/api/custom-pdf');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, pdfUrl: 'https://example.com/report.pdf' })
      });

      await customGenerator.generate(mockRequest.html, mockRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/custom-pdf',
        expect.any(Object)
      );
    });
  });

  describe('base64ToFile', () => {
    it('sollte Base64 zu File konvertieren', () => {
      const base64 = 'VGVzdCBQREYgQ29udGVudA==';
      const fileName = 'test.pdf';

      const file = generator.base64ToFile(base64, fileName);

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe(fileName);
      expect(file.type).toBe('application/pdf');
    });

    it('sollte Whitespace aus Base64 entfernen', () => {
      const base64WithWhitespace = 'VGVz dCBQRE YgQ29u dGVudA ==';
      const fileName = 'test.pdf';

      const file = generator.base64ToFile(base64WithWhitespace, fileName);

      expect(file).toBeInstanceOf(File);
      expect(file.size).toBeGreaterThan(0);
    });

    it('sollte korrekte File-Größe haben', () => {
      const base64 = 'VGVzdCBQREYgQ29udGVudA==';
      const fileName = 'test.pdf';

      const file = generator.base64ToFile(base64, fileName);

      expect(file.size).toBeGreaterThan(0);
    });

    it('sollte mit verschiedenen Dateinamen funktionieren', () => {
      const base64 = 'VGVzdCBQREYgQ29udGVudA==';

      const file1 = generator.base64ToFile(base64, 'report1.pdf');
      const file2 = generator.base64ToFile(base64, 'report2.pdf');

      expect(file1.name).toBe('report1.pdf');
      expect(file2.name).toBe('report2.pdf');
    });
  });

  describe('generateFileName', () => {
    it('sollte Dateinamen mit Timestamp generieren', () => {
      const campaignId = 'campaign-123';

      const fileName = generator.generateFileName(campaignId);

      expect(fileName).toMatch(/^Monitoring_Report_campaign-123_\d+\.pdf$/);
    });

    it('sollte Custom-Prefix verwenden', () => {
      const campaignId = 'campaign-456';
      const prefix = 'Custom_Report';

      const fileName = generator.generateFileName(campaignId, prefix);

      expect(fileName).toMatch(/^Custom_Report_campaign-456_\d+\.pdf$/);
    });

    it('sollte verschiedene Timestamps generieren', async () => {
      const campaignId = 'campaign-789';

      const fileName1 = generator.generateFileName(campaignId);
      await new Promise(resolve => setTimeout(resolve, 10));
      const fileName2 = generator.generateFileName(campaignId);

      expect(fileName1).not.toBe(fileName2);
    });

    it('sollte immer .pdf Extension haben', () => {
      const campaignId = 'campaign-abc';

      const fileName = generator.generateFileName(campaignId);

      expect(fileName.endsWith('.pdf')).toBe(true);
    });

    it('sollte Default-Prefix verwenden wenn nicht angegeben', () => {
      const campaignId = 'campaign-xyz';

      const fileName = generator.generateFileName(campaignId);

      expect(fileName).toMatch(/^Monitoring_Report_/);
    });
  });
});
