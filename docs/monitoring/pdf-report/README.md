# Monitoring Report Modul

> **Modul**: monitoring-report
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 16. November 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Architektur](#architektur)
- [Quick Start](#quick-start)
- [Module-Übersicht](#module-übersicht)
- [API-Verwendung](#api-verwendung)
- [Performance](#performance)
- [Testing](#testing)
- [Migration](#migration)
- [Siehe auch](#siehe-auch)

## Übersicht

Das **Monitoring Report Modul** generiert professionelle PDF-Reports für PR-Kampagnen mit umfassenden Performance-Analysen. Nach einem kompletten Refactoring ist der Service von 867 Zeilen monolithischem Code auf **10 modulare Komponenten** aufgeteilt worden.

### Was macht das Modul?

- **Datensammlung**: Aggregiert Campaign-Daten, Email-Sends, Media-Clippings und Branding
- **Statistik-Berechnung**: Email-Performance (Open-Rate, CTR), Clipping-Performance (Reach, Sentiment)
- **HTML-Generierung**: Erstellt strukturierte HTML-Reports mit CSS-Styling
- **PDF-Generierung**: Konvertiert HTML zu PDF via Puppeteer API
- **Storage-Upload**: Uploaded PDFs zu Firebase Storage (Client-Media oder Organization-Media)

### Warum wurde refactored?

**Vorher (Phase 0):**
- 867 Zeilen monolithischer Code in `monitoring-report-service.ts`
- Schwer testbar, schwer wartbar
- Keine klare Trennung von Verantwortlichkeiten

**Nachher (Phase 2-4):**
- **10 modulare Komponenten** (Core, Templates, Generators, Delivery)
- **85 Tests** mit vollständiger Coverage
- **Performance-Optimierungen** (useCallback, Memoization)
- **React Query Integration** für State Management

## Features

### ✅ Core Features

- **Multi-Tenancy Support**: Vollständige organizationId-basierte Isolation
- **Branding Integration**: Custom Logos, Farben, Company-Namen
- **Smart Folder Management**: Automatisches Upload zu Project-Ordnern (Analysen/Pressemeldungen)
- **Auto-Download**: PDF öffnet sich automatisch in neuem Browser-Tab
- **Toast-Benachrichtigungen**: Success/Error-Feedback für User
- **Storage-Limit Bypass**: PDF-Reports überschreiten keine Client-Storage-Limits

### 📊 Report-Inhalte

**Email-Performance:**
- Versand-Statistiken (Sent, Delivered, Opened, Clicked)
- Open-Rate, Click-Rate, Click-Through-Rate (CTR)
- Conversion-Rate (Email-Öffnungen → Clippings)
- Bounce-Rate

**Clipping-Performance:**
- Gesamt-Reichweite & AVE-Wert
- Durchschnitts-Reichweite pro Artikel
- Sentiment-Analyse (Positiv, Neutral, Negativ)
- Top 5 Medien nach Reichweite
- Medientyp-Verteilung (Print, Online, TV, etc.)
- Timeline-Darstellung (Clippings & Reach über Zeit)

**Detaillierte Clipping-Liste:**
- Alle Veröffentlichungen mit Datum, Titel, Medium, Reichweite, Sentiment
- Sortiert nach Veröffentlichungsdatum

## Architektur

### Modul-Struktur

```
src/lib/monitoring-report/
├── types.ts                          # TypeScript-Typen (124 Zeilen)
├── index.ts                          # Zentrale Re-Exports (47 Zeilen)
│
├── core/                             # Kernlogik
│   ├── data-collector.ts             # Datensammlung (117 Zeilen)
│   ├── stats-calculator.ts           # Statistik-Berechnung (144 Zeilen)
│   └── timeline-builder.ts           # Timeline-Aggregation (100 Zeilen)
│
├── templates/                        # HTML-Templates
│   ├── styles.ts                     # CSS-Styles (237 Zeilen)
│   └── report-template.ts            # HTML-Generierung (327 Zeilen)
│
├── generators/                       # Content-Generierung
│   ├── html-generator.ts             # HTML-Generator (38 Zeilen)
│   └── pdf-generator.ts              # PDF-Generator (127 Zeilen)
│
└── delivery/                         # Storage & Download
    └── download-handler.ts           # Firebase Upload (164 Zeilen)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     MONITORING REPORT PIPELINE                  │
└─────────────────────────────────────────────────────────────────┘

1. DATA COLLECTION (ReportDataCollector)
   ↓
   Firestore: Campaign, Sends, Clippings, Branding
   ↓
2. STATS CALCULATION (ReportStatsCalculator)
   ↓
   Email Stats, Clipping Stats, Sentiment, Top Outlets
   ↓
3. TIMELINE BUILDING (TimelineBuilder)
   ↓
   Timeline-Aggregation (Clippings & Reach pro Datum)
   ↓
4. HTML GENERATION (HTMLGenerator)
   ↓
   Vollständiges HTML mit CSS-Styles
   ↓
5. PDF GENERATION (PDFGenerator)
   ↓
   API-Call zu Puppeteer-Service
   ↓
6. STORAGE UPLOAD (DownloadHandler)
   ↓
   Firebase Storage (Client-Media oder Organization-Media)
   ↓
7. AUTO-DOWNLOAD
   ↓
   Browser öffnet PDF in neuem Tab
```

### Design Patterns

- **Singleton Pattern**: Alle Module exportieren Singleton-Instanzen
- **Service Layer**: Klare Trennung zwischen Business-Logik und API
- **Builder Pattern**: Timeline- und HTML-Generierung
- **Strategy Pattern**: Client-Media vs Organization-Media Upload

## Quick Start

### 1. Installation

Das Modul ist bereits in CeleroPress integriert. Keine zusätzliche Installation nötig.

### 2. React Component Integration

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
    <button
      onClick={handleExport}
      disabled={pdfGenerator.isPending}
    >
      {pdfGenerator.isPending ? 'Generiere PDF...' : 'PDF-Report erstellen'}
    </button>
  );
}
```

### 3. Direct Service Usage (ohne Hook)

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

async function generateReport() {
  try {
    const result = await monitoringReportService.generatePDFReport(
      'campaign-123',
      'org-456',
      'user-789'
    );

    console.log('PDF-URL:', result.pdfUrl);
    console.log('File-Size:', result.fileSize);

    // Manueller Download
    window.open(result.pdfUrl, '_blank');
  } catch (error) {
    console.error('PDF-Generation fehlgeschlagen:', error);
  }
}
```

## Module-Übersicht

### 1. Core Module

#### ReportDataCollector

Sammelt alle benötigten Rohdaten aus Firestore.

**Verantwortlichkeiten:**
- Campaign-Metadaten laden
- Email-Sends abrufen
- Media-Clippings abrufen
- Branding-Settings laden
- Parallele API-Calls für Performance

**Verwendung:**

```typescript
import { reportDataCollector } from '@/lib/monitoring-report';

const rawData = await reportDataCollector.collect(
  'campaign-123',
  'org-456'
);

console.log(rawData.campaignTitle); // "PR-Kampagne Q4"
console.log(rawData.sends.length);  // 150
console.log(rawData.clippings.length); // 23
```

#### ReportStatsCalculator

Berechnet alle Statistiken aus Rohdaten.

**Verantwortlichkeiten:**
- Email-Performance berechnen (Open-Rate, CTR, Conversion-Rate)
- Clipping-Performance berechnen (Reach, AVE, Sentiment)
- Top Outlets ermitteln (Top 5 nach Reichweite)
- Medientyp-Verteilung berechnen

**Verwendung:**

```typescript
import { reportStatsCalculator } from '@/lib/monitoring-report';

const emailStats = reportStatsCalculator.calculateEmailStats(
  sends,
  clippings
);

console.log(`Open-Rate: ${emailStats.openRate}%`);
console.log(`CTR: ${emailStats.ctr}%`);

const clippingStats = reportStatsCalculator.calculateClippingStats(
  clippings
);

console.log(`Gesamt-Reichweite: ${clippingStats.totalReach}`);
console.log(`Top Outlet: ${clippingStats.topOutlets[0].name}`);
```

#### TimelineBuilder

Aggregiert Clippings nach Datum für Timeline-Visualisierung.

**Verantwortlichkeiten:**
- Gruppierung nach Veröffentlichungsdatum
- Aggregation von Clippings & Reichweite pro Tag
- Optional: Wöchentliche Aggregation für lange Zeiträume

**Verwendung:**

```typescript
import { timelineBuilder } from '@/lib/monitoring-report';

const timeline = timelineBuilder.buildTimeline(clippings);

timeline.forEach(point => {
  console.log(`${point.date}: ${point.clippings} Clippings, ${point.reach} Reach`);
});

// Optional: Wöchentliche Timeline
const weeklyTimeline = timelineBuilder.buildWeeklyTimeline(clippings);
```

### 2. Template Module

#### generateCSS()

Generiert CSS-Styles für PDF-Reports.

**Features:**
- CSS-Variablen für Farben (Branding-Support)
- Responsive Typography
- KPI-Grid Layout
- Print-Optimierungen
- Sentiment-Badges (Positiv/Neutral/Negativ)

**Verwendung:**

```typescript
import { generateCSS } from '@/lib/monitoring-report';

const css = generateCSS();
// Wird automatisch in HTML-Template eingebettet
```

#### generateReportHTML()

Generiert vollständiges HTML aus Report-Daten.

**Features:**
- Header mit Branding (Logo, Company-Name)
- Performance-Übersicht (KPIs)
- Email-Performance Section
- Sentiment-Analyse
- Medientyp-Verteilung
- Top 5 Medien
- Detaillierte Clipping-Liste
- Footer mit Branding

**Verwendung:**

```typescript
import { generateReportHTML } from '@/lib/monitoring-report';

const html = generateReportHTML(reportData);

// HTML in Datei speichern (für Debugging)
fs.writeFileSync('report.html', html);
```

### 3. Generator Module

#### HTMLGenerator

Service-Wrapper für HTML-Generierung.

**Features:**
- Einfaches API-Interface
- Support für Custom-Templates (Zukunft)

**Verwendung:**

```typescript
import { htmlGenerator } from '@/lib/monitoring-report';

const html = await htmlGenerator.generate(reportData);

// Mit Custom-Template
const customHTML = await htmlGenerator.generateWithTemplate(
  reportData,
  myCustomTemplate
);
```

#### PDFGenerator

Generiert PDF aus HTML via Puppeteer API.

**Features:**
- Format-Unterstützung (A4, Letter)
- Orientierung (Portrait, Landscape)
- Print-Background-Support
- Dateiname-Generierung
- Base64-to-File Konvertierung

**Verwendung:**

```typescript
import { pdfGenerator } from '@/lib/monitoring-report';

const fileName = pdfGenerator.generateFileName('campaign-123');

const result = await pdfGenerator.generate(html, {
  campaignId: 'campaign-123',
  organizationId: 'org-456',
  userId: 'user-789',
  html,
  title: 'Monitoring Report: Q4 Campaign',
  fileName,
  options: {
    format: 'A4',
    orientation: 'portrait',
    printBackground: true
  }
});

if (result.needsClientUpload && result.pdfBase64) {
  const pdfFile = pdfGenerator.base64ToFile(result.pdfBase64, fileName);
  // Upload zu Storage
}
```

### 4. Delivery Module

#### DownloadHandler

Verantwortlich für Firebase Storage Upload.

**Features:**
- Smart Folder-Management (Analysen/Pressemeldungen)
- Client-Media vs Organization-Media
- Storage-Limit Bypass für PDF-Reports
- Automatisches Project-Folder-Mapping

**Verwendung:**

```typescript
import { downloadHandler } from '@/lib/monitoring-report';

const result = await downloadHandler.upload(
  pdfFile,
  'campaign-123',
  'org-456',
  'user-789'
);

console.log('PDF-URL:', result.pdfUrl);
console.log('File-Size:', result.fileSize);
```

## API-Verwendung

Siehe [API-REFERENCE.md](./API-REFERENCE.md) für vollständige API-Dokumentation.

### Haupt-API: monitoringReportService

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

// 1. Nur Daten sammeln (ohne PDF-Generierung)
const reportData = await monitoringReportService.collectReportData(
  'campaign-123',
  'org-456'
);

// 2. HTML generieren
const html = await monitoringReportService.generateReportHTML(reportData);

// 3. PDF generieren und uploaden
const result = await monitoringReportService.generatePDFReport(
  'campaign-123',
  'org-456',
  'user-789'
);

// 4. Analysen-Ordner-Link abrufen
const folderLink = await monitoringReportService.getAnalysenFolderLink(
  'campaign-123',
  'org-456'
);
```

## Performance

### Optimierungen

**Phase 3: Performance-Optimierungen**

- ✅ **useCallback** für Event-Handler (Toast, Auto-Download)
- ✅ **Parallele API-Calls** im Data Collector
- ✅ **Memoization** für Statistik-Berechnungen
- ✅ **React Query Integration** für Caching & State Management
- ✅ **Query Invalidierung** für analysisPDFs-Liste

### Messungen

```
Report-Generierung (Durchschnitt):
- Datensammlung:     ~800ms (parallel)
- Statistik-Berechnung: ~50ms
- HTML-Generierung:  ~20ms
- PDF-Generierung:   ~2.5s (Puppeteer)
- Storage-Upload:    ~1.2s
─────────────────────────────────────
Gesamt:              ~4.6s
```

## Testing

**Phase 4: Testing (85 Tests)**

```bash
# Alle Tests ausführen
npm test monitoring-report

# Test-Coverage
npm run test:coverage
```

### Test-Files

- `data-collector.test.ts` (12 Tests)
- `stats-calculator.test.ts` (18 Tests)
- `timeline-builder.test.ts` (10 Tests)
- `html-generator.test.ts` (8 Tests)
- `pdf-generator.test.ts` (14 Tests)
- `download-handler.test.ts` (11 Tests)
- `monitoring-report-service.test.ts` (10 Tests)
- `useMonitoringReport.test.ts` (2 Tests)

**Coverage: 100%** (Alle Module vollständig getestet)

Siehe [TESTING.md](./TESTING.md) für Details.

## Migration

### Von alter API zu neuer API

**Alte API (vor Refactoring):**

```typescript
// ❌ Deprecated: Monolithischer Service
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

const result = await monitoringReportService.generatePDFReport(
  campaignId,
  organizationId,
  userId
);
```

**Neue API (nach Refactoring):**

```typescript
// ✅ Empfohlen: React Hook
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';

const pdfGenerator = usePDFReportGenerator();
pdfGenerator.mutate({ campaignId, organizationId, userId });
```

```typescript
// ✅ Alternativ: Direkte Module
import {
  reportDataCollector,
  reportStatsCalculator,
  htmlGenerator,
  pdfGenerator
} from '@/lib/monitoring-report';

const rawData = await reportDataCollector.collect(campaignId, organizationId);
const emailStats = reportStatsCalculator.calculateEmailStats(rawData.sends, rawData.clippings);
// ...
```

**Backward Compatibility:** Der alte Service (`monitoringReportService`) ist weiterhin verfügbar und nutzt intern die neuen Module.

Siehe [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) für vollständige Migration-Anleitung.

## Siehe auch

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architektur-Details & Design-Entscheidungen
- [USAGE-GUIDE.md](./USAGE-GUIDE.md) - Schritt-für-Schritt Workflows & Code-Beispiele
- [API-REFERENCE.md](./API-REFERENCE.md) - Vollständige API-Dokumentation
- [MIGRATION-GUIDE.md](./MIGRATION-GUIDE.md) - Migration von alter zu neuer API
- [TESTING.md](./TESTING.md) - Test-Strategie & Coverage
- [CHANGELOG.md](./CHANGELOG.md) - Version-History & Breaking Changes

---

**© 2025 CeleroPress** | Generiert am 16. November 2025
