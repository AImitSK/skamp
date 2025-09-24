# PR-Monitoring Phase 2: Analytics & Reporting
## Implementierungsplan

### Übersicht
Phase 2 fokussiert sich auf Analytics & Reporting für das PR-Monitoring-System. Ziel ist es, aussagekräftige Dashboards und Export-Funktionen zu schaffen, die mit dem bestehenden Clipping-Archiv unter Monitoring harmonieren.

---

## 🎯 Anforderungen aus User-Feedback

### 1. Dashboard mit KPIs
- **Requirement**: "Sollte mit unseren Clipping Archiv abgeglichen werden unter Monitoring"
- **Ziel**: Erweitere bestehende Monitoring-Komponenten um aussagekräftige Visualisierungen
- **Integration**: Nutze bereits vorhandene Clipping-Daten aus `ClippingArchive.tsx`

### 2. Export-Funktion
- **Requirement**: "Schau dir dafür das Schreiben unserer Versionierungs PDFs an das beim Speichern unserer Kampagnen gemacht wird"
- **Wichtig**: Kein Firebase Admin SDK verfügbar - Firebase hat Eigenheiten
- **Analyse-Basis**:
  - `src/app/api/generate-pdf/route.ts` - Puppeteer-basierte PDF-Generierung
  - `src/lib/firebase/pdf-versions-service.ts` - PDF-Versionierungs-Logic

### 3. Ausgeschlossene Punkte
- ~~Punkt 3~~ (nicht spezifiziert, wird weggelassen)
- ~~Punkt 4~~ (nicht spezifiziert, wird weggelassen)

---

## 📊 Task 1: Dashboard mit KPIs

### Analyse: Bestehende Architektur
**Komponenten-Struktur:**
- `src/components/monitoring/ClippingArchive.tsx` - Clipping-Tabelle mit Summary-KPIs
- `src/components/monitoring/EmailPerformanceStats.tsx` - E-Mail Performance Charts
- `src/components/monitoring/RecipientTrackingList.tsx` - Empfänger-Tracking

**Bereits vorhandene KPIs in ClippingArchive:**
```typescript
const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);
const sentimentCounts = {
  positive: clippings.filter(c => c.sentiment === 'positive').length,
  neutral: clippings.filter(c => c.sentiment === 'neutral').length,
  negative: clippings.filter(c => c.sentiment === 'negative').length
};
```

### Implementierung: Erweiterter KPI-Dashboard

#### 1.1 Neue Komponente: `MonitoringDashboard.tsx`
**Location**: `src/components/monitoring/MonitoringDashboard.tsx`

**Features**:
- **Zeitreihen-Analyse**: Veröffentlichungen über Zeit (Line Chart)
- **Medium-Verteilung**: Outlet-Types Distribution (Pie Chart)
- **Performance-Vergleich**: Kampagnen-Vergleich (Bar Chart)
- **Trend-Indikatoren**: Wachstum/Rückgang der Kennzahlen

**Datenquellen Integration**:
```typescript
interface DashboardProps {
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
  campaigns: PRCampaign[];
}
```

**Chart-Library**: Bereits vorhanden - Recharts (genutzt in `EmailPerformanceStats.tsx`)

**KPIs**:
1. **Reach-Entwicklung**: Timeline der Gesamtreichweite
2. **AVE-Entwicklung**: Timeline des AVE-Werts
3. **Sentiment-Trend**: Positive/Negative Ratio über Zeit
4. **Top-Outlets**: Medien mit höchster Reichweite
5. **Conversion-Rate**: Email Opens → Clippings Ratio

#### 1.2 Integration in bestehende Monitoring-Seiten
**Files zu aktualisieren**:
- `src/app/dashboard/pr-tools/monitoring/[campaignId]/page.tsx` - Einzelne Kampagne
- `src/components/projects/ProjectMonitoringTab.tsx` - Projekt-Monitoring

**Layout-Struktur**:
```
┌─────────────────────────────────────┐
│  📈 KPI-Zusammenfassung (Cards)     │
├─────────────────────────────────────┤
│  📊 Charts & Visualisierungen       │
│  - Zeitreihen                       │
│  - Verteilungen                     │
│  - Vergleiche                       │
├─────────────────────────────────────┤
│  📋 Bestehende Tabellen             │
│  - ClippingArchive                  │
│  - RecipientTrackingList            │
└─────────────────────────────────────┘
```

