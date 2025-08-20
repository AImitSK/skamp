// src/__tests__/features/pdf-template-service-enhanced.test.ts
import {
  pdfTemplateService,
  PDFTemplateService
} from '@/lib/firebase/pdf-template-service';
import { 
  PDFTemplate,
  PDFTemplateDocument,
  TemplateValidationResult,
  MockPRData,
  SYSTEM_TEMPLATE_IDS
} from '@/types/pdf-template';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }))
  }
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
}));

// Mock Firebase Config
jest.mock('@/lib/firebase/config', () => ({
  db: {},
  storage: {}
}));

// Mock Template Cache
jest.mock('@/lib/pdf/template-cache', () => ({
  templateCache: {
    getTemplate: jest.fn(),
    setTemplate: jest.fn(),
    getHtml: jest.fn(),
    setHtml: jest.fn(),
    getCss: jest.fn(),
    setCss: jest.fn(),
    clear: jest.fn(),
    clearCache: jest.fn(),
    getStats: jest.fn(() => ({
      templateCache: { size: 0, hits: 0, misses: 0 },
      htmlCache: { size: 0, hits: 0, misses: 0 },
      cssCache: { size: 0, hits: 0, misses: 0 }
    })),
    analyze: jest.fn(() => ({
      templateCache: {
        entries: []
      }
    })),
    generateHtmlCacheKey: jest.fn(() => 'mock-html-cache-key'),
    generateCssCacheKey: jest.fn(() => 'mock-css-cache-key'),
    generateHash: jest.fn(() => 'mock-hash')
  }
}));

// Mock Template Renderer
jest.mock('@/lib/pdf/template-renderer', () => ({
  templateRenderer: {
    renderTemplate: jest.fn(),
    renderWithPDFTemplate: jest.fn()
  }
}));

// Cast Firebase mocks
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockWhere = where as jest.MockedFunction<typeof where>;
const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;

// Cast Storage mocks
const mockRef = ref as jest.MockedFunction<typeof ref>;
const mockUploadBytes = uploadBytes as jest.MockedFunction<typeof uploadBytes>;
const mockGetDownloadURL = getDownloadURL as jest.MockedFunction<typeof getDownloadURL>;
const mockDeleteObject = deleteObject as jest.MockedFunction<typeof deleteObject>;

