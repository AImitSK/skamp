/**
 * POST /api/translation/preview-pdf
 * Generiert PDF-Vorschau für eine Übersetzung und speichert sie im Projekt-Ordner
 *
 * Nutzt dieselbe Logik wie der Email-Versand für konsistente PDFs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase/admin-init';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { LANGUAGE_NAMES, LanguageCode } from '@/types/international';

interface PreviewPdfRequest {
  organizationId: string;
  projectId: string;
  translationId: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth prüfen
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // 2. Request-Body parsen
    const body: PreviewPdfRequest = await request.json();
    const { organizationId, projectId, translationId } = body;

    if (!organizationId || !projectId || !translationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId, projectId und translationId sind erforderlich' },
        { status: 400 }
      );
    }

    // 3. Translation laden
    const translationDoc = await adminDb
      .doc(`organizations/${organizationId}/projects/${projectId}/translations/${translationId}`)
      .get();

    if (!translationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Übersetzung nicht gefunden' },
        { status: 404 }
      );
    }

    const translation = translationDoc.data()!;
    const language = translation.language as LanguageCode;

    // 4. Campaign für dieses Projekt finden (für Template, KeyVisual, etc.)
    const campaignsSnapshot = await adminDb
      .collection('pr_campaigns')
      .where('projectId', '==', projectId)
      .where('organizationId', '==', organizationId)
      .limit(1)
      .get();

    if (campaignsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Keine Kampagne für dieses Projekt gefunden' },
        { status: 404 }
      );
    }

    const campaignDoc = campaignsSnapshot.docs[0];
    const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as any;

    // 5. Template laden
    const templateId = campaign.templateId || 'default';
    let template;
    try {
      if (templateId && templateId !== 'default') {
        template = await pdfTemplateService.getTemplateById(templateId);
      }
      if (!template) {
        // Fallback zu Default-Template der Organization
        template = await pdfTemplateService.getDefaultTemplate(organizationId);
      }
    } catch {
      // Ultimate Fallback zu Default-Template
      template = await pdfTemplateService.getDefaultTemplate(organizationId);
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Kein Template gefunden' },
        { status: 500 }
      );
    }

    // 6. Boilerplates für PDF vorbereiten (übersetzte Version)
    const boilerplatesForPdf = (translation.translatedBoilerplates || []).map((tb: any) => {
      const originalSection = (campaign.boilerplateSections || []).find(
        (bs: any) => bs.id === tb.id || bs.boilerplateId === tb.id
      );
      return {
        id: tb.id,
        customTitle: tb.translatedTitle || originalSection?.customTitle || '',
        content: tb.translatedContent || '',
        type: originalSection?.type
      };
    });

    // 7. Template mit übersetztem Content rendern
    const templateHtml = await pdfTemplateService.renderTemplateWithStyle(template, {
      title: translation.title,
      mainContent: translation.content,
      boilerplateSections: boilerplatesForPdf,
      keyVisual: campaign.keyVisual,
      clientName: campaign.clientName || 'Client',
      date: new Date().toISOString(),
      language: language
    });

    // 8. PDF generieren via /api/generate-pdf
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fileName = `${campaign.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Uebersetzung'}_${language.toUpperCase()}_Vorschau.pdf`;

    const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        organizationId,
        title: translation.title,
        mainContent: translation.content,
        boilerplateSections: boilerplatesForPdf,
        keyVisual: campaign.keyVisual,
        clientName: campaign.clientName || 'Client',
        userId,
        html: templateHtml,
        fileName,
        options: {
          format: 'A4',
          orientation: 'portrait',
          printBackground: true,
          waitUntil: 'networkidle0'
        }
      })
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('PDF-API Fehler:', errorText);
      return NextResponse.json(
        { success: false, error: `PDF-Generierung fehlgeschlagen: ${errorText}` },
        { status: 500 }
      );
    }

    const pdfResult = await pdfResponse.json();

    if (!pdfResult.success) {
      return NextResponse.json(
        { success: false, error: pdfResult.error || 'PDF-Generierung fehlgeschlagen' },
        { status: 500 }
      );
    }

    // 9. Erfolg - PDF URL zurückgeben
    return NextResponse.json({
      success: true,
      pdfUrl: pdfResult.pdfUrl,
      pdfBase64: pdfResult.pdfBase64,
      fileName,
      language: language,
      languageName: LANGUAGE_NAMES[language] || language
    });

  } catch (error: any) {
    console.error('Translation Preview PDF Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
