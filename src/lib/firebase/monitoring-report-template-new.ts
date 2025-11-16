// Neue, überarbeitete generateReportHTML Methode
// Phase 1: Branding Integration ✅
// Phase 2: Design-Überarbeitung ✅
// Phase 3: Fehlende Metriken ✅

import { BrandingSettings } from '@/types/branding';
import { MediaClipping } from '@/types/monitoring';

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
    ctr: number;
    conversionRate: number;
  };
  clippingStats: {
    totalClippings: number;
    totalReach: number;
    totalAVE: number;
    avgReach: number;
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
}

export function generateReportHTML(reportData: MonitoringReportData): string {
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
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }

    .header-branding {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .logo {
      max-width: 200px;
      max-height: 80px;
      object-fit: contain;
    }

    .company-info h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .company-tagline {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .report-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--text-primary);
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
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
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
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-secondary);
    }

    .footer-contact {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 16px;
    }

    .footer-column strong {
      display: block;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .footer-column p {
      margin-bottom: 2px;
    }

    .footer-copyright {
      text-align: center;
      padding-top: 12px;
      border-top: 1px solid var(--border);
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
    ${reportData.branding && reportData.branding.logoUrl ? `
    <div class="header-branding">
      <img src="${reportData.branding.logoUrl}" alt="${reportData.branding.companyName}" class="logo" />
      <div class="company-info">
        <h3>${reportData.branding.companyName}</h3>
        <p class="company-tagline">PR-Monitoring Report</p>
      </div>
    </div>
    ` : reportData.branding?.companyName ? `
    <div class="header-branding">
      <div class="company-info">
        <h3>${reportData.branding.companyName}</h3>
        <p class="company-tagline">PR-Monitoring Report</p>
      </div>
    </div>
    ` : ''}

    <h1 class="report-title">${reportData.reportTitle}</h1>
    <div class="report-meta">
      <span>Zeitraum: ${reportData.reportPeriod.start.toLocaleDateString('de-DE')} - ${reportData.reportPeriod.end.toLocaleDateString('de-DE')}</span>
      <span class="separator">•</span>
      <span>Generiert am: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
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
        <div class="kpi-description">Öffnungen → Veröffentlichungen</div>
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
        <div class="kpi-description">${reportData.emailStats.clicked} von ${reportData.emailStats.totalSent} E-Mails</div>
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
    <div class="footer-contact">
      <div class="footer-column">
        <strong>${reportData.branding.companyName}</strong>
        ${reportData.branding.address?.street ? `<p>${reportData.branding.address.street}</p>` : ''}
        ${reportData.branding.address?.postalCode && reportData.branding.address?.city ? `<p>${reportData.branding.address.postalCode} ${reportData.branding.address.city}</p>` : ''}
        ${reportData.branding.address?.country ? `<p>${reportData.branding.address.country}</p>` : ''}
      </div>
      <div class="footer-column">
        ${reportData.branding.phone ? `<p>Tel: ${reportData.branding.phone}</p>` : ''}
        ${reportData.branding.email ? `<p>E-Mail: ${reportData.branding.email}</p>` : ''}
        ${reportData.branding.website ? `<p>Web: ${reportData.branding.website}</p>` : ''}
      </div>
    </div>
    ${reportData.branding.showCopyright ? `
    <div class="footer-copyright">
      <p>© ${currentYear} ${reportData.branding.companyName} - Alle Rechte vorbehalten</p>
    </div>
    ` : ''}
    ` : `
    <div class="footer-copyright">
      <p>Generiert mit CeleroPress</p>
      <p>Organisation ID: ${reportData.organizationId}</p>
    </div>
    `}
  </div>
</body>
</html>
    `.trim();
}
