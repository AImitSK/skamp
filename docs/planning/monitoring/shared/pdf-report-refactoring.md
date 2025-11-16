# PDF-Report Service Refactoring - Implementierungsplan

**Version:** 1.1
**Erstellt:** 2025-11-16
**Aktualisiert:** 2025-11-16
**Modul:** Monitoring PDF-Report Service
**Phase:** 0.1 (Shared Components)
**Status:** 🚀 IN PROGRESS
**Branch:** `feature/pdf-report-design-improvements` (wird weiterverwendet)

---

## ✅ BEREITS ERLEDIGT (Session 2025-11-16)

**Was wurde bereits gemacht:**

### Design-Improvements (Phase 1-3)
- ✅ **Branding Integration** (Phase 1)
  - BrandingSettings aus Firestore laden
  - Logo im Header (max 200x80px)
  - Firmenname + Tagline
  - Kontaktdaten im Footer mit Copyright

- ✅ **Design-Überarbeitung** (Phase 2)
  - Emojis komplett entfernt
  - Typografie angepasst (H1: 24px, KPI: 20px, Section: 18px)
  - Farbschema: Grautöne statt Gelb, Primary nur für Akzente
  - KPI-Descriptions entfernt für kompakteres Design
  - Header umstrukturiert (PR-Monitoring Report groß, Firmenname klein, Logo rechtsbündig)
  - Alle Trennlinien entfernt
  - Footer vereinfacht und zentriert

- ✅ **Neue Metriken** (Phase 3)
  - CTR (Click-Through-Rate): clicked / totalSent
  - Conversion-Rate: withClippings / opened
  - Ø Reichweite: totalReach / totalClippings
  - Medientyp-Verteilung: Online, Print, Radio, TV mit Prozent-Anteilen

### Toast-Integration
- ✅ **Toast-Provider** im Root Layout (`src/app/layout.tsx`)
- ✅ **Toast-Meldungen** im Monitoring
  - PDF-Export: Success/Error Toasts
  - Excel-Export: Success/Error Toasts
  - PDF-Löschen: Success/Error Toasts
  - Auto-Funde: Success/Error Toasts (Bestätigen, Spam markieren)
  - Alte Dialogs/Alerts entfernt (-23 Zeilen Code)

**Commits auf Branch:**
- 7 Commits bereits gepusht
- Dokumentiert in `PDF_REPORT_IMPROVEMENTS_SUMMARY.md`

**Aktueller Stand:**
- `monitoring-report-service.ts`: ~670 Zeilen (war 703, noch nicht modularisiert)
- HTML-Template: Komplett überarbeitet, aber noch inline
- Design: ✅ Fertig und professionell
- Toast: ✅ Integriert in Monitoring-Seite

---

## 📚 Kontext & Hintergrund

### Was ist der PDF-Report Service?

Der PDF-Report Service generiert **Monitoring-Reports** als PDF-Dokumente mit:
- E-Mail Performance Stats (Öffnungsrate, Klickrate, etc.)
- Clipping-Statistiken (Reichweite, AVE, Sentiment)
- Timeline-Diagramme (Veröffentlichungen im Zeitverlauf)
- Top-Medien-Outlets (Bar Chart)
- Detaillierte Clipping-Liste

### Verwendung in zwei Szenarien

**Szenario 1: Quick-Report (AKTUELL)**
- **Pfad:** `/dashboard/analytics/monitoring/[campaignId]`
- **Trigger:** Button "PDF-Report"
- **Delivery:** Browser-Download
- **Status:** ✅ Produktiv

**Szenario 2: Scheduled Reports (GEPLANT)**
- **Pfad:** `/dashboard/analytics/reportings` (Noch nicht gebaut)
- **Trigger:** Cron-Job (täglich, wöchentlich, monatlich)
- **Delivery:** E-Mail-Versand
- **Status:** ⏳ Geplant

### Warum Refactoring?

**IST-Zustand:**
- **703 Zeilen** monolithische Service-Datei
- PDF-Generierung, Stats-Berechnung, HTML-Template ALLES inline
- Nicht wiederverwendbar für Scheduled Reports
- Keine Tests
- Keine Performance-Optimierung

**SOLL-Zustand:**
- Modularer Service (< 200 Zeilen Main)
- Generisch für Quick + Scheduled Reports
- Delivery-agnostisch (Download + Email)
- Konfigurierbar (Format, Umfang, Zeitraum)
- Testbar (>80% Coverage)
- React Query Integration (Hook: `usePDFReportGenerator`)

---

## 🎯 Refactoring-Ziele

### Funktionale Ziele

- [ ] **Generischer Service**: Verwendbar für Quick + Scheduled Reports
- [ ] **Delivery-agnostisch**: Download + Email Support
- [ ] **Konfigurierbar**: Format (A4/Letter), Zeitraum, Umfang
- [ ] **Wiederverwendbar**: Service-Layer vom UI-Layer getrennt

### Technische Ziele

- [ ] **Code-Reduktion**: 703 → ~200 Zeilen Main Service (-72%)
- [ ] **Modularisierung**: 6+ Sub-Module (< 150 Zeilen je Modul)
- [ ] **React Query Integration**: Custom Hook `usePDFReportGenerator`
- [ ] **Performance**: useCallback, useMemo, React.memo
- [ ] **Tests**: >80% Coverage (via refactoring-test Agent)
- [ ] **Dokumentation**: Comprehensive Docs (via refactoring-dokumentation Agent)

