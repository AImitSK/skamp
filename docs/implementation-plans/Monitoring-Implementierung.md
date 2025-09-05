# Plan 5/9: Monitoring-Implementierung

## Übersicht
Implementierung der **Monitoring & Analyse Phase** der Projekt-Pipeline durch Erweiterung bestehender Analytics- und Media-Systeme. Diese Phase sammelt und wertet KPIs der Distribution aus und stellt sie in einem Analytics-Dashboard dar.

## 🎯 Bestehende Systeme erweitern (NICHT neu erstellen)

### 1. Media-Monitoring Integration
**Erweitert**: Bestehende `MediaAsset` Interfaces und Services

#### MediaAsset Erweiterung
```typescript
// Erweitere src/types/media.ts
interface ClippingAsset extends MediaAsset {
  type: 'clipping';
  outlet: string;
  publishDate: Timestamp;
  reachValue: number;
  sentimentScore: number;
  url?: string;
  
  // Pipeline-spezifische Felder
  projectId?: string;
  campaignId?: string;
  distributionId?: string;
  monitoringPhaseId?: string;
}

interface MonitoringData {
  clippings: MediaClipping[];
  mentions: SocialMention[];
  reachData: ReachMetrics;
  sentimentAnalysis: SentimentData;
}

interface MediaClipping {
  id: string;
  title: string;
  outlet: string;
  publishDate: Timestamp;
  url?: string;
  screenshot?: string;
  content?: string;
  reachValue: number;
  sentimentScore: number;
  mediaValue: number;
  tags: string[];
}
```

### 2. CRM Contact System Erweiterung
**Erweitert**: Bestehende `ContactEnhanced` Interface

#### ContactEnhanced Erweiterung
```typescript
// Erweitere src/types/contacts.ts
interface JournalistContact extends ContactEnhanced {
  // Monitoring-spezifische Felder
  clippingHistory?: ClippingAsset[];
  responseRate?: number;
  averageReach?: number;
  preferredTopics?: string[];
  lastClippingDate?: Timestamp;
  totalClippings?: number;
  averageSentiment?: number;
  
  // Pipeline-Integration
  projectContributions?: Array<{
    projectId: string;
    projectTitle: string;
    clippingCount: number;
    totalReach: number;
  }>;
}
```

### 3. Project Interface Erweiterung
**Erweitert**: Bestehende `Project` Interface

#### Project Monitoring-Felder
```typescript
// Erweitere src/types/project.ts
interface Project {
  // ... bestehende Felder
  
  // Monitoring-Phase Konfiguration
  monitoringConfig?: {
    isEnabled: boolean;
    monitoringPeriod: 30 | 90 | 365; // Tage
    autoTransition: boolean;
    providers: MonitoringProvider[];
    alertThresholds: {
      minReach: number;
      sentimentAlert: number;
      competitorMentions: number;
    };
    reportSchedule: 'daily' | 'weekly' | 'monthly';
  };
  
  // Analytics Daten
  analytics?: ProjectAnalytics;
  
  // Monitoring Status
  monitoringStatus?: 'not_started' | 'active' | 'completed' | 'paused';
  monitoringStartedAt?: Timestamp;
  monitoringCompletedAt?: Timestamp;
}

interface ProjectAnalytics {
  projectId: string;
  totalReach: number;
  mediaValue: number;
  clippingCount: number;
  sentimentScore: number;
  topOutlets: MediaOutlet[];
  timelineData: AnalyticsTimeline[];
  competitorBenchmarks?: BenchmarkData;
  
  // Performance Metriken
  shareOfVoice?: number;
  earnedMediaValue?: number;
  engagementRate?: number;
  messagePullThrough?: number;
  
  // Zeitstempel
  lastUpdated: Timestamp;
  dataCollectionStarted: Timestamp;
  dataCollectionEnded?: Timestamp;
}

interface AnalyticsTimeline {
  date: Timestamp;
  dailyReach: number;
  dailyClippings: number;
  dailySentiment: number;
  cumulativeReach: number;
  cumulativeMediaValue: number;
}

interface MediaOutlet {
  name: string;
  clippingCount: number;
  totalReach: number;
  averageSentiment: number;
  mediaValue: number;
  tier: 'tier1' | 'tier2' | 'tier3' | 'niche';
}

interface MonitoringProvider {
  name: 'landau' | 'pmg' | 'custom';
  apiEndpoint: string;
  isEnabled: boolean;
  lastSync?: Timestamp;
  supportedMetrics: ('reach' | 'sentiment' | 'mentions' | 'social')[];
}
```