---

## 📄 Task 2: Export-Funktion

### Analyse: PDF-Versionierungs-System

#### Bestehende Architektur
**API Route**: `src/app/api/generate-pdf/route.ts`
- **Engine**: Puppeteer (nicht jsPDF)
- **Mode**: Serverless (@sparticuz/chromium) + Local Development
- **Process**:
  1. Template-HTML generieren (Client-Side oder Server-Side)
  2. POST zu `/api/generate-pdf` mit HTML + Metadaten
  3. Puppeteer rendert PDF
  4. PDF als Base64 zurück
  5. Client uploaded zu Firebase Storage

**Service**: `src/lib/firebase/pdf-versions-service.ts`
- **Funktion**: `generateRealPDF()` - Orchestriert PDF-Generation
- **Upload-Flow**:
  1. HTML-Template generieren (mit `pdfTemplateService`)
  2. API-Request zu `/api/generate-pdf`
  3. Base64 PDF zu Blob konvertieren
  4. Upload via `mediaService.uploadClientMedia()` zu Projekt-spezifischem Ordner

**Kritische Erkenntnisse (Firebase-Eigenheiten)**:
```typescript
// ❌ PROBLEM: undefined-Werte verursachen Firestore-Fehler
const cleanedData = this.removeUndefinedValues(pdfVersionData);

// ✅ LÖSUNG: Alle undefined-Werte rekursiv entfernen
private removeUndefinedValues(obj: any): any {
  // ... rekursive Bereinigung
}

// ❌ PROBLEM: Firebase Storage Auth in API Route
// ✅ LÖSUNG: Client-Side Upload statt Server-Side
if (result.needsClientUpload && result.pdfBase64) {
  const pdfBlob = /* Base64 → Blob */;
  const pdfFile = new File([pdfBlob], fileName);
  await mediaService.uploadClientMedia(pdfFile, ...);
}
```

### Implementierung: Monitoring-Report Export

#### 2.1 PDF-Report Generator Service
**Location**: `src/lib/firebase/monitoring-report-service.ts`

**Interface**:
```typescript
interface MonitoringReportData {
  campaignId: string;
  organizationId: string;

  // Report-Metadaten
  reportTitle: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };

  // Daten-Aggregation
  emailStats: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
  };

  clippingStats: {
    totalClippings: number;
    totalReach: number;
    totalAVE: number;
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
  };

  // Zeitreihen
  timeline: Array<{
    date: Date;
    clippings: number;
    reach: number;
  }>;
}

class MonitoringReportService {
  async generateReport(
    campaignId: string,
    organizationId: string,
    userId: string
  ): Promise<string> {
    // 1. Daten sammeln
    const reportData = await this.collectReportData(campaignId, organizationId);

    // 2. HTML-Template generieren
    const reportHtml = await this.generateReportHTML(reportData);

    // 3. PDF generieren (analog zu pdf-versions-service)
    const { pdfUrl } = await this.generatePDF(reportHtml, reportData, organizationId, userId);

    return pdfUrl;
  }

  private async generatePDF(
    html: string,
    reportData: MonitoringReportData,
    organizationId: string,
    userId: string
  ): Promise<{ pdfUrl: string; fileSize: number }> {
    // Analog zu pdf-versions-service.generateRealPDF()

    const apiRequest = {
      campaignId: reportData.campaignId,
      organizationId,
      mainContent: html, // Fertiges Report-HTML
      clientName: reportData.reportTitle,
      userId,
      html, // Fertiges Template
      fileName: `Monitoring_Report_${reportData.campaignId}_${Date.now()}.pdf`,
      options: {
        format: 'A4' as const,
        orientation: 'portrait' as const,
        printBackground: true,
        waitUntil: 'networkidle0' as const
      }
    };

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });

    const result = await response.json();

    if (result.needsClientUpload && result.pdfBase64) {
      // Base64 → Blob → Upload (wie in pdf-versions-service)
      const pdfBlob = this.base64ToBlob(result.pdfBase64);
      const pdfFile = new File([pdfBlob], apiRequest.fileName);

      // Upload zu Monitoring-Reports Ordner
      const uploadResult = await this.uploadToMonitoringFolder(
        pdfFile,
        organizationId,
        reportData.campaignId,
        userId
      );

      return {
        pdfUrl: uploadResult.downloadUrl,
        fileSize: pdfFile.size
      };
    }

    return {
      pdfUrl: result.pdfUrl,
      fileSize: result.fileSize
    };
  }
}
```