### Architektur-Ziele

- [ ] **Service-Layer**: Core Logic (Stats, PDF, Upload)
- [ ] **Delivery-Layer**: Download vs. Email (abstrahiert)
- [ ] **Config-Layer**: Report-Konfiguration (Format, Zeitraum)
- [ ] **Type Safety**: TypeScript Strict Mode

---

## 📁 IST-ZUSTAND ANALYSE

### Dateien

| Datei | LOC | Status |
|-------|-----|--------|
| `monitoring-report-service.ts` | 703 | ⚠️ MONOLITH |

### Service-Struktur (IST)

```typescript
// monitoring-report-service.ts (703 Zeilen)
class MonitoringReportService {
  // 1. Data Collection (89 Zeilen)
  async collectReportData() { ... }

  // 2. Stats Calculation (81 Zeilen)
  private calculateEmailStats() { ... }
  private calculateClippingStats() { ... }
  private calculateTimeline() { ... }

  // 3. HTML Template (334 Zeilen!)
  async generateReportHTML() {
    return `<!DOCTYPE html>...` // 334 Zeilen inline HTML!
  }

  // 4. PDF Generation (196 Zeilen)
  async generatePDFReport() {
    // API Call zu /api/generate-pdf
    // Upload zu Firebase Storage
    // Return Download URL
  }
}
```

### Probleme identifiziert

**1. Monolithische Struktur (703 Zeilen)**
- Alles in einer Klasse
- Data, Stats, HTML, PDF, Upload ALLES vermischt
- Schwer testbar
- Nicht wiederverwendbar

**2. HTML-Template inline (334 Zeilen)**
- 334 Zeilen HTML-String in einer Funktion
- Styles inline (CSS in Template-String)
- Schwer wartbar
- Keine Template-Wiederverwendung

**3. Keine Konfigurierbarkeit**
- Format, Zeitraum, Umfang fest codiert
- Nicht anpassbar für Scheduled Reports
- Keine Custom-Branding-Optionen

**4. Keine Tests**
- Null Test Coverage
- Keine Mocks
- Keine Integration Tests

**5. Keine React Query Integration**
- Manueller Fetch-Call aus Component
- Kein Caching
- Keine Error Handling
- Keine Retry Logic

**6. Nur Download, kein Email**
- Nur Browser-Download
- Kein E-Mail-Versand Support
- Scheduled Reports nicht möglich

---

## 🏗️ SOLL-ZUSTAND ARCHITEKTUR

### Neue Datei-Struktur

```
src/lib/monitoring-report/
├── index.ts                              # Re-Exports
├── types.ts                              # TypeScript Types (100 Zeilen)
├── core/
│   ├── data-collector.ts                 # Data Collection (120 Zeilen)
│   ├── stats-calculator.ts               # Stats Calculation (150 Zeilen)
│   └── timeline-builder.ts               # Timeline Aggregation (80 Zeilen)
├── templates/
│   ├── report-template.ts                # HTML Template Builder (180 Zeilen)
│   ├── styles.ts                         # CSS Styles (120 Zeilen)
│   └── charts/
│       ├── sentiment-chart.ts            # Sentiment Pie Chart (60 Zeilen)
│       ├── timeline-chart.ts             # Timeline Area Chart (80 Zeilen)
│       └── outlet-chart.ts               # Top Outlets Bar Chart (70 Zeilen)
├── generators/
│   ├── pdf-generator.ts                  # PDF API Call (100 Zeilen)
│   └── html-generator.ts                 # HTML Assembly (90 Zeilen)
├── delivery/
│   ├── download-handler.ts               # Browser Download (60 Zeilen)
│   └── email-sender.ts                   # Email Delivery (120 Zeilen, NEU)
├── config/
│   ├── report-config.ts                  # Config Interface (80 Zeilen)
│   └── defaults.ts                       # Default Config (40 Zeilen)
└── monitoring-report-service.ts          # Main Orchestrator (180 Zeilen, -74%)

src/lib/hooks/
└── useMonitoringReport.ts                # React Query Hook (120 Zeilen, NEU)

src/lib/firebase/
└── monitoring-report-service.ts          # DEPRECATED (Backward Compat)
```

### Service-Layer (SOLL)

```typescript
// monitoring-report-service.ts (NEU - 180 Zeilen)
import { ReportDataCollector } from './core/data-collector';
import { ReportStatsCalculator } from './core/stats-calculator';
import { PDFGenerator } from './generators/pdf-generator';
import { EmailSender } from './delivery/email-sender';
import { DownloadHandler } from './delivery/download-handler';

class MonitoringReportService {
  private dataCollector: ReportDataCollector;
  private statsCalculator: ReportStatsCalculator;
  private pdfGenerator: PDFGenerator;
  private emailSender: EmailSender;
  private downloadHandler: DownloadHandler;

  // Generischer Report Generator
  async generateReport(
    campaignId: string,
    organizationId: string,
    config: ReportConfig // NEU: Konfigurierbar
  ): Promise<ReportResult> {
    // 1. Collect Data
    const data = await this.dataCollector.collect(campaignId, organizationId);

    // 2. Calculate Stats
    const stats = this.statsCalculator.calculate(data);

    // 3. Build HTML
    const html = await this.htmlGenerator.build(stats, config);

    // 4. Generate PDF
    const pdf = await this.pdfGenerator.generate(html, config);

    return pdf;
  }

  // Quick Report (Browser Download)
  async generateQuickReport(
    campaignId: string,
    organizationId: string,
    userId: string
  ): Promise<{ pdfUrl: string }> {
    const config = ReportConfig.quick(); // Default Config
    const pdf = await this.generateReport(campaignId, organizationId, config);

    // Upload & Return Download URL
    return this.downloadHandler.upload(pdf, campaignId, userId);
  }

  // Scheduled Report (Email Delivery)
  async generateScheduledReport(
    campaignId: string,
    organizationId: string,
    config: ScheduledReportConfig // Email, Schedule, etc.
  ): Promise<{ sent: boolean }> {
    const pdf = await this.generateReport(campaignId, organizationId, config);

    // Send via Email
    return this.emailSender.send(pdf, config);
  }
}
```

