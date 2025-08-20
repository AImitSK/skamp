// src/app/api/generate-pdf/route.ts - Puppeteer-basierte PDF-Generation API
import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { mediaService } from '@/lib/firebase/media-service';
import { auth } from 'firebase/auth';
import { templateRenderer, TemplateData } from '@/lib/pdf/template-renderer';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { PDFTemplate } from '@/types/pdf-template';

/**
 * Erweiterte Request-Interface für PDF-Generation mit Template-Support
 */
interface PDFGenerationRequest {
  campaignId: string;
  organizationId: string;
  title: string;
  mainContent: string;
  boilerplateSections: Array<{
    id?: string;
    customTitle?: string;
    content: string;
    type?: 'lead' | 'main' | 'quote' | 'contact';
  }>;
  keyVisual?: {
    url: string;
    alt?: string;
    caption?: string;
  };
  clientName: string;
  userId: string;
  fileName?: string;
  
  // === NEUE TEMPLATE-FELDER ===
  templateId?: string; // ID des zu verwendenden Templates
  templateCustomizations?: Partial<PDFTemplate>; // Template-Überschreibungen
  useSystemTemplate?: boolean; // Ob System-Template verwendet werden soll
  
  options?: {
    format?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    printBackground?: boolean;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    // Template-spezifische Optionen
    enableCustomCSS?: boolean;
    optimizeForPrint?: boolean;
  };
}

/**
 * Erweiterte Response-Interface für PDF-Generation
 */
interface PDFGenerationResponse {
  success: boolean;
  pdfUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: {
    generatedAt: string;
    wordCount: number;
    pageCount: number;
    generationTimeMs: number;
    // Template-Metadaten
    templateId?: string;
    templateName?: string;
    templateVersion?: string;
    cssInjectionTime?: number;
    renderMethod?: 'legacy' | 'template' | 'custom';
  };
  error?: string;
}

/**
 * POST /api/generate-pdf
 * Generiert PDF mit Puppeteer basierend auf HTML-Template
 */
