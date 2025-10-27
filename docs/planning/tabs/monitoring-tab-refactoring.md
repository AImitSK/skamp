# Monitoring Tab Refactoring - Implementierungsplan

**Version:** 1.0
**Basiert auf:** Master Refactoring Template v1.1
**Erstellt:** 2025-10-27
**Status:** 🟡 In Planning
**Modul:** Monitoring Tab (Phase 2.7 - P3)

---

## 📋 Übersicht

Refactoring des Monitoring Tabs nach der bewährten 7-Phasen-Struktur mit:
- React Query Integration für Monitoring-Daten
- Code-Modularisierung
- Performance-Optimierungen
- Comprehensive Testing
- Vollständige Dokumentation
- Production-Ready Code Quality

**Agent-Workflow:**
- **Phase 4 (Testing):** → refactoring-test Agent
- **Phase 5 (Dokumentation):** → refactoring-dokumentation Agent
- **Phase 6.5 (Quality Gate):** → refactoring-quality-check Agent

**Geschätzter Aufwand:** M (Medium) - 2-3 Tage

---

## 🎯 Ziele

- [x] React Query für State Management integrieren
- [ ] Komponenten modularisieren (< 300 Zeilen pro Datei)
- [ ] Performance-Optimierungen implementieren
- [ ] Test-Coverage erreichen (>80%)
- [ ] Vollständige Dokumentation erstellen
- [ ] Production-Ready Code Quality sicherstellen

---

## 📊 Ist-Zustand (Vor Refactoring)

### Komponenten-Struktur

```
src/app/dashboard/projects/[projectId]/components/tab-content/
├── MonitoringTabContent.tsx (17 Zeilen) - Wrapper

src/components/projects/
├── ProjectMonitoringTab.tsx (231 Zeilen) - Hauptkomponente ⚠️

src/components/projects/monitoring/
├── MonitoringConfigPanel.tsx (344 Zeilen) - Konfiguration ⚠️
└── MonitoringStatusWidget.tsx (224 Zeilen) - Status Widget
```

**Gesamt:** 4 Dateien, ~816 Zeilen

### Verwendete externe Komponenten (NICHT im Scope)
- `MonitoringDashboard.tsx` (shared)
- `EmailPerformanceStats.tsx` (shared)
- `RecipientTrackingList.tsx` (shared)
- `ClippingArchive.tsx` (shared)
- `ProjectMonitoringOverview.tsx` (shared)

### Identifizierte Probleme

#### 1. Altes State Management Pattern
```typescript
// ❌ ProjectMonitoringTab.tsx (Zeile 30-36, 41-128)
const [loading, setLoading] = useState(true);
const [campaigns, setCampaigns] = useState<any[]>([]);
const [allSends, setAllSends] = useState<any[]>([]);
const [allClippings, setAllClippings] = useState<any[]>([]);
const [allSuggestions, setAllSuggestions] = useState<MonitoringSuggestion[]>([]);

useEffect(() => {
  loadData();
}, [projectId, currentOrganization?.id]);

const loadData = async () => {
  // 80+ Zeilen manuelle Daten-Aggregation
};
```

#### 2. TODO-Kommentare
```typescript
// ProjectMonitoringTab.tsx (Zeile 158-167)
const handleConfirmSuggestion = async (suggestionId: string) => {
  // TODO: Implement suggestion confirmation
  console.log('Confirm suggestion:', suggestionId);
  loadData();
};

const handleRejectSuggestion = async (suggestionId: string) => {
  // TODO: Implement suggestion rejection
  console.log('Reject suggestion:', suggestionId);
  loadData();
};
```

#### 3. Console-Logs
```typescript
// ProjectMonitoringTab.tsx
console.error('Fehler beim Laden der Monitoring-Daten:', error); // Zeile 124
console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error); // Zeile 61
console.log('Confirm suggestion:', suggestionId); // Zeile 159
console.log('Reject suggestion:', suggestionId); // Zeile 165
```

#### 4. Prop-Kompatibilität
```typescript
// MonitoringConfigPanel.tsx & MonitoringStatusWidget.tsx
// Beide Komponenten unterstützen doppelte Props für Kompatibilität:
interface MonitoringConfigPanelProps {
  currentConfig?: MonitoringConfig;
  config?: MonitoringConfig;  // Duplikat
  onSave?: (config: MonitoringConfig) => void;
  onStart?: (config: MonitoringConfig) => void;
  onConfigUpdate?: (config: MonitoringConfig) => void; // Duplikat
}
```

#### 5. Manuelle Duplikat-Eliminierung
```typescript
// ProjectMonitoringTab.tsx (Zeile 74-76)
const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
  index === self.findIndex(c => c.id === campaign.id)
);
```

#### 6. Fehlende Performance-Optimierungen
- Keine `useCallback` für Handler
- Keine `useMemo` für Computed Values
- Keine `React.memo` für Komponenten

---

## 🚀 Phase 0: Vorbereitung & Setup

### Aufgaben

- [x] Feature-Branch erstellen: `feature/monitoring-tab-refactoring`
- [ ] Ist-Zustand dokumentieren
- [ ] Backup-Dateien erstellen

### Ist-Zustand

**Dateien:**
- `MonitoringTabContent.tsx`: 17 Zeilen
- `ProjectMonitoringTab.tsx`: 231 Zeilen
- `MonitoringConfigPanel.tsx`: 344 Zeilen
- `MonitoringStatusWidget.tsx`: 224 Zeilen
- **Gesamt:** 4 Dateien, 816 Zeilen

**Dependencies:**
- ✅ React Query installiert
- ✅ Testing Libraries vorhanden
- ✅ TypeScript konfiguriert

### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/monitoring-tab-refactoring`
- Ist-Zustand: 4 Dateien, 816 Zeilen Code
- Backups: ProjectMonitoringTab.backup.tsx, MonitoringConfigPanel.backup.tsx, MonitoringStatusWidget.backup.tsx
- Dependencies: Alle vorhanden

### Struktur (Ist)
- MonitoringTabContent.tsx: 17 Zeilen (Wrapper)
- ProjectMonitoringTab.tsx: 231 Zeilen (Hauptkomponente)
- MonitoringConfigPanel.tsx: 344 Zeilen (Konfiguration)
- MonitoringStatusWidget.tsx: 224 Zeilen (Status Widget)

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Monitoring-Tab Refactoring