### React Query Hook (NEU)

```typescript
// useMonitoringReport.ts (120 Zeilen)
import { useMutation } from '@tanstack/react-query';
import { monitoringReportService } from '@/lib/monitoring-report';

export function usePDFReportGenerator() {
  return useMutation({
    mutationFn: async (params: {
      campaignId: string;
      organizationId: string;
      userId: string;
      config?: ReportConfig;
    }) => {
      return monitoringReportService.generateQuickReport(
        params.campaignId,
        params.organizationId,
        params.userId
      );
    },
    onSuccess: (result) => {
      // Auto-Download in Browser
      window.open(result.pdfUrl, '_blank');
    }
  });
}

export function useScheduledReportGenerator() {
  return useMutation({
    mutationFn: async (params: ScheduledReportParams) => {
      return monitoringReportService.generateScheduledReport(
        params.campaignId,
        params.organizationId,
        params.config
      );
    }
  });
}
```

---

## 🚀 Die 8 Phasen

### Phase 0: Vorbereitung & Setup ✅ ERLEDIGT

**Dauer:** 30 Minuten
**Status:** ✅ KOMPLETT

#### Aufgaben

- [x] Feature-Branch verwenden (bereits existiert)
  ```bash
  # Branch: feature/pdf-report-design-improvements
  # HINWEIS: Wird weiterverwendet für Refactoring
  ```

- [x] Backup erstellen
  ```bash
  cp src/lib/firebase/monitoring-report-service.ts \
     src/lib/firebase/monitoring-report-service.backup.ts
  ```

- [x] Ist-Zustand dokumentieren
  ```bash
  wc -l src/lib/firebase/monitoring-report-service.ts
  # Output: ~670 Zeilen (war 703, durch Design-Improvements reduziert)
  ```

- [x] Verzeichnis-Struktur anlegen
  ```bash
  mkdir -p src/lib/monitoring-report/{core,templates,generators,delivery,config}
  mkdir -p src/lib/monitoring-report/templates/charts
  ```

#### Deliverable

- [x] Feature-Branch: `feature/pdf-report-design-improvements` (wird weiterverwendet)
- [x] Backup: `monitoring-report-service.backup.ts`
- [x] Neue Ordnerstruktur angelegt
- [x] IST-Zustand: ~670 Zeilen (Design-Improvements bereits integriert)

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup für PDF-Report Service Refactoring

- Backup erstellt
- Ordnerstruktur vorbereitet
- IST-Zustand: ~670 Zeilen (Design bereits optimiert)
- Branch: feature/pdf-report-design-improvements (weiterverwendet)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Dauer:** 1 Stunde

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

#### Cleanup-Schritte

**1. Console-Logs entfernen**
```bash
grep -rn "console\." src/lib/firebase/monitoring-report-service.ts
```
- [ ] Debug-Logs entfernen
- [ ] Nur console.error() in catch-blocks behalten

**2. Commented Code entfernen**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Löschen (nicht auskommentieren!)

**3. Unused Imports prüfen**
```bash
npx eslint src/lib/firebase/monitoring-report-service.ts --fix
```

**4. TypeScript Errors beheben**
```bash
npx tsc --noEmit
```

**5. Manueller Test**
- [ ] Dev-Server starten: `npm run dev`
- [ ] PDF-Report generieren testen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] Console-Logs entfernt (~5-10 Logs erwartet)
- [ ] Commented Code entfernt
- [ ] ESLint Auto-Fix durchgeführt
- [ ] TypeScript Errors behoben
- [ ] Manueller Test erfolgreich

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- Console-Logs entfernt (~X Logs)
- Commented Code gelöscht
- ESLint Auto-Fix durchgeführt
- TypeScript Errors behoben

monitoring-report-service.ts: 703 → ~690 Zeilen (-13 Zeilen toter Code)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Dauer:** 2-3 Stunden

**Ziel:** Custom Hook erstellen für PDF-Generierung

#### 1.1 Hook erstellen

**Datei:** `src/lib/hooks/useMonitoringReport.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringReportService } from '@/lib/firebase/monitoring-report-service';
import { toastService } from '@/lib/utils/toast';

export interface PDFReportParams {
  campaignId: string;
  organizationId: string;
  userId: string;
}

export function usePDFReportGenerator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: PDFReportParams) => {
      return monitoringReportService.generatePDFReport(
        params.campaignId,
        params.organizationId,
        params.userId
      );
    },
    onSuccess: (result) => {
      toastService.success('PDF-Report erfolgreich generiert!');

      // Auto-Download
      window.open(result.pdfUrl, '_blank');

      // Invalidate Analysis PDFs Query (reload PDF list)
      queryClient.invalidateQueries({
        queryKey: ['analysisPDFs', params.campaignId]
      });
    },
    onError: (error) => {
      console.error('PDF-Generation fehlgeschlagen:', error);
      toastService.error('PDF-Export fehlgeschlagen. Bitte versuche es erneut.');
    }
  });
}
```

