/**
 * Monitoring Report Module
 *
 * Zentrale Re-Export Datei für alle Monitoring Report Module.
 *
 * @module monitoring-report
 */

// ==================== TYPES ====================
export type {
  ReportConfig,
  MonitoringReportData,
  EmailStats,
  ClippingStats,
  OutletStats,
  OutletTypeDistribution,
  TimelineData,
  ReportResult,
  ScheduledReportConfig
} from './types';

// ==================== CORE ====================
export { ReportDataCollector, reportDataCollector } from './core/data-collector';
export { ReportStatsCalculator, reportStatsCalculator } from './core/stats-calculator';
export { TimelineBuilder, timelineBuilder } from './core/timeline-builder';

// ==================== TEMPLATES ====================
export { generateCSS } from './templates/styles';
export { generateReportHTML } from './templates/report-template';

// ==================== GENERATORS ====================
export { HTMLGenerator, htmlGenerator } from './generators/html-generator';
export {
  PDFGenerator,
  pdfGenerator,
  type PDFGenerationOptions,
  type PDFGenerationRequest,
  type PDFGenerationResult
} from './generators/pdf-generator';

// ==================== DELIVERY ====================
export { DownloadHandler, downloadHandler } from './delivery/download-handler';

// ==================== LEGACY COMPATIBILITY ====================
// Für Backward Compatibility mit altem Service
// Verwende @/lib/firebase/monitoring-report-service direkt
