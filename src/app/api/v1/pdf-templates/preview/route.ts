// src/app/api/v1/pdf-templates/preview/route.ts - Template Preview API

import { NextRequest, NextResponse } from 'next/server';
import { pdfTemplateService } from '@/lib/firebase/pdf-template-service';
import { PDFTemplate, MockPRData } from '@/types/pdf-template';

/**
 * POST /api/v1/pdf-templates/preview
 * Template-Vorschau mit Mock-Daten generieren
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔍 Template-Preview-Request gestartet');

    const body = await request.json();
    const { 
      templateId, 
      customizations, 
      mockData, 
      mockDataType = 'default',
      organizationId,
      format = 'html',
      includeMetadata = false,
      renderOptions = {}
    } = body;

    console.log('📋 Preview-Request:', {
      templateId,
      hasCustomizations: !!customizations,
      hasMockData: !!mockData,
      mockDataType,
      organizationId,
      format,
      renderOptions
    });

    // Validierung
    if (!templateId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'templateId ist erforderlich' 
        },
        { status: 400 }
      );
    }

    // Template laden
    console.log(`🎨 Lade Template: ${templateId}`);
    let template = await pdfTemplateService.getTemplate(templateId);
    
    if (!template) {
      // Fallback: Default-Template laden falls organizationId vorhanden
      if (organizationId) {
        console.log('⚠️ Template nicht gefunden, verwende Default-Template');
        template = await pdfTemplateService.getDefaultTemplate(organizationId);
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: `Template ${templateId} nicht gefunden` 
          },
          { status: 404 }
        );
      }
    }

    // Mock-Daten basierend auf Typ laden oder Custom Mock-Daten verwenden
    const previewMockData: MockPRData = mockData || getMockDataByType(mockDataType as 'default' | 'tech' | 'healthcare' | 'finance');
    
    console.log('📝 Verwende Mock-Daten:', {
      title: previewMockData.title,
      companyName: previewMockData.companyName,
      hasKeyVisual: !!previewMockData.keyVisual,
      boilerplateSectionsCount: previewMockData.boilerplateSections?.length || 0
    });

    // Preview generieren
    console.log('🎨 Generiere Template-Preview...');
    const previewStart = Date.now();
    
    const html = await pdfTemplateService.getTemplatePreview(
      templateId,
      previewMockData,
      customizations
    );
    
    const previewTime = Date.now() - previewStart;
    console.log(`✅ Preview erfolgreich generiert (${previewTime}ms)`);

    // Response-Format basierend auf Request
    const response: any = {
      success: true,
      html: html,
      templateId: template.id,
      templateName: template.name,
      generationTimeMs: previewTime
    };

    // Optionale Metadaten hinzufügen
    if (includeMetadata) {
      response.metadata = {
        templateVersion: template.version,
        templateType: template.isSystem ? 'system' : 'custom',
        mockDataUsed: previewMockData,
        customizationsApplied: customizations || {},
        generatedAt: new Date().toISOString(),
        cacheStatus: 'generated' // TODO: Cache-Status implementieren
      };
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Template-Preview fehlgeschlagen:', error);
    
    let statusCode = 500;
    let errorMessage = 'Preview-Generierung fehlgeschlagen';
    
    if (error.message?.includes('nicht gefunden')) {
      statusCode = 404;
      errorMessage = error.message;
    } else if (error.message?.includes('validation')) {
      statusCode = 400;
      errorMessage = 'Preview-Daten ungültig';
    } else if (error.message?.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Preview-Generierung Timeout';
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
 * GET /api/v1/pdf-templates/preview
 * Preview-Optionen und Mock-Daten-Templates abrufen
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'options';
    
    switch (type) {
      case 'mock-data':
        // Verschiedene Mock-Daten-Varianten zurückgeben
        return NextResponse.json({
          success: true,
          mockDataTemplates: {
            default: getDefaultMockData(),
            tech: getTechMockData(),
            healthcare: getHealthcareMockData(),
            finance: getFinanceMockData()
          }
        });
        
      case 'options':
      default:
        return NextResponse.json({
          success: true,
          previewOptions: {
            supportedFormats: ['html', 'pdf'], // PDF-Preview für zukünftige Erweiterung
            maxPreviewSize: '2MB',
            cacheTimeout: '5 minutes',
            supportedCustomizations: [
              'colorScheme',
              'typography', 
              'layout',
              'components'
            ]
          },
          mockDataFields: {
            required: ['title', 'content', 'companyName', 'date'],
            optional: ['subtitle', 'keyVisual', 'boilerplateSections', 'contactInfo']
          }
        });
    }
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Preview-Optionen konnten nicht abgerufen werden' 
      },
      { status: 500 }
    );
  }
}

// === HELPER FUNCTIONS ===

/**
 * Mock-Daten basierend auf Industrie-Typ laden
 */
function getMockDataByType(type: 'default' | 'tech' | 'healthcare' | 'finance'): MockPRData {
  switch (type) {
    case 'tech':
      return getTechMockData();
    case 'healthcare':
      return getHealthcareMockData();
    case 'finance':
      return getFinanceMockData();
    case 'default':
    default:
      return getDefaultMockData();
  }
}

/**
 * Standard Mock-Daten für Preview
 */
