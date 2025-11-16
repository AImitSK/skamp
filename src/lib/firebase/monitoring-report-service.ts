import { db } from './client-init';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { emailCampaignService } from './email-campaign-service';
import { clippingService } from './clipping-service';
import { prService } from './pr-service';
import { mediaService } from './media-service';
import { brandingService } from './branding-service';
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';
import { BrandingSettings } from '@/types/branding';

interface MonitoringReportData {
  campaignId: string;
  organizationId: string;
  reportTitle: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  branding: BrandingSettings | null;
  emailStats: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
    ctr: number; // Click-Through-Rate (clicked / totalSent)
    conversionRate: number; // Öffnungen → Clippings
  };
  clippingStats: {
    totalClippings: number;
    totalReach: number;
    totalAVE: number;
    avgReach: number; // Durchschnitts-Reichweite pro Clipping
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
    outletTypeDistribution: Array<{
      type: string;
      count: number;
      reach: number;
      percentage: number;
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

    const [sends, clippings, branding] = await Promise.all([
      emailCampaignService.getSends(campaignId, { organizationId }),
      clippingService.getByCampaignId(campaignId, { organizationId }),
      brandingService.getBrandingSettings(organizationId).catch(() => null)
    ]);

    const emailStats = this.calculateEmailStats(sends, clippings);
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
      branding,
      emailStats,
      clippingStats,
      timeline,
      clippings,
      sends
    };
  }

  private calculateEmailStats(sends: EmailCampaignSend[], clippings: MediaClipping[]) {
    const total = sends.length;
    const delivered = sends.filter(s =>
      s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
    ).length;
    const opened = sends.filter(s =>
      s.status === 'opened' || s.status === 'clicked'
    ).length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const bounced = sends.filter(s => s.status === 'bounced').length;

    // Conversion-Rate: Sends mit Clipping-Referenz
    const withClippings = sends.filter(s => s.clippingId).length;

    return {
      totalSent: total,
      delivered,
      opened,
      clicked,
      bounced,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      ctr: total > 0 ? Math.round((clicked / total) * 100) : 0,
      conversionRate: opened > 0 ? Math.round((withClippings / opened) * 100) : 0
    };
  }

  private calculateClippingStats(clippings: MediaClipping[]) {
    const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);
    const totalClippings = clippings.length;

    // Durchschnitts-Reichweite
    const avgReach = totalClippings > 0 ? Math.round(totalReach / totalClippings) : 0;

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

    // Medientyp-Verteilung
    const outletTypeStats = clippings.reduce((acc, clipping) => {
      const type = clipping.outletType || 'Unbekannt';
      if (!acc[type]) {
        acc[type] = { type, count: 0, reach: 0, percentage: 0 };
      }
      acc[type].count += 1;
      acc[type].reach += clipping.reach || 0;
      return acc;
    }, {} as Record<string, { type: string; count: number; reach: number; percentage: number }>);

    // Prozent-Anteile berechnen
    const outletTypeDistribution = Object.values(outletTypeStats).map(stat => ({
      ...stat,
      percentage: totalClippings > 0 ? Math.round((stat.count / totalClippings) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    return {
      totalClippings,
      totalReach,
      totalAVE,
      avgReach,
      sentimentDistribution,
      topOutlets,
      outletTypeDistribution
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

  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --primary: #005fab;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --border: #e5e7eb;
      --bg-light: #f9fafb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--text-primary);
      line-height: 1.6;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* HEADER WITH BRANDING */
    .report-header {
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .header-branding {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .header-content {
      flex: 1;
    }

    .logo {
      max-width: 200px;
      max-height: 80px;
      object-fit: contain;
      margin-left: 16px;
    }

    .report-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .company-name {
      font-size: 14px;
      font-weight: 400;
      color: var(--text-secondary);
      margin-bottom: 8px;
    }

    .report-meta {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .report-meta .separator {
      margin: 0 8px;
    }

    /* SECTIONS */
    .section {
      margin-bottom: 32px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }

    /* KPI GRID */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
    }

    .kpi-label {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }

    .kpi-value {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .kpi-description {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .kpi-value.success {
      color: var(--success);
    }

    .kpi-value.danger {
      color: var(--danger);
    }

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }

    thead {
      background: var(--bg-light);
    }

    th {
      text-align: left;
      padding: 10px 12px;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 12px;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }

    tbody tr:nth-child(even) {
      background: var(--bg-light);
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

    /* FOOTER */
    .footer {
      margin-top: 48px;
      padding-top: 20px;
      font-size: 12px;
      color: var(--text-secondary);
      text-align: center;
    }

    .footer-copyright {
      margin-bottom: 8px;
    }

    .footer-contact {
      font-size: 11px;
    }

    /* PRINT STYLES */
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
  <!-- HEADER WITH BRANDING -->
  <div class="report-header">
    <div class="header-branding">
      <div class="header-content">
        <h1 class="report-title">PR-Monitoring Report</h1>
        ${reportData.branding?.companyName ? `<p class="company-name">${reportData.branding.companyName}</p>` : ''}
        <div class="report-meta">
          <span>Zeitraum: ${reportData.reportPeriod.start.toLocaleDateString('de-DE')} - ${reportData.reportPeriod.end.toLocaleDateString('de-DE')}</span>
          <span class="separator">•</span>
          <span>Generiert am: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      ${reportData.branding?.logoUrl ? `<img src="${reportData.branding.logoUrl}" alt="${reportData.branding.companyName}" class="logo" />` : ''}
    </div>
  </div>

  <!-- PERFORMANCE-ÜBERSICHT -->
  <div class="section">
    <h2 class="section-title">Performance-Übersicht</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">E-Mail Öffnungsrate</div>
        <div class="kpi-value">${reportData.emailStats.openRate}%</div>
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
        <div class="kpi-label">Ø Reichweite pro Artikel</div>
        <div class="kpi-value">${reportData.clippingStats.avgReach.toLocaleString('de-DE')}</div>
      </div>
      ${reportData.clippingStats.totalAVE > 0 ? `
      <div class="kpi-card">
        <div class="kpi-label">AVE-Wert</div>
        <div class="kpi-value">${reportData.clippingStats.totalAVE.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}</div>
      </div>
      ` : ''}
      <div class="kpi-card">
        <div class="kpi-label">Conversion-Rate</div>
        <div class="kpi-value">${reportData.emailStats.conversionRate}%</div>
      </div>
    </div>
  </div>

  <!-- E-MAIL PERFORMANCE -->
  <div class="section">
    <h2 class="section-title">E-Mail Performance</h2>
    <div class="kpi-grid">
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
        <div class="kpi-label">Click-Through-Rate</div>
        <div class="kpi-value">${reportData.emailStats.ctr}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Bounced</div>
        <div class="kpi-value danger">${reportData.emailStats.bounced}</div>
      </div>
    </div>
  </div>

  <!-- SENTIMENT-ANALYSE -->
  <div class="section">
    <h2 class="section-title">Sentiment-Analyse</h2>
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
        <div class="kpi-value danger">${reportData.clippingStats.sentimentDistribution.negative} (${sentimentPercentages.negative}%)</div>
      </div>
    </div>
  </div>

  <!-- MEDIENTYP-VERTEILUNG (NEU) -->
  ${reportData.clippingStats.outletTypeDistribution.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Medientyp-Verteilung</h2>
    <table>
      <thead>
        <tr>
          <th>Medientyp</th>
          <th>Anzahl</th>
          <th>Reichweite</th>
          <th>Anteil</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.clippingStats.outletTypeDistribution.map(type => `
        <tr>
          <td><strong>${type.type}</strong></td>
          <td>${type.count}</td>
          <td>${type.reach.toLocaleString('de-DE')}</td>
          <td>${type.percentage}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- TOP 5 MEDIEN -->
  ${reportData.clippingStats.topOutlets.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Top 5 Medien nach Reichweite</h2>
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

  <!-- ALLE VERÖFFENTLICHUNGEN -->
  ${reportData.clippings.length > 0 ? `
  <div class="section">
    <h2 class="section-title">Alle Veröffentlichungen</h2>
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

  <!-- FOOTER WITH BRANDING -->
  <div class="footer">
    ${reportData.branding ? `
    ${reportData.branding.showCopyright ? `
    <div class="footer-copyright">
      <p>© ${currentYear} ${reportData.branding.companyName} - Alle Rechte vorbehalten</p>
    </div>
    ` : ''}
    <div class="footer-contact">
      <p>${reportData.branding.companyName}${reportData.branding.phone ? ` · Tel: ${reportData.branding.phone}` : ''}${reportData.branding.website ? ` · ${reportData.branding.website}` : ''}</p>
    </div>
    ` : `
    <div class="footer-copyright">
      <p>Generiert mit CeleroPress</p>
    </div>
    `}
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
              // ✨ skipLimitCheck=true: PDF-Reporting darf nicht durch Storage-Limits blockiert werden
              const asset = await mediaService.uploadClientMedia(
                pdfFile,
                organizationId,
                campaignData.clientId,
                targetFolderId,
                undefined,
                { userId },
                true // skipLimitCheck - keine Storage-Limits für PDF-Reporting
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
          // ✨ skipLimitCheck=true: PDF-Reporting darf nicht durch Storage-Limits blockiert werden
          const asset = await mediaService.uploadMedia(
            pdfFile,
            organizationId,
            undefined,
            undefined,
            3,
            { userId },
            true // skipLimitCheck - keine Storage-Limits für PDF-Reporting
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