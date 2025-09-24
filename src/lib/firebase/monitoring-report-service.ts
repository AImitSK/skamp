import { db } from './client-init';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { emailCampaignService } from './email-campaign-service';
import { clippingService } from './clipping-service';
import { prService } from './pr-service';
import { mediaService } from './media-service';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';

interface MonitoringReportData {
  campaignId: string;
  organizationId: string;
  reportTitle: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  emailStats: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
  };
  clippingStats: {
    totalClippings: number;
    totalReach: number;
    totalAVE: number;
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    topOutlets: Array<{
      name: string;
      reach: number;
      clippingsCount: number;
    }>;
  };
  timeline: Array<{
    date: string;
    clippings: number;
    reach: number;
  }>;
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
}

class MonitoringReportService {
  async collectReportData(
    campaignId: string,
    organizationId: string
  ): Promise<MonitoringReportData> {
    const campaign = await prService.getById(campaignId);

    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    const [sends, clippings] = await Promise.all([
      emailCampaignService.getSends(campaignId, { organizationId }),
      clippingService.getByCampaignId(campaignId, { organizationId })
    ]);

    const emailStats = this.calculateEmailStats(sends);
    const clippingStats = this.calculateClippingStats(clippings);
    const timeline = this.calculateTimeline(clippings);

    const sentAt = campaign.sentAt?.toDate() || new Date();
    const now = new Date();

    return {
      campaignId,
      organizationId,
      reportTitle: campaign.title || 'Monitoring Report',
      reportPeriod: {
        start: sentAt,
        end: now
      },
      emailStats,
      clippingStats,
      timeline,
      clippings,
      sends
    };
  }

  private calculateEmailStats(sends: EmailCampaignSend[]) {
    const total = sends.length;
    const delivered = sends.filter(s =>
      s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
    ).length;
    const opened = sends.filter(s =>
      s.status === 'opened' || s.status === 'clicked'
    ).length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const bounced = sends.filter(s => s.status === 'bounced').length;

    return {
      totalSent: total,
      delivered,
      opened,
      clicked,
      bounced,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0
    };
  }

  private calculateClippingStats(clippings: MediaClipping[]) {
    const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);

    const sentimentDistribution = {
      positive: clippings.filter(c => c.sentiment === 'positive').length,
      neutral: clippings.filter(c => c.sentiment === 'neutral').length,
      negative: clippings.filter(c => c.sentiment === 'negative').length
    };

    const outletStats = clippings.reduce((acc, clipping) => {
      const outlet = clipping.outletName || 'Unbekannt';
      if (!acc[outlet]) {
        acc[outlet] = { name: outlet, reach: 0, clippingsCount: 0 };
      }
      acc[outlet].reach += clipping.reach || 0;
      acc[outlet].clippingsCount += 1;
      return acc;
    }, {} as Record<string, { name: string; reach: number; clippingsCount: number }>);

