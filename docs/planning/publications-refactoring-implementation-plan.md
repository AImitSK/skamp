# Publications-Modul: Refactoring-Implementierungsplan

**Version:** 1.0
**Status:** 🟡 In Planung
**Basiert auf:** [Module-Refactoring-Template v1.1](../templates/module-refactoring-template.md)
**Erstellt:** 15. Oktober 2025

---

## 📋 Executive Summary

Das Publications-Modul benötigt ein vollständiges Refactoring nach dem bewährten 7-Phasen-Template, um Production-Ready zu werden.

### Ist-Zustand (Aktuell)

**✅ Bereits erledigt:**
- Detailseite komplett neu aufgebaut (916 Zeilen, ohne Tabs, nach CRM-Vorbild)
- Toast-Service vollständig integriert
- Datenanalyse durchgeführt ([publications-data-analysis.md](./publications-data-analysis.md))
- Unnötige Felder entfernt (Werbemittel, Redaktion Tabs)

**❌ Noch zu tun:**
- React Query Integration (Haupt-Priorität)
- PublicationModal modularisieren (629 Zeilen → Sections)
- Performance-Optimierungen
- Comprehensive Test Suite
- Vollständige Dokumentation
- Code Quality Checks

### Geschätzter Aufwand

**Gesamt:** 3-4 Tage

| Phase | Beschreibung | Dauer | Status |
|-------|-------------|-------|--------|
| 0 | Setup & Backup | 30min | ⏳ Bereit |
| 0.5 | Pre-Cleanup | 1-2h | ⏳ Bereit |
| 1 | React Query | 4h | ⏳ Offen |
| 2 | Modularisierung | 4h | ⏳ Offen |
| 3 | Performance | 2h | ⏳ Offen |
| 4 | Testing | 4h | ⏳ Offen |
| 5 | Dokumentation | 3h | ⏳ Offen |
| 6 | Code Quality | 2h | ⏳ Offen |
| Merge | Zu Main | 30min | ⏳ Offen |

---

## 🎯 Ziele

### Primäre Ziele

- [ ] **React Query Integration:** State Management modernisieren
- [ ] **Modal modularisieren:** PublicationModal von 629 → ~8 Dateien (< 300 Zeilen)
- [ ] **Performance:** useCallback, useMemo, Debouncing implementieren
- [ ] **Tests:** Test-Coverage >80%
- [ ] **Dokumentation:** 2500+ Zeilen vollständige Docs
- [ ] **Production-Ready:** 0 TypeScript-Fehler, 0 ESLint-Warnings

### Sekundäre Ziele

- [ ] Konsistenz mit CRM-Modul (bereits teilweise erreicht)
- [ ] Wiederverwendbare Components (Alert → Toast ✅)
- [ ] Design System Compliance

---

## 📁 Ist-Zustand: Dateien & Struktur

### Aktuelle Struktur

```
src/app/dashboard/library/publications/
├── page.tsx                              # 920 Zeilen - Liste/Übersicht
├── [publicationId]/
│   └── page.tsx                          # 916 Zeilen - Detailseite ✅ NEU AUFGEBAUT
├── PublicationModal.tsx                  # 629 Zeilen - MUSS MODULARISIERT WERDEN
└── __tests__/                            # ❌ NICHT VORHANDEN

src/lib/hooks/
└── usePublicationsData.ts                # ❌ NICHT VORHANDEN (React Query)

docs/publications/
└── [Alle Docs fehlen]                    # ❌ NICHT VORHANDEN
```

### Code-Statistiken

| Datei | Zeilen | Status | Ziel |
|-------|--------|--------|------|
| `page.tsx` | 920 | ⚠️ Needs React Query | < 300 |
| `[publicationId]/page.tsx` | 916 | ✅ Neu aufgebaut | < 300 |
| `PublicationModal.tsx` | 629 | ❌ Monolith | ~8 Dateien |

**Gesamt:** ~2.465 Zeilen Code (ohne Tests, ohne Docs)

---

## 🚀 Phase-für-Phase Plan

### Phase 0: Vorbereitung & Setup (30 Minuten)

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/publications-refactoring-production
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/app/dashboard/library/publications/**/*.tsx

  # Code-Statistik
  npx cloc src/app/dashboard/library/publications
  ```

- [ ] Backups erstellen
  ```bash
  # PublicationModal sichern
  cp src/app/dashboard/library/publications/PublicationModal.tsx \
     src/app/dashboard/library/publications/PublicationModal.backup.tsx

  # page.tsx sichern
  cp src/app/dashboard/library/publications/page.tsx \
     src/app/dashboard/library/publications/page.backup.tsx
  ```

- [ ] Dependencies prüfen
  - [x] React Query installiert? (`@tanstack/react-query`) → ✅ Ja
  - [x] Testing Libraries? (`jest`, `@testing-library/react`) → ✅ Ja
  - [x] TypeScript konfiguriert? → ✅ Ja

#### Deliverable

```markdown
## Phase 0: Setup ✅

