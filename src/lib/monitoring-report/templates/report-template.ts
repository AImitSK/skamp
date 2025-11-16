import type { MonitoringReportData } from '../types';
import { generateCSS } from './styles';

/**
 * Generiert vollständiges HTML für PDF-Report
 *
 * @param reportData - Monitoring Report Daten
 * @returns HTML als String
 */
export function generateReportHTML(reportData: MonitoringReportData): string {
  const sentimentPercentages = calculateSentimentPercentages(reportData);
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    ${generateCSS()}
  </style>
</head>
<body>
  ${generateHeader(reportData)}
  ${generatePerformanceOverview(reportData)}
  ${generateEmailPerformance(reportData)}
  ${generateSentimentAnalysis(reportData, sentimentPercentages)}
  ${generateOutletTypeDistribution(reportData)}
  ${generateTopOutlets(reportData)}
  ${generateAllClippings(reportData)}
  ${generateFooter(reportData, currentYear)}
</body>
</html>
  `.trim();
}

/**
 * Berechnet Sentiment-Prozentsätze
 */
function calculateSentimentPercentages(reportData: MonitoringReportData) {
  const total = reportData.clippingStats.totalClippings;
  return {
    positive: total > 0
      ? Math.round((reportData.clippingStats.sentimentDistribution.positive / total) * 100)
      : 0,
    neutral: total > 0
      ? Math.round((reportData.clippingStats.sentimentDistribution.neutral / total) * 100)
      : 0,
    negative: total > 0
      ? Math.round((reportData.clippingStats.sentimentDistribution.negative / total) * 100)
      : 0
  };
}

/**
 * Generiert Header mit Branding
 */
function generateHeader(reportData: MonitoringReportData): string {
  return `
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
  `;
}

/**
 * Generiert Performance-Übersicht Section
 */
function generatePerformanceOverview(reportData: MonitoringReportData): string {
  return `
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
  `;
}

/**
 * Generiert E-Mail Performance Section
 */
function generateEmailPerformance(reportData: MonitoringReportData): string {
  return `
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
  `;
}

/**
 * Generiert Sentiment-Analyse Section
 */
function generateSentimentAnalysis(
  reportData: MonitoringReportData,
  percentages: { positive: number; neutral: number; negative: number }
): string {
  return `
  <!-- SENTIMENT-ANALYSE -->
  <div class="section">
    <h2 class="section-title">Sentiment-Analyse</h2>
    <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="kpi-card">
        <div class="kpi-label">Positiv</div>
        <div class="kpi-value success">${reportData.clippingStats.sentimentDistribution.positive} (${percentages.positive}%)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Neutral</div>
        <div class="kpi-value">${reportData.clippingStats.sentimentDistribution.neutral} (${percentages.neutral}%)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Negativ</div>
        <div class="kpi-value danger">${reportData.clippingStats.sentimentDistribution.negative} (${percentages.negative}%)</div>
      </div>
    </div>
  </div>
  `;
}

/**
 * Generiert Medientyp-Verteilung Tabelle
 */
function generateOutletTypeDistribution(reportData: MonitoringReportData): string {
  if (reportData.clippingStats.outletTypeDistribution.length === 0) {
    return '';
  }

  return `
  <!-- MEDIENTYP-VERTEILUNG -->
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
  `;
}

/**
 * Generiert Top 5 Medien Tabelle
 */
function generateTopOutlets(reportData: MonitoringReportData): string {
  if (reportData.clippingStats.topOutlets.length === 0) {
    return '';
  }

  return `
  <!-- TOP 5 MEDIEN -->
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
  `;
}

/**
 * Generiert Alle Veröffentlichungen Tabelle
 */
function generateAllClippings(reportData: MonitoringReportData): string {
  if (reportData.clippings.length === 0) {
    return '';
  }

  return `
  <!-- ALLE VERÖFFENTLICHUNGEN -->
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
  `;
}

/**
 * Generiert Footer mit Branding
 */
function generateFooter(reportData: MonitoringReportData, currentYear: number): string {
  return `
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
  `;
}
