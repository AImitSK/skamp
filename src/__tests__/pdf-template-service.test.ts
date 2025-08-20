// src/__tests__/pdf-template-service.test.ts - Umfassende Tests für PDF-Template-System

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PDFTemplateService } from '@/lib/firebase/pdf-template-service';
import { PDFTemplate, SYSTEM_TEMPLATE_IDS, MockPRData } from '@/types/pdf-template';
import { TemplateCache } from '@/lib/pdf/template-cache';

// Mock Firebase
jest.mock('@/lib/firebase/config', () => ({
  db: {},
  storage: {}
}));

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
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  increment: jest.fn((value) => value),
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() }))
  }
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn()
}));

// Mock Template Renderer
jest.mock('@/lib/pdf/template-renderer', () => ({
  templateRenderer: {
    renderTemplate: jest.fn(),
    renderWithPDFTemplate: jest.fn()
  }
}));

describe('PDFTemplateService', () => {
  let templateService: PDFTemplateService;
  let mockCache: jest.Mocked<TemplateCache>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh service instance
    templateService = new PDFTemplateService();
    
    // Mock cache
    mockCache = {
      getTemplate: jest.fn(),
      setTemplate: jest.fn(),
      hasTemplate: jest.fn(),
      getHtml: jest.fn(),
      setHtml: jest.fn(),
      getCss: jest.fn(),
      setCss: jest.fn(),
      generateHtmlCacheKey: jest.fn(),
      generateCssCacheKey: jest.fn(),
      clear: jest.fn(),
      clearCache: jest.fn(),
      getStats: jest.fn(),
      analyze: jest.fn()
    } as any;
  });

  afterEach(() => {
    // Cleanup
    templateService?.clearCache();
  });

  describe('System Templates', () => {
    it('sollte alle System-Templates zurückgeben', async () => {
      const templates = await templateService.getSystemTemplates();
      
      expect(templates).toHaveLength(3);
      expect(templates.map(t => t.id)).toEqual([
        SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
        SYSTEM_TEMPLATE_IDS.CLASSIC_ELEGANT,
        SYSTEM_TEMPLATE_IDS.CREATIVE_BOLD
      ]);
    });

    it('sollte System-Templates mit korrekter Struktur zurückgeben', async () => {
      const templates = await templateService.getSystemTemplates();
      
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('version');
        expect(template).toHaveProperty('colorScheme');
        expect(template).toHaveProperty('typography');
        expect(template).toHaveProperty('layout');
        expect(template).toHaveProperty('components');
        expect(template.isSystem).toBe(true);
        expect(template.isActive).toBe(true);
        
        // Color Scheme Validation
        expect(template.colorScheme).toHaveProperty('primary');
        expect(template.colorScheme).toHaveProperty('secondary');
        expect(template.colorScheme).toHaveProperty('accent');
        expect(template.colorScheme).toHaveProperty('text');
        expect(template.colorScheme).toHaveProperty('background');
        expect(template.colorScheme).toHaveProperty('border');
        
        // Typography Validation
        expect(template.typography).toHaveProperty('primaryFont');
        expect(template.typography).toHaveProperty('baseFontSize');
        expect(template.typography).toHaveProperty('lineHeight');
        expect(template.typography).toHaveProperty('headingScale');
        expect(Array.isArray(template.typography.headingScale)).toBe(true);
        
        // Layout Validation
        expect(template.layout).toHaveProperty('type');
        expect(template.layout).toHaveProperty('margins');
        expect(template.layout).toHaveProperty('headerHeight');
        expect(template.layout).toHaveProperty('footerHeight');
      });
    });

    it('sollte Modern Professional Template korrekt erstellen', async () => {
      const templates = await templateService.getSystemTemplates();
      const modernTemplate = templates.find(t => t.id === SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
      
      expect(modernTemplate).toBeDefined();
      expect(modernTemplate!.name).toBe('Modern Professional');
      expect(modernTemplate!.colorScheme.primary).toBe('#005fab');
      expect(modernTemplate!.typography.primaryFont).toBe('Inter');
      expect(modernTemplate!.layout.type).toBe('modern');
    });

    it('sollte Classic Elegant Template korrekt erstellen', async () => {
      const templates = await templateService.getSystemTemplates();
      const classicTemplate = templates.find(t => t.id === SYSTEM_TEMPLATE_IDS.CLASSIC_ELEGANT);
      
      expect(classicTemplate).toBeDefined();
      expect(classicTemplate!.name).toBe('Classic Elegant');
      expect(classicTemplate!.colorScheme.primary).toBe('#1f2937');
      expect(classicTemplate!.typography.primaryFont).toBe('Times New Roman');
      expect(classicTemplate!.layout.type).toBe('classic');
    });

    it('sollte Creative Bold Template korrekt erstellen', async () => {
      const templates = await templateService.getSystemTemplates();
      const creativeTemplate = templates.find(t => t.id === SYSTEM_TEMPLATE_IDS.CREATIVE_BOLD);
      
      expect(creativeTemplate).toBeDefined();
      expect(creativeTemplate!.name).toBe('Creative Bold');
      expect(creativeTemplate!.colorScheme.primary).toBe('#7c3aed');
      expect(creativeTemplate!.typography.primaryFont).toBe('Roboto');
      expect(creativeTemplate!.layout.type).toBe('modern');
    });
  });

  describe('Template Loading', () => {
    it('sollte einzelnes System-Template korrekt laden', async () => {
      const template = await templateService.getTemplate(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
      
      expect(template).toBeDefined();
      expect(template!.id).toBe(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
      expect(template!.isSystem).toBe(true);
    });

    it('sollte null für nicht existierende Templates zurückgeben', async () => {
      const template = await templateService.getTemplate('non-existent-template');
      
      expect(template).toBeNull();
    });

    it('sollte Default-Template für Organization laden', async () => {
      const organizationId = 'test-org-123';
      
      // Mock: Kein spezifisches Default-Template in Settings
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValueOnce({ exists: () => false });
      
      const defaultTemplate = await templateService.getDefaultTemplate(organizationId);
      
      expect(defaultTemplate).toBeDefined();
      expect(defaultTemplate.id).toBe(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL);
    });
  });

  describe('Template Validation', () => {
    it('sollte gültige JSON-Template-Datei akzeptieren', async () => {
      const validTemplate = {
        name: 'Test Template',
        colorScheme: { primary: '#000000' },
        typography: { primaryFont: 'Arial' },
        layout: { type: 'modern' }
      };
      
      const file = new File(
        [JSON.stringify(validTemplate)], 
        'template.json', 
        { type: 'application/json' }
      );
      
      const validation = await templateService.validateTemplateFile(file);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('sollte ungültiges JSON ablehnen', async () => {
      const file = new File(
        ['invalid json content'], 
        'template.json', 
        { type: 'application/json' }
      );
      
      const validation = await templateService.validateTemplateFile(file);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('sollte zu große Dateien ablehnen', async () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'large.json', { type: 'application/json' });
      
      const validation = await templateService.validateTemplateFile(file);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('File too large (max 5MB)');
    });

    it('sollte nicht unterstützte Dateitypen ablehnen', async () => {
      const file = new File(['content'], 'template.txt', { type: 'text/plain' });
      
      const validation = await templateService.validateTemplateFile(file);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unsupported file type: text/plain');
    });
  });

  describe('Template Preview', () => {
    const mockData: MockPRData = {
      title: 'Test Pressemitteilung',
      content: '<p>Test content</p>',
      companyName: 'Test GmbH',
      contactInfo: 'test@example.com',
      date: '2024-01-15'
    };

    beforeEach(() => {
      // Mock template renderer
      const { templateRenderer } = require('@/lib/pdf/template-renderer');
      templateRenderer.renderTemplate.mockResolvedValue('<html><body>Mock HTML</body></html>');
    });

    it('sollte Template-Preview erfolgreich generieren', async () => {
      const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
      
      const preview = await templateService.getTemplatePreview(templateId, mockData);
      
      expect(preview).toContain('<html>');
      expect(preview).toContain('<body>');
      expect(typeof preview).toBe('string');
    });

    it('sollte Template-Preview mit Customizations generieren', async () => {
      const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
      const customizations = {
        colorScheme: {
          primary: '#ff0000',
          secondary: '#00ff00'
        }
      };
      
      const preview = await templateService.getTemplatePreview(templateId, mockData, customizations);
      
      expect(preview).toContain('<html>');
      expect(preview).toContain('#ff0000'); // Custom primary color should be in CSS
    });

    it('sollte Fehler für nicht existierende Templates werfen', async () => {
      await expect(
        templateService.getTemplatePreview('non-existent', mockData)
      ).rejects.toThrow('Template non-existent nicht gefunden');
    });
  });

  describe('Template Application', () => {
    it('sollte Template auf Campaign erfolgreich anwenden', async () => {
      const campaignId = 'test-campaign-123';
      const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
      
      // Mock Firestore updateDoc
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockResolvedValueOnce({});
      
      await expect(
        templateService.applyTemplate(campaignId, templateId)
      ).resolves.not.toThrow();
      
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          templateId: templateId,
          templateOverrides: {},
          templateAppliedAt: expect.any(Date)
        })
      );
    });

    it('sollte Template mit Overrides anwenden', async () => {
      const campaignId = 'test-campaign-123';
      const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
      const overrides = {
        colorScheme: { primary: '#custom-color' }
      };
      
      // Mock Firestore updateDoc
      const { updateDoc } = require('firebase/firestore');
      updateDoc.mockResolvedValueOnce({});
      
      await templateService.applyTemplate(campaignId, templateId, overrides);
      
      expect(updateDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          templateId: templateId,
          templateOverrides: overrides
        })
      );
    });
  });

  describe('Default Template Management', () => {
    it('sollte Default-Template erfolgreich setzen', async () => {
      const organizationId = 'test-org-123';
      const templateId = SYSTEM_TEMPLATE_IDS.CLASSIC_ELEGANT;
      
      // Mock Firestore setDoc
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValueOnce({});
      
      await expect(
        templateService.setDefaultTemplate(organizationId, templateId)
      ).resolves.not.toThrow();
      
      expect(setDoc).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          organizationId,
          defaultTemplateId: templateId
        }),
        { merge: true }
      );
    });

    it('sollte Fehler für nicht existierende Templates werfen', async () => {
      const organizationId = 'test-org-123';
      const templateId = 'non-existent-template';
      
      await expect(
        templateService.setDefaultTemplate(organizationId, templateId)
      ).rejects.toThrow('Template non-existent-template nicht gefunden');
    });
  });

  describe('Usage Statistics', () => {
    it('sollte Usage-Statistiken erfolgreich laden', async () => {
      const organizationId = 'test-org-123';
      
      // Mock Organization Templates (empty)
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValueOnce({
        forEach: jest.fn()
      });
      
      const stats = await templateService.getTemplateUsageStats(organizationId);
      
      expect(Array.isArray(stats)).toBe(true);
      // Mindestens System-Templates sollten in Stats sein
      expect(stats.length).toBeGreaterThanOrEqual(3);
      
      stats.forEach(stat => {
        expect(stat).toHaveProperty('templateId');
        expect(stat).toHaveProperty('templateName');
        expect(stat).toHaveProperty('usageCount');
        expect(stat).toHaveProperty('isSystem');
        expect(typeof stat.usageCount).toBe('number');
      });
    });
  });

  describe('Cache Management', () => {
    it('sollte Cache erfolgreich bereinigen', () => {
      expect(() => templateService.clearCache()).not.toThrow();
    });

    it('sollte Performance-Metriken zurückgeben', () => {
      const metrics = templateService.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('templateLoads');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('previewGenerations');
      expect(metrics).toHaveProperty('averageRenderTime');
      expect(metrics).toHaveProperty('efficiency');
      
      expect(typeof metrics.templateLoads).toBe('number');
      expect(typeof metrics.cacheHits).toBe('number');
      expect(typeof metrics.cacheMisses).toBe('number');
    });

    it('sollte Cache Warm-Up durchführen', async () => {
      const organizationId = 'test-org-123';
      
      // Mock getDocs für Organization Templates
      const { getDocs } = require('firebase/firestore');
      getDocs.mockResolvedValueOnce({
        forEach: jest.fn()
      });
      
      await expect(
        templateService.warmUpCache(organizationId)
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('sollte Firestore-Fehler korrekt behandeln', async () => {
      const organizationId = 'test-org-123';
      
      // Mock Firestore error
      const { getDocs } = require('firebase/firestore');
      getDocs.mockRejectedValueOnce(new Error('Firestore connection failed'));
      
      await expect(
        templateService.getOrganizationTemplates(organizationId)
      ).rejects.toThrow('Organization-Templates konnten nicht geladen werden');
    });

    it('sollte ungültige Template-IDs korrekt behandeln', async () => {
      const result = await templateService.getTemplate('');
      expect(result).toBeNull();
    });

    it('sollte Preview-Fehler korrekt behandeln', async () => {
      // Mock template renderer error
      const { templateRenderer } = require('@/lib/pdf/template-renderer');
      templateRenderer.renderTemplate.mockRejectedValueOnce(new Error('Rendering failed'));
      
      const mockData: MockPRData = {
        title: 'Test',
        content: 'Test',
        companyName: 'Test',
        contactInfo: 'test@test.com',
        date: '2024-01-01'
      };
      
      await expect(
        templateService.getTemplatePreview(SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL, mockData)
      ).rejects.toThrow('Template-Vorschau konnte nicht generiert werden');
    });
  });

  describe('Integration Tests', () => {
    it('sollte vollständigen Template-Workflow durchführen', async () => {
      const organizationId = 'test-org-integration';
      
      // 1. System-Templates laden
      const systemTemplates = await templateService.getSystemTemplates();
      expect(systemTemplates.length).toBe(3);
      
      // 2. Default-Template setzen
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValueOnce({});
      
      await templateService.setDefaultTemplate(organizationId, systemTemplates[1].id);
      
      // 3. Template laden
      const template = await templateService.getTemplate(systemTemplates[1].id);
      expect(template).toBeDefined();
      
      // 4. Preview generieren
      const { templateRenderer } = require('@/lib/pdf/template-renderer');
      templateRenderer.renderTemplate.mockResolvedValue('<html><body>Test</body></html>');
      
      const mockData: MockPRData = {
        title: 'Integration Test',
        content: '<p>Integration test content</p>',
        companyName: 'Test Company',
        contactInfo: 'integration@test.com',
        date: new Date().toLocaleDateString('de-DE')
      };
      
      const preview = await templateService.getTemplatePreview(template!.id, mockData);
      expect(preview).toContain('<html>');
      
      // 5. Performance-Metriken prüfen
      const metrics = templateService.getPerformanceMetrics();
      expect(metrics.templateLoads).toBeGreaterThan(0);
    });
  });
});

describe('Template Cache Integration', () => {
  let templateService: PDFTemplateService;
  
  beforeEach(() => {
    templateService = new PDFTemplateService();
  });
  
  afterEach(() => {
    templateService?.clearCache();
  });

  it('sollte Templates erfolgreich cachen und aus Cache laden', async () => {
    // Erstes Laden - sollte Cache-Miss sein
    const templates1 = await templateService.getSystemTemplates();
    
    // Zweites Laden - sollte aus Cache kommen
    const templates2 = await templateService.getSystemTemplates();
    
    expect(templates1).toEqual(templates2);
    
    const metrics = templateService.getPerformanceMetrics();
    expect(metrics.cacheHits).toBeGreaterThan(0);
  });

  it('sollte Template-Previews cachen', async () => {
    const templateId = SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL;
    const mockData: MockPRData = {
      title: 'Cache Test',
      content: 'Test content',
      companyName: 'Test',
      contactInfo: 'test@test.com', 
      date: '2024-01-01'
    };
    
    // Mock template renderer
    const { templateRenderer } = require('@/lib/pdf/template-renderer');
    templateRenderer.renderTemplate.mockResolvedValue('<html><body>Cached HTML</body></html>');
    
    // Erste Preview-Generierung
    const preview1 = await templateService.getTemplatePreview(templateId, mockData);
    
    // Zweite Preview-Generierung - sollte aus Cache kommen
    const preview2 = await templateService.getTemplatePreview(templateId, mockData);
    
    expect(preview1).toBe(preview2);
    expect(preview1).toContain('Cached HTML');
  });
});