// src/app/api/v1/pdf-templates/upload/route.ts - API-Route für Template-Upload

import { NextRequest, NextResponse } from 'next/server';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { TemplateValidationService } from '@/components/templates/TemplateValidator';

interface UploadRequest {
  templateName: string;
  templateDescription?: string;
  templateCategory: 'standard' | 'premium' | 'custom';
  htmlContent: string;
  cssContent?: string;
  variables: Array<{
    name: string;
    description: string;
    defaultValue: string;
    required: boolean;
    type: 'text' | 'html' | 'image' | 'date';
  }>;
  organizationId: string;
  userId: string;
}

interface UploadResponse {
  success: boolean;
  templateId?: string;
  message: string;
  validationErrors?: Array<{
    type: string;
    code: string;
    message: string;
  }>;
}

/**
 * POST /api/v1/pdf-templates/upload
 * Custom Template hochladen und validieren
 */
export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    console.log('🚀 Template-Upload API aufgerufen');
    
    // Request-Body validieren
    let requestData: UploadRequest;
    try {
      requestData = await request.json();
    } catch (parseError) {
      console.error('❌ JSON-Parsing fehlgeschlagen:', parseError);
      return NextResponse.json({
        success: false,
        message: 'Ungültiges JSON-Format'
      }, { status: 400 });
    }

    const { 
      templateName, 
      templateDescription, 
      templateCategory, 
      htmlContent, 
      cssContent, 
      variables,
      organizationId,
      userId
    } = requestData;

    // Grundlegende Validierung
    if (!templateName?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'Template-Name ist erforderlich'
      }, { status: 400 });
    }

    if (!htmlContent?.trim()) {
      return NextResponse.json({
        success: false,
        message: 'HTML-Inhalt ist erforderlich'
      }, { status: 400 });
    }

    if (!organizationId) {
      return NextResponse.json({
        success: false,
        message: 'Organization-ID erforderlich'
      }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User-ID erforderlich'
      }, { status: 400 });
    }

    // Template-Validierung
    console.log('🔍 Template wird validiert...');
    const validationErrors = TemplateValidationService.validateTemplate(
      htmlContent,
      cssContent || '',
      variables || []
    );

    const hasErrors = validationErrors.some(error => error.type === 'error');
    if (hasErrors) {
      console.error('❌ Template-Validierung fehlgeschlagen:', validationErrors);
      return NextResponse.json({
        success: false,
        message: 'Template hat Validierungsfehler',
        validationErrors: validationErrors.filter(error => error.type === 'error')
      }, { status: 400 });
    }

    // Template erstellen
    console.log('💾 Template wird erstellt...');
    try {
      const templateId = await pdfTemplateService.createCustomTemplate({
        name: templateName.trim(),
        description: templateDescription?.trim() || '',
        category: templateCategory || 'custom',
        htmlContent: htmlContent.trim(),
        cssContent: cssContent?.trim() || '',
        variables: variables || [],
        isCustom: true,
        organizationId,
        createdBy: userId,
        thumbnailUrl: '' // Wird später durch Preview-Generation befüllt
      });

      console.log(`✅ Template erfolgreich erstellt: ${templateId}`);
      
      return NextResponse.json({
        success: true,
        templateId,
        message: 'Template erfolgreich hochgeladen',
        validationErrors: validationErrors.filter(error => error.type !== 'error') // Nur Warnungen und Infos
      }, { status: 201 });

    } catch (createError) {
      console.error('❌ Fehler beim Erstellen des Templates:', createError);
      return NextResponse.json({
        success: false,
        message: 'Template konnte nicht erstellt werden'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Unerwarteter Fehler in Template-Upload API:', error);
    return NextResponse.json({
      success: false,
      message: 'Interner Server-Fehler'
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/pdf-templates/upload
 * Upload-Informationen und Limits abrufen
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    let uploadLimits = {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      maxCustomTemplates: 10,
      supportedFileTypes: ['application/json', 'text/html'],
      supportedExtensions: ['.json', '.html'],
      currentUsage: 0
    };

    // Organization-spezifische Limits laden (falls organizationId vorhanden)
    if (organizationId) {
      try {
        const orgTemplates = await pdfTemplateService.getOrganizationTemplates(organizationId);
        uploadLimits.currentUsage = orgTemplates.length;
        
        // TODO: Organization-spezifische Limits aus Settings laden
        // const orgSettings = await organizationService.getTemplateSettings(organizationId);
        // if (orgSettings) {
        //   uploadLimits.maxCustomTemplates = orgSettings.maxCustomTemplates;
        // }
      } catch (error) {
        console.warn('⚠️ Konnte Organization-Templates nicht laden:', error);
      }
    }

    return NextResponse.json({
      success: true,
      uploadLimits,
      instructions: {
        fileFormat: 'JSON oder HTML',
        maxSize: '5MB',
        requiredFields: ['name', 'description'],
        optionalFields: ['colorScheme', 'typography', 'layout', 'components'],
        validationRules: [
          'JSON muss gültiges PDFTemplate-Schema enthalten',
          'HTML muss vollständige HTML-Struktur haben',
          'Alle Farben müssen Hex-Format verwenden (#rrggbb)',
          'Schriftarten müssen Web-kompatibel sein'
        ]
      },
      examples: {
        jsonTemplate: {
          name: 'Mein Custom Template',
          description: 'Beschreibung des Templates',
          colorScheme: {
            primary: '#005fab',
            secondary: '#f8fafc',
            accent: '#0ea5e9',
            text: '#1e293b',
            background: '#ffffff',
            border: '#e2e8f0'
          },
          typography: {
            primaryFont: 'Inter',
            secondaryFont: 'Inter',
            baseFontSize: 11,
            lineHeight: 1.6,
            headingScale: [24, 20, 16, 14]
          }
        }
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Upload-Informationen konnten nicht abgerufen werden' 
      },
      { status: 500 }
    );
  }
}