/**
 * CSS Styles für PDF Reports
 *
 * Enthält alle Styles für:
 * - CSS Variablen (Farben)
 * - Typography (Schriftgrößen, Weights)
 * - Layout (Header, Sections, KPI-Grid)
 * - Components (KPI-Cards, Tables, Badges)
 * - Footer
 * - Print-Optimierungen
 */
export function generateCSS(): string {
  return `
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
    /* TIMELINE STYLES */
    .timeline-container {
      margin-top: 16px;
    }

    .timeline-table {
      width: 100%;
    }

    .timeline-table th {
      text-align: left;
      padding: 12px 8px;
      background-color: var(--bg-light);
      border-bottom: 2px solid var(--border);
      font-weight: 600;
      font-size: 13px;
    }

    .timeline-table td {
      padding: 12px 8px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    .timeline-bar-container {
      background-color: var(--bg-light);
      border-radius: 4px;
      height: 24px;
      position: relative;
      overflow: hidden;
    }

    .timeline-bar {
      background: linear-gradient(90deg, var(--primary), #0080ff);
      height: 100%;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      min-width: 30px;
      transition: width 0.3s ease;
    }

    .timeline-bar-label {
      color: white;
      font-size: 11px;
      font-weight: 600;
    }

    .timeline-summary {
      display: flex;
      justify-content: space-around;
      margin-top: 24px;
      padding: 16px;
      background-color: var(--bg-light);
      border-radius: 8px;
      gap: 16px;
    }

    .timeline-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .timeline-stat-label {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    .timeline-stat-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary);
    }

    .text-center {
      text-align: center;
    }

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
  `;
}