#### 2.2 Excel-Export Service
**Location**: `src/lib/exports/monitoring-excel-export.ts`

**Library**: SheetJS (xlsx) - bereits in Package.json falls vorhanden, sonst installieren

**Interface**:
```typescript
class MonitoringExcelExport {
  async generateExcel(
    campaignId: string,
    organizationId: string
  ): Promise<Blob> {
    const data = await this.collectData(campaignId, organizationId);

    const workbook = XLSX.utils.book_new();

    // Sheet 1: E-Mail Performance
    const emailSheet = XLSX.utils.json_to_sheet(data.sends);
    XLSX.utils.book_append_sheet(workbook, emailSheet, 'E-Mail Performance');

    // Sheet 2: Clippings
    const clippingsSheet = XLSX.utils.json_to_sheet(data.clippings);
    XLSX.utils.book_append_sheet(workbook, clippingsSheet, 'Veröffentlichungen');

    // Sheet 3: Summary
    const summarySheet = XLSX.utils.json_to_sheet([data.summary]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Zusammenfassung');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  downloadExcel(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
```

#### 2.3 UI-Integration: Export-Buttons
**Files zu aktualisieren**:
- `src/app/dashboard/pr-tools/monitoring/[campaignId]/page.tsx`
- `src/components/projects/ProjectMonitoringTab.tsx`

**UI-Komponente**:
```typescript
<div className="flex gap-2">
  <Button
    onClick={handlePDFExport}
    color="secondary"
  >
    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
    PDF-Report
  </Button>

  <Button
    onClick={handleExcelExport}
    color="secondary"
  >
    <TableCellsIcon className="h-4 w-4 mr-2" />
    Excel-Export
  </Button>
</div>
```

---

## 🗂️ Report-Template Design