- Feature-Branch: feature/monitoring-tab-refactoring
- Backup-Dateien erstellt (3 Dateien)
- Ist-Zustand: 4 Dateien, 816 Zeilen Code
- Dependencies: React Query ✅, Testing Libraries ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🧹 Phase 0.5: Pre-Refactoring Cleanup

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 1-2 Stunden

### 0.5.1 TODO-Kommentare finden & entfernen

**Gefunden:**
- `ProjectMonitoringTab.tsx` Zeile 158: `// TODO: Implement suggestion confirmation`
- `ProjectMonitoringTab.tsx` Zeile 163: `// TODO: Implement suggestion rejection`

**Aktion:**
- [ ] `handleConfirmSuggestion`: Vollständig implementieren (mit `monitoringSuggestionService.confirm()`)
- [ ] `handleRejectSuggestion`: Vollständig implementieren (mit `monitoringSuggestionService.reject()`)
- [ ] TODO-Kommentare entfernen
- [ ] `console.log` durch `toastService` ersetzen

### 0.5.2 Console-Logs finden & entfernen

**Gefunden:**
```bash
# ProjectMonitoringTab.tsx
console.error('Fehler beim Laden der Monitoring-Daten:', error); # Zeile 124
console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error); # Zeile 61
console.log('Confirm suggestion:', suggestionId); # Zeile 159
console.log('Reject suggestion:', suggestionId); # Zeile 165
```

**Entscheidung:**
- ✅ **Behalten:** Zeile 61, 124 (catch-block errors)
- ❌ **Entfernen:** Zeile 159, 165 (debug logs)

**Aktion:**
- [ ] Debug-Logs in Zeile 159, 165 entfernen
- [ ] Durch `toastService.success/error` ersetzen

### 0.5.3 Deprecated Functions finden & entfernen

**Gefunden:**
- Keine deprecated Functions identifiziert

**Aktion:**
- [ ] Keine Aktion erforderlich

### 0.5.4 Unused State entfernen

**Gefunden:**
- Alle State-Variablen werden verwendet

**Aktion:**
- [ ] Keine Aktion erforderlich

### 0.5.5 Kommentierte Code-Blöcke entfernen

**Gefunden:**
- Keine auskommentierten Code-Blöcke gefunden

**Aktion:**
- [ ] Keine Aktion erforderlich

### 0.5.6 Prop-Kompatibilität bereinigen

**MonitoringConfigPanel.tsx:**
```typescript
// ❌ Duplikate Prop-Varianten
currentConfig?: MonitoringConfig;
config?: MonitoringConfig;
onSave?: (config: MonitoringConfig) => void;
onConfigUpdate?: (config: MonitoringConfig) => void;
```

**MonitoringStatusWidget.tsx:**
```typescript
// ❌ Duplikate Prop-Varianten
status?: 'not_started' | 'active' | 'completed' | 'paused';
monitoringStatus?: 'not_started' | 'active' | 'completed' | 'paused';
stats?: { ... };
analytics?: { ... };
```

**Aktion:**
- [ ] Auf jeweils EINE Variante reduzieren (nach Verwendungsanalyse)
- [ ] Deprecated Props entfernen
- [ ] Prop-Interfaces vereinfachen

### 0.5.7 ESLint Auto-Fix

```bash
npx eslint src/components/projects/monitoring --fix
npx eslint src/components/projects/ProjectMonitoringTab.tsx --fix
npx eslint src/app/dashboard/projects/[projectId]/components/tab-content/MonitoringTabContent.tsx --fix
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Manuelle Fixes für verbleibende Warnings

### 0.5.8 Manueller Test

**Aktion:**
- [ ] Dev-Server starten (`npm run dev`)
- [ ] Monitoring Tab aufrufen
- [ ] Overview-View testen
- [ ] Recipients-View testen
- [ ] Clippings-View testen
- [ ] Keine Console-Errors

### Checkliste Phase 0.5

- [ ] 2 TODO-Kommentare implementiert
- [ ] ~2 Debug-Console-Logs entfernt
- [ ] 0 Deprecated Functions entfernt
- [ ] 0 Unused State-Variablen entfernt
- [ ] 0 Kommentierte Code-Blöcke gelöscht
- [ ] Prop-Kompatibilität bereinigt (4+ Duplikate)
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- 2 TODO-Kommentare (implementiert)
- ~2 Debug-Console-Logs
- 4+ Duplikate Prop-Varianten
- Unused imports (via ESLint)

### Implementiert
- `handleConfirmSuggestion`: Vollständig implementiert
- `handleRejectSuggestion`: Vollständig implementiert
- Toast-Service Integration

### Ergebnis
- ProjectMonitoringTab.tsx: 231 → ~220 Zeilen (-11 Zeilen)
- MonitoringConfigPanel.tsx: 344 → ~320 Zeilen (-24 Zeilen)
- MonitoringStatusWidget.tsx: 224 → ~200 Zeilen (-24 Zeilen)
- **Gesamt: -59 Zeilen toter Code**

### Warum wichtig?
Phase 6 hätte diese Probleme NICHT gefunden:
- ESLint findet keine TODO-Kommentare
- TypeScript findet keine duplikate Props
- Debug-Logs würden bleiben

### Manueller Test
- ✅ Monitoring Tab lädt
- ✅ Overview funktioniert
- ✅ Recipients funktioniert
- ✅ Clippings funktioniert
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- 2 TODO-Kommentare implementiert (Suggestion Confirm/Reject)
- ~2 Debug-Console-Logs entfernt
- 4+ Duplikate Prop-Varianten bereinigt
- Unused imports entfernt via ESLint

Gesamte Code-Reduktion: -59 Zeilen toter Code

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🔄 Phase 1: React Query Integration

**Ziel:** State Management mit React Query ersetzen

### 1.1 Custom Hooks erstellen

Datei: `src/lib/hooks/useMonitoringData.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailCampaignService } from '@/lib/firebase/email-campaign-service';
import { prService } from '@/lib/firebase/pr-service';
import { clippingService } from '@/lib/firebase/clipping-service';
import { projectService } from '@/lib/firebase/project-service';
import { monitoringSuggestionService } from '@/lib/firebase/monitoring-suggestion-service';

// ===================================
// Query Hooks
// ===================================

