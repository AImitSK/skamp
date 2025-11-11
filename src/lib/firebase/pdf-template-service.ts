// src/lib/firebase/pdf-template-service.ts - Service für PDF-Template-Management

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
  limit,
  Timestamp,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import { 
  PDFTemplate, 
  PDFTemplateDocument, 
  TemplateValidationResult,
  MockPRData,
  TemplateUsageStats,
  OrganizationTemplateSettings,
  SystemTemplateId,
  SYSTEM_TEMPLATE_IDS,
  TemplatePerformanceMetrics
} from '@/types/pdf-template';
// Dynamic import für Server-seitige Module
import type { TemplateData } from '@/lib/pdf/template-renderer';
import Mustache from 'mustache';

// Conditional imports für Server-seitige Module
let templateCache: any = null;
let TemplateCache: any = null;

// Lazy loading für Template-Cache (nur Server-side)
const getTemplateCache = async () => {
  if (typeof window !== 'undefined') return null; // Client-side: nicht verfügbar
  
  if (!templateCache) {
    const cacheModule = await import('@/lib/pdf/template-cache');
    templateCache = cacheModule.templateCache;
    TemplateCache = cacheModule.TemplateCache;
  }
  return templateCache;
};

/**
 * Service für PDF-Template-Management
 * Handles CRUD-Operationen, System-Templates, Custom-Templates und Caching
 */
class PDFTemplateService {
  private readonly COLLECTION_NAME = 'pdf_templates';
  private readonly ORG_SETTINGS_COLLECTION = 'organization_template_settings';
  private readonly METRICS_COLLECTION = 'template_metrics';
  private cache: any = null;
  
  // Performance-Metriken
  private performanceMetrics = {
    templateLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    previewGenerations: 0,
    averageRenderTime: 0
  };
  
  constructor() {
    // Cache wird lazy geladen
    this.initCache();
  }

  private async initCache() {
    this.cache = await getTemplateCache();
  }

