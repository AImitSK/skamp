// src/app/api/v1/pdf-templates/upload/route.ts - Custom Template Upload API

import { NextRequest, NextResponse } from 'next/server';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';

/**
 * POST /api/v1/pdf-templates/upload
 * Custom Template hochladen und validieren
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📤 Custom Template Upload gestartet');

    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('template') as File;
    const metadataStr = formData.get('metadata') as string;
    const organizationId = formData.get('organizationId') as string;
    const userId = formData.get('userId') as string;

    console.log('📋 Upload-Daten:', {
      fileName: file?.name,
      fileSize: file?.size,
      organizationId,
      userId,
      hasMetadata: !!metadataStr
    });

    // Basis-Validierung
    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Keine Template-Datei bereitgestellt',
          details: 'Das "template" Feld in der FormData ist erforderlich'
        },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'organizationId ist erforderlich' 
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'userId ist erforderlich' 
        },
        { status: 400 }
      );
    }

    // Metadata parsen
    let metadata: any = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (parseError) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Ungültiges Metadata-Format',
            details: 'Metadata muss gültiges JSON sein'
          },
          { status: 400 }
        );
      }
    }

    // File-Validierung
    console.log('🔍 Validiere Template-Datei...');
    const validation = await pdfTemplateService.validateTemplateFile(file);
    
    if (!validation.isValid) {
      console.log('❌ Template-Validierung fehlgeschlagen:', validation.errors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Template-Datei ist ungültig', 
          details: validation.errors,
          validationErrors: validation.errors
        },
        { status: 400 }
      );
    }

    console.log('✅ Template-Datei erfolgreich validiert');

    // Template hochladen
    console.log('⬆️ Lade Template hoch...');
    const uploadStart = Date.now();
    
    const uploadedTemplate = await pdfTemplateService.uploadCustomTemplate(
      organizationId,
      file,
      {
        ...metadata,
        createdBy: userId
      }
    );
    
    const uploadTime = Date.now() - uploadStart;
    console.log(`✅ Template erfolgreich hochgeladen: ${uploadedTemplate.id} (${uploadTime}ms)`);

    // Erfolgs-Response
    return NextResponse.json({
      success: true,
      message: 'Template erfolgreich hochgeladen',
      template: {
        id: uploadedTemplate.id,
        name: uploadedTemplate.name,
        description: uploadedTemplate.description,
        version: uploadedTemplate.version,
        createdAt: uploadedTemplate.createdAt,
        organizationId: uploadedTemplate.organizationId
      },
      uploadMetadata: {
        fileName: file.name,
        fileSize: file.size,
        uploadTimeMs: uploadTime,
        validationPassed: true
      }
    });

  } catch (error: any) {
    console.error('❌ Custom Template Upload fehlgeschlagen:', error);

    // Error-Response basierend auf Fehlertyp
    let statusCode = 500;
    let errorMessage = 'Template-Upload fehlgeschlagen';
    
    if (error.message?.includes('validation')) {
      statusCode = 400;
      errorMessage = 'Template-Validierung fehlgeschlagen';
    } else if (error.message?.includes('permission') || error.message?.includes('storage')) {
      statusCode = 403;
      errorMessage = 'Keine Berechtigung für Template-Upload';
    } else if (error.message?.includes('quota') || error.message?.includes('limit')) {
      statusCode = 413;
      errorMessage = 'Template-Limit erreicht oder Datei zu groß';
    } else if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Upload-Timeout';
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    );
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