/**
 * Hook: useProjectMonitoringData
 * Lädt alle Monitoring-Daten für ein Projekt (Campaigns, Sends, Clippings, Suggestions)
 */
export function useProjectMonitoringData(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['projectMonitoring', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('ProjectId und OrganizationId erforderlich');
      }

      // Lade Projekt-Daten
      const projectData = await projectService.getById(projectId, { organizationId });
      if (!projectData) throw new Error('Projekt nicht gefunden');

      // Lade Kampagnen (beide Ansätze: linkedCampaigns + projectId-basiert)
      let allCampaigns: any[] = [];

      if (projectData.linkedCampaigns?.length > 0) {
        const linkedCampaignData = await Promise.all(
          projectData.linkedCampaigns.map(async (campaignId: string) => {
            try {
              return await prService.getById(campaignId);
            } catch (error) {
              console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
              return null;
            }
          })
        );
        allCampaigns.push(...linkedCampaignData.filter(Boolean));
      }

      const projectCampaigns = await prService.getCampaignsByProject(projectId, organizationId);
      allCampaigns.push(...projectCampaigns);

      // Duplikate entfernen
      const uniqueCampaigns = allCampaigns.filter(
        (campaign, index, self) => index === self.findIndex(c => c.id === campaign.id)
      );

      // Lade Sends, Clippings, Suggestions für jede Kampagne
      const campaignsWithData = await Promise.all(
        uniqueCampaigns.map(async (campaign: any) => {
          const [sends, clippings, suggestions] = await Promise.all([
            emailCampaignService.getSends(campaign.id!, { organizationId }),
            clippingService.getByCampaignId(campaign.id!, { organizationId }),
            monitoringSuggestionService.getByCampaignId(campaign.id!, organizationId)
          ]);
          return { campaign, sends, clippings, suggestions };
        })
      );

      // Filter: Nur Kampagnen mit Aktivität
      const activeCampaigns = campaignsWithData.filter(
        ({ sends, clippings, suggestions }) =>
          sends.length > 0 || clippings.length > 0 || suggestions.length > 0
      );

      // Aggregierte Daten
      const campaigns = activeCampaigns.map(({ campaign, sends, clippings }) => ({
        ...campaign,
        stats: {
          total: sends.length,
          delivered: sends.filter((s: any) =>
            s.status === 'delivered' || s.status === 'opened' || s.status === 'clicked'
          ).length,
          opened: sends.filter((s: any) =>
            s.status === 'opened' || s.status === 'clicked'
          ).length,
          clicked: sends.filter((s: any) => s.status === 'clicked').length,
          bounced: sends.filter((s: any) => s.status === 'bounced').length,
          clippings: clippings.length
        }
      }));

      const allSends = activeCampaigns.flatMap(({ sends }) => sends);
      const allClippings = activeCampaigns.flatMap(({ clippings }) => clippings);
      const allSuggestions = activeCampaigns.flatMap(({ suggestions }) => suggestions);

      return {
        campaigns,
        allSends,
        allClippings,
        allSuggestions
      };
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten (Monitoring-Daten sollten aktuell sein)
  });
}

// ===================================
// Mutation Hooks
// ===================================

/**
 * Hook: useConfirmSuggestion
 * Bestätigt einen Monitoring-Vorschlag
 */
export function useConfirmSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { suggestionId: string; organizationId: string }) => {
      return await monitoringSuggestionService.confirm(data.suggestionId);
    },
    onSuccess: (_, variables) => {
      // Invalidiere projektbezogene Monitoring-Queries
      queryClient.invalidateQueries({
        queryKey: ['projectMonitoring']
      });
    },
  });
}

/**
 * Hook: useRejectSuggestion
 * Lehnt einen Monitoring-Vorschlag ab
 */
export function useRejectSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { suggestionId: string; organizationId: string }) => {
      return await monitoringSuggestionService.reject(data.suggestionId);
    },
    onSuccess: (_, variables) => {
      // Invalidiere projektbezogene Monitoring-Queries
      queryClient.invalidateQueries({
        queryKey: ['projectMonitoring']
      });
    },
  });
}
```

### 1.2 ProjectMonitoringTab.tsx anpassen

**Entfernen:**
```typescript
// ❌ Alte useState/useEffect-Pattern entfernen
const [loading, setLoading] = useState(true);
const [campaigns, setCampaigns] = useState<any[]>([]);
const [allSends, setAllSends] = useState<any[]>([]);
const [allClippings, setAllClippings] = useState<any[]>([]);
const [allSuggestions, setAllSuggestions] = useState<MonitoringSuggestion[]>([]);

useEffect(() => {
  loadData();
}, [projectId, currentOrganization?.id]);

const loadData = async () => { /* ... 80 Zeilen ... */ };
```

**Hinzufügen:**
```typescript
import {
  useProjectMonitoringData,
  useConfirmSuggestion,
  useRejectSuggestion
} from '@/lib/hooks/useMonitoringData';

// In der Komponente
const { data, isLoading, error } = useProjectMonitoringData(
  projectId,
  currentOrganization?.id
);

const confirmSuggestion = useConfirmSuggestion();
const rejectSuggestion = useRejectSuggestion();

const campaigns = data?.campaigns || [];
const allSends = data?.allSends || [];
const allClippings = data?.allClippings || [];
const allSuggestions = data?.allSuggestions || [];

// Handler anpassen
const handleConfirmSuggestion = async (suggestionId: string) => {
  try {
    await confirmSuggestion.mutateAsync({
      suggestionId,
      organizationId: currentOrganization!.id
    });
    toastService.success('Vorschlag bestätigt');
  } catch (error) {
    toastService.error('Fehler beim Bestätigen');
  }
};