function getDefaultMockData(): MockPRData {
  return {
    title: 'Beispiel-Pressemitteilung: Neue Produkteinführung',
    subtitle: 'Innovative Lösung revolutioniert den Markt',
    content: `
      <p><strong>München, ${new Date().toLocaleDateString('de-DE')}</strong> – Unser Unternehmen freut sich, die Einführung unseres neuesten Produkts bekannt zu geben, das die Art und Weise, wie Kunden mit unserer Technologie interagieren, grundlegend verändert.</p>
      
      <h3>Wichtige Produktmerkmale</h3>
      <ul>
        <li>Innovative Benutzeroberfläche für optimale User Experience</li>
        <li>Automatisierte Workflows zur Steigerung der Effizienz</li>
        <li>Nahtlose Integration in bestehende Systeme</li>
        <li>Enterprise-grade Sicherheit und Compliance</li>
      </ul>
      
      <p>"Diese Produkteinführung markiert einen wichtigen Meilenstein in unserer Unternehmensgeschichte", erklärt [Name], [Position]. "Wir sind stolz darauf, unseren Kunden eine Lösung zu bieten, die ihre Arbeitsweise nachhaltig verbessert."</p>
      
      <h3>Marktauswirkungen</h3>
      <p>Das neue Produkt adressiert aktuelle Marktanforderungen und bietet Lösungen für die Herausforderungen, mit denen Unternehmen heute konfrontiert sind. Erste Kundenfeedbacks zeigen eine deutliche Verbesserung der Produktivität um bis zu 40%.</p>
    `,
    companyName: 'Beispiel-Unternehmen GmbH',
    contactInfo: 'Pressekontakt: Max Mustermann, Tel: +49 89 123456, presse@beispiel.de',
    date: new Date().toLocaleDateString('de-DE'),
    keyVisual: {
      url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=400&fit=crop',
      alt: 'Produktbild: Innovation im Fokus',
      caption: 'Das neue Produkt überzeugt durch moderne Technologie und intuitive Bedienung'
    },
    boilerplateSections: [
      {
        customTitle: 'Über das Unternehmen',
        content: '<p>Beispiel-Unternehmen GmbH ist ein führender Anbieter innovativer Technologielösungen mit Sitz in München. Seit der Gründung im Jahr 2010 entwickelt das Unternehmen wegweisende Produkte für den deutschen und internationalen Markt.</p>',
        type: 'main' as const
      },
      {
        customTitle: 'Pressekontakt',
        content: '<p><strong>Max Mustermann</strong><br>Pressesprecher<br>Tel: +49 89 123456<br>E-Mail: presse@beispiel.de</p>',
        type: 'contact' as const
      }
    ]
  };
}

/**
 * Tech-Industrie Mock-Daten
 */
function getTechMockData(): MockPRData {
  return {
    title: 'KI-Revolution: Neuer Algorithmus steigert Performance um 300%',
    content: `
      <p><strong>Berlin, ${new Date().toLocaleDateString('de-DE')}</strong> – TechCorp präsentiert bahnbrechenden Machine Learning-Algorithmus für automatisierte Datenanalyse.</p>
      
      <h3>Technische Innovationen</h3>
      <ul>
        <li>Neuronal Network Architecture der nächsten Generation</li>
        <li>Real-time Processing mit unter 10ms Latenz</li>
        <li>99.7% Accuracy bei komplexen Datensets</li>
        <li>Cloud-native Skalierung</li>
      </ul>
      
      <blockquote>"Diese Technologie wird die Art, wie wir Daten verstehen, revolutionieren", so CTO Dr. Anna Schmidt.</blockquote>
    `,
    companyName: 'TechCorp Innovation GmbH',
    contactInfo: 'Tech-PR: Dr. Peter Wagner, tech-press@techcorp.de',
    date: new Date().toLocaleDateString('de-DE'),
    keyVisual: {
      url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
      alt: 'KI-Visualisierung',
      caption: 'Künstliche Intelligenz transformiert die Datenanalyse'
    }
  };
}

/**
 * Healthcare Mock-Daten
 */
function getHealthcareMockData(): MockPRData {
  return {
    title: 'Medizinischer Durchbruch: Neue Therapie zeigt 95% Erfolgsrate',
    content: `
      <p><strong>Hamburg, ${new Date().toLocaleDateString('de-DE')}</strong> – MedTech Solutions verkündet Erfolg der klinischen Phase III-Studie.</p>
      
      <h3>Studienergebnisse</h3>
      <ul>
        <li>1.200 Patienten in multizentrischer Studie</li>
        <li>95% Verbesserung der Symptomatik</li>
        <li>Minimale Nebenwirkungen dokumentiert</li>
        <li>Zulassung bei EMA beantragt</li>
      </ul>
    `,
    companyName: 'MedTech Solutions AG',
    contactInfo: 'Medical Communications: Dr. Sarah Klein, medical@medtech.de',
    date: new Date().toLocaleDateString('de-DE')
  };
}

/**
 * Finance Mock-Daten
 */
function getFinanceMockData(): MockPRData {
  return {
    title: 'FinTech-Innovation: Blockchain-basierte Zahlungslösung geht live',
    content: `
      <p><strong>Frankfurt, ${new Date().toLocaleDateString('de-DE')}</strong> – FinanceNext launcht revolutionäre Blockchain-Payment-Platform.</p>
      
      <h3>Finanz-Innovation</h3>
      <ul>
        <li>Sofortüberweisungen mit Blockchain-Sicherheit</li>
        <li>0.1% Transaktionsgebühren</li>
        <li>ISO 27001 zertifizierte Sicherheit</li>
        <li>Integration in 500+ Online-Shops</li>
      </ul>
    `,
    companyName: 'FinanceNext GmbH',
    contactInfo: 'Financial PR: Michael Becker, finance-pr@financenext.de',
    date: new Date().toLocaleDateString('de-DE')
  };
}