import { db } from './client-init';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { mediaService } from './media-service';
import type { MonitoringReportData } from '@/lib/monitoring-report/types';
import { reportDataCollector } from '@/lib/monitoring-report/core/data-collector';
import { reportStatsCalculator } from '@/lib/monitoring-report/core/stats-calculator';
import { timelineBuilder } from '@/lib/monitoring-report/core/timeline-builder';
import { generateReportHTML as generateHTMLTemplate } from '@/lib/monitoring-report/templates/report-template';
import { htmlGenerator } from '@/lib/monitoring-report/generators/html-generator';
import { pdfGenerator } from '@/lib/monitoring-report/generators/pdf-generator';
import { downloadHandler } from '@/lib/monitoring-report/delivery/download-handler';

class MonitoringReportService {
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

  async generateReportHTML(reportData: MonitoringReportData): Promise<string> {
    return generateHTMLTemplate(reportData);
  }

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