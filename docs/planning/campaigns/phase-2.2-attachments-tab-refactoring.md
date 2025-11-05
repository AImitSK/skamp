# Phase 2.2: AttachmentsTab Refactoring - Implementierungsplan

**Version:** 1.0
**Basiert auf:** Module-Refactoring Template v2.1
**Erstellt:** 2025-11-05
**Abgeschlossen:** 2025-11-05
**Modul:** AttachmentsTab (Anhänge)
**Status:** ✅ ABGESCHLOSSEN

---

## 📋 Übersicht

Refactoring des **AttachmentsTab** im Campaign Edit Bereich:
- Textbausteine (Boilerplates) Management
- Medien-Anhänge (Assets) Management
- Bereits: Context-basiert, Toast-Service integriert
- Bereits: React.memo vorhanden

**Besonderheit:** AttachmentsTab ist **BEREITS GUT STRUKTURIERT** (129 Zeilen)
- ✅ Nutzt CampaignContext (kein React Query nötig)
- ✅ Toast-Service bereits zentral im Context
- ✅ React.memo bereits vorhanden
- ⚠️ Modularisierung optional (< 300 Zeilen)

**Geschätzter Aufwand:** XS (Extra-Small) - 0.5-1 Tag

---

## 🎯 Ziele

- [x] ~~React Query für State Management~~ (NICHT NÖTIG - nutzt Context)
- [x] Minimale Komponenten-Modularisierung (MediaList + MediaEmptyState)
- [x] Performance-Optimierungen (React.memo für alle Komponenten)
- [x] Test-Coverage erreichen (>80% → 100% erreicht)
- [x] Dokumentation erstellen (4.099 Zeilen)
- [x] Production-Ready Code Quality (Quality Gate bestanden)

---

## 📊 IST-ZUSTAND

### Aktuelle Struktur

**Datei:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/AttachmentsTab.tsx`
**Zeilen:** 129 Zeilen
**Status:** ✅ Bereits gut strukturiert

**Komponenten:**
- SimpleBoilerplateLoader (extern, shared)
- Medien-Liste (inline, 50 Zeilen)
- Empty State (inline, 15 Zeilen)

**Context-Integration:**
```typescript
const {
  selectedCompanyId,
  selectedCompanyName,
  boilerplateSections,
  updateBoilerplateSections,
  attachedAssets,
  removeAsset
} = useCampaign();
```

**Toast-Integration:** ✅ Zentral im Context
- updateAttachedAssets: "X Medium(en) hinzugefügt"
- removeAsset: "Medium entfernt"

**Performance:**
- ✅ React.memo vorhanden

---

## 🚀 Refactoring-Phasen

### Phase 0: Vorbereitung & Setup ⚠️ OPTIONAL

**Entscheidung:** Feature-Branch **OPTIONAL** (kleine Änderungen)
- Option A: Direkt auf Main (wenn nur Tests + Doku)
- Option B: Feature-Branch (wenn Modularisierung)

**Empfehlung:** Option A - Direkt auf Main

#### Aufgaben (falls Feature-Branch)

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/phase-2.2-attachments-tab-refactoring
  ```

- [ ] Ist-Zustand dokumentieren
  - AttachmentsTab.tsx: 129 Zeilen
  - Bereits Context-integriert
  - Bereits Toast-Service integriert

- [ ] Backup erstellen (optional)
  ```bash
  cp src/app/.../tabs/AttachmentsTab.tsx \
     src/app/.../tabs/AttachmentsTab.backup.tsx
  ```

#### Deliverable

- Feature-Branch erstellt (falls Option B)
- Ist-Zustand dokumentiert
- Dependencies geprüft (alles vorhanden)