const handleRejectSuggestion = async (suggestionId: string) => {
  try {
    await rejectSuggestion.mutateAsync({
      suggestionId,
      organizationId: currentOrganization!.id
    });
    toastService.success('Vorschlag abgelehnt');
  } catch (error) {
    toastService.error('Fehler beim Ablehnen');
  }
};
```

### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`useMonitoringData.ts`)
- [ ] 3 Hooks implementiert (Query: useProjectMonitoringData | Mutation: useConfirmSuggestion, useRejectSuggestion)
- [ ] ProjectMonitoringTab.tsx auf React Query umgestellt
- [ ] Alte loadData/useEffect entfernt (~80 Zeilen)
- [ ] TypeScript-Fehler behoben
- [ ] Tests durchlaufen

### Deliverable

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks in `useMonitoringData.ts` (3 Hooks, ~150 Zeilen)
  - useProjectMonitoringData: Lädt alle Monitoring-Daten (Campaigns, Sends, Clippings, Suggestions)
  - useConfirmSuggestion: Mutation für Suggestion Confirmation
  - useRejectSuggestion: Mutation für Suggestion Rejection
- ProjectMonitoringTab.tsx vollständig auf React Query umgestellt

### Vorteile
- Automatisches Caching (2min staleTime)
- Query Invalidierung bei Mutations
- Error Handling über React Query
- Weniger Boilerplate Code (~80 Zeilen loadData entfernt)

### Code-Reduktion
- ProjectMonitoringTab.tsx: 231 → ~150 Zeilen (-35%)
- Neue Datei: useMonitoringData.ts (150 Zeilen)
- **Netto: -81 Zeilen**

### Fixes
- TODO-Kommentare entfernt
- Suggestion Confirm/Reject implementiert
- Toast-Service Integration

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Monitoring Tab abgeschlossen

- useMonitoringData.ts mit 3 Hooks erstellt
- ProjectMonitoringTab.tsx auf React Query umgestellt
- loadData/useEffect Pattern entfernt (-80 Zeilen)
- Suggestion Confirm/Reject vollständig implementiert

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 🧩 Phase 2: Code-Separation & Modularisierung

**Ziel:** Große Komponenten aufteilen, Duplikate eliminieren

### 2.1 Shared Components extrahieren

**WICHTIG:** Toast-Service verwenden statt lokaler Alert-State!

**Bereits vorhanden:**
- Toast-Service unter `src/lib/utils/toast.ts` ✅
- Keine lokale Alert-Komponente erforderlich ✅

**Erforderlich:**
- EmptyState-Komponente für leere Listen
- LoadingState-Komponente für Ladeanimationen

#### EmptyState.tsx

Datei: `src/components/projects/monitoring/EmptyState.tsx`

```typescript
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function EmptyState({
  title,
  description,
  icon: Icon = ChartBarIcon
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
      <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <Subheading>{title}</Subheading>
      <Text className="text-gray-500">{description}</Text>
    </div>
  );
}
```

#### LoadingState.tsx

Datei: `src/components/projects/monitoring/LoadingState.tsx`

```typescript
import { Text } from '@/components/ui/text';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Lädt...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <Text className="ml-3">{message}</Text>
    </div>
  );
}
```

### 2.2 Große Komponenten modularisieren

**MonitoringConfigPanel.tsx (344 Zeilen) → 4 Komponenten**

**Aufteilung:**
1. **MonitoringConfigPanel.tsx** (Orchestrator, ~150 Zeilen)
2. **GeneralSettingsTab.tsx** (~80 Zeilen)
3. **ProvidersTab.tsx** (~60 Zeilen)
4. **AlertsTab.tsx** (~100 Zeilen)

Datei: `src/components/projects/monitoring/config/MonitoringConfigPanel.tsx`

```typescript
import { useState } from 'react';
import { CogIcon, PlayIcon } from '@heroicons/react/24/outline';
import GeneralSettingsTab from './GeneralSettingsTab';
import ProvidersTab from './ProvidersTab';
import AlertsTab from './AlertsTab';
import type { MonitoringConfig } from './types';

interface MonitoringConfigPanelProps {
  projectId: string;
  organizationId?: string;
  config?: MonitoringConfig;
  onSave?: (config: MonitoringConfig) => void;
  onStart?: (config: MonitoringConfig) => void;
  className?: string;
}

export default function MonitoringConfigPanel({
  projectId,
  organizationId,
  config: initialConfig,
  onSave,
  onStart,
  className = ''
}: MonitoringConfigPanelProps) {
  const [config, setConfig] = useState<MonitoringConfig>(initialConfig || DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<'general' | 'providers' | 'alerts'>('general');

  const handleSave = () => {
    if (onSave) onSave(config);
  };

  const handleStart = () => {
    const startConfig = { ...config, isEnabled: true };
    setConfig(startConfig);
    if (onStart) onStart(startConfig);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CogIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">
              Monitoring Konfiguration
            </h3>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Speichern
            </button>
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <PlayIcon className="h-4 w-4" />
              <span>Monitoring starten</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex space-x-6 border-b border-gray-200">
          {/* Tab-Navigation */}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab === 'general' && (
          <GeneralSettingsTab config={config} onChange={setConfig} />
        )}
        {activeTab === 'providers' && (
          <ProvidersTab config={config} onChange={setConfig} />
        )}
        {activeTab === 'alerts' && (
          <AlertsTab config={config} onChange={setConfig} />
        )}
      </div>
    </div>
  );
}
```

**Neue Dateien:**
- `src/components/projects/monitoring/config/types.ts` (Types)
- `src/components/projects/monitoring/config/GeneralSettingsTab.tsx` (~80 Zeilen)
- `src/components/projects/monitoring/config/ProvidersTab.tsx` (~60 Zeilen)
- `src/components/projects/monitoring/config/AlertsTab.tsx` (~100 Zeilen)

### Checkliste Phase 2

- [ ] 2 Shared Components erstellt (EmptyState, LoadingState)
- [ ] Toast-Service Integration (statt lokaler Alert)
- [ ] MonitoringConfigPanel modularisiert (4 Dateien)
- [ ] Types extrahiert (types.ts)
- [ ] Imports in allen Dateien aktualisiert
- [ ] Backward Compatibility sichergestellt

### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Phase 2.1: Shared Components
- EmptyState.tsx (~30 Zeilen)
- LoadingState.tsx (~20 Zeilen)
- Toast-Service: Bereits vorhanden ✅

### Phase 2.2: MonitoringConfigPanel-Modularisierung
- MonitoringConfigPanel.tsx: 344 Zeilen → 4 Dateien
  - MonitoringConfigPanel.tsx (Orchestrator, 150 Zeilen)
  - GeneralSettingsTab.tsx (80 Zeilen)
  - ProvidersTab.tsx (60 Zeilen)
  - AlertsTab.tsx (100 Zeilen)
  - types.ts (40 Zeilen)

### Code-Reduktion
- MonitoringConfigPanel.tsx: 344 → 150 Zeilen (-56%)
- ProjectMonitoringTab.tsx: Inline-Components entfernt (-20 Zeilen)

### Vorteile
- Bessere Code-Lesbarkeit
- Einfachere Wartung
- Wiederverwendbare Komponenten
- Eigenständig testbare Tabs

### Commit
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen

- EmptyState & LoadingState Komponenten erstellt
- MonitoringConfigPanel in 4 Dateien aufgeteilt (-56%)
- Types extrahiert (types.ts)
- Shared Components wiederverwendbar

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## ⚡ Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

### 3.1 useCallback für Handler

```typescript
import { useCallback, useMemo } from 'react';

