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
import { templateCache, TemplateCache } from '@/lib/pdf/template-cache';
import Mustache from 'mustache';

/**
 * Service für PDF-Template-Management
 * Handles CRUD-Operationen, System-Templates, Custom-Templates und Caching
 */
class PDFTemplateService {
  private readonly COLLECTION_NAME = 'pdf_templates';
  private readonly ORG_SETTINGS_COLLECTION = 'organization_template_settings';
  private readonly METRICS_COLLECTION = 'template_metrics';
  private cache: TemplateCache;
  
  // Performance-Metriken
  private performanceMetrics = {
    templateLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    previewGenerations: 0,
    averageRenderTime: 0
  };
  
  constructor() {
    this.cache = templateCache;
    console.log('🎯 PDFTemplateService mit Cache initialisiert');
  }

  /**
   * System-Templates laden (mit optimiertem Caching)
   */
  async getSystemTemplates(): Promise<PDFTemplate[]> {
    try {
      const cacheKey = 'system_templates_all';
      
      // Prüfe Cache zuerst
      const cachedTemplates = this.cache.getTemplate(cacheKey);
      if (cachedTemplates && Array.isArray(cachedTemplates)) {
        this.performanceMetrics.cacheHits++;
        console.log('✅ System-Templates aus Cache geladen');
        return cachedTemplates as unknown as PDFTemplate[];
      }

      this.performanceMetrics.cacheMisses++;
      console.log('🔄 System-Templates werden generiert...');
      
      const systemTemplates = [
        this.createModernProfessionalTemplate(),
        this.createClassicElegantTemplate(),
        this.createCreativeBoldTemplate()
      ];
      
      // Cache System-Templates (einzeln und als Array)
      systemTemplates.forEach(template => {
        this.cache.setTemplate(template.id, template);
      });
      
      // Cache auch das komplette Array
      this.cache.setTemplate(cacheKey, systemTemplates as unknown as PDFTemplate);
      
      this.performanceMetrics.templateLoads++;
      return systemTemplates;
    } catch (error) {
      console.error('❌ Fehler beim Laden der System-Templates:', error);
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
      const cachedTemplates = this.cache.getTemplate(cacheKey);
      if (cachedTemplates && Array.isArray(cachedTemplates)) {
        this.performanceMetrics.cacheHits++;
        console.log(`✅ Organization-Templates aus Cache geladen: ${organizationId}`);
        return cachedTemplates as unknown as PDFTemplate[];
      }

      this.performanceMetrics.cacheMisses++;
      console.log(`🔄 Lade Organization-Templates: ${organizationId}`);
      
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
        this.cache.setTemplate(templateDoc.template.id, templateDoc.template);
      });
      
      // Cache Template-Array
      if (templates.length > 0) {
        this.cache.setTemplate(cacheKey, templates as unknown as PDFTemplate);
      }
      