    const topOutlets = Object.values(outletStats)
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 5);

    return {
      totalClippings: clippings.length,
      totalReach,
      totalAVE,
      sentimentDistribution,
      topOutlets
    };
  }

  private calculateTimeline(clippings: MediaClipping[]) {
    const groupedByDate = clippings.reduce((acc, clipping) => {
      if (!clipping.publishedAt || !clipping.publishedAt.toDate) return acc;

      const date = clipping.publishedAt.toDate().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (!acc[date]) {
        acc[date] = { date, clippings: 0, reach: 0 };
      }

      acc[date].clippings += 1;
      acc[date].reach += clipping.reach || 0;

      return acc;
    }, {} as Record<string, { date: string; clippings: number; reach: number }>);

    return Object.values(groupedByDate).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }

  async generateReportHTML(reportData: MonitoringReportData): Promise<string> {
    const sentimentPercentages = {
      positive: reportData.clippingStats.totalClippings > 0
        ? Math.round((reportData.clippingStats.sentimentDistribution.positive / reportData.clippingStats.totalClippings) * 100)
        : 0,
      neutral: reportData.clippingStats.totalClippings > 0
        ? Math.round((reportData.clippingStats.sentimentDistribution.neutral / reportData.clippingStats.totalClippings) * 100)
        : 0,
      negative: reportData.clippingStats.totalClippings > 0
        ? Math.round((reportData.clippingStats.sentimentDistribution.negative / reportData.clippingStats.totalClippings) * 100)
        : 0
    };

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --primary: #005fab;
      --secondary: #DEDC00;
      --success: #10b981;
      --danger: #ef4444;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1f2937;
      line-height: 1.6;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .report-header {
      border-bottom: 4px solid var(--primary);
      padding-bottom: 24px;
      margin-bottom: 40px;
    }

    .report-header h1 {
      color: var(--primary);
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .report-meta {
      color: #6b7280;
      font-size: 14px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section-title {
      color: #111827;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }

    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }

    .kpi-label {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 8px;
    }

    .kpi-value {
      color: #111827;
      font-size: 28px;
      font-weight: 700;
    }

    .kpi-value.primary {
      color: var(--primary);
    }

    .kpi-value.success {
      color: var(--success);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }

    thead {
      background: #f3f4f6;
    }

    th {
      text-align: left;
      padding: 12px 16px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      border-bottom: 2px solid var(--primary);
    }

    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }

    tr:hover {
      background: #f9fafb;
    }

    .sentiment-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .sentiment-positive {
      background: #d1fae5;
      color: #065f46;
    }

    .sentiment-neutral {
      background: #f3f4f6;
      color: #374151;
    }

    .sentiment-negative {
      background: #fee2e2;
      color: #991b1b;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
      text-align: center;
    }

    @media print {
      body {
        padding: 20px;
      }

      .kpi-grid {
        page-break-inside: avoid;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>📊 Monitoring Report</h1>
    <h2>${reportData.reportTitle}</h2>
    <div class="report-meta">
      <p>Zeitraum: ${reportData.reportPeriod.start.toLocaleDateString('de-DE')} - ${reportData.reportPeriod.end.toLocaleDateString('de-DE')}</p>
      <p>Generiert am: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">📈 Performance-Übersicht</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">E-Mail Öffnungsrate</div>
        <div class="kpi-value primary">${reportData.emailStats.openRate}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Veröffentlichungen</div>
        <div class="kpi-value success">${reportData.clippingStats.totalClippings}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Gesamtreichweite</div>
        <div class="kpi-value">${reportData.clippingStats.totalReach.toLocaleString('de-DE')}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">AVE-Wert</div>
        <div class="kpi-value">${reportData.clippingStats.totalAVE > 0 ? reportData.clippingStats.totalAVE.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }) : '-'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">📧 E-Mail Performance Details</h2>
    <div class="kpi-grid" style="grid-template-columns: repeat(5, 1fr);">
      <div class="kpi-card">
        <div class="kpi-label">Versendet</div>
        <div class="kpi-value">${reportData.emailStats.totalSent}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Zugestellt</div>
        <div class="kpi-value">${reportData.emailStats.delivered}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Geöffnet</div>
        <div class="kpi-value">${reportData.emailStats.opened}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Geklickt</div>
        <div class="kpi-value">${reportData.emailStats.clicked}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Bounced</div>
        <div class="kpi-value">${reportData.emailStats.bounced}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">💭 Sentiment-Analyse</h2>
    <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="kpi-card">
        <div class="kpi-label">Positiv</div>
        <div class="kpi-value success">${reportData.clippingStats.sentimentDistribution.positive} (${sentimentPercentages.positive}%)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Neutral</div>
        <div class="kpi-value">${reportData.clippingStats.sentimentDistribution.neutral} (${sentimentPercentages.neutral}%)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Negativ</div>
        <div class="kpi-value" style="color: var(--danger);">${reportData.clippingStats.sentimentDistribution.negative} (${sentimentPercentages.negative}%)</div>
      </div>
    </div>
  </div>

  ${reportData.clippingStats.topOutlets.length > 0 ? `
  <div class="section">
    <h2 class="section-title">🏆 Top 5 Medien nach Reichweite</h2>
    <table>
      <thead>
        <tr>
          <th>Medium</th>
          <th>Reichweite</th>
          <th>Anzahl Artikel</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.clippingStats.topOutlets.map(outlet => `
        <tr>
          <td><strong>${outlet.name}</strong></td>
          <td>${outlet.reach.toLocaleString('de-DE')}</td>
          <td>${outlet.clippingsCount}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${reportData.clippings.length > 0 ? `
  <div class="section">
    <h2 class="section-title">📰 Alle Veröffentlichungen</h2>
    <table>
      <thead>
        <tr>
          <th>Datum</th>
          <th>Titel</th>
          <th>Medium</th>
          <th>Reichweite</th>
          <th>Sentiment</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.clippings.map(clipping => {
          const date = clipping.publishedAt?.toDate
            ? clipping.publishedAt.toDate().toLocaleDateString('de-DE')
            : '-';
          const sentimentClass = clipping.sentiment === 'positive' ? 'sentiment-positive' :
                                clipping.sentiment === 'negative' ? 'sentiment-negative' : 'sentiment-neutral';
          const sentimentLabel = clipping.sentiment === 'positive' ? 'Positiv' :
                                clipping.sentiment === 'negative' ? 'Negativ' : 'Neutral';

          return `
          <tr>
            <td>${date}</td>
            <td><strong>${clipping.title || 'Ohne Titel'}</strong></td>
            <td>${clipping.outletName || 'Unbekannt'}</td>
            <td>${(clipping.reach || 0).toLocaleString('de-DE')}</td>
            <td><span class="sentiment-badge ${sentimentClass}">${sentimentLabel}</span></td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>🤖 Generiert mit CeleroPress PR-Monitoring System</p>
    <p>Organisation ID: ${reportData.organizationId}</p>
  </div>
</body>
</html>
    `.trim();
  }

  async generatePDFReport(
    campaignId: string,
    organizationId: string,
    userId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    try {
      const reportData = await this.collectReportData(campaignId, organizationId);
      const reportHtml = await this.generateReportHTML(reportData);

      const fileName = `Monitoring_Report_${campaignId}_${Date.now()}.pdf`;

      const apiRequest = {
        campaignId: campaignId,
        organizationId,
        mainContent: reportHtml,
        clientName: reportData.reportTitle,
        userId,
        html: reportHtml,
        title: `Monitoring Report: ${reportData.reportTitle}`,
        fileName,
        boilerplateSections: [],
        options: {
          format: 'A4' as const,
          orientation: 'portrait' as const,
          printBackground: true,
          waitUntil: 'networkidle0' as const
        }
      };

      const response = await fetch('/api/generate-pdf', {
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

      if (result.needsClientUpload && result.pdfBase64) {
        const cleanBase64 = result.pdfBase64.replace(/[^A-Za-z0-9+/=]/g, '');
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        const campaignDoc = await getDoc(doc(db, 'pr_campaigns', campaignId));
        const campaignData = campaignDoc?.exists() ? campaignDoc.data() : null;

        let uploadResult: any;

        if (campaignData?.projectId && campaignData?.clientId) {
          const allFolders = await mediaService.getAllFoldersForOrganization(organizationId);

          let projectName = 'Monitoring';
          try {
            if (campaignData.projectId) {
              const projectDoc = await getDoc(doc(db, 'projects', campaignData.projectId));
              if (projectDoc.exists()) {
                const project = projectDoc.data();
                if (project?.title) {
                  projectName = project.title;
                }
              }
            }
          } catch (error) {
            console.warn('Projekt-Daten konnten nicht geladen werden:', error);
          }

          const projectFolder = allFolders.find(folder =>
            folder.name.includes('P-') && folder.name.includes(projectName)
          );

          if (projectFolder) {
            let targetFolder = allFolders.find(folder =>
              folder.parentFolderId === projectFolder.id && folder.name === 'Analysen'
            );

            if (!targetFolder) {
              targetFolder = allFolders.find(folder =>
                folder.parentFolderId === projectFolder.id && folder.name === 'Pressemeldungen'
              );
            }

            const targetFolderId = targetFolder?.id || projectFolder.id;

            if (targetFolderId) {
              const asset = await mediaService.uploadClientMedia(
                pdfFile,
                organizationId,
                campaignData.clientId,
                targetFolderId,
                undefined,
                { userId }
              );

              return {
                pdfUrl: asset.downloadUrl,
                fileSize: pdfFile.size
              };
            } else {
              throw new Error('Zielordner nicht gefunden');
            }
          } else {
            throw new Error('Projekt-Ordner nicht gefunden');
          }
        } else {
          const asset = await mediaService.uploadMedia(
            pdfFile,
            organizationId,
            undefined,
            undefined,
            3,
            { userId }
          );

          return {
            pdfUrl: asset.downloadUrl,
            fileSize: pdfFile.size
          };
        }
      }

      return {
        pdfUrl: result.pdfUrl,
        fileSize: result.fileSize
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