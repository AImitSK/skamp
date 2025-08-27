// src/lib/pdf/template-renderer.ts - Erweiterte Template-Engine für Multi-Template PDF-Generation
import Mustache from 'mustache';
import { PDFTemplate } from '@/types/pdf-template';

// Conditional imports for Node.js environment only
const fs = typeof window === 'undefined' ? require('fs') : null;
const path = typeof window === 'undefined' ? require('path') : null;

/**
 * Template-Datenstruktur für Pressemitteilungs-PDFs
 */
/**
 * Erweiterte Template-Datenstruktur für Multi-Template PDF-Generation
 */
export interface TemplateData {
  title: string;
  mainContent: string;
  boilerplateSections: Array<{
    id?: string;
    customTitle?: string;
    content: string;
    type?: 'lead' | 'main' | 'quote' | 'contact';
    // Fallback-Eigenschaften für verschiedene Content-Quellen
    boilerplate?: {
      content?: string;
      [key: string]: any;
    };
    contentHtml?: string;
  }>;
  keyVisual?: {
    url: string;
    alt?: string;
    caption?: string;
  };
  clientName: string;
  date: string;
  
  // Erweiterte Template-Daten (optional)
  subtitle?: string;
  author?: string;
  contactInfo?: string;
  metadata?: {
    generatedAt?: string;
    version?: string;
    campaign?: string;
  };
}

/**
 * Erweiterte Template-Engine für PDF-Generierung
 * Unterstützt Multi-Template-System mit dynamischem CSS-Injection
 * Verwendet Mustache.js für HTML-Template-Rendering
 */
class TemplateRenderer {
  private templateCache: Map<string, string> = new Map();
  private cssCache: Map<string, string> = new Map();
  private readonly DEFAULT_TEMPLATE = 'press-release-template.html';

  /**
   * Rendert Template mit gegebenen Daten (Legacy-Methode)
   * @param data Template-Daten für die Pressemitteilung
   * @returns Gerenderte HTML-String für PDF-Generation
   */
  async renderTemplate(data: TemplateData): Promise<string> {
    return this.renderWithTemplate(data, this.DEFAULT_TEMPLATE);
  }

