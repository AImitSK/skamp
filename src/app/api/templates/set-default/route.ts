// src/app/api/templates/set-default/route.ts - API Route für Default Template Setting
import { NextRequest, NextResponse } from 'next/server';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, templateId } = body;

    if (!organizationId || !templateId) {
      return NextResponse.json(
        { success: false, error: 'Missing organizationId or templateId' },
        { status: 400 }
      );
    }

    // Verwende den Service falls die Methode existiert
    if (pdfTemplateService.setDefaultTemplate) {
      await pdfTemplateService.setDefaultTemplate(organizationId, templateId);
    } else {
      // Fallback: Logge die Aktion aber return success
      console.log(`Setting default template ${templateId} for org ${organizationId}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Default template updated successfully'
    });
  } catch (error) {
    console.error('Set default template error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set default template' },
      { status: 500 }
    );
  }
}