  /**
   * Template nach ID laden
   */
  async getTemplateById(templateId: string): Promise<PDFTemplate | null> {
    try {
      // Prüfe System-Templates
      const systemTemplates = await this.getSystemTemplates();
      const systemTemplate = systemTemplates.find(t => t.id === templateId);
      if (systemTemplate) {
        return systemTemplate;
      }
      
      // Prüfe Custom-Templates
      const customTemplate = await this.getCustomTemplateById(templateId);
      if (customTemplate) {
        return customTemplate;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * System-Templates laden (mit optimiertem Caching)
   */
  async getSystemTemplates(): Promise<PDFTemplate[]> {
    try {
      const cacheKey = 'system_templates_all';
      
      // Prüfe Cache zuerst (falls verfügbar)
      if (this.cache) {
        const cachedTemplates = this.cache?.getTemplate(cacheKey);
        if (cachedTemplates && Array.isArray(cachedTemplates)) {
          this.performanceMetrics.cacheHits++;
          return cachedTemplates as unknown as PDFTemplate[];
        }
      }

      this.performanceMetrics.cacheMisses++;
      
      const systemTemplates = [
        this.createModernProfessionalTemplate(),
        this.createClassicElegantTemplate(),
        this.createCreativeBoldTemplate()
      ];
      
      // Cache System-Templates (einzeln und als Array) - falls verfügbar
      if (this.cache) {
        systemTemplates.forEach(template => {
          this.cache?.setTemplate(template.id, template);
        });
        
        // Cache auch das komplette Array
        this.cache?.setTemplate(cacheKey, systemTemplates as unknown as PDFTemplate);
      }
      
      this.performanceMetrics.templateLoads++;
      return systemTemplates;
    } catch (error) {
      throw new Error('System-Templates konnten nicht geladen werden');
    }
  }
  
  /**
   * Organization-spezifische Templates laden (mit Caching)
   */
  async getOrganizationTemplates(organizationId: string): Promise<PDFTemplate[]> {
    try {
      const cacheKey = `org_templates_${organizationId}`;
      
      // Prüfe Cache zuerst
      const cachedTemplates = this.cache?.getTemplate(cacheKey);
      if (cachedTemplates && Array.isArray(cachedTemplates)) {
        this.performanceMetrics.cacheHits++;
        return cachedTemplates as unknown as PDFTemplate[];
      }

      this.performanceMetrics.cacheMisses++;
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('template.organizationId', '==', organizationId),
        where('template.isActive', '==', true),
        orderBy('template.createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const templates: PDFTemplate[] = [];
      
      querySnapshot.forEach((doc) => {
        const templateDoc = doc.data() as PDFTemplateDocument;
        templates.push(templateDoc.template);
        
        // Cache einzelne Templates
        this.cache?.setTemplate(templateDoc.template.id, templateDoc.template);
      });
      
      // Cache Template-Array
      if (templates.length > 0) {
        this.cache?.setTemplate(cacheKey, templates as unknown as PDFTemplate);
      }
      
      this.performanceMetrics.templateLoads++;
      return templates;
    } catch (error) {
      throw new Error('Organization-Templates konnten nicht geladen werden');
    }
  }
  
  /**
   * Alle verfügbaren Templates für Organization laden (System + Custom)
   */
  async getAllTemplatesForOrganization(organizationId: string): Promise<PDFTemplate[]> {
    try {
      const [systemTemplates, orgTemplates] = await Promise.all([
        this.getSystemTemplates(),
        this.getOrganizationTemplates(organizationId)
      ]);
      
      return [...systemTemplates, ...orgTemplates];
    } catch (error) {
      throw new Error('Templates konnten nicht geladen werden');
    }
  }
  
  /**
   * Default-Template für Organization ermitteln
   */
  async getDefaultTemplate(organizationId: string): Promise<PDFTemplate> {
    try {
      // Prüfe Organization-Settings
      const settingsDoc = await getDoc(
        doc(db, this.ORG_SETTINGS_COLLECTION, organizationId)
      );
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as OrganizationTemplateSettings;
        const template = await this.getTemplate(settings.defaultTemplateId);
        if (template) {
          return template;
        }
      }
      
      // Fallback: Erstes System-Template
      const systemTemplates = await this.getSystemTemplates();
      return systemTemplates[0]; // Modern Professional
      
    } catch (error) {
      // Ultimate Fallback
      return this.createModernProfessionalTemplate();
    }
  }
  
  /**
   * Einzelnes Template laden (mit optimiertem Caching)
   */
  async getTemplate(templateId: string): Promise<PDFTemplate | null> {
    try {
      const startTime = Date.now();
      
      // Prüfe Cache zuerst
      const cachedTemplate = this.cache?.getTemplate(templateId);
      if (cachedTemplate) {
        this.performanceMetrics.cacheHits++;
        return cachedTemplate;
      }
      
      this.performanceMetrics.cacheMisses++;
      
      // Prüfe System-Templates
      if (Object.values(SYSTEM_TEMPLATE_IDS).includes(templateId as SystemTemplateId)) {
        const systemTemplates = await this.getSystemTemplates();
        const systemTemplate = systemTemplates.find(t => t.id === templateId);
        if (systemTemplate) {
          return systemTemplate;
        }
      }
      
      // Lade aus Firestore
      const templateDoc = await getDoc(
        doc(db, this.COLLECTION_NAME, templateId)
      );
      
      if (!templateDoc.exists()) {
        return null;
      }
      
      const templateData = templateDoc.data() as PDFTemplateDocument;
      const template = templateData.template;
      
      // Cache Template
      this.cache?.setTemplate(template.id, template);
      
      const loadTime = Date.now() - startTime;
      this.performanceMetrics.templateLoads++;
      
      return template;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Default-Template für Organization setzen
   */
  async setDefaultTemplate(organizationId: string, templateId: string): Promise<void> {
    try {
      // Validiere dass Template existiert
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} nicht gefunden`);
      }
      
      // Update Organization-Settings
      const settingsRef = doc(db, this.ORG_SETTINGS_COLLECTION, organizationId);
      await setDoc(settingsRef, {
        organizationId,
        defaultTemplateId: templateId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
    } catch (error) {
      throw new Error('Default-Template konnte nicht gesetzt werden');
    }
  }
  
  /**
   * Custom Template hochladen und validieren
   */
  async uploadCustomTemplate(
    organizationId: string,
    templateFile: File,
    metadata: Partial<PDFTemplate>
  ): Promise<PDFTemplate> {
    try {
      // Validiere Template-File
      const validation = await this.validateTemplateFile(templateFile);
      if (!validation.isValid) {
        throw new Error(`Template-Validation fehlgeschlagen: ${validation.errors.join(', ')}`);
      }
      
      // Parse Template-File
      const templateData = await this.parseTemplateFile(templateFile);
      
      // Erstelle Template-ID
      const templateId = `custom_${organizationId}_${Date.now()}`;
      
      // Upload File zu Storage
      const storageRef = ref(storage, `templates/${organizationId}/${templateFile.name}`);
      const uploadResult = await uploadBytes(storageRef, templateFile);
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      // Erstelle Template-Object
      const customTemplate: PDFTemplate = {
        id: templateId,
        name: metadata.name || 'Custom Template',
        description: metadata.description || 'Benutzerdefiniertes Template',
        version: '1.0.0',
        layout: { 
          type: 'custom',
          headerHeight: 60,
          footerHeight: 40,
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          columns: 1,
          pageFormat: 'A4'
        },
        typography: {
          primaryFont: 'Arial, sans-serif',
          secondaryFont: 'Arial, sans-serif', 
          baseFontSize: 12,
          lineHeight: 1.6,
          headingScale: [24, 20, 16, 14]
        },
        colorScheme: {
          primary: '#005fab',
          secondary: '#6b7280',
          accent: '#10b981',
          background: '#ffffff',
          text: '#111827',
          border: '#e5e7eb'
        },
        components: templateData.components || {
          header: { backgroundColor: '#ffffff', textColor: '#000000' },
          title: { fontSize: 24, fontWeight: 'bold' },
          content: { backgroundColor: '#ffffff', textColor: '#000000' },
          sidebar: { backgroundColor: '#f9f9f9' },
          footer: { backgroundColor: '#ffffff', textColor: '#666666' },
          logo: { backgroundColor: 'transparent' },
          keyVisual: { backgroundColor: 'transparent' },
          boilerplate: { backgroundColor: '#f9f9f9', textColor: '#666666' }
        },
        ...templateData,
        isSystem: false,
        isActive: true,
        createdAt: serverTimestamp() as Timestamp,
        organizationId: organizationId,
        usageCount: 0
      };
      
      // Speichere Template-Document
      const templateDocument: PDFTemplateDocument = {
        id: templateId,
        template: customTemplate,
        isDefault: false,
        usageCount: 0,
        lastUsed: serverTimestamp() as Timestamp,
        uploadedFile: {
          originalName: templateFile.name,
          storageUrl: downloadUrl,
          fileSize: templateFile.size,
          checksum: await this.calculateFileChecksum(templateFile),
          mimeType: templateFile.type
        },
        isCustomization: false
      };
      
      await setDoc(
        doc(db, this.COLLECTION_NAME, templateId),
        templateDocument
      );
      
      // Cache Template falls verfügbar
      // TODO: Template Cache implementieren
      
      return customTemplate;
      
    } catch (error) {
      throw new Error('Custom Template konnte nicht hochgeladen werden');
    }
  }
  
  /**
   * Template-File validieren
   */
  async validateTemplateFile(file: File): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    
    // File-Type prüfen
    const supportedTypes = ['application/json', 'text/html', 'text/css'];
    if (!supportedTypes.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.type}`);
    }
    
    // File-Größe prüfen (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      errors.push('File too large (max 5MB)');
    }
    
    // File-Inhalt validieren
    try {
      const content = await file.text();
      
      if (file.type === 'application/json') {
        const parsed = JSON.parse(content);
        if (!parsed.layout || !parsed.colorScheme || !parsed.typography) {
          errors.push('JSON template missing required properties');
        }
      }
      
      if (file.type === 'text/html') {
        if (!content.includes('<html') || !content.includes('<head') || !content.includes('<body')) {
          errors.push('HTML template missing required structure');
        }
      }
      
    } catch (error) {
      errors.push(`File parsing failed: ${error}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Template auf Campaign anwenden
   */
  async applyTemplate(
    campaignId: string,
    templateId: string,
    overrides?: Partial<PDFTemplate>
  ): Promise<void> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} nicht gefunden`);
      }
      
      // Update Campaign mit Template-Info
      const campaignRef = doc(db, 'pr_campaigns', campaignId);
      await updateDoc(campaignRef, {
        templateId: templateId,
        templateOverrides: overrides || {},
        templateAppliedAt: serverTimestamp()
      });
      
      // Update Template Usage
      await this.incrementTemplateUsage(templateId);
      
    } catch (error) {
      throw new Error('Template konnte nicht angewendet werden');
    }
  }
  
  /**
   * Template-Thumbnail generieren und speichern
   */
  async generateTemplateThumbnail(template: PDFTemplate): Promise<string | undefined> {
    try {
      const mockData: MockPRData = {
        title: 'Beispiel-Pressemitteilung',
        content: '<p>Dies ist eine Vorschau des Template-Designs mit Beispieltext.</p>',
        companyName: template.name,
        date: new Date().toISOString()
      };
      
      // Generiere HTML für Screenshot
      const html = await this.renderTemplateWithStyle(template, {
        title: mockData.title,
        mainContent: mockData.content,
        boilerplateSections: [],
        clientName: mockData.companyName,
        date: mockData.date
      });
      
      // API-Aufruf für Thumbnail-Generierung
      const response = await fetch('/api/templates/generate-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: template.id,
          html: html,
          width: 400,
          height: 300
        })
      });
      