describe('PDFTemplateService - Enhanced Tests', () => {
  const mockOrganizationId = 'test-org-123';

  const mockSystemTemplate: PDFTemplate = {
    id: SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
    name: 'Modern Professional',
    description: 'Test template',
    version: '1.0.0',
    isSystem: true,
    isActive: true,
    layout: {
      type: 'modern',
      headerHeight: 80,
      footerHeight: 60,
      margins: { top: 60, right: 50, bottom: 60, left: 50 },
      columns: 1,
      pageFormat: 'A4'
    },
    typography: {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
      baseFontSize: 11,
      lineHeight: 1.6,
      headingScale: [24, 20, 16, 14]
    },
    colorScheme: {
      primary: '#005fab',
      secondary: '#f8fafc',
      accent: '#0ea5e9',
      text: '#1e293b',
      background: '#ffffff',
      border: '#e2e8f0'
    },
    components: {
      header: {
        backgroundColor: '#005fab',
        textColor: '#ffffff',
        padding: 20
      },
      title: {
        fontSize: 24,
        fontWeight: 'bold',
        textColor: '#1e293b'
      },
      content: {
        fontSize: 11,
        textColor: '#475569'
      },
      sidebar: {
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        padding: 15
      },
      footer: {
        backgroundColor: '#f8fafc',
        textColor: '#64748b',
        fontSize: 9
      },
      logo: {
        margin: 10
      },
      keyVisual: {
        borderRadius: 6,
        margin: 15
      },
      boilerplate: {
        backgroundColor: '#f8fafc',
        borderColor: '#005fab',
        padding: 15
      }
    },
    createdAt: new Date(),
    usageCount: 0
  };

  const mockCustomTemplate: PDFTemplate = {
    id: 'custom_test_123',
    name: 'Custom Test Template',
    description: 'Custom template for testing',
    version: '1.0.0',
    organizationId: mockOrganizationId,
    isSystem: false,
    isActive: true,
    ...mockSystemTemplate
  };

  const mockPRData: MockPRData = {
    title: 'Test Pressemitteilung',
    content: '<p>Test content</p>',
    companyName: 'Test Company',
    date: '2025-01-20',
    keyVisual: {
      url: 'https://example.com/image.jpg',
      alt: 'Test image'
    },
    boilerplateSections: [{
      type: 'company',
      content: '<p>About company</p>'
    }]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Standard Mock Setup
    const mockCollectionRef = { name: 'pdf_templates' };
    const mockDocRef = { id: 'test-template-id' };
    const mockQueryRef = { collection: mockCollectionRef };
    
    mockCollection.mockReturnValue(mockCollectionRef as any);
    mockDoc.mockReturnValue(mockDocRef as any);
    mockQuery.mockReturnValue(mockQueryRef as any);
    mockWhere.mockReturnValue(mockQueryRef as any);
    mockOrderBy.mockReturnValue(mockQueryRef as any);
  });

  describe('System-Template-Management', () => {
    it('sollte alle System-Templates laden', async () => {
      const templates = await pdfTemplateService.getSystemTemplates();
      
      expect(templates).toHaveLength(3);
      expect(templates[0].id).toBe(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
      expect(templates[1].id).toBe(SYSTEM_TEMPLATE_IDS.CLASSIC_ELEGANT);
      expect(templates[2].id).toBe(SYSTEM_TEMPLATE_IDS.CREATIVE_BOLD);
      
      // Alle Templates sollten System-Templates sein
      templates.forEach(template => {
        expect(template.isSystem).toBe(true);
        expect(template.isActive).toBe(true);
      });
    });

    it('sollte System-Templates cachen für Performance', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      // Erstes Laden
      await pdfTemplateService.getSystemTemplates();
      expect(templateCache.setTemplate).toHaveBeenCalledTimes(4); // 3 einzelne + 1 Array
      
      // Cache zurücksetzen für zweiten Test
      templateCache.getTemplate.mockReturnValueOnce(null);
      templateCache.getTemplate.mockReturnValueOnce([mockSystemTemplate]);
      
      // Zweites Laden - sollte aus Cache kommen
      const templatesFromCache = await pdfTemplateService.getSystemTemplates();
      expect(templatesFromCache).toBeDefined();
    });

    it('sollte System-Template Performance validieren', async () => {
      const startTime = Date.now();
      
      await pdfTemplateService.getSystemTemplates();
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      // System-Templates sollten unter 200ms laden
      expect(loadTime).toBeLessThan(200);
      
      const metrics = pdfTemplateService.getPerformanceMetrics();
      expect(metrics.templateLoads).toBeGreaterThan(0);
    });

    it('sollte alle 3 Professional Templates korrekt konfiguriert haben', async () => {
      const templates = await pdfTemplateService.getSystemTemplates();
      
      // Modern Professional Template
      const modernTemplate = templates.find(t => t.id === SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
      expect(modernTemplate).toBeDefined();
      expect(modernTemplate!.colorScheme.primary).toBe('#005fab');
      expect(modernTemplate!.typography.primaryFont).toBe('Inter');
      expect(modernTemplate!.layout.type).toBe('modern');
      
      // Classic Elegant Template
      const classicTemplate = templates.find(t => t.id === SYSTEM_TEMPLATE_IDS.CLASSIC_ELEGANT);
      expect(classicTemplate).toBeDefined();
      expect(classicTemplate!.colorScheme.primary).toBe('#1f2937');
      expect(classicTemplate!.typography.primaryFont).toBe('Times New Roman');
      expect(classicTemplate!.layout.type).toBe('classic');
      
      // Creative Bold Template
      const creativeTemplate = templates.find(t => t.id === SYSTEM_TEMPLATE_IDS.CREATIVE_BOLD);
      expect(creativeTemplate).toBeDefined();
      expect(creativeTemplate!.colorScheme.primary).toBe('#7c3aed');
      expect(creativeTemplate!.typography.primaryFont).toBe('Roboto');
      expect(creativeTemplate!.layout.type).toBe('modern');
    });
  });

  describe('Organization-Templates', () => {
    it('sollte Organization-Templates laden und cachen', async () => {
      const mockTemplateDoc = {
        id: 'org-template-1',
        data: () => ({
          template: mockCustomTemplate
        } as PDFTemplateDocument)
      };
      
      mockGetDocs.mockResolvedValue({
        docs: [mockTemplateDoc]
      } as any);
      
      const templates = await pdfTemplateService.getOrganizationTemplates(mockOrganizationId);
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe(mockCustomTemplate.id);
      expect(templates[0].organizationId).toBe(mockOrganizationId);
    });

    it('sollte leere Liste für Organization ohne Templates zurückgeben', async () => {
      mockGetDocs.mockResolvedValue({
        docs: []
      } as any);
      
      const templates = await pdfTemplateService.getOrganizationTemplates('empty-org');
      
      expect(templates).toEqual([]);
    });

    it('sollte Multi-Tenancy durch organizationId filtern', async () => {
      await pdfTemplateService.getOrganizationTemplates(mockOrganizationId);
      
      expect(mockWhere).toHaveBeenCalledWith(
        'template.organizationId',
        '==',
        mockOrganizationId
      );
      expect(mockWhere).toHaveBeenCalledWith(
        'template.isActive',
        '==',
        true
      );
    });

    it('sollte alle Templates (System + Org) für Organization kombinieren', async () => {
      const mockOrgTemplateDoc = {
        id: 'org-template-1',
        data: () => ({ template: mockCustomTemplate })
      };
      
      mockGetDocs.mockResolvedValue({
        docs: [mockOrgTemplateDoc]
      } as any);
      
      const allTemplates = await pdfTemplateService.getAllTemplatesForOrganization(mockOrganizationId);
      
      expect(allTemplates.length).toBeGreaterThan(3); // 3 System + mindestens 1 Custom
      
      // System-Templates sollten enthalten sein
      const systemTemplates = allTemplates.filter(t => t.isSystem);
      expect(systemTemplates).toHaveLength(3);
      
      // Custom Templates sollten enthalten sein
      const customTemplates = allTemplates.filter(t => !t.isSystem);
      expect(customTemplates).toHaveLength(1);
    });
  });

  describe('Default-Template Management', () => {
    it('sollte Default-Template für Organization setzen', async () => {
      const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
      
      mockGetDoc.mockResolvedValue({
        exists: () => false
      } as any);
      
      mockSetDoc.mockResolvedValue(undefined);
      
      await pdfTemplateService.setDefaultTemplate(mockOrganizationId, templateId);
      
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          organizationId: mockOrganizationId,
          defaultTemplateId: templateId,
          updatedAt: expect.anything()
        }),
        { merge: true }
      );
    });

    it('sollte Default-Template laden', async () => {
      const mockSettingsDoc = {
        exists: () => true,
        data: () => ({
          defaultTemplateId: SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL
        })
      };
      
      mockGetDoc.mockResolvedValue(mockSettingsDoc as any);
      
      const defaultTemplate = await pdfTemplateService.getDefaultTemplate(mockOrganizationId);
      
      expect(defaultTemplate).toBeDefined();
      expect(defaultTemplate.id).toBe(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
    });

    it('sollte Fallback auf erstes System-Template verwenden', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      } as any);
      
      const fallbackTemplate = await pdfTemplateService.getDefaultTemplate('nonexistent-org');
      
      expect(fallbackTemplate).toBeDefined();
      expect(fallbackTemplate.id).toBe(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
    });
  });

  describe('Template-Vorschau-Generation', () => {
    it('sollte Template-Vorschau mit Mock-Daten generieren', async () => {
      const { templateRenderer } = require('@/lib/pdf/template-renderer');
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      templateCache.getHtml.mockReturnValue(null); // Kein Cache
      templateRenderer.renderTemplate.mockResolvedValue('<html><body>Test HTML</body></html>');
      
      const preview = await pdfTemplateService.getTemplatePreview(
        SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        mockPRData
      );
      
      expect(preview).toContain('<html>');
      expect(preview).toContain('Test HTML');
      expect(templateCache.setHtml).toHaveBeenCalled();
    });

    it('sollte Template-Vorschau aus Cache laden für bessere Performance', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      const cachedHtml = '<html><body>Cached Preview</body></html>';
      templateCache.getHtml.mockReturnValue(cachedHtml);
      
      const startTime = Date.now();
      const preview = await pdfTemplateService.getTemplatePreview(
        SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        mockPRData
      );
      const endTime = Date.now();
      
      expect(preview).toBe(cachedHtml);
      expect(endTime - startTime).toBeLessThan(50); // Cache sollte sehr schnell sein
    });

    it('sollte Template-Customizations in Vorschau anwenden', async () => {
      const { templateRenderer } = require('@/lib/pdf/template-renderer');
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      templateCache.getHtml.mockReturnValue(null);
      templateRenderer.renderTemplate.mockResolvedValue('<html><body>Custom HTML</body></html>');
      
      const customizations: Partial<PDFTemplate> = {
        colorScheme: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          text: '#000000',
          background: '#ffffff',
          border: '#cccccc'
        }
      };
      
      const preview = await pdfTemplateService.getTemplatePreview(
        SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        mockPRData,
        customizations
      );
      
      expect(preview).toContain('Custom HTML');
      // CSS sollte custom Farben enthalten
      expect(preview).toContain('#ff0000'); // Custom primary color
    });

    it('sollte Performance-Metriken für Preview-Generation tracken', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      templateCache.getHtml.mockReturnValue(null);
      
      await pdfTemplateService.getTemplatePreview(
        SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        mockPRData
      );
      
      const metrics = pdfTemplateService.getPerformanceMetrics();
      expect(metrics.previewGenerations).toBeGreaterThan(0);
      expect(metrics.averageRenderTime).toBeGreaterThan(0);
    });
  });

  describe('Custom Template Upload', () => {
    const createMockFile = (name: string, type: string, size: number, content: string): File => {
      const file = new File([content], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('sollte valides JSON-Template hochladen', async () => {
      const validJsonTemplate = JSON.stringify({
        layout: { type: 'modern' },
        colorScheme: { primary: '#000000' },
        typography: { primaryFont: 'Arial' }
      });
      
      const mockFile = createMockFile(
        'template.json',
        'application/json',
        1024,
        validJsonTemplate
      );
      
      // Mock Storage Upload
      mockUploadBytes.mockResolvedValue({
        ref: { fullPath: 'templates/org/template.json' }
      } as any);
      mockGetDownloadURL.mockResolvedValue('https://storage.example.com/template.json');
      
      // Mock Firestore Set
      mockSetDoc.mockResolvedValue(undefined);
      
      const uploadedTemplate = await pdfTemplateService.uploadCustomTemplate(
        mockOrganizationId,
        mockFile,
        {
          name: 'Custom JSON Template',
          description: 'Test upload'
        }
      );
      
      expect(uploadedTemplate).toBeDefined();
      expect(uploadedTemplate.name).toBe('Custom JSON Template');
      expect(uploadedTemplate.organizationId).toBe(mockOrganizationId);
      expect(uploadedTemplate.isSystem).toBe(false);
      
      expect(mockUploadBytes).toHaveBeenCalled();
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('sollte Template-File-Validierung durchführen', async () => {
      // Test File-Typ Validierung
      const invalidFile = createMockFile(
        'template.txt',
        'text/plain',
        1024,
        'invalid content'
      );
      
      await expect(
        pdfTemplateService.uploadCustomTemplate(
          mockOrganizationId,
          invalidFile,
          { name: 'Invalid Template' }
        )
      ).rejects.toThrow('Unsupported file type');
    });

    it('sollte zu große Files ablehnen', async () => {
      const tooLargeFile = createMockFile(
        'template.json',
        'application/json',
        6 * 1024 * 1024, // 6MB
        JSON.stringify({ test: 'data' })
      );
      
      await expect(
        pdfTemplateService.uploadCustomTemplate(
          mockOrganizationId,
          tooLargeFile,
          { name: 'Large Template' }
        )
      ).rejects.toThrow('File too large');
    });

    it('sollte JSON-Template-Struktur validieren', async () => {
      const invalidJsonTemplate = JSON.stringify({
        // Fehlende required properties
        name: 'Invalid Template'
      });
      
      const mockFile = createMockFile(
        'template.json',
        'application/json',
        1024,
        invalidJsonTemplate
      );
      
      await expect(
        pdfTemplateService.uploadCustomTemplate(
          mockOrganizationId,
          mockFile,
          { name: 'Invalid JSON Template' }
        )
      ).rejects.toThrow('JSON template missing required properties');
    });

    it('sollte HTML-Template-Struktur validieren', async () => {
      const invalidHtml = '<div>Invalid HTML</div>'; // Fehlende html, head, body tags
      
      const mockFile = createMockFile(
        'template.html',
        'text/html',
        1024,
        invalidHtml
      );
      
      await expect(
        pdfTemplateService.uploadCustomTemplate(
          mockOrganizationId,
          mockFile,
          { name: 'Invalid HTML Template' }
        )
      ).rejects.toThrow('HTML template missing required structure');
    });
  });

  describe('Template Usage Tracking', () => {
    it('sollte Template Usage korrekt incrementieren', async () => {
      const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
      
      // Mock Campaign Update
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);
      
      await pdfTemplateService.applyTemplate(
        'campaign-123',
        templateId,
        { colorScheme: { primary: '#custom' } }
      );
      
      // System-Template Usage sollte in Metrics Collection getrackt werden
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          templateId,
          usageCount: expect.anything(),
          lastUsed: expect.anything()
        }),
        { merge: true }
      );
      
      // Campaign sollte mit Template-Info aktualisiert werden
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          templateId,
          templateOverrides: expect.anything(),
          templateAppliedAt: expect.anything()
        })
      );
    });

    it('sollte Usage-Statistiken für Organization laden', async () => {
      const mockSystemTemplates = [
        { ...mockSystemTemplate, usageCount: 10 },
        { ...mockSystemTemplate, id: 'system-2', usageCount: 5 }
      ];
      
      const mockOrgTemplates = [
        { ...mockCustomTemplate, usageCount: 3 }
      ];
      
      // Mock Template Loading
      jest.spyOn(pdfTemplateService, 'getAllTemplatesForOrganization')
        .mockResolvedValue([...mockSystemTemplates, ...mockOrgTemplates]);
      
      const stats = await pdfTemplateService.getTemplateUsageStats(mockOrganizationId);
      
      expect(stats).toHaveLength(3);
      
      // Sollte nach Usage Count sortiert sein (DESC)
      expect(stats[0].usageCount).toBe(10);
      expect(stats[1].usageCount).toBe(5);
      expect(stats[2].usageCount).toBe(3);
      
      // Sollte isSystem Flag korrekt setzen
      expect(stats[0].isSystem).toBe(true);
      expect(stats[2].isSystem).toBe(false);
    });
  });

  describe('Template Cache Management', () => {
    it('sollte Template-Cache bereinigen können', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      pdfTemplateService.clearCache();
      
      expect(templateCache.clear).toHaveBeenCalled();
    });

    it('sollte spezifischen Template-Cache invalidieren', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      templateCache.analyze.mockReturnValue({
        templateCache: {
          entries: [
            { key: 'template-123', size: 100 },
            { key: 'html-template-123', size: 200 }
          ]
        }
      });
      
      pdfTemplateService.invalidateTemplateCache('template-123');
      
      expect(templateCache.clearCache).toHaveBeenCalledWith('template');
      expect(templateCache.clearCache).toHaveBeenCalledWith('html');
      expect(templateCache.clearCache).toHaveBeenCalledWith('css');
    });

    it('sollte Cache-Warm-Up für Organization durchführen', async () => {
      const systemTemplatesSpy = jest.spyOn(pdfTemplateService, 'getSystemTemplates');
      const orgTemplatesSpy = jest.spyOn(pdfTemplateService, 'getOrganizationTemplates');
      const defaultTemplateSpy = jest.spyOn(pdfTemplateService, 'getDefaultTemplate');
      
      await pdfTemplateService.warmUpCache(mockOrganizationId);
      
      expect(systemTemplatesSpy).toHaveBeenCalled();
      expect(orgTemplatesSpy).toHaveBeenCalledWith(mockOrganizationId);
      expect(defaultTemplateSpy).toHaveBeenCalledWith(mockOrganizationId);
    });
  });

  describe('Custom Template Deletion', () => {
    it('sollte Custom Template erfolgreich löschen', async () => {
      const customTemplateId = 'custom_123';
      
      const mockTemplateDoc = {
        exists: () => true,
        data: () => ({
          uploadedFile: {
            storageUrl: 'https://storage.example.com/template.json'
          }
        } as PDFTemplateDocument)
      };
      
      mockGetDoc.mockResolvedValue(mockTemplateDoc as any);
      mockDeleteObject.mockResolvedValue(undefined);
      mockDeleteDoc.mockResolvedValue(undefined);
      
      await pdfTemplateService.deleteCustomTemplate(customTemplateId);
      
      expect(mockDeleteObject).toHaveBeenCalled();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('sollte System-Templates nicht löschen können', async () => {
      await expect(
        pdfTemplateService.deleteCustomTemplate(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL)
      ).rejects.toThrow('System-Templates können nicht gelöscht werden');
    });

    it('sollte graceful mit Storage-Fehlern umgehen', async () => {
      const customTemplateId = 'custom_123';
      
      const mockTemplateDoc = {
        exists: () => true,
        data: () => ({
          uploadedFile: {
            storageUrl: 'https://storage.example.com/template.json'
          }
        })
      };
      
      mockGetDoc.mockResolvedValue(mockTemplateDoc as any);
      mockDeleteObject.mockRejectedValue(new Error('Storage error'));
      mockDeleteDoc.mockResolvedValue(undefined);
      
      // Sollte nicht werfen, auch wenn Storage-Delete fehlschlägt
      await expect(
        pdfTemplateService.deleteCustomTemplate(customTemplateId)
      ).resolves.not.toThrow();
      
      expect(mockDeleteDoc).toHaveBeenCalled(); // Document sollte trotzdem gelöscht werden
    });
  });

  describe('Performance & Error Handling', () => {
    it('sollte Performance-Metriken korrekt berechnen', async () => {
      const { templateCache } = require('@/lib/pdf/template-cache');
      
      templateCache.getStats.mockReturnValue({
        templateCache: { size: 10, hits: 8, misses: 2 },
        htmlCache: { size: 5, hits: 4, misses: 1 },
        cssCache: { size: 3, hits: 2, misses: 1 }
      });
      
      const metrics = pdfTemplateService.getPerformanceMetrics();
      
      expect(metrics.efficiency.cacheHitRate).toBeGreaterThan(0);
      expect(metrics.cache).toBeDefined();
    });

    it('sollte Fehler bei Template-Loading graceful behandeln', async () => {
      mockGetDoc.mockRejectedValue(new Error('Database error'));
      
      const template = await pdfTemplateService.getTemplate('nonexistent-template');
      
      expect(template).toBeNull();
    });

    it('sollte Fehler bei Organization-Templates graceful behandeln', async () => {
      mockGetDocs.mockRejectedValue(new Error('Query error'));
      
      await expect(
        pdfTemplateService.getOrganizationTemplates('error-org')
      ).rejects.toThrow('Organization-Templates konnten nicht geladen werden');
    });

    it('sollte System-Template als Fallback verwenden bei Fehlern', async () => {
      mockGetDoc.mockRejectedValue(new Error('Settings load error'));
      
      const fallbackTemplate = await pdfTemplateService.getDefaultTemplate('error-org');
      
      expect(fallbackTemplate).toBeDefined();
      expect(fallbackTemplate.isSystem).toBe(true);
      expect(fallbackTemplate.id).toBe(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
    });
  });

  describe('Template-System Integration', () => {
    it('sollte Template korrekt auf Campaign anwenden', async () => {
      const campaignId = 'campaign-123';
      const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
      const overrides = { colorScheme: { primary: '#custom-color' } };
      
      mockUpdateDoc.mockResolvedValue(undefined);
      mockSetDoc.mockResolvedValue(undefined);
      
      await pdfTemplateService.applyTemplate(campaignId, templateId, overrides);
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          templateId,
          templateOverrides: overrides,
          templateAppliedAt: expect.anything()
        })
      );
    });

    it('sollte Multi-Tenancy bei Template-Operationen sicherstellen', async () => {
      const orgId1 = 'org-1';
      const orgId2 = 'org-2';
      
      // Setup Mock für verschiedene Organizations
      mockGetDocs.mockImplementation((query) => {
        // Simuliere dass nur Templates der jeweiligen Organization zurückgegeben werden
        return Promise.resolve({ docs: [] });
      });
      
      await pdfTemplateService.getOrganizationTemplates(orgId1);
      await pdfTemplateService.getOrganizationTemplates(orgId2);
      
      // Jede Abfrage sollte organizationId-Filter verwenden
      expect(mockWhere).toHaveBeenCalledWith('template.organizationId', '==', orgId1);
      expect(mockWhere).toHaveBeenCalledWith('template.organizationId', '==', orgId2);
    });
  });

  describe('Edge Cases und Boundary Tests', () => {
    it('sollte sehr große Template-Listen handhaben', async () => {
      // Simuliere 100 Templates
      const manyTemplates = Array.from({ length: 100 }, (_, i) => ({
        id: `template-${i}`,
        data: () => ({ template: { ...mockCustomTemplate, id: `template-${i}` } })
      }));
      
      mockGetDocs.mockResolvedValue({ docs: manyTemplates } as any);
      
      const startTime = Date.now();
      const templates = await pdfTemplateService.getOrganizationTemplates(mockOrganizationId);
      const endTime = Date.now();
      
      expect(templates).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Sollte unter 1s bleiben
    });

    it('sollte leere Template-Responses handhaben', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);
      
      const templates = await pdfTemplateService.getOrganizationTemplates(mockOrganizationId);
      expect(templates).toEqual([]);
      
      const stats = await pdfTemplateService.getTemplateUsageStats(mockOrganizationId);
      expect(stats).toEqual([]);
    });

    it('sollte korrupte Template-Daten handhaben', async () => {
      const corruptTemplateDoc = {
        id: 'corrupt-template',
        data: () => null // Korrupte Daten
      };
      
      mockGetDocs.mockResolvedValue({ docs: [corruptTemplateDoc] } as any);
      
      // Sollte nicht crashed, sondern graceful handhaben
      await expect(
        pdfTemplateService.getOrganizationTemplates(mockOrganizationId)
      ).resolves.not.toThrow();
    });
  });
});