#### 1.2 Component auf Hook umstellen

**Vorher:**
```typescript
// [campaignId]/page.tsx (ALT)
const [exportingPDF, setExportingPDF] = useState(false);

const handlePDFExport = async () => {
  if (!user || !currentOrganization?.id) return;

  try {
    setExportingPDF(true);
    const result = await monitoringReportService.generatePDFReport(
      campaignId,
      currentOrganization.id,
      user.uid
    );

    window.open(result.pdfUrl, '_blank');
    loadAnalysisPDFs();
    setSuccessMessage('PDF-Report erfolgreich generiert!');
    setShowSuccessDialog(true);
  } catch (error) {
    console.error('PDF-Export fehlgeschlagen:', error);
    setSuccessMessage('PDF-Export fehlgeschlagen. Bitte versuche es erneut.');
    setShowSuccessDialog(true);
  } finally {
    setExportingPDF(false);
  }
};
```

**Nachher:**
```typescript
// [campaignId]/page.tsx (NEU)
import { usePDFReportGenerator } from '@/lib/hooks/useMonitoringReport';

const pdfGenerator = usePDFReportGenerator();

const handlePDFExport = () => {
  if (!user || !currentOrganization?.id) return;

  pdfGenerator.mutate({
    campaignId,
    organizationId: currentOrganization.id,
    userId: user.uid
  });
};

// In JSX
<Button
  onClick={handlePDFExport}
  disabled={pdfGenerator.isPending}
>
  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
  {pdfGenerator.isPending ? 'Generiere PDF...' : 'PDF-Report'}
</Button>
```

#### Checkliste Phase 1

- [ ] Hook `useMonitoringReport.ts` erstellt (120 Zeilen)
- [ ] `usePDFReportGenerator` implementiert
- [ ] Toast-Service Integration
- [ ] Auto-Download bei Success
- [ ] Query Invalidierung (analysisPDFs)
- [ ] Component auf Hook umgestellt
- [ ] useState/Loading entfernt
- [ ] TypeScript-Fehler behoben

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für PDF-Report

- usePDFReportGenerator Hook erstellt (120 Zeilen)
- Toast-Service statt Alert-State
- Auto-Download bei Success
- Query Invalidierung für analysisPDFs
- Component auf Hook umgestellt (-35 Zeilen Boilerplate)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Dauer:** 6-8 Stunden

**Ziel:** Monolithischen Service in 10+ Module aufteilen

#### 2.1 Types auslagern

**Datei:** `src/lib/monitoring-report/types.ts` (100 Zeilen)

```typescript
import { EmailCampaignSend } from '@/types/email';
import { MediaClipping } from '@/types/monitoring';

export interface ReportConfig {
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

export interface MonitoringReportData {
  campaignId: string;
  organizationId: string;
  reportTitle: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };
  emailStats: EmailStats;
  clippingStats: ClippingStats;
  timeline: TimelineData[];
  clippings: MediaClipping[];
  sends: EmailCampaignSend[];
}

export interface EmailStats {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

export interface ClippingStats {
  totalClippings: number;
  totalReach: number;
  totalAVE: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topOutlets: OutletStats[];
}

export interface OutletStats {
  name: string;
  reach: number;
  clippingsCount: number;
}

export interface TimelineData {
  date: string;
  clippings: number;
  reach: number;
}

// Scheduled Report Types (NEU für Cron-Jobs)
export interface ScheduledReportConfig extends ReportConfig {
  recipients: string[]; // Email-Adressen
  subject: string;
  message?: string; // Optional email body
  schedule: 'daily' | 'weekly' | 'monthly';
  nextRun?: Date;
}

export interface ReportResult {
  pdfUrl: string;
  fileSize: number;
  generatedAt: Date;
}
```

#### 2.2 Data Collector extrahieren

**Datei:** `src/lib/monitoring-report/core/data-collector.ts` (120 Zeilen)

```typescript
import { prService } from '@/lib/firebase/pr-service';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import type { MonitoringReportData } from '../types';

export class ReportDataCollector {
  async collect(
    campaignId: string,
    organizationId: string
  ): Promise<MonitoringReportData> {
    const campaign = await prService.getById(campaignId);

    if (!campaign) {
      throw new Error('Kampagne nicht gefunden');
    }

    const [sends, clippings] = await Promise.all([
      emailCampaignService.getSends(campaignId, { organizationId }),
      clippingService.getByCampaignId(campaignId, { organizationId })
    ]);

    const sentAt = campaign.sentAt?.toDate() || new Date();
    const now = new Date();

    return {
      campaignId,
      organizationId,
      reportTitle: campaign.title || 'Monitoring Report',
      reportPeriod: {
        start: sentAt,
        end: now
      },
      emailStats: null, // Wird vom StatsCalculator gefüllt
      clippingStats: null, // Wird vom StatsCalculator gefüllt
      timeline: [], // Wird vom TimelineBuilder gefüllt
      clippings,
      sends
    };
  }
}
```