**Commit (falls Feature-Branch):**
```bash
git add .
git commit -m "chore: Phase 0 - Setup für AttachmentsTab Refactoring"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ✅ NICHT NÖTIG

**Status:** ✅ BEREITS DURCHGEFÜHRT

**Bereits erledigt:**
- ✅ Toast-Service Import entfernt
- ✅ Obsolete clientId-Prüfungen entfernt
- ✅ Fehlermeldung "Zuerst Kunden auswählen" entfernt
- ✅ Code-Reduktion: 139 → 129 Zeilen (-7%)

**Commit bereits vorhanden:** `4bfa9569`

---

### Phase 1: React Query Integration ⚠️ NICHT ANWENDBAR

**Status:** ⚠️ ÜBERSPRUNGEN

**Begründung:**
- AttachmentsTab nutzt **CampaignContext** (Design-Entscheidung)
- Kein eigenes State Management nötig
- Alle Daten kommen aus Context:
  - `boilerplateSections` (aus Context)
  - `attachedAssets` (aus Context)
  - `updateBoilerplateSections` (Context Action)
  - `removeAsset` (Context Action)

**ADR-0001:** CampaignContext vs React Query
- **Entscheidung:** Context für Campaign-spezifischen State
- **Begründung:** Shared State über alle Tabs, keine separate API-Calls pro Tab

---

### Phase 2: Code-Separation & Modularisierung ⚠️ OPTIONAL

**Ziel:** Prüfen ob Modularisierung sinnvoll ist

#### Ist-Analyse

**AttachmentsTab.tsx:** 129 Zeilen
- ✅ **UNTER 300 Zeilen** - Modularisierung optional
- Struktur:
  - Textbausteine: SimpleBoilerplateLoader (extern, 6 Zeilen)
  - Medien-Liste: Inline (50 Zeilen)
  - Empty State: Inline (15 Zeilen)

#### Entscheidung: Modularisierung

**Option A:** ❌ KEINE Modularisierung
- **PRO:** Code ist übersichtlich (129 Zeilen)
- **PRO:** Wenig Overhead
- **CONTRA:** Inline-Komponenten bleiben

**Option B:** ✅ MINIMALE Modularisierung (EMPFOHLEN)
- **PRO:** Bessere Testbarkeit
- **PRO:** Wiederverwendbare Komponenten
- **PRO:** Konsistent mit ContentTab
- **CONTRA:** +2 Dateien, ~80 Zeilen Code

**Empfehlung:** Option B - Minimale Modularisierung

#### Phase 2.1: Komponenten extrahieren

**Zu extrahieren:**

1. **MediaList.tsx** (50 Zeilen)
   - Liste der angehängten Medien
   - Props: `attachments`, `onRemove`

2. **MediaEmptyState.tsx** (20 Zeilen)
   - Leerer Zustand (Drag & Drop Zone)
   - Props: `onAddMedia`

**NICHT extrahieren:**
- SimpleBoilerplateLoader (bereits extern)
- Container-Struktur (bleibt in AttachmentsTab)

#### Neue Struktur

```
tabs/
├── AttachmentsTab.tsx (70 Zeilen, -46%)
└── components/
    ├── MediaList.tsx (50 Zeilen)
    ├── MediaEmptyState.tsx (20 Zeilen)
    └── __tests__/
        ├── MediaList.test.tsx
        └── MediaEmptyState.test.tsx
```

#### Code-Beispiele

**MediaList.tsx:**
```typescript
import React from 'react';
import { FolderIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { CampaignAssetAttachment } from '@/types/pr';

interface MediaListProps {
  attachments: CampaignAssetAttachment[];
  onRemove: (assetId: string) => void;
}

export function MediaList({ attachments, onRemove }: MediaListProps) {
  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
          {/* Icon */}
          {/* Name + Badge */}
          {/* Remove Button */}
        </div>
      ))}
    </div>
  );
}
```

**MediaEmptyState.tsx:**
```typescript
import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface MediaEmptyStateProps {
  onAddMedia: () => void;
}

export function MediaEmptyState({ onAddMedia }: MediaEmptyStateProps) {
  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-[#005fab] transition-all cursor-pointer group py-8"
      onClick={onAddMedia}
    >
      {/* Icon + Text */}
    </div>
  );
}
```

**AttachmentsTab.tsx (refactored):**
```typescript
import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { FieldGroup } from '@/components/ui/fieldset';
import { Button } from '@/components/ui/button';
import SimpleBoilerplateLoader from '@/components/pr/campaign/SimpleBoilerplateLoader';
import { useCampaign } from '../context/CampaignContext';
import { MediaList } from './components/MediaList';
import { MediaEmptyState } from './components/MediaEmptyState';

