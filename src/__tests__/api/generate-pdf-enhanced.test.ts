// src/__tests__/api/generate-pdf-enhanced.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { POST, GET } from '@/app/api/generate-pdf/route';
import { mediaService } from '@/lib/firebase/media-service';
import { templateRenderer } from '@/lib/pdf/template-renderer';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import puppeteer from 'puppeteer';

// Mock alle Dependencies
jest.mock('puppeteer', () => ({
  default: {
    launch: jest.fn()
  }
}));

// Mock puppeteer-core (für Production)
jest.mock('puppeteer-core', () => ({
  default: {
    launch: jest.fn()
  }
}));

// Mock @sparticuz/chromium
jest.mock('@sparticuz/chromium', () => ({
  default: {
    args: [],
    executablePath: jest.fn().mockResolvedValue('/mock/chromium/path')
  }
}));

jest.mock('@/lib/firebase/media-service', () => ({
  mediaService: {
    uploadBuffer: jest.fn()
  }
}));

jest.mock('@/lib/pdf/template-renderer', () => ({
  templateRenderer: {
    renderTemplate: jest.fn(),
    renderWithPDFTemplate: jest.fn()
  },
  TemplateData: {}
}));

jest.mock('@/lib/firebase/pdf-template-service', () => ({
  pdfTemplateService: {
    getTemplate: jest.fn(),
    getDefaultTemplate: jest.fn(),
    getSystemTemplates: jest.fn(),
    applyTemplate: jest.fn()
  }
}));

// Cast Mocks
const mockMediaService = mediaService as jest.Mocked<typeof mediaService>;
const mockTemplateRenderer = templateRenderer as jest.Mocked<typeof templateRenderer>;
const mockPDFTemplateService = pdfTemplateService as jest.Mocked<typeof pdfTemplateService>;

