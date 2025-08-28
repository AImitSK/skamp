// src/app/api/v1/pdf-templates/route.ts - PDF-Template Management API

import { NextRequest, NextResponse } from 'next/server';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { PDFTemplate } from '@/types/pdf-template';

/**
 * GET /api/v1/pdf-templates
 * Alle verfügbaren Templates für eine Organization abrufen
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const includeSystem = searchParams.get('includeSystem') === 'true';
    const templateId = searchParams.get('templateId');
    
    console.log('📋 Template-Request:', {
      organizationId,
      includeSystem,
      templateId
    });
    
    // Einzelnes Template abrufen
    if (templateId) {
      const template = await pdfTemplateService.getTemplate(templateId);
      
      if (!template) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Template ${templateId} nicht gefunden` 
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        template: template
      });
    }
    
    // Template-Liste abrufen
    let templates: PDFTemplate[] = [];
    
    if (includeSystem) {
      const systemTemplates = await pdfTemplateService.getSystemTemplates();
      templates.push(...systemTemplates);
      console.log(`✅ ${systemTemplates.length} System-Templates geladen`);
    }
    
    if (organizationId) {
      const orgTemplates = await pdfTemplateService.getOrganizationTemplates(organizationId);
      templates.push(...orgTemplates);
      console.log(`✅ ${orgTemplates.length} Organization-Templates geladen`);
    }
    
    // Default-Template ermitteln
    let defaultTemplateId: string | undefined;
    if (organizationId) {
      try {
        const defaultTemplate = await pdfTemplateService.getDefaultTemplate(organizationId);
        defaultTemplateId = defaultTemplate.id;
      } catch (error) {
        console.warn('⚠️ Default-Template konnte nicht ermittelt werden:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      templates: templates,
      defaultTemplateId,
      systemTemplatesCount: includeSystem ? (await pdfTemplateService.getSystemTemplates()).length : 0,
      organizationTemplatesCount: organizationId ? (await pdfTemplateService.getOrganizationTemplates(organizationId)).length : 0
    });
    
  } catch (error: any) {
    console.error('❌ Fehler beim Abrufen der Templates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Templates konnten nicht abgerufen werden',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/pdf-templates
 * Template-Management-Aktionen ausführen
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { organizationId, templateId, action, ...actionData } = body;
    
    console.log('⚡ Template-Action:', {
      action,
      organizationId,
      templateId
    });
    
    // Validierung
    if (!organizationId || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'organizationId und action sind erforderlich' 
        },
        { status: 400 }
      );
    }
    
    let result: any = {};
    
    switch (action) {
      case 'set_default':
        if (!templateId) {
          return NextResponse.json(
            { success: false, error: 'templateId ist erforderlich für set_default' },
            { status: 400 }
          );
        }
        
        await pdfTemplateService.setDefaultTemplate(organizationId, templateId);
        result = { 
          message: `Template ${templateId} als Standard gesetzt`,
          defaultTemplateId: templateId
        };
        break;
        
      case 'delete':
        if (!templateId) {
          return NextResponse.json(
            { success: false, error: 'templateId ist erforderlich für delete' },
            { status: 400 }
          );
        }
        
        await pdfTemplateService.deleteCustomTemplate(templateId, organizationId);
        result = { 
          message: `Template ${templateId} erfolgreich gelöscht`,
          deletedTemplateId: templateId
        };
        break;
        
      case 'apply_to_campaign':
        const { campaignId, overrides } = actionData;
        
        if (!templateId || !campaignId) {
          return NextResponse.json(
            { success: false, error: 'templateId und campaignId sind erforderlich für apply_to_campaign' },
            { status: 400 }
          );
        }
        
        await pdfTemplateService.applyTemplate(campaignId, templateId, overrides);
        result = { 
          message: `Template ${templateId} auf Campaign ${campaignId} angewendet`,
          campaignId,
          templateId,
          appliedOverrides: overrides || {}
        };
        break;
        
      case 'get_usage_stats':
        const stats = await pdfTemplateService.getTemplateUsageStats(organizationId);
        result = {
          message: 'Usage-Statistiken erfolgreich abgerufen',
          stats: stats
        };
        break;
        
      case 'clear_cache':
        pdfTemplateService.clearCache();
        result = { 
          message: 'Template-Cache erfolgreich bereinigt'
        };
        break;
        
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: `Unbekannte Aktion: ${action}`,
            availableActions: ['set_default', 'delete', 'apply_to_campaign', 'get_usage_stats', 'clear_cache']
          },
          { status: 400 }
        );
    }
    
    console.log(`✅ Template-Action '${action}' erfolgreich ausgeführt`);
    
    return NextResponse.json({ 
      success: true, 
      action,
      ...result
    });
    
  } catch (error: any) {
    console.error('❌ Fehler bei Template-Action:', error);
    
    // Spezifische Error-Handling
    let statusCode = 500;
    let errorMessage = 'Template-Aktion fehlgeschlagen';
    
    if (error.message?.includes('nicht gefunden')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message?.includes('nicht berechtigt') || error.message?.includes('permission')) {
      statusCode = 403;
      errorMessage = 'Keine Berechtigung für diese Aktion';
    } else if (error.message?.includes('validation') || error.message?.includes('erforderlich')) {
      statusCode = 400;
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error.message 
      },
      { status: statusCode }
    );
  }
}

/**
 * PUT /api/v1/pdf-templates
 * Template aktualisieren (für Custom Templates)
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { templateId, organizationId, updates } = body;
    
    console.log('🔄 Template-Update:', {
      templateId,
      organizationId,
      hasUpdates: !!updates
    });
    
    // Validierung
    if (!templateId || !organizationId || !updates) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'templateId, organizationId und updates sind erforderlich' 
        },
        { status: 400 }
      );
    }
    
    // Prüfe ob Template existiert und zur Organization gehört
    const existingTemplate = await pdfTemplateService.getTemplate(templateId);
    
    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: `Template ${templateId} nicht gefunden` },
        { status: 404 }
      );
    }
    
    if (existingTemplate.isSystem) {
      return NextResponse.json(
        { success: false, error: 'System-Templates können nicht bearbeitet werden' },
        { status: 403 }
      );
    }
    
    if (existingTemplate.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung für dieses Template' },
        { status: 403 }
      );
    }
    
    // TODO: Template-Update-Funktionalität implementieren
    // Aktuell nicht in PDFTemplateService verfügbar
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Template-Update-Funktionalität noch nicht implementiert',
        message: 'Diese Funktionalität wird in einer zukünftigen Version verfügbar sein'
      },
      { status: 501 }
    );
    
  } catch (error: any) {
    console.error('❌ Fehler beim Template-Update:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Template-Update fehlgeschlagen',
        details: error.message 
      },
      { status: 500 }
    );
  }
}