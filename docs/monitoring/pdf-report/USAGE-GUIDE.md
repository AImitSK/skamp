# Usage Guide: Monitoring Report Modul

> **Letzte Aktualisierung**: 16. November 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [React Hook Usage](#react-hook-usage)
- [Direct Module Usage](#direct-module-usage)
- [Advanced Workflows](#advanced-workflows)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Übersicht

Dieser Guide zeigt praktische Code-Beispiele für die Verwendung des Monitoring Report Moduls. Alle Beispiele sind funktionsfähig und können direkt in CeleroPress-Projekten verwendet werden.

## React Hook Usage

### 1. Basis-Verwendung (Empfohlen)

Die einfachste Art, PDF-Reports zu generieren, ist der `usePDFReportGenerator()` Hook.

```typescript
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';

function MonitoringReportButton({ campaignId, organizationId, userId }) {
  const pdfGenerator = usePDFReportGenerator();

  const handleExport = () => {
    // PDF-Generierung starten
    pdfGenerator.mutate({
      campaignId,
      organizationId,
      userId
    });
  };

  return (
    <button
      onClick={handleExport}
      disabled={pdfGenerator.isPending}
      className="btn-primary"
    >
      {pdfGenerator.isPending ? (
        <>
          <SpinnerIcon className="animate-spin" />
          Generiere PDF...
        </>
      ) : (
        <>
          <DocumentIcon />
          PDF-Report erstellen
        </>
      )}
    </button>
  );
}
```

**Features:**
- ✅ Automatische Toast-Benachrichtigungen (Success/Error)
- ✅ Auto-Download im Browser (neues Tab)
- ✅ Query Invalidierung (analysisPDFs-Liste wird neu geladen)
- ✅ Loading State via `isPending`

### 2. Mit Success/Error Callbacks

Für Custom-Handling nach Success/Error:

```typescript
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
import { useRouter } from 'next/navigation';

function MonitoringReportCard({ campaignId, organizationId, userId }) {
  const router = useRouter();
  const pdfGenerator = usePDFReportGenerator();

  const handleExport = () => {
    pdfGenerator.mutate(
      { campaignId, organizationId, userId },
      {
        // Custom Success Handler
        onSuccess: (result) => {
          console.log('PDF generiert:', result.pdfUrl);

          // Optional: Redirect zum Analysen-Ordner
          router.push(`/dashboard/projects/${projectId}?tab=daten`);
        },
        // Custom Error Handler
        onError: (error) => {
          console.error('PDF-Generation fehlgeschlagen:', error);

          // Optional: Sentry Error Tracking
          if (typeof window !== 'undefined' && window.Sentry) {
            window.Sentry.captureException(error);
          }
        }
      }
    );
  };

  return (
    <div className="card">
      <h3>PDF-Report erstellen</h3>
      <p>Generiere einen umfassenden Performance-Report für diese Kampagne.</p>

      <button onClick={handleExport} disabled={pdfGenerator.isPending}>
        {pdfGenerator.isPending ? 'Generiere...' : 'PDF erstellen'}
      </button>

      {/* Error Display */}
      {pdfGenerator.isError && (
        <div className="alert alert-error">
          <p>PDF-Generierung fehlgeschlagen: {pdfGenerator.error.message}</p>
        </div>
      )}
    </div>
  );
}
```

### 3. Mit Progress-Feedback

Für bessere UX während der Generierung:

```typescript
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
import { useState } from 'react';

function MonitoringReportModal({ campaignId, organizationId, userId, onClose }) {
  const pdfGenerator = usePDFReportGenerator();
  const [progress, setProgress] = useState<string>('');

  const handleExport = async () => {
    setProgress('Sammle Campaign-Daten...');

    // Simulate progress (in Realität würde man WebSockets oder Polling nutzen)
    setTimeout(() => setProgress('Berechne Statistiken...'), 500);
    setTimeout(() => setProgress('Generiere HTML...'), 1000);
    setTimeout(() => setProgress('Erstelle PDF...'), 1500);
    setTimeout(() => setProgress('Uploade zu Storage...'), 3000);

    pdfGenerator.mutate(
      { campaignId, organizationId, userId },
      {
        onSuccess: () => {
          setProgress('Fertig!');
          setTimeout(onClose, 1000);
        },
        onError: () => {
          setProgress('');
        }
      }
    );
  };

  return (
    <div className="modal">
      <div className="modal-header">
        <h2>PDF-Report generieren</h2>
      </div>

      <div className="modal-body">
        {pdfGenerator.isPending ? (
          <div className="progress-container">
            <div className="spinner" />
            <p className="progress-text">{progress}</p>
            <p className="progress-hint">Dies kann bis zu 10 Sekunden dauern...</p>
          </div>
        ) : (
          <div>
            <p>Generiere einen PDF-Report mit folgenden Inhalten:</p>
            <ul>
              <li>Email-Performance (Open-Rate, CTR, Conversion-Rate)</li>
              <li>Clipping-Performance (Reach, Sentiment, Top Medien)</li>
              <li>Detaillierte Veröffentlichungsliste</li>
              <li>Timeline-Übersicht</li>
            </ul>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button onClick={onClose} disabled={pdfGenerator.isPending}>
          Abbrechen
        </button>
        <button
          onClick={handleExport}
          disabled={pdfGenerator.isPending}
          className="btn-primary"
        >
          {pdfGenerator.isPending ? 'Generiere...' : 'PDF erstellen'}
        </button>
      </div>
    </div>
  );
}
```

## Direct Module Usage

### 1. Nur Daten sammeln (ohne PDF-Generierung)

Für Custom-Reports oder Datenanalyse:

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

async function analyzeEmailPerformance(campaignId: string, organizationId: string) {
  // 1. Report-Daten sammeln
  const reportData = await monitoringReportService.collectReportData(
    campaignId,
    organizationId
  );

  // 2. Daten analysieren
  console.log('Email-Statistiken:', {
    totalSent: reportData.emailStats.totalSent,
    openRate: reportData.emailStats.openRate,
    ctr: reportData.emailStats.ctr,
    conversionRate: reportData.emailStats.conversionRate
  });

  console.log('Clipping-Statistiken:', {
    totalClippings: reportData.clippingStats.totalClippings,
    totalReach: reportData.clippingStats.totalReach,
    avgReach: reportData.clippingStats.avgReach
  });

  // 3. Top Outlets anzeigen
  reportData.clippingStats.topOutlets.forEach((outlet, index) => {
    console.log(`${index + 1}. ${outlet.name}: ${outlet.reach} Reach`);
  });

  // 4. Timeline analysieren
  reportData.timeline.forEach(point => {
    console.log(`${point.date}: ${point.clippings} Clippings, ${point.reach} Reach`);
  });

  return reportData;
}
```

### 2. Custom HTML-Template verwenden

Für eigene Report-Designs:

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { htmlGenerator } from '@/lib/monitoring-report';
import type { MonitoringReportData } from '@/lib/monitoring-report/types';

// Custom Template-Funktion
function myCustomTemplate(reportData: MonitoringReportData): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .kpi {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .kpi-card {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
          }
          .kpi-value {
            font-size: 32px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportData.reportTitle}</h1>
          <p>Performance-Report ${reportData.reportPeriod.start.toLocaleDateString('de-DE')} - ${reportData.reportPeriod.end.toLocaleDateString('de-DE')}</p>
        </div>

        <div class="kpi">
          <div class="kpi-card">
            <div class="kpi-label">Open-Rate</div>
            <div class="kpi-value">${reportData.emailStats.openRate}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Veröffentlichungen</div>
            <div class="kpi-value">${reportData.clippingStats.totalClippings}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Reichweite</div>
            <div class="kpi-value">${reportData.clippingStats.totalReach.toLocaleString('de-DE')}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function generateCustomReport(campaignId: string, organizationId: string) {
  // 1. Daten sammeln
  const reportData = await monitoringReportService.collectReportData(
    campaignId,
    organizationId
  );

  // 2. Custom HTML generieren
  const html = await htmlGenerator.generateWithTemplate(
    reportData,
    myCustomTemplate
  );

  // 3. Optional: HTML lokal speichern (für Preview)
  console.log('Custom HTML generiert:', html.length, 'Zeichen');

  return html;
}
```

### 3. Direkte Module-Verwendung (Neue API)

Für maximale Flexibilität:

```typescript
import {
  reportDataCollector,
  reportStatsCalculator,
  timelineBuilder,
  htmlGenerator,
  pdfGenerator,
  downloadHandler
} from '@/lib/monitoring-report';

async function generateReportManually(
  campaignId: string,
  organizationId: string,
  userId: string
) {
  try {
    // 1. Rohdaten sammeln
    console.log('Schritt 1: Datensammlung...');
    const rawData = await reportDataCollector.collect(campaignId, organizationId);

    // 2. Statistiken berechnen
    console.log('Schritt 2: Statistik-Berechnung...');
    const emailStats = reportStatsCalculator.calculateEmailStats(
      rawData.sends,
      rawData.clippings
    );
    const clippingStats = reportStatsCalculator.calculateClippingStats(
      rawData.clippings
    );

    // 3. Timeline aufbauen
    console.log('Schritt 3: Timeline-Aggregation...');
    const timeline = timelineBuilder.buildTimeline(rawData.clippings);

    // 4. Report-Daten zusammenführen
    const reportData = {
      campaignId,
      organizationId,
      reportTitle: rawData.campaignTitle,
      reportPeriod: {
        start: rawData.sentAt,
        end: new Date()
      },
      branding: rawData.branding,
      emailStats,
      clippingStats,
      timeline,
      clippings: rawData.clippings,
      sends: rawData.sends
    };

    // 5. HTML generieren
    console.log('Schritt 4: HTML-Generierung...');
    const html = await htmlGenerator.generate(reportData);

    // 6. PDF generieren
    console.log('Schritt 5: PDF-Generierung...');
    const fileName = pdfGenerator.generateFileName(campaignId);
    const pdfResult = await pdfGenerator.generate(html, {
      campaignId,
      organizationId,
      userId,
      html,
      title: `Monitoring Report: ${reportData.reportTitle}`,
      fileName,
      options: {
        format: 'A4',
        orientation: 'portrait',
        printBackground: true
      }
    });

    // 7. Upload zu Storage
    console.log('Schritt 6: Storage-Upload...');
    if (pdfResult.needsClientUpload && pdfResult.pdfBase64) {
      const pdfFile = pdfGenerator.base64ToFile(pdfResult.pdfBase64, fileName);
      const uploadResult = await downloadHandler.upload(
        pdfFile,
        campaignId,
        organizationId,
        userId
      );

      console.log('✅ PDF erfolgreich generiert!');
      console.log('PDF-URL:', uploadResult.pdfUrl);
      console.log('File-Size:', uploadResult.fileSize, 'bytes');

      return uploadResult;
    }

    // Server-Upload
    return {
      pdfUrl: pdfResult.pdfUrl || '',
      fileSize: 0
    };
  } catch (error) {
    console.error('❌ PDF-Generierung fehlgeschlagen:', error);
    throw error;
  }
}
```

## Advanced Workflows

### 1. Batch-Export mehrerer Campaigns

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

async function batchExportCampaigns(
  campaignIds: string[],
  organizationId: string,
  userId: string
) {
  const results = [];

  for (const campaignId of campaignIds) {
    try {
      console.log(`Generiere Report für Campaign ${campaignId}...`);

      const result = await monitoringReportService.generatePDFReport(
        campaignId,
        organizationId,
        userId
      );

      results.push({
        campaignId,
        success: true,
        pdfUrl: result.pdfUrl
      });

      // Rate Limiting: 1 PDF pro Sekunde
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({
        campaignId,
        success: false,
        error: error.message
      });
    }
  }

  // Ergebnisse zusammenfassen
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ ${successful} Reports erfolgreich generiert`);
  console.log(`❌ ${failed} Reports fehlgeschlagen`);

  return results;
}
```

### 2. Analysen-Ordner-Link abrufen

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

async function getReportFolderLink(
  campaignId: string,
  organizationId: string
): Promise<string> {
  const folderLink = await monitoringReportService.getAnalysenFolderLink(
    campaignId,
    organizationId
  );

  if (folderLink) {
    console.log('Analysen-Ordner:', folderLink);
    return folderLink;
  }

  // Fallback: Project-Übersicht
  return `/dashboard/projects`;
}

// Verwendung in React Component
function ReportFolderButton({ campaignId, organizationId }) {
  const [folderLink, setFolderLink] = useState<string | null>(null);

  useEffect(() => {
    getReportFolderLink(campaignId, organizationId).then(setFolderLink);
  }, [campaignId, organizationId]);

  if (!folderLink) return null;

  return (
    <a href={folderLink} className="btn-secondary">
      Zum Analysen-Ordner
    </a>
  );
}
```

### 3. Wöchentliche Timeline (für lange Zeiträume)

```typescript
import { timelineBuilder } from '@/lib/monitoring-report';
import type { MediaClipping } from '@/types/monitoring';

async function generateWeeklyReport(clippings: MediaClipping[]) {
  // Wöchentliche Aggregation (statt täglich)
  const weeklyTimeline = timelineBuilder.buildWeeklyTimeline(clippings);

  console.log('Wöchentliche Timeline:');
  weeklyTimeline.forEach(point => {
    console.log(`Woche ${point.date}: ${point.clippings} Clippings, ${point.reach} Reach`);
  });

  return weeklyTimeline;
}
```

## Error Handling

### 1. Try-Catch Pattern

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { toastService } from '@/lib/utils/toast';

async function generateReportWithErrorHandling(
  campaignId: string,
  organizationId: string,
  userId: string
) {
  try {
    const result = await monitoringReportService.generatePDFReport(
      campaignId,
      organizationId,
      userId
    );

    toastService.success('PDF-Report erfolgreich generiert');
    window.open(result.pdfUrl, '_blank');

    return result;
  } catch (error) {
    // Spezifische Error-Typen unterscheiden
    if (error.message.includes('Kampagne nicht gefunden')) {
      toastService.error('Kampagne nicht gefunden');
    } else if (error.message.includes('PDF-API Fehler')) {
      toastService.error('PDF-Generierung fehlgeschlagen. Bitte später erneut versuchen.');
    } else if (error.message.includes('Zielordner nicht gefunden')) {
      toastService.error('Projekt-Ordner nicht gefunden. PDF wurde zu Organization-Media hochgeladen.');
    } else {
      toastService.error('Ein unerwarteter Fehler ist aufgetreten');
    }

    // Error Logging
    console.error('PDF-Report-Generierung fehlgeschlagen:', {
      campaignId,
      organizationId,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}
```

### 2. Retry-Logic

```typescript
async function generateReportWithRetry(
  campaignId: string,
  organizationId: string,
  userId: string,
  maxRetries: number = 3
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Versuch ${attempt}/${maxRetries}...`);

      const result = await monitoringReportService.generatePDFReport(
        campaignId,
        organizationId,
        userId
      );

      console.log(`✅ Erfolgreich nach ${attempt} Versuch(en)`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Versuch ${attempt} fehlgeschlagen:`, error.message);

      if (attempt < maxRetries) {
        // Exponential Backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Warte ${delay}ms vor erneutem Versuch...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `PDF-Generierung nach ${maxRetries} Versuchen fehlgeschlagen: ${lastError?.message}`
  );
}
```

## Testing

### 1. Component Testing (React Hook)

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

jest.mock('@/lib/firebase/monitoring-report-service');

function TestComponent() {
  const pdfGenerator = usePDFReportGenerator();

  return (
    <button
      onClick={() =>
        pdfGenerator.mutate({
          campaignId: 'test-123',
          organizationId: 'org-456',
          userId: 'user-789'
        })
      }
      disabled={pdfGenerator.isPending}
    >
      {pdfGenerator.isPending ? 'Loading...' : 'Generate PDF'}
    </button>
  );
}

describe('PDF Report Generation', () => {
  it('sollte PDF erfolgreich generieren', async () => {
    const mockResult = {
      pdfUrl: 'https://example.com/report.pdf',
      fileSize: 1024
    };

    (monitoringReportService.generatePDFReport as jest.Mock).mockResolvedValue(mockResult);

    render(<TestComponent />);

    const button = screen.getByText('Generate PDF');
    await userEvent.click(button);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Generate PDF')).toBeInTheDocument();
    });

    expect(monitoringReportService.generatePDFReport).toHaveBeenCalledWith(
      'test-123',
      'org-456',
      'user-789'
    );
  });
});
```

### 2. Unit Testing (Module)

Siehe [TESTING.md](./TESTING.md) für vollständige Test-Beispiele.

## Best Practices

### 1. Immer organizationId validieren

```typescript
function generateReport(campaignId: string, organizationId: string, userId: string) {
  if (!organizationId) {
    throw new Error('organizationId ist erforderlich');
  }

  // Multi-Tenancy sicherstellen
  return monitoringReportService.generatePDFReport(campaignId, organizationId, userId);
}
```

### 2. Loading States anzeigen

```typescript
function MonitoringReportUI() {
  const pdfGenerator = usePDFReportGenerator();

  return (
    <div>
      <button onClick={handleExport} disabled={pdfGenerator.isPending}>
        {pdfGenerator.isPending ? 'Generiere PDF...' : 'PDF-Report'}
      </button>

      {pdfGenerator.isPending && (
        <div className="progress-bar">
          <div className="progress-bar-fill animate-pulse" />
        </div>
      )}
    </div>
  );
}
```

### 3. User-Feedback geben

```typescript
import { toastService } from '@/lib/utils/toast';

const pdfGenerator = usePDFReportGenerator();

pdfGenerator.mutate(
  { campaignId, organizationId, userId },
  {
    onSuccess: () => {
      toastService.success('PDF-Report erfolgreich generiert');
    },
    onError: () => {
      toastService.error('PDF-Export fehlgeschlagen');
    }
  }
);
```

### 4. Query Invalidierung nicht vergessen

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

pdfGenerator.mutate(
  { campaignId, organizationId, userId },
  {
    onSuccess: () => {
      // analysisPDFs-Liste neu laden
      queryClient.invalidateQueries({ queryKey: ['analysisPDFs', campaignId] });
    }
  }
);
```

---

**© 2025 CeleroPress** | Usage Guide
