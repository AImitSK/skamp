# Implementierungsplan: Premium-Datenbank (Editors) Refactoring

**Modul:** `/dashboard/library/editors`
**Basiert auf:** Modul-Refactoring Template v1.0
**Status:** In Planung
**Erstellt:** 2025-10-14

---

## 📋 Übersicht

### Ziel

Refactoring der Premium-Datenbank (Journalisten/Redakteure) nach Production-Ready Standards:
- React Query State Management
- Komponenten-Modularisierung
- Performance-Optimierung
- Comprehensive Testing
- Vollständige Dokumentation

### Kontext

**Was bereits funktioniert ✅:**
- Multi-Entity Reference-System (Company + Publications + Journalist)
- UI ist vollständig implementiert
- Design-Konzept umgesetzt
- Reference-Import/Remove funktioniert
- Globale Journalisten-Datenbank läuft

**Was refactored werden muss 🔧:**
- 1573 Zeilen große page.tsx → modularisieren
- Alte useState/useEffect Pattern → React Query
- Inline-Komponenten → extrahieren
- Keine Tests → comprehensive Test Suite
- Keine Dokumentation → vollständig dokumentieren

---

## 📊 Ist-Zustand

### Aktuelle Struktur

```
src/app/dashboard/library/editors/
└── page.tsx (1573 Zeilen) ❌ ZU GROSS!
    ├── Inline Alert-Komponente
    ├── Inline Detail-Modal
    ├── Inline Filter-Popover
    ├── useState/useEffect Pattern
    ├── Direkte Firestore-Queries
    └── Keine Tests

Keine Hooks:
- Keine Custom Hooks für Daten
- Kein React Query

Keine Dokumentation:
- Keine API-Docs
- Keine Component-Docs
- Nur Konzept-Dokument vorhanden
```

### Metriken (Ist)

- **Zeilen:** 1573 Zeilen in page.tsx
- **Komponenten-Größe:** ❌ Viel zu groß (>300 Zeilen)
- **State Management:** ❌ Altes Pattern
- **Tests:** ❌ 0 Tests
- **Dokumentation:** ❌ Nur Konzept-Dokument

---

## 🎯 Soll-Zustand

### Ziel-Struktur

```
src/app/dashboard/library/editors/
├── page.tsx (<300 Zeilen)
├── __tests__/
│   ├── integration/
│   │   └── editors-crud-flow.test.tsx
│   └── unit/
├── components/
│   ├── shared/
│   │   ├── Alert.tsx
│   │   ├── EmptyState.tsx
│   │   └── __tests__/
│   ├── EditorTable.tsx
│   ├── EditorTableRow.tsx
│   ├── EditorDetailModal.tsx
│   ├── EditorFilterPopover.tsx
│   └── EditorUpgradeDialog.tsx

src/lib/hooks/
├── useEditorsData.ts (React Query Hooks)
└── __tests__/
    └── useEditorsData.test.tsx

docs/editors/
├── README.md
├── api/
│   ├── README.md
│   └── multi-entity-reference-service.md
├── components/
│   └── README.md
└── adr/
    └── README.md
```

### Metriken (Soll)

- **Zeilen:** Alle Komponenten <300 Zeilen ✅
- **Komponenten:** 8+ modulare Komponenten ✅
- **State Management:** React Query ✅
- **Tests:** 25+ Tests, >80% Coverage ✅
- **Dokumentation:** 2500+ Zeilen ✅

---

## 🚀 Die 7 Phasen

### Phase 0: Vorbereitung & Setup

**Dauer:** 30 Minuten

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/editors-refactoring-production
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/app/dashboard/library/editors/page.tsx
  # → 1573 Zeilen
  ```

- [ ] Backup erstellen
  ```bash
  cp src/app/dashboard/library/editors/page.tsx \
     src/app/dashboard/library/editors/page.backup.tsx
  ```

- [ ] Dependencies prüfen
  - ✅ React Query (@tanstack/react-query)
  - ✅ Testing Libraries (jest, @testing-library/react)
  - ✅ TypeScript

#### Deliverable

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/editors-refactoring-production`
- Ist-Zustand: 1 Datei, 1573 Zeilen Code
- Backup: page.backup.tsx erstellt
- Dependencies: Alle vorhanden

### Struktur (Ist)
- page.tsx: 1573 Zeilen ❌
- Keine Hooks
- Keine Tests
- Keine Dokumentation

### Bereit für Phase 1
```

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für Editors-Refactoring"
```

---

### Phase 0.5: Pre-Refactoring Cleanup

**Dauer:** 1-2 Stunden

**Warum wichtig?** Phase 6 findet NICHT automatisch:
- Kommentierter Code
- Deprecated Funktionen
- Unused State-Variablen (die irgendwo referenziert werden)
- Ungenutzte Helper-Functions
- TODO-Kommentare

**→ Vorfeld-Bereinigung spart Zeit und verhindert, dass toter Code modularisiert wird!**

#### 0.5.1 TODO-Kommentare entfernen

**Gefundene TODOs:**

```typescript
// Zeile 663
// TODO: Remove verification status filter - not available for contacts
const handleVerificationFilterChange = (value: VerificationStatus | 'all') => {
  // ...
};

// Zeile 1055
// TODO: Remove totalFollowers - not captured in CRM
```

**Aktion:**
- [ ] TODO bei Zeile 663 + zugehörigen Code entfernen
- [ ] TODO bei Zeile 1055 entfernen
- [ ] Prüfen ob `selectedVerificationStatus` State (Zeile 337) noch gebraucht wird

#### 0.5.2 Console-Logs entfernen (frühzeitig)

**Gefundene Debug-Logs:**

```typescript
// Zeilen 409-428: Umfangreiches Debug-Logging
console.log('🔍 Loading global journalists from CRM...');
console.log('📊 Global journalists found:', globalJournalists.length);
console.log('📊 Sample journalist:', globalJournalists[0]);

// Zeile 452
console.log('🔍 Globale Companies mit isGlobal flag:', globalCompaniesWithFlag.length);

// Zeile 476
console.log('📊 Companies loaded:', companies.length);

// Zeile 488
console.log('🔍 Suche Company für Kontakt:', contact.displayName);

// Zeile 496
console.log('✅ Company gefunden:', matchedCompany.name);

// Zeile 500
console.log('⚠️ Keine Company gefunden für:', contact.displayName);

// Zeile 517
console.log('📊 Publications loaded:', publications.length);

// Zeile 565
console.log('✅ loadData completed');
```

**Aktion:**
- [ ] Alle ~10 Debug-Logs entfernen (Zeilen 409-428, 452, 476, 488, 496, 500, 517, 565)
- [ ] Nur production-relevante console.error in catch-blocks behalten

#### 0.5.3 Deprecated Functions entfernen

**Gefundene deprecated Functions:**