### Durchgeführt
- Feature-Branch: `feature/publications-refactoring-production`
- Ist-Zustand: 3 Dateien, ~2.465 Zeilen Code
- Backups: PublicationModal.backup.tsx, page.backup.tsx
- Dependencies: Alle vorhanden

### Struktur (Ist)
- page.tsx: 920 Zeilen (Liste/Übersicht)
- [publicationId]/page.tsx: 916 Zeilen (Detailseite - bereits neu)
- PublicationModal.tsx: 629 Zeilen (Muss modularisiert werden)

### Bereit für Phase 0.5 (Cleanup)
```

#### Commit

```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Publications-Refactoring"
```

---

### Phase 0.5: Pre-Refactoring Cleanup (1-2 Stunden)

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

#### 0.5.1 TODO-Kommentare finden & entfernen

```bash
grep -rn "TODO:" src/app/dashboard/library/publications
# oder
rg "TODO:" src/app/dashboard/library/publications
```

**Aktion:**
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen (nicht verschieben!)

#### 0.5.2 Console-Logs finden & entfernen

```bash
grep -rn "console\." src/app/dashboard/library/publications
# oder
rg "console\." src/app/dashboard/library/publications
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors
catch (error) {
  console.error('Failed to load publication:', error);
}
```

**Entfernen:**
```typescript
// ❌ Debug-Logs
console.log('data:', data);
console.log('📰 Publication geladen:', pub);
```

**Aktion:**
- [ ] Alle console.log() entfernen
- [ ] Nur console.error() in catch-blocks behalten

#### 0.5.3 Deprecated Functions finden & entfernen

**Aktion:**
- [ ] Code auf "deprecated", "old", "legacy" durchsuchen
- [ ] Mock-Implementations identifizieren
- [ ] Unused Functions entfernen

#### 0.5.4 Unused State entfernen

```bash
grep -n "useState" src/app/dashboard/library/publications/page.tsx
```

**Aktion:**
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused States identifizieren
- [ ] States + Setter entfernen

#### 0.5.5 Kommentierte Code-Blöcke entfernen

```bash
grep -n "^[[:space:]]*//" src/app/dashboard/library/publications/page.tsx | wc -l
```

**Aktion:**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Entscheidung: Implementieren oder entfernen?
- [ ] Code-Blöcke vollständig löschen

#### 0.5.6 ESLint Auto-Fix

```bash
npx eslint src/app/dashboard/library/publications --fix
```

**Aktion:**
- [ ] ESLint mit --fix ausführen
- [ ] Diff prüfen (git diff)
- [ ] Manuelle Fixes für verbleibende Warnings

#### 0.5.7 Manueller Test

```bash
npm run dev
# → http://localhost:3000/dashboard/library/publications
```

**Aktion:**
- [ ] Dev-Server starten
- [ ] Modul aufrufen
- [ ] Liste laden
- [ ] Details öffnen
- [ ] Create/Update/Delete testen
- [ ] Keine Console-Errors

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- [X] TODO-Kommentare
- ~[Y] Debug-Console-Logs
- [Z] Deprecated Functions
- [A] Unused State-Variablen
- [B] Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Ergebnis
- page.tsx: 920 → [X] Zeilen (-[Y] Zeilen)
- PublicationModal.tsx: 629 → [X] Zeilen (-[Y] Zeilen)
- Saubere Basis für Phase 1 (React Query)

### Manueller Test
- ✅ Liste lädt
- ✅ Details funktionieren
- ✅ Create/Update/Delete funktioniert
- ✅ Keine Console-Errors
```

#### Commit

```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Deprecated Functions entfernt
- [A] Unused State entfernt
- Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

page.tsx: 920 → [X] Zeilen (-[Y] Zeilen toter Code)
PublicationModal.tsx: 629 → [X] Zeilen (-[Y] Zeilen toter Code)

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration (4 Stunden)

**Ziel:** State Management mit React Query ersetzen

#### 1.1 Custom Hooks erstellen (2 Stunden)

**Datei:** `src/lib/hooks/usePublicationsData.ts`

**6 Hooks implementieren:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publicationService } from '@/lib/firebase/library-service';

// Query Hooks
export function usePublications(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['publications', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization');
      return publicationService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

export function usePublication(id: string | undefined) {
  return useQuery({
    queryKey: ['publication', id],
    queryFn: () => {
      if (!id) throw new Error('No ID');
      return publicationService.getById(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation Hooks
export function useCreatePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { organizationId: string; publicationData: any }) => {
      return publicationService.create(data.publicationData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}

export function useUpdatePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; publicationData: any }) => {
      await publicationService.update(data.id, data.publicationData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publication', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}

export function useDeletePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string }) => {
      await publicationService.delete(data.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}

export function useVerifyPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; userId: string }) => {
      await publicationService.verify(data.id, {
        organizationId: data.organizationId,
        userId: data.userId
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['publication', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['publications', variables.organizationId] });
    },
  });
}
```