### 4. Erweiterte Services
**Erweitert**: Bestehende Services mit Monitoring-Funktionalitäten

#### projectService Erweiterung
```typescript
// Erweitere src/lib/firebase/projectService.ts
class ProjectService {
  // ... bestehende Methoden
  
  // Monitoring-spezifische Methoden
  async startMonitoring(projectId: string, config: MonitoringConfig): Promise<void>
  async updateAnalytics(projectId: string, analytics: ProjectAnalytics): Promise<void>
  async addClipping(projectId: string, clipping: MediaClipping): Promise<void>
  async getAnalyticsDashboard(projectId: string): Promise<AnalyticsDashboard>
  async generateMonitoringReport(projectId: string, format: 'pdf' | 'excel'): Promise<Blob>
  async completeMonitoring(projectId: string): Promise<void>
}
```

#### mediaService Erweiterung
```typescript
// Erweitere src/lib/firebase/mediaService.ts
class MediaService {
  // ... bestehende Methoden
  
  // Clipping-spezifische Methoden
  async saveClippingAsset(clipping: ClippingAsset): Promise<string>
  async getProjectClippings(projectId: string): Promise<ClippingAsset[]>
  async updateClippingMetrics(clippingId: string, metrics: ClippingMetrics): Promise<void>
  async generateClippingScreenshot(url: string): Promise<string>
}
```

#### contactsEnhancedService Erweiterung
```typescript
// Erweitere src/lib/firebase/contactsEnhancedService.ts
class ContactsEnhancedService {
  // ... bestehende Methoden
  
  // Journalist-Tracking Methoden
  async updateJournalistMetrics(contactId: string, clipping: MediaClipping): Promise<void>
  async getJournalistPerformance(contactId: string): Promise<JournalistMetrics>
  async getTopPerformingJournalists(organizationId: string, timeframe?: number): Promise<JournalistContact[]>
}
```

## 🔧 Neue UI-Komponenten

### 1. Analytics Dashboard
**Datei**: `src/components/projects/monitoring/AnalyticsDashboard.tsx`
- KPI-Übersichtskarten (Reichweite, Sentiment, Media Value)
- Timeline-Charts mit Reach-Entwicklung
- Top Outlets Ranking
- Competitor Benchmarking
- Export-Funktionen (PDF, Excel)

### 2. Clippings Gallery
**Datei**: `src/components/projects/monitoring/ClippingsGallery.tsx`
- Grid-Layout für alle Clippings
- Filter nach Outlet, Datum, Sentiment
- Screenshot-Vorschau
- Bulk-Export Funktionen
- Integration mit Media Library

### 3. Monitoring Configuration
**Datei**: `src/components/projects/monitoring/MonitoringConfigPanel.tsx`
- Provider-Konfiguration
- Alert-Schwellenwerte
- Report-Scheduling
- Monitoring-Periode Einstellungen

### 4. Analytics Timeline
**Datei**: `src/components/projects/monitoring/AnalyticsTimeline.tsx`
- Interaktives Chart mit Reach-Entwicklung
- Clipping-Markierungen auf Timeline
- Sentiment-Overlay
- Export-Funktionen

### 5. Monitoring Status Widget
**Datei**: `src/components/projects/monitoring/MonitoringStatusWidget.tsx`
- Kompakter Status-Überblick für Projekt-Karte
- Live-Metriken (Reach, Clippings Count)
- Quick-Actions (Report öffnen, Export)

## 🔄 Seitenmodifikationen

### 1. Projekt-Detail Seite
**Erweitert**: `src/app/dashboard/projects/[projectId]/page.tsx`
- Neuer "Monitoring" Tab
- Analytics Dashboard Integration
- Monitoring-Konfiguration Panel
- Status-Übergang zu "monitoring" Phase

### 2. Projekt-Übersicht
**Erweitert**: `src/app/dashboard/projects/page.tsx`
- Monitoring-Status in Projekt-Karten
- Filter für "monitoring" Phase
- Bulk-Report-Export für abgeschlossene Projekte