```typescript
// Zeilen 807-826: handleConfirmImport - Mock-Implementierung
const handleConfirmImport = async () => {
  if (!selectedJournalist) return;

  setImporting(true);
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Mock
    setImporting(false);
    setShowImportConfirmation(false);
    showAlert('success', 'Journalist importiert', 'Der Journalist wurde erfolgreich importiert.');
    void loadData();
  } catch (error) {
    setImporting(false);
    showAlert('error', 'Import fehlgeschlagen', 'Der Import konnte nicht durchgeführt werden.');
  }
};
```

**Aktion:**
- [ ] `handleConfirmImport` Funktion entfernen (Zeilen 807-826)
- [ ] Prüfen ob `setShowImportConfirmation` State noch verwendet wird
- [ ] Falls nicht → State auch entfernen

#### 0.5.4 Unused State entfernen

**Gefundene unused States:**

```typescript
// Zeile 342: selectedJournalist
const [selectedJournalist, setSelectedJournalist] = useState<JournalistDatabaseEntry | null>(null);
// → Wird nur in handleConfirmImport (deprecated) verwendet

// Zeile 337: selectedVerificationStatus (teilweise ungenutzt)
const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<VerificationStatus[]>([]);
// → Filter-Code ist auskommentiert (Zeile 663-668)
```

**Aktion:**
- [ ] `selectedJournalist` State entfernen (Zeile 342)
- [ ] `selectedVerificationStatus` State prüfen:
  - Falls Filter-Code (Zeile 663-668) implementiert werden soll → behalten
  - Falls Filter entfernt wird → State auch entfernen

#### 0.5.5 Kommentierte Code-Blöcke entfernen

**Gefundene kommentierte Code-Blöcke:**

```typescript
// Zeilen 663-668: Verification Status Filter (auskommentiert)
// const handleVerificationFilterChange = (value: VerificationStatus | 'all') => {
//   if (value === 'all') {
//     setSelectedVerificationStatus([]);
//   } else {
//     // ...
//   }
// };

// Zeilen 1518-1533: Verification Section im Detail-Modal (auskommentiert)
// {/* Verification Status (falls verfügbar) */}
// {journalist.verificationStatus && (
//   <div>
//     ...
//   </div>
// )}
```

**Aktion:**
- [ ] Entscheidung treffen: Verification-Feature implementieren oder entfernen?
  - **Option A:** Feature entfernen → Alle 3 Blöcke löschen (Zeilen 337, 663-668, 1518-1533)
  - **Option B:** Feature behalten → Kommentare entfernen, Code aktivieren

**Empfehlung:** Option A (entfernen), da TODO explizit sagt "not available for contacts"

#### 0.5.6 Import-Cleanup

**Nach dem Code-Cleanup prüfen:**

```bash
# Unused imports finden
npx eslint src/app/dashboard/library/editors/page.tsx --quiet

# Auto-Fix für unused imports
npx eslint src/app/dashboard/library/editors/page.tsx --fix
```

**Aktion:**
- [ ] ESLint auf page.tsx ausführen
- [ ] Unused imports entfernen

#### Checkliste Phase 0.5

- [ ] 2 TODO-Kommentare entfernt
- [ ] ~10 Debug-Console-Logs entfernt
- [ ] `handleConfirmImport` Function entfernt (Zeilen 807-826)
- [ ] `selectedJournalist` State entfernt (Zeile 342)
- [ ] Verification-Feature komplett entfernt (Zeilen 337, 663-668, 1518-1533)
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint-Check durchgeführt
- [ ] Unused imports entfernt
- [ ] Code funktioniert noch (manueller Test)

#### Deliverable

```markdown
## Phase 0.5: Pre-Refactoring Cleanup ✅

### Entfernt
- 2 TODO-Kommentare (Zeilen 663, 1055)
- ~10 Debug-Console-Logs (Zeilen 409-428, 452, 476, 488, 496, 500, 517, 565)
- `handleConfirmImport` deprecated Function (Zeilen 807-826)
- `selectedJournalist` unused State (Zeile 342)
- Verification-Feature (Zeilen 337, 663-668, 1518-1533) - "not available for contacts"
- Kommentierte Code-Blöcke
- Unused imports (via ESLint)

### Ergebnis
- page.tsx: 1573 → ~1510 Zeilen (-63 Zeilen toter Code)
- Saubere Basis für Phase 1 (React Query Integration)
- Keine Gefahr, toten Code zu modularisieren

### Warum wichtig?
Phase 6 hätte diese Probleme NICHT gefunden:
- ESLint findet keinen kommentierten Code
- TypeScript findet keine deprecated Functions (wenn sie irgendwo referenziert werden)
- TODO-Kommentare würden bleiben
- Toten Code hätten wir in Phase 2 modularisiert → Verschwendung

### Commit
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- 2 TODO-Kommentare entfernt
- ~10 Debug-Console-Logs entfernt
- handleConfirmImport deprecated Function entfernt
- selectedJournalist unused State entfernt
- Verification-Feature entfernt (not available for contacts)
- Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

page.tsx: 1573 → ~1510 Zeilen (-63 Zeilen toter Code)

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 1: React Query Integration

**Dauer:** 4 Stunden

#### 1.1 Custom Hooks erstellen

**Datei:** `src/lib/hooks/useEditorsData.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { multiEntityService } from '@/lib/firebase/multi-entity-reference-service';
import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Query: Get All Global Journalists
export function useGlobalJournalists() {
  return useQuery({
    queryKey: ['editors', 'global'],
    queryFn: async () => {
      const globalContactsQuery = query(
        collection(db, 'contacts_enhanced'),
        where('isGlobal', '==', true)
      );
      const snapshot = await getDocs(globalContactsQuery);
      const allContacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return allContacts.filter(c => c.isGlobal && c.mediaProfile?.isJournalist);
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

// Query: Get Imported Journalist References
export function useImportedJournalists(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'imported', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      const references = await multiEntityService.getAllContactReferences(organizationId);
      return new Set(references.map(ref => ref._globalJournalistId));
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation: Create Journalist Reference
export function useCreateJournalistReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      journalistId: string;
      organizationId: string;
      userId: string;
      notes?: string;
    }) => {
      return multiEntityService.createJournalistReference(
        data.journalistId,
        data.organizationId,
        data.userId,
        data.notes || `Importiert als Verweis am ${new Date().toLocaleDateString('de-DE')}`
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['editors', 'imported', variables.organizationId]
      });
    },
  });
}

// Mutation: Remove Journalist Reference
export function useRemoveJournalistReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      journalistId: string;
      organizationId: string;
    }) => {
      await multiEntityService.removeJournalistReference(
        data.journalistId,
        data.organizationId
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['editors', 'imported', variables.organizationId]
      });
    },
  });
}