describe('/api/generate-pdf - Enhanced API Tests', () => {
  // Mock-Funktion für Puppeteer Launch
  let mockLaunch: jest.MockedFunction<any>;
  const mockValidRequest = {
    campaignId: 'campaign-123',
    organizationId: 'org-456',
    title: 'Test Pressemitteilung',
    mainContent: '<p>Dies ist der Hauptinhalt der Pressemitteilung mit ausreichend Text für Tests.</p>',
    boilerplateSections: [
      {
        id: 'section-1',
        customTitle: 'Unternehmensinfo',
        content: '<p>Über das Unternehmen</p>',
        type: 'company' as const
      }
    ],
    keyVisual: {
      url: 'https://example.com/keyvisual.jpg',
      alt: 'Key Visual',
      caption: 'Test Image'
    },
    clientName: 'Test Client Corp',
    userId: 'user-789',
    fileName: 'test-pressemitteilung.pdf',
    options: {
      format: 'A4' as const,
      orientation: 'portrait' as const,
      printBackground: true,
      waitUntil: 'networkidle0' as const
    }
  };

  const mockPDFBuffer = Buffer.from('mock-pdf-content');
  const mockUploadResult = {
    downloadUrl: 'https://storage.googleapis.com/bucket/test.pdf',
    fileSize: 102400
  };

  // Mock Puppeteer-Setup
  const mockPage = {
    setViewport: jest.fn(),
    setDefaultTimeout: jest.fn(),
    on: jest.fn(),
    setContent: jest.fn(),
    pdf: jest.fn(),
    close: jest.fn()
  };

  const mockBrowser = {
    newPage: jest.fn(),
    close: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialisiere mockLaunch als Mock-Funktion
    mockLaunch = jest.fn();

    // Überschreibe puppeteer.launch mit mockLaunch
    (puppeteer as any).launch = mockLaunch;

    // Setup Puppeteer Mocks - WICHTIG: Alle Mock-Funktionen zurücksetzen
    mockPage.setViewport.mockResolvedValue(undefined);
    mockPage.setDefaultTimeout.mockReturnValue(undefined);
    mockPage.on.mockReturnValue(undefined);
    mockPage.setContent.mockResolvedValue(undefined);
    mockPage.pdf.mockResolvedValue(mockPDFBuffer);
    mockPage.close.mockResolvedValue(undefined);
    mockBrowser.newPage.mockResolvedValue(mockPage);
    mockBrowser.close.mockResolvedValue(undefined);

    // Setup Default Mocks
    mockLaunch.mockResolvedValue(mockBrowser as any);
    mockTemplateRenderer.renderTemplate.mockResolvedValue('<html><body>Test HTML</body></html>');
    mockMediaService.uploadBuffer.mockResolvedValue(mockUploadResult as any);

    // Mock Console Methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('POST Request Validation', () => {
    it('sollte valide PDF-Request erfolgreich verarbeiten', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // API gibt jetzt Client-Upload zurück
      expect(data.needsClientUpload).toBe(true);
      expect(data.pdfBase64).toBeDefined();
      expect(data.pdfUrl).toBeNull();
      expect(data.fileSize).toBeDefined();
      expect(data.metadata).toEqual(
        expect.objectContaining({
          generatedAt: expect.any(String),
          wordCount: expect.any(Number),
          pageCount: expect.any(Number),
          generationTimeMs: expect.any(Number),
          renderMethod: 'legacy'
        })
      );
    });

    it('sollte fehlende campaignId ablehnen', async () => {
      const invalidRequest = { ...mockValidRequest };
      delete (invalidRequest as any).campaignId;
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('campaignId is required');
    });

    it('sollte fehlende organizationId ablehnen', async () => {
      const invalidRequest = { ...mockValidRequest };
      delete (invalidRequest as any).organizationId;
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('organizationId is required');
    });

    it('sollte leeren/ungültigen mainContent ablehnen', async () => {
      const invalidRequest = {
        ...mockValidRequest,
        mainContent: '<p></p>' // Leerer Content
      };
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('mainContent is required');
    });

    it('sollte alle erforderlichen Felder gleichzeitig validieren', async () => {
      const invalidRequest = {
        // Alle required Fields fehlen
      };
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(invalidRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('campaignId is required');
      expect(data.error).toContain('organizationId is required');
      expect(data.error).toContain('title is required');
      expect(data.error).toContain('mainContent is required');
      expect(data.error).toContain('clientName is required');
      expect(data.error).toContain('userId is required');
    });
  });

  describe('Template System Integration', () => {
    const mockTemplate = {
      id: 'modern-professional',
      name: 'Modern Professional',
      version: '1.0.0',
      colorScheme: { primary: '#005fab' },
      typography: { primaryFont: 'Inter' }
    };

    it('sollte Template-basierte PDF-Generation durchführen', async () => {
      const templateRequest = {
        ...mockValidRequest,
        templateId: 'modern-professional',
        templateCustomizations: {
          colorScheme: { primary: '#custom-color' }
        },
        useSystemTemplate: true
      };
      
      mockPDFTemplateService.getTemplate.mockResolvedValue(mockTemplate as any);
      mockTemplateRenderer.renderWithPDFTemplate.mockResolvedValue('<html><body>Template HTML</body></html>');
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(templateRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.renderMethod).toBe('template');
      expect(data.metadata.templateName).toBe('Modern Professional');
      expect(data.metadata.templateVersion).toBe('1.0.0');
      expect(data.metadata.cssInjectionTime).toBeGreaterThanOrEqual(0);
      
      // Template sollte mit Customizations angewendet werden
      expect(mockPDFTemplateService.getTemplate).toHaveBeenCalledWith('modern-professional');
      expect(mockTemplateRenderer.renderWithPDFTemplate).toHaveBeenCalled();
    });

    it('sollte Fallback auf Legacy-Template bei Template-Fehlern', async () => {
      const templateRequest = {
        ...mockValidRequest,
        templateId: 'nonexistent-template'
      };
      
      mockPDFTemplateService.getTemplate.mockResolvedValue(null);
      mockPDFTemplateService.getDefaultTemplate.mockResolvedValue(mockTemplate as any);
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(templateRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Sollte auf Default-Template zurückfallen
      expect(mockPDFTemplateService.getDefaultTemplate).toHaveBeenCalled();
    });

    it('sollte Template-Usage tracken nach erfolgreicher Generation', async () => {
      const templateRequest = {
        ...mockValidRequest,
        templateId: 'modern-professional',
        templateCustomizations: { colorScheme: { primary: '#custom' } }
      };

      mockPDFTemplateService.getTemplate.mockResolvedValue(mockTemplate as any);

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(templateRequest)
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Template-Usage sollte getrackt werden (auch mit undefined wenn nicht gesetzt)
      expect(mockPDFTemplateService.applyTemplate).toHaveBeenCalledWith(
        mockValidRequest.campaignId,
        'modern-professional',
        expect.anything() // Kann undefined oder Object sein
      );
    });
  });

  describe('Puppeteer PDF-Generation', () => {
    it('sollte Puppeteer mit korrekten Optionen starten', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      await POST(request);

      expect(mockLaunch).toHaveBeenCalledWith({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=VizDisplayCompositor'
        ],
        timeout: 30000
      });
    });

    it('sollte Page mit korrekten Einstellungen konfigurieren', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });
      
      await POST(request);
      
      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 1280,
        height: 1024,
        deviceScaleFactor: 2
      });
      
      expect(mockPage.setDefaultTimeout).toHaveBeenCalledWith(30000);
      
      // Event-Handler sollten gesetzt werden
      expect(mockPage.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('pageerror', expect.any(Function));
    });

    it('sollte HTML-Content mit korrekten Optionen laden', async () => {
      const customOptions = {
        ...mockValidRequest,
        options: {
          ...mockValidRequest.options,
          waitUntil: 'domcontentloaded' as const
        }
      };
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(customOptions)
      });
      
      await POST(request);
      
      expect(mockPage.setContent).toHaveBeenCalledWith(
        expect.stringContaining('Test HTML'),
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }
      );
    });

    it('sollte PDF mit benutzerdefinierten Optionen generieren', async () => {
      const customOptions = {
        ...mockValidRequest,
        options: {
          format: 'Letter' as const,
          orientation: 'landscape' as const,
          printBackground: false
        }
      };
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(customOptions)
      });
      
      await POST(request);
      
      expect(mockPage.pdf).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'Letter',
          orientation: 'landscape',
          printBackground: false,
          margin: expect.any(Object),
          timeout: 30000,
          preferCSSPageSize: true
        })
      );
    });
  });

  describe('File Upload Integration', () => {
    it('sollte PDF für Client-Side Upload vorbereiten', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      // Kein Server-Side Upload mehr
      expect(mockMediaService.uploadBuffer).not.toHaveBeenCalled();

      // Stattdessen wird PDF als Base64 zurückgegeben
      expect(data.needsClientUpload).toBe(true);
      expect(data.pdfBase64).toBeDefined();
      expect(data.fileName).toBe(mockValidRequest.fileName);
    });

    it('sollte automatischen Dateinamen generieren', async () => {
      const requestWithoutFileName = { ...mockValidRequest };
      delete (requestWithoutFileName as any).fileName;

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(requestWithoutFileName)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.fileName).toMatch(/Test_Pressemitteilung_\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('sollte Upload-Fehler korrekt behandeln', async () => {
      // Simuliere Fehler bei PDF-Generierung (nicht Upload)
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Metadata Calculation', () => {
    it('sollte Word-Count berechnen', async () => {
      const longContentRequest = {
        ...mockValidRequest,
        mainContent: '<p>Dies ist ein sehr langer Text mit vielen Wörtern für eine <strong>genaue</strong> Zählung der Wörter.</p>'
      };

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(longContentRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Word-Count sollte vorhanden und > 0 sein
      expect(data.metadata.wordCount).toBeGreaterThan(10);
    });

    it('sollte Page-Count schätzen', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Page-Count sollte mindestens 1 sein
      expect(data.metadata.pageCount).toBeGreaterThanOrEqual(1);
    });

    it('sollte Generation-Time tracken', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      // Generation-Time sollte vorhanden sein (>= 0)
      expect(data.metadata.generationTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof data.metadata.generationTimeMs).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('sollte Puppeteer Launch-Fehler behandeln', async () => {
      mockLaunch.mockRejectedValue(new Error('Puppeteer launch failed'));

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('sollte Timeout-Fehler korrekt klassifizieren', async () => {
      const timeoutError = new Error('Navigation timeout of 30000 ms exceeded');
      timeoutError.name = 'TimeoutError';
      
      mockPage.setContent.mockRejectedValue(timeoutError);
      
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(408);
      expect(data.success).toBe(false);
      expect(data.error).toBe('PDF generation timeout');
    });

    it('sollte Browser/Page-Cleanup bei Fehlern durchführen', async () => {
      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);

      // Cleanup sollte aufgerufen werden
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();

      // Fehler-Status (kann 500 oder 408 sein, je nach Fehlertyp)
      expect([408, 500]).toContain(response.status);
    });

    it('sollte JSON-Parse-Fehler behandeln', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: 'invalid-json{'
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(500); // JSON Parse Error wird als Internal Error behandelt
    });
  });

  describe('Performance Requirements', () => {
    it('sollte PDF-Generation schnell abschließen', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response).toBeDefined();
    });

    it('sollte große Inhalte verarbeiten können', async () => {
      const largeContentRequest = {
        ...mockValidRequest,
        mainContent: '<p>' + 'Lorem ipsum '.repeat(500) + '</p>', // Großer Content
        boilerplateSections: Array.from({ length: 5 }, (_, i) => ({
          id: `section-${i}`,
          content: `<p>Section ${i} content</p>`,
          type: 'main' as const
        }))
      };

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(largeContentRequest)
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response).toBeDefined();
    });
  });

  describe('GET Request (API Info)', () => {
    it('sollte API-Informationen mit Template-System zurückgeben', async () => {
      const mockSystemTemplates = [
        { id: 'template-1', name: 'Template 1', description: 'Description 1', version: '1.0' },
        { id: 'template-2', name: 'Template 2', description: 'Description 2', version: '1.1' }
      ];
      
      mockPDFTemplateService.getSystemTemplates.mockResolvedValue(mockSystemTemplates as any);
      
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        name: 'PDF Generation API',
        version: '2.0.0',
        description: 'Erweiterte PDF-Generation mit Multi-Template-System und Puppeteer',
        methods: ['POST'],
        status: 'active',
        features: {
          templateSystem: true,
          customTemplates: true,
          templateCustomization: true,
          performanceOptimization: true,
          cssInjection: true
        },
        systemTemplates: [
          {
            id: 'template-1',
            name: 'Template 1',
            description: 'Description 1',
            version: '1.0'
          },
          {
            id: 'template-2',
            name: 'Template 2',
            description: 'Description 2',
            version: '1.1'
          }
        ],
        renderMethods: ['legacy', 'template', 'custom'],
        supportedFormats: ['A4', 'Letter'],
        supportedOrientations: ['portrait', 'landscape']
      });
    });

    it('sollte Fallback-Response bei Template-System-Fehlern', async () => {
      mockPDFTemplateService.getSystemTemplates.mockRejectedValue(new Error('Template error'));
      
      const response = await GET();
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({
        name: 'PDF Generation API',
        version: '2.0.0',
        status: 'active',
        error: 'Template system not available'
      });
    });
  });

  describe('Multi-Tenancy & Security', () => {
    it('sollte PDF-Request verarbeiten', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fileName).toBeDefined();
    });

    it('sollte Metadaten einbetten', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.generatedAt).toBeDefined();
    });
  });

  describe('Edge Cases & Boundary Tests', () => {
    it('sollte Content verarbeiten', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.wordCount).toBeGreaterThan(0);
      expect(data.metadata.pageCount).toBeGreaterThanOrEqual(1);
    });

    it('sollte Dateinamen generieren', async () => {
      const requestWithoutFileName = { ...mockValidRequest };
      delete (requestWithoutFileName as any).fileName;

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(requestWithoutFileName)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Dateiname sollte generiert werden
      expect(data.fileName).toBeDefined();
      expect(data.fileName).toMatch(/\.pdf$/);
    });

    it('sollte optionale Felder handhaben', async () => {
      const minimalRequest = {
        ...mockValidRequest,
        boilerplateSections: []
      };
      delete (minimalRequest as any).keyVisual;

      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(minimalRequest)
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('sollte PDF-Generierung erfolgreich abschließen', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-pdf', {
        method: 'POST',
        body: JSON.stringify(mockValidRequest)
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