#### 2.3 Stats Calculator extrahieren

**Datei:** `src/lib/monitoring-report/core/stats-calculator.ts` (150 Zeilen)

```typescript
import type { EmailCampaignSend } from '@/types/email';
import type { MediaClipping } from '@/types/monitoring';
import type { EmailStats, ClippingStats, OutletStats } from '../types';

export class ReportStatsCalculator {
  calculateEmailStats(sends: EmailCampaignSend[]): EmailStats {
    const total = sends.length;
    const delivered = sends.filter(s =>
      s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
    ).length;
    const opened = sends.filter(s =>
      s.status === 'opened' || s.status === 'clicked'
    ).length;
    const clicked = sends.filter(s => s.status === 'clicked').length;
    const bounced = sends.filter(s => s.status === 'bounced').length;

    return {
      totalSent: total,
      delivered,
      opened,
      clicked,
      bounced,
      openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0
    };
  }

  calculateClippingStats(clippings: MediaClipping[]): ClippingStats {
    const totalReach = clippings.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalAVE = clippings.reduce((sum, c) => sum + (c.ave || 0), 0);

    const sentimentDistribution = {
      positive: clippings.filter(c => c.sentiment === 'positive').length,
      neutral: clippings.filter(c => c.sentiment === 'neutral').length,
      negative: clippings.filter(c => c.sentiment === 'negative').length
    };

    const topOutlets = this.calculateTopOutlets(clippings);

    return {
      totalClippings: clippings.length,
      totalReach,
      totalAVE,
      sentimentDistribution,
      topOutlets
    };
  }

  private calculateTopOutlets(clippings: MediaClipping[]): OutletStats[] {
    const outletStats = clippings.reduce((acc, clipping) => {
      const outlet = clipping.outletName || 'Unbekannt';
      if (!acc[outlet]) {
        acc[outlet] = { name: outlet, reach: 0, clippingsCount: 0 };
      }
      acc[outlet].reach += clipping.reach || 0;
      acc[outlet].clippingsCount += 1;
      return acc;
    }, {} as Record<string, OutletStats>);

    return Object.values(outletStats)
      .sort((a, b) => b.reach - a.reach)
      .slice(0, 5);
  }

  calculate(data: MonitoringReportData): MonitoringReportData {
    return {
      ...data,
      emailStats: this.calculateEmailStats(data.sends),
      clippingStats: this.calculateClippingStats(data.clippings)
    };
  }
}
```

#### 2.4 Timeline Builder extrahieren

**Datei:** `src/lib/monitoring-report/core/timeline-builder.ts` (80 Zeilen)

```typescript
import type { MediaClipping } from '@/types/monitoring';
import type { TimelineData } from '../types';

export class TimelineBuilder {
  build(clippings: MediaClipping[]): TimelineData[] {
    const groupedByDate = clippings.reduce((acc, clipping) => {
      if (!clipping.publishedAt || !clipping.publishedAt.toDate) return acc;

      const date = clipping.publishedAt.toDate().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      if (!acc[date]) {
        acc[date] = { date, clippings: 0, reach: 0 };
      }

      acc[date].clippings += 1;
      acc[date].reach += clipping.reach || 0;

      return acc;
    }, {} as Record<string, TimelineData>);

    return Object.values(groupedByDate).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }
}
```

#### 2.5 HTML Template extrahieren

**Datei:** `src/lib/monitoring-report/templates/report-template.ts` (180 Zeilen)

```typescript
import type { MonitoringReportData } from '../types';
import { styles } from './styles';

export class ReportTemplate {
  build(data: MonitoringReportData): string {
    const sentimentPercentages = this.calculateSentimentPercentages(data);

    return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>${styles}</style>
</head>
<body>
  ${this.buildHeader(data)}
  ${this.buildEmailStats(data)}
  ${this.buildClippingStats(data)}
  ${this.buildSentimentChart(sentimentPercentages)}
  ${this.buildTopOutlets(data)}
  ${this.buildTimeline(data)}
  ${this.buildClippingDetails(data)}
  ${this.buildFooter(data)}
</body>
</html>
    `.trim();
  }

  private buildHeader(data: MonitoringReportData): string {
    return `
      <div class="header">
        <h1>${data.reportTitle}</h1>
        <p class="date-range">
          ${data.reportPeriod.start.toLocaleDateString('de-DE')} -
          ${data.reportPeriod.end.toLocaleDateString('de-DE')}
        </p>
      </div>
    `;
  }

  // ... weitere private Methoden
}
```

#### 2.6 Styles extrahieren

**Datei:** `src/lib/monitoring-report/templates/styles.ts` (120 Zeilen)

```typescript
export const styles = `
  :root {
    --primary: #005fab;
    --secondary: #DEDC00;
    --success: #10b981;
    --danger: #ef4444;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #fff;
    padding: 40px;
  }

  .header {
    text-align: center;
    margin-bottom: 40px;
    border-bottom: 3px solid var(--primary);
    padding-bottom: 20px;
  }

  /* ... weitere Styles */
`.trim();
```

#### 2.7 Main Service neu aufbauen

**Datei:** `src/lib/monitoring-report/monitoring-report-service.ts` (180 Zeilen)

```typescript
import { ReportDataCollector } from './core/data-collector';
import { ReportStatsCalculator } from './core/stats-calculator';
import { TimelineBuilder } from './core/timeline-builder';
import { ReportTemplate } from './templates/report-template';
import type { ReportConfig, ReportResult } from './types';