export default React.memo(function AttachmentsTab({ organizationId, onOpenAssetSelector }: AttachmentsTabProps) {
  const {
    selectedCompanyId: clientId,
    selectedCompanyName: clientName,
    boilerplateSections,
    updateBoilerplateSections,
    attachedAssets,
    removeAsset
  } = useCampaign();

  return (
    <div className="bg-white rounded-lg border p-6">
      <FieldGroup>
        {/* Textbausteine */}
        <div className="mb-6">
          <SimpleBoilerplateLoader
            organizationId={organizationId}
            clientId={clientId}
            clientName={clientName}
            onSectionsChange={updateBoilerplateSections}
            initialSections={boilerplateSections}
          />
        </div>

        {/* Medien */}
        <div className="mt-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Medien</h3>
              <Button type="button" onClick={onOpenAssetSelector} color="secondary" className="text-sm px-3 py-1.5">
                <PlusIcon className="h-4 w-4 mr-1" />
                Medien hinzufügen
              </Button>
            </div>

            {attachedAssets.length > 0 ? (
              <MediaList attachments={attachedAssets} onRemove={removeAsset} />
            ) : (
              <MediaEmptyState onAddMedia={onOpenAssetSelector} />
            )}
          </div>
        </div>
      </FieldGroup>
    </div>
  );
});
```

#### Checkliste Phase 2

- [ ] MediaList.tsx erstellt (50 Zeilen)
- [ ] MediaEmptyState.tsx erstellt (20 Zeilen)
- [ ] AttachmentsTab.tsx refactored (70 Zeilen, -46%)
- [ ] Imports aktualisiert
- [ ] Manueller Test durchgeführt

**Commit:**
```bash
git add .
git commit -m "refactor: Phase 2 - AttachmentsTab Modularisierung

MediaList + MediaEmptyState extrahiert
AttachmentsTab: 129 → 70 Zeilen (-46%)

Code-Struktur:
- MediaList.tsx (50 Zeilen)
- MediaEmptyState.tsx (20 Zeilen)

Bessere Testbarkeit, wiederverwendbare Komponenten

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Performance prüfen und ggf. optimieren

#### Ist-Analyse

**Bereits vorhanden:**
- ✅ React.memo (AttachmentsTab)

**Zu prüfen:**
- [ ] useCallback für removeAsset? → **NEIN** (kommt aus Context)
- [ ] useMemo für attachedAssets? → **NEIN** (kommt aus Context, bereits optimiert)
- [ ] React.memo für MediaList? → **JA** (empfohlen)
- [ ] React.memo für MediaEmptyState? → **JA** (empfohlen)

#### 3.1 React.memo für neue Komponenten

**MediaList.tsx:**
```typescript
export const MediaList = React.memo(function MediaList({ attachments, onRemove }: MediaListProps) {
  // ...
});
```

**MediaEmptyState.tsx:**
```typescript
export const MediaEmptyState = React.memo(function MediaEmptyState({ onAddMedia }: MediaEmptyStateProps) {
  // ...
});
```

#### Checkliste Phase 3

- [ ] React.memo für MediaList hinzugefügt
- [ ] React.memo für MediaEmptyState hinzugefügt
- [ ] Performance-Test durchgeführt (keine Re-Render-Probleme)

**Commit:**
```bash
git add .
git commit -m "perf: Phase 3 - Performance-Optimierung AttachmentsTab

React.memo für MediaList + MediaEmptyState
Verhindert unnötige Re-Renders

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**🤖 Agent-Workflow:** refactoring-test Agent verwenden

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle comprehensive Test Suite für AttachmentsTab-Refactoring nach Phase 3.

Context:
- Modul: AttachmentsTab (Campaign Edit - Anhänge Tab)
- Hauptdatei: src/app/.../tabs/AttachmentsTab.tsx (70 Zeilen)
- Neue Komponenten:
  - tabs/components/MediaList.tsx (50 Zeilen)
  - tabs/components/MediaEmptyState.tsx (20 Zeilen)
- Context: CampaignContext (useCampaign Hook)
- Externe Komponenten: SimpleBoilerplateLoader

Requirements:
- Component Tests für MediaList (Edge Cases: empty, single, multiple, verschiedene Typen)
- Component Tests für MediaEmptyState (onClick, Hover-States)
- Integration Test für AttachmentsTab (Context-Integration, Boilerplates + Medien)
- Alle Tests müssen bestehen
- Coverage >80%

Besonderheiten:
- KEIN React Query (nutzt Context)
- Toast-Benachrichtigungen im Context (nicht im Tab)
- Assets: { type: 'folder' | 'file', metadata: { fileName, folderName, fileType, thumbnailUrl } }

Deliverable:
- Test-Suite vollständig implementiert (KEINE TODOs)
- Coverage Report
- Test-Dokumentation
```