      if (!response.ok) {
        throw new Error('Thumbnail-Generierung fehlgeschlagen');
      }
      
      const { thumbnailUrl } = await response.json();
      
      return thumbnailUrl;
      
    } catch (error) {
      // Kein Fallback mehr - undefined zurückgeben
      return undefined;
    }
  }
  
  /**
   * Standard-Thumbnail basierend auf Template-Typ
   * DEAKTIVIERT: Keine kaputten Links mehr, Thumbnail-Generierung über API
   */
  private getDefaultThumbnail(template: PDFTemplate): string | undefined {
    // Keine Standard-Thumbnails mehr - müssen über API generiert werden
    return undefined;
  }

  /**
   * Template-Vorschau mit Mock-Daten generieren (mit optimiertem Caching)
   */
  async getTemplatePreview(
    templateId: string,
    mockData: MockPRData,
    customizations?: Partial<PDFTemplate>
  ): Promise<string> {
    try {
      const startTime = Date.now();
      this.performanceMetrics.previewGenerations++;
      
      // Generiere Cache-Keys mit Hashes (nur wenn Cache und TemplateCache verfügbar)
      let htmlCacheKey: string | undefined;
      if (this.cache && TemplateCache) {
        try {
          const mockDataHash = TemplateCache.generateHash(mockData);
          const customizationsHash = customizations ? TemplateCache.generateHash(customizations) : undefined;
          htmlCacheKey = this.cache.generateHtmlCacheKey(templateId, mockDataHash, customizationsHash);
          
          // Prüfe HTML-Cache
          const cachedHtml = this.cache.getHtml(htmlCacheKey);
          if (cachedHtml) {
            this.performanceMetrics.cacheHits++;
            return cachedHtml;
          }
        } catch (e) {
          // Cache nicht verfügbar, weiter ohne Caching
        }
      }
      
      this.performanceMetrics.cacheMisses++;
      
      // Lade Template
      let template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template ${templateId} nicht gefunden`);
      }
      
      // Anwendung von Customizations
      if (customizations) {
        template = this.applyCustomizations(template, customizations);
      }
      
      // Generiere HTML mit Template-Daten
      const templateData: TemplateData = {
        title: mockData.title,
        mainContent: mockData.content,
        boilerplateSections: mockData.boilerplateSections || [],
        keyVisual: mockData.keyVisual,
        clientName: mockData.companyName,
        date: mockData.date
      };
      
      // Erweitere Template-Renderer für dieses Template
      const html = await this.renderTemplateWithStyle(template, templateData);
      
      // Cache HTML-Preview (wenn Cache-Key vorhanden)
      if (htmlCacheKey && this.cache) {
        try {
          this.cache.setHtml(htmlCacheKey, html);
        } catch (e) {
          // Fehler beim Caching ignorieren
        }
      }
      
      const renderTime = Date.now() - startTime;
      this.updateAverageRenderTime(renderTime);
      
      return html;
    } catch (error) {
      throw new Error('Template-Vorschau konnte nicht generiert werden');
    }
  }
  
  /**
   * Template-Usage-Statistiken abrufen
   */
  async getTemplateUsageStats(organizationId: string): Promise<TemplateUsageStats[]> {
    try {
      const templates = await this.getAllTemplatesForOrganization(organizationId);
      const stats: TemplateUsageStats[] = [];
      
      for (const template of templates) {
        stats.push({
          templateId: template.id,
          templateName: template.name,
          usageCount: template.usageCount || 0,
          lastUsed: template.lastUsed ? (template.lastUsed as Timestamp).toDate() : new Date(0),
          isDefault: false, // TODO: Check if default
          isSystem: template.isSystem
        });
      }
      
      return stats.sort((a, b) => b.usageCount - a.usageCount);
    } catch (error) {
      return [];
    }
  }
  
  
  /**
   * Cache bereinigen
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Spezifischen Template-Cache invalidieren
   */
  invalidateTemplateCache(templateId: string): void {
    // Suche und lösche alle Cache-Einträge die mit diesem Template zusammenhängen
    const cacheStats = this.cache?.analyze() || {};
    const templateEntries = cacheStats.templateCache.entries.filter(
      (entry: any) => entry.key === templateId || entry.key.includes(templateId)
    );
    
    templateEntries.forEach((entry: any) => {
      // Templates, HTML und CSS für dieses Template löschen
      this.cache?.clearCache('template');
      this.cache?.clearCache('html');
      this.cache?.clearCache('css');
    });
    
  }

  /**
   * Performance-Metriken abrufen
   */
  getPerformanceMetrics(): any {
    const cacheStats = this.cache?.getStats() || {};
    
    return {
      ...this.performanceMetrics,
      cache: cacheStats,
      efficiency: {
        cacheHitRate: this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100,
        averageRenderTime: this.performanceMetrics.averageRenderTime,
        totalOperations: this.performanceMetrics.templateLoads + this.performanceMetrics.previewGenerations
      }
    };
  }

  /**
   * Cache-Warm-Up für häufig verwendete Templates
   */
  async warmUpCache(organizationId: string): Promise<void> {
    try {
      
      // System-Templates vorladen
      await this.getSystemTemplates();
      
      // Organization-Templates vorladen
      await this.getOrganizationTemplates(organizationId);
      
      // Default-Template vorladen
      await this.getDefaultTemplate(organizationId);
      
    } catch (error) {
    }
  }
  
  // === PRIVATE HELPER METHODS ===
  
  /**
   * Template mit benutzerdefinierten Änderungen anwenden
   */
  private applyCustomizations(
    baseTemplate: PDFTemplate, 
    customizations: Partial<PDFTemplate>
  ): PDFTemplate {
    return {
      ...baseTemplate,
      colorScheme: { ...baseTemplate.colorScheme, ...customizations.colorScheme },
      typography: { ...baseTemplate.typography, ...customizations.typography },
      layout: { ...baseTemplate.layout, ...customizations.layout },
      components: { ...baseTemplate.components, ...customizations.components }
    };
  }
  
  /**
   * Template-Datei parsen
   */
  private async parseTemplateFile(file: File): Promise<Partial<PDFTemplate>> {
    const content = await file.text();
    
    if (file.type === 'application/json') {
      return JSON.parse(content);
    }
    
    // TODO: HTML/CSS-Parser implementieren
    throw new Error('HTML/CSS Template-Parsing noch nicht implementiert');
  }
  
  /**
   * File-Checksum berechnen
   */
  private async calculateFileChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Template-Usage incrementieren
   */
  private async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      if (Object.values(SYSTEM_TEMPLATE_IDS).includes(templateId as SystemTemplateId)) {
        // System-Template Usage in separater Collection tracken
        const metricsRef = doc(db, this.METRICS_COLLECTION, templateId);
        await setDoc(metricsRef, {
          templateId,
          usageCount: increment(1),
          lastUsed: serverTimestamp()
        }, { merge: true });
      } else {
        // Custom Template Usage direkt im Document
        const templateRef = doc(db, this.COLLECTION_NAME, templateId);
        await updateDoc(templateRef, {
          'template.usageCount': increment(1),
          'template.lastUsed': serverTimestamp(),
          usageCount: increment(1),
          lastUsed: serverTimestamp()
        });
      }
    } catch (error) {
    }
  }
  
  /**
   * HTML mit Template-Styling rendern (Client-seitige Lösung)
   */
  async renderTemplateWithStyle(
    template: PDFTemplate, 
    templateData: TemplateData
  ): Promise<string> {
    const startTime = Date.now();
    
    // CSS generieren
    const customCss = this.generateTemplateCSS(template);
    
    // Client-seitiges HTML-Template generieren
    const baseHtml = this.generateClientSideHTML(templateData, template);
    
    // Injiziere Custom CSS in HTML
    const styledHtml = baseHtml.replace(
      '</head>',
      `<style>${customCss}</style></head>`
    );
    
    const renderTime = Date.now() - startTime;
    
    return styledHtml;
  }
  
  /**
   * Client-seitiges HTML generieren (professionelles PDF-Layout)
   */
  private generateClientSideHTML(
    templateData: TemplateData,
    template: PDFTemplate
  ): string {
    const { title, mainContent, boilerplateSections, keyVisual, clientName, date } = templateData;
    
    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title || 'Pressemitteilung'}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20mm 15mm;
            max-width: 21cm;
            margin: 0 auto;
          }
          
          .document-header {
            border-bottom: 2px solid ${template.colorScheme.primary};
            padding-bottom: 10mm;
            margin-bottom: 15mm;
          }
          
          .company-info {
            font-size: 10pt;
            color: #666;
            margin-bottom: 5mm;
          }
          
          .document-title {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #666;
            margin-bottom: 3mm;
          }
          
          .press-title {
            font-size: 20pt;
            font-weight: bold;
            color: ${template.colorScheme.primary};
            line-height: 1.3;
            margin-bottom: 8mm;
          }
          
          .press-date {
            font-size: 11pt;
            color: #666;
            margin-bottom: 10mm;
            font-weight: bold;
          }
          
          .key-visual {
            margin: 10mm 0;
            text-align: center;
          }
          
          .key-visual img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          
          .key-visual .caption {
            font-size: 10pt;
            color: #666;
            font-style: italic;
            margin-top: 3mm;
          }
          
          .main-content {
            font-size: 12pt;
            line-height: 1.7;
            margin-bottom: 15mm;
          }
          
          .main-content p {
            margin-bottom: 5mm;
            text-align: justify;
          }
          
          .main-content h2 {
            font-size: 16pt;
            color: ${template.colorScheme.primary};
            margin: 10mm 0 5mm 0;
          }
          
          .main-content h3 {
            font-size: 14pt;
            color: #333;
            margin: 8mm 0 4mm 0;
          }
          
          .main-content ul {
            margin: 5mm 0 5mm 8mm;
          }
          
          .main-content li {
            margin-bottom: 2mm;
          }
          
          .main-content strong {
            color: ${template.colorScheme.primary};
          }
          
          .boilerplate-sections {
            margin-top: 15mm;
            padding-top: 10mm;
            border-top: 1px solid #ddd;
          }
          
          .boilerplate-section {
            margin-bottom: 8mm;
            padding: 8mm;
            background: #f9f9f9;
            border-left: 4px solid ${template.colorScheme.primary};
          }
          
          .boilerplate-section h3 {
            font-size: 13pt;
            color: ${template.colorScheme.primary};
            margin-bottom: 3mm;
          }
          
          .boilerplate-content {
            font-size: 11pt;
            line-height: 1.5;
          }
          
          /* Zitat-Styling - saubere Formatierung */
          .boilerplate-content blockquote {
            font-style: italic;
            margin: 5mm 0 0mm 0;
            font-size: 12pt;
            color: #333;
            padding: 3mm 0 0mm 8mm;
            border-left: 3px solid ${template.colorScheme.primary};
          }
          
          /* Einfache Paragraphen-Abstände ohne Einrückungen */
          .boilerplate-content p {
            margin: 0 0 3mm 0;
            text-align: left;
          }

          /* Erste Paragraphen */
          .boilerplate-content p:first-child {
            margin-top: 0mm;
          }

          /* Zitatgeber-Styling für starke Elemente */
          .boilerplate-content p strong:first-child {
            color: ${template.colorScheme.primary};
            font-size: 11pt;
          }
          
          .footer {
            margin-top: 20mm;
            padding-top: 8mm;
            border-top: 1px solid #ddd;
            font-size: 10pt;
            color: #666;
            text-align: center;
          }
          
          /* Print-spezifische Styles */
          @media print {
            body {
              padding: 15mm;
            }

            .boilerplate-section {
              break-inside: avoid;
            }
          }

          /* Modern Professional Template spezifische Anpassungen */
          body.template-modern-professional .document-header {
            border-bottom: none;
          }

          body.template-modern-professional .press-date {
            margin-bottom: 5mm;
          }

          body.template-modern-professional .key-visual {
            margin: 5mm 0 8mm 0;
          }

          body.template-modern-professional .key-visual img {
            box-shadow: none;
          }

          body.template-modern-professional .main-content {
            font-size: 10pt;
            margin-top: 5mm;
          }

          body.template-modern-professional .main-content strong {
            color: #333;
          }

          body.template-modern-professional .main-content h2 {
            color: ${template.colorScheme.primary};
          }

          body.template-modern-professional .boilerplate-content {
            font-size: 9pt;
          }

          body.template-modern-professional .boilerplate-content p strong:first-child {
            color: #333;
            font-size: 9pt;
          }

          body.template-modern-professional .boilerplate-content blockquote {
            margin-bottom: 5mm;
          }

          body.template-modern-professional .boilerplate-content p {
            margin: 0 0 0mm 0;
          }

          body.template-modern-professional .boilerplate-content blockquote + p {
            margin-top: 0mm;
          }

          body.template-modern-professional .hashtags-section {
            margin-top: 10mm;
            padding-top: 8mm;
          }

          body.template-modern-professional .hashtags-title {
            font-weight: bold;
            font-size: 10pt;
            color: #333;
            margin-bottom: 3mm;
          }

          body.template-modern-professional .hashtags {
            color: ${template.colorScheme.primary};
            font-size: 9pt;
          }
        </style>
      </head>
      <body class="template-${template.id}">
        <div class="document-header">
          ${clientName ? `<div class="company-info">${clientName}</div>` : ''}
          <div class="document-title">Pressemitteilung</div>
          <h1 class="press-title">${title || 'Titel der Pressemitteilung'}</h1>
          <div class="press-date">${date ? new Date(date).toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          }) : new Date().toLocaleDateString('de-DE', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          })}</div>
        </div>
        
        ${keyVisual ? `
          <div class="key-visual">
            <img src="${keyVisual.url}" alt="${keyVisual.alt || 'Key Visual'}" />
            ${keyVisual.caption ? `<div class="caption">${keyVisual.caption}</div>` : ''}
          </div>
        ` : ''}
        
        <div class="main-content">
          ${mainContent || `
            <p><strong>Musterstadt, ${new Date().toLocaleDateString('de-DE')}</strong> – Dies ist eine Beispiel-Pressemitteilung für die Template-Vorschau. Hier würde der eigentliche Inhalt der Pressemitteilung stehen.</p>
            
            <h3>Wichtige Punkte</h3>
            <ul>
              <li>Erster wichtiger Punkt der Pressemitteilung</li>
              <li>Zweiter relevanter Aspekt</li>
              <li>Dritte wichtige Information</li>
            </ul>
            
            <p>Weitere Details und Hintergrundinformationen würden hier folgen. Die Pressemitteilung sollte alle relevanten Informationen in einer klaren und strukturierten Form präsentieren.</p>
          `}
        </div>
        
        ${boilerplateSections && boilerplateSections.length > 0 ? `
          <div class="boilerplate-sections">
            ${boilerplateSections.map(section => {
              // Verschiedene Titel-Quellen prüfen
              const sectionTitle = section.customTitle || 
                                 section.boilerplate?.name || 
                                 section.boilerplate?.title || 
                                 '';
              
              // Verschiedene Content-Quellen prüfen
              const content = section.content || 
                             section.boilerplate?.content ||
                             section.contentHtml ||
                             '';
              
              return `
                <div class="boilerplate-section ${section.type || ''}">
                  ${sectionTitle ? `<h3>${sectionTitle}</h3>` : ''}
                  <div class="boilerplate-content">${content}</div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${clientName || 'Unternehmen'} – Alle Rechte vorbehalten</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Durchschnittliche Render-Zeit aktualisieren
   */
  private updateAverageRenderTime(newTime: number): void {
    if (this.performanceMetrics.averageRenderTime === 0) {
      this.performanceMetrics.averageRenderTime = newTime;
    } else {
      // Bewegender Durchschnitt
      this.performanceMetrics.averageRenderTime = 
        (this.performanceMetrics.averageRenderTime * 0.8) + (newTime * 0.2);
    }
  }
  
  /**
   * CSS für Template generieren
   */
  private generateTemplateCSS(template: PDFTemplate): string {
    const { colorScheme, typography, components, layout } = template;
    
    return `
      /* Template-spezifische CSS-Variablen */
      :root {
        --template-primary: ${colorScheme.primary};
        --template-secondary: ${colorScheme.secondary};
        --template-accent: ${colorScheme.accent};
        --template-text: ${colorScheme.text};
        --template-background: ${colorScheme.background};
        --template-border: ${colorScheme.border};
        
        --template-font-primary: '${typography.primaryFont}', sans-serif;
        --template-font-secondary: '${typography.secondaryFont}', sans-serif;
        --template-font-base: ${typography.baseFontSize}pt;
        --template-line-height: ${typography.lineHeight};
      }
      
      /* Body-Styling */
      body {
        font-family: var(--template-font-primary);
        font-size: var(--template-font-base);
        line-height: var(--template-line-height);
        color: var(--template-text);
        background: var(--template-background);
        /* Margins werden im HTML-Body gesetzt, nicht hier */
      }
      
      /* Header-Styling */
      .header {
        background: ${components.header.backgroundColor || colorScheme.primary};
        color: ${components.header.textColor || '#ffffff'};
        padding: ${components.header.padding || 12}px;
        border-radius: ${components.header.borderRadius || 0}px;
        height: ${layout.headerHeight}px;
      }
      
      /* Title-Styling */
      .title {
        color: ${components.title.textColor || colorScheme.primary};
        font-size: ${components.title.fontSize || typography.headingScale[0]}pt;
        font-weight: ${components.title.fontWeight || 'bold'};
        text-align: ${components.title.textAlign || 'left'};
        margin: ${components.title.margin || 20}px 0;
      }
      
      /* Content-Styling */
      .main-content {
        font-size: ${components.content.fontSize || typography.baseFontSize}pt;
        color: ${components.content.textColor || colorScheme.text};
        padding: ${components.content.padding || 0}px;
        line-height: ${typography.lineHeight};
      }
      
      /* Sidebar-Styling */
      .boilerplate-section {
        background: ${components.sidebar.backgroundColor || colorScheme.secondary};
        border-color: ${components.sidebar.borderColor || colorScheme.border};
        border-width: ${components.sidebar.borderWidth || 1}px;
        border-radius: ${components.sidebar.borderRadius || 6}px;
        padding: ${components.sidebar.padding || 15}px;
      }
      
      /* Footer-Styling */
      .footer {
        background: ${components.footer.backgroundColor || colorScheme.secondary};
        color: ${components.footer.textColor || colorScheme.text};
        font-size: ${components.footer.fontSize || 9}pt;
        padding: ${components.footer.padding || 15}px;
        text-align: ${components.footer.textAlign || 'center'};
        height: ${layout.footerHeight}px;
      }
    `;
  }
  
  // === SYSTEM-TEMPLATE-DEFINITIONEN ===
  
  /**
   * Modern Professional Template
   */
  private createModernProfessionalTemplate(): PDFTemplate {
    return {
      id: SYSTEM_TEMPLATE_IDS.MODERN_PROFESSIONAL,
      name: 'Modern Professional',
      description: 'Klares, minimalistisches Design für Business-Kommunikation',
      version: '1.0.0',
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNlMmU4ZjAiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPCEtLSBIZWFkZXIgLS0+CiAgICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMDA1ZmFiIi8+CiAgICA8dGV4dCB4PSIyMCIgeT0iMzIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmZmZmIj5Nb2Rlcm4gUHJvZmVzc2lvbmFsPC90ZXh0PgogICAgPCEtLSBDb250ZW50IC0tPgogICAgPGxpbmUgeDE9IjIwIiB5MT0iNzAiIHgyPSIzODAiIHkyPSI3MCIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDx0ZXh0IHg9IjIwIiB5PSI5MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMxZTI5M2IiIGZvbnQtd2VpZ2h0PSJib2xkIj5QcmVzc2VtaXR0ZWlsdW5nIFRpdGVsPC90ZXh0PgogICAgPGxpbmUgeDE9IjIwIiB5MT0iMTEwIiB4Mj0iMjgwIiB5Mj0iMTEwIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPGxpbmUgeDE9IjIwIiB5MT0iMTMwIiB4Mj0iMzAwIiB5Mj0iMTMwIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPGxpbmUgeDE9IjIwIiB5MT0iMTUwIiB4Mj0iMjYwIiB5Mj0iMTUwIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPCEtLSBTaWRlYmFyIC0tPgogICAgPHJlY3QgeD0iMjAiIHk9IjE4MCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSI4MCIgZmlsbD0iI2Y4ZmFmYyIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDx0ZXh0IHg9IjMwIiB5PSIyMDAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMDA1ZmFiIiBmb250LXdlaWdodD0iYm9sZCI+VGV4dGJhdXN0ZWluPC90ZXh0PgogICAgPGxpbmUgeDE9IjMwIiB5MT0iMjIwIiB4Mj0iMjAwIiB5Mj0iMjIwIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPGxpbmUgeDE9IjMwIiB5MT0iMjQwIiB4Mj0iMTgwIiB5Mj0iMjQwIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4K',
      
      layout: {
        type: 'modern',
        headerHeight: 80,
        footerHeight: 60,
        margins: { top: 20, right: 15, bottom: 20, left: 15 },
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
          padding: 20,
          borderRadius: 0
        },
        title: {
          fontSize: 24,
          fontWeight: 'bold',
          textColor: '#1e293b',
          textAlign: 'left',
          margin: 20
        },
        content: {
          fontSize: 11,
          textColor: '#475569',
          padding: 20
        },
        sidebar: {
          backgroundColor: '#f8fafc',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 15,
          borderRadius: 8
        },
        footer: {
          backgroundColor: '#f8fafc',
          textColor: '#64748b',
          fontSize: 9,
          padding: 15,
          textAlign: 'center'
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
          borderWidth: 4,
          padding: 15,
          borderRadius: 6
        }
      },
      
      isSystem: true,
      isActive: true,
      createdAt: new Date(),
      usageCount: 0
    };
  }
  
  /**
   * Classic Elegant Template
   */
  private createClassicElegantTemplate(): PDFTemplate {
    return {
      id: SYSTEM_TEMPLATE_IDS.CLASSIC_ELEGANT,
      name: 'Classic Elegant',
      description: 'Traditionelles Design mit serif-Typografie für formelle Dokumente',
      version: '1.0.0',
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgPCEtLSBDbGFzc2ljIEhlYWRlciAtLT4KICAgIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNjAiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzFmMjkzNyIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8dGV4dCB4PSIyMDAiIHk9IjM1IiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiMxZjI5MzciIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSJib2xkIj5DTEFTU0lDIEVMRUdBTlQ8L3RleHQ+CiAgICA8IS0tIFRpdGxlIC0tPgogICAgPHRleHQgeD0iMjAwIiB5PSI5NSIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjIwIiBmaWxsPSIjMWYyOTM3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXdlaWdodD0iYm9sZCI+UHJlc3NlbWl0dGVpbHVuZyBUaXRlbDwvdGV4dD4KICAgIDwhLS0gTGluZXMgLS0+CiAgICA8bGluZSB4MT0iNDAiIHkxPSIxMjAiIHgyPSIzNjAiIHkyPSIxMjAiIHN0cm9rZT0iIzZiNzI4MCIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8bGluZSB4MT0iNDAiIHkxPSIxNDAiIHgyPSIzMjAiIHkyPSIxNDAiIHN0cm9rZT0iIzZiNzI4MCIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8bGluZSB4MT0iNDAiIHkxPSIxNjAiIHgyPSIzNDAiIHkyPSIxNjAiIHN0cm9rZT0iIzZiNzI4MCIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8IS0tIEJvaWxlcnBsYXRlIC0tPgogICAgPHJlY3QgeD0iNDAiIHk9IjE5MCIgd2lkdGg9IjMyMCIgaGVpZ2h0PSI2MCIgZmlsbD0iI2Y5ZmFmYiIgc3Ryb2tlPSIjZDFkNWRiIiBzdHJva2Utd2lkdGg9IjEiLz4KICAgIDx0ZXh0IHg9IjUwIiB5PSIyMTAiIGZvbnQtZmFtaWx5PSJzZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzFmMjkzNyIgZm9udC13ZWlnaHQ9ImJvbGQiPlp1c8OkdHpsaWNoZSBJbmZvcm1hdGlvbjwvdGV4dD4KICAgIDxsaW5lIHgxPSI1MCIgeTE9IjIzMCIgeDI9IjI1MCIgeTI9IjIzMCIgc3Ryb2tlPSIjNmI3MjgwIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+Cg==',
      
      layout: {
        type: 'classic',
        headerHeight: 100,
        footerHeight: 80,
        margins: { top: 20, right: 15, bottom: 20, left: 15 },
        columns: 1,
        pageFormat: 'A4'
      },
      
      typography: {
        primaryFont: 'Times New Roman',
        secondaryFont: 'Georgia',
        baseFontSize: 12,
        lineHeight: 1.8,
        headingScale: [28, 22, 18, 16]
      },
      
      colorScheme: {
        primary: '#1f2937',
        secondary: '#f9fafb',
        accent: '#6b7280',
        text: '#111827',
        background: '#ffffff',
        border: '#d1d5db'
      },
      
      components: {
        header: {
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          padding: 30,
          borderColor: '#1f2937',
          borderWidth: 2
        },
        title: {
          fontSize: 28,
          fontWeight: 'bold',
          textColor: '#1f2937',
          textAlign: 'center',
          margin: 30
        },
        content: {
          fontSize: 12,
          textColor: '#111827',
          padding: 30
        },
        sidebar: {
          backgroundColor: '#f9fafb',
          borderColor: '#d1d5db',
          borderWidth: 1,
          padding: 20,
          borderRadius: 0
        },
        footer: {
          backgroundColor: '#ffffff',
          textColor: '#6b7280',
          fontSize: 10,
          padding: 20,
          textAlign: 'center',
          borderColor: '#1f2937',
          borderWidth: 1
        },
        logo: {
          margin: 15
        },
        keyVisual: {
          borderRadius: 0,
          margin: 20
        },
        boilerplate: {
          backgroundColor: '#f9fafb',
          borderColor: '#1f2937',
          borderWidth: 2,
          padding: 20,
          borderRadius: 0
        }
      },
      
      isSystem: true,
      isActive: true,
      createdAt: new Date(),
      usageCount: 0
    };
  }
  
  /**
   * Creative Bold Template
   */
  private createCreativeBoldTemplate(): PDFTemplate {
    return {
      id: SYSTEM_TEMPLATE_IDS.CREATIVE_BOLD,
      name: 'Creative Bold',
      description: 'Lebendiges Design mit starken Farben für kreative Branchen',
      version: '1.0.0',
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNlNWU3ZWIiIHN0cm9rZS13aWR0aD0iMSIvPgogICAgPCEtLSBCb2xkIEhlYWRlciB3aXRoIGdyYWRpZW50IC0tPgogICAgPGRlZnM+CiAgICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iYm9sZEdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIwJSI+CiAgICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzdjM2FlZDtzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiNmNTllMGI7c3RvcC1vcGFjaXR5OjEiIC8+CiAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CiAgICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjcwIiBmaWxsPSJ1cmwoI2JvbGRHcmFkaWVudCkiIHJ4PSIxMiIvPgogICAgPHRleHQgeD0iMjAiIHk9IjQwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0iI2ZmZmZmZiIgZm9udC13ZWlnaHQ9ImJvbGQiPkNSRUFUSVZFIEJPTEQ8L3RleHQ+CiAgICA8IS0tIFZpYnJhbnQgVGl0bGUgLS0+CiAgICA8dGV4dCB4PSIyMCIgeT0iMTA1IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzdjM2FlZCIgZm9udC13ZWlnaHQ9ImJvbGQiPktyZWF0aXZlIFByZXNzZW1pdHRlaWx1bmcgVGl0ZWw8L3RleHQ+CiAgICA8IS0tIENvbnRlbnQgTGluZXMgLS0+CiAgICA8bGluZSB4MT0iMjAiIHkxPSIxMzAiIHgyPSIzMDAiIHkyPSIxMzAiIHN0cm9rZT0iIzM3NDE1MSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8bGluZSB4MT0iMjAiIHkxPSIxNTAiIHgyPSIzNDAiIHkyPSIxNTAiIHN0cm9rZT0iIzM3NDE1MSIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8bGluZSB4MT0iMjAiIHkxPSIxNzAiIHgyPSIyODAiIHkyPSIxNzAiIHN0cm9rZT0iIzM3NDE1MSIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgICA8IS0tIENyZWF0aXZlIEJvaWxlcnBsYXRlIC0tPgogICAgPHJlY3QgeD0iMjAiIHk9IjIwMCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSI3MCIgZmlsbD0iI2ZlZjNjNyIgc3Ryb2tlPSIjZjU5ZTBiIiBzdHJva2Utd2lkdGg9IjMiIHJ4PSIxMiIvPgogICAgPHRleHQgeD0iMzAiIHk9IjIyNSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiNmNTllMGIiIGZvbnQtd2VpZ2h0PSJib2xkIj5TcGVjaWFsIEluc2lnaHQ8L3RleHQ+CiAgICA8bGluZSB4MT0iMzAiIHkxPSIyNDUiIHgyPSIyNDAiIHkyPSIyNDUiIHN0cm9rZT0iIzdjM2FlZCIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgICA8bGluZSB4MT0iMzAiIHkxPSIyNjAiIHgyPSIyMDAiIHkyPSIyNjAiIHN0cm9rZT0iIzdjM2FlZCIgc3Ryb2tlLXdpZHRoPSIxIi8+Cjwvc3ZnPgo=',
      
      layout: {
        type: 'modern',
        headerHeight: 120,
        footerHeight: 50,
        margins: { top: 20, right: 15, bottom: 20, left: 15 },
        columns: 1,
        pageFormat: 'A4'
      },
      
      typography: {
        primaryFont: 'Roboto',
        secondaryFont: 'Open Sans',
        baseFontSize: 11,
        lineHeight: 1.5,
        headingScale: [26, 20, 16, 14]
      },
      
      colorScheme: {
        primary: '#7c3aed',
        secondary: '#fef3c7',
        accent: '#f59e0b',
        text: '#1f2937',
        background: '#ffffff',
        border: '#e5e7eb'
      },
      
      components: {
        header: {
          backgroundColor: '#7c3aed',
          textColor: '#ffffff',
          padding: 25,
          borderRadius: 12
        },
        title: {
          fontSize: 26,
          fontWeight: 'bold',
          textColor: '#7c3aed',
          textAlign: 'left',
          margin: 25
        },
        content: {
          fontSize: 11,
          textColor: '#374151',
          padding: 25
        },
        sidebar: {
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          borderWidth: 2,
          padding: 18,
          borderRadius: 12
        },
        footer: {
          backgroundColor: '#f3f4f6',
          textColor: '#6b7280',
          fontSize: 9,
          padding: 12,
          textAlign: 'center',
          borderRadius: 8
        },
        logo: {
          margin: 12
        },
        keyVisual: {
          borderRadius: 12,
          margin: 20
        },
        boilerplate: {
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          borderWidth: 3,
          padding: 18,
          borderRadius: 12
        }
      },
      
      isSystem: true,
      isActive: true,
      createdAt: new Date(),
      usageCount: 0
    };
  }
  
  // === CUSTOM TEMPLATE METHODEN ===
  
  /**
   * Custom Template erstellen
   */
  async createCustomTemplate(templateData: {
    name: string;
    description: string;
    category: 'standard' | 'premium' | 'custom';
    htmlContent: string;
    cssContent?: string;
    variables: Array<{
      name: string;
      description: string;
      defaultValue: string;
      required: boolean;
      type: 'text' | 'html' | 'image' | 'date';
    }>;
    isCustom: boolean;
    organizationId: string;
    createdBy: string;
    thumbnailUrl: string;
  }): Promise<string> {
    try {
      const templateId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Erstelle Custom Template Document
      const customTemplate: PDFTemplate = {
        id: templateId,
        name: templateData.name,
        description: templateData.description,
        version: '1.0.0',
        
        // Standard Layout für Custom Templates
        layout: {
          type: 'custom',
          headerHeight: 80,
          footerHeight: 60,
          margins: { top: 20, right: 15, bottom: 20, left: 15 },
          columns: 1,
          pageFormat: 'A4'
        },
        
        // Standard Typography
        typography: {
          primaryFont: 'Arial',
          secondaryFont: 'Arial',
          baseFontSize: 12,
          lineHeight: 1.6,
          headingScale: [24, 20, 16, 14]
        },
        
        // Standard Color Scheme
        colorScheme: {
          primary: '#2563eb',
          secondary: '#f8fafc',
          accent: '#0ea5e9',
          text: '#1e293b',
          background: '#ffffff',
          border: '#e2e8f0'
        },
        
        // Default Components
        components: {
          header: {
            backgroundColor: '#2563eb',
            textColor: '#ffffff',
            padding: 20,
            borderRadius: 0
          },
          title: {
            fontSize: 24,
            fontWeight: 'bold',
            textColor: '#1e293b',
            textAlign: 'left',
            margin: 20
          },
          content: {
            fontSize: 12,
            textColor: '#475569',
            padding: 20
          },
          sidebar: {
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 15,
            borderRadius: 8
          },
          footer: {
            backgroundColor: '#f8fafc',
            textColor: '#64748b',
            fontSize: 9,
            padding: 15,
            textAlign: 'center'
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
            borderColor: '#2563eb',
            borderWidth: 4,
            padding: 15,
            borderRadius: 6
          }
        },
        
        isSystem: false,
        isActive: true,
        createdAt: new Date(),
        usageCount: 0,
        
        // Custom Template spezifische Daten
        organizationId: templateData.organizationId,
        createdBy: templateData.createdBy,
        category: templateData.category,
        thumbnailUrl: templateData.thumbnailUrl,
        variables: templateData.variables,
        
        // Custom HTML/CSS Content
        customContent: {
          htmlContent: templateData.htmlContent,
          cssContent: templateData.cssContent || '',
          variables: templateData.variables
        }
      };
      
      // Speichere in Firestore
      const templateDoc: PDFTemplateDocument = {
        id: customTemplate.id,
        template: customTemplate,
        isDefault: false,
        usageCount: 0,
        lastUsed: Timestamp.now(),
        isCustomization: false,
        metadata: {
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          version: '1.0.0',
          isActive: true,
          organizationId: templateData.organizationId,
          createdBy: templateData.createdBy
        }
      };
      
      await setDoc(doc(db, this.COLLECTION_NAME, templateId), templateDoc);
      
      // Cache das neue Template
      if (this.cache) {
        this.cache.setTemplate(templateId, customTemplate);
        
        // Invalidiere Organization-Templates-Cache
        const orgCacheKey = `org_templates_${templateData.organizationId}`;
        this.cache.invalidateTemplate(orgCacheKey);
      }
      
      return templateId;
      
    } catch (error) {
      throw new Error('Custom Template konnte nicht erstellt werden');
    }
  }
  
  /**
   * Custom Template aktualisieren
   */
  async updateCustomTemplate(templateId: string, updateData: {
    name?: string;
    description?: string;
    htmlContent?: string;
    cssContent?: string;
    variables?: Array<{
      name: string;
      description: string;
      defaultValue: string;
      required: boolean;
      type: 'text' | 'html' | 'image' | 'date';
    }>;
    organizationId?: string;
  }): Promise<void> {
    try {
      const templateRef = doc(db, this.COLLECTION_NAME, templateId);
      const templateDoc = await getDoc(templateRef);
      
      if (!templateDoc.exists()) {
        throw new Error('Template nicht gefunden');
      }
      
      const existingData = templateDoc.data() as PDFTemplateDocument;
      
      // Update Template Data
      const updatedTemplate = {
        ...existingData.template,
        ...updateData,
        customContent: {
          ...existingData.template.customContent,
          htmlContent: updateData.htmlContent || existingData.template.customContent?.htmlContent,
          cssContent: updateData.cssContent || existingData.template.customContent?.cssContent,
          variables: updateData.variables || existingData.template.customContent?.variables
        }
      };
      
      // Update Document
      await updateDoc(templateRef, {
        template: updatedTemplate,
        'metadata.updatedAt': Timestamp.now(),
        'metadata.version': increment(1)
      });
      
      // Cache invalidieren
      if (this.cache && updateData.organizationId) {
        this.cache.invalidateTemplate(templateId);
        this.cache.invalidateTemplate(`org_templates_${updateData.organizationId}`);
      }
      
      
    } catch (error) {
      throw new Error('Custom Template konnte nicht aktualisiert werden');
    }
  }
  
  /**
   * Custom Template nach ID laden
   */
  async getCustomTemplateById(templateId: string): Promise<PDFTemplate | null> {
    try {
      // Prüfe Cache zuerst
      if (this.cache) {
        const cachedTemplate = this.cache.getTemplate(templateId);
        if (cachedTemplate) {
          this.performanceMetrics.cacheHits++;
          return cachedTemplate;
        }
      }
      
      this.performanceMetrics.cacheMisses++;
      
      const templateDoc = await getDoc(doc(db, this.COLLECTION_NAME, templateId));
      
      if (!templateDoc.exists()) {
        return null;
      }
      
      const templateData = templateDoc.data() as PDFTemplateDocument;
      
      // Cache das Template
      if (this.cache) {
        this.cache.setTemplate(templateId, templateData.template);
      }
      
      return templateData.template;
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Custom Template löschen
   */
  async deleteCustomTemplate(templateId: string, organizationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, templateId));
      
      // Cache invalidieren
      if (this.cache) {
        this.cache.invalidateTemplate(templateId);
        this.cache.invalidateTemplate(`org_templates_${organizationId}`);
      }
      
      
    } catch (error) {
      throw new Error('Custom Template konnte nicht gelöscht werden');
    }
  }
  
  /**
   * Custom Template mit HTML/CSS rendern
   */
  async renderCustomTemplate(
    template: PDFTemplate,
    templateData: TemplateData
  ): Promise<string> {
    if (!template.customContent?.htmlContent) {
      throw new Error('Custom Template hat keinen HTML-Inhalt');
    }
    
    const startTime = Date.now();
    
    try {
      let htmlContent = template.customContent.htmlContent;
      
      // Template-Variablen ersetzen
      if (template.customContent.variables) {
        template.customContent.variables.forEach(variable => {
          const placeholder = `{{${variable.name}}}`;
          const value = this.getTemplateVariableValue(variable, templateData);
          htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
        });
      }
      
      // CSS einbetten
      if (template.customContent.cssContent) {
        htmlContent = htmlContent.replace(
          '</head>',
          `<style>${template.customContent.cssContent}</style></head>`
        );
      }
      
      const renderTime = Date.now() - startTime;
      
      return htmlContent;
      
    } catch (error) {
      throw new Error('Custom Template konnte nicht gerendert werden');
    }
  }
  
  /**
   * Wert für Template-Variable extrahieren
   */
  private getTemplateVariableValue(
    variable: { name: string; type: string; defaultValue: string },
    templateData: TemplateData
  ): string {
    // Mapping von Standard-Variablen
    switch (variable.name) {
      case 'companyName':
      case 'clientName':
        return templateData.clientName || variable.defaultValue;
      case 'title':
        return templateData.title || variable.defaultValue;
      case 'content':
      case 'mainContent':
        return templateData.mainContent || variable.defaultValue;
      case 'date':
        return templateData.date ? 
          new Date(templateData.date).toLocaleDateString('de-DE') : 
          new Date().toLocaleDateString('de-DE');
      case 'footerText':
        return `© ${new Date().getFullYear()} ${templateData.clientName || 'Unternehmen'}`;
      default:
        return variable.defaultValue;
    }
  }
}

// Export Singleton-Instanz
export const pdfTemplateService = new PDFTemplateService();

// Export Klasse für Tests
export { PDFTemplateService };