export async function POST(request: NextRequest): Promise<NextResponse<PDFGenerationResponse>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  let browser: Browser | null = null;
  let page: Page | null = null;
  let requestData: PDFGenerationRequest | null = null;

  // ENHANCED DEBUG LOGGING
  const debugLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${requestId}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  };

  try {
    debugLog('📄 === PDF-GENERATION API ROUTE GESTARTET ===');
    debugLog('🔧 Environment Check', {
      NODE_ENV: process.env.NODE_ENV,
      hasFirebaseConfig: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasFirebaseStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      contentType: request.headers.get('content-type')
    });

    // Parse Request Body
    requestData = await request.json();
    console.log('📋 Request-Daten:', {
      campaignId: requestData.campaignId,
      organizationId: requestData.organizationId,
      title: requestData.title?.substring(0, 50) + '...',
      hasMainContent: !!requestData.mainContent,
      boilerplateSectionsCount: requestData.boilerplateSections?.length || 0,
      hasKeyVisual: !!requestData.keyVisual?.url,
      clientName: requestData.clientName,
      // Template-Info
      templateId: requestData.templateId || 'default',
      hasTemplateCustomizations: !!requestData.templateCustomizations,
      useSystemTemplate: requestData.useSystemTemplate ?? true
    });

    // Validierung der Request-Daten
    const validationErrors = validateRequest(requestData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: `Validation errors: ${validationErrors.join(', ')}` },
        { status: 400 }
      );
    }

    // Template-Daten vorbereiten
    const templateData: TemplateData = {
      title: requestData.title,
      mainContent: requestData.mainContent,
      boilerplateSections: requestData.boilerplateSections || [],
      keyVisual: requestData.keyVisual,
      clientName: requestData.clientName,
      date: new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      // Erweiterte Template-Daten
      author: requestData.userId,
      metadata: {
        generatedAt: new Date().toISOString(),
        campaign: requestData.campaignId,
        version: '2.0.0'
      }
    };

    // Template-basierte HTML-Generierung
    let htmlContent: string;
    let renderMethod: 'legacy' | 'template' | 'custom' = 'legacy';
    let templateMetadata: any = {};
    let cssInjectionTime = 0;

    console.log('🎨 Starte Template-basierte HTML-Generierung...');
    const renderStart = Date.now();

    if (requestData.templateId && requestData.templateId !== 'default') {
      // Template-basierte Generierung
      console.log(`🎭 Lade Template: ${requestData.templateId}`);
      
      try {
        // Template laden
        let pdfTemplate = await pdfTemplateService.getTemplate(requestData.templateId);
        
        if (!pdfTemplate) {
          console.warn(`⚠️ Template ${requestData.templateId} nicht gefunden, verwende Default-Template`);
          pdfTemplate = await pdfTemplateService.getDefaultTemplate(requestData.organizationId);
        }
        
        // Template-Customizations anwenden
        if (requestData.templateCustomizations) {
          console.log('🎨 Wende Template-Customizations an...');
          pdfTemplate = {
            ...pdfTemplate,
            colorScheme: { ...pdfTemplate.colorScheme, ...requestData.templateCustomizations.colorScheme },
            typography: { ...pdfTemplate.typography, ...requestData.templateCustomizations.typography },
            layout: { ...pdfTemplate.layout, ...requestData.templateCustomizations.layout },
            components: { ...pdfTemplate.components, ...requestData.templateCustomizations.components }
          };
        }
        
        // HTML mit Template-Styling rendern
        const cssStart = Date.now();
        htmlContent = await templateRenderer.renderWithPDFTemplate(templateData, pdfTemplate);
        cssInjectionTime = Date.now() - cssStart;
        
        renderMethod = 'template';
        templateMetadata = {
          templateId: pdfTemplate.id,
          templateName: pdfTemplate.name,
          templateVersion: pdfTemplate.version,
          cssInjectionTime
        };
        
        console.log(`✅ Template ${pdfTemplate.name} erfolgreich angewendet (${cssInjectionTime}ms)`);
        
      } catch (templateError) {
        console.error('❌ Fehler bei Template-Anwendung:', templateError);
        console.log('🔄 Fallback auf Legacy-Template...');
        
        // Fallback auf Legacy-Template
        htmlContent = await templateRenderer.renderTemplate(templateData);
        renderMethod = 'legacy';
      }
    } else {
      // Legacy-Template-Generierung
      console.log('🎨 Verwende Legacy-Template...');
      htmlContent = await templateRenderer.renderTemplate(templateData);
      renderMethod = 'legacy';
    }
    
    const renderTime = Date.now() - renderStart;
    console.log(`✅ HTML-Template erfolgreich gerendert (${renderTime}ms, Methode: ${renderMethod})`);

    // Puppeteer Browser starten mit Serverless-Chromium
    debugLog('🚀 Starte Puppeteer Browser mit Serverless-Chromium...');
    
    // Chromium-Konfiguration für Serverless/Local
    const isProduction = process.env.NODE_ENV === 'production';
    const browserStartTime = Date.now();
    
    if (isProduction) {
      // Vercel Serverless Umgebung mit @sparticuz/chromium
      debugLog('🏭 Production-Modus: Verwende serverless Chromium');
      
      const executablePath = await chromium.executablePath();
      debugLog('📁 Chromium executable path', { executablePath });
      
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
        timeout: 30000
      });
      
      debugLog('✅ Serverless Chromium Browser gestartet', {
        launchTime: Date.now() - browserStartTime + 'ms'
      });
    } else {
      // Lokale Entwicklungsumgebung - Standard Puppeteer
      debugLog('🏠 Development-Modus: Verwende lokalen Chrome');
      
      // Importiere das normale puppeteer für lokale Entwicklung
      const puppeteerLocal = await import('puppeteer');
      
      browser = await puppeteerLocal.default.launch({
        headless: 'new',
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
      
      debugLog('✅ Lokaler Chrome Browser gestartet', {
        launchTime: Date.now() - browserStartTime + 'ms'
      });
    }

    page = await browser.newPage();
    
    // Setze Viewport für konsistentes Rendering
    await page.setViewport({ 
      width: 1280, 
      height: 1024,
      deviceScaleFactor: 2  // Bessere Qualität
    });

    // Timeout für Page-Operationen
    page.setDefaultTimeout(30000);
    
    // Error-Handler für Page
    page.on('error', (error) => {
      console.error('❌ Page Error:', error);
    });
    
    page.on('pageerror', (error) => {
      console.error('❌ Page Script Error:', error);  
    });

    // HTML-Content laden
    console.log('📄 Lade HTML-Content in Browser...');
    await page.setContent(htmlContent, { 
      waitUntil: requestData.options?.waitUntil || 'networkidle0',
      timeout: 30000 
    });
    console.log('✅ HTML-Content erfolgreich geladen');

    // PDF-Optionen
    const pdfOptions = {
      format: requestData.options?.format || 'A4' as const,
      orientation: requestData.options?.orientation || 'portrait' as const,
      printBackground: requestData.options?.printBackground ?? true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '25mm',
        left: '20mm'
      },
      timeout: 30000,
      preferCSSPageSize: true
    };

    // PDF generieren
    console.log('🔄 Generiere PDF mit Puppeteer...');
    const pdfBuffer = await page.pdf(pdfOptions);
    console.log('✅ PDF erfolgreich generiert, Größe:', pdfBuffer.length);

    await browser.close();
    browser = null;
    page = null;

    // Dateiname generieren
    const fileName = requestData.fileName || generateFileName(requestData.title);
    
    // Upload zu Firebase Storage (Server-Side ohne Auth)
    debugLog('☁️ Lade PDF zu Firebase Storage hoch...', {
      fileName,
      organizationId: requestData.organizationId,
      size: pdfBuffer.length
    });
    
    let uploadResult: any;
    
    try {
      uploadResult = await mediaService.uploadBuffer(
        pdfBuffer,
        fileName,
        'application/pdf',
        requestData.organizationId,
        'public-pdf-generations', // Öffentlicher Upload-Pfad für Server-side API
        { 
          userId: requestData.userId,
          serverSide: true,
          apiGenerated: true
        }
      );
      
      debugLog('✅ PDF erfolgreich zu Firebase Storage hochgeladen', {
        downloadUrl: uploadResult.downloadUrl,
        fileSize: uploadResult.fileSize
      });
      
    } catch (storageError: any) {
      debugLog('❌ Firebase Storage Upload fehlgeschlagen', {
        error: storageError.message,
        code: storageError.code,
        organizationId: requestData.organizationId
      });
      
      // WICHTIG: Base64 Data URLs sind zu groß für Firestore (>1MB Limit)
      // Stattdessen: Fehlermeldung zurückgeben
      const error = new Error('PDF-Upload zu Firebase Storage fehlgeschlagen. Bitte versuchen Sie es erneut.');
      error.name = 'StorageUploadError';
      throw error;
    }
    
    debugLog('✅ PDF-Upload abgeschlossen', { 
      url: uploadResult.downloadUrl?.substring(0, 100) + '...', 
      temporary: uploadResult.temporary || false 
    });

    // Erweiterte Metadaten berechnen
    const generationTime = Date.now() - startTime;
    const wordCount = countWords(requestData.mainContent);
    const pageCount = Math.ceil(pdfBuffer.length / 50000); // Grobe Schätzung

    const response: PDFGenerationResponse = {
      success: true,
      pdfUrl: uploadResult.downloadUrl,
      fileName: fileName,
      fileSize: uploadResult.fileSize,
      metadata: {
        generatedAt: new Date().toISOString(),
        wordCount,
        pageCount,
        generationTimeMs: generationTime,
        // Template-Metadaten
        templateId: templateMetadata.templateId,
        templateName: templateMetadata.templateName,
        templateVersion: templateMetadata.templateVersion,
        cssInjectionTime: templateMetadata.cssInjectionTime,
        renderMethod
      }
    };

    // Template-Usage tracken (falls Template verwendet wurde)
    if (requestData.templateId && requestData.templateId !== 'default') {
      try {
        await pdfTemplateService.applyTemplate(
          requestData.campaignId,
          requestData.templateId,
          requestData.templateCustomizations
        );
      } catch (trackingError) {
        console.warn('⚠️ Template-Usage konnte nicht getrackt werden:', trackingError);
      }
    }

    console.log('🎉 PDF-Generation erfolgreich abgeschlossen:', {
      generationTimeMs: generationTime,
      fileSize: uploadResult.fileSize,
      wordCount,
      pageCount,
      renderMethod,
      templateUsed: templateMetadata.templateName || 'Legacy',
      cssInjectionTime
    });
    console.log('📄 === PDF-Generation API Route beendet ===\n');

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ PDF-Generation fehlgeschlagen:', error);

    // Cleanup bei Fehler
    if (page) {
      try { await page.close(); } catch (e) { /* ignore */ }
    }
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }

    // Error-Response basierend auf Fehlertyp
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
      statusCode = 408;
      errorMessage = 'PDF generation timeout';
    } else if (error.message?.includes('validation')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message?.includes('permission') || error.message?.includes('storage')) {
      statusCode = 403;
      errorMessage = 'Storage permission error';
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        metadata: {
          generatedAt: new Date().toISOString(),
          wordCount: 0,
          pageCount: 0,
          generationTimeMs: Date.now() - startTime,
          renderMethod: 'error',
          templateId: requestData?.templateId,
          cssInjectionTime: 0
        }
      },
      { status: statusCode }
    );
  }
}