#### 1.2 page.tsx anpassen (1 Stunde)

**Entfernen:**
```typescript
// Alte useEffect/loadData-Pattern
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => {
    // ...
  };
  loadData();
}, [organizationId]);
```

**Hinzufügen:**
```typescript
import {
  usePublications,
  useCreatePublication,
  useUpdatePublication,
  useDeletePublication,
} from '@/lib/hooks/usePublicationsData';

// In der Komponente
const { data: publications = [], isLoading, error } = usePublications(organizationId);
const createPublication = useCreatePublication();
const updatePublication = useUpdatePublication();
const deletePublication = useDeletePublication();

// Handler anpassen
const handleCreate = async (data: any) => {
  await createPublication.mutateAsync({ organizationId, publicationData: data });
  toastService.success('Publikation erstellt');
};

const handleUpdate = async (id: string, data: any) => {
  await updatePublication.mutateAsync({ id, organizationId, publicationData: data });
  toastService.success('Publikation aktualisiert');
};

const handleDelete = async (id: string) => {
  await deletePublication.mutateAsync({ id, organizationId });
  toastService.success('Publikation gelöscht');
};
```

#### 1.3 [publicationId]/page.tsx anpassen (1 Stunde)

**Bereits teilweise erledigt!** Die Detailseite nutzt bereits:
```typescript
const loadData = useCallback(async () => {
  // Manuelles Laden
}, [user, publicationId, currentOrganization?.id]);
```

**Ersetzen durch:**
```typescript
const { data: publication, isLoading, error, refetch } = usePublication(publicationId);
const updatePublication = useUpdatePublication();
const verifyPublication = useVerifyPublication();

const handleUpdate = async (data: any) => {
  await updatePublication.mutateAsync({ id: publicationId, organizationId, publicationData: data });
  toastService.success('Publikation aktualisiert');
};

const handleVerify = async () => {
  await verifyPublication.mutateAsync({ id: publicationId, organizationId, userId: user.uid });
  toastService.success('Publikation verifiziert');
};
```

#### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`usePublicationsData.ts`)
- [ ] 6 Hooks implementiert (getAll, getById, create, update, delete, verify)
- [ ] page.tsx auf React Query umgestellt
- [ ] [publicationId]/page.tsx auf React Query umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Manueller Test durchgeführt

#### Deliverable

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks in `usePublicationsData.ts` (6 Hooks)
- page.tsx vollständig auf React Query umgestellt
- [publicationId]/page.tsx auf React Query umgestellt

### Vorteile
- Automatisches Caching (5min staleTime)
- Query Invalidierung bei Mutations
- Error Handling über React Query
- ~100 Zeilen Boilerplate Code gespart

### Code-Reduktion
- page.tsx: [X] → [Y] Zeilen (-[Z] Zeilen)
- [publicationId]/page.tsx: 916 → [Y] Zeilen (-[Z] Zeilen)
```

#### Commit

```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Publications abgeschlossen

- Custom Hooks in usePublicationsData.ts erstellt (6 Hooks)
- page.tsx vollständig auf React Query umgestellt
- [publicationId]/page.tsx auf React Query umgestellt
- Alte loadData-Pattern entfernt
- Automatisches Caching und Query Invalidierung

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung (4 Stunden)

**Ziel:** PublicationModal modularisieren (629 Zeilen → ~8 Dateien)

#### 2.1 Shared Components (bereits erledigt! ✅)

**Status:** Toast-Service bereits integriert, keine Shared Components nötig.

- ✅ Alert → Ersetzt durch toastService
- ✅ ConfirmDialog → Ersetzt durch Browser confirm() oder kann erstellt werden
- ✅ EmptyState → Kann bei Bedarf erstellt werden

**Entscheidung:** Dieser Schritt kann übersprungen werden.

#### 2.2 PublicationModal modularisieren (4 Stunden)

**Faustregel:** Komponenten > 500 Zeilen sollten aufgeteilt werden
**PublicationModal:** 629 Zeilen → MUSS modularisiert werden!

**Ziel-Struktur:**

```
src/app/dashboard/library/publications/components/sections/
├── index.tsx                           # Main Orchestrator (~250 Zeilen)
├── types.ts                            # Shared Types (~70 Zeilen)
├── BasicInfoSection.tsx                # Tab 1: Grunddaten (~100 Zeilen)
├── MetricsSection.tsx                  # Tab 2: Metriken (~150 Zeilen)
├── IdentifiersSection.tsx              # Tab 3: Identifikatoren (~80 Zeilen)
├── MonitoringSection.tsx               # Tab 4: Monitoring (~130 Zeilen)
└── __tests__/
    ├── BasicInfoSection.test.tsx
    ├── MetricsSection.test.tsx
    ├── IdentifiersSection.test.tsx
    └── MonitoringSection.test.tsx
```