class MonitoringReportService {
  private dataCollector = new ReportDataCollector();
  private statsCalculator = new ReportStatsCalculator();
  private timelineBuilder = new TimelineBuilder();
  private template = new ReportTemplate();

  async generatePDFReport(
    campaignId: string,
    organizationId: string,
    userId: string,
    config: ReportConfig = this.getDefaultConfig()
  ): Promise<ReportResult> {
    // 1. Collect Data
    const rawData = await this.dataCollector.collect(campaignId, organizationId);

    // 2. Calculate Stats
    const data = this.statsCalculator.calculate(rawData);

    // 3. Build Timeline
    data.timeline = this.timelineBuilder.build(data.clippings);

    // 4. Generate HTML
    const html = this.template.build(data);

    // 5. Generate PDF via API
    const result = await this.callPDFAPI(html, campaignId, organizationId, userId);

    return result;
  }

  private async callPDFAPI(
    html: string,
    campaignId: string,
    organizationId: string,
    userId: string
  ): Promise<ReportResult> {
    // Existing PDF API Call Logic
    // ...
  }

  private getDefaultConfig(): ReportConfig {
    return {
      format: 'A4',
      orientation: 'portrait',
      includeCharts: true,
      includeClippingDetails: true
    };
  }
}

export const monitoringReportService = new MonitoringReportService();
```

#### 2.8 Backward Compatibility sicherstellen

**Datei:** `src/lib/firebase/monitoring-report-service.ts` (3 Zeilen)

```typescript
// Re-export für bestehende Imports (Backward Compatibility)
export { monitoringReportService } from '@/lib/monitoring-report';
export type { ReportConfig, ReportResult } from '@/lib/monitoring-report/types';
```

#### Checkliste Phase 2

- [ ] Types ausgelagert (`types.ts` - 100 Zeilen)
- [ ] Data Collector extrahiert (`data-collector.ts` - 120 Zeilen)
- [ ] Stats Calculator extrahiert (`stats-calculator.ts` - 150 Zeilen)
- [ ] Timeline Builder extrahiert (`timeline-builder.ts` - 80 Zeilen)
- [ ] HTML Template extrahiert (`report-template.ts` - 180 Zeilen)
- [ ] Styles extrahiert (`styles.ts` - 120 Zeilen)
- [ ] Main Service neu aufgebaut (`monitoring-report-service.ts` - 180 Zeilen, -74%)
- [ ] Backward Compatibility sichergestellt (Re-Export)
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test erfolgreich

**Code-Reduktion:** 703 → 180 Zeilen Main Service (-74%)
**Module erstellt:** 7 neue Dateien

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Modularisierung PDF-Report Service

- Types ausgelagert (types.ts - 100 Zeilen)
- Data Collector extrahiert (120 Zeilen)
- Stats Calculator extrahiert (150 Zeilen)
- Timeline Builder extrahiert (80 Zeilen)
- HTML Template extrahiert (180 Zeilen)
- Styles extrahiert (120 Zeilen)
- Main Service: 703 → 180 Zeilen (-74%)

Backward Compatibility: ✅ Re-Export in firebase/

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Dauer:** 2-3 Stunden

**Ziel:** Performance-Optimierungen für React Query Hook

#### 3.1 useCallback für Handler

```typescript
// useMonitoringReport.ts
export function usePDFReportGenerator() {
  const queryClient = useQueryClient();

  const handleSuccess = useCallback((result: ReportResult, params: PDFReportParams) => {
    toastService.success('PDF-Report erfolgreich generiert!');
    window.open(result.pdfUrl, '_blank');
    queryClient.invalidateQueries({ queryKey: ['analysisPDFs', params.campaignId] });
  }, [queryClient]);

  const handleError = useCallback((error: Error) => {
    console.error('PDF-Generation fehlgeschlagen:', error);
    toastService.error('PDF-Export fehlgeschlagen. Bitte versuche es erneut.');
  }, []);

  return useMutation({
    mutationFn: async (params: PDFReportParams) => {
      return monitoringReportService.generatePDFReport(
        params.campaignId,
        params.organizationId,
        params.userId
      );
    },
    onSuccess: handleSuccess,
    onError: handleError
  });
}
```

#### 3.2 Memoization in Stats Calculator

```typescript
// stats-calculator.ts
export class ReportStatsCalculator {
  // Cache für teure Berechnungen
  private outletStatsCache = new Map<string, OutletStats[]>();

  calculateClippingStats(clippings: MediaClipping[]): ClippingStats {
    // Cache Key
    const cacheKey = clippings.map(c => c.id).join(',');

    // Check Cache
    if (this.outletStatsCache.has(cacheKey)) {
      const topOutlets = this.outletStatsCache.get(cacheKey)!;
      return { /* ... */, topOutlets };
    }

    // Calculate & Cache
    const topOutlets = this.calculateTopOutlets(clippings);
    this.outletStatsCache.set(cacheKey, topOutlets);

    return { /* ... */, topOutlets };
  }
}
```

#### Checkliste Phase 3

- [ ] useCallback für handleSuccess
- [ ] useCallback für handleError
- [ ] Memoization in Stats Calculator
- [ ] Cache für Outlet Stats

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung

- useCallback für Success/Error Handler
- Memoization in Stats Calculator
- Cache für teure Outlet-Berechnungen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Dauer:** 4-6 Stunden (Agent automatisch)

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle comprehensive Test Suite für PDF-Report Service Refactoring nach Phase 3.

Context:
- Modul: Monitoring PDF-Report Service
- Core: data-collector.ts, stats-calculator.ts, timeline-builder.ts
- Templates: report-template.ts, styles.ts
- Service: monitoring-report-service.ts
- Hook: useMonitoringReport.ts

Requirements:
- Unit Tests für alle Core-Module (>80% Coverage)
- Integration Tests (Full Report Generation Flow)
- Hook Tests (usePDFReportGenerator)
- Mocking: Firebase Services, PDF API
- Alle Tests müssen bestehen

Deliverable:
- Test-Suite vollständig implementiert
- Coverage Report (npm run test:coverage)
- Test-Dokumentation
```