// Query: Load Companies (local + global)
export function useCompanies(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'companies', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');

      const localCompanies = await companiesEnhancedService.getAll(organizationId);

      // Globale Companies
      const globalCompaniesQuery = query(
        collection(db, 'companies_enhanced'),
        where('isGlobal', '==', true)
      );
      const globalSnapshot = await getDocs(globalCompaniesQuery);
      const globalCompanies = globalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Kombiniere ohne Duplikate
      const combined = [...localCompanies];
      globalCompanies.forEach(globalComp => {
        if (!combined.find(localComp => localComp.id === globalComp.id)) {
          combined.push(globalComp);
        }
      });

      return combined;
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 Minuten (selten ändernd)
  });
}

// Query: Load Publications (local + referenced)
export function usePublications(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['editors', 'publications', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization');
      return publicationService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
  });
}
```

#### 1.2 page.tsx anpassen

**Entfernen:**
```typescript
// Alte State & useEffect
const [journalists, setJournalists] = useState([]);
const [loading, setLoading] = useState(true);
const loadData = useCallback(async () => { ... }, []);
useEffect(() => { loadData(); }, [loadData]);
```

**Hinzufügen:**
```typescript
import {
  useGlobalJournalists,
  useImportedJournalists,
  useCreateJournalistReference,
  useRemoveJournalistReference,
  useCompanies,
  usePublications
} from '@/lib/hooks/useEditorsData';

// In der Komponente
const { data: journalists = [], isLoading: loadingJournalists } = useGlobalJournalists();
const { data: importedIds, isLoading: loadingImported } = useImportedJournalists(currentOrganization?.id);
const { data: companies = [] } = useCompanies(currentOrganization?.id);
const { data: publications = [] } = usePublications(currentOrganization?.id);

const createReference = useCreateJournalistReference();
const removeReference = useRemoveJournalistReference();

const loading = loadingJournalists || loadingImported;

// Handler anpassen
const handleImportReference = async (journalist: JournalistDatabaseEntry) => {
  const result = await createReference.mutateAsync({
    journalistId: journalist.id,
    organizationId: currentOrganization!.id,
    userId: user!.uid,
  });

  if (result.success) {
    showAlert('success', 'Multi-Entity Verweis erstellt', '...');
  }
};

const handleRemoveReference = async (journalist: JournalistDatabaseEntry) => {
  await removeReference.mutateAsync({
    journalistId: journalist.id,
    organizationId: currentOrganization!.id,
  });

  showAlert('success', 'Verweis entfernt', '...');
};
```

#### 1.3 Data Transformation Logic

**Behalten:**
```typescript
// JournalistDatabaseEntry Konvertierung bleibt in page.tsx
const convertedJournalists = useMemo(() => {
  return journalists.map((contact) => {
    // ... bestehende Transformation Logic
  });
}, [journalists, companies, publications]);
```

#### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`useEditorsData.ts`)
- [ ] 6 Hooks implementiert:
  - useGlobalJournalists
  - useImportedJournalists
  - useCreateJournalistReference
  - useRemoveJournalistReference
  - useCompanies
  - usePublications
- [ ] page.tsx auf React Query umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Funktionalität getestet

#### Deliverable

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks in `useEditorsData.ts` (6 Hooks)
- page.tsx auf React Query umgestellt
- Alte useState/useEffect Pattern entfernt

### Vorteile
- Automatisches Caching (5min für Journalists, 10min für Companies/Publications)
- Query Invalidierung bei Reference-Changes
- Paralleles Laden (Journalists + Companies + Publications)
- Error Handling über React Query

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für Editors abgeschlossen

- Custom Hooks in useEditorsData.ts erstellt
- 6 Hooks: useGlobalJournalists, useImportedJournalists, useCreateJournalistReference, etc.
- page.tsx vollständig auf React Query umgestellt
- Alte loadData/useEffect Pattern entfernt
- Automatisches Caching und Query Invalidierung

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 2: Code-Separation & Modularisierung

**Dauer:** 5 Stunden

#### Phase 2.1: Shared Components extrahieren

**Komponenten:**

1. **Alert.tsx** (bereits inline vorhanden, Zeilen 267-320)
   ```bash
   # Verschieben nach:
   src/app/dashboard/library/editors/components/shared/Alert.tsx
   ```

2. **EmptyState.tsx** (Zeilen 1231-1237)
   ```typescript
   // Extrahieren in eigene Komponente
   interface EmptyStateProps {
     icon: React.ComponentType<{ className?: string }>;
     title: string;
     description: string;
     action?: {
       label: string;
       onClick: () => void;
     };
   }
   ```

**Checkliste Phase 2.1:**
- [ ] Alert.tsx extrahiert und in shared/ verschoben
- [ ] EmptyState.tsx erstellt
- [ ] Inline-Komponenten aus page.tsx entfernt
- [ ] Imports aktualisiert

#### Phase 2.2: Große Komponenten modularisieren

**1. EditorTable.tsx** (Zeilen 1020-1229)
```typescript
// Extrahiere Table-Struktur
interface EditorTableProps {
  journalists: JournalistDatabaseEntry[];
  importedIds: Set<string>;
  companies: CompanyEnhanced[];
  publications: Publication[];
  subscription: JournalistSubscription | null;
  isSuperAdmin: boolean;
  onViewDetails: (journalist: JournalistDatabaseEntry) => void;
  onToggleReference: (journalist: JournalistDatabaseEntry) => void;
  onUpgrade: (journalist: JournalistDatabaseEntry) => void;
  importingIds: Set<string>;
}

export default function EditorTable({ ... }: EditorTableProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-visible">
      {/* Table Header */}
      <EditorTableHeader />

      {/* Table Body */}
      <div className="divide-y divide-zinc-200">
        {journalists.map((journalist) => (
          <EditorTableRow
            key={journalist.id}
            journalist={journalist}
            isImported={importedIds.has(journalist.id)}
            canImport={canImport}
            isImporting={importingIds.has(journalist.id)}
            onViewDetails={onViewDetails}
            onToggleReference={onToggleReference}
            onUpgrade={onUpgrade}
          />
        ))}
      </div>
    </div>
  );
}
```

**2. EditorTableRow.tsx** (Zeilen 1060-1226)
```typescript
interface EditorTableRowProps {
  journalist: JournalistDatabaseEntry;
  isImported: boolean;
  canImport: boolean;
  isImporting: boolean;
  onViewDetails: (journalist: JournalistDatabaseEntry) => void;
  onToggleReference: (journalist: JournalistDatabaseEntry) => void;
  onUpgrade: (journalist: JournalistDatabaseEntry) => void;
}

