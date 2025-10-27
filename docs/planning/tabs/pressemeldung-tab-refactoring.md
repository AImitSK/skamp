# Pressemeldung Tab Refactoring Plan

**Version:** 1.0
**Erstellt:** 2025-10-26
**Status:** 📋 Geplant
**Basiert auf:** Module-Refactoring-Template v1.1

---

## 📋 Übersicht

**Modul:** Pressemeldung Tab
**Scope:** Haupt-Tab & Tabellen (OHNE CampaignCreateModal)
**Entry Point:** `src/app/dashboard/projects/[projectId]/components/tab-content/PressemeldungTabContent.tsx`
**Aufwand:** L (Large) - 3-4 Tage
**Ziel:** React Query Integration, Code-Modularisierung, Tests, Dokumentation

---

## 🎯 Ziele

- [x] **CampaignCreateModal aus Scope ausschließen** (zu komplex)
- [ ] React Query für State Management integrieren
- [ ] Komponenten modularisieren (< 300 Zeilen pro Datei)
- [ ] Performance-Optimierungen implementieren
- [ ] **Test-Coverage >80% mit refactoring-test Agent**
- [ ] **Vollständige Dokumentation mit refactoring-dokumentation Agent**
- [ ] **Quality Gate Check mit refactoring-quality-check Agent**
- [ ] Production-Ready Code Quality sicherstellen

---

## 📊 Ist-Zustand (Vor Refactoring)

### Komponenten im Scope

| Datei | Zeilen | Status | Probleme |
|-------|--------|--------|----------|
| **PressemeldungTabContent.tsx** | 27 | ✅ Klein | Wrapper-Komponente |
| **ProjectPressemeldungenTab.tsx** | 203 | ⚠️ Mittel | useState/useEffect Pattern |
| **PressemeldungCampaignTable.tsx** | 306 | ⚠️ Groß | Keine Tests |
| **PressemeldungApprovalTable.tsx** | 210 | ⚠️ Mittel | Keine Tests |
| **PressemeldungToggleSection.tsx** | 328 | ⚠️ Groß | Keine Tests |
| **GESAMT** | **~1.074** | | **L (Large)** |

### Komponenten AUSGESCHLOSSEN

| Datei | Zeilen | Grund |
|-------|--------|-------|
| **CampaignCreateModal.tsx** | ??? | ❌ Zu komplex - Separates Refactoring |

### Identifizierte Probleme

**ProjectPressemeldungenTab.tsx (203 Zeilen):**
- ❌ useState/useEffect Pattern statt React Query
- ❌ Doppelte Campaign-Loading-Logik (linkedCampaigns + projectId)
- ❌ console.error statt toastService
- ❌ Keine Tests
- ❌ Kein useCallback/useMemo
- ✅ Toast-Service Integration vorhanden (toastService.error möglich)

**PressemeldungCampaignTable.tsx (306 Zeilen):**
- ❌ Keine Tests
- ⚠️ Potenziell aufspaltbar (> 300 Zeilen)

**PressemeldungApprovalTable.tsx (210 Zeilen):**
- ❌ Keine Tests
- ✅ Größe OK (< 300 Zeilen)

**PressemeldungToggleSection.tsx (328 Zeilen):**
- ❌ Keine Tests
- ⚠️ Potenziell aufspaltbar (> 300 Zeilen)

**PressemeldungTabContent.tsx (27 Zeilen):**
- ✅ Sehr klein, kein Refactoring nötig

---

## 🗂️ Ziel-Struktur (Nach Refactoring)

### Ordner-Hierarchie

```
src/app/dashboard/projects/[projectId]/components/tab-content/
├── PressemeldungTabContent.tsx              (27 Zeilen, unverändert)

src/components/projects/pressemeldungen/
├── ProjectPressemeldungenTab.tsx            (150-200 Zeilen, reduziert)
├── PressemeldungCampaignTable.tsx           (250 Zeilen, optimiert)
├── PressemeldungApprovalTable.tsx           (210 Zeilen, optimiert)
├── PressemeldungToggleSection.tsx           (280 Zeilen, optimiert)
├── CampaignCreateModal.tsx                  (❌ NICHT ANFASSEN)
│
├── components/                              (Neue Sub-Komponenten)
│   ├── CampaignTableRow.tsx                 (80 Zeilen, extrahiert)
│   ├── ApprovalTableRow.tsx                 (70 Zeilen, extrahiert)
│   ├── ToggleDetails.tsx                    (60 Zeilen, extrahiert)
│   └── __tests__/
│       ├── CampaignTableRow.test.tsx
│       ├── ApprovalTableRow.test.tsx
│       └── ToggleDetails.test.tsx
│
└── __tests__/
    ├── ProjectPressemeldungenTab.test.tsx
    ├── PressemeldungCampaignTable.test.tsx
    ├── PressemeldungApprovalTable.test.tsx
    └── PressemeldungToggleSection.test.tsx

src/lib/hooks/
├── useCampaignData.ts                       (React Query Hooks)
└── __tests__/
    └── useCampaignData.test.tsx

docs/projects/pressemeldung-tab-refactoring/
├── README.md                                (400+ Zeilen)
├── api/
│   ├── README.md                            (300+ Zeilen)
│   └── campaign-hooks.md                    (800+ Zeilen)
├── components/
│   └── README.md                            (650+ Zeilen)
└── adr/
    └── README.md                            (350+ Zeilen)
```