#### Erwartete Test-Dateien

```
src/lib/monitoring-report/
├── core/__tests__/
│   ├── data-collector.test.ts      (15 Tests)
│   ├── stats-calculator.test.ts    (20 Tests)
│   └── timeline-builder.test.ts    (10 Tests)
├── templates/__tests__/
│   └── report-template.test.ts     (12 Tests)
└── __tests__/
    └── monitoring-report-service.test.ts (18 Tests)

src/lib/hooks/__tests__/
└── useMonitoringReport.test.ts     (8 Tests)

Total: ~83 Tests
```

#### Checkliste Phase 4

**Wenn Agent verwendet:**
- [ ] refactoring-test Agent aufgerufen
- [ ] Agent hat Test-Suite vollständig erstellt (KEINE TODOs!)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] Test-Dokumentation vorhanden

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (via refactoring-test Agent)

- 83 Tests implementiert (100% bestanden)
- Coverage: >80% in allen Modulen
- Unit Tests: Core, Templates
- Integration Tests: Full Flow
- Hook Tests: usePDFReportGenerator

Test-Breakdown:
- data-collector: 15 Tests
- stats-calculator: 20 Tests
- timeline-builder: 10 Tests
- report-template: 12 Tests
- monitoring-report-service: 18 Tests
- useMonitoringReport: 8 Tests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Dauer:** 3-4 Stunden (Agent automatisch)

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle umfassende Dokumentation für PDF-Report Service Refactoring nach Phase 4.

Context:
- Modul: Monitoring PDF-Report Service
- Core: data-collector, stats-calculator, timeline-builder
- Templates: report-template, styles
- Service: monitoring-report-service
- Hook: useMonitoringReport
- Tests: Comprehensive Test Suite (83 Tests, >80% Coverage)

Requirements:
- README.md (Hauptdokumentation 500+ Zeilen)
- API-Dokumentation (Service-Methoden 600+ Zeilen)
- Hook-Dokumentation (usePDFReportGenerator 400+ Zeilen)
- ADR-Dokumentation (Entscheidungen 400+ Zeilen)
- Code-Beispiele (funktionierend, getestet)

Deliverable:
- Vollständige Dokumentation (2.000+ Zeilen)
- Funktionierende Code-Beispiele
```

#### Erwartete Dokumentation

```
docs/monitoring/pdf-report/
├── README.md                        (500+ Zeilen)
├── api/
│   ├── README.md                    (300+ Zeilen)
│   ├── data-collector.md            (150+ Zeilen)
│   ├── stats-calculator.md          (150+ Zeilen)
│   └── monitoring-report-service.md (300+ Zeilen)
├── hooks/
│   └── useMonitoringReport.md       (400+ Zeilen)
└── adr/
    └── README.md                    (400+ Zeilen)

Total: ~2.200 Zeilen
```

#### Checkliste Phase 5

**Wenn Agent verwendet:**
- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Agent hat vollständige Dokumentation erstellt (2.000+ Zeilen)
- [ ] Alle Dateien vorhanden (README, API, Hooks, ADR)
- [ ] Code-Beispiele funktionieren
- [ ] Alle Links funktionieren

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation (via refactoring-dokumentation Agent)

- README.md (500+ Zeilen)
- API-Docs (900+ Zeilen)
- Hook-Docs (400+ Zeilen)
- ADR-Docs (400+ Zeilen)
- Gesamt: 2.200+ Zeilen Dokumentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Dauer:** 2-3 Stunden

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit
```

**Zu beheben:**
- [ ] Missing imports
- [ ] Type mismatches
- [ ] Incorrect prop types

#### 6.2 ESLint Check

```bash
npx eslint src/lib/monitoring-report --fix
npx eslint src/lib/hooks/useMonitoringReport.ts --fix
```

**Zu beheben:**
- [ ] Unused imports
- [ ] Unused variables
- [ ] console.log statements (nur console.error in catch)

#### 6.3 Build Test

```bash
npm run build
```

**Prüfen:**
- [ ] Build erfolgreich?
- [ ] Keine TypeScript-Errors?
- [ ] Keine Warnings?

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

- [ ] Heroicons /24/outline verwendet
- [ ] Primary Color #005fab in Templates
- [ ] Zinc-Palette für neutrale Farben

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build: Erfolgreich
- [ ] Design System: Compliant

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality

- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Build: Erfolgreich
- Design System: Compliant

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Dauer:** 1 Stunde (Agent automatisch)

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** durchgeführt!

**PROAKTIV:** Agent wird AUTOMATISCH vor Phase 7 (Merge) aufgerufen!

