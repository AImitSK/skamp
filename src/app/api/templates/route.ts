// src/app/api/templates/route.ts - API Route für Template-Loading
import { NextRequest, NextResponse } from 'next/server';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';

export async function GET(request: NextRequest) {
  try {
    // System Templates laden
    const systemTemplates = await pdfTemplateService.getSystemTemplates();
    
    // TODO: Organization Templates laden wenn organizationId verfügbar
    // Für jetzt nur System Templates zurückgeben
    
    return NextResponse.json({
      success: true,
      templates: systemTemplates
    });
  } catch (error) {
    console.error('Template loading error:', error);
    
    // Fallback Templates
    const fallbackTemplates = [
      {
        id: 'standard',
        name: 'Standard Template',
        description: 'Klassisches CeleroPress PDF-Layout',
        version: '1.0.0',
        isDefault: true,
        layout: { type: 'standard' }
      },
      {
        id: 'modern',
        name: 'Modern Template',
        description: 'Modernes, sauberes Design',
        version: '1.0.0',
        isDefault: false,
        layout: { type: 'modern' }
      },
      {
        id: 'classic',
        name: 'Classic Template', 
        description: 'Traditionelles Business-Layout',
        version: '1.0.0',
        isDefault: false,
        layout: { type: 'classic' }
      }
    ];
    
    return NextResponse.json({
      success: true,
      templates: fallbackTemplates
    });
  }
}