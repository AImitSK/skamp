// src/__tests__/api/pdf-templates.test.ts - API Route Tests für PDF-Template-System

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/v1/pdf-templates/route';
import { POST as UploadPOST, GET as UploadGET } from '@/app/api/v1/pdf-templates/upload/route';
import { POST as PreviewPOST, GET as PreviewGET } from '@/app/api/v1/pdf-templates/preview/route';

// Mock PDF Template Service
jest.mock('@/lib/firebase/pdf-template-service', () => ({
  pdfTemplateService: {
    getSystemTemplates: jest.fn(),
    getOrganizationTemplates: jest.fn(),
    getTemplate: jest.fn(),
    getDefaultTemplate: jest.fn(),
    setDefaultTemplate: jest.fn(),
    deleteCustomTemplate: jest.fn(),
    applyTemplate: jest.fn(),
    getTemplateUsageStats: jest.fn(),
    clearCache: jest.fn(),
    validateTemplateFile: jest.fn(),
    uploadCustomTemplate: jest.fn(),
    getTemplatePreview: jest.fn()
  }
}));

// Mock NextResponse
const mockNextResponse = {
  json: jest.fn((data, init) => ({ data, ...init }))
};
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse
}));

describe('PDF Templates API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/pdf-templates', () => {
    it('sollte System-Templates erfolgreich zurückgeben', async () => {
      const mockSystemTemplates = [
        { id: 'modern-professional', name: 'Modern Professional', isSystem: true },
        { id: 'classic-elegant', name: 'Classic Elegant', isSystem: true },
        { id: 'creative-bold', name: 'Creative Bold', isSystem: true }
      ];

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getSystemTemplates.mockResolvedValue(mockSystemTemplates);

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/pdf-templates?includeSystem=true'
      } as NextRequest;

      await GET(mockRequest);

      expect(pdfTemplateService.getSystemTemplates).toHaveBeenCalledTimes(1);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        templates: mockSystemTemplates,
        defaultTemplateId: undefined,
        systemTemplatesCount: 3,
        organizationTemplatesCount: 0
      });
    });

    it('sollte Organization-Templates erfolgreich zurückgeben', async () => {
      const organizationId = 'test-org-123';
      const mockOrgTemplates = [
        { id: 'custom-template-1', name: 'Custom Template 1', isSystem: false, organizationId }
      ];

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getOrganizationTemplates.mockResolvedValue(mockOrgTemplates);
      pdfTemplateService.getSystemTemplates.mockResolvedValue([]);

      const mockRequest = {
        url: `http://localhost:3000/api/v1/pdf-templates?organizationId=${organizationId}&includeSystem=true`
      } as NextRequest;

      await GET(mockRequest);

      expect(pdfTemplateService.getOrganizationTemplates).toHaveBeenCalledWith(organizationId);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        templates: mockOrgTemplates,
        defaultTemplateId: undefined,
        systemTemplatesCount: 0,
        organizationTemplatesCount: 1
      });
    });

    it('sollte einzelnes Template erfolgreich zurückgeben', async () => {
      const templateId = 'modern-professional';
      const mockTemplate = { id: templateId, name: 'Modern Professional' };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplate.mockResolvedValue(mockTemplate);

      const mockRequest = {
        url: `http://localhost:3000/api/v1/pdf-templates?templateId=${templateId}`
      } as NextRequest;

      await GET(mockRequest);

      expect(pdfTemplateService.getTemplate).toHaveBeenCalledWith(templateId);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        template: mockTemplate
      });
    });

    it('sollte 404 für nicht existierende Templates zurückgeben', async () => {
      const templateId = 'non-existent';

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplate.mockResolvedValue(null);

      const mockRequest = {
        url: `http://localhost:3000/api/v1/pdf-templates?templateId=${templateId}`
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          success: false, 
          error: `Template ${templateId} nicht gefunden` 
        },
        { status: 404 }
      );
    });

    it('sollte Fehler bei Service-Problemen behandeln', async () => {
      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getSystemTemplates.mockRejectedValue(new Error('Service Error'));

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/pdf-templates?includeSystem=true'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          success: false, 
          error: 'Templates konnten nicht abgerufen werden',
          details: 'Service Error'
        },
        { status: 500 }
      );
    });
  });

  describe('POST /api/v1/pdf-templates', () => {
    it('sollte Default-Template erfolgreich setzen', async () => {
      const requestBody = {
        organizationId: 'test-org-123',
        templateId: 'modern-professional',
        action: 'set_default'
      };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.setDefaultTemplate.mockResolvedValue(undefined);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(pdfTemplateService.setDefaultTemplate).toHaveBeenCalledWith(
        requestBody.organizationId,
        requestBody.templateId
      );
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        action: 'set_default',
        message: `Template ${requestBody.templateId} als Standard gesetzt`,
        defaultTemplateId: requestBody.templateId
      });
    });

    it('sollte Template erfolgreich löschen', async () => {
      const requestBody = {
        organizationId: 'test-org-123',
        templateId: 'custom-template-1',
        action: 'delete'
      };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.deleteCustomTemplate.mockResolvedValue(undefined);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(pdfTemplateService.deleteCustomTemplate).toHaveBeenCalledWith(requestBody.templateId);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        action: 'delete',
        message: `Template ${requestBody.templateId} erfolgreich gelöscht`,
        deletedTemplateId: requestBody.templateId
      });
    });

    it('sollte Template auf Campaign anwenden', async () => {
      const requestBody = {
        organizationId: 'test-org-123',
        templateId: 'modern-professional',
        action: 'apply_to_campaign',
        campaignId: 'campaign-456',
        overrides: { colorScheme: { primary: '#ff0000' } }
      };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.applyTemplate.mockResolvedValue(undefined);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(pdfTemplateService.applyTemplate).toHaveBeenCalledWith(
        requestBody.campaignId,
        requestBody.templateId,
        requestBody.overrides
      );
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        action: 'apply_to_campaign',
        message: `Template ${requestBody.templateId} auf Campaign ${requestBody.campaignId} angewendet`,
        campaignId: requestBody.campaignId,
        templateId: requestBody.templateId,
        appliedOverrides: requestBody.overrides
      });
    });

    it('sollte Usage-Statistiken abrufen', async () => {
      const requestBody = {
        organizationId: 'test-org-123',
        action: 'get_usage_stats'
      };

      const mockStats = [
        { templateId: 'template-1', usageCount: 5 },
        { templateId: 'template-2', usageCount: 3 }
      ];

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplateUsageStats.mockResolvedValue(mockStats);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(pdfTemplateService.getTemplateUsageStats).toHaveBeenCalledWith(requestBody.organizationId);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        action: 'get_usage_stats',
        message: 'Usage-Statistiken erfolgreich abgerufen',
        stats: mockStats
      });
    });

    it('sollte Cache bereinigen', async () => {
      const requestBody = {
        organizationId: 'test-org-123',
        action: 'clear_cache'
      };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.clearCache.mockReturnValue(undefined);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(pdfTemplateService.clearCache).toHaveBeenCalledTimes(1);
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        action: 'clear_cache',
        message: 'Template-Cache erfolgreich bereinigt'
      });
    });

    it('sollte Validierungsfehler für fehlende Parameter zurückgeben', async () => {
      const requestBody = {
        action: 'set_default'
        // organizationId fehlt
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          success: false, 
          error: 'organizationId und action sind erforderlich' 
        },
        { status: 400 }
      );
    });

    it('sollte Fehler für unbekannte Aktionen zurückgeben', async () => {
      const requestBody = {
        organizationId: 'test-org-123',
        action: 'unknown_action'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          success: false, 
          error: 'Unbekannte Aktion: unknown_action',
          availableActions: ['set_default', 'delete', 'apply_to_campaign', 'get_usage_stats', 'clear_cache']
        },
        { status: 400 }
      );
    });
  });

  describe('POST /api/v1/pdf-templates/upload', () => {
    it('sollte Template-Upload erfolgreich durchführen', async () => {
      const mockFile = new File(['{"name": "Test Template"}'], 'template.json', { 
        type: 'application/json' 
      });

      const mockFormData = new Map([
        ['template', mockFile],
        ['organizationId', 'test-org-123'],
        ['userId', 'user-456'],
        ['metadata', '{"name": "Custom Template"}']
      ]);

      const mockUploadedTemplate = {
        id: 'uploaded-template-1',
        name: 'Custom Template',
        version: '1.0.0',
        organizationId: 'test-org-123',
        createdAt: new Date()
      };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.validateTemplateFile.mockResolvedValue({ isValid: true, errors: [] });
      pdfTemplateService.uploadCustomTemplate.mockResolvedValue(mockUploadedTemplate);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as unknown as NextRequest;

      await UploadPOST(mockRequest);

      expect(pdfTemplateService.validateTemplateFile).toHaveBeenCalledWith(mockFile);
      expect(pdfTemplateService.uploadCustomTemplate).toHaveBeenCalledWith(
        'test-org-123',
        mockFile,
        { name: 'Custom Template', createdBy: 'user-456' }
      );
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Template erfolgreich hochgeladen',
        template: expect.objectContaining({
          id: mockUploadedTemplate.id,
          name: mockUploadedTemplate.name
        }),
        uploadMetadata: expect.objectContaining({
          fileName: 'template.json',
          validationPassed: true
        })
      });
    });

    it('sollte Upload bei Validierungsfehlern ablehnen', async () => {
      const mockFile = new File(['invalid content'], 'template.json', { 
        type: 'application/json' 
      });

      const mockFormData = new Map([
        ['template', mockFile],
        ['organizationId', 'test-org-123'],
        ['userId', 'user-456']
      ]);

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.validateTemplateFile.mockResolvedValue({ 
        isValid: false, 
        errors: ['Invalid JSON format'] 
      });

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as unknown as NextRequest;

      await UploadPOST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          success: false, 
          error: 'Template-Datei ist ungültig',
          details: ['Invalid JSON format'],
          validationErrors: ['Invalid JSON format']
        },
        { status: 400 }
      );
    });

    it('sollte Upload ohne Datei ablehnen', async () => {
      const mockFormData = new Map([
        ['organizationId', 'test-org-123'],
        ['userId', 'user-456']
      ]);

      const mockRequest = {
        formData: jest.fn().mockResolvedValue(mockFormData)
      } as unknown as NextRequest;

      await UploadPOST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          success: false, 
          error: 'Keine Template-Datei bereitgestellt',
          details: 'Das "template" Feld in der FormData ist erforderlich'
        },
        { status: 400 }
      );
    });

    it('sollte Upload-Informationen zurückgeben', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/pdf-templates/upload?organizationId=test-org-123'
      } as NextRequest;

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getOrganizationTemplates.mockResolvedValue([
        { id: 'template-1' }, 
        { id: 'template-2' }
      ]);

      await UploadGET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        uploadLimits: expect.objectContaining({
          maxFileSize: 5 * 1024 * 1024,
          maxCustomTemplates: 10,
          currentUsage: 2
        }),
        instructions: expect.objectContaining({
          fileFormat: 'JSON oder HTML',
          maxSize: '5MB'
        }),
        examples: expect.any(Object)
      });
    });
  });

  describe('POST /api/v1/pdf-templates/preview', () => {
    it('sollte Template-Preview erfolgreich generieren', async () => {
      const requestBody = {
        templateId: 'modern-professional',
        organizationId: 'test-org-123',
        mockData: {
          title: 'Test Pressemitteilung',
          content: '<p>Test content</p>',
          companyName: 'Test GmbH',
          contactInfo: 'test@example.com',
          date: '2024-01-15'
        }
      };

      const mockHtml = '<html><body><h1>Test Pressemitteilung</h1></body></html>';
      const mockTemplate = { id: 'modern-professional', name: 'Modern Professional' };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplate.mockResolvedValue(mockTemplate);
      pdfTemplateService.getTemplatePreview.mockResolvedValue(mockHtml);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await PreviewPOST(mockRequest);

      expect(pdfTemplateService.getTemplatePreview).toHaveBeenCalledWith(
        requestBody.templateId,
        requestBody.mockData,
        undefined
      );
      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        html: mockHtml,
        templateId: mockTemplate.id,
        templateName: mockTemplate.name,
        generationTimeMs: expect.any(Number)
      });
    });

    it('sollte Preview mit Customizations generieren', async () => {
      const requestBody = {
        templateId: 'modern-professional',
        customizations: {
          colorScheme: { primary: '#ff0000' }
        },
        mockData: {
          title: 'Test',
          content: 'Test',
          companyName: 'Test',
          contactInfo: 'test@test.com',
          date: '2024-01-01'
        }
      };

      const mockHtml = '<html><body style="color: #ff0000;">Test</body></html>';
      const mockTemplate = { id: 'modern-professional', name: 'Modern Professional' };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplate.mockResolvedValue(mockTemplate);
      pdfTemplateService.getTemplatePreview.mockResolvedValue(mockHtml);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await PreviewPOST(mockRequest);

      expect(pdfTemplateService.getTemplatePreview).toHaveBeenCalledWith(
        requestBody.templateId,
        requestBody.mockData,
        requestBody.customizations
      );
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          html: mockHtml
        })
      );
    });

    it('sollte Preview mit Metadaten generieren', async () => {
      const requestBody = {
        templateId: 'modern-professional',
        includeMetadata: true,
        mockData: {
          title: 'Test',
          content: 'Test', 
          companyName: 'Test',
          contactInfo: 'test@test.com',
          date: '2024-01-01'
        }
      };

      const mockHtml = '<html><body>Test</body></html>';
      const mockTemplate = { 
        id: 'modern-professional', 
        name: 'Modern Professional', 
        version: '1.0.0',
        isSystem: true
      };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplate.mockResolvedValue(mockTemplate);
      pdfTemplateService.getTemplatePreview.mockResolvedValue(mockHtml);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await PreviewPOST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          html: mockHtml,
          metadata: expect.objectContaining({
            templateVersion: mockTemplate.version,
            templateType: 'system',
            mockDataUsed: requestBody.mockData
          })
        })
      );
    });

    it('sollte Fehler für nicht existierende Templates zurückgeben', async () => {
      const requestBody = {
        templateId: 'non-existent-template',
        mockData: { title: 'Test', content: 'Test', companyName: 'Test', contactInfo: 'test@test.com', date: '2024-01-01' }
      };

      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplate.mockResolvedValue(null);

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await PreviewPOST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        { 
          success: false, 
          error: `Template ${requestBody.templateId} nicht gefunden` 
        },
        { status: 404 }
      );
    });

    it('sollte Preview-Optionen zurückgeben', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/pdf-templates/preview?type=options'
      } as NextRequest;

      await PreviewGET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        previewOptions: expect.objectContaining({
          supportedFormats: ['html', 'pdf'],
          maxPreviewSize: '2MB',
          cacheTimeout: '5 minutes'
        }),
        mockDataFields: expect.objectContaining({
          required: ['title', 'content', 'companyName', 'date'],
          optional: ['subtitle', 'keyVisual', 'boilerplateSections', 'contactInfo']
        })
      });
    });

    it('sollte Mock-Daten-Templates zurückgeben', async () => {
      const mockRequest = {
        url: 'http://localhost:3000/api/v1/pdf-templates/preview?type=mock-data'
      } as NextRequest;

      await PreviewGET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith({
        success: true,
        mockDataTemplates: expect.objectContaining({
          default: expect.any(Object),
          tech: expect.any(Object),
          healthcare: expect.any(Object),
          finance: expect.any(Object)
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('sollte Service-Fehler korrekt behandeln', async () => {
      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getSystemTemplates.mockRejectedValue(new Error('Database connection failed'));

      const mockRequest = {
        url: 'http://localhost:3000/api/v1/pdf-templates?includeSystem=true'
      } as NextRequest;

      await GET(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Templates konnten nicht abgerufen werden'
        }),
        { status: 500 }
      );
    });

    it('sollte Timeout-Fehler korrekt behandeln', async () => {
      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.getTemplatePreview.mockRejectedValue(new Error('timeout exceeded'));

      const requestBody = {
        templateId: 'modern-professional',
        mockData: { title: 'Test', content: 'Test', companyName: 'Test', contactInfo: 'test@test.com', date: '2024-01-01' }
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await PreviewPOST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Preview-Generierung Timeout'
        }),
        { status: 408 }
      );
    });

    it('sollte Permission-Fehler korrekt behandeln', async () => {
      const { pdfTemplateService } = require('@/lib/firebase/pdf-template-service');
      pdfTemplateService.deleteCustomTemplate.mockRejectedValue(new Error('permission denied'));

      const requestBody = {
        organizationId: 'test-org-123',
        templateId: 'custom-template-1',
        action: 'delete'
      };

      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody)
      } as unknown as NextRequest;

      await POST(mockRequest);

      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Keine Berechtigung für diese Aktion'
        }),
        { status: 403 }
      );
    });
  });
});