      this.performanceMetrics.templateLoads++;
      return templates;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Organization-Templates:', error);
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
      console.error('❌ Fehler beim Laden aller Templates:', error);
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
      console.error('❌ Fehler beim Laden des Default-Templates:', error);
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
      const cachedTemplate = this.cache.getTemplate(templateId);
      if (cachedTemplate) {
        this.performanceMetrics.cacheHits++;
        console.log(`✅ Template aus Cache geladen: ${templateId} (${Date.now() - startTime}ms)`);
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
      console.log(`🔄 Lade Template aus Firestore: ${templateId}`);
      const templateDoc = await getDoc(
        doc(db, this.COLLECTION_NAME, templateId)
      );
      
      if (!templateDoc.exists()) {
        console.log(`⚠️ Template nicht gefunden: ${templateId}`);
        return null;
      }
      
      const templateData = templateDoc.data() as PDFTemplateDocument;
      const template = templateData.template;
      
      // Cache Template
      this.cache.setTemplate(template.id, template);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Template geladen: ${templateId} (${loadTime}ms)`);
      this.performanceMetrics.templateLoads++;
      
      return template;
    } catch (error) {
      console.error(`❌ Fehler beim Laden des Templates ${templateId}:`, error);
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
      
      console.log(`✅ Default-Template für ${organizationId} auf ${templateId} gesetzt`);
    } catch (error) {
      console.error('❌ Fehler beim Setzen des Default-Templates:', error);
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
      
      console.log(`✅ Custom Template ${templateId} erfolgreich hochgeladen`);
      return customTemplate;
      
    } catch (error) {
      console.error('❌ Fehler beim Hochladen des Custom Templates:', error);
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
      
      console.log(`✅ Template ${templateId} auf Campaign ${campaignId} angewendet`);
    } catch (error) {
      console.error('❌ Fehler beim Anwenden des Templates:', error);
      throw new Error('Template konnte nicht angewendet werden');
    }
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
      
      // Generiere Cache-Keys mit Hashes
      const mockDataHash = TemplateCache.generateHash(mockData);
      const customizationsHash = customizations ? TemplateCache.generateHash(customizations) : undefined;
      const htmlCacheKey = this.cache.generateHtmlCacheKey(templateId, mockDataHash, customizationsHash);
      
      // Prüfe HTML-Cache
      const cachedHtml = this.cache.getHtml(htmlCacheKey);
      if (cachedHtml) {
        this.performanceMetrics.cacheHits++;
        console.log(`✅ Template-Preview aus Cache: ${templateId} (${Date.now() - startTime}ms)`);
        return cachedHtml;
      }
      
      this.performanceMetrics.cacheMisses++;
      console.log(`🎨 Generiere Template-Preview: ${templateId}`);
      
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
      
      // Cache HTML-Preview
      this.cache.setHtml(htmlCacheKey, html);
      
      const renderTime = Date.now() - startTime;
      this.updateAverageRenderTime(renderTime);
      console.log(`✅ Template-Preview generiert: ${templateId} (${renderTime}ms)`);
      
      return html;
    } catch (error) {
      console.error('❌ Fehler bei Template-Vorschau:', error);
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
      console.error('❌ Fehler beim Laden der Usage-Stats:', error);
      return [];
    }
  }
  
  /**
   * Custom Template löschen (mit Cache-Bereinigung)
   */
  async deleteCustomTemplate(templateId: string): Promise<void> {
    try {
      // Prüfe ob es System-Template ist
      if (Object.values(SYSTEM_TEMPLATE_IDS).includes(templateId as SystemTemplateId)) {
        throw new Error('System-Templates können nicht gelöscht werden');
      }
      
      const templateDoc = await getDoc(doc(db, this.COLLECTION_NAME, templateId));
      if (!templateDoc.exists()) {
        throw new Error('Template nicht gefunden');
      }
      
      const templateData = templateDoc.data() as PDFTemplateDocument;
      
      // Lösche Storage-File falls vorhanden
      if (templateData.uploadedFile?.storageUrl) {
        try {
          const storageRef = ref(storage, templateData.uploadedFile.storageUrl);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn('⚠️ Storage-File konnte nicht gelöscht werden:', storageError);
        }
      }
      
      // Lösche Template-Document
      await deleteDoc(doc(db, this.COLLECTION_NAME, templateId));
      
      // Bereinige alle Caches für dieses Template
      this.invalidateTemplateCache(templateId);
      
      console.log(`✅ Template ${templateId} erfolgreich gelöscht`);
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Templates:', error);
      throw new Error('Template konnte nicht gelöscht werden');
    }
  }
  
  /**
   * Cache bereinigen
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Template-Cache bereinigt');
  }

  /**
   * Spezifischen Template-Cache invalidieren
   */
  invalidateTemplateCache(templateId: string): void {
    // Suche und lösche alle Cache-Einträge die mit diesem Template zusammenhängen
    const cacheStats = this.cache.analyze();
    const templateEntries = cacheStats.templateCache.entries.filter(
      (entry: any) => entry.key === templateId || entry.key.includes(templateId)
    );
    
    templateEntries.forEach((entry: any) => {
      // Templates, HTML und CSS für dieses Template löschen
      this.cache.clearCache('template');
      this.cache.clearCache('html');
      this.cache.clearCache('css');
    });
    
    console.log(`🗑️ Cache für Template ${templateId} invalidiert`);
  }

  /**
   * Performance-Metriken abrufen
   */
  getPerformanceMetrics(): any {
    const cacheStats = this.cache.getStats();
    
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
      console.log(`🔥 Cache Warm-Up für Organization: ${organizationId}`);
      
      // System-Templates vorladen
      await this.getSystemTemplates();
      
      // Organization-Templates vorladen
      await this.getOrganizationTemplates(organizationId);
      
      // Default-Template vorladen
      await this.getDefaultTemplate(organizationId);
      
      console.log('✅ Cache Warm-Up abgeschlossen');
    } catch (error) {
      console.warn('⚠️ Cache Warm-Up teilweise fehlgeschlagen:', error);
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
      console.warn('⚠️ Template Usage konnte nicht aktualisiert werden:', error);
    }
  }
  
  /**
   * HTML mit Template-Styling rendern (mit CSS-Caching)
   */
  private async renderTemplateWithStyle(
    template: PDFTemplate, 
    templateData: TemplateData
  ): Promise<string> {
    const startTime = Date.now();
    
    // CSS-Cache-Key generieren
    const cssCacheKey = this.cache.generateCssCacheKey(template.id, template.version);
    
    // Prüfe CSS-Cache
    let customCss = this.cache.getCss(cssCacheKey);
    
    if (!customCss) {
      // Generiere CSS und cache es
      customCss = this.generateTemplateCSS(template);
      this.cache.setCss(cssCacheKey, customCss);
      console.log(`🎨 CSS für Template ${template.id} generiert und gecacht`);
    }
    
    // Basis-HTML vom Template-Renderer
    // Dynamic import für Server-seitige Komponenten
    const { templateRenderer } = await import('@/lib/pdf/template-renderer');
    const baseHtml = await templateRenderer.renderTemplate(templateData);
    
    // Injiziere Custom CSS in HTML
    const styledHtml = baseHtml.replace(
      '</head>',
      `<style>${customCss}</style></head>`
    );
    
    const renderTime = Date.now() - startTime;
    console.log(`✅ Template-Styling angewendet: ${template.id} (${renderTime}ms)`);
    
    return styledHtml;
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
        margin: ${layout.margins.top}mm ${layout.margins.right}mm ${layout.margins.bottom}mm ${layout.margins.left}mm;
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
      
      layout: {
        type: 'classic',
        headerHeight: 100,
        footerHeight: 80,
        margins: { top: 80, right: 60, bottom: 80, left: 60 },
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
      
      layout: {
        type: 'modern',
        headerHeight: 120,
        footerHeight: 50,
        margins: { top: 50, right: 40, bottom: 50, left: 40 },
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
}

// Export Singleton-Instanz
export const pdfTemplateService = new PDFTemplateService();

// Export Klasse für Tests
export { PDFTemplateService };