**Schritt-für-Schritt:**

1. **types.ts erstellen** (30min)
   ```typescript
   // Shared Types & Helper Functions
   export interface PublicationFormData {
     // ... alle Felder
   }

   export interface SectionProps {
     data: PublicationFormData;
     onChange: (field: string, value: any) => void;
     errors?: Record<string, string>;
   }
   ```

2. **BasicInfoSection.tsx** (45min)
   - Name, Subtitle, Description
   - Type, Format, Scope, Status
   - Publisher, Languages, Countries

3. **MetricsSection.tsx** (1h)
   - Frequency
   - Print Metrics (Circulation, Price)
   - Online Metrics (Visitors, PageViews, etc.)
   - Target Audience

4. **IdentifiersSection.tsx** (30min)
   - Identifiers Array
   - Website URL
   - Social Media URLs
   - Editions

5. **MonitoringSection.tsx** (45min)
   - isEnabled
   - checkFrequency
   - Website URL
   - RSS Feed URLs
   - Auto-Detect RSS
   - Keywords

6. **index.tsx (Main Orchestrator)** (45min)
   ```typescript
   import BasicInfoSection from './BasicInfoSection';
   import MetricsSection from './MetricsSection';
   import IdentifiersSection from './IdentifiersSection';
   import MonitoringSection from './MonitoringSection';
   import { PublicationFormData, SectionProps } from './types';

   export default function PublicationModal({ isOpen, onClose, publication }: Props) {
     const [activeTab, setActiveTab] = useState('basic');
     const [formData, setFormData] = useState<PublicationFormData>(initialState);

     const handleFieldChange = (field: string, value: any) => {
       setFormData(prev => ({ ...prev, [field]: value }));
     };

     return (
       <Dialog open={isOpen} onClose={onClose} size="3xl">
         <DialogTitle>
           {publication ? 'Publikation bearbeiten' : 'Neue Publikation'}
         </DialogTitle>

         {/* Tabs */}
         <Tabs activeTab={activeTab} onChange={setActiveTab} />

         <DialogBody>
           {activeTab === 'basic' && (
             <BasicInfoSection data={formData} onChange={handleFieldChange} />
           )}
           {activeTab === 'metrics' && (
             <MetricsSection data={formData} onChange={handleFieldChange} />
           )}
           {activeTab === 'identifiers' && (
             <IdentifiersSection data={formData} onChange={handleFieldChange} />
           )}
           {activeTab === 'monitoring' && (
             <MonitoringSection data={formData} onChange={handleFieldChange} />
           )}
         </DialogBody>

         <DialogActions>
           <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
           <Button onClick={handleSave}>Speichern</Button>
         </DialogActions>
       </Dialog>
     );
   }
   ```

7. **Backward Compatibility** (15min)
   ```typescript
   // PublicationModal.tsx (3 Zeilen)
   // Re-export für bestehende Imports
   export { default as PublicationModal } from './components/sections';
   ```

#### Checkliste Phase 2

- [ ] Shared Components (übersprungen, Toast bereits da)
- [ ] PublicationModal.tsx → Backup erstellt
- [ ] types.ts erstellt (~70 Zeilen)
- [ ] BasicInfoSection.tsx (~100 Zeilen)
- [ ] MetricsSection.tsx (~150 Zeilen)
- [ ] IdentifiersSection.tsx (~80 Zeilen)
- [ ] MonitoringSection.tsx (~130 Zeilen)
- [ ] index.tsx (Main) (~250 Zeilen)
- [ ] Backward Compatibility (PublicationModal.tsx → 3 Zeilen)
- [ ] Alle Imports aktualisiert
- [ ] Manueller Test bestanden

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### PublicationModal-Modularisierung
- PublicationModal.tsx: 629 Zeilen → 8 Dateien (~780 Zeilen total)
  - index.tsx: ~250 Zeilen (Main Orchestrator)
  - types.ts: ~70 Zeilen (Shared Types)
  - BasicInfoSection.tsx: ~100 Zeilen
  - MetricsSection.tsx: ~150 Zeilen
  - IdentifiersSection.tsx: ~80 Zeilen
  - MonitoringSection.tsx: ~130 Zeilen
- Backward Compatibility: PublicationModal.tsx → 3 Zeilen (Re-export)

### Vorteile
- Bessere Code-Lesbarkeit (< 300 Zeilen pro Datei)
- Einfachere Wartung
- Eigenständig testbare Sections
- Wiederverwendbare Section-Komponenten

