# API Reference: Monitoring Report Modul

> **Letzte Aktualisierung**: 16. November 2025
> **Version**: 2.0.0

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Types](#types)
- [Core Module](#core-module)
- [Template Module](#template-module)
- [Generator Module](#generator-module)
- [Delivery Module](#delivery-module)
- [React Hooks](#react-hooks)
- [Legacy Service](#legacy-service)

## Übersicht

Diese API-Referenz dokumentiert alle öffentlichen APIs des Monitoring Report Moduls. Alle Beispiele sind vollständig und können direkt verwendet werden.

## Types

### ReportConfig

Konfiguration für Report-Generierung.

```typescript
interface ReportConfig {
  format: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includeCharts: boolean;
  includeClippingDetails: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    companyName?: string;
  };
}
```

**Beispiel:**

```typescript
const config: ReportConfig = {
  format: 'A4',
  orientation: 'portrait',
  includeCharts: true,
  includeClippingDetails: true,
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  },
  branding: {
    logo: 'https://example.com/logo.png',
    primaryColor: '#005fab',
    companyName: 'Acme Corp'
  }
};
```

### EmailStats

Email-Performance-Statistiken.

```typescript
interface EmailStats {
  totalSent: number;       // Gesamt versendete Emails
  delivered: number;       // Zugestellte Emails
  opened: number;          // Geöffnete Emails
  clicked: number;         // Geklickte Emails
  bounced: number;         // Bounced Emails
  openRate: number;        // Öffnungsrate in % (0-100)
  clickRate: number;       // Click-Rate in % (0-100)
  ctr: number;             // Click-Through-Rate in % (0-100)
  conversionRate: number;  // Conversion-Rate (Email → Clipping) in % (0-100)
}
```

**Beispiel:**

```typescript
const emailStats: EmailStats = {
  totalSent: 100,
  delivered: 95,
  opened: 50,
  clicked: 20,
  bounced: 5,
  openRate: 50,      // 50%
  clickRate: 40,     // 40% der Öffnungen
  ctr: 20,           // 20% der gesendeten
  conversionRate: 10 // 10% der Öffnungen führten zu Clippings
};
```

### ClippingStats

Clipping-Performance-Statistiken.

```typescript
interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  totalAVE: number;
  avgReach: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topOutlets: OutletStats[];
  outletTypeDistribution: OutletTypeDistribution[];
}
```

**Beispiel:**

```typescript
const clippingStats: ClippingStats = {
  totalClippings: 25,
  totalReach: 500000,
  totalAVE: 125000,
  avgReach: 20000,
  sentimentDistribution: {
    positive: 18,
    neutral: 5,
    negative: 2
  },
  topOutlets: [
    { name: 'Süddeutsche Zeitung', reach: 150000, clippingsCount: 3 },
    { name: 'FAZ', reach: 120000, clippingsCount: 2 }
  ],
  outletTypeDistribution: [
    { type: 'Print', count: 15, reach: 300000, percentage: 60 },
    { type: 'Online', count: 10, reach: 200000, percentage: 40 }
  ]
};
```

### OutletStats

Statistiken pro Medium.

```typescript
interface OutletStats {
  name: string;
  reach: number;
  clippingsCount: number;
}
```

### OutletTypeDistribution

Medientyp-Verteilung.

```typescript
interface OutletTypeDistribution {
  type: string;        // "Print", "Online", "TV", "Radio", etc.
  count: number;       // Anzahl Clippings
  reach: number;       // Gesamt-Reichweite
  percentage: number;  // Prozent-Anteil (0-100)
}
```

### TimelineData

Timeline-Datenpunkt.

```typescript
interface TimelineData {
  date: string;      // "15. Jan. 2024"
  clippings: number; // Anzahl Clippings an diesem Tag
  reach: number;     // Gesamt-Reichweite an diesem Tag
}
```

**Beispiel:**

```typescript
const timeline: TimelineData[] = [
  { date: '15. Jan. 2024', clippings: 3, reach: 30000 },
  { date: '16. Jan. 2024', clippings: 5, reach: 50000 },
  { date: '17. Jan. 2024', clippings: 2, reach: 20000 }
];
```

### MonitoringReportData

Vollständige Report-Daten.

```typescript
interface MonitoringReportData {
  campaignId: string;
  organizationId: string;
  reportTitle: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  branding: BrandingSettings | null;
  emailStats: EmailStats;
  clippingStats: ClippingStats;
  timeline: TimelineData[];
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
}
```

**Beispiel:**

```typescript
const reportData: MonitoringReportData = {
  campaignId: 'campaign-123',
  organizationId: 'org-456',
  reportTitle: 'PR-Kampagne Q4 2024',
  reportPeriod: {
    start: new Date('2024-10-01'),
    end: new Date('2024-12-31')
  },
  branding: {
    logoUrl: 'https://example.com/logo.png',
    companyName: 'Acme Corp',
    primaryColor: '#005fab'
  },
  emailStats: { /* ... */ },
  clippingStats: { /* ... */ },
  timeline: [ /* ... */ ],
  clippings: [ /* ... */ ],
  sends: [ /* ... */ ]
};
```

### ReportResult

PDF-Report-Ergebnis.

```typescript
interface ReportResult {
  pdfUrl: string;
  fileSize?: number;
  generatedAt: Date;
}
```

## Core Module

### ReportDataCollector

Sammelt alle benötigten Rohdaten aus Firestore.

#### `collect(campaignId: string, organizationId: string): Promise<RawReportData>`

Sammelt Campaign-Daten, Sends, Clippings und Branding.

**Parameter:**
- `campaignId` (string): Campaign ID
- `organizationId` (string): Organization ID

**Returns:** `Promise<RawReportData>`

**Throws:** Error wenn Campaign nicht gefunden

**Beispiel:**

```typescript
import { reportDataCollector } from '@/lib/monitoring-report';

try {
  const rawData = await reportDataCollector.collect(
    'campaign-123',
    'org-456'
  );

  console.log('Campaign:', rawData.campaignTitle);
  console.log('Sends:', rawData.sends.length);
  console.log('Clippings:', rawData.clippings.length);
  console.log('Branding:', rawData.branding?.companyName);
} catch (error) {
  console.error('Kampagne nicht gefunden:', error);
}
```

**Performance:**
- Parallele API-Calls via `Promise.all()`
- Durchschnitt: ~800ms

**Error-Cases:**
- Campaign nicht gefunden → Error
- Sends nicht verfügbar → leeres Array
- Clippings nicht verfügbar → leeres Array
- Branding nicht verfügbar → null

---

### ReportStatsCalculator

Berechnet alle Statistiken aus Rohdaten.

#### `calculateEmailStats(sends: EmailCampaignSend[], clippings: MediaClipping[]): EmailStats`

Berechnet Email-Performance-Statistiken.

**Parameter:**
- `sends` (EmailCampaignSend[]): Email-Sends
- `clippings` (MediaClipping[]): Media-Clippings (für Conversion-Rate)

**Returns:** `EmailStats`

**Beispiel:**

```typescript
import { reportStatsCalculator } from '@/lib/monitoring-report';

const emailStats = reportStatsCalculator.calculateEmailStats(
  sends,
  clippings
);

console.log(`Open-Rate: ${emailStats.openRate}%`);
console.log(`CTR: ${emailStats.ctr}%`);
console.log(`Conversion-Rate: ${emailStats.conversionRate}%`);
```

**Berechnungen:**
- `openRate = (opened / totalSent) * 100`
- `clickRate = (clicked / opened) * 100`
- `ctr = (clicked / totalSent) * 100`
- `conversionRate = (withClippings / opened) * 100`

**Performance:** O(n), ~10ms für 1000 Sends

---

#### `calculateClippingStats(clippings: MediaClipping[]): ClippingStats`

Berechnet Clipping-Performance-Statistiken.

**Parameter:**
- `clippings` (MediaClipping[]): Media-Clippings

**Returns:** `ClippingStats`

**Beispiel:**

```typescript
import { reportStatsCalculator } from '@/lib/monitoring-report';

const clippingStats = reportStatsCalculator.calculateClippingStats(
  clippings
);

console.log(`Gesamt-Reichweite: ${clippingStats.totalReach}`);
console.log(`AVE-Wert: ${clippingStats.totalAVE}€`);
console.log(`Positiv: ${clippingStats.sentimentDistribution.positive}`);
console.log(`Top Outlet: ${clippingStats.topOutlets[0].name}`);
```

**Berechnungen:**
- `totalReach = sum(clipping.reach)`
- `totalAVE = sum(clipping.ave)`
- `avgReach = totalReach / totalClippings`
- `sentimentDistribution = count by sentiment`
- `topOutlets = top 5 by reach`
- `outletTypeDistribution = count by outletType`

**Performance:** O(n), ~20ms für 1000 Clippings

---

### TimelineBuilder

Aggregiert Clippings nach Datum für Timeline-Visualisierung.

#### `buildTimeline(clippings: MediaClipping[]): TimelineData[]`

Baut tägliche Timeline aus Clippings.

**Parameter:**
- `clippings` (MediaClipping[]): Media-Clippings

**Returns:** `TimelineData[]` (sortiert nach Datum)

**Beispiel:**

```typescript
import { timelineBuilder } from '@/lib/monitoring-report';

const timeline = timelineBuilder.buildTimeline(clippings);

timeline.forEach(point => {
  console.log(`${point.date}: ${point.clippings} Clippings, ${point.reach} Reach`);
});

// Output:
// 15. Jan. 2024: 3 Clippings, 30000 Reach
// 16. Jan. 2024: 5 Clippings, 50000 Reach
// 17. Jan. 2024: 2 Clippings, 20000 Reach
```

**Gruppierung:**
- Nach Veröffentlichungsdatum (publishedAt)
- Format: "dd. MMM. yyyy" (z.B. "15. Jan. 2024")

**Performance:** O(n log n), ~15ms für 1000 Clippings

---

#### `buildWeeklyTimeline(clippings: MediaClipping[]): TimelineData[]`

Baut wöchentliche Timeline aus Clippings (für lange Zeiträume).

**Parameter:**
- `clippings` (MediaClipping[]): Media-Clippings

**Returns:** `TimelineData[]` (sortiert nach Wochenanfang)

**Beispiel:**

```typescript
import { timelineBuilder } from '@/lib/monitoring-report';

const weeklyTimeline = timelineBuilder.buildWeeklyTimeline(clippings);

weeklyTimeline.forEach(point => {
  console.log(`Woche ${point.date}: ${point.clippings} Clippings`);
});

// Output:
// Woche 15. Jan. 2024: 12 Clippings
// Woche 22. Jan. 2024: 8 Clippings
```

**Gruppierung:**
- Nach Wochenanfang (Montag)
- Ideal für Reports über mehrere Monate

---

## Template Module

### generateCSS()

Generiert CSS-Styles für PDF-Reports.

**Signature:**

```typescript
function generateCSS(): string
```

**Returns:** CSS als String

**Beispiel:**

```typescript
import { generateCSS } from '@/lib/monitoring-report';

const css = generateCSS();

console.log(css.length); // ~2000 Zeichen

// CSS in HTML einbetten
const html = `
  <style>
    ${css}
  </style>
`;
```

**Features:**
- CSS-Variablen für Farben (Branding-Support)
- Typography (Inter Font)
- KPI-Grid Layout (responsive)
- Table-Styles
- Sentiment-Badges
- Print-Optimierungen

**Performance:** ~1ms

---

### generateReportHTML()

Generiert vollständiges HTML aus Report-Daten.

**Signature:**

```typescript
function generateReportHTML(reportData: MonitoringReportData): string
```

**Parameter:**
- `reportData` (MonitoringReportData): Report-Daten

**Returns:** Vollständiges HTML als String

**Beispiel:**

```typescript
import { generateReportHTML } from '@/lib/monitoring-report';

const html = generateReportHTML(reportData);

console.log(html.length); // ~20.000 - 50.000 Zeichen

// HTML in Datei speichern (für Debugging)
fs.writeFileSync('report.html', html);
```

**Enthaltene Sections:**
1. Header mit Branding (Logo, Company-Name)
2. Performance-Übersicht (KPIs)
3. Email-Performance
4. Sentiment-Analyse
5. Medientyp-Verteilung
6. Top 5 Medien
7. Detaillierte Clipping-Liste
8. Footer mit Branding

**Performance:** ~15ms

---

## Generator Module

### HTMLGenerator

Service-Wrapper für HTML-Generierung.

#### `generate(reportData: MonitoringReportData): Promise<string>`

Generiert HTML aus Report-Daten.

**Parameter:**
- `reportData` (MonitoringReportData): Report-Daten

**Returns:** `Promise<string>` - Vollständiges HTML

**Beispiel:**

```typescript
import { htmlGenerator } from '@/lib/monitoring-report';

const html = await htmlGenerator.generate(reportData);

console.log('HTML generiert:', html.length, 'Zeichen');
```

**Performance:** ~15ms

---

#### `generateWithTemplate(reportData: MonitoringReportData, templateFn: (data: MonitoringReportData) => string): Promise<string>`

Generiert HTML mit Custom-Template.

**Parameter:**
- `reportData` (MonitoringReportData): Report-Daten
- `templateFn` (Function): Custom Template-Funktion

**Returns:** `Promise<string>` - Vollständiges HTML

**Beispiel:**

```typescript
import { htmlGenerator } from '@/lib/monitoring-report';
import type { MonitoringReportData } from '@/lib/monitoring-report/types';

function myCustomTemplate(data: MonitoringReportData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial; padding: 40px; }
          .kpi { font-size: 32px; color: #005fab; }
        </style>
      </head>
      <body>
        <h1>${data.reportTitle}</h1>
        <div class="kpi">Open-Rate: ${data.emailStats.openRate}%</div>
        <div class="kpi">Clippings: ${data.clippingStats.totalClippings}</div>
      </body>
    </html>
  `;
}

const html = await htmlGenerator.generateWithTemplate(
  reportData,
  myCustomTemplate
);
```

**Use-Cases:**
- White-Label Reports
- Custom Branding
- A/B-Testing verschiedener Layouts

---

### PDFGenerator

Generiert PDF aus HTML via Puppeteer API.

#### Constructor

```typescript
new PDFGenerator(apiEndpoint?: string)
```

**Parameter:**
- `apiEndpoint` (string, optional): API-Endpoint (default: `/api/generate-pdf`)

**Beispiel:**

```typescript
import { PDFGenerator } from '@/lib/monitoring-report';

// Standard-Endpoint
const generator = new PDFGenerator();

// Custom-Endpoint
const customGenerator = new PDFGenerator('/api/custom-pdf');
```

---

#### `generate(html: string, request: PDFGenerationRequest): Promise<PDFGenerationResult>`

Generiert PDF aus HTML.

**Parameter:**
- `html` (string): HTML-String
- `request` (PDFGenerationRequest): PDF-Generation-Request

**PDFGenerationRequest:**

```typescript
interface PDFGenerationRequest {
  campaignId: string;
  organizationId: string;
  userId: string;
  html: string;
  title: string;
  fileName: string;
  options?: PDFGenerationOptions;
}

interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  printBackground?: boolean;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}
```

**Returns:** `Promise<PDFGenerationResult>`

```typescript
interface PDFGenerationResult {
  success: boolean;
  needsClientUpload?: boolean;
  pdfBase64?: string;
  pdfUrl?: string;
  error?: string;
}
```

**Beispiel:**

```typescript
import { pdfGenerator } from '@/lib/monitoring-report';

const result = await pdfGenerator.generate(html, {
  campaignId: 'campaign-123',
  organizationId: 'org-456',
  userId: 'user-789',
  html,
  title: 'Monitoring Report: Q4 Campaign',
  fileName: 'Monitoring_Report_campaign-123_1234567890.pdf',
  options: {
    format: 'A4',
    orientation: 'portrait',
    printBackground: true,
    waitUntil: 'networkidle0'
  }
});

if (result.success) {
  console.log('PDF-URL:', result.pdfUrl);
}
```

**Performance:** ~2.5s (Puppeteer-Rendering)

**Error-Cases:**
- API-Fehler → Error mit Details
- PDF-Generation fehlgeschlagen → result.success = false

---

#### `base64ToFile(base64: string, fileName: string): File`

Konvertiert Base64-encoded PDF zu File.

**Parameter:**
- `base64` (string): Base64-encoded PDF
- `fileName` (string): Dateiname

**Returns:** `File`

**Beispiel:**

```typescript
import { pdfGenerator } from '@/lib/monitoring-report';

const pdfFile = pdfGenerator.base64ToFile(
  result.pdfBase64,
  'report.pdf'
);

console.log('File-Size:', pdfFile.size, 'bytes');
console.log('File-Type:', pdfFile.type); // "application/pdf"
```

**Use-Case:**
- Client-Upload zu Firebase Storage
- Download im Browser

---

#### `generateFileName(campaignId: string, prefix?: string): string`

Generiert Dateinamen für PDF.

**Parameter:**
- `campaignId` (string): Campaign ID
- `prefix` (string, optional): Dateiname-Prefix (default: "Monitoring_Report")

**Returns:** `string` - Dateiname mit Timestamp

**Beispiel:**

```typescript
import { pdfGenerator } from '@/lib/monitoring-report';

const fileName = pdfGenerator.generateFileName('campaign-123');

console.log(fileName);
// "Monitoring_Report_campaign-123_1234567890.pdf"

const customFileName = pdfGenerator.generateFileName('campaign-123', 'Custom_Report');

console.log(customFileName);
// "Custom_Report_campaign-123_1234567890.pdf"
```

---

## Delivery Module

### DownloadHandler

Verantwortlich für Firebase Storage Upload.

#### `upload(pdfFile: File, campaignId: string, organizationId: string, userId: string): Promise<{ pdfUrl: string; fileSize: number }>`

Uploaded PDF zu Firebase Storage.

**Parameter:**
- `pdfFile` (File): PDF-File
- `campaignId` (string): Campaign ID
- `organizationId` (string): Organization ID
- `userId` (string): User ID

**Returns:** `Promise<{ pdfUrl: string; fileSize: number }>`

**Beispiel:**

```typescript
import { downloadHandler } from '@/lib/monitoring-report';

const result = await downloadHandler.upload(
  pdfFile,
  'campaign-123',
  'org-456',
  'user-789'
);

console.log('PDF-URL:', result.pdfUrl);
console.log('File-Size:', result.fileSize, 'bytes');

// Auto-Download
window.open(result.pdfUrl, '_blank');
```

**Smart Folder Management:**

1. **Campaign mit Project + Client:**
   - Upload zu Client-Media
   - Ziel-Ordner: `Project-Ordner → Analysen`
   - Fallback: `Project-Ordner → Pressemeldungen`

2. **Campaign ohne Project:**
   - Upload zu Organization-Media
   - Ziel-Ordner: Root

**Storage-Limit Bypass:**
- `skipLimitCheck = true` für PDF-Reports
- PDF-Reports überschreiten keine Client-Storage-Limits

**Performance:** ~1.2s (abhängig von PDF-Größe)

**Error-Cases:**
- Campaign nicht gefunden → Error
- Project-Ordner nicht gefunden → Fallback zu Organization-Media
- Upload fehlgeschlagen → Error

---

## React Hooks

### usePDFReportGenerator()

React Query Hook für PDF-Report Generierung.

**Signature:**

```typescript
function usePDFReportGenerator(): UseMutationResult<
  PDFReportResult,
  Error,
  PDFReportParams
>

interface PDFReportParams {
  campaignId: string;
  organizationId: string;
  userId: string;
}

interface PDFReportResult {
  pdfUrl: string;
}
```

**Returns:** React Query Mutation Result

**Beispiel:**

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
      {pdfGenerator.isPending ? 'Generiere PDF...' : 'PDF-Report'}
    </button>
  );
}
```

**Features:**
- ✅ Automatische Toast-Benachrichtigungen (Success/Error)
- ✅ Auto-Download im Browser (neues Tab)
- ✅ Query Invalidierung (analysisPDFs-Liste)
- ✅ Loading State via `isPending`
- ✅ Error State via `isError`

**Properties:**

```typescript
pdfGenerator.mutate({ campaignId, organizationId, userId })
pdfGenerator.isPending // boolean
pdfGenerator.isError // boolean
pdfGenerator.error // Error | null
pdfGenerator.data // PDFReportResult | undefined
```

**Custom Callbacks:**

```typescript
pdfGenerator.mutate(
  { campaignId, organizationId, userId },
  {
    onSuccess: (result) => {
      console.log('PDF generiert:', result.pdfUrl);
    },
    onError: (error) => {
      console.error('Fehler:', error);
    }
  }
);
```

---

## Legacy Service

### monitoringReportService

Legacy-Service für Backward Compatibility.

#### `collectReportData(campaignId: string, organizationId: string): Promise<MonitoringReportData>`

Sammelt und aggregiert alle Report-Daten.

**Parameter:**
- `campaignId` (string): Campaign ID
- `organizationId` (string): Organization ID

**Returns:** `Promise<MonitoringReportData>`

**Beispiel:**

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

const reportData = await monitoringReportService.collectReportData(
  'campaign-123',
  'org-456'
);

console.log('Open-Rate:', reportData.emailStats.openRate);
console.log('Reichweite:', reportData.clippingStats.totalReach);
```

**Workflow:**
1. Rohdaten sammeln (ReportDataCollector)
2. Email-Stats berechnen (ReportStatsCalculator)
3. Clipping-Stats berechnen (ReportStatsCalculator)
4. Timeline aufbauen (TimelineBuilder)
5. Daten zusammenführen

---

#### `generateReportHTML(reportData: MonitoringReportData): Promise<string>`

Generiert HTML aus Report-Daten.

**Parameter:**
- `reportData` (MonitoringReportData): Report-Daten

**Returns:** `Promise<string>` - Vollständiges HTML

**Beispiel:**

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

const html = await monitoringReportService.generateReportHTML(reportData);

console.log('HTML generiert:', html.length, 'Zeichen');
```

---

#### `generatePDFReport(campaignId: string, organizationId: string, userId: string): Promise<{ pdfUrl: string; fileSize: number }>`

Generiert PDF-Report und uploaded zu Firebase Storage.

**Parameter:**
- `campaignId` (string): Campaign ID
- `organizationId` (string): Organization ID
- `userId` (string): User ID

**Returns:** `Promise<{ pdfUrl: string; fileSize: number }>`

**Beispiel:**

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

try {
  const result = await monitoringReportService.generatePDFReport(
    'campaign-123',
    'org-456',
    'user-789'
  );

  console.log('PDF-URL:', result.pdfUrl);
  console.log('File-Size:', result.fileSize);

  window.open(result.pdfUrl, '_blank');
} catch (error) {
  console.error('PDF-Generierung fehlgeschlagen:', error);
}
```

**Workflow:**
1. Report-Daten sammeln
2. HTML generieren
3. PDF via Puppeteer API generieren
4. Upload zu Firebase Storage (Client-Media oder Organization-Media)

**Performance:** ~4.6s (Gesamt)

---

#### `getAnalysenFolderLink(campaignId: string, organizationId: string): Promise<string | null>`

Generiert Link zum Analysen-Ordner eines Projects.

**Parameter:**
- `campaignId` (string): Campaign ID
- `organizationId` (string): Organization ID

**Returns:** `Promise<string | null>` - Link zum Analysen-Ordner oder null

**Beispiel:**

```typescript
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';

const folderLink = await monitoringReportService.getAnalysenFolderLink(
  'campaign-123',
  'org-456'
);

if (folderLink) {
  console.log('Analysen-Ordner:', folderLink);
  // "/dashboard/projects/project-123?tab=daten&folder=folder-analysen"
} else {
  console.log('Campaign hat kein Project');
}
```

**Use-Case:**
- Navigation zum Analysen-Ordner nach PDF-Upload
- Anzeige von "Zum Analysen-Ordner"-Link

---

**© 2025 CeleroPress** | API Reference