### PDF-Report HTML-Struktur
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Brand Colors */
    :root {
      --primary: #005fab;
      --secondary: #DEDC00;
    }

    /* Layout */
    body {
      font-family: 'Inter', sans-serif;
      color: #1f2937;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }

    /* Sections */
    .report-header {
      border-bottom: 4px solid var(--primary);
      padding-bottom: 20px;
      margin-bottom: 40px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }

    .kpi-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }

    .table-container {
      margin-bottom: 40px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #f3f4f6;
      text-align: left;
      padding: 12px;
      font-weight: 600;
      border-bottom: 2px solid var(--primary);
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="report-header">
    <h1>{{reportTitle}}</h1>
    <p>Zeitraum: {{startDate}} - {{endDate}}</p>
    <p>Generiert am: {{generatedDate}}</p>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <h3>E-Mail Performance</h3>
      <p class="kpi-value">{{emailOpenRate}}%</p>
      <p class="kpi-label">Öffnungsrate</p>
    </div>

    <div class="kpi-card">
      <h3>Veröffentlichungen</h3>
      <p class="kpi-value">{{totalClippings}}</p>
      <p class="kpi-label">Artikel</p>
    </div>

    <div class="kpi-card">
      <h3>Reichweite</h3>
      <p class="kpi-value">{{totalReach}}</p>
      <p class="kpi-label">Gesamtreichweite</p>
    </div>
  </div>

  <!-- Clippings Table -->
  <div class="table-container">
    <h2>Veröffentlichungen</h2>
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
        {{#each clippings}}
        <tr>
          <td>{{this.date}}</td>
          <td>{{this.title}}</td>
          <td>{{this.outlet}}</td>
          <td>{{this.reach}}</td>
          <td>{{this.sentiment}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>

  <!-- Charts (als PNG eingebettet via Recharts → canvas → dataURL) -->
  <div class="charts">
    <h2>Visualisierungen</h2>
    <img src="{{timelineChartDataURL}}" alt="Timeline" />
    <img src="{{sentimentChartDataURL}}" alt="Sentiment" />
  </div>
</body>
</html>
```

---

## 🔄 Implementierungs-Reihenfolge

### Phase 2.1: Dashboard KPIs (Woche 1)
1. ✅ Analysiere bestehende Komponenten
2. 🔨 Erstelle `MonitoringDashboard.tsx`
   - KPI-Cards
   - Zeitreihen-Charts
   - Verteilungs-Charts
3. 🔨 Integriere in Monitoring-Seiten
   - Einzelne Kampagne
   - Projekt-Monitoring
4. ✅ Test mit Beispiel-Daten

### Phase 2.2: PDF-Export (Woche 2)
1. ✅ Analysiere PDF-Versionierungs-System
2. 🔨 Erstelle `monitoring-report-service.ts`
   - Daten-Aggregation
   - HTML-Template-Generierung
   - PDF-Generation (analog zu pdf-versions)
3. 🔨 Erstelle Report-Template
   - HTML/CSS Design
   - Dynamische Daten-Integration
4. 🔨 UI-Integration
   - Export-Button in Monitoring-Seiten
   - Download-Handling
5. ✅ Test PDF-Generation

### Phase 2.3: Excel-Export (Woche 3)
1. 🔨 Installiere xlsx (falls nötig)
2. 🔨 Erstelle `monitoring-excel-export.ts`
   - Multi-Sheet Export
   - Formatierung
3. 🔨 UI-Integration
   - Export-Button
   - Download-Handling
4. ✅ Test Excel-Export

---

## ⚠️ Wichtige Hinweise (Firebase-Eigenheiten)

### 1. Kein Firebase Admin SDK
- **Alle** Firebase-Operationen über Client SDK
- Storage-Uploads ausschließlich Client-Side
- API Routes dürfen NICHT direkt auf Firebase Storage schreiben

### 2. PDF-Generation Best Practices
```typescript
// ❌ NICHT SO
await uploadToStorage(pdfBuffer); // Server-Side → Fehlt Auth

// ✅ SONDERN SO
const base64 = pdfBuffer.toString('base64');
return { pdfBase64: base64, needsClientUpload: true };
// Client übernimmt Upload mit User-Auth
```

### 3. Firestore-Daten-Bereinigung
```typescript
// IMMER undefined-Werte entfernen vor Firestore-Write
const cleanData = removeUndefinedValues(data);
await addDoc(collection(db, 'reports'), cleanData);
```

### 4. Chart-Integration in PDF
- Recharts rendert im Browser (DOM)
- Für PDF: Chart → Canvas → PNG → Base64 → HTML img src
- Oder: Server-Side Rendering mit node-canvas (komplex)

---

## 📋 File-Struktur

```
src/
├── components/
│   └── monitoring/
│       ├── MonitoringDashboard.tsx          # NEU
│       ├── ClippingArchive.tsx              # ERWEITERN
│       └── EmailPerformanceStats.tsx        # ERWEITERN
│
├── lib/
│   ├── firebase/
│   │   └── monitoring-report-service.ts     # NEU
│   └── exports/
│       └── monitoring-excel-export.ts       # NEU
│
├── app/
│   └── dashboard/
│       └── pr-tools/
│           └── monitoring/
│               └── [campaignId]/
│                   └── page.tsx             # ERWEITERN
│
└── types/
    └── monitoring.ts                        # ERWEITERN (ReportData)
```

---

## ✅ Erfolgskriterien

### Dashboard KPIs
- [ ] Zeitreihen-Chart zeigt Veröffentlichungen über Zeit
- [ ] Medium-Verteilung als Pie Chart
- [ ] Top 5 Outlets nach Reichweite
- [ ] Sentiment-Trend sichtbar
- [ ] Integration in bestehende Monitoring-Seiten

### PDF-Export
- [ ] Report enthält alle relevanten KPIs
- [ ] Charts als Bilder eingebettet
- [ ] Clippings-Tabelle vollständig
- [ ] PDF-Generation ohne Firebase Admin SDK
- [ ] Client-Side Upload funktioniert
- [ ] Download-Button in UI integriert

### Excel-Export
- [ ] Multi-Sheet Export (E-Mails, Clippings, Summary)
- [ ] Alle Daten vollständig exportiert
- [ ] Formatierung korrekt
- [ ] Download funktioniert in allen Browsern

---

## 📝 Nächste Schritte

1. **User-Freigabe**: Implementierungsplan vorstellen
2. **Start Phase 2.1**: MonitoringDashboard.tsx erstellen
3. **Iteration**: Feedback einholen und anpassen
4. **Phase 2.2/2.3**: Export-Funktionen implementieren