### Shared Components
- ✅ Toast-Service bereits integriert (Phase vorher erledigt)
```

#### Commit

```bash
git add .
git commit -m "feat: Phase 2 - PublicationModal modularisiert

PublicationModal: 629 Zeilen → 8 Dateien

Neue Struktur:
- index.tsx (~250 Zeilen) - Main Orchestrator
- types.ts (~70 Zeilen) - Shared Types
- BasicInfoSection.tsx (~100 Zeilen) - Tab 1
- MetricsSection.tsx (~150 Zeilen) - Tab 2
- IdentifiersSection.tsx (~80 Zeilen) - Tab 3
- MonitoringSection.tsx (~130 Zeilen) - Tab 4
- Backward Compatibility beibehalten (Re-export)

Vorteile:
- Alle Sections < 300 Zeilen
- Eigenständig testbar
- Bessere Code-Organisation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 3: Performance-Optimierung (2 Stunden)

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

#### 3.1 useCallback für Handler (30min)

**Dateien:** `page.tsx`, `[publicationId]/page.tsx`, `components/sections/index.tsx`

```typescript
import { useCallback, useMemo } from 'react';

// Handler mit useCallback wrappen
const handleCreate = useCallback(async (data: any) => {
  await createPublication.mutateAsync({ organizationId, publicationData: data });
  toastService.success('Publikation erstellt');
}, [createPublication, organizationId]);

const handleUpdate = useCallback(async (id: string, data: any) => {
  await updatePublication.mutateAsync({ id, organizationId, publicationData: data });
  toastService.success('Publikation aktualisiert');
}, [updatePublication, organizationId]);

const handleDelete = useCallback(async (id: string) => {
  await deletePublication.mutateAsync({ id, organizationId });
  toastService.success('Publikation gelöscht');
}, [deletePublication, organizationId]);

const handleFieldChange = useCallback((field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
}, []);
```

#### 3.2 useMemo für Computed Values (30min)

```typescript
// Dropdown-Optionen (in Sections)
const typeOptions = useMemo(() => {
  return PUBLICATION_TYPES.map(type => ({
    value: type.id,
    label: type.label,
  }));
}, []); // Keine Dependencies = nur einmal berechnen

// Gefilterte/Sortierte Daten (in page.tsx)
const filteredPublications = useMemo(() => {
  let result = publications;

  // Filter anwenden
  if (searchTerm) {
    result = result.filter(pub =>
      pub.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (selectedType) {
    result = result.filter(pub => pub.type === selectedType);
  }

  // Sortierung
  result.sort((a, b) => a.title.localeCompare(b.title));

  return result;
}, [publications, searchTerm, selectedType]);

// Statistiken
const stats = useMemo(() => {
  return {
    total: publications.length,
    filtered: filteredPublications.length,
    verified: publications.filter(p => p.verified).length,
  };
}, [publications.length, filteredPublications.length, publications]);
```

#### 3.3 Debouncing für Search (30min)

```typescript
// Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// In page.tsx
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms Delay

// Filter verwendet debouncedSearchTerm
const filteredPublications = useMemo(() => {
  if (!debouncedSearchTerm) return publications;
  return publications.filter(pub =>
    pub.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );
}, [publications, debouncedSearchTerm]);
```

#### 3.4 React.memo für Section-Komponenten (30min)

```typescript
import React from 'react';

// Section-Komponenten memoizen
export default React.memo(function BasicInfoSection({ data, onChange }: Props) {
  return (
    <FieldGroup>
      {/* ... */}
    </FieldGroup>
  );
});

export default React.memo(function MetricsSection({ data, onChange }: Props) {
  return (
    <FieldGroup>
      {/* ... */}
    </FieldGroup>
  );
});

// Analog für alle anderen Sections
```

#### Checkliste Phase 3

- [ ] useCallback für alle Handler (page.tsx, [publicationId]/page.tsx, sections/index.tsx)
- [ ] useMemo für Dropdown-Optionen (in allen Sections)
- [ ] useMemo für gefilterte/sortierte Daten (page.tsx)
- [ ] useMemo für Statistiken (page.tsx)
- [ ] Debouncing für Search implementiert (300ms)
- [ ] React.memo für alle Section-Komponenten
- [ ] Performance-Tests durchgeführt (React DevTools Profiler)

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für [X] Handler
- useMemo für [Y] Computed Values (Dropdown-Options, Filter, Stats)
- Debouncing (300ms Search)
- React.memo für 4 Section-Komponenten

### Messbare Verbesserungen
- Re-Renders reduziert um ~30%
- Search-Filter optimiert (300ms Debouncing)
- Dropdown-Options gecacht
```

#### Commit

```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

Implementiert:
- useCallback für alle Handler (Create, Update, Delete, FieldChange)
- useMemo für Dropdown-Options, Filter, Statistiken
- Debouncing (300ms) für Search-Filter
- React.memo für alle 4 Section-Komponenten