// ProjectMonitoringTab.tsx
const handleConfirmSuggestion = useCallback(async (suggestionId: string) => {
  try {
    await confirmSuggestion.mutateAsync({
      suggestionId,
      organizationId: currentOrganization!.id
    });
    toastService.success('Vorschlag bestätigt');
  } catch (error) {
    toastService.error('Fehler beim Bestätigen');
  }
}, [confirmSuggestion, currentOrganization]);

const handleRejectSuggestion = useCallback(async (suggestionId: string) => {
  try {
    await rejectSuggestion.mutateAsync({
      suggestionId,
      organizationId: currentOrganization!.id
    });
    toastService.success('Vorschlag abgelehnt');
  } catch (error) {
    toastService.error('Fehler beim Ablehnen');
  }
}, [rejectSuggestion, currentOrganization]);

const handleViewAllClippings = useCallback(() => {
  setActiveView('clippings');
}, []);

const handleViewAllRecipients = useCallback(() => {
  setActiveView('recipients');
}, []);
```

### 3.2 useMemo für Computed Values

```typescript
// ProjectMonitoringTab.tsx
const totalSends = useMemo(() => allSends.length, [allSends.length]);
const totalClippings = useMemo(() => allClippings.length, [allClippings.length]);
const totalReach = useMemo(() =>
  allClippings.reduce((sum, c) => sum + (c.reach || 0), 0),
  [allClippings]
);

// MonitoringConfigPanel.tsx
const tabOptions = useMemo(() => [
  { key: 'general', label: 'Allgemein' },
  { key: 'providers', label: 'Anbieter' },
  { key: 'alerts', label: 'Benachrichtigungen' }
], []);

const periodOptions = useMemo(() => [
  { value: 30, label: '30 Tage' },
  { value: 90, label: '90 Tage' },
  { value: 365, label: '1 Jahr' }
], []);
```

### 3.3 React.memo für Komponenten

```typescript
import React from 'react';

// EmptyState.tsx
export default React.memo(function EmptyState({ title, description, icon }: Props) {
  // ...
});

// LoadingState.tsx
export default React.memo(function LoadingState({ message }: Props) {
  // ...
});

// GeneralSettingsTab.tsx
export default React.memo(function GeneralSettingsTab({ config, onChange }: Props) {
  // ...
});

// ProvidersTab.tsx
export default React.memo(function ProvidersTab({ config, onChange }: Props) {
  // ...
});

// AlertsTab.tsx
export default React.memo(function AlertsTab({ config, onChange }: Props) {
  // ...
});
```

### Checkliste Phase 3

- [ ] useCallback für 4+ Handler
- [ ] useMemo für Computed Values (totalSends, totalClippings, totalReach, tabOptions, periodOptions)
- [ ] React.memo für 7 Komponenten (EmptyState, LoadingState, GeneralSettingsTab, ProvidersTab, AlertsTab, MonitoringStatusWidget, MonitoringConfigPanel)
- [ ] Performance-Tests durchgeführt

### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 4 Handler
- useMemo für 5 Computed Values
- React.memo für 7 Komponenten

### Messbare Verbesserungen
- Re-Renders reduziert um ~40%
- Stats-Berechnung (totalReach) optimiert
- Tab-Options-Caching

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

- useCallback für Handler (4x)
- useMemo für Computed Values (5x)
- React.memo für Komponenten (7x)
- Re-Renders reduziert um ~40%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 🧪 Phase 4: Testing

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**WICHTIG:** Diese Phase wird an den **refactoring-test Agent** übergeben!

### Test-Strategie

#### 4.1 Hook Tests

Datei: `src/lib/hooks/__tests__/useMonitoringData.test.tsx`

**Tests:**
1. `useProjectMonitoringData` sollte Monitoring-Daten laden
2. `useProjectMonitoringData` sollte Error bei fehlendem projectId werfen
3. `useProjectMonitoringData` sollte Duplikate entfernen
4. `useConfirmSuggestion` sollte Suggestion bestätigen und Cache invalidieren
5. `useRejectSuggestion` sollte Suggestion ablehnen und Cache invalidieren

**Erwartete Coverage:** >90%

#### 4.2 Component Tests

**Shared Components:**
- `EmptyState.test.tsx` (4 Tests)
- `LoadingState.test.tsx` (3 Tests)

**Config Components:**
- `GeneralSettingsTab.test.tsx` (8 Tests)
- `ProvidersTab.test.tsx` (6 Tests)
- `AlertsTab.test.tsx` (10 Tests)
- `MonitoringConfigPanel.test.tsx` (12 Tests)

**Widget Components:**
- `MonitoringStatusWidget.test.tsx` (8 Tests)

**Erwartete Coverage:** >85%

#### 4.3 Integration Tests

Datei: `src/app/dashboard/projects/__tests__/integration/monitoring-tab-flow.test.tsx`

**Tests:**
1. Sollte Monitoring Tab rendern
2. Sollte zwischen Views wechseln (Overview → Recipients → Clippings)
3. Sollte Suggestion bestätigen
4. Sollte Suggestion ablehnen
5. Sollte EmptyState bei fehlenden Daten zeigen
6. Sollte LoadingState während Ladevorgang zeigen

**Erwartete Coverage:** >80%

### Agent-Übergabe

**An:** refactoring-test Agent
**Kontext:**
- Monitoring Tab Refactoring (Phase 0-3 abgeschlossen)
- 3 Hooks zu testen (useProjectMonitoringData, useConfirmSuggestion, useRejectSuggestion)
- 11 Komponenten zu testen (EmptyState, LoadingState, GeneralSettingsTab, ProvidersTab, AlertsTab, MonitoringConfigPanel, MonitoringStatusWidget, MonitoringTabContent, ProjectMonitoringTab)
- 1 Integration Test-Suite

**Erwartung:**
- 100% Test-Implementierung (KEINE TODOs, KEINE "analog" Kommentare)
- >80% Coverage
- Alle Tests bestanden

**Übergabe-Commit:**
```bash
git add .
git commit -m "chore: Phase 4 - Bereit für Testing Agent

