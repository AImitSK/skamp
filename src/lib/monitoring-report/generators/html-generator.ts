import type { MonitoringReportData } from '../types';
import { generateReportHTML } from '../templates/report-template';

/**
 * HTML Generator für Monitoring Reports
 *
 * Generiert vollständiges HTML aus Report-Daten.
 * Nutzt das Template-Modul für HTML-Struktur.
 */
export class HTMLGenerator {
  /**
   * Generiert HTML aus Report-Daten
   *
   * @param reportData - Monitoring Report Daten
   * @returns Vollständiges HTML als String
   */
  async generate(reportData: MonitoringReportData): Promise<string> {
    return generateReportHTML(reportData);
  }

  /**
   * Generiert HTML mit Custom-Template (optional für Zukunft)
   *
   * @param reportData - Monitoring Report Daten
   * @param templateFn - Custom Template-Funktion
   * @returns HTML als String
   */
  async generateWithTemplate(
    reportData: MonitoringReportData,
    templateFn: (data: MonitoringReportData) => string
  ): Promise<string> {
    return templateFn(reportData);
  }
}

// Singleton Export
export const htmlGenerator = new HTMLGenerator();