Performance-Verbesserungen:
- Re-Renders reduziert um ~30%
- Dropdown-Options werden nur einmal berechnet
- Search-Input löst erst nach 300ms Filter aus

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing (4 Stunden)

**Ziel:** Comprehensive Test Suite mit >80% Coverage

#### 4.1 Hook Tests (1 Stunde)

**Datei:** `src/lib/hooks/__tests__/usePublicationsData.test.tsx`

**Tests:**
- [ ] usePublications: sollte Publications laden
- [ ] usePublications: sollte Error bei fehlendem organizationId werfen
- [ ] usePublication: sollte einzelne Publication laden
- [ ] usePublication: sollte null bei nicht-existierender ID zurückgeben
- [ ] useCreatePublication: sollte Publication erstellen und Cache invalidieren
- [ ] useUpdatePublication: sollte Publication updaten und Cache invalidieren
- [ ] useDeletePublication: sollte Publication löschen und Cache invalidieren
- [ ] useVerifyPublication: sollte Publication verifizieren und Cache invalidieren

**Gesamt:** ~8 Tests

#### 4.2 Integration Tests (1 Stunde)

**Datei:** `src/app/dashboard/library/publications/__tests__/integration/publications-crud-flow.test.tsx`

**Tests:**
- [ ] sollte kompletten CRUD-Flow durchlaufen (Create → Read → Update → Delete)
- [ ] sollte Verify-Flow durchlaufen

**Gesamt:** ~2 Tests

#### 4.3 Component Tests für Sections (1.5 Stunden)

**Dateien:**
- `components/sections/__tests__/BasicInfoSection.test.tsx`
- `components/sections/__tests__/MetricsSection.test.tsx`
- `components/sections/__tests__/IdentifiersSection.test.tsx`
- `components/sections/__tests__/MonitoringSection.test.tsx`

**Tests pro Section:**
- [ ] sollte rendern ohne Fehler
- [ ] sollte Felder korrekt anzeigen
- [ ] sollte onChange bei Input-Änderung aufrufen
- [ ] sollte Validierungs-Errors anzeigen

**Gesamt:** ~16 Tests (4 Tests × 4 Sections)

#### 4.4 Test-Cleanup (30min)

- [ ] Alte/Redundante Tests entfernen
- [ ] Failing Tests fixen
- [ ] TypeScript-Fehler in Tests beheben

#### Test-Ausführung

```bash
# Alle Tests
npm test

# Nur Publications-Tests
npm test -- publications

# Coverage
npm run test:coverage

# Watch-Mode für Entwicklung
npm test -- publications --watch
```

#### Checkliste Phase 4

- [ ] Hook-Tests erstellt (8 Tests)
- [ ] Integration-Tests erstellt (2 Tests)
- [ ] Component-Tests für Sections (16 Tests)
- [ ] Alte Tests entfernt
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt (npm run test:coverage)
- [ ] Coverage >80%

#### Deliverable

```markdown
## Phase 4: Testing ✅

### Test Suite
- Hook-Tests: 8/8 bestanden
- Integration-Tests: 2/2 bestanden
- Component-Tests: 16/16 bestanden
- **Gesamt: 26/26 Tests bestanden**

### Coverage
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%
- **Ziel >80%: ✅ Erreicht**

### Cleanup
- [X] alte Tests entfernt
```

#### Commit

