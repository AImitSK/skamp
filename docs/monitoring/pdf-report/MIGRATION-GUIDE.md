# Migration Guide: Monitoring Report Modul

> **Letzte Aktualisierung**: 16. November 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Breaking Changes](#breaking-changes)
- [Migration-Schritte](#migration-schritte)
- [Vorher/Nachher Vergleich](#vornachher-vergleich)
- [Backward Compatibility](#backward-compatibility)
- [Troubleshooting](#troubleshooting)

## Übersicht

Dieser Guide hilft bei der Migration von der alten monolithischen API zur neuen modularen Struktur des Monitoring Report Moduls.

### Wann migrieren?

**Migration ist OPTIONAL:**
- Der alte Service (`monitoringReportService`) bleibt vollständig funktional
- Intern nutzt er bereits die neuen Module
- Keine Breaking Changes in der Public API

**Migration ist EMPFOHLEN:**
- Für neue Features: Nutze die neuen Module direkt
- Für bessere Testbarkeit: Modulare Struktur vereinfacht Mocking
- Für React-Komponenten: Nutze `usePDFReportGenerator()` Hook

## Breaking Changes

### ⚠️ KEINE Breaking Changes

Das Refactoring wurde **backward-compatible** durchgeführt:

```typescript
// ✅ Alte API funktioniert weiterhin
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

const result = await monitoringReportService.generatePDFReport(
  campaignId,
  organizationId,
  userId
);
```

### ✅ Neue Features (nicht breaking)

```typescript
// ✅ Neue Module (optional)
import {
  reportDataCollector,
  reportStatsCalculator,
  timelineBuilder
} from '@/lib/monitoring-report';

// ✅ React Hook (optional)
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
```

## Migration-Schritte

### Schritt 1: Bestandsaufnahme

Identifiziere alle Stellen im Code, die den alten Service verwenden:

```bash
# Suche nach Verwendungen
grep -r "monitoringReportService" src/
```

**Typische Verwendungsstellen:**
- React Components (Button-Clicks)
- API-Routes (Server-Side PDF-Generierung)
- Cron-Jobs (Automatische Reports)

### Schritt 2: Priorisierung

**Hoch-Priorität (sofort migrieren):**
- React Components → zu `usePDFReportGenerator()` Hook

**Mittel-Priorität (bei Gelegenheit):**
- API-Routes → direkte Module nutzen für bessere Performance

**Niedrig-Priorität (optional):**
- Legacy Code, der funktioniert → kann bleiben

### Schritt 3: Migration durchführen

Siehe [Vorher/Nachher Vergleich](#vornachher-vergleich) für Code-Beispiele.

## Vorher/Nachher Vergleich

### Beispiel 1: React Component Migration

#### Vorher (Phase 0-1)

```typescript
import { useState } from 'react';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { toastService } from '@/lib/utils/toast';

function MonitoringReportButton({ campaignId, organizationId, userId }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);

    try {
      const result = await monitoringReportService.generatePDFReport(
        campaignId,
        organizationId,
        userId
      );

      toastService.success('PDF-Report erfolgreich generiert');
      window.open(result.pdfUrl, '_blank');
    } catch (error) {
      console.error('PDF-Generation fehlgeschlagen:', error);
      toastService.error('PDF-Export fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={isLoading}>
      {isLoading ? 'Generiere PDF...' : 'PDF-Report erstellen'}
    </button>
  );
}
```

#### Nachher (Phase 2+)

```typescript
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';

function MonitoringReportButton({ campaignId, organizationId, userId }) {
  const pdfGenerator = usePDFReportGenerator();

  const handleExport = () => {
    pdfGenerator.mutate({
      campaignId,
      organizationId,
      userId
    });
  };

  return (
    <button onClick={handleExport} disabled={pdfGenerator.isPending}>
      {pdfGenerator.isPending ? 'Generiere PDF...' : 'PDF-Report erstellen'}
    </button>
  );
}
```

**Vorteile:**
- ✅ Weniger Code (20 vs 35 Zeilen)
- ✅ Automatische Toast-Benachrichtigungen
- ✅ Automatischer Auto-Download
- ✅ Automatische Query Invalidierung
- ✅ Kein manuelles useState/try-catch nötig

### Beispiel 2: API-Route Migration

#### Vorher

```typescript
// app/api/reports/[campaignId]/route.ts
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const organizationId = request.headers.get('X-Organization-ID');
    const userId = request.headers.get('X-User-ID');

    const result = await monitoringReportService.generatePDFReport(
      params.campaignId,
      organizationId,
      userId
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'PDF-Generierung fehlgeschlagen' },
      { status: 500 }
    );
  }
}
```

#### Nachher (mit direkten Modulen)

```typescript
// app/api/reports/[campaignId]/route.ts
import {
  reportDataCollector,
  reportStatsCalculator,
  timelineBuilder,
  htmlGenerator,
  pdfGenerator
} from '@/lib/monitoring-report';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const organizationId = request.headers.get('X-Organization-ID');
    const userId = request.headers.get('X-User-ID');

    // Mehr Kontrolle über jeden Schritt
    const rawData = await reportDataCollector.collect(
      params.campaignId,
      organizationId
    );

    const emailStats = reportStatsCalculator.calculateEmailStats(
      rawData.sends,
      rawData.clippings
    );

    const clippingStats = reportStatsCalculator.calculateClippingStats(
      rawData.clippings
    );

    const timeline = timelineBuilder.buildTimeline(rawData.clippings);

    const reportData = {
      campaignId: params.campaignId,
      organizationId,
      reportTitle: rawData.campaignTitle,
      reportPeriod: { start: rawData.sentAt, end: new Date() },
      branding: rawData.branding,
      emailStats,
      clippingStats,
      timeline,
      clippings: rawData.clippings,
      sends: rawData.sends
    };

    const html = await htmlGenerator.generate(reportData);

    const fileName = pdfGenerator.generateFileName(params.campaignId);
    const pdfResult = await pdfGenerator.generate(html, {
      campaignId: params.campaignId,
      organizationId,
      userId,
      html,
      title: `Monitoring Report: ${reportData.reportTitle}`,
      fileName
    });

    return NextResponse.json({
      pdfUrl: pdfResult.pdfUrl,
      stats: {
        emailStats,
        clippingStats
      }
    });
  } catch (error) {
    console.error('PDF-Generierung fehlgeschlagen:', error);

    return NextResponse.json(
      {
        error: 'PDF-Generierung fehlgeschlagen',
        details: error.message
      },
      { status: 500 }
    );
  }
}
```

**Vorteile:**
- ✅ Mehr Kontrolle über jeden Schritt
- ✅ Kann Zwischen-Ergebnisse zurückgeben (z.B. nur Stats ohne PDF)
- ✅ Bessere Error-Handling-Granularität
- ✅ Einfacher zu testen (Module einzeln mocken)

### Beispiel 3: Nur Daten sammeln (ohne PDF)

#### Vorher (nicht möglich)

```typescript
// ❌ Alte API konnte nur kompletten PDF-Report generieren
const result = await monitoringReportService.generatePDFReport(...);
```

#### Nachher

```typescript
// ✅ Neue API erlaubt granularen Zugriff
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

// Nur Daten sammeln (ohne PDF-Generierung)
const reportData = await monitoringReportService.collectReportData(
  campaignId,
  organizationId
);

console.log('Open-Rate:', reportData.emailStats.openRate);
console.log('Reichweite:', reportData.clippingStats.totalReach);
```

**Use-Case:**
- Dashboard-Anzeige ohne PDF-Export
- API-Endpoints für Mobile Apps
- Data-Export zu Analytics-Tools

### Beispiel 4: Custom HTML-Template

#### Vorher (nicht möglich)

```typescript
// ❌ Alte API hatte fest codiertes Template
const result = await monitoringReportService.generatePDFReport(...);
```

#### Nachher

```typescript
// ✅ Neue API unterstützt Custom-Templates
import { htmlGenerator } from '@/lib/monitoring-report';
import type { MonitoringReportData } from '@/lib/monitoring-report/types';

function myCustomTemplate(data: MonitoringReportData): string {
  return `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>${data.reportTitle}</h1>
        <p>Custom Template Content</p>
      </body>
    </html>
  `;
}

const html = await htmlGenerator.generateWithTemplate(
  reportData,
  myCustomTemplate
);
```

**Use-Case:**
- White-Label Reports für Kunden
- Branded Reports mit Custom-Design
- A/B-Testing verschiedener Report-Layouts

## Backward Compatibility

### Legacy Service bleibt verfügbar

Der alte `monitoringReportService` nutzt intern die neuen Module:

```typescript
// src/lib/firebase/monitoring-report-service.ts
class MonitoringReportService {
  async generatePDFReport(...) {
    // Intern: Nutzt die neuen Module
    const rawData = await reportDataCollector.collect(...);
    const emailStats = reportStatsCalculator.calculateEmailStats(...);
    const clippingStats = reportStatsCalculator.calculateClippingStats(...);
    const timeline = timelineBuilder.buildTimeline(...);
    const html = await htmlGenerator.generate(...);
    const result = await pdfGenerator.generate(...);
    return downloadHandler.upload(...);
  }
}
```

### Keine Anpassungen erforderlich

Bestehendes Code funktioniert weiterhin:

```typescript
// ✅ Funktioniert weiterhin (v1.x und v2.x)
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

const result = await monitoringReportService.generatePDFReport(
  campaignId,
  organizationId,
  userId
);
```

### Deprecation-Warning

**WICHTIG:** Der alte Service ist **NICHT** deprecated!

```typescript
// ✅ Weiterhin supported
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

// ✅ Empfohlen für neue Features
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
```

## Troubleshooting

### Problem 1: "Cannot find module @/lib/monitoring-report"

**Ursache:** Alte TypeScript-Konfiguration cached.

**Lösung:**

```bash
# TypeScript-Cache löschen
rm -rf node_modules/.cache

# Neu installieren
npm install

# TypeScript-Check
npm run type-check
```

### Problem 2: "usePDFReportGenerator is not a function"

**Ursache:** Hook nicht korrekt importiert.

**Lösung:**

```typescript
// ❌ Falsch
import usePDFReportGenerator from '@/lib/hooks/useMonitoringReport';

// ✅ Richtig (named export)
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';
```

### Problem 3: "Query Client not found"

**Ursache:** React Query nicht korrekt eingerichtet.

**Lösung:**

```typescript
// app/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Problem 4: Tests schlagen fehl nach Migration

**Ursache:** Mocking-Strategie muss angepasst werden.

**Lösung:**

```typescript
// Vorher: Ganzen Service mocken
jest.mock('@/lib/firebase/monitoring-report-service');

// Nachher: Einzelne Module mocken
jest.mock('@/lib/monitoring-report/core/data-collector');
jest.mock('@/lib/monitoring-report/core/stats-calculator');
jest.mock('@/lib/monitoring-report/core/timeline-builder');
jest.mock('@/lib/monitoring-report/generators/html-generator');
jest.mock('@/lib/monitoring-report/generators/pdf-generator');
jest.mock('@/lib/monitoring-report/delivery/download-handler');
```

Siehe [TESTING.md](./TESTING.md) für vollständige Test-Beispiele.

### Problem 5: Performance-Verschlechterung

**Ursache:** Module werden mehrfach importiert.

**Lösung:**

```typescript
// ❌ Falsch: Mehrfache Instanziierung
import { ReportDataCollector } from '@/lib/monitoring-report';
const collector1 = new ReportDataCollector();
const collector2 = new ReportDataCollector(); // Overhead!

// ✅ Richtig: Singleton verwenden
import { reportDataCollector } from '@/lib/monitoring-report';
// Nur eine Instanz über gesamte App
```

## Checkliste für Migration

### Phase 1: Vorbereitung

- [ ] Backup erstellen (Git-Branch)
- [ ] Tests ausführen (`npm test`)
- [ ] Alle Verwendungen identifizieren (`grep -r "monitoringReportService"`)

### Phase 2: React Components migrieren

- [ ] Alle `useState`-basierten Loading States zu `usePDFReportGenerator()` migrieren
- [ ] Manuelle Toast-Calls entfernen (automatisch im Hook)
- [ ] Query Invalidierung prüfen

### Phase 3: API-Routes migrieren (optional)

- [ ] Direkte Module-Verwendung für granularen Zugriff
- [ ] Zwischen-Ergebnisse zurückgeben (Stats ohne PDF)
- [ ] Error-Handling verbessern

### Phase 4: Tests anpassen

- [ ] Mocking-Strategie auf Module umstellen
- [ ] Test-Coverage prüfen (`npm run test:coverage`)
- [ ] Alle Tests grün (`npm test`)

### Phase 5: Deployment

- [ ] Staging-Environment testen
- [ ] Performance-Monitoring (keine Regression)
- [ ] Production-Deployment

---

**© 2025 CeleroPress** | Migration Guide
