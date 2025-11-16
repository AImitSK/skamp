/**
 * PDF Generator für Monitoring Reports
 *
 * Generiert PDF aus HTML via Puppeteer API.
 */

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  printBackground?: boolean;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}

export interface PDFGenerationRequest {
  campaignId: string;
  organizationId: string;
  userId: string;
  html: string;
  title: string;
  fileName: string;
  options?: PDFGenerationOptions;
}

export interface PDFGenerationResult {
  success: boolean;
  needsClientUpload?: boolean;
  pdfBase64?: string;
  pdfUrl?: string;
  error?: string;
}

/**
 * PDF Generator Klasse
 */
export class PDFGenerator {
  private apiEndpoint: string;

  constructor(apiEndpoint: string = '/api/generate-pdf') {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Generiert PDF aus HTML
   *
   * @param html - HTML-String
   * @param request - PDF Generation Request
   * @returns PDF Generation Result
   * @throws Error wenn API-Call fehlschlägt
   */
  async generate(
    html: string,
    request: PDFGenerationRequest
  ): Promise<PDFGenerationResult> {
    const apiRequest = {
      campaignId: request.campaignId,
      organizationId: request.organizationId,
      mainContent: html,
      clientName: request.title,
      userId: request.userId,
      html: html,
      title: request.title,
      fileName: request.fileName,
      boilerplateSections: [],
      options: {
        format: request.options?.format || 'A4',
        orientation: request.options?.orientation || 'portrait',
        printBackground: request.options?.printBackground ?? true,
        waitUntil: request.options?.waitUntil || 'networkidle0'
      }
    };

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF-API Fehler ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(`PDF-Generation fehlgeschlagen: ${result.error}`);
    }

    return result;
  }

  /**
   * Konvertiert Base64 PDF zu Blob
   *
   * @param base64 - Base64-encoded PDF
   * @param fileName - Dateiname
   * @returns PDF File
   */
  base64ToFile(base64: string, fileName: string): File {
    const cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
    return new File([pdfBlob], fileName, { type: 'application/pdf' });
  }

  /**
   * Generiert Dateinamen für PDF
   *
   * @param campaignId - Campaign ID
   * @param prefix - Dateiname-Prefix (default: "Monitoring_Report")
   * @returns Dateiname mit Timestamp
   */
  generateFileName(campaignId: string, prefix: string = 'Monitoring_Report'): string {
    return `${prefix}_${campaignId}_${Date.now()}.pdf`;
  }
}

// Singleton Export
export const pdfGenerator = new PDFGenerator();