  /**
   * Rendert Template mit spezifischem Template-File
   * @param data Template-Daten
   * @param templateFile Template-Datei (z.B. 'modern-template.html')
   * @returns Gerenderte HTML-String
   */
  async renderWithTemplate(data: TemplateData, templateFile: string): Promise<string> {
    try {
      // Lade Template (mit Caching)
      const template = await this.loadTemplate(templateFile);
      
      // Bereite Template-Daten vor
      const templateData = this.prepareTemplateData(data);
      
      // Rendere Template mit Mustache
      const renderedHtml = Mustache.render(template, templateData);
      
      return renderedHtml;
    } catch (error) {
      console.error(`❌ Fehler beim Rendern des Templates ${templateFile}:`, error);
      throw new Error(`Template-Rendering fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Rendert Template mit PDFTemplate-Style-Integration
   * @param data Template-Daten
   * @param pdfTemplate PDF-Template-Konfiguration für Styling
   * @param baseTemplate Base HTML-Template (optional)
   * @returns Gerenderte HTML-String mit injiziertem CSS
   */
  async renderWithPDFTemplate(
    data: TemplateData, 
    pdfTemplate: PDFTemplate,
    baseTemplate?: string
  ): Promise<string> {
    try {
      // Basis-Template laden
      const templateFile = baseTemplate || this.DEFAULT_TEMPLATE;
      const baseHtml = await this.renderWithTemplate(data, templateFile);
      
      // Custom CSS für PDFTemplate generieren
      const customCss = this.generateTemplateCSS(pdfTemplate);
      
      // CSS in HTML injizieren
      const styledHtml = this.injectCustomCSS(baseHtml, customCss);
      
      return styledHtml;
    } catch (error) {
      console.error('❌ Fehler beim Rendern mit PDFTemplate:', error);
      throw new Error(`PDFTemplate-Rendering fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Lädt Template-Datei aus dem Templates-Verzeichnis
   * @param templateName Name der Template-Datei
   * @returns Template-HTML-String
   */
  private async loadTemplate(templateName: string): Promise<string> {
    // Prüfe Cache zuerst
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Nur in Server-Umgebung verfügbar
    if (!fs || !path) {
      throw new Error('Template-Loading nur in Server-Umgebung verfügbar');
    }

    try {
      // Lade Template-Datei
      const templatePath = path.join(process.cwd(), 'src/lib/pdf/templates', templateName);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template-Datei nicht gefunden: ${templatePath}`);
      }

      const template = fs.readFileSync(templatePath, 'utf-8');
      
      // Cache Template für bessere Performance
      this.templateCache.set(templateName, template);
      
      return template;
    } catch (error) {
      console.error(`❌ Fehler beim Laden des Templates ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Bereitet Template-Daten für Mustache-Rendering vor
   * @param data Original Template-Daten
   * @returns Mustache-kompatible Template-Daten
   */
  private prepareTemplateData(data: TemplateData): any {
    // Basis-Daten
    const templateData: any = {
      title: data.title || '',
      mainContent: data.mainContent || '',
      clientName: data.clientName || 'Unternehmen',
      date: data.date || new Date().toLocaleDateString('de-DE')
    };

    // KeyVisual (optional)
    if (data.keyVisual?.url) {
      templateData.keyVisual = {
        url: data.keyVisual.url,
        alt: data.keyVisual.alt || '',
        caption: data.keyVisual.caption || ''
      };
    }

    // Textbausteine verarbeiten mit Fallback-Logik
    if (data.boilerplateSections && data.boilerplateSections.length > 0) {
      // Filtere nur sichtbare Sections mit Inhalt und verwende Fallback-Logik
      const visibleSections = data.boilerplateSections
        .filter(section => {
          // 🔥 WICHTIG: Fallback-Logik für verschiedene Content-Quellen
          const content = section.content || 
                         section.boilerplate?.content ||
                         section.contentHtml || 
                         '';
          return content.trim().length > 0;
        })
        .map(section => ({
          id: section.id || '',
          customTitle: section.customTitle || '',
          // 🔥 WICHTIG: Fallback-Logik für Content-Rendering
          content: section.content || 
                   section.boilerplate?.content ||
                   section.contentHtml || 
                   '',
          type: section.type || 'main'
        }));

      if (visibleSections.length > 0) {
        templateData.boilerplateSections = visibleSections;
        // Zusätzlich für Template-Logik: Prüfung ob Sections vorhanden
        templateData.hasBoilerplateSections = true;
      }
    }

    return templateData;
  }

  /**
   * Bereinigt Template-Cache (für Tests oder Memory-Management)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.cssCache.clear();
  }

  /**
   * Custom CSS für PDFTemplate generieren
   * @param template PDFTemplate-Konfiguration
   * @returns CSS-String
   */
  generateTemplateCSS(template: PDFTemplate): string {
    const cacheKey = `${template.id}_${template.version}`;
    
    // Prüfe CSS-Cache
    if (this.cssCache.has(cacheKey)) {
      return this.cssCache.get(cacheKey)!;
    }

    const { colorScheme, typography, components, layout } = template;
    
    const css = `
      /* === ${template.name} Template Styles === */
      
      /* CSS-Variablen für Template */
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
      
      /* Body-Override */
      body {
        font-family: var(--template-font-primary) !important;
        font-size: var(--template-font-base) !important;
        line-height: var(--template-line-height) !important;
        color: var(--template-text) !important;
        background: var(--template-background) !important;
        margin: ${layout.margins.top}mm ${layout.margins.right}mm ${layout.margins.bottom}mm ${layout.margins.left}mm !important;
      }
      
      /* Header-Styling */
      .header {
        background: ${components.header.backgroundColor || colorScheme.primary} !important;
        color: ${components.header.textColor || '#ffffff'} !important;
        padding: ${components.header.padding || 12}px !important;
        border-radius: ${components.header.borderRadius || 0}px !important;
        height: ${layout.headerHeight}px !important;
        ${components.header.borderWidth ? `border: ${components.header.borderWidth}px solid ${components.header.borderColor || colorScheme.border} !important;` : ''}
      }
      
      /* Title-Styling */
      .title {
        color: ${components.title.textColor || colorScheme.primary} !important;
        font-size: ${components.title.fontSize || typography.headingScale[0]}pt !important;
        font-weight: ${components.title.fontWeight || 'bold'} !important;
        text-align: ${components.title.textAlign || 'left'} !important;
        margin: ${components.title.margin || 20}px 0 !important;
        font-family: var(--template-font-primary) !important;
      }
      
      /* Main-Content-Styling */
      .main-content {
        font-size: ${components.content.fontSize || typography.baseFontSize}pt !important;
        color: ${components.content.textColor || colorScheme.text} !important;
        padding: ${components.content.padding || 0}px !important;
        line-height: var(--template-line-height) !important;
        font-family: var(--template-font-primary) !important;
      }
      
      /* Headings in Content */
      .main-content h1 {
        font-size: ${typography.headingScale[0]}pt !important;
        color: var(--template-primary) !important;
        font-family: var(--template-font-primary) !important;
      }
      
      .main-content h2 {
        font-size: ${typography.headingScale[1]}pt !important;
        color: var(--template-primary) !important;
        font-family: var(--template-font-primary) !important;
      }
      
      .main-content h3 {
        font-size: ${typography.headingScale[2]}pt !important;
        color: var(--template-accent) !important;
        font-family: var(--template-font-primary) !important;
      }
      
      /* Boilerplate-Sections */
      .boilerplate-section {
        background: ${components.boilerplate?.backgroundColor || components.sidebar.backgroundColor || colorScheme.secondary} !important;
        border-color: ${components.boilerplate?.borderColor || components.sidebar.borderColor || colorScheme.border} !important;
        border-width: ${components.boilerplate?.borderWidth || components.sidebar.borderWidth || 1}px !important;
        border-radius: ${components.boilerplate?.borderRadius || components.sidebar.borderRadius || 6}px !important;
        padding: ${components.boilerplate?.padding || components.sidebar.padding || 15}px !important;
        margin: 12px 0 !important;
        border-left: 4px solid var(--template-primary) !important;
      }
      
      .boilerplate-section h3 {
        color: var(--template-primary) !important;
        font-family: var(--template-font-primary) !important;
      }
      
      /* Key-Visual */
      .key-visual {
        border-radius: ${components.keyVisual?.borderRadius || 6}px !important;
        ${components.keyVisual?.boxShadow ? `box-shadow: ${components.keyVisual.boxShadow} !important;` : ''}
      }
      
      .key-visual-container {
        margin: ${components.keyVisual?.margin || 15}px 0 !important;
      }
      
      /* Footer-Styling */
      .footer {
        background: ${components.footer.backgroundColor || colorScheme.secondary} !important;
        color: ${components.footer.textColor || colorScheme.text} !important;
        font-size: ${components.footer.fontSize || 9}pt !important;
        padding: ${components.footer.padding || 15}px !important;
        text-align: ${components.footer.textAlign || 'center'} !important;
        height: ${layout.footerHeight}px !important;
        font-family: var(--template-font-primary) !important;
        ${components.footer.borderWidth ? `border-top: ${components.footer.borderWidth}px solid ${components.footer.borderColor || colorScheme.border} !important;` : ''}
        ${components.footer.borderRadius ? `border-radius: ${components.footer.borderRadius}px !important;` : ''}
      }
      
      /* Logo-Styling */
      .logo {
        margin: ${components.logo.margin || 10}px !important;
      }
      
      /* Page-Break-Optimierungen */
      @media print {
        .boilerplate-section {
          break-inside: avoid !important;
        }
        
        .key-visual-container {
          break-inside: avoid !important;
        }
        
        .title {
          break-after: avoid !important;
        }
        
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      
      @page {
        margin: ${layout.margins.top}mm ${layout.margins.right}mm ${layout.margins.bottom}mm ${layout.margins.left}mm;
        size: ${layout.pageFormat};
      }
    `;
    
    // Cache CSS
    this.cssCache.set(cacheKey, css);
    
    return css;
  }

  /**
   * CSS in HTML injizieren
   * @param html Basis-HTML
   * @param css Custom-CSS
   * @returns HTML mit injiziertem CSS
   */
  private injectCustomCSS(html: string, css: string): string {
    // Injiziere CSS vor dem schließenden </head>-Tag
    const cssInjection = `<style id="template-styles">${css}</style>`;
    
    if (html.includes('</head>')) {
      return html.replace('</head>', `${cssInjection}</head>`);
    } else {
      // Fallback: CSS am Anfang des Body einfügen
      return html.replace('<body>', `<body>${cssInjection}`);
    }
  }

  /**
   * Template-spezifische Daten für erweiterte Template-Features vorbereiten
   * @param data Original Template-Daten
   * @param template Optional: PDFTemplate für erweiterte Features
   * @returns Erweiterte Template-Daten
   */
  prepareExtendedTemplateData(data: TemplateData, template?: PDFTemplate): any {
    const baseData = this.prepareTemplateData(data);
    
    if (!template) {
      return baseData;
    }
    
    // Erweiterte Template-Daten
    const extendedData = {
      ...baseData,
      
      // Template-Metadaten
      templateInfo: {
        id: template.id,
        name: template.name,
        version: template.version
      },
      
      // Styling-Variablen für Templates
      styles: {
        primaryColor: template.colorScheme.primary,
        secondaryColor: template.colorScheme.secondary,
        accentColor: template.colorScheme.accent,
        textColor: template.colorScheme.text,
        backgroundColor: template.colorScheme.background,
        primaryFont: template.typography.primaryFont,
        secondaryFont: template.typography.secondaryFont,
        baseFontSize: template.typography.baseFontSize,
        lineHeight: template.typography.lineHeight
      },
      
      // Layout-Informationen
      layout: {
        type: template.layout.type,
        columns: template.layout.columns,
        headerHeight: template.layout.headerHeight,
        footerHeight: template.layout.footerHeight
      }
    };
    
    return extendedData;
  }

  /**
   * Konvertiert HTML-Content zu PDF-optimiertem Format
   * Bereinigt problematische HTML-Strukturen für bessere PDF-Darstellung
   */
  private sanitizeHtmlForPdf(html: string): string {
    if (!html) return '';

    // Entferne gefährliche oder problematische HTML-Elemente
    let sanitized = html
      // Entferne Script-Tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Entferne Style-Tags (CSS wird im Template definiert)
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Konvertiere relative zu absolute Pfade (falls nötig)
      .replace(/src="\/([^"]*)"/, 'src="https://example.com/$1"');

    // Zusätzliche PDF-Optimierungen
    sanitized = sanitized
      // Stelle sicher, dass alle p-Tags geschlossen sind
      .replace(/<p>/gi, '<p>')
      .replace(/<\/p>/gi, '</p>')
      // Normalisiere Leerzeichen
      .replace(/\s+/g, ' ')
      .trim();

    return sanitized;
  }

  /**
   * Template-Performance-Metriken erfassen
   * @param templateId Template-ID
   * @param renderTime Render-Zeit in Millisekunden
   */
  trackTemplatePerformance(templateId: string, renderTime: number): void {
    // Performance-Tracking für Analytics
    console.log(`📊 Template ${templateId} rendered in ${renderTime}ms`);
    
    // Hier könnte man Performance-Daten an Analytics-Service senden
    // analytics.track('template_render', { templateId, renderTime });
  }

  /**
   * Verfügbare Template-Dateien auflisten
   * @returns Liste der verfügbaren Template-Dateien
   */
  async getAvailableTemplateFiles(): Promise<string[]> {
    // Nur in Server-Umgebung verfügbar
    if (!fs || !path) {
      console.warn('⚠️ Template-File-Listing nur in Server-Umgebung verfügbar');
      return [this.DEFAULT_TEMPLATE];
    }

    try {
      const templatesDir = path.join(process.cwd(), 'src/lib/pdf/templates');
      
      if (!fs.existsSync(templatesDir)) {
        return [this.DEFAULT_TEMPLATE];
      }
      
      const files = fs.readdirSync(templatesDir)
        .filter((file: string) => file.endsWith('.html'))
        .sort();
      
      return files.length > 0 ? files : [this.DEFAULT_TEMPLATE];
    } catch (error) {
      console.warn('⚠️ Fehler beim Auflisten der Template-Dateien:', error);
      return [this.DEFAULT_TEMPLATE];
    }
  }

  /**
   * Template-File existiert prüfen
   * @param templateFile Template-Datei
   * @returns Ob Template existiert
   */
  async templateExists(templateFile: string): Promise<boolean> {
    // Nur in Server-Umgebung verfügbar
    if (!fs || !path) {
      return false;
    }

    try {
      const templatePath = path.join(process.cwd(), 'src/lib/pdf/templates', templateFile);
      return fs.existsSync(templatePath);
    } catch {
      return false;
    }
  }
}

// Export Singleton-Instanz
export const templateRenderer = new TemplateRenderer();

// Export Klasse für Tests
export { TemplateRenderer };