---

## 🚀 Die 7 Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/pressemeldung-tab-refactoring
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  wc -l src/components/projects/pressemeldungen/*.tsx
  ```

- [ ] Backup-Dateien erstellen
  ```bash
  # Hauptkomponente sichern
  cp src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx \
     src/components/projects/pressemeldungen/ProjectPressemeldungenTab.backup.tsx

  # Große Komponenten sichern
  cp src/components/projects/pressemeldungen/PressemeldungCampaignTable.tsx \
     src/components/projects/pressemeldungen/PressemeldungCampaignTable.backup.tsx
  cp src/components/projects/pressemeldungen/PressemeldungToggleSection.tsx \
     src/components/projects/pressemeldungen/PressemeldungToggleSection.backup.tsx
  ```

- [ ] Dependencies prüfen
  - React Query installiert? (`@tanstack/react-query`) ✅
  - Testing Libraries vorhanden? (`jest`, `@testing-library/react`) ✅
  - TypeScript korrekt konfiguriert? ✅

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/pressemeldung-tab-refactoring`
- Ist-Zustand: 5 Dateien, ~1.074 Zeilen Code
- Backups: ProjectPressemeldungenTab.backup.tsx, PressemeldungCampaignTable.backup.tsx, PressemeldungToggleSection.backup.tsx
- Dependencies: Alle vorhanden

### Struktur (Ist)
- PressemeldungTabContent.tsx: 27 Zeilen
- ProjectPressemeldungenTab.tsx: 203 Zeilen
- PressemeldungCampaignTable.tsx: 306 Zeilen
- PressemeldungApprovalTable.tsx: 210 Zeilen
- PressemeldungToggleSection.tsx: 328 Zeilen

### CampaignCreateModal
- ❌ NICHT im Scope (zu komplex)
- Wird NICHT refactored
- Separates Refactoring später

### Bereit für Phase 0.5 (Cleanup)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Pressemeldung Tab Refactoring

- Feature-Branch erstellt
- Backups: ProjectPressemeldungenTab, CampaignTable, ToggleSection
- Ist-Zustand: 5 Dateien, ~1.074 Zeilen
- CampaignCreateModal aus Scope ausgeschlossen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

#### 0.5.1 TODO-Kommentare

```bash
grep -rn "TODO:" src/components/projects/pressemeldungen
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen

#### 0.5.2 Console-Logs

```bash
grep -rn "console\." src/components/projects/pressemeldungen
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs (aus ProjectPressemeldungenTab.tsx)
console.error('Fehler beim Laden der Pressemeldungen:', error);
console.error(`Kampagne ${campaignId} konnte nicht geladen werden:`, error);
```

**Ersetzen durch:**
```typescript
// ✅ toastService
toastService.error('Fehler beim Laden der Pressemeldungen');
toastService.error(`Kampagne konnte nicht geladen werden`);
```

**Aktion:**
- [ ] console.error durch toastService.error ersetzen (2x in ProjectPressemeldungenTab.tsx)
- [ ] Alle anderen console.log() statements entfernen

#### 0.5.3 Deprecated Functions

**Aktion:**
- [ ] Code auf "deprecated", "old", "legacy" durchsuchen
- [ ] Mock-Implementations identifizieren
- [ ] Functions entfernen + alle Aufrufe

#### 0.5.4 Unused State

```bash
grep -n "useState" src/components/projects/pressemeldungen/ProjectPressemeldungenTab.tsx
```

**Identifiziert:**
- `const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);` ← Wird in React Query Hook
- `const [approvals, setApprovals] = useState<ApprovalEnhanced[]>([]);` ← Wird in React Query Hook
- `const [showCreateModal, setShowCreateModal] = useState(false);` ← Behalten (nicht im Scope)
- `const [loading, setLoading] = useState(true);` ← Wird durch React Query isLoading

**Aktion:**
- [ ] Alte State-Variablen identifizieren (werden in Phase 1 durch React Query ersetzt)

#### 0.5.5 Kommentierte Code-Blöcke

**Aktion:**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Entscheidung: Implementieren oder entfernen?
- [ ] Code-Blöcke vollständig löschen

#### 0.5.6 ESLint Auto-Fix

```bash
npx eslint src/components/projects/pressemeldungen --fix
npx eslint src/components/projects/pressemeldungen
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Manuelle Fixes für verbleibende Warnings

#### 0.5.7 Manueller Test

```bash
npm run dev
```

**Aktion:**
- [ ] Dev-Server starten
- [ ] Pressemeldung Tab aufrufen
- [ ] Basis-Funktionen testen:
  - [ ] Kampagnen-Liste laden
  - [ ] Freigabe-Tabelle anzeigen
  - [ ] Toggle-Section anzeigen
  - [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt oder umgesetzt
- [ ] console.error durch toastService ersetzt (~2 Logs)
- [ ] Deprecated Functions entfernt
- [ ] Unused State-Variablen identifiziert (werden in Phase 1 ersetzt)
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Unused imports entfernt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- [X] TODO-Kommentare
- ~2 console.error → toastService.error
- [X] Deprecated Functions
- Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Identifiziert (für Phase 1)
- useState Variablen die durch React Query ersetzt werden:
  - campaigns, approvals, loading

### Ergebnis
- ProjectPressemeldungenTab.tsx: 203 → ~195 Zeilen (-8 Zeilen)
- Saubere Basis für Phase 1 (React Query Integration)
- Kein toter Code wird modularisiert

### Manueller Test
- ✅ Kampagnen-Liste lädt
- ✅ Freigabe-Tabelle funktioniert
- ✅ Toggle-Section funktioniert
- ✅ Keine Console-Errors
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- console.error → toastService.error (2 Stellen)
- TODO-Kommentare entfernt
- Unused imports entfernt via ESLint
- Kommentierte Code-Blöcke gelöscht

ProjectPressemeldungenTab.tsx: 203 → ~195 Zeilen (-8 Zeilen)

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Ziel:** State Management mit React Query ersetzen

#### 1.1 Custom Hooks erstellen

**Datei:** `src/lib/hooks/useCampaignData.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prService } from '@/lib/firebase/pr-service';
import { approvalServiceExtended } from '@/lib/firebase/approval-service';
import { projectService } from '@/lib/firebase/project-service';
import { PRCampaign } from '@/types/pr';
import { ApprovalEnhanced } from '@/types/approval';

// Query Hook: Campaigns für Projekt laden (kombiniert linkedCampaigns + projectId)
export function useProjectCampaigns(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['project-campaigns', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('No projectId or organizationId');
      }

      // 1. Projekt laden
      const projectData = await projectService.getById(projectId, { organizationId });
      let allCampaigns: PRCampaign[] = [];

      if (projectData) {
        // 2a. Lade Kampagnen über linkedCampaigns Array (alter Ansatz)
        if (projectData.linkedCampaigns && projectData.linkedCampaigns.length > 0) {
          const linkedCampaignData = await Promise.all(
            projectData.linkedCampaigns.map(async (campaignId) => {
              try {
                const campaign = await prService.getById(campaignId, organizationId);
                return campaign;
              } catch {
                return null; // Fehlerhafte Kampagnen ignorieren
              }
            })
          );
          allCampaigns.push(...linkedCampaignData.filter(Boolean) as PRCampaign[]);
        }

        // 2b. Lade Kampagnen über projectId (neuer Ansatz)
        const projectCampaigns = await prService.getCampaignsByProject(projectId, organizationId);
        allCampaigns.push(...projectCampaigns);

        // Duplikate entfernen
        const uniqueCampaigns = allCampaigns.filter((campaign, index, self) =>
          index === self.findIndex(c => c.id === campaign.id)
        );

        return uniqueCampaigns;
      }

      return [];
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}

// Query Hook: Approvals für Projekt laden
export function useProjectApprovals(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  return useQuery({
    queryKey: ['project-approvals', projectId, organizationId],
    queryFn: async () => {
      if (!projectId || !organizationId) {
        throw new Error('No projectId or organizationId');
      }

      const approvalData = await approvalServiceExtended.getApprovalsByProject(
        projectId,
        organizationId
      );
      return approvalData;
    },
    enabled: !!projectId && !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 Minuten
  });
}

// Combined Hook: Campaigns + Approvals
export function useProjectPressData(
  projectId: string | undefined,
  organizationId: string | undefined
) {
  const campaigns = useProjectCampaigns(projectId, organizationId);
  const approvals = useProjectApprovals(projectId, organizationId);

  return {
    campaigns: campaigns.data ?? [],
    approvals: approvals.data ?? [],
    isLoading: campaigns.isLoading || approvals.isLoading,
    isError: campaigns.isError || approvals.isError,
    error: campaigns.error || approvals.error,
    refetch: () => {
      campaigns.refetch();
      approvals.refetch();
    },
  };
}

// Mutation Hook: Campaign Update (optional, für spätere Verwendung)
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; campaignData: any }) => {
      await prService.update(data.id, data.campaignData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['project-campaigns']
      });
    },
  });
}
```

#### 1.2 ProjectPressemeldungenTab.tsx anpassen

**Entfernen:**
```typescript
// ❌ Alte useState/useEffect-Pattern
const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
const [approvals, setApprovals] = useState<ApprovalEnhanced[]>([]);
const [loading, setLoading] = useState(true);

const loadProjectPressData = useCallback(async () => {
  // ... 80+ Zeilen Code
}, [projectId, organizationId]);

useEffect(() => {
  loadProjectPressData();
}, [loadProjectPressData]);
```

**Hinzufügen:**
```typescript
// ✅ React Query Hook
import { useProjectPressData } from '@/lib/hooks/useCampaignData';

// In der Komponente
const {
  campaigns,
  approvals,
  isLoading,
  isError,
  error,
  refetch,
} = useProjectPressData(projectId, organizationId);

// Loading State
if (isLoading) {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

// Error State (optional)
if (isError) {
  toastService.error('Fehler beim Laden der Pressemeldungen');
}

// Refresh-Handler
const handleRefresh = () => {
  refetch();
};
```

**Code-Reduktion:**
- **Vorher:** 203 Zeilen (mit loadProjectPressData)
- **Nachher:** ~120 Zeilen (-83 Zeilen, -41%)

#### 1.3 Tabellen-Komponenten anpassen

**PressemeldungCampaignTable.tsx:**
```typescript
// onRefresh Prop wird zu React Query refetch
<PressemeldungCampaignTable
  campaigns={campaigns}
  organizationId={organizationId}
  onRefresh={refetch} // Statt loadProjectPressData
/>
```

**PressemeldungApprovalTable.tsx:**
```typescript
<PressemeldungApprovalTable
  approvals={approvals}
  onRefresh={refetch}
/>
```

#### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`useCampaignData.ts`)
- [ ] 3 Hooks implementiert:
  - [ ] useProjectCampaigns (kombiniert linkedCampaigns + projectId)
  - [ ] useProjectApprovals
  - [ ] useProjectPressData (combined)
- [ ] ProjectPressemeldungenTab.tsx auf React Query umgestellt
- [ ] loadProjectPressData entfernt
- [ ] Alte useState/useEffect entfernt
- [ ] Tabellen-Komponenten angepasst (onRefresh → refetch)
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test durchgeführt

#### Deliverable

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks in `useCampaignData.ts` (3 Hooks)
  - useProjectCampaigns (kombiniert linkedCampaigns + projectId)
  - useProjectApprovals
  - useProjectPressData (combined)
- ProjectPressemeldungenTab.tsx vollständig auf React Query umgestellt
- Tabellen-Komponenten angepasst (onRefresh → refetch)

### Code-Reduktion
- ProjectPressemeldungenTab.tsx: 203 → ~120 Zeilen (-83 Zeilen, -41%)
- loadProjectPressData entfernt (80+ Zeilen)

### Vorteile
- Automatisches Caching (2min staleTime)
- Kombinierte Campaign-Loading-Logik in einem Hook
- Error Handling über React Query
- Weniger Boilerplate Code
- Automatic refetch on window focus

### Manueller Test
- ✅ Kampagnen-Liste lädt
- ✅ Freigabe-Tabelle lädt
- ✅ Refresh funktioniert
- ✅ Keine Fehler
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Pressemeldung Tab

- useCampaignData.ts mit 3 Hooks erstellt
- ProjectPressemeldungenTab.tsx auf React Query umgestellt
- loadProjectPressData entfernt (80+ Zeilen)

Code-Reduktion: 203 → ~120 Zeilen (-41%)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Große Komponenten aufteilen (PressemeldungCampaignTable, PressemeldungToggleSection)

#### 2.1 PressemeldungCampaignTable modularisieren

**Strategie:**
- Aktuell: 306 Zeilen (> 300 Zeilen)
- Ziel: 250 Zeilen (Table) + 80 Zeilen (Row-Komponente)

**Neue Komponente:**
```
src/components/projects/pressemeldungen/components/
├── CampaignTableRow.tsx (80 Zeilen)
└── __tests__/
    └── CampaignTableRow.test.tsx
```

**CampaignTableRow.tsx:**
```typescript
import { PRCampaign } from '@/types/pr';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface CampaignTableRowProps {
  campaign: PRCampaign;
  onEdit: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
}

export default React.memo(function CampaignTableRow({
  campaign,
  onEdit,
  onDelete,
}: CampaignTableRowProps) {
  return (
    <tr className="border-b border-zinc-200 hover:bg-zinc-50">
      <td className="px-4 py-3 text-sm">{campaign.name}</td>
      <td className="px-4 py-3 text-sm">{campaign.status}</td>
      <td className="px-4 py-3 text-sm">
        {campaign.createdAt?.toDate().toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            color="secondary"
            onClick={() => onEdit(campaign.id!)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            color="danger"
            onClick={() => onDelete(campaign.id!)}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});
```

**In PressemeldungCampaignTable.tsx integrieren:**
```typescript
import CampaignTableRow from './components/CampaignTableRow';

// In render
<tbody>
  {campaigns.map((campaign) => (
    <CampaignTableRow
      key={campaign.id}
      campaign={campaign}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ))}
</tbody>
```

#### 2.2 PressemeldungToggleSection modularisieren

**Strategie:**
- Aktuell: 328 Zeilen (> 300 Zeilen)
- Ziel: 280 Zeilen (Main) + 60 Zeilen (Details-Komponente)

**Neue Komponente:**
```
src/components/projects/pressemeldungen/components/
├── ToggleDetails.tsx (60 Zeilen)
└── __tests__/
    └── ToggleDetails.test.tsx
```

#### 2.3 PressemeldungApprovalTable (Optional)

**Strategie:**
- Aktuell: 210 Zeilen (< 300 Zeilen)
- Optional: ApprovalTableRow extrahieren (70 Zeilen)

**Entscheidung:**
- [ ] Wenn > 250 Zeilen → Row-Komponente extrahieren
- [ ] Wenn < 250 Zeilen → Beibehalten

#### Checkliste Phase 2

- [ ] CampaignTableRow.tsx erstellt (80 Zeilen)
- [ ] PressemeldungCampaignTable.tsx angepasst (306 → 250 Zeilen)
- [ ] ToggleDetails.tsx erstellt (60 Zeilen)
- [ ] PressemeldungToggleSection.tsx angepasst (328 → 280 Zeilen)
- [ ] ApprovalTableRow.tsx erstellt (optional, 70 Zeilen)
- [ ] Imports in allen Dateien aktualisiert
- [ ] TypeScript-Fehler behoben

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Sub-Komponenten erstellt
- CampaignTableRow.tsx (80 Zeilen)
- ToggleDetails.tsx (60 Zeilen)
- ApprovalTableRow.tsx (70 Zeilen, optional)

### Code-Reduktion
- PressemeldungCampaignTable.tsx: 306 → 250 Zeilen (-56 Zeilen, -18%)
- PressemeldungToggleSection.tsx: 328 → 280 Zeilen (-48 Zeilen, -15%)
- PressemeldungApprovalTable.tsx: 210 → 180 Zeilen (-30 Zeilen, -14%)

### Vorteile
- Alle Komponenten < 300 Zeilen
- Bessere Code-Lesbarkeit
- Eigenständig testbare Sub-Komponenten
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung

- 3 Sub-Komponenten extrahiert (Row-Komponenten)
- PressemeldungCampaignTable: 306 → 250 Zeilen (-18%)
- PressemeldungToggleSection: 328 → 280 Zeilen (-15%)
- PressemeldungApprovalTable: 210 → 180 Zeilen (-14%)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden

#### 3.1 useCallback für Handler (ProjectPressemeldungenTab.tsx)

```typescript
import { useCallback, useMemo } from 'react';

// Handler mit useCallback wrappen
const handleRefresh = useCallback(() => {
  refetch();
}, [refetch]);
```

#### 3.2 useMemo für Computed Values

```typescript
// hasLinkedCampaign als useMemo
const hasLinkedCampaign = useMemo(() => {
  return campaigns.length > 0;
}, [campaigns.length]);
```

#### 3.3 React.memo für Sub-Komponenten

```typescript
// CampaignTableRow.tsx
export default React.memo(function CampaignTableRow({ ... }: Props) {
  // ...
});

// ToggleDetails.tsx
export default React.memo(function ToggleDetails({ ... }: Props) {
  // ...
});

// ApprovalTableRow.tsx
export default React.memo(function ApprovalTableRow({ ... }: Props) {
  // ...
});
```

#### Checkliste Phase 3

- [ ] useCallback für Handler (handleRefresh)
- [ ] useMemo für hasLinkedCampaign
- [ ] React.memo für CampaignTableRow
- [ ] React.memo für ToggleDetails
- [ ] React.memo für ApprovalTableRow
- [ ] Performance-Test durchgeführt

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 1 Handler (handleRefresh)
- useMemo für 1 Computed Value (hasLinkedCampaign)
- React.memo für 3 Sub-Komponenten

### Messbare Verbesserungen
- Re-Renders reduziert
- Optimierte Sub-Komponenten
```

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung

- useCallback für handleRefresh
- useMemo für hasLinkedCampaign
- React.memo für 3 Sub-Komponenten

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing mit refactoring-test Agent 🤖

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**WICHTIG:** In dieser Phase wird der `refactoring-test` Agent verwendet!

#### Workflow

1. **Agent starten:**
   ```
   Verwende den refactoring-test Agenten für:
   - Hook-Tests (useCampaignData.ts)
   - Component-Tests (ProjectPressemeldungenTab, CampaignTable, ApprovalTable, ToggleSection)
   - Sub-Component-Tests (CampaignTableRow, ToggleDetails, ApprovalTableRow)
   ```

2. **Agent-Aufgabe:**
   ```
   Erstelle vollständige Tests für das Pressemeldung Tab Modul:

   Test-Files:
   1. src/lib/hooks/__tests__/useCampaignData.test.tsx (10+ Tests)
   2. src/components/projects/pressemeldungen/__tests__/ProjectPressemeldungenTab.test.tsx (12+ Tests)
   3. src/components/projects/pressemeldungen/__tests__/PressemeldungCampaignTable.test.tsx (10+ Tests)
   4. src/components/projects/pressemeldungen/__tests__/PressemeldungApprovalTable.test.tsx (8+ Tests)
   5. src/components/projects/pressemeldungen/__tests__/PressemeldungToggleSection.test.tsx (8+ Tests)
   6. src/components/projects/pressemeldungen/components/__tests__/CampaignTableRow.test.tsx (8+ Tests)
   7. src/components/projects/pressemeldungen/components/__tests__/ToggleDetails.test.tsx (6+ Tests)
   8. src/components/projects/pressemeldungen/components/__tests__/ApprovalTableRow.test.tsx (6+ Tests)

   Anforderungen:
   - >80% Coverage
   - Alle Tests vollständig implementiert (KEINE TODOs)
   - Mocks für Firebase Services
   - React Query Wrapper für Hook-Tests
   - User-Event für Interaktionen
   ```

3. **Erwartetes Ergebnis:**
   - 68+ Tests erstellt
   - Coverage >80%
   - npm test -- pressemeldung bestanden (100%)

#### Checkliste Phase 4

- [ ] refactoring-test Agent aufgerufen
- [ ] 8 Test-Dateien erstellt
- [ ] 68+ Tests implementiert
- [ ] Alle Tests bestehen (npm test -- pressemeldung)
- [ ] Coverage >80%
- [ ] Keine TODOs in Tests

#### Deliverable

```markdown
## Phase 4: Testing ✅

### Test Suite (via refactoring-test Agent)
- Hook-Tests: 10/10 bestanden (useCampaignData)
- Component-Tests: 38/38 bestanden (4 Komponenten)
- Sub-Component-Tests: 20/20 bestanden (3 Sub-Komponenten)
- **Gesamt: 68/68 Tests bestanden (100%)**

### Coverage
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%

### Test-Files erstellt
1. useCampaignData.test.tsx (10 Tests)
2. ProjectPressemeldungenTab.test.tsx (12 Tests)
3. PressemeldungCampaignTable.test.tsx (10 Tests)
4. PressemeldungApprovalTable.test.tsx (8 Tests)
5. PressemeldungToggleSection.test.tsx (8 Tests)
6. CampaignTableRow.test.tsx (8 Tests)
7. ToggleDetails.test.tsx (6 Tests)
8. ApprovalTableRow.test.tsx (6 Tests)
```

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (via refactoring-test Agent)

- 68 Tests erstellt (8 Test-Dateien)
- Coverage: >80%
- Alle Tests bestanden (100%)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation mit refactoring-dokumentation Agent 🤖

**Ziel:** Vollständige Dokumentation (2.500+ Zeilen)

**WICHTIG:** In dieser Phase wird der `refactoring-dokumentation` Agent verwendet!

#### Workflow

1. **Agent starten:**
   ```
   Verwende den refactoring-dokumentation Agenten für:
   - Vollständige Modul-Dokumentation
   - API-Dokumentation (Hooks)
   - Komponenten-Dokumentation
   - ADRs
   ```

2. **Agent-Aufgabe:**
   ```
   Erstelle vollständige Dokumentation für das Pressemeldung Tab Modul.

   Modul-Informationen:
   - Modul: Pressemeldung Tab
   - Entry Point: src/components/projects/pressemeldungen/
   - Komponenten: ProjectPressemeldungenTab, PressemeldungCampaignTable, PressemeldungApprovalTable, PressemeldungToggleSection
   - Sub-Komponenten: CampaignTableRow, ToggleDetails, ApprovalTableRow
   - Hooks: useCampaignData (useProjectCampaigns, useProjectApprovals, useProjectPressData)
   - Tests: 68 Tests, >80% Coverage

   Anforderungen:
   - 5 Dokumentations-Dateien
   - Mindestens 2.500+ Zeilen gesamt
   - Vollständige Code-Beispiele
   - Troubleshooting-Guides
   - Performance-Messungen
   ```

3. **Erwartetes Ergebnis:**
   ```
   docs/projects/pressemeldung-tab-refactoring/
   ├── README.md (400+ Zeilen)
   ├── api/
   │   ├── README.md (300+ Zeilen)
   │   └── campaign-hooks.md (800+ Zeilen)
   ├── components/
   │   └── README.md (650+ Zeilen)
   └── adr/
       └── README.md (350+ Zeilen)
   ```

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] 5 Dokumentations-Dateien erstellt
- [ ] README.md (400+ Zeilen)
- [ ] api/README.md (300+ Zeilen)
- [ ] api/campaign-hooks.md (800+ Zeilen)
- [ ] components/README.md (650+ Zeilen)
- [ ] adr/README.md (350+ Zeilen)
- [ ] Gesamt: 2.500+ Zeilen
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅ (via refactoring-dokumentation Agent)

### Erstellt
- README.md ([X] Zeilen) - Hauptdokumentation
- api/README.md ([X] Zeilen) - API-Übersicht
- api/campaign-hooks.md ([X] Zeilen) - Detaillierte Hook-Referenz
- components/README.md ([X] Zeilen) - Komponenten-Dokumentation
- adr/README.md ([X] Zeilen) - Architecture Decision Records

### Qualitätsmerkmale
- **[X]+ Zeilen Dokumentation**
- [Y] vollständige Code-Beispiele
- [Z] dokumentierte Hooks
- [A] dokumentierte Komponenten
- [B] Architecture Decision Records
- Troubleshooting-Guides enthalten
- Alle internen Links funktionieren ✅
```

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation (via refactoring-dokumentation Agent)

- 5 Markdown-Dateien erstellt
- 2.500+ Zeilen Dokumentation
- Vollständige Code-Beispiele
- Troubleshooting-Guides

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit | grep pressemeldung
```

**Aktion:**
- [ ] Alle TypeScript-Fehler beheben
- [ ] Missing imports ergänzen
- [ ] Types definieren
- [ ] Optional Chaining verwenden

#### 6.2 ESLint Check

```bash
npx eslint src/components/projects/pressemeldungen
npx eslint src/lib/hooks/useCampaignData.ts
```

**Aktion:**
- [ ] Alle ESLint-Warnings beheben
- [ ] Unused imports entfernen
- [ ] Missing dependencies ergänzen

#### 6.3 Console Cleanup

```bash
rg "console\." src/components/projects/pressemeldungen
```

**Aktion:**
- [ ] Alle Debug-Logs entfernen
- [ ] Nur console.error in catch-blocks behalten

#### 6.4 Design System Compliance

**Prüfen:**
- [ ] Keine Schatten (außer Dropdowns)
- [ ] Nur Heroicons /24/outline
- [ ] Zinc-Palette für neutrale Farben
- [ ] #005fab für Primary Actions
- [ ] Focus-Rings (focus:ring-2 focus:ring-primary)

#### 6.5 Final Build Test

```bash
npm run build
npm run start
```

**Aktion:**
- [ ] Build erfolgreich
- [ ] App startet korrekt
- [ ] Pressemeldung Tab funktioniert im Production-Build

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in Pressemeldung Tab
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: Bestanden

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- [Liste von behobenen Problemen]
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality

- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Design System: Compliant
- Build: Erfolgreich

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check mit refactoring-quality-check Agent 🤖

**Ziel:** Vollständigkeit der Implementierung prüfen BEVOR gemerged wird

**WICHTIG:** In dieser Phase wird der `refactoring-quality-check` Agent verwendet!

#### Workflow

1. **Agent starten:**
   ```
   Verwende den refactoring-quality-check Agenten für:
   - Vollständigkeits-Prüfung aller Phasen
   - Integration-Check (alte Code entfernt?)
   - Test-Ergebnis-Check
   - Dokumentations-Check
   ```

2. **Agent-Aufgabe:**
   ```
   Führe Quality Gate Check für Pressemeldung Tab Refactoring durch:

   Prüfe:
   1. Phase 1: React Query Hooks VERWENDET (nicht nur erstellt)?
   2. Phase 2: Alte Komponenten ENTFERNT (nicht nur neue erstellt)?
   3. Phase 3: Performance-Optimierungen ANGEWENDET?
   4. Phase 4: Tests BESTEHEN (npm test)?
   5. Phase 5: Dokumentation VOLLSTÄNDIG?
   6. Phase 6: Code Quality ERFÜLLT (TypeScript, ESLint)?
   7. Integration: Alte useState/useEffect ENTFERNT?
   8. Integration: loadProjectPressData ENTFERNT?
   9. CampaignCreateModal NICHT ANGEFASST?

   Gib MERGE APPROVED nur wenn ALLE Prüfpunkte erfüllt.
   ```

3. **Erwartetes Ergebnis:**
   - 9/9 Prüfpunkte bestanden
   - MERGE APPROVED

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] 9/9 Prüfpunkte bestanden
- [ ] MERGE APPROVED erhalten
- [ ] Ggf. Nachbesserungen durchgeführt

#### Deliverable

```markdown
## Phase 6.5: Quality Gate Check ✅ (via refactoring-quality-check Agent)

### Prüfergebnis
- ✅ 9/9 Prüfpunkte bestanden
- ✅ MERGE APPROVED

### Prüfpunkte
1. ✅ React Query Hooks verwendet
2. ✅ Alte Komponenten entfernt
3. ✅ Performance-Optimierungen angewendet
4. ✅ Tests bestehen (68/68)
5. ✅ Dokumentation vollständig (2.500+ Zeilen)
6. ✅ Code Quality erfüllt
7. ✅ useState/useEffect entfernt
8. ✅ loadProjectPressData entfernt
9. ✅ CampaignCreateModal nicht angefasst

### Bereit für Phase 7 (Merge to Main)
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden

- 9/9 Prüfpunkte erfüllt
- MERGE APPROVED
- Bereit für Merge to Main

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 7: Merge to Main

**Ziel:** Code zu Main mergen

#### Workflow

```bash
# 1. Push Feature-Branch
git push origin feature/pressemeldung-tab-refactoring

# 2. Zu Main wechseln und mergen
git checkout main
git merge feature/pressemeldung-tab-refactoring --no-ff -m "merge: Pressemeldung Tab Refactoring - Phase 0-6.5 abgeschlossen

Feature Branch: feature/pressemeldung-tab-refactoring

Phase 0-7 vollständig durchgeführt:
- ✅ React Query Integration (useCampaignData)
- ✅ Code-Modularisierung (3 Sub-Komponenten)
- ✅ Performance-Optimierung (useCallback, useMemo, React.memo)
- ✅ Testing (68/68 Tests, >80% Coverage)
- ✅ Dokumentation (2.500+ Zeilen)
- ✅ Production-Ready Code Quality
- ✅ Quality Gate Check bestanden (9/9)

CampaignCreateModal:
- ❌ Bewusst NICHT angefasst (zu komplex)
- Separates Refactoring geplant

Code-Reduktion:
- ProjectPressemeldungenTab: 203 → ~120 Zeilen (-41%)
- PressemeldungCampaignTable: 306 → 250 Zeilen (-18%)
- PressemeldungToggleSection: 328 → 280 Zeilen (-15%)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. Main pushen
git push origin main

# 4. Tests auf Main
npm test -- pressemeldung
```

#### Checkliste Phase 7

- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Vercel Auto-Deploy läuft

#### Deliverable

```markdown
## Phase 7: Merge to Main ✅

### Status
- ✅ Feature-Branch → Main gemerged
- ✅ Main gepushed
- ✅ Tests auf Main bestanden (68/68)
- ✅ Vercel Auto-Deploy erfolgreich

### Git-Statistik
- Branch: feature/pressemeldung-tab-refactoring → main
- Commits: [X]
- Files changed: [Y]
- Code: +[A] Zeilen hinzugefügt, -[B] Zeilen gelöscht
- Netto: +[C] Zeilen (inkl. 2.500+ Zeilen Docs)
```

---

## ✅ Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** ~30% durch Modularisierung
- **Komponenten-Größe:** Alle < 300 Zeilen ✅
- **Code-Duplikation:** loadProjectPressData eliminiert
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** > 80%
- **Anzahl Tests:** 68 Tests
- **Pass-Rate:** 100%

### Performance

- **React Query Caching:** 2min staleTime
- **Re-Renders:** Reduziert durch React.memo
- **Loading:** Automatic refetch on window focus

### Dokumentation

- **Zeilen:** 2.500+ Zeilen
- **Dateien:** 5 Dokumente
- **Code-Beispiele:** [X] Beispiele

---

## 🎯 Scope-Entscheidungen

### ✅ Im Scope

- PressemeldungTabContent.tsx (Wrapper)
- ProjectPressemeldungenTab.tsx (Orchestrator)
- PressemeldungCampaignTable.tsx
- PressemeldungApprovalTable.tsx
- PressemeldungToggleSection.tsx

### ❌ NICHT im Scope (Begründung)

**CampaignCreateModal.tsx:**
- **Grund:** Zu komplex für dieses Refactoring
- **Entscheidung:** Separates Refactoring später
- **Status:** ❌ Wird NICHT angefasst

**Weitere Sub-Module (laut Master Checklist):**
- Pressemeldung > Editor / KI Toolbar
- Pressemeldung > KI Assistent
- Pressemeldung > PDF Versionierung
- Pressemeldung > Bearbeiten (CampaignEditModal)
- Pressemeldung > Versenden (CampaignSendModal)
- Pressemeldung > Email Templates (TemplateEditor)
- Pressemeldung > Freigabe (ApprovalWorkflow)
- Pressemeldung > Kundenfreigabeseite

**Status:** Alle separates Refactoring (zu komplex)

---

## 📝 Finale Checkliste

### Phase 0-0.5: Vorbereitung

- [ ] Feature-Branch erstellt
- [ ] Backups angelegt
- [ ] Ist-Zustand dokumentiert
- [ ] TODO-Kommentare entfernt
- [ ] console.error → toastService.error
- [ ] ESLint Auto-Fix durchgeführt

### Phase 1: React Query

- [ ] useCampaignData.ts erstellt (3 Hooks)
- [ ] ProjectPressemeldungenTab.tsx umgestellt
- [ ] loadProjectPressData entfernt
- [ ] useState/useEffect entfernt

### Phase 2: Modularisierung

- [ ] CampaignTableRow.tsx erstellt
- [ ] ToggleDetails.tsx erstellt
- [ ] ApprovalTableRow.tsx erstellt (optional)
- [ ] Alle Komponenten < 300 Zeilen

### Phase 3: Performance

- [ ] useCallback für handleRefresh
- [ ] useMemo für hasLinkedCampaign
- [ ] React.memo für Sub-Komponenten

### Phase 4: Testing (refactoring-test Agent)

- [ ] 68+ Tests erstellt
- [ ] Coverage >80%
- [ ] Alle Tests bestehen

### Phase 5: Dokumentation (refactoring-dokumentation Agent)

- [ ] 5 Dokumentations-Dateien
- [ ] 2.500+ Zeilen
- [ ] Alle Links funktionieren

### Phase 6: Code Quality

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Design System Compliance
- [ ] Build erfolgreich

### Phase 6.5: Quality Gate (refactoring-quality-check Agent)

- [ ] 9/9 Prüfpunkte bestanden
- [ ] MERGE APPROVED

### Phase 7: Merge

- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Tests auf Main bestanden

---

## 🔗 Referenzen

### Projekt-Spezifisch

- **Master Checklist:** `docs/planning/master-refactoring-checklist.md`
- **Template:** `docs/templates/module-refactoring-template.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`

### Verwandte Refactorings

- **Overview Tab:** `docs/planning/tabs/overview-tab-refactoring.md`
- **Tasks Tab:** `docs/planning/tabs/tasks-tab-refactoring.md`
- **Strategie Tab:** `docs/planning/tabs/strategie-tab-refactoring.md`
- **Daten Tab:** `docs/planning/tabs/daten-tab-refactoring.md`
- **Verteiler Tab:** `docs/planning/tabs/verteiler-tab-refactoring.md`

---

**Maintainer:** CeleroPress Team
**Erstellt:** 2025-10-26
**Status:** 📋 Geplant

---

## 💡 Wichtige Hinweise

### CampaignCreateModal

⚠️ **SEHR WICHTIG:**
- CampaignCreateModal wird **NICHT** in diesem Refactoring angefasst
- Zu komplex für diesen Scope
- Separates Refactoring geplant
- Quality Gate Check prüft, dass es NICHT modifiziert wurde

### Agent-Workflow

🤖 **Verwendete Agenten:**
1. **Phase 4:** `refactoring-test` - Erstellt vollständige Test-Suite
2. **Phase 5:** `refactoring-dokumentation` - Erstellt vollständige Dokumentation
3. **Phase 6.5:** `refactoring-quality-check` - Prüft Vollständigkeit vor Merge

### Code-Reduktion

📊 **Erwartete Reduktion:**
- ProjectPressemeldungenTab: ~41% (-83 Zeilen)
- PressemeldungCampaignTable: ~18% (-56 Zeilen)
- PressemeldungToggleSection: ~15% (-48 Zeilen)
- **Gesamt:** ~187 Zeilen weniger Code

---

*Dieses Dokument ist ein lebendes Dokument. Updates während der Implementierung sind erlaubt.*