```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt

Test Suite:
- Hook-Tests: 8 Tests (usePublicationsData)
- Integration-Tests: 2 Tests (CRUD Flow)
- Component-Tests: 16 Tests (4 Sections × 4 Tests)
- Gesamt: 26 Tests

Coverage:
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%
- Target >80%: ✅ Erreicht

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation (3 Stunden)

**Ziel:** Vollständige, wartbare Dokumentation (2500+ Zeilen)

#### 5.1 Struktur anlegen (5min)

```bash
mkdir -p docs/publications/{api,components,adr}
```

#### 5.2 README.md (Hauptdokumentation) (1 Stunde)

**Datei:** `docs/publications/README.md`

**Inhalt:**
- Übersicht (Was ist das Publications-Modul?)
- Features (Liste aller Features)
- Architektur (Ordnerstruktur, Komponenten-Übersicht)
- Tech-Stack (React Query, Next.js, Firebase, etc.)
- Installation & Setup
- API-Dokumentation (Link zu api/README.md)
- Komponenten (Link zu components/README.md)
- Testing (Test-Ausführung, Coverage)
- Performance (Optimierungen, Messungen)
- Troubleshooting (Häufige Probleme & Lösungen)
- Referenzen (Links zu anderen Docs)

**Ziel:** ~400-500 Zeilen

#### 5.3 API-Dokumentation (1 Stunde)

**Datei:** `docs/publications/api/publication-service.md`

**Inhalt:**
- Übersicht
- Methoden (getAll, getById, create, update, delete, verify)
- TypeScript-Typen (Publication, CreatePublicationInput, etc.)
- Error Handling
- Performance (Caching, Optimierungen)
- Code-Beispiele

**Ziel:** ~800-900 Zeilen

**Datei:** `docs/publications/api/README.md`

**Inhalt:**
- API-Übersicht
- Service-Links
- Quick Reference

**Ziel:** ~300 Zeilen

#### 5.4 Komponenten-Dokumentation (45min)

**Datei:** `docs/publications/components/README.md`

**Inhalt:**
- Shared Components (Toast-Service)
- Section Components (BasicInfo, Metrics, Identifiers, Monitoring)
- Props-Dokumentation
- Verwendungsbeispiele
- Best Practices

**Ziel:** ~650 Zeilen

#### 5.5 ADR-Dokumentation (15min)

**Datei:** `docs/publications/adr/README.md`

**Inhalt:**
- ADR-Index
- ADR-0001: React Query vs. Redux
- ADR-0002: Modal Modularization Strategy
- ADR-0003: Toast-Service vs. Inline Alerts

**Ziel:** ~350 Zeilen

#### Checkliste Phase 5

- [ ] docs/publications/README.md erstellt (400-500 Zeilen)
- [ ] docs/publications/api/README.md erstellt (300 Zeilen)
- [ ] docs/publications/api/publication-service.md erstellt (800-900 Zeilen)
- [ ] docs/publications/components/README.md erstellt (650 Zeilen)
- [ ] docs/publications/adr/README.md erstellt (350 Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅

### Erstellt
- README.md (450 Zeilen) - Hauptdokumentation
- api/README.md (300 Zeilen) - API-Übersicht
- api/publication-service.md (850 Zeilen) - Detaillierte API-Referenz
- components/README.md (650 Zeilen) - Komponenten-Dokumentation
- adr/README.md (350 Zeilen) - Architecture Decision Records

### Gesamt
- **2.600 Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Messungen
```

#### Commit

```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt

Dokumentation:
- README.md (450 Zeilen) - Hauptdokumentation
- api/README.md (300 Zeilen) - API-Übersicht
- api/publication-service.md (850 Zeilen) - Service-Referenz
- components/README.md (650 Zeilen) - Komponenten-Docs
- adr/README.md (350 Zeilen) - ADRs

Gesamt: 2.600 Zeilen Dokumentation

Inhalt:
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Messungen
- Architecture Decisions

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality (2 Stunden)

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check (30min)

```bash
# Alle Fehler anzeigen
npx tsc --noEmit

# Nur Publications-Dateien prüfen
npx tsc --noEmit | grep publications
```

**Aktion:**
- [ ] Alle TypeScript-Fehler beheben
- [ ] Missing imports ergänzen
- [ ] Incorrect prop types fixen
- [ ] Optional Chaining (`?.`) verwenden wo nötig

**Ziel:** 0 TypeScript-Fehler in Publications-Modul

#### 6.2 ESLint Check (30min)

```bash
# Alle Warnings/Errors
npx eslint src/app/dashboard/library/publications

# Auto-Fix
npx eslint src/app/dashboard/library/publications --fix
```

**Aktion:**
- [ ] Alle ESLint-Warnings beheben
- [ ] Unused imports entfernen
- [ ] Unused variables entfernen
- [ ] Missing dependencies in Hooks ergänzen

**Ziel:** 0 ESLint-Warnings in Publications-Modul

#### 6.3 Console Cleanup (15min)

```bash
# Console-Statements finden
rg "console\." src/app/dashboard/library/publications
```

**Aktion:**
- [ ] Alle Debug-Logs entfernen
- [ ] Nur production-relevante console.error() behalten

#### 6.4 Design System Compliance (30min)

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

**Checklist:**
- [ ] Keine Schatten (außer Dropdowns)
- [ ] Nur Heroicons /24/outline
- [ ] Zinc-Palette für neutrale Farben
- [ ] #005fab für Primary Actions
- [ ] #dedc00 für Checkboxen (falls verwendet)
- [ ] Konsistente Höhen (h-10 für Inputs/Buttons)
- [ ] Konsistente Borders (zinc-300)
- [ ] Focus-Rings (focus:ring-2 focus:ring-primary)

#### 6.5 Final Build Test (15min)

```bash
# Build erstellen
npm run build

# Build testen
npm run start
```

**Prüfen:**
- [ ] Build erfolgreich?
- [ ] Keine Errors?
- [ ] App startet korrekt?
- [ ] Publications-Modul funktioniert im Production-Build?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in Publications
- [ ] ESLint: 0 Warnings in Publications
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Performance: Kein Lag, flüssiges UI

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- [Liste von behobenen Problemen]

### Design System Compliance
- ✅ Keine Schatten (außer Dropdowns)
- ✅ Nur Heroicons /24/outline
- ✅ Konsistente Farben (Zinc-Palette, Primary #005fab)
- ✅ Konsistente Höhen/Borders
- ✅ Focus-States korrekt
```

