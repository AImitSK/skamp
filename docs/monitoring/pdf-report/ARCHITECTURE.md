# Architektur: Monitoring Report Modul

> **Letzte Aktualisierung**: 16. November 2025
> **Status**: ✅ Production-Ready

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Architektur-Entscheidungen](#architektur-entscheidungen)
- [Modul-Design](#modul-design)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Performance-Überlegungen](#performance-überlegungen)
- [Security](#security)
- [Skalierbarkeit](#skalierbarkeit)
- [Lessons Learned](#lessons-learned)

## Übersicht

Das Monitoring Report Modul folgt einer **modularen Layered Architecture** mit klarer Trennung von Verantwortlichkeiten. Die Architektur wurde in **Phase 2 (Code-Separation & Modularisierung)** vom monolithischen Service in 10 eigenständige Module refactored.

### Architektur-Prinzipien

1. **Separation of Concerns**: Jedes Modul hat eine eindeutige Verantwortlichkeit
2. **Single Responsibility**: Eine Klasse = Eine Aufgabe
3. **Dependency Injection**: Services werden als Singletons injected
4. **Open/Closed Principle**: Erweiterbar ohne Modifikation (z.B. Custom Templates)
5. **Testability**: Alle Module vollständig testbar (85 Tests, 100% Coverage)

## Architektur-Entscheidungen

### ADR 001: Warum modulare Struktur?

**Context:**
Der ursprüngliche `monitoring-report-service.ts` hatte 867 Zeilen monolithischen Code mit folgenden Problemen:
- Schwer testbar (Mocking von 7+ Dependencies)
- Schwer wartbar (alle Änderungen in einer Datei)
- Keine klare Trennung zwischen Datensammlung, Berechnung, Generierung, Upload

**Decision:**
Aufteilung in 10 modulare Komponenten:
- **3 Core-Module**: data-collector, stats-calculator, timeline-builder
- **2 Template-Module**: styles, report-template
- **2 Generator-Module**: html-generator, pdf-generator
- **1 Delivery-Module**: download-handler
- **1 Types-Modul**: types.ts
- **1 Index-Modul**: index.ts (Re-Exports)

**Consequences:**

✅ **Vorteile:**
- Einfaches Testing (jedes Modul isoliert testbar)
- Bessere Wartbarkeit (Änderungen betreffen nur 1 Modul)
- Wiederverwendbarkeit (Module können einzeln verwendet werden)
- Klarere Verantwortlichkeiten

❌ **Nachteile:**
- Mehr Dateien (10 statt 1)
- Höhere initiale Komplexität (mehr Imports)

**Fazit:** Die Vorteile überwiegen deutlich. Testing-Coverage stieg von 0% auf 100%.

### ADR 002: Singleton Pattern für Services

**Context:**
Jedes Modul benötigt genau eine Instanz (kein State, keine Konfiguration pro Instanz).

**Decision:**
Export von Singleton-Instanzen zusätzlich zur Klasse:

```typescript
export class ReportDataCollector {
  // ...
}

export const reportDataCollector = new ReportDataCollector();
```

**Consequences:**
- Einfache Verwendung: `import { reportDataCollector } from '@/lib/monitoring-report'`
- Konsistenz: Alle Aufrufe nutzen dieselbe Instanz
- Testbarkeit: Klassen können für Mocking instanziiert werden

### ADR 003: React Query Integration

**Context:**
PDF-Generierung ist ein asynchroner Prozess mit folgenden Anforderungen:
- Loading State (Button disabled während Generierung)
- Error Handling (Toast-Benachrichtigungen)
- Success Handling (Auto-Download, Toast)
- Cache-Invalidierung (analysisPDFs-Liste neu laden)

**Decision:**
Verwendung von React Query (`useMutation`) statt useState:

```typescript
export function usePDFReportGenerator() {
  return useMutation<PDFReportResult, Error, PDFReportParams>({
    mutationFn: async (params) => {
      return monitoringReportService.generatePDFReport(...);
    },
    onSuccess: (result) => {
      toastService.success('PDF-Report erfolgreich generiert');
      window.open(result.pdfUrl, '_blank');
      queryClient.invalidateQueries({ queryKey: ['analysisPDFs'] });
    },
    onError: (error) => {
      toastService.error('PDF-Export fehlgeschlagen');
    }
  });
}
```

**Consequences:**
- Automatisches Loading/Error State Management
- Konsistente Error Handling Patterns
- Automatische Query Invalidierung
- Bessere User Experience (Toasts, Auto-Download)

### ADR 004: Smart Folder Management

**Context:**
PDFs müssen in den richtigen Ordner hochgeladen werden:
- Campaign mit Project → Client-Media (Analysen-Ordner)
- Campaign ohne Project → Organization-Media

**Decision:**
`DownloadHandler` mit intelligenter Folder-Suche:

```typescript
async upload(pdfFile, campaignId, organizationId, userId) {
  const campaign = await getDoc(doc(db, 'pr_campaigns', campaignId));

  if (campaign.data()?.projectId && campaign.data()?.clientId) {
    return this.uploadToClientMedia(...); // Analysen-Ordner
  }

  return this.uploadToOrganizationMedia(...); // Fallback
}
```

**Consequences:**
- Automatisches Folder-Mapping (keine manuelle Ordner-Auswahl)
- Fallback-Strategie (Pressemeldungen-Ordner als Alternative)
- Konsistente Datei-Ablage

### ADR 005: Storage-Limit Bypass

**Context:**
PDF-Reports können groß sein (500KB - 5MB) und würden Client-Storage-Limits schnell überschreiten.

**Decision:**
`skipLimitCheck = true` für PDF-Reports:

```typescript
await mediaService.uploadClientMedia(
  pdfFile,
  organizationId,
  clientId,
  targetFolderId,
  undefined,
  { userId },
  true // skipLimitCheck
);
```

**Consequences:**
- PDF-Reports überschreiten keine Client-Storage-Limits
- Analysen bleiben auch bei vielen Reports verfügbar
- Wichtig: Monitoring der Gesamt-Storage-Nutzung

## Modul-Design

### Layer-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                     │
│  - React Components                                          │
│  - React Hooks (usePDFReportGenerator)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                         │
│  - monitoringReportService (Legacy Wrapper)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                   │
│  - Core Module (data-collector, stats-calculator)          │
│  - Generator Module (html-generator, pdf-generator)         │
│  - Delivery Module (download-handler)                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                     │
│  - Firebase Services (prService, clippingService, etc.)     │
│  - External APIs (Puppeteer PDF API)                        │
└─────────────────────────────────────────────────────────────┘
```

### Modul-Abhängigkeiten

```
                   ┌──────────────────────┐
                   │  React Component     │
                   │  (MonitoringReport)  │
                   └──────────┬───────────┘
                              ↓
                   ┌──────────────────────┐
                   │  usePDFReportGen     │
                   │  (React Hook)        │
                   └──────────┬───────────┘
                              ↓
                   ┌──────────────────────┐
                   │  monitoringReport    │
                   │  Service (Legacy)    │
                   └──────────┬───────────┘
                              ↓
       ┌──────────────────────┼──────────────────────┐
       ↓                      ↓                      ↓
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ Data        │       │ Stats       │       │ Timeline    │
│ Collector   │       │ Calculator  │       │ Builder     │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                     │                      │
       └──────────────┬──────┴──────────────────────┘
                      ↓
              ┌───────────────┐
              │ HTML Generator│
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │ PDF Generator │
              └───────┬───────┘
                      ↓
              ┌───────────────┐
              │ Download      │
              │ Handler       │
              └───────────────┘
```

### Keine zirkulären Dependencies

Alle Module folgen einer **top-down Abhängigkeits-Hierarchie**:
- Core-Module haben KEINE Abhängigkeiten zu Generator/Delivery-Modulen
- Generator-Module haben KEINE Abhängigkeiten zu Delivery-Modulen
- Alle Module können einzeln getestet werden

## Data Flow

### Vollständiger PDF-Report Flow

```
1. USER ACTION
   │
   ├─ Button Click: "PDF-Report erstellen"
   │
   ↓
2. REACT HOOK (usePDFReportGenerator)
   │
   ├─ useMutation() triggered
   ├─ Loading State: isPending = true
   │
   ↓
3. SERVICE LAYER (monitoringReportService)
   │
   ├─ generatePDFReport(campaignId, organizationId, userId)
   │
   ↓
4. DATA COLLECTION (ReportDataCollector)
   │
   ├─ collect(campaignId, organizationId)
   ├─ Parallel Firestore Calls:
   │   - prService.getById(campaignId)
   │   - emailCampaignService.getSends(campaignId)
   │   - clippingService.getByCampaignId(campaignId)
   │   - brandingService.getBrandingSettings(organizationId)
   │
   ↓
5. STATS CALCULATION (ReportStatsCalculator)
   │
   ├─ calculateEmailStats(sends, clippings)
   │   → Open-Rate, CTR, Conversion-Rate
   ├─ calculateClippingStats(clippings)
   │   → Reach, Sentiment, Top Outlets
   │
   ↓
6. TIMELINE BUILDING (TimelineBuilder)
   │
   ├─ buildTimeline(clippings)
   │   → Aggregation nach Datum
   │
   ↓
7. HTML GENERATION (HTMLGenerator)
   │
   ├─ generate(reportData)
   ├─ generateReportHTML(reportData)
   │   → Header, KPIs, Tables, Footer
   ├─ generateCSS()
   │   → Styles einbetten
   │
   ↓
8. PDF GENERATION (PDFGenerator)
   │
   ├─ generate(html, request)
   ├─ POST /api/generate-pdf
   │   → Puppeteer API Call
   ├─ Response: { success, pdfBase64, pdfUrl }
   │
   ↓
9. STORAGE UPLOAD (DownloadHandler)
   │
   ├─ upload(pdfFile, campaignId, organizationId, userId)
   ├─ Smart Folder Detection:
   │   - Campaign.projectId vorhanden?
   │   - Client-Media Upload (Analysen-Ordner)
   │   - Fallback: Organization-Media
   ├─ mediaService.uploadClientMedia(...)
   │   → skipLimitCheck = true
   │
   ↓
10. SUCCESS HANDLING (React Hook)
    │
    ├─ onSuccess()
    ├─ toastService.success("PDF-Report erfolgreich generiert")
    ├─ window.open(result.pdfUrl, '_blank')
    ├─ queryClient.invalidateQueries(['analysisPDFs'])
    │
    ↓
11. UI UPDATE
    │
    ├─ Loading State: isPending = false
    ├─ Toast erscheint
    ├─ PDF öffnet sich in neuem Tab
    ├─ analysisPDFs-Liste wird neu geladen
```

## Design Patterns

### 1. Singleton Pattern

**Verwendung:** Alle Service-Module

```typescript
export class ReportDataCollector {
  async collect(campaignId: string, organizationId: string) {
    // ...
  }
}

// Singleton Export
export const reportDataCollector = new ReportDataCollector();
```

**Vorteile:**
- Konsistente Instanz über gesamte App
- Einfache Verwendung ohne `new ReportDataCollector()`
- Testbarkeit durch Klassen-Export beibehalten

### 2. Builder Pattern

**Verwendung:** TimelineBuilder, HTML-Template

```typescript
export class TimelineBuilder {
  buildTimeline(clippings: MediaClipping[]): TimelineData[] {
    // Schritt 1: Gruppierung nach Datum
    const grouped = this.groupByDate(clippings);

    // Schritt 2: Aggregation von Counts & Reach
    const aggregated = this.aggregate(grouped);

    // Schritt 3: Sortierung nach Datum
    return this.sort(aggregated);
  }
}
```

**Vorteile:**
- Klare Schritt-für-Schritt Logik
- Einfach erweiterbar (z.B. buildWeeklyTimeline)
- Testbare Zwischenschritte

### 3. Strategy Pattern

**Verwendung:** DownloadHandler (Client-Media vs Organization-Media)

```typescript
export class DownloadHandler {
  async upload(...) {
    if (campaignData?.projectId && campaignData?.clientId) {
      return this.uploadToClientMedia(...); // Strategy 1
    }

    return this.uploadToOrganizationMedia(...); // Strategy 2
  }

  private async uploadToClientMedia(...) { /* ... */ }
  private async uploadToOrganizationMedia(...) { /* ... */ }
}
```

**Vorteile:**
- Flexible Upload-Strategie basierend auf Campaign-Context
- Einfach erweiterbar (z.B. uploadToProjectMedia)
- Klare Fallback-Logik

### 4. Facade Pattern

**Verwendung:** monitoringReportService (Legacy Wrapper)

```typescript
class MonitoringReportService {
  async generatePDFReport(...) {
    // Facade: Vereinfachte API über komplexe Module
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

**Vorteile:**
- Einfache High-Level API für Standard-Use-Cases
- Backward Compatibility mit alter API
- Module können auch direkt verwendet werden (flexibler)

## Performance-Überlegungen

### 1. Parallele API-Calls (Data Collector)

**Problem:** Sequentielle Firestore-Calls dauern ~3s

**Lösung:** `Promise.all()` für parallele Ausführung

```typescript
const [sends, clippings, branding] = await Promise.all([
  this.collectSends(campaignId, organizationId),
  this.collectClippings(campaignId, organizationId),
  this.collectBranding(organizationId)
]);
```

**Resultat:** ~800ms statt ~3s (3.75x schneller)

### 2. useCallback für Event-Handler (React Hook)

**Problem:** Event-Handler werden bei jedem Render neu erstellt

**Lösung:** `useCallback()` Memoization

```typescript
const handleSuccess = useCallback(
  (result: PDFReportResult, params: PDFReportParams) => {
    toastService.success('PDF-Report erfolgreich generiert');
    window.open(result.pdfUrl, '_blank');
    queryClient.invalidateQueries({ queryKey: ['analysisPDFs'] });
  },
  [queryClient]
);
```

**Resultat:** Weniger Re-Renders, bessere Performance

### 3. React Query Caching

**Problem:** Mehrfache API-Calls für dieselben Daten

**Lösung:** React Query Cache + Invalidierung

```typescript
// Query für analysisPDFs-Liste (mit Caching)
const { data: analysisPDFs } = useQuery({
  queryKey: ['analysisPDFs', campaignId],
  queryFn: () => fetchAnalysisPDFs(campaignId)
});

// Invalidierung nach PDF-Upload
queryClient.invalidateQueries({ queryKey: ['analysisPDFs'] });
```

**Resultat:** Weniger API-Calls, schnellere UI-Updates

### 4. HTML-String Generierung (Template)

**Problem:** Template-Literale mit 1000+ Zeilen HTML sind langsam

**Lösung:** Modulare Template-Funktionen

```typescript
export function generateReportHTML(reportData: MonitoringReportData): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>${generateCSS()}</head>
      <body>
        ${generateHeader(reportData)}
        ${generatePerformanceOverview(reportData)}
        ${generateEmailPerformance(reportData)}
        ${generateSentimentAnalysis(reportData)}
        ${generateFooter(reportData)}
      </body>
    </html>
  `;
}
```

**Resultat:** Bessere Wartbarkeit, ähnliche Performance

## Security

### 1. Multi-Tenancy Isolation

Alle API-Calls verwenden `organizationId` für Daten-Isolation:

```typescript
const sends = await emailCampaignService.getSends(campaignId, {
  organizationId // WICHTIG: Nur Daten der eigenen Organization
});
```

### 2. User-Attribution

PDF-Uploads werden dem User zugeordnet:

```typescript
await mediaService.uploadClientMedia(
  pdfFile,
  organizationId,
  clientId,
  targetFolderId,
  undefined,
  { userId }, // User-Metadata
  true
);
```

### 3. Firebase Security Rules

PDF-Uploads nutzen Firebase Storage Security Rules:

```
match /organizations/{organizationId}/client-media/{allPaths=**} {
  allow write: if isOrganizationMember(organizationId);
  allow read: if isOrganizationMember(organizationId);
}
```

## Skalierbarkeit

### Horizontale Skalierung

- **Stateless Services**: Alle Module sind stateless → einfach skalierbar
- **Puppeteer API**: Externe API kann unabhängig skaliert werden
- **Firebase Storage**: Auto-Scaling durch Google Cloud

### Vertikale Skalierung

- **Große Clipping-Mengen**: Timeline-Builder aggregiert effizient (O(n))
- **Große Sends-Mengen**: Stats-Calculator nutzt Filter (keine Loops in Loops)
- **Große HTML-Dokumente**: Puppeteer API hat keine Limits

### Bottlenecks

1. **Puppeteer API**: ~2.5s pro PDF (nicht parallelisierbar)
2. **Firebase Storage Upload**: ~1.2s (abhängig von PDF-Größe)
3. **Firestore Queries**: ~800ms (bereits parallelisiert)

**Lösungen:**
- Puppeteer API: CDN-Caching für wiederholte Reports
- Storage Upload: Compression vor Upload
- Firestore: Indexed Queries (bereits implementiert)

## Lessons Learned

### Was gut funktioniert hat

1. **Modulare Struktur**: Tests wurden trivial einfach (100% Coverage)
2. **React Query Integration**: State Management "out of the box"
3. **Singleton Pattern**: Einfache Verwendung ohne Boilerplate
4. **Smart Folder Management**: User muss keinen Ordner auswählen

### Was verbessert werden könnte

1. **PDF-Caching**: Wiederholte Reports für dieselbe Campaign → Cache nutzen
2. **Custom Templates**: Mehr Flexibilität für Branding (z.B. Custom CSS)
3. **Export-Formate**: Zusätzlich zu PDF auch DOCX, Excel, CSV
4. **Timeline-Charts**: Visuelle Charts statt nur Tabellen

### Verbesserungsvorschläge für Zukunft

**Kurzfristig (1-2 Sprints):**
- PDF-Caching (Redis) für wiederholte Reports
- Custom CSS-Support via Branding-Settings
- Email-Versand von Reports (geplante Reports)

**Mittelfristig (3-6 Monate):**
- Chart.js Integration für Timeline-Visualisierung
- DOCX-Export zusätzlich zu PDF
- Automatische Report-Generierung (Cron-Jobs)

**Langfristig (6-12 Monate):**
- AI-generierte Report-Insights (OpenAI API)
- White-Label Support (vollständiges Custom Branding)
- Multi-Language Support (EN, DE, FR)

---

**© 2025 CeleroPress** | Architektur-Dokumentation