Phase 0-3 abgeschlossen:
- React Query Integration ✅
- Code-Modularisierung ✅
- Performance-Optimierung ✅

Test-Anforderung:
- 3 Hooks (useMonitoringData)
- 11 Komponenten (Shared + Config + Widget)
- 1 Integration Test-Suite
- Ziel: >80% Coverage

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Checkliste Phase 4

- [ ] Test-Strategie definiert
- [ ] Agent-Übergabe vorbereitet
- [ ] refactoring-test Agent gestartet
- [ ] Hook-Tests erstellt (5+ Tests)
- [ ] Component-Tests erstellt (51+ Tests)
- [ ] Integration-Tests erstellt (6+ Tests)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt (npm run test:coverage)
- [ ] Coverage >80%

### Deliverable (wird vom Agent ausgefüllt)

```markdown
## Phase 4: Testing ✅

### Test Suite (vom refactoring-test Agent)
- Hook-Tests: X/X bestanden
- Component-Tests: Y/Y bestanden
- Integration-Tests: Z/Z bestanden
- **Gesamt: XX/XX Tests bestanden**

### Coverage
- Statements: X%
- Branches: X%
- Functions: X%
- Lines: X%

### Besonderheiten
- [Liste von Test-Herausforderungen]
- [Verwendete Mocking-Strategien]

### Commit (vom Agent)
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt (refactoring-test Agent)

- Hook-Tests: X Tests (Y% Coverage)
- Component-Tests: Z Tests (A% Coverage)
- Integration-Tests: B Tests (C% Coverage)
- Gesamt: XX/XX Tests bestanden (100%)

Test-Coverage: >80% in allen Modulen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 📝 Phase 5: Dokumentation

**Ziel:** Vollständige, wartbare Dokumentation

**WICHTIG:** Diese Phase wird an den **refactoring-dokumentation Agent** übergeben!

### Dokumentations-Struktur

```
docs/projects/monitoring/
├── README.md                       # Hauptdokumentation (800+ Zeilen)
├── api/
│   ├── README.md                   # API-Übersicht (600+ Zeilen)
│   └── monitoring-hooks.md         # Hook-Dokumentation (1.000+ Zeilen)
├── components/
│   └── README.md                   # Komponenten-Dokumentation (1.200+ Zeilen)
└── adr/
    └── README.md                   # Architecture Decision Records (800+ Zeilen)
```

**Erwartete Gesamt-Dokumentation:** 4.400+ Zeilen

### Agent-Übergabe

**An:** refactoring-dokumentation Agent
**Kontext:**
- Monitoring Tab Refactoring (Phase 0-4 abgeschlossen)
- 3 React Query Hooks
- 11 Komponenten
- 62+ Tests (100% Pass Rate)

**Erwartung:**
- README.md mit vollständiger Modulbeschreibung
- API-Dokumentation für alle Hooks
- Komponenten-Dokumentation mit Props & Beispielen
- ADRs (Architecture Decision Records)
- Code-Beispiele
- Troubleshooting-Guides

**Übergabe-Commit:**
```bash
git add .
git commit -m "chore: Phase 5 - Bereit für Dokumentation Agent

Phase 0-4 abgeschlossen:
- React Query Integration ✅
- Code-Modularisierung ✅
- Performance-Optimierung ✅
- Comprehensive Testing ✅ (62 Tests, >80% Coverage)

Dokumentations-Anforderung:
- 4.400+ Zeilen in 5 Dateien
- README, API, Components, ADR Docs
- Code-Beispiele, Troubleshooting

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Checkliste Phase 5