**Der Agent wird:**
1. MediaList.test.tsx schreiben (15+ Tests)
2. MediaEmptyState.test.tsx schreiben (5+ Tests)
3. AttachmentsTab.test.tsx schreiben (Integration, 10+ Tests)
4. Mocks für CampaignContext erstellen
5. Mocks für SimpleBoilerplateLoader erstellen
6. Coverage Report erstellen

**Output:**
- `tabs/components/__tests__/MediaList.test.tsx`
- `tabs/components/__tests__/MediaEmptyState.test.tsx`
- `tabs/__tests__/AttachmentsTab.test.tsx`
- Coverage Report (>80%)

#### Checkliste Phase 4

- [ ] refactoring-test Agent aufgerufen
- [ ] Agent hat Test-Suite vollständig erstellt (KEINE TODOs)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80%
- [ ] Test-Dokumentation vorhanden

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite AttachmentsTab

30+ Tests (via refactoring-test Agent)
- MediaList.test.tsx (15 Tests)
- MediaEmptyState.test.tsx (5 Tests)
- AttachmentsTab.test.tsx (10 Tests)

Coverage >80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Ziel:** Vollständige Dokumentation

**🤖 Agent-Workflow:** refactoring-dokumentation Agent verwenden

#### Agent aufrufen

**Prompt:**
```markdown
Erstelle umfassende Dokumentation für AttachmentsTab-Refactoring nach Phase 4.

Context:
- Modul: AttachmentsTab (Campaign Edit - Anhänge Tab)
- Hauptdatei: tabs/AttachmentsTab.tsx (70 Zeilen)
- Komponenten:
  - MediaList.tsx (50 Zeilen)
  - MediaEmptyState.tsx (20 Zeilen)
- Context: CampaignContext (State Management)
- Tests: 30+ Tests, Coverage >80%

Besonderheiten:
- KEIN React Query (nutzt CampaignContext)
- Toast-Service zentral im Context
- SimpleBoilerplateLoader (extern)
- AssetSelectorModal (parent, onOpenAssetSelector callback)

Requirements:
- README.md (Hauptdokumentation 200+ Zeilen)
- components.md (Komponenten-Dokumentation 300+ Zeilen)
- adr.md (Architecture Decision Records 150+ Zeilen)
- Code-Beispiele (funktionierend)

ADR-Themen:
- ADR-0001: CampaignContext vs React Query
- ADR-0002: Modularisierung (MediaList + MediaEmptyState)
- ADR-0003: Toast-Service im Context statt im Tab

Deliverable:
- Vollständige Dokumentation (650+ Zeilen)
- Funktionierende Code-Beispiele
```

**Der Agent wird:**
1. docs/campaigns/campaign-edit/tabs/attachments-tab/ Ordner anlegen
2. README.md erstellen (200+ Zeilen)
3. components.md erstellen (300+ Zeilen)
4. adr.md erstellen (150+ Zeilen)
5. Code-Beispiele einbauen

**Output:**
- `docs/campaigns/campaign-edit/tabs/attachments-tab/README.md` (200+ Zeilen)
- `docs/campaigns/campaign-edit/tabs/attachments-tab/components.md` (300+ Zeilen)
- `docs/campaigns/campaign-edit/tabs/attachments-tab/adr.md` (150+ Zeilen)
- **Gesamt: 650+ Zeilen Dokumentation**

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Agent hat Dokumentation erstellt (650+ Zeilen)
- [ ] Alle Dateien vorhanden (README, components, adr)
- [ ] Code-Beispiele funktionieren
- [ ] Links funktionieren

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation AttachmentsTab

