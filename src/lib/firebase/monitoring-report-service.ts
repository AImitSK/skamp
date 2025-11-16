/**
 * Monitoring Report Service
 *
 * Legacy Service-Wrapper für Backward Compatibility.
 * Nutzt die neuen modularen Komponenten aus @/lib/monitoring-report.
 *
 * @deprecated Für neue Features direkt die Module aus @/lib/monitoring-report verwenden
 */

import { db } from './client-init';
import { doc, getDoc } from 'firebase/firestore';
import { mediaService } from './media-service';
import type { MonitoringReportData } from '@/lib/monitoring-report/types';
import { reportDataCollector } from '@/lib/monitoring-report/core/data-collector';
import { reportStatsCalculator } from '@/lib/monitoring-report/core/stats-calculator';
import { timelineBuilder } from '@/lib/monitoring-report/core/timeline-builder';
import { htmlGenerator } from '@/lib/monitoring-report/generators/html-generator';
import { pdfGenerator } from '@/lib/monitoring-report/generators/pdf-generator';
import { downloadHandler } from '@/lib/monitoring-report/delivery/download-handler';

/**
 * Monitoring Report Service Klasse
 *
 * Public API:
 * - collectReportData() - Sammelt und aggregiert Report-Daten
 * - generateReportHTML() - Generiert HTML aus Report-Daten
 * - generatePDFReport() - Generiert PDF und uploaded zu Storage
 * - getAnalysenFolderLink() - Generiert Link zum Analysen-Ordner
 */
class MonitoringReportService {
  /**
   * Sammelt und aggregiert alle Report-Daten
   *
   * Workflow:
   * 1. Rohdaten sammeln (Campaign, Sends, Clippings, Branding)
   * 2. Email-Statistiken berechnen (Open-Rate, CTR, Conversion)
   * 3. Clipping-Statistiken berechnen (Reach, Sentiment, Top Outlets)
   * 4. Timeline aufbauen (Aggregation nach Datum)
   *
   * @param campaignId - Campaign ID
   * @param organizationId - Organization ID
   * @returns Vollständige Report-Daten
   */
  async collectReportData(
    campaignId: string,
    organizationId: string
  ): Promise<MonitoringReportData> {
    // 1. Rohdaten sammeln
    const rawData = await reportDataCollector.collect(campaignId, organizationId);

    // 2. Statistiken berechnen
    const emailStats = reportStatsCalculator.calculateEmailStats(
      rawData.sends,
      rawData.clippings
    );
    const clippingStats = reportStatsCalculator.calculateClippingStats(rawData.clippings);

    // 3. Timeline aufbauen
    const timeline = timelineBuilder.buildTimeline(rawData.clippings);

    // 4. Report-Daten zusammenführen
    const now = new Date();

    return {
      campaignId,
      organizationId,
      reportTitle: rawData.campaignTitle,
      reportPeriod: {
        start: rawData.sentAt,
        end: now
      },
      branding: rawData.branding,
      emailStats,
      clippingStats,
      timeline,
      clippings: rawData.clippings,
      sends: rawData.sends
    };
  }

  /**
   * Generiert HTML aus Report-Daten
   *
   * @param reportData - Monitoring Report Daten
   * @returns Vollständiges HTML als String
   */
  async generateReportHTML(reportData: MonitoringReportData): Promise<string> {
    return htmlGenerator.generate(reportData);
  }

  /**
   * Generiert PDF-Report und uploaded zu Firebase Storage
   *
   * Workflow:
   * 1. Report-Daten sammeln
   * 2. HTML generieren
   * 3. PDF via Puppeteer API generieren
   * 4. Upload zu Firebase Storage (Client-Media oder Organization-Media)
   *
   * @param campaignId - Campaign ID
   * @param organizationId - Organization ID
   * @param userId - User ID für Metadata
   * @returns Download-URL und Dateigröße
   */
  async generatePDFReport(
    campaignId: string,
    organizationId: string,
    userId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    try {
      // 1. Daten sammeln
      const reportData = await this.collectReportData(campaignId, organizationId);

      // 2. HTML generieren
      const reportHtml = await htmlGenerator.generate(reportData);

      // 3. PDF generieren
      const fileName = pdfGenerator.generateFileName(campaignId);
      const result = await pdfGenerator.generate(reportHtml, {
        campaignId,
        organizationId,
        userId,
        html: reportHtml,
        title: `Monitoring Report: ${reportData.reportTitle}`,
        fileName,
        options: {
          format: 'A4',
          orientation: 'portrait',
          printBackground: true,
          waitUntil: 'networkidle0'
        }
      });

      // 4. Client-Upload (falls benötigt)
      if (result.needsClientUpload && result.pdfBase64) {
        const pdfFile = pdfGenerator.base64ToFile(result.pdfBase64, fileName);
        return downloadHandler.upload(pdfFile, campaignId, organizationId, userId);
      }

      // 5. Direkter Download-URL (Server-Upload)
      return {
        pdfUrl: result.pdfUrl || '',
        fileSize: 0
      };
    } catch (error) {
      throw new Error(`PDF-Report-Generierung fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Generiert Link zum Analysen-Ordner eines Projects
   *
   * @param campaignId - Campaign ID
   * @param organizationId - Organization ID
   * @returns Link zum Analysen-Ordner oder null
   */
  async getAnalysenFolderLink(
    campaignId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
      const campaignData = campaignDoc?.exists() ? campaignDoc.data() : null;

      if (!campaignData?.projectId) return null;

      const projectId = campaignData.projectId;
      const analysenFolderId = await this.findAnalysenFolder(projectId, organizationId);

      if (analysenFolderId) {
        return `/dashboard/projects/${projectId}?tab=daten&folder=${analysenFolderId}`;
      }

      return `/dashboard/projects/${projectId}?tab=daten`;
    } catch (error) {
      return null;
    }
  }

  private async findAnalysenFolder(
    projectId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

      const projectName = projectId.substring(0, 8);
      const projectFolder = allFolders.find(f =>
        f.name.includes('P-') && f.name.includes(projectName)
      );

      if (!projectFolder) return null;

      const analysenFolder = allFolders.find(f =>
        f.parentFolderId === projectFolder.id && f.name === 'Analysen'
      );

      return analysenFolder?.id || null;
    } catch (error) {
      return null;
    }
  }
}

export const monitoringReportService = new MonitoringReportService();