#### Commit

```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt

Checks:
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: [X] Debug-Logs entfernt
- ✅ Design System: Vollständig compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

Publications-Modul ist jetzt Production-Ready!

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Merge zu Main (30 Minuten)

**Letzte Phase:** Code zu Main mergen

#### Workflow

```bash
# 1. Finaler Test-Run
npm test -- publications
npm run test:coverage

# 2. Push Feature-Branch
git push origin feature/publications-refactoring-production

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/publications-refactoring-production --no-edit

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- publications
```

#### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen (inkl. Phase 0.5 Cleanup)
- [ ] Alle Tests bestehen (26/26)
- [ ] Coverage >80%
- [ ] Dokumentation vollständig (2600+ Zeilen)
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

#### Final Report

```markdown
## ✅ Publications-Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen (inkl. Pre-Refactoring Cleanup)
- **Tests:** 26/26 bestanden
- **Coverage:** [X]% (>80%)
- **Dokumentation:** 2.600+ Zeilen

### Code-Änderungen
- PublicationModal: 629 Zeilen → 8 Dateien (~780 Zeilen)
- page.tsx: 920 → [X] Zeilen (React Query)
- [publicationId]/page.tsx: 916 → [X] Zeilen (React Query)
- Neue Dateien: usePublicationsData.ts, 4 Section-Components

### Highlights
- React Query Integration mit 6 Custom Hooks
- PublicationModal von 629 Zeilen → 8 modulare Dateien
- Performance-Optimierungen (useCallback, useMemo, Debouncing)
- Comprehensive Test Suite (26 Tests, >80% Coverage)
- 2.600+ Zeilen Dokumentation (README, API, Components, ADRs)
- Toast-Service bereits integriert ✅

### Nächste Schritte
- [ ] Production-Deployment vorbereiten
- [ ] Team-Demo durchführen
- [ ] Monitoring aufsetzen
- [ ] User-Feedback sammeln
```

---

## 📊 Erfolgsmetriken (Prognose)

### Code Quality

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|--------------|
| Größte Datei | 920 Zeilen | < 300 Zeilen | ✅ 69% |
| Zeilen (Gesamt) | ~2.465 | ~3.200 | +735 (Tests+Docs) |
| Komponenten | 3 | ~12 | +9 (modular) |
| Code-Duplikation | Mittel | Minimal | ✅ Eliminiert |
| TypeScript-Fehler | ? | 0 | ✅ |
| ESLint-Warnings | ? | 0 | ✅ |

### Testing

| Metrik | Vorher | Nachher |
|--------|--------|---------|
| Tests | 0 | 26 |
| Coverage | 0% | >80% |
| Pass-Rate | — | 100% |

### Performance

| Metrik | Erwartung |
|--------|-----------|
| Re-Renders | ~30% Reduktion |
| Initial Load | < 500ms |
| Filter | < 100ms |

### Dokumentation

| Metrik | Nachher |
|--------|---------|
| Zeilen | 2.600+ |
| Dateien | 5 |
| Code-Beispiele | 20+ |

---

## 🚀 Nächste Schritte

### Sofort

1. **Phase 0 starten:** Feature-Branch erstellen, Backups anlegen
2. **Phase 0.5 durchführen:** Toten Code entfernen
3. **Phase 1 beginnen:** React Query Hooks erstellen

### Kurzfristig (Nach Refactoring)

1. **Team-Demo:** Neue Architektur vorstellen
2. **Monitoring:** Performance-Metriken aufsetzen
3. **User-Feedback:** Sammeln und iterieren

### Mittelfristig

1. **Weitere Module:** Template für andere Module anwenden
2. **Kontinuierliche Verbesserung:** ADRs updaten, Docs pflegen

---

## 📞 Referenzen

### Interne Docs

- **Refactoring-Template:** [module-refactoring-template.md](../templates/module-refactoring-template.md)
- **Quick Reference:** [QUICK_REFERENCE.md](../templates/QUICK_REFERENCE.md)
- **Design System:** [DESIGN_SYSTEM.md](../design-system/DESIGN_SYSTEM.md)
- **Datenanalyse:** [publications-data-analysis.md](./publications-data-analysis.md)

### Externe Ressourcen

- [React Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest](https://jestjs.io/docs/getting-started)

---

**Maintainer:** CeleroPress Development Team
**Erstellt:** 15. Oktober 2025
**Letzte Aktualisierung:** 15. Oktober 2025

---

*Dieser Plan ist ein lebendes Dokument. Anpassungen während der Implementierung sind normal und erwünscht!*