#### Agent aufrufen

**Prompt:**
```markdown
Führe Quality Gate Check für PDF-Report Service Refactoring durch.

Überprüfe ALLE Phasen 0-6:
- Phase 0/0.5: Setup & Cleanup
- Phase 1: React Query Integration (useMonitoringReport Hook)
- Phase 2: Modularisierung (7 neue Module)
- Phase 3: Performance-Optimierung
- Phase 4: Tests (83 Tests, >80% Coverage)
- Phase 5: Dokumentation (2.200+ Zeilen)
- Phase 6: Code Quality (TypeScript, ESLint, Build)

Deliverable:
- Comprehensive Quality Report
- GO/NO-GO Empfehlung für Merge
```

#### Erwarteter Output

```
✅ QUALITY GATE: GO

Phase 0/0.5 Checks: ✅
- Feature-Branch existiert
- Backup vorhanden
- Toter Code entfernt

Phase 1 Checks: ✅
- useMonitoringReport Hook existiert
- Hook in Component verwendet
- Alte setState-Logik entfernt

Phase 2 Checks: ✅
- 7 Module erstellt (types, data-collector, stats-calculator, etc.)
- Main Service: 703 → 180 Zeilen (-74%)
- Backward Compatibility sichergestellt

Phase 3 Checks: ✅
- useCallback verwendet
- Memoization in Stats Calculator

Phase 4 Checks: ✅
- 83 Tests implementiert
- Alle Tests bestehen
- Coverage >80%
- KEINE TODOs

Phase 5 Checks: ✅
- Dokumentation vollständig (2.200+ Zeilen)
- README, API, Hooks, ADR vorhanden
- KEINE Platzhalter

Phase 6 Checks: ✅
- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Build erfolgreich

Integration Checks: ✅
- Alte Datei gelöscht (backup vorhanden)
- Imports aktualisiert
- Keine unused Imports

EMPFEHLUNG: GO ✅ - Ready for Merge to Main
```

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] Quality Report erhalten
- [ ] ALLE Checks bestanden (GO)
- [ ] Falls NO-GO: Probleme behoben und Agent erneut aufgerufen

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden

Quality Report: ✅ GO
- Alle Phasen 0-6 erfolgreich
- 83 Tests (100% passing)
- Coverage >80%
- TypeScript, ESLint, Build: OK
- Dokumentation vollständig
- Ready for Merge to Main

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 7: Merge zu Main

**Dauer:** 30 Minuten

**⚠️ WICHTIG:** Nur nach erfolgreichem Phase 6.5 Quality Gate Check!

#### Workflow

```bash
# 1. Finaler Commit (falls noch Änderungen)
git add .
git commit -m "chore: Finaler Cleanup vor Merge"

# 2. Push Feature-Branch
git push origin feature/pdf-report-service-refactoring

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/pdf-report-service-refactoring --no-edit

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- monitoring-report
```

#### Checkliste Merge

- [ ] ⭐ Phase 6.5 Quality Gate Check bestanden (GO)
- [ ] Alle 7 Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

---

## 📊 ERFOLGS-METRIKEN

### Code-Reduktion

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|--------------|
| Main Service LOC | 703 | 180 | -74% ✅ |
| Größte Funktion | 334 (HTML) | 120 (Template) | -64% ✅ |
| Module | 1 | 7 | +600% ✅ |
| Test Coverage | 0% | >80% | +80% ✅ |
| Dokumentation | 0 Zeilen | 2.200+ Zeilen | ∞ ✅ |

### Wiederverwendbarkeit

| Feature | Quick-Report | Scheduled Reports |
|---------|--------------|-------------------|
| Data Collection | ✅ | ✅ |
| Stats Calculation | ✅ | ✅ |
| HTML Generation | ✅ | ✅ |
| PDF Generation | ✅ | ✅ |
| Delivery (Download) | ✅ | ❌ |
| Delivery (Email) | ❌ | ✅ (NEU) |

### Architektur-Verbesserungen

- ✅ **Modulare Struktur**: 7 Sub-Module statt Monolith
- ✅ **Service-Layer**: Core Logic getrennt vom UI
- ✅ **Delivery-agnostisch**: Download + Email Support
- ✅ **Konfigurierbar**: ReportConfig Interface
- ✅ **Testbar**: 83 Tests, >80% Coverage
- ✅ **Dokumentiert**: 2.200+ Zeilen Docs

---

## 🚀 NÄCHSTE SCHRITTE

Nach erfolgreichem Merge:

1. **Phase 0.2**: Excel-Export Refactoring
2. **Phase 0.3**: MarkPublishedModal Refactoring
3. **Phase 1.1**: Monitoring Overview Page Refactoring
4. **Phase 1.2**: Monitoring Detail Page Refactoring (MonitoringContext!)

---

## 📚 REFERENZEN

### Template
- **Basis:** `docs/templates/module-refactoring-template.md`

### Verwandte Refactorings
- **Campaign-Refactoring:** `docs/planning/campaigns-refactoring-master-checklist.md`
- **Projekt-Monitoring:** `docs/projects/monitoring/`

### Design System
- **Guidelines:** `docs/design-system/DESIGN_SYSTEM.md`

---

**Erstellt:** 2025-11-16
**Maintainer:** CeleroPress Team
**Status:** ⏳ BEREIT ZUM START

🤖 Generated with Claude Code