650+ Zeilen (via refactoring-dokumentation Agent)
- README.md (200 Zeilen)
- components.md (300 Zeilen)
- adr.md (150 Zeilen)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit | grep AttachmentsTab
```

- [ ] 0 Fehler in AttachmentsTab.tsx
- [ ] 0 Fehler in MediaList.tsx
- [ ] 0 Fehler in MediaEmptyState.tsx

#### 6.2 ESLint Check

```bash
npx eslint src/app/.../tabs/AttachmentsTab.tsx --fix
npx eslint src/app/.../tabs/components/*.tsx --fix
```

- [ ] 0 Warnings

#### 6.3 Console Cleanup

```bash
grep -r "console\." src/app/.../tabs/AttachmentsTab.tsx
grep -r "console\." src/app/.../tabs/components/
```

- [ ] Keine Debug-Logs
- [ ] Nur production-relevante Errors (falls vorhanden)

#### 6.4 Design System Compliance

- [ ] Nur Heroicons /24/outline
- [ ] Zinc-Palette für neutrale Farben
- [ ] #005fab für Primary Actions
- [ ] Focus-Rings vorhanden

#### 6.5 Final Build Test

```bash
npm run build
```

- [ ] Build erfolgreich
- [ ] Keine Errors
- [ ] AttachmentsTab funktioniert

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup: Keine Debug-Logs
- [ ] Design System: Compliant
- [ ] Build: Erfolgreich

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality AttachmentsTab

TypeScript: 0 Fehler ✅
ESLint: 0 Warnings ✅
Design System: Compliant ✅
Build: Erfolgreich ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Ziel:** FINALE Überprüfung vor Merge

**🤖 PROAKTIV:** refactoring-quality-check Agent wird automatisch aufgerufen

**Der Agent überprüft:**

- [ ] Phase 0: Feature-Branch (optional) oder Main
- [ ] Phase 0.5: Cleanup bereits durchgeführt ✅
- [ ] Phase 1: N/A (nutzt Context, kein React Query)
- [ ] Phase 2: MediaList + MediaEmptyState erstellt und integriert
- [ ] Phase 3: React.memo für neue Komponenten
- [ ] Phase 4: Tests existieren, bestehen, Coverage >80%
- [ ] Phase 5: Dokumentation vollständig (650+ Zeilen, keine Platzhalter)
- [ ] Phase 6: TypeScript, ESLint, Build erfolgreich
- [ ] Integration: Alte Inline-Komponenten entfernt, neue importiert

**Output:**
- Quality Report
- GO/NO-GO Empfehlung

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] ALLE Checks bestanden (GO)
- [ ] Falls NO-GO: Probleme behoben

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden

Alle Phasen überprüft ✅
GO für Merge ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🔄 Phase 7: Merge zu Main (falls Feature-Branch)

**Workflow:**

```bash
# Falls Feature-Branch verwendet wurde:
git checkout main
git merge feature/phase-2.2-attachments-tab-refactoring --no-edit
git push origin main
npm test -- AttachmentsTab
```

**Falls direkt auf Main:**
- Bereits auf Main committed
- Push durchgeführt
- Tests laufen auf Main

### Checkliste Merge

- [ ] Phase 6.5 Quality Gate bestanden (GO)
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Main gepushed (oder bereits auf Main)
- [ ] Tests auf Main bestanden

---

## 📝 Master-Checkliste

### Vorbereitung (Phase 0)
- [ ] Feature-Branch erstellt (OPTIONAL)
- [ ] Ist-Zustand dokumentiert: 129 Zeilen

### Phase 0.5: Cleanup
- [x] ✅ BEREITS DURCHGEFÜHRT (Commit 4bfa9569)

### Phase 1: React Query
- [x] ⚠️ ÜBERSPRUNGEN (nutzt CampaignContext)

### Phase 2: Modularisierung
- [ ] MediaList.tsx erstellt (50 Zeilen)
- [ ] MediaEmptyState.tsx erstellt (20 Zeilen)
- [ ] AttachmentsTab refactored (70 Zeilen)

### Phase 3: Performance
- [ ] React.memo für MediaList
- [ ] React.memo für MediaEmptyState

### Phase 4: Testing ⭐ AGENT
- [ ] refactoring-test Agent aufgerufen
- [ ] 30+ Tests (KEINE TODOs)
- [ ] Coverage >80%

### Phase 5: Dokumentation ⭐ AGENT
- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] 650+ Zeilen Dokumentation
- [ ] Keine Platzhalter

### Phase 6: Code Quality
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build erfolgreich

### Phase 6.5: Quality Gate ⭐ AGENT
- [ ] refactoring-quality-check Agent aufgerufen
- [ ] GO-Empfehlung

### Phase 7: Merge
- [ ] Phase 6.5 bestanden (GO)
- [ ] Main gemerged (oder bereits auf Main)
- [ ] Tests auf Main bestanden

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Entwicklung:**
  - Cleanup: 139 → 129 Zeilen (-7%)
  - Refactoring: 129 → 70 Zeilen Main + 70 Zeilen Components (-46% Main)
  - **Gesamt: 139 → 140 Zeilen (+1 Zeile, aber modularer)**

- **Komponenten:**
  - Vorher: 1 Datei (129 Zeilen)
  - Nachher: 3 Dateien (70 + 50 + 20 Zeilen)

- **TypeScript:** 0 Fehler
- **ESLint:** 0 Warnings

### Testing

- **Tests:** 30+ Tests
- **Coverage:** >80%
- **Pass-Rate:** 100%

### Dokumentation

- **Zeilen:** 650+ Zeilen
- **Dateien:** 3 Dokumente
- **Code-Beispiele:** Funktionierend

---

## 🔗 Referenzen

### Projekt-Spezifisch
- **Master-Checkliste:** `docs/planning/campaigns-refactoring-master-checklist.md`
- **ContentTab (Phase 2.1):** `docs/campaigns/campaign-edit/tabs/content-tab/README.md`
- **CampaignContext:** `src/app/.../context/CampaignContext.tsx`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`

### Externe Komponenten
- **SimpleBoilerplateLoader:** `src/components/pr/campaign/SimpleBoilerplateLoader.tsx`
- **AssetSelectorModal:** `src/components/campaigns/AssetSelectorModal.tsx`
- **Toast-Service:** `src/lib/utils/toast.ts`

---

## 💡 Wichtige Entscheidungen (ADR-Vorschau)

### ADR-0001: CampaignContext statt React Query

**Entscheidung:** AttachmentsTab nutzt CampaignContext, NICHT React Query

**Begründung:**
- Shared State über alle Campaign Edit Tabs
- Keine separaten API-Calls pro Tab
- Context-Actions bereits optimiert (useCallback, Toast-Integration)

**Alternativen:**
- React Query: ❌ Overhead, duplicate State
- Lokaler State: ❌ Props-Drilling

### ADR-0002: Minimale Modularisierung

**Entscheidung:** MediaList + MediaEmptyState extrahieren

**Begründung:**
- Bessere Testbarkeit (isolated Tests)
- Wiederverwendbare Komponenten (potentiell)
- Konsistent mit ContentTab-Ansatz
- Code bleibt übersichtlich (70 Zeilen Main)

**Alternativen:**
- Keine Modularisierung: ❌ Schwerer zu testen
- Vollständige Modularisierung: ❌ Overhead für 129 Zeilen

### ADR-0003: Toast-Service im Context

**Entscheidung:** Toast-Benachrichtigungen zentral im CampaignContext

**Begründung:**
- Konsistent über alle Tabs
- Kein lokaler Toast-State nötig
- Bereits implementiert (updateAttachedAssets, removeAsset)

**Implementierung:**
```typescript
// CampaignContext.tsx
const updateAttachedAssets = useCallback((assets: CampaignAssetAttachment[]) => {
  setAttachedAssets(prev => {
    const newCount = assets.length - prev.length;
    if (newCount > 0) {
      toastService.success(`${newCount} Medium${newCount > 1 ? 'en' : ''} hinzugefügt`);
    }
    return assets;
  });
}, []);

const removeAsset = useCallback((assetId: string) => {
  setAttachedAssets(prev => prev.filter(asset =>
    (asset.assetId || asset.folderId) !== assetId
  ));
  toastService.success('Medium entfernt');
}, []);
```

---

**Version:** 1.0
**Erstellt:** 2025-11-05
**Template:** Module-Refactoring Template v2.1 (Kompakt)

**Changelog:**
- **2025-11-05:** Initial Plan erstellt
  - Basis: Template v2.1
  - Anpassungen für AttachmentsTab (Context-basiert, bereits gut strukturiert)
  - Phasen 0, 0.5, 1 angepasst (optional/übersprungen)
  - Fokus auf Modularisierung, Tests, Dokumentation

---

*Dieses Dokument ist Teil des Campaign-Module Refactorings (Phase 2.2 von 2.4)*