export default React.memo(function EditorTableRow({ ... }: EditorTableRowProps) {
  // Row Logic
});
```

**3. EditorFilterPopover.tsx** (Zeilen 882-1007)
```typescript
interface EditorFilterPopoverProps {
  availableTopics: string[];
  selectedTopics: string[];
  setSelectedTopics: (topics: string[]) => void;
  selectedMediaTypes: MediaType[];
  setSelectedMediaTypes: (types: MediaType[]) => void;
  selectedVerificationStatus: VerificationStatus[];
  setSelectedVerificationStatus: (status: VerificationStatus[]) => void;
  minQualityScore: number;
  setMinQualityScore: (score: number) => void;
  activeFiltersCount: number;
}
```

**4. EditorDetailModal.tsx** (Zeilen 1309-1570)
```typescript
interface EditorDetailModalProps {
  journalist: JournalistDatabaseEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleReference: (journalist: JournalistDatabaseEntry) => void;
  isImported: boolean;
  importEnabled: boolean;
}
```

**5. EditorUpgradeDialog.tsx** (JournalistImportDialog - bereits vorhanden)
```typescript
// Bleibt externe Komponente - nur Import anpassen
import { JournalistImportDialog } from '@/components/journalist/JournalistImportDialog';
```

#### Checkliste Phase 2.2

- [ ] EditorTable.tsx erstellt
- [ ] EditorTableRow.tsx erstellt
- [ ] EditorFilterPopover.tsx erstellt
- [ ] EditorDetailModal.tsx erstellt
- [ ] page.tsx reduziert auf <300 Zeilen
- [ ] TypeScript-Fehler behoben
- [ ] Imports aktualisiert

#### Deliverable

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Phase 2.1: Shared Components
- Alert.tsx (80 Zeilen)
- EmptyState.tsx (45 Zeilen)

### Phase 2.2: Hauptkomponenten
- EditorTable.tsx (150 Zeilen)
- EditorTableRow.tsx (180 Zeilen)
- EditorFilterPopover.tsx (130 Zeilen)
- EditorDetailModal.tsx (270 Zeilen)
- page.tsx: 1573 → 280 Zeilen ✅

### Vorteile
- Bessere Code-Lesbarkeit
- Einfachere Wartung
- Wiederverwendbare Komponenten
- Eigenständig testbar

### Commit
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen

Phase 2.1: Shared Components extrahiert
- Alert.tsx (80 Zeilen)
- EmptyState.tsx (45 Zeilen)

Phase 2.2: Hauptkomponenten modularisiert
- EditorTable.tsx (150 Zeilen)
- EditorTableRow.tsx (180 Zeilen)
- EditorFilterPopover.tsx (130 Zeilen)
- EditorDetailModal.tsx (270 Zeilen)

page.tsx: 1573 Zeilen → 280 Zeilen ✅

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 3: Performance-Optimierung

**Dauer:** 2 Stunden

#### 3.1 useCallback für Handler

```typescript
// In page.tsx
const handleViewDetails = useCallback((journalist: JournalistDatabaseEntry) => {
  setDetailJournalist(journalist);
}, []);

const handleToggleReference = useCallback(async (journalist: JournalistDatabaseEntry) => {
  const isImported = importedIds?.has(journalist.id);

  if (isImported) {
    await removeReference.mutateAsync({
      journalistId: journalist.id,
      organizationId: currentOrganization!.id,
    });
  } else {
    await createReference.mutateAsync({
      journalistId: journalist.id,
      organizationId: currentOrganization!.id,
      userId: user!.uid,
    });
  }
}, [importedIds, removeReference, createReference, currentOrganization, user]);

const handleUpgrade = useCallback((journalist: JournalistDatabaseEntry) => {
  setImportDialogJournalist(journalist);
  setShowImportDialog(true);
}, []);
```

#### 3.2 useMemo für Computed Values

```typescript
// Converted Journalists (bereits vorhanden, optimieren)
const convertedJournalists = useMemo(() => {
  return (journalists || []).map((contact) => {
    // ... Transformation Logic
  });
}, [journalists, companies, publications]);

// Filtered Journalists (bereits vorhanden)
const filteredJournalists = useMemo(() => {
  return convertedJournalists.filter(journalist => {
    // ... Filter Logic
  });
}, [convertedJournalists, searchTerm, selectedTopics, selectedMediaTypes, minQualityScore]);

// Available Topics (bereits vorhanden)
const availableTopics = useMemo(() => {
  const topicsSet = new Set<string>();
  convertedJournalists.forEach(j => {
    j?.professionalData?.expertise?.primaryTopics?.forEach(topic => topicsSet.add(topic));
  });
  return Array.from(topicsSet).sort();
}, [convertedJournalists]);

// Pagination (bereits vorhanden)
const paginatedJournalists = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return filteredJournalists.slice(startIndex, startIndex + itemsPerPage);
}, [filteredJournalists, currentPage, itemsPerPage]);
```

#### 3.3 Debouncing für Search

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

// Filter verwenden debouncedSearchTerm
const filteredJournalists = useMemo(() => {
  return convertedJournalists.filter(journalist => {
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      // ... Filter Logic
    }
    // ... weitere Filter
  });
}, [convertedJournalists, debouncedSearchTerm, selectedTopics, ...]);
```

#### 3.4 React.memo für Komponenten

```typescript
// EditorTableRow.tsx
export default React.memo(function EditorTableRow({ journalist, ... }: Props) {
  return <div>{/* ... */}</div>;
});

// EditorDetailModal.tsx
export default React.memo(function EditorDetailModal({ journalist, ... }: Props) {
  return <Dialog>{/* ... */}</Dialog>;
});
```

#### Checkliste Phase 3

- [ ] useCallback für alle Handler
- [ ] useMemo für Computed Values (bereits teilweise vorhanden)
- [ ] Debouncing für Search implementiert (300ms)
- [ ] React.memo für EditorTableRow
- [ ] React.memo für EditorDetailModal
- [ ] Performance-Tests durchgeführt

#### Deliverable

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für 3 Handler (ViewDetails, ToggleReference, Upgrade)
- useMemo bereits vorhanden für:
  - convertedJournalists
  - filteredJournalists
  - availableTopics
  - paginatedJournalists
- Debouncing (300ms Search)
- React.memo für EditorTableRow & EditorDetailModal

### Messbare Verbesserungen
- Re-Renders reduziert durch useCallback
- Search-Performance durch Debouncing
- Table-Row-Rendering durch React.memo

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen

- useCallback für Handler
- Debouncing für Search (300ms)
- React.memo für Table-Row & Detail-Modal
- useMemo für Computed Values optimiert

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 4: Testing

**Dauer:** 5 Stunden

#### 4.1 Hook Tests