### 3. Media Library
**Erweitert**: `src/app/dashboard/pr-tools/media-library/page.tsx`
- Neuer Filter für "clipping" Assets
- Project-Filter für Monitoring-Assets
- Batch-Download für Projekt-Clippings

### 4. CRM Kontakte
**Erweitert**: `src/app/dashboard/contacts/crm/contacts/[contactId]/page.tsx`
- Journalist Performance Tab
- Clipping History Timeline
- Project Contribution Overview

## 🎨 Design System Integration

### Monitoring-spezifische Icons
```typescript
// Verwende /24/outline Icons
import {
  ChartBarIcon,      // Analytics Dashboard
  DocumentChartBarIcon, // Reports
  EyeIcon,           // Monitoring Status
  TrophyIcon,        // Top Performance
  ClipboardDocumentListIcon, // Clippings
  ArrowTrendingUpIcon,    // Performance Trends
} from '@heroicons/react/24/outline';
```

### Status-Badges
```typescript
// Erweitere bestehende Badge-Komponenten
const monitoringStatusConfig = {
  not_started: { color: 'gray', label: 'Nicht gestartet' },
  active: { color: 'blue', label: 'Aktiv überwacht' },
  completed: { color: 'green', label: 'Abgeschlossen' },
  paused: { color: 'yellow', label: 'Pausiert' },
};
```

## 🤖 AGENTEN-WORKFLOW

### SCHRITT 1: IMPLEMENTATION
- **Agent:** `general-purpose`
- **Aufgabe:** 
  1. MediaAsset Interface um ClippingAsset erweitern
  2. ContactEnhanced Interface um JournalistContact erweitern  
  3. Project Interface um MonitoringConfig/Analytics erweitern
  4. projectService um Monitoring-Methoden erweitern
  5. mediaService um Clipping-Methoden erweitern
  6. contactsEnhancedService um Journalist-Tracking erweitern
  7. Alle 5 neuen UI-Komponenten implementieren
  8. 4 bestehende Seiten um Monitoring-Features erweitern
- **Dauer:** 4-5 Tage

### SCHRITT 2: DOKUMENTATION
- **Agent:** `documentation-orchestrator`
- **Aufgabe:** Monitoring-Feature-Status aktualisieren, Masterplan synchronisieren
- **Dauer:** 0.5 Tage

### SCHRITT 3: TYPESCRIPT VALIDATION
- **Agent:** `general-purpose`
- **Aufgabe:** `npm run typecheck` + alle Fehler beheben
- **Erfolgskriterium:** ZERO TypeScript-Errors

### SCHRITT 4: TEST-COVERAGE
- **Agent:** `test-writer`
- **Aufgabe:** Tests bis 100% Coverage implementieren
  - Analytics Dashboard Tests
  - Monitoring Service Tests
  - Clipping-Integration Tests
  - Journalist-Tracking Tests
- **Erfolgskriterium:** `npm test` → ALL PASS

### SCHRITT 5: PLAN-ABSCHLUSS
- **Agent:** `documentation-orchestrator`
- **Aufgabe:** Plan als "✅ COMPLETED" markieren

## 🔐 Sicherheit & Multi-Tenancy
- Alle Monitoring-Daten mit `organizationId` isoliert
- Clippings nur für autorisierte Projekte sichtbar
- API-Keys für Monitoring-Provider sicher gespeichert
- DSGVO-konforme Datensammlung und -löschung

## 📊 Erfolgskriterien
- ✅ Analytics Dashboard zeigt alle Core-KPIs
- ✅ Automatische Clipping-Sammlung funktional
- ✅ Media Library Integration nahtlos
- ✅ Export-Funktionen für Client-Reports
- ✅ Journalist-Performance-Tracking aktiv
- ✅ Multi-Tenancy vollständig implementiert
- ✅ Dashboard lädt in <2 Sekunden
- ✅ ZERO Breaking Changes für bestehende Features

## 💡 Technische Hinweise
- **KEINE neuen Services erfinden** - nur bestehende erweitern
- **1:1 Umsetzung** aus Monitoring-Analyse-Phase-Integration.md
- **Bestehende Media Library nutzen** für Clipping-Storage
- **Bestehende CRM-Integration nutzen** für Journalist-Tracking
- **Design System v2.0 konsequent verwenden**
- **Nur /24/outline Icons verwenden**