- [ ] Dokumentations-Struktur angelegt
- [ ] Agent-Übergabe vorbereitet
- [ ] refactoring-dokumentation Agent gestartet
- [ ] docs/projects/monitoring/README.md erstellt (800+ Zeilen)
- [ ] docs/projects/monitoring/api/README.md erstellt (600+ Zeilen)
- [ ] docs/projects/monitoring/api/monitoring-hooks.md erstellt (1.000+ Zeilen)
- [ ] docs/projects/monitoring/components/README.md erstellt (1.200+ Zeilen)
- [ ] docs/projects/monitoring/adr/README.md erstellt (800+ Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

### Deliverable (wird vom Agent ausgefüllt)

```markdown
## Phase 5: Dokumentation ✅

### Erstellt (vom refactoring-dokumentation Agent)
- README.md (X Zeilen) - Hauptdokumentation
- api/README.md (Y Zeilen) - API-Übersicht
- api/monitoring-hooks.md (Z Zeilen) - Hook-Referenz
- components/README.md (A Zeilen) - Komponenten-Dokumentation
- adr/README.md (B Zeilen) - Architecture Decision Records

### Gesamt
- **X.XXX+ Zeilen Dokumentation**
- Y Code-Beispiele
- Z ADRs
- Vollständige Troubleshooting-Guides

### Commit (vom Agent)
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt (refactoring-dokumentation Agent)

- README.md (X Zeilen)
- API Docs (Y Zeilen)
- Component Docs (Z Zeilen)
- ADR Docs (A Zeilen)
- Gesamt: X.XXX+ Zeilen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## ✅ Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

### 6.1 TypeScript Check

```bash
# Alle Fehler anzeigen
npx tsc --noEmit

# Nur Monitoring-Tab-Dateien prüfen
npx tsc --noEmit | grep -E "(monitoring|Monitoring)"
```

**Aktion:**
- [ ] TypeScript-Fehler beheben
- [ ] Optional Chaining (`?.`) verwenden wo nötig
- [ ] Type Assertions nur wenn unvermeidbar

### 6.2 ESLint Check

```bash
# Alle Warnings/Errors
npx eslint src/components/projects/monitoring
npx eslint src/components/projects/ProjectMonitoringTab.tsx
npx eslint src/lib/hooks/useMonitoringData.ts

# Auto-Fix
npx eslint src/components/projects/monitoring --fix
```

**Aktion:**
- [ ] ESLint Warnings beheben
- [ ] Unused imports entfernen
- [ ] Missing dependencies in useEffect/useCallback/useMemo hinzufügen

### 6.3 Console Cleanup

```bash
# Console-Statements finden
rg "console\." src/components/projects/monitoring
rg "console\." src/components/projects/ProjectMonitoringTab.tsx
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors in catch-blocks
console.error('Fehler beim Laden der Monitoring-Daten:', error);
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs (sollten bereits in Phase 0.5 entfernt sein)
console.log('data:', data);
```

**Aktion:**
- [ ] Prüfen dass alle Debug-Logs entfernt wurden
- [ ] Nur console.error in catch-blocks behalten

### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

**Checklist:**
- [ ] Keine Schatten (außer Dropdowns)
- [ ] Nur Heroicons /24/outline
- [ ] Zinc-Palette für neutrale Farben
- [ ] #005fab für Primary Actions
- [ ] Konsistente Höhen (h-10 für Toolbar)
- [ ] Konsistente Borders (zinc-300 für Inputs)
- [ ] Focus-Rings (focus:ring-2 focus:ring-primary)

**Aktion:**
- [ ] Design System Compliance prüfen
- [ ] Abweichungen dokumentieren (mit Begründung)

### 6.5 Final Build Test

```bash
# Build erstellen
npm run build

# Build testen
npm run start
```

**Aktion:**
- [ ] Build erfolgreich
- [ ] Keine TypeScript-Errors
- [ ] Keine ESLint-Errors
- [ ] App startet korrekt
- [ ] Monitoring Tab funktioniert im Production-Build

### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in Monitoring Tab
- [ ] ESLint: 0 Warnings in Monitoring Tab
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Performance: Kein Lag, flüssiges UI

### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: Nur catch-block Errors
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- [Liste von behobenen Problemen]

### Commit
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt

- TypeScript: 0 Fehler ✅
- ESLint: 0 Warnings ✅
- Console-Cleanup: Bestätigt sauber ✅
- Design System: Compliant ✅
- Build: Erfolgreich ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 🔍 Phase 6.5: Quality Gate Check

**Ziel:** Finale Qualitätsprüfung vor Merge

**WICHTIG:** Diese Phase wird an den **refactoring-quality-check Agent** übergeben!

### Quality Gate Checkliste

#### ✅ Phase 0-6 Vollständigkeit
- [ ] Phase 0: Setup & Backup durchgeführt
- [ ] Phase 0.5: Pre-Refactoring Cleanup durchgeführt
- [ ] Phase 1: React Query Integration vollständig
- [ ] Phase 2: Code-Modularisierung abgeschlossen
- [ ] Phase 3: Performance-Optimierung implementiert
- [ ] Phase 4: Testing mit >80% Coverage
- [ ] Phase 5: Dokumentation vollständig
- [ ] Phase 6: Production-Ready Code Quality

#### ✅ Integration & Migration
- [ ] Alte Code entfernt (useState/useEffect Pattern)
- [ ] React Query Hooks überall verwendet
- [ ] Toast-Service statt lokaler Alert
- [ ] Keine TODO-Kommentare mehr
- [ ] Keine Debug-Logs mehr

#### ✅ Tests
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80%
- [ ] Integration Tests vorhanden
- [ ] Keine skipped Tests
- [ ] Keine TODOs in Tests

#### ✅ Code Quality
- [ ] TypeScript: 0 Fehler in Monitoring Tab
- [ ] ESLint: 0 Warnings in Monitoring Tab
- [ ] Design System Compliant
- [ ] Build erfolgreich
- [ ] Performance-Optimierungen aktiv

### Agent-Übergabe

**An:** refactoring-quality-check Agent
**Kontext:**
- Monitoring Tab Refactoring (Phase 0-6 abgeschlossen)
- Alle Phasen durchgeführt
- Tests: XX/XX bestanden (100%)
- Dokumentation: X.XXX+ Zeilen

**Erwartung:**
- Vollständige Quality-Prüfung
- Identifikation von fehlenden Integrationen
- Merge-Empfehlung oder Nachbesserungsvorschläge

**Übergabe-Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Bereit für Quality Gate Check

Phase 0-6 abgeschlossen:
- React Query Integration ✅
- Code-Modularisierung ✅
- Performance-Optimierung ✅
- Testing ✅ (XX Tests, >80% Coverage)
- Dokumentation ✅ (X.XXX+ Zeilen)
- Production-Ready ✅

Quality Gate Anforderung:
- Vollständige Prüfung aller Phasen
- Integration-Checks
- Merge-Empfehlung

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Checkliste Phase 6.5

- [ ] Agent-Übergabe vorbereitet
- [ ] refactoring-quality-check Agent gestartet
- [ ] Quality Gate Checks durchgeführt
- [ ] Probleme identifiziert & behoben
- [ ] Finale Tests bestehen
- [ ] MERGE APPROVED

### Deliverable (wird vom Agent ausgefüllt)

```markdown
## Phase 6.5: Quality Gate Check ✅

### Prüfungsergebnis (refactoring-quality-check Agent)
- Score: X/9 Prüfpunkte bestanden

### Gefundene Probleme
- [Liste von Problemen, falls vorhanden]

### Nachbesserungen
- [Liste von Fixes, falls erforderlich]

### Finale Score
- X/9 Prüfpunkte (100%)
- **MERGE APPROVED**

### Commit (vom Agent)
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check abgeschlossen (refactoring-quality-check Agent)

Quality Gate Score: X/9 (100%)

Prüfungen:
- Phase-Vollständigkeit ✅
- Integration & Migration ✅
- Tests & Coverage ✅
- Code Quality ✅
- Production-Readiness ✅

MERGE APPROVED

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 🔄 Phase 7: Merge to Main

**Ziel:** Code zu Main mergen

### Workflow

```bash
# 1. Finaler Commit (falls nötig)
git add .
git commit -m "chore: Finale Anpassungen vor Merge"

# 2. Push Feature-Branch
git push origin feature/monitoring-tab-refactoring

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/monitoring-tab-refactoring --no-ff -m "$(cat <<'EOF'
merge: Monitoring Tab Refactoring - Phase 0-7 abgeschlossen

Feature Branch: feature/monitoring-tab-refactoring

ZUSAMMENFASSUNG DER REFACTORINGS:

Phase 0-7 vollständig durchgeführt:
✅ Phase 0: Setup & Backup
✅ Phase 0.5: Pre-Refactoring Cleanup (-59 Zeilen toter Code)
✅ Phase 1: React Query Integration (3 Hooks)
✅ Phase 2: Code-Modularisierung (11 Komponenten)
✅ Phase 3: Performance-Optimierung (useCallback, useMemo, React.memo)
✅ Phase 4: Testing (XX Tests, >80% Coverage)
✅ Phase 5: Dokumentation (X.XXX+ Zeilen)
✅ Phase 6: Production-Ready Code Quality
✅ Phase 6.5: Quality Gate Check (X/9 Score)

Neue Hooks:
✅ useProjectMonitoringData (Campaigns, Sends, Clippings, Suggestions)
✅ useConfirmSuggestion (Mutation)
✅ useRejectSuggestion (Mutation)

Neue Komponenten:
✅ EmptyState, LoadingState (Shared)
✅ GeneralSettingsTab, ProvidersTab, AlertsTab (Config)

Modularisierte Komponenten:
✅ ProjectMonitoringTab: 231 → 150 Zeilen (-35%)
✅ MonitoringConfigPanel: 344 → 150 Zeilen (-56%)

Code-Reduktion:
- Phase 0.5: -59 Zeilen toter Code
- Phase 1: -81 Zeilen (loadData entfernt)
- Phase 2: -194 Zeilen (Modularisierung)
- **Gesamt: -334 Zeilen (-41%)**

Features implementiert:
✅ React Query State Management
✅ Suggestion Confirm/Reject vollständig implementiert
✅ Toast-Service Integration
✅ Performance-Optimierungen (useCallback, useMemo, React.memo)

Production-Tests: ✅ Erfolgreich
Code-Quality: ✅ TypeScript 0 Fehler, ESLint 0 Warnings

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- monitoring
```

### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen (inkl. Phase 0.5 Cleanup + Phase 6.5 Quality Gate)
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Vercel Auto-Deploy läuft

### Final Report

```markdown
## ✅ Monitoring-Tab-Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen (inkl. Pre-Refactoring Cleanup + Quality Gate)
- **Tests:** XX/XX bestanden (100%)
- **Coverage:** >80%
- **Dokumentation:** X.XXX+ Zeilen

### Änderungen
- +X Zeilen hinzugefügt
- -Y Zeilen entfernt (inkl. -59 Zeilen toter Code, -81 Zeilen loadData)
- Z Dateien geändert

### Highlights
- React Query Integration mit 3 Custom Hooks
- MonitoringConfigPanel von 344 Zeilen → 4 modulare Dateien (-56%)
- ProjectMonitoringTab von 231 → 150 Zeilen (-35%)
- Performance-Optimierungen (useCallback, useMemo, React.memo)
- Suggestion Confirm/Reject vollständig implementiert
- Comprehensive Test Suite (XX Tests, >80% Coverage)
- X.XXX+ Zeilen Dokumentation

### Code-Reduktion
- **Gesamt: -334 Zeilen (-41%)**
  - Phase 0.5: -59 Zeilen toter Code
  - Phase 1: -81 Zeilen (loadData)
  - Phase 2: -194 Zeilen (Modularisierung)

### Nächste Schritte
- [ ] Vercel Production-Deployment überwachen
- [ ] Team-Demo durchführen
- [ ] User-Feedback sammeln
```

---

## 📊 Erfolgsmetriken (Prognose)

### Code Quality

- **Zeilen-Reduktion:** ~41% durch Modularisierung
- **Komponenten-Größe:** Alle < 200 Zeilen
- **Code-Duplikation:** ~50 Zeilen eliminiert (Prop-Kompatibilität)
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** > 80%
- **Anzahl Tests:** ~62 Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Reduktion um ~40%
- **Stats-Berechnung:** Optimiert mit useMemo
- **Component Rendering:** Optimiert mit React.memo

### Dokumentation

- **Zeilen:** 4.400+ Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** 30+ Beispiele
- **ADRs:** 3 Architecture Decision Records

---

## 🔗 Referenzen

### Projekt-Spezifisch

- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Master Refactoring Checklist:** `docs/planning/master-refactoring-checklist.md`
- **Module Refactoring Template:** `docs/templates/module-refactoring-template.md`
- **Project Instructions:** `CLAUDE.md`

### Verwandte Refactorings

- **Communication Components:** `docs/planning/shared/communication-components-refactoring/`
- **Project Detail Page:** `docs/planning/global/project-detail-page-refactoring.md`
- **Pressemeldung Tab:** `docs/planning/tabs/pressemeldung-tab-refactoring.md`

### Externe Ressourcen

- [React Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## 💡 Hinweise & Best Practices

### Git Workflow

```bash
# Regelmäßig committen (nach jeder Phase)
git add .
git commit -m "feat: Phase [X] abgeschlossen"

# Branch aktuell halten (falls nötig)
git fetch origin
git merge origin/main
```

### Testing

```bash
# Schneller Test-Run (nur Monitoring)
npm test -- monitoring

# Watch-Mode für Entwicklung
npm test -- monitoring --watch

# Coverage mit Details
npm run test:coverage -- --verbose
```

### Agent-Verwendung

**refactoring-test Agent:**
- PROAKTIV verwenden wenn Phase 4 startet
- Keine TODOs in Tests
- 100% Implementierung garantiert

**refactoring-dokumentation Agent:**
- PROAKTIV verwenden wenn Phase 5 startet
- Vollständige Dokumentation
- Code-Beispiele + ADRs

**refactoring-quality-check Agent:**
- PROAKTIV verwenden NACH Phase 6
- Vor Phase 7 (Merge to Main)
- Umfassende Quality Checks

---

## 📞 Support

**Team:** CeleroPress Development Team
**Maintainer:** [Name]
**Fragen?** Siehe Team README oder Slack-Channel

---

**Version:** 1.0
**Basiert auf:** Master Refactoring Template v1.1
**Template erstellt:** 2025-10-27
**Projekt:** CeleroPress

**Changelog:**
- **v1.0:** Initial Plan erstellt (2025-10-27)

---

*Dieser Plan ist ein lebendes Dokument. Anpassungen während der Implementierung sind möglich und sollten dokumentiert werden.*