**Datei:** `src/lib/hooks/__tests__/useEditorsData.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useGlobalJournalists,
  useImportedJournalists,
  useCreateJournalistReference
} from '../useEditorsData';
import * as multiEntityService from '@/lib/firebase/multi-entity-reference-service';
import { collection, query, where, getDocs } from 'firebase/firestore';

jest.mock('firebase/firestore');
jest.mock('@/lib/firebase/multi-entity-reference-service');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useEditorsData Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useGlobalJournalists', () => {
    it('sollte globale Journalisten laden', async () => {
      const mockJournalists = [
        { id: '1', displayName: 'Max Mustermann', isGlobal: true, mediaProfile: { isJournalist: true } },
        { id: '2', displayName: 'Anna Test', isGlobal: true, mediaProfile: { isJournalist: true } },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockJournalists.map(j => ({ id: j.id, data: () => j }))
      });

      const { result } = renderHook(() => useGlobalJournalists(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toHaveLength(2);
    });
  });

  describe('useImportedJournalists', () => {
    it('sollte importierte Journalisten laden', async () => {
      const mockReferences = [
        { _globalJournalistId: 'j1' },
        { _globalJournalistId: 'j2' },
      ];

      (multiEntityService.getAllContactReferences as jest.Mock).mockResolvedValue(mockReferences);

      const { result } = renderHook(
        () => useImportedJournalists('org-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeInstanceOf(Set);
      expect(result.current.data?.size).toBe(2);
    });
  });

  describe('useCreateJournalistReference', () => {
    it('sollte Reference erstellen und Cache invalidieren', async () => {
      const mockResult = { success: true };
      (multiEntityService.createJournalistReference as jest.Mock).mockResolvedValue(mockResult);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useCreateJournalistReference(), { wrapper });

      await waitFor(() => expect(result.current.isIdle).toBe(true));

      await result.current.mutateAsync({
        journalistId: 'j1',
        organizationId: 'org-123',
        userId: 'user-123',
      });

      expect(multiEntityService.createJournalistReference).toHaveBeenCalledWith(
        'j1',
        'org-123',
        'user-123',
        expect.stringContaining('Importiert')
      );
    });
  });
});
```

#### 4.2 Integration Tests

**Datei:** `src/app/dashboard/library/editors/__tests__/integration/editors-flow.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditorsPage from '../../page';
import * as multiEntityService from '@/lib/firebase/multi-entity-reference-service';

jest.mock('@/lib/firebase/multi-entity-reference-service');
jest.mock('firebase/firestore');

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('Editors Import/Remove Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte Journalist importieren und wieder entfernen', async () => {
    const user = userEvent.setup();

    // Mock: Globale Journalisten
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [
        { id: 'j1', data: () => ({ id: 'j1', displayName: 'Test Journalist', isGlobal: true, mediaProfile: { isJournalist: true } }) }
      ]
    });

    // Mock: Keine Imports initial
    (multiEntityService.getAllContactReferences as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<EditorsPage />);

    // Warte auf Laden
    await waitFor(() => expect(screen.getByText('Test Journalist')).toBeInTheDocument());

    // Import-Button klicken
    const importButton = screen.getByTitle('Kontakt importieren');
    await user.click(importButton);

    // Reference sollte erstellt werden
    expect(multiEntityService.createJournalistReference).toHaveBeenCalled();

    // Remove-Button sollte erscheinen
    await waitFor(() => {
      expect(screen.getByText('Verweis entfernen')).toBeInTheDocument();
    });
  });
});
```

#### 4.3 Component Tests

**Datei:** `src/app/dashboard/library/editors/components/shared/__tests__/Alert.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import Alert from '../Alert';

describe('Alert Component', () => {
  it('sollte Success-Alert rendern', () => {
    render(<Alert type="success" title="Erfolg" />);
    expect(screen.getByText('Erfolg')).toBeInTheDocument();
  });

  it('sollte Error-Alert mit Message rendern', () => {
    render(
      <Alert
        type="error"
        title="Fehler"
        message="Es ist ein Fehler aufgetreten"
      />
    );

    expect(screen.getByText('Fehler')).toBeInTheDocument();
    expect(screen.getByText('Es ist ein Fehler aufgetreten')).toBeInTheDocument();
  });

  it('sollte Action-Button rendern', () => {
    const onClick = jest.fn();

    render(
      <Alert
        type="info"
        title="Info"
        action={{ label: 'Details', onClick }}
      />
    );

    expect(screen.getByText('Details')).toBeInTheDocument();
  });
});
```

**Weitere Component-Tests:**
- EditorTableRow.test.tsx
- EditorFilterPopover.test.tsx
- EmptyState.test.tsx

#### 4.4 Test-Cleanup

```bash
# Finde alte Tests
find src -name "*.test.tsx" | grep editors

# Entferne redundante Tests
# Fixe failing Tests
```

#### Checkliste Phase 4

- [ ] Hook-Tests erstellt (10 Tests)
- [ ] Integration-Tests erstellt (3+ Tests)
- [ ] Component-Tests für Shared Components (12 Tests)
- [ ] Alle Tests bestehen (npm test -- editors)
- [ ] Coverage-Report erstellt (npm run test:coverage)
- [ ] Coverage >80%

#### Deliverable

```markdown
## Phase 4: Testing ✅

### Test Suite
- Hook-Tests: 10/10 bestanden
- Integration-Tests: 3/3 bestanden
- Component-Tests: 12/12 bestanden
- **Gesamt: 25/25 Tests bestanden**

### Coverage
- Statements: 85%
- Branches: 82%
- Functions: 88%
- Lines: 86%

### Commit
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite für Editors erstellt

- Hook-Tests: 10 Tests
- Integration-Tests: 3 Tests
- Component-Tests: 12 Tests
- Gesamt: 25 Tests, 100% Pass-Rate
- Coverage: >80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 5: Dokumentation

**Dauer:** 4 Stunden

#### 5.1 README.md (Hauptdokumentation)

**Datei:** `docs/editors/README.md`

```markdown
# Editors (Premium-Datenbank) Dokumentation