/**
 * Validiert Request-Daten für PDF-Generation
 */
function validateRequest(data: PDFGenerationRequest): string[] {
  const errors: string[] = [];

  if (!data.campaignId?.trim()) {
    errors.push('campaignId is required');
  }

  if (!data.organizationId?.trim()) {
    errors.push('organizationId is required');
  }

  if (!data.title?.trim()) {
    errors.push('title is required');
  }

  if (!data.mainContent?.trim() || data.mainContent === '<p></p>') {
    errors.push('mainContent is required');
  }

  if (!data.clientName?.trim()) {
    errors.push('clientName is required');
  }

  if (!data.userId?.trim()) {
    errors.push('userId is required');
  }

  // Template-spezifische Validierungen
  if (data.templateId && typeof data.templateId !== 'string') {
    errors.push('templateId must be a string');
  }

  if (data.templateCustomizations && typeof data.templateCustomizations !== 'object') {
    errors.push('templateCustomizations must be an object');
  }

  return errors;
}

/**
 * Generiert Dateinamen für PDF basierend auf Titel
 */
function generateFileName(title: string): string {
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${cleanTitle}_${timestamp}.pdf`;
}

/**
 * Zählt Wörter in HTML-Content
 */
function countWords(html: string): number {
  if (!html) return 0;
  
  // Entferne HTML-Tags und zähle Wörter
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').filter(word => word.length > 0);
  return words.length;
}

/**
 * GET-Method (für API-Info mit Template-System-Info)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const systemTemplates = await pdfTemplateService.getSystemTemplates();
    
    return NextResponse.json({
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
      systemTemplates: systemTemplates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        version: t.version
      })),
      renderMethods: ['legacy', 'template', 'custom'],
      supportedFormats: ['A4', 'Letter'],
      supportedOrientations: ['portrait', 'landscape']
    });
  } catch (error) {
    return NextResponse.json({
      name: 'PDF Generation API',
      version: '2.0.0',
      status: 'active',
      error: 'Template system not available'
    });
  }
}