**Version:** 1.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** [Datum]

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Multi-Entity Reference-System](#multi-entity-reference-system)
- [Architektur](#architektur)
- [Technologie-Stack](#technologie-stack)
- [API-Dokumentation](#api-dokumentation)
- [Komponenten](#komponenten)
- [Testing](#testing)
- [Performance](#performance)

---

## Übersicht

Die Premium-Datenbank (Editors) ist eine kuratierte Journalisten-Datenbank mit Multi-Entity Reference-System.

**Kernfunktionen:**
- Globale Journalisten-Datenbank (SuperAdmin-gepflegt)
- Multi-Entity Reference-Import (Company + Publications + Journalist)
- Live-Suche & Filterung
- Quality-Score-basiertes Ranking
- Subscription-basierter Zugriff

---

## Features

### ✅ Für SuperAdmin
- Journalisten im CRM pflegen → automatisch global
- Publikationen in der Bibliothek pflegen
- Alle Daten werden zentral verwaltet

### ✅ Für normale Organisationen
- Globale Journalisten durchsuchen
- Multi-Entity References importieren:
  - Company-Reference (Medienhaus)
  - Publication-References (alle Publikationen)
  - Journalist-Reference (Kontakt)
- Lokale Notizen hinzufügen
- Für Verteilerlisten nutzen

---

## Multi-Entity Reference-System

### Konzept

**Kein Kopieren, nur Verweisen:**
- Kunden importieren keine Daten-Kopien
- System erstellt nur Verweise (References)
- Änderungen des SuperAdmin erscheinen sofort bei allen

### Ablauf

1. **Kunde klickt Stern-Icon** bei globalem Journalist
2. **System erstellt automatisch:**
   - Company-Reference (Medienhaus)
   - Publication-References (alle Publikationen des Journalisten)
   - Journalist-Reference (Kontakt mit lokalen Notizen)
3. **UI kombiniert:**
   - Globale Daten (read-only)
   - Lokale Notizen (editierbar)

### Vorteile

- ✅ Keine Duplikate
- ✅ Immer aktuelle Daten
- ✅ Spart Speicher
- ✅ Qualität gesichert (nur SuperAdmin kann ändern)

---

## Architektur

### Übersicht

```
Editors-Modul (Production-Ready)
├── React Query State Management
├── Multi-Entity Reference-System
├── Modular Components (< 300 Zeilen)
├── Performance-optimiert (useCallback, useMemo, Debouncing)
└── Comprehensive Test Suite (25 Tests)
```

### Ordnerstruktur

[Siehe Ziel-Struktur oben]

---

## Technologie-Stack

- **React 18** - UI Framework
- **Next.js 15** - App Router
- **TypeScript** - Type Safety
- **React Query v5** - State Management
- **Firebase Firestore** - Backend
- **Multi-Entity Reference-Service** - Reference-System
- **Tailwind CSS** - Styling
- **Jest + Testing Library** - Testing

---

## API-Dokumentation

Siehe: [API-Dokumentation](./api/README.md)

---

## Komponenten

Siehe: [Komponenten-Dokumentation](./components/README.md)

---

## Testing

### Test-Ausführung

```bash
# Alle Tests
npm test

# Editors-Tests
npm test -- editors

# Coverage
npm run test:coverage
```

### Test-Coverage

- **Hook-Tests:** 10 Tests
- **Integration-Tests:** 3 Tests
- **Component-Tests:** 12 Tests
- **Gesamt:** 25 Tests

---

## Performance

### Optimierungen

- **React Query Caching:**
  - Journalists: 5min staleTime
  - Companies/Publications: 10min staleTime
- **Debouncing:** Search (300ms)
- **useCallback:** Alle Handler memoized
- **useMemo:** Gefilterte Daten, Available Topics, Pagination
- **React.memo:** Table-Row, Detail-Modal

### Messungen

- Initial Load: ~500ms
- Search-Response: <100ms (mit Debouncing)
- Filter-Anwendung: <50ms

---

## Troubleshooting

### Häufige Probleme

#### Problem: "Journalist kann nicht importiert werden"
**Symptom:** Import-Button funktioniert nicht
**Lösung:**
- Subscription prüfen (Premium-Feature)
- SuperAdmin kann sich nicht selbst referenzieren

#### Problem: "Globale Journalisten werden nicht angezeigt"
**Symptom:** Leere Liste
**Lösung:**
- isGlobal-Flag in CRM prüfen
- mediaProfile.isJournalist prüfen

---

## Referenzen

- [Multi-Entity Reference-Service](./api/multi-entity-reference-service.md)
- [Komponenten-Dokumentation](./components/README.md)
- [ADRs](./adr/README.md)
- [Konzept-Klarstellung](../../docs_old/Journalisten Datenbank/KONZEPT-KLARSTELLUNG.md)

---

**Maintainer:** CeleroPress Development Team
**Support:** Siehe Team README
```

#### 5.2 API-Dokumentation

**Datei:** `docs/editors/api/multi-entity-reference-service.md`

```markdown
# Multi-Entity Reference-Service API

**Version:** 1.0
**Service:** `multi-entity-reference-service.ts`
**Location:** `src/lib/firebase/multi-entity-reference-service.ts`

---

## Übersicht

Der Multi-Entity Reference-Service verwaltet atomische Multi-Entity-Operationen für das Reference-System.

---

## Methoden

### createJournalistReference()

Erstellt eine Multi-Entity-Reference (Company + Publications + Journalist).

**Signatur:**
```typescript
async function createJournalistReference(
  journalistId: string,
  organizationId: string,
  userId: string,
  notes?: string
): Promise<{ success: boolean; errors?: string[] }>
```

**Parameter:**
- `journalistId` (string) - ID des globalen Journalisten
- `organizationId` (string) - ID der importierenden Organisation
- `userId` (string) - ID des Users der importiert
- `notes` (string, optional) - Lokale Notizen

**Rückgabe:**
- `Promise<{ success: boolean; errors?: string[] }>`

**Ablauf:**
1. Lädt globalen Journalist aus CRM
2. Erstellt Company-Reference (falls nicht vorhanden)
3. Erstellt Publication-References (alle Publikationen)
4. Erstellt Journalist-Reference mit Relationen

**Beispiel:**
```typescript
const result = await multiEntityService.createJournalistReference(
  'journalist-123',
  'org-456',
  'user-789',
  'Wichtiger Kontakt für Tech-PR'
);

if (result.success) {
  console.log('Multi-Entity Reference erstellt!');
} else {
  console.error('Fehler:', result.errors);
}
```

---

### removeJournalistReference()

Entfernt eine Journalist-Reference.

**Signatur:**
```typescript
async function removeJournalistReference(
  journalistId: string,
  organizationId: string
): Promise<void>
```

**Parameter:**
- `journalistId` (string) - ID des globalen Journalisten
- `organizationId` (string) - ID der Organisation

**Beispiel:**
```typescript
await multiEntityService.removeJournalistReference(
  'journalist-123',
  'org-456'
);
```

---

### getAllContactReferences()

Lädt alle Contact-References einer Organisation.

**Signatur:**
```typescript
async function getAllContactReferences(
  organizationId: string
): Promise<ContactReference[]>
```

**Rückgabe:**
```typescript
interface ContactReference {
  _globalJournalistId: string;
  localNotes?: string;
  localTags?: string[];
  // ...
}
```

---

## Error Handling

Alle Methoden werfen Errors bei:
- Fehlenden Parametern
- Firestore-Fehlern
- Permissions-Problemen

**Best Practice:**
```typescript
try {
  const result = await multiEntityService.createJournalistReference(...);
  if (result.success) {
    // Success
  } else {
    // Handle errors
  }
} catch (error) {
  console.error('Fehler:', error);
}
```

---
```

#### 5.3 Komponenten-Dokumentation

**Datei:** `docs/editors/components/README.md`

```markdown
# Editors Komponenten-Dokumentation

[Ähnlich wie Listen-Modul - alle Komponenten dokumentieren]

## Komponenten

### EditorTable
### EditorTableRow
### EditorFilterPopover
### EditorDetailModal
### Alert
### EmptyState

[Detaillierte Dokumentation für jede Komponente]
```

#### 5.4 ADR-Dokumentation

**Datei:** `docs/editors/adr/README.md`

```markdown
# Architecture Decision Records (ADRs) - Editors

## ADR-0001: React Query für State Management

**Status:** Accepted
**Datum:** [Datum]

### Kontext

Das Editors-Modul benötigte ein State Management für:
- Globale Journalisten (Firestore-Query)
- Importierte References (Multi-Entity)
- Companies & Publications (für Display)

### Entscheidung

Wir haben uns für **React Query** entschieden.

### Vorteile

- Automatisches Caching (5min Journalists, 10min Companies/Pubs)
- Query Invalidierung bei Reference-Changes
- Paralleles Laden mehrerer Ressourcen
- Built-in Error Handling

---

## ADR-0002: Multi-Entity Reference-System

**Status:** Accepted
**Datum:** [Datum]

### Kontext

Kunden sollten globale Journalisten nutzen können ohne Daten zu duplizieren.

### Entscheidung

Multi-Entity Reference-System:
- Beim Import werden Company + Publications + Journalist als References erstellt
- Keine Daten-Kopien, nur Verweise
- Änderungen des SuperAdmin sofort bei allen sichtbar

### Vorteile

- ✅ Keine Duplikate
- ✅ Immer aktuelle Daten
- ✅ Konsistente Datenqualität

---
```

#### Checkliste Phase 5

- [ ] README.md erstellt (500+ Zeilen)
- [ ] API-Docs erstellt (400+ Zeilen)
- [ ] multi-entity-reference-service.md (800+ Zeilen)
- [ ] components/README.md (600+ Zeilen)
- [ ] adr/README.md (400+ Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet

#### Deliverable

```markdown
## Phase 5: Dokumentation ✅

### Erstellt
- README.md (500+ Zeilen) - Hauptdokumentation
- api/README.md (400+ Zeilen) - API-Übersicht
- api/multi-entity-reference-service.md (800+ Zeilen)
- components/README.md (600+ Zeilen)
- adr/README.md (400+ Zeilen)

### Gesamt
- **2.700+ Zeilen Dokumentation**
- Multi-Entity Reference-System dokumentiert
- Alle Komponenten beschrieben
- ADRs für wichtige Entscheidungen

### Commit
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation für Editors erstellt

- README.md (500+ Zeilen) - Hauptdokumentation
- API-Dokumentation (1200+ Zeilen)
- Komponenten-Dokumentation (600+ Zeilen)
- ADRs (400+ Zeilen)

Gesamt: 2.700+ Zeilen Dokumentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

### Phase 6: Production-Ready Code Quality

**Dauer:** 2 Stunden

#### 6.1 TypeScript Check

```bash
# Alle Fehler anzeigen
npx tsc --noEmit

# Nur Editors-Dateien prüfen
npx tsc --noEmit | grep editors
```

**Zu beheben:**
- Missing imports
- Type mismatches
- Undefined variables

#### 6.2 ESLint Check

```bash
# Alle Warnings/Errors
npx eslint src/app/dashboard/library/editors

# Auto-Fix
npx eslint src/app/dashboard/library/editors --fix
```

**Zu beheben:**
- Unused imports
- Unused variables
- console.log statements

#### 6.3 Console Cleanup

```bash
# Console-Statements finden
grep -r "console\." src/app/dashboard/library/editors

# Oder mit ripgrep
rg "console\." src/app/dashboard/library/editors
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors
console.error('Failed to load journalists:', error);

// ✅ In Catch-Blöcken
catch (error) {
  console.error('Error:', error);
}
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs (aktuell in Zeilen 409-428, 452, 476, 488, 496, 500, 517, 565)
console.log('🔍 Loading global journalists from CRM...');
console.log('📊 Global journalists found:', ...);
console.log('🔍 Globale Companies mit isGlobal flag:', ...);
console.log('📊 Companies loaded:', ...);
console.log('🔍 Suche Company für Kontakt:', ...);
```

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

```bash
# Checklist
✓ Keine Schatten (außer Dropdowns) → ✅ shadow-sm in Table, shadow-lg in Popovers (erlaubt)
✓ Nur Heroicons /24/outline → ✅ Alle Icons korrekt
✓ Zinc-Palette für neutrale Farben → ✅
✓ #005fab für Primary Actions → ✅
✓ #dedc00 für Star-Button (Import) → ✅ Zeilen 1189, 1552
✓ Konsistente Höhen (h-10 für Toolbar) → ✅
✓ Konsistente Borders (zinc-300 für Inputs) → ✅
✓ Focus-Rings → ✅
```

**Status:** ✅ Design System compliant

#### 6.5 Final Build Test

```bash
# Build erstellen
npm run build

# Build testen
npm run start
```

**Prüfen:**
- Build erfolgreich?
- Keine TypeScript-Errors?
- Keine ESLint-Errors?
- App startet korrekt?
- Editors funktioniert im Production-Build?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in Editors
- [ ] ESLint: 0 Warnings in Editors
- [ ] Console-Cleanup: ~10 Debug-Logs entfernt
- [ ] Design System: Vollständig compliant ✅
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Performance: Flüssiges UI

#### Deliverable

```markdown
## Phase 6: Production-Ready Code Quality ✅

### Checks
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console-Cleanup: 10 Debug-Logs entfernt
- ✅ Design System: Compliant
- ✅ Build: Erfolgreich
- ✅ Production-Test: Bestanden

### Fixes
- Console.logs entfernt (Zeilen 409-428, 452, 476, 488, 496, 500, 517, 565)
- Unused imports entfernt
- TypeScript strict mode fixes

### Commit
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality für Editors

- Console-Cleanup: 10 Debug-Logs entfernt
- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Design System: Compliant
- Build: Erfolgreich

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```
```

---

## 🔄 Merge zu Main

**Letzte Phase:** Code zu Main mergen

### Workflow

```bash
# 1. Finaler Test-Run
npm test -- editors

# 2. Push Feature-Branch
git push origin feature/editors-refactoring-production

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/editors-refactoring-production --no-edit

# 4. Main pushen
git push origin main

# 5. Production-Test
npm run build
npm run start
```

### Checkliste Merge

- [ ] Alle 7 Phasen abgeschlossen (inkl. Phase 0.5 Cleanup)
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Build erfolgreich
- [ ] Production-Test bestanden

### Final Report

```markdown
## ✅ Editors-Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 7 Phasen:** Abgeschlossen (inkl. Pre-Refactoring Cleanup)
- **Tests:** 25/25 bestanden
- **Coverage:** 85%
- **Dokumentation:** 2.700 Zeilen

### Änderungen
- +1.200 Zeilen hinzugefügt (Komponenten, Tests, Docs)
- -300 Zeilen entfernt (Duplikate, alte Patterns)
- 15 Dateien geändert

### Highlights
- React Query Integration mit 6 Custom Hooks
- page.tsx von 1573 Zeilen → 280 Zeilen ✅
- 8 modulare Komponenten (alle <300 Zeilen)
- Performance-Optimierungen (Debouncing, Memoization)
- Comprehensive Test Suite (25 Tests, 85% Coverage)
- 2.700+ Zeilen Dokumentation

### Multi-Entity Reference-System
- ✅ Funktioniert perfekt
- ✅ Vollständig dokumentiert
- ✅ Getestet

### Nächste Schritte
- [ ] Production-Deployment
- [ ] Team-Demo
- [ ] User-Feedback sammeln
```

---

## 📊 Erfolgsmetriken (Soll)

### Code Quality

- **Zeilen-Reduktion:** page.tsx 1573 → 280 Zeilen (82% Reduktion) ✅
- **Komponenten-Größe:** Alle < 300 Zeilen ✅
- **Code-Duplikation:** Inline-Komponenten eliminiert ✅
- **TypeScript-Fehler:** 0 ✅
- **ESLint-Warnings:** 0 ✅

### Testing

- **Test-Coverage:** > 80% (Soll: 85%) ✅
- **Anzahl Tests:** 25 Tests ✅
- **Pass-Rate:** 100% ✅

### Performance

- **React Query Caching:** 5min (Journalists), 10min (Companies/Pubs) ✅
- **Search Debouncing:** 300ms ✅
- **Initial Load:** < 500ms ✅
- **Filter-Anwendung:** < 50ms ✅

### Dokumentation

- **Zeilen:** 2.700+ Zeilen ✅
- **Dateien:** 5 Dokumente ✅
- **Code-Beispiele:** Alle wichtigen Patterns ✅

---

## 📝 Checkliste: Gesamtes Refactoring

### Vorbereitung (Phase 0)
- [ ] Feature-Branch erstellt
- [ ] Backups angelegt
- [ ] Ist-Zustand dokumentiert
- [ ] Dependencies geprüft

### Phase 0.5: Pre-Refactoring Cleanup ⭐ NEU
- [ ] 2 TODO-Kommentare entfernt
- [ ] ~10 Debug-Console-Logs entfernt
- [ ] handleConfirmImport Function entfernt
- [ ] selectedJournalist State entfernt
- [ ] Verification-Feature entfernt (optional: falls nicht implementiert werden soll)
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint-Check durchgeführt
- [ ] Unused imports entfernt
- [ ] Code funktioniert noch (manueller Test)

### Phase 1: React Query
- [ ] Custom Hooks erstellt (6 Hooks)
- [ ] page.tsx umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben

### Phase 2: Modularisierung
- [ ] 2 Shared Components erstellt
- [ ] Inline-Komponenten entfernt
- [ ] page.tsx aufgeteilt:
  - EditorTable.tsx
  - EditorTableRow.tsx
  - EditorFilterPopover.tsx
  - EditorDetailModal.tsx
- [ ] page.tsx < 300 Zeilen

### Phase 3: Performance
- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] Debouncing implementiert (300ms)
- [ ] React.memo für Komponenten

### Phase 4: Testing
- [ ] Hook-Tests (10 Tests)
- [ ] Integration-Tests (3+ Tests)
- [ ] Component-Tests (12 Tests)
- [ ] Alle Tests bestehen
- [ ] Coverage >80%

### Phase 5: Dokumentation
- [ ] README.md (500+ Zeilen)
- [ ] API-Docs (1200+ Zeilen)
- [ ] Component-Docs (600+ Zeilen)
- [ ] ADR-Docs (400+ Zeilen)

### Phase 6: Code Quality
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup (10 Debug-Logs entfernt)
- [ ] Design System Compliance
- [ ] Build erfolgreich
- [ ] Production-Test bestanden

### Merge
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

---

## 🔗 Referenzen

### Interne Ressourcen

- **Template:** `docs/templates/module-refactoring-template.md`
- **Quick Reference:** `docs/templates/QUICK_REFERENCE.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Konzept-Dokument:** `docs_old/Journalisten Datenbank/KONZEPT-KLARSTELLUNG.md`
- **Listen-Modul (Referenz):** `docs/lists/README.md`

### Services

- **Multi-Entity Reference-Service:** `src/lib/firebase/multi-entity-reference-service.ts`
- **Contacts Enhanced Service:** `src/lib/firebase/crm-service-enhanced.ts`
- **Library Service:** `src/lib/firebase/library-service.ts`

---

## 💡 Tipps & Tricks

### Spezifisch für Editors

**Multi-Entity References:**
- Immer alle 3 Entities zusammen erstellen (Company + Publications + Journalist)
- Reference-IDs folgen Pattern: `local-ref-*`
- SuperAdmin kann sich nicht selbst referenzieren

**Performance:**
- Companies/Publications ändern sich selten → 10min Cache
- Journalists ändern sich öfter → 5min Cache
- Search mit 300ms Debouncing optimal

**Testing:**
- Multi-Entity Flow testen (Import → Anzeige → Remove)
- Subscription-basierte Features mocken
- Firestore-Queries mocken

---

## 🚀 Nächste Schritte nach Refactoring

1. **Production-Deployment**
   - Feature-Flag für graduelle Ausrollung
   - Monitoring aufsetzen
   - Performance-Metriken tracken

2. **Team-Training**
   - Demo der neuen Architektur
   - Dokumentation teilen
   - Code-Review Sessions

3. **User-Feedback**
   - Beta-Test mit ausgewählten Kunden
   - Feedback sammeln
   - Iterieren

4. **Weitere Optimierungen**
   - Pagination verbessern
   - Erweiterte Filter
   - Export-Funktionalität

---

## 📞 Support

**Team:** CeleroPress Development Team
**Maintainer:** Tech Lead
**Fragen?** Siehe Team README oder Slack-Channel

---

**Version:** 1.1
**Basiert auf:** Modul-Refactoring Template v1.0
**Erstellt:** 2025-10-14
**Aktualisiert:** 2025-10-14 (Phase 0.5 hinzugefügt)
**Geschätzter Aufwand:** 19-24 Stunden (2-3 Arbeitstage)

**Phasen:**
- Phase 0: Setup (30min)
- Phase 0.5: Pre-Refactoring Cleanup (1-2h) ⭐ NEU
- Phase 1: React Query (4h)
- Phase 2: Modularisierung (5h)
- Phase 3: Performance (2h)
- Phase 4: Testing (5h)
- Phase 5: Dokumentation (4h)
- Phase 6: Code Quality (2h)

---

*Dieser Plan ist bereit zur Umsetzung! 🚀*
