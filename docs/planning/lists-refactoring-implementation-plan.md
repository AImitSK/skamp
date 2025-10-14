# Listen-Refactoring: Detaillierter Implementierungsplan

**Projekt:** CeleroPress Listen-Modul Production-Ready Refactoring
**Datum:** 2025-10-14
**Geschätzter Aufwand:** 2-3 Tage (bei 6-8h/Tag)
**Basiert auf:** CRM-Refactoring Best Practices

---

## PHASEN-ÜBERSICHT

| Phase | Fokus | Dauer | Dependencies | Risk |
|-------|-------|-------|--------------|------|
| **0** | Vorbereitung & Setup | 1h | - | Low |
| **1** | React Query Integration | 4h | Phase 0 | Medium |
| **2** | Code-Separation | 4h | Phase 1 | Medium |
| **3** | Performance-Optimierung | 2h | Phase 2 | Low |
| **4** | Testing | 4h | Phase 3 | Low |
| **5** | Dokumentation | 3h | Phase 4 | Low |
| **6** | Production-Ready & Rollout | 4h | Phase 5 | Medium |

**TOTAL:** 22 Stunden (~3 Tage à 7-8h)

---

## PHASE 0: VORBEREITUNG & SETUP (1h)

### 0.1 Feature-Branch erstellen
```bash
git checkout -b feature/lists-refactoring-production
git push -u origin feature/lists-refactoring-production
```

### 0.2 Backup erstellen
```bash
# Kompletter Snapshot vor Migration
cp -r src/app/dashboard/contacts/lists src/app/dashboard/contacts/lists.backup
cp -r src/components/listen src/components/listen.backup
```

### 0.3 Ist-Zustand dokumentieren
```bash
# Aktuelle Zeilenzahlen
wc -l src/app/dashboard/contacts/lists/*.tsx
wc -l src/components/listen/*.tsx

# Ergebnis:
# 889   page.tsx
# 744   [listId]/page.tsx
# 628   ListModal.tsx
# 152   ContactSelectorModal.tsx
# 485   PublicationFilterSection.tsx
# 2898  total
```

### 0.4 Dependencies prüfen
```bash
# React Query bereits installiert (aus CRM)
npm list @tanstack/react-query
# ✓ @tanstack/react-query@5.x.x
```

### ✅ **Checkpoint 0:**
- [ ] Feature-Branch erstellt
- [ ] Backup vorhanden
- [ ] Ist-Zustand dokumentiert
- [ ] React Query verfügbar

---

## PHASE 1: REACT QUERY INTEGRATION (4h)

**Ziel:** Server State Management mit Caching und automatischer Invalidierung

### 1.1 Custom Hooks erstellen (2h)

#### 1.1.1 useLists Hook
```typescript
// src/lib/hooks/useListsData.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listsService } from '@/lib/firebase/lists-service';

/**
 * Hook zum Laden aller Verteilerlisten
 */
export function useLists(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['lists', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization');
      return listsService.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

/**
 * Hook zum Laden einer einzelnen Liste
 */
export function useList(listId: string | undefined) {
  return useQuery({
    queryKey: ['list', listId],
    queryFn: () => {
      if (!listId) throw new Error('No list ID');
      return listsService.getById(listId);
    },
    enabled: !!listId,
    staleTime: 5 * 60 * 1000,
  });
}
```

#### 1.1.2 Mutations Hooks
```typescript
/**
 * Hook zum Erstellen einer Liste
 */
export function useCreateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listData: Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>;
      organizationId: string;
      userId: string;
    }) => {
      return listsService.create(data.listData, data.organizationId, data.userId);
    },
    onSuccess: (_, variables) => {
      // Invalidiere Listen-Cache
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Aktualisieren einer Liste
 */
export function useUpdateList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listId: string;
      updates: Partial<DistributionList>;
      organizationId: string;
    }) => {
      return listsService.update(data.listId, data.updates);
    },
    onSuccess: (_, variables) => {
      // Invalidiere spezifische Liste und Listen-Cache
      queryClient.invalidateQueries({ queryKey: ['list', variables.listId] });
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Löschen einer Liste
 */
export function useDeleteList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listId: string;
      organizationId: string;
    }) => {
      return listsService.delete(data.listId);
    },
    onSuccess: (_, variables) => {
      // Invalidiere Listen-Cache
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}

/**
 * Hook zum Bulk-Löschen von Listen
 */
export function useBulkDeleteLists() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      listIds: string[];
      organizationId: string;
    }) => {
      await Promise.all(
        data.listIds.map(id => listsService.delete(id))
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lists', variables.organizationId] });
    },
  });
}
```

### 1.2 Integration in page.tsx (1h)

```typescript
// src/app/dashboard/contacts/lists/page.tsx
'use client';

import { useLists, useCreateList, useUpdateList, useDeleteList, useBulkDeleteLists } from '@/lib/hooks/useListsData';

export default function ListsPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // React Query hooks statt useEffect
  const { data: lists = [], isLoading } = useLists(currentOrganization?.id);
  const { mutate: createList } = useCreateList();
  const { mutate: updateList } = useUpdateList();
  const { mutate: deleteList } = useDeleteList();
  const { mutate: bulkDeleteLists } = useBulkDeleteLists();

  // Handler verwenden Mutations
  const handleCreate = async (listData: any) => {
    createList(
      { listData, organizationId: currentOrganization!.id, userId: user!.uid },
      {
        onSuccess: () => showAlert('success', 'Liste erstellt'),
        onError: () => showAlert('error', 'Fehler beim Erstellen'),
      }
    );
  };

  // ... rest der Komponente
}
```

### 1.3 Integration in [listId]/page.tsx (1h)

```typescript
// src/app/dashboard/contacts/lists/[listId]/page.tsx
'use client';

import { useList, useUpdateList } from '@/lib/hooks/useListsData';

export default function ListDetailPage() {
  const params = useParams();
  const listId = params.listId as string;

  // React Query statt useEffect
  const { data: list, isLoading } = useList(listId);
  const { mutate: updateList } = useUpdateList();

  const handleSave = async (updates: any) => {
    updateList(
      { listId, updates, organizationId: currentOrganization!.id },
      {
        onSuccess: () => showAlert('success', 'Liste aktualisiert'),
        onError: () => showAlert('error', 'Fehler beim Aktualisieren'),
      }
    );
  };

  // ... rest der Komponente
}
```

### ✅ **Checkpoint 1:**
- [ ] useListsData.ts erstellt mit allen Hooks
- [ ] page.tsx verwendet React Query
- [ ] [listId]/page.tsx verwendet React Query
- [ ] Cache-Invalidierung funktioniert
- [ ] Keine manuellen useEffect für Data Fetching
- [ ] Git Commit: `feat(lists): Add React Query integration`

**Erwartetes Ergebnis:**
- Automatisches Caching (5 Min)
- Keine doppelten Requests
- Optimistic Updates
- Bessere Loading States

---

## PHASE 2: CODE-SEPARATION (4h)

**Ziel:** Große Dateien in wartbare Komponenten aufteilen

### 2.1 Shared Components extrahieren (1h)

#### 2.1.1 Alert Component
```typescript
// src/app/dashboard/contacts/lists/components/shared/Alert.tsx

export function Alert({
  type = 'info',
  title,
  message
}: {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
}) {
  // Extrahiert aus page.tsx und [listId]/page.tsx
}
```

#### 2.1.2 ConfirmDialog Component
```typescript
// src/app/dashboard/contacts/lists/components/shared/ConfirmDialog.tsx

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmDialogProps) {
  // Neu erstellt
}
```

#### 2.1.3 EmptyState Component
```typescript
// src/app/dashboard/contacts/lists/components/shared/EmptyState.tsx

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  // Neu erstellt für leere Listen
}
```

### 2.2 ListModal aufteilen (2.5h)

**Aktuell:** 628 Zeilen in einer Datei
**Ziel:** ~200 Zeilen Hauptkomponente + 6 Sections à 80-120 Zeilen

```typescript
// src/app/dashboard/contacts/lists/components/modals/ListModal/
├── index.tsx                      # Hauptkomponente (~200 Zeilen)
├── BasicInfoSection.tsx           # Name, Beschreibung, Kategorie, Typ (~100 Zeilen)
├── CompanyFiltersSection.tsx      # Firmentypen, Branchen, Tags, Länder (~120 Zeilen)
├── PersonFiltersSection.tsx       # hasEmail, hasPhone, Sprachen (~80 Zeilen)
├── JournalistFiltersSection.tsx   # Beats/Ressorts (~80 Zeilen)
├── PreviewSection.tsx             # Live-Vorschau der Kontakte (~120 Zeilen)
├── ContactSelectorSection.tsx     # Für statische Listen (~100 Zeilen)
└── types.ts                       # Shared Types
```

#### 2.2.1 Haupt-Komponente (index.tsx)
```typescript
// src/app/dashboard/contacts/lists/components/modals/ListModal/index.tsx

import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { BasicInfoSection } from './BasicInfoSection';
import { CompanyFiltersSection } from './CompanyFiltersSection';
import { PersonFiltersSection } from './PersonFiltersSection';
import { JournalistFiltersSection } from './JournalistFiltersSection';
import { PreviewSection } from './PreviewSection';
import { ContactSelectorSection } from './ContactSelectorSection';

export function ListModal({ list, onClose, onSave, userId, organizationId }: ListModalProps) {
  const [formData, setFormData] = useState<Partial<DistributionList>>({
    name: '',
    description: '',
    type: 'dynamic',
    category: 'custom',
    filters: {},
    contactIds: []
  });

  return (
    <Dialog open={true} onClose={onClose} size="5xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {list ? 'Liste bearbeiten' : 'Neue Liste erstellen'}
        </DialogTitle>

        <DialogBody className="px-6 py-6 h-[500px] overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <BasicInfoSection
                formData={formData}
                onChange={setFormData}
                validationErrors={validationErrors}
              />

              {formData.type === 'dynamic' && (
                <>
                  <CompanyFiltersSection
                    filters={formData.filters}
                    onChange={(filters) => setFormData(prev => ({ ...prev, filters }))}
                  />
                  <PersonFiltersSection
                    filters={formData.filters}
                    onChange={(filters) => setFormData(prev => ({ ...prev, filters }))}
                  />
                  <JournalistFiltersSection
                    filters={formData.filters}
                    onChange={(filters) => setFormData(prev => ({ ...prev, filters }))}
                  />
                </>
              )}

              {formData.type === 'static' && (
                <ContactSelectorSection
                  contactIds={formData.contactIds}
                  onChange={(ids) => setFormData(prev => ({ ...prev, contactIds: ids }))}
                />
              )}
            </div>

            <PreviewSection
              formData={formData}
              organizationId={organizationId}
            />
          </div>
        </DialogBody>

        <DialogActions>
          {/* Buttons */}
        </DialogActions>
      </form>
    </Dialog>
  );
}
```

#### 2.2.2 BasicInfoSection
```typescript
// src/app/dashboard/contacts/lists/components/modals/ListModal/BasicInfoSection.tsx

export function BasicInfoSection({ formData, onChange, validationErrors }: Props) {
  return (
    <FieldGroup>
      <Field>
        <Label>Listen-Name *</Label>
        <Input
          value={formData.name || ''}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          required
          autoFocus
        />
      </Field>

      <Field>
        <Label>Beschreibung</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
        />
      </Field>

      {/* Kategorie + Typ Radio Buttons */}
    </FieldGroup>
  );
}
```

### 2.3 Weitere Sections analog aufteilen (0.5h)

Alle weiteren Sections nach gleichem Muster erstellen.

### ✅ **Checkpoint 2:**
- [ ] Shared Components extrahiert (Alert, ConfirmDialog, EmptyState)
- [ ] ListModal aufgeteilt in 7 Dateien
- [ ] Keine Datei >300 Zeilen
- [ ] Alle Imports funktionieren
- [ ] UI funktioniert identisch wie vorher
- [ ] Git Commit: `refactor(lists): Separate components into modules`

**Erwartetes Ergebnis:**
```
ListModal: 628 → 200 Zeilen (+6 Sections à 80-120 Zeilen)
page.tsx: 889 → ~700 Zeilen (durch shared components)
[listId]/page.tsx: 744 → ~600 Zeilen (durch shared components)
```

---

## PHASE 3: PERFORMANCE-OPTIMIERUNG (2h)

### 3.1 Memoization für Filter (1h)

```typescript
// In page.tsx

// Vorher: Bei jedem Render neu berechnet
const filteredLists = lists.filter(/* ... */);

// Nachher: Nur bei Änderungen neu berechnen
const filteredLists = useMemo(() => {
  let result = lists;

  if (searchTerm) {
    result = result.filter(list =>
      list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      list.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (selectedTypes.length > 0) {
    result = result.filter(list => selectedTypes.includes(list.type));
  }

  if (selectedCategories.length > 0) {
    result = result.filter(list =>
      list.category && selectedCategories.includes(list.category)
    );
  }

  return result;
}, [lists, searchTerm, selectedTypes, selectedCategories]);

const paginatedLists = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  return filteredLists.slice(startIndex, startIndex + itemsPerPage);
}, [filteredLists, currentPage, itemsPerPage]);
```

### 3.2 ContactSelectorModal optimieren (0.5h)

```typescript
// In ContactSelectorModal.tsx

// Memoize Kontakt-Liste
const contactsList = useMemo(() => {
  return contacts.filter(contact => {
    if (searchQuery) {
      const name = formatContactName(contact).toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    }
    return true;
  });
}, [contacts, searchQuery]);

// Debounce Search
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchQuery);
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### 3.3 Preview-Debouncing optimieren (0.5h)

```typescript
// In PreviewSection.tsx

// Bereits vorhanden: 500ms Debounce
// Optimieren durch useCallback
const updatePreview = useCallback(async () => {
  if (!filters || !organizationId) return;
  setLoadingPreview(true);
  try {
    const contacts = await listsService.getContactsByFilters(filters, organizationId);
    setPreviewContacts(contacts.slice(0, 10));
    setPreviewCount(contacts.length);
  } finally {
    setLoadingPreview(false);
  }
}, [filters, organizationId]);

useEffect(() => {
  const timer = setTimeout(() => {
    updatePreview();
  }, 500);
  return () => clearTimeout(timer);
}, [updatePreview]);
```

### ✅ **Checkpoint 3:**
- [ ] Filter-Logik memoized
- [ ] Pagination memoized
- [ ] ContactSelectorModal optimiert
- [ ] Preview-Debouncing funktioniert
- [ ] Keine Performance-Warnungen in DevTools
- [ ] Git Commit: `perf(lists): Add memoization and debouncing`

---

## PHASE 4: TESTING (4h)

### 4.1 Integration Tests erstellen (4h)

```typescript
// src/app/dashboard/contacts/lists/__tests__/integration/lists-create-flow.test.tsx

describe('Lists Create Flow', () => {
  it('creates a dynamic list with filters and previews contacts', async () => {
    render(<ListsPage />);

    // Wait for data to load
    await waitFor(() => expect(screen.queryByText('Lade Daten...')).not.toBeInTheDocument());

    // Open modal
    const createButton = screen.getByText('Neue Liste erstellen');
    fireEvent.click(createButton);

    // Fill basic info
    const nameInput = screen.getByLabelText('Listen-Name *');
    fireEvent.change(nameInput, { target: { value: 'Test-Journalisten' } });

    // Select dynamic type
    const dynamicRadio = screen.getByLabelText('Dynamische Liste');
    fireEvent.click(dynamicRadio);

    // Set filters
    const typeFilter = screen.getByLabelText('Firmentypen');
    fireEvent.change(typeFilter, { target: { value: 'publisher' } });

    // Verify preview updates
    await waitFor(() => {
      expect(screen.getByText(/\d+ Kontakte/)).toBeInTheDocument();
    });

    // Save
    const saveButton = screen.getByText('Speichern');
    fireEvent.click(saveButton);

    // Verify list created
    await waitFor(() => {
      expect(screen.getByText('Test-Journalisten')).toBeInTheDocument();
    });
  });
});
```

```typescript
// lists-dynamic-flow.test.tsx

describe('Lists Dynamic Flow', () => {
  it('updates filters and preview updates automatically', async () => {
    // Test dynamic list filter changes
  });
});
```

```typescript
// lists-bulk-actions.test.tsx

describe('Lists Bulk Actions', () => {
  it('exports multiple lists as CSV', async () => {
    // Test CSV export
  });

  it('deletes multiple lists with confirmation', async () => {
    // Test bulk delete
  });
});
```

### ✅ **Checkpoint 4:**
- [ ] Integration Tests: 3 Test-Suites
- [ ] Alle Tests grün
- [ ] Coverage für kritische Flows
- [ ] Git Commit: `test(lists): Add integration tests`

---

## PHASE 5: DOKUMENTATION (3h)

### 5.1 Haupt-README erstellen (1h)

```markdown
// docs/lists/README.md

# Verteilerlisten (Distribution Lists)

**Version:** 1.0
**Status:** ✅ Production Ready
**Letzte Aktualisierung:** 2025-10-14

## Übersicht
Das Listen-Modul ermöglicht die Verwaltung von dynamischen und statischen Verteilerlisten...

## Architektur
### Routing-Struktur
/dashboard/contacts/lists/
├── page.tsx                    # Listen-Übersicht
├── [listId]/page.tsx          # Listen-Detailseite
└── components/                 # Komponenten

## Technologie-Stack
- Next.js 15.4.4 (App Router)
- React 19 mit TypeScript
- React Query (@tanstack/react-query)
- Firebase Firestore

## Features
- ✅ Dynamische Listen mit Filtern
- ✅ Statische Listen mit manueller Auswahl
- ✅ Publikations-Filter
- ✅ Live-Vorschau
- ✅ Export-Funktionen
```

### 5.2 API-Dokumentation (1h)

```markdown
// docs/lists/api/README.md

# Listen Firebase Services API Reference

## listsService

### Methoden
- `getAll(organizationId)` - Alle Listen laden
- `getById(listId)` - Einzelne Liste laden
- `create(listData, organizationId, userId)` - Neue Liste erstellen
- `update(listId, updates)` - Liste aktualisieren
- `delete(listId)` - Liste löschen
- `getContactsByFilters(filters, organizationId)` - Kontakte nach Filtern
- `refreshDynamicList(listId)` - Dynamische Liste aktualisieren
```

```markdown
// docs/lists/api/lists-service.md

# Lists Service Dokumentation

Vollständige API-Referenz mit Beispielen...
```

### 5.3 ADR-Dokumentation (0.5h)

```markdown
// docs/lists/adr/README.md

# Architecture Decision Records (ADRs)

## ADR-Index
| ADR | Titel | Status | Datum | Thema |
|-----|-------|--------|-------|-------|
| Noch keine ADRs vorhanden | - | - | - | - |

Erste ADRs werden bei architektonischen Änderungen erstellt.
```

### 5.4 Component-Dokumentation (0.5h)

```markdown
// docs/lists/components/README.md

# Listen Components Guide

## Komponenten-Struktur
- ListModal - Haupt-Modal zum Erstellen/Bearbeiten
- BasicInfoSection - Name, Beschreibung, Kategorie
- CompanyFiltersSection - Firmen-Filter
- PersonFiltersSection - Personen-Filter
- JournalistFiltersSection - Journalisten-Filter
- PreviewSection - Live-Vorschau
- PublicationFilterSection - Publikations-Filter
- ContactSelectorModal - Kontakt-Auswahl für statische Listen

## Shared Components
- Alert - Benachrichtigungen
- ConfirmDialog - Bestätigungsdialoge
- EmptyState - Leerzustände
```

### ✅ **Checkpoint 5:**
- [ ] docs/lists/README.md vollständig
- [ ] docs/lists/api/ mit README + lists-service.md
- [ ] docs/lists/adr/README.md erstellt
- [ ] docs/lists/components/README.md erstellt
- [ ] JSDoc für exported Functions
- [ ] Git Commit: `docs(lists): Add comprehensive documentation`

---

## PHASE 6: PRODUCTION-READY & ROLLOUT (4h)

**Ziel:** Super professioneller Code ohne Rückstände alter Ideen und Implementierungen

### 6.1 Code Quality & Cleanup (1.5h)

#### 6.1.1 ESLint & TypeScript (0.5h)

```bash
# ESLint prüfen und automatisch fixen
npx eslint src/app/dashboard/contacts/lists/ --fix
npx eslint src/lib/hooks/useListsData.ts --fix

# TypeScript Errors prüfen
npx tsc --noEmit --project tsconfig.json

# Erwartetes Ergebnis:
# ✅ 0 Errors
# ✅ 0 Warnings
```

#### 6.1.2 Console & Debug Cleanup (0.5h)

**Zu entfernen:**
```bash
# Console-Statements finden
grep -r "console\." src/app/dashboard/contacts/lists/
grep -r "console\." src/lib/hooks/useListsData.ts

# Zu entfernen:
# ❌ console.log()
# ❌ console.error() (außer in catch-Blöcken)
# ❌ console.warn()
# ❌ console.debug()
# ❌ debugger;
```

**Erlaubt:**
```typescript
// ✅ In catch-Blöcken für Production-Monitoring
try {
  // ...
} catch (error) {
  console.error('[Lists] Failed to load:', error); // OK
  throw error;
}
```

#### 6.1.3 Code Cleanup (0.5h)

```bash
# Unused Imports finden
npx eslint src/app/dashboard/contacts/lists/ --rule "no-unused-vars: error"

# Dead Code finden (unreachable code)
npx eslint src/app/dashboard/contacts/lists/ --rule "no-unreachable: error"
```

**Checkliste:**
- [ ] Alle unused Imports entfernt
- [ ] Alle unused Variables entfernt
- [ ] Dead Code entfernt (if (false), unreachable returns)
- [ ] Alte auskommentierte Code-Blöcke entfernt
- [ ] Alte TODO-Kommentare entfernt oder in Issues verschoben
- [ ] Temporäre Test-Code entfernt

**Beispiele:**

```typescript
// ❌ SCHLECHT: Alter auskommentierter Code
// const oldFunction = () => {
//   console.log('This was the old way');
// };

// ❌ SCHLECHT: Unused imports
import { useMemo, useEffect, useState } from 'react'; // nur useMemo wird benutzt

// ❌ SCHLECHT: Dead code
if (false) {
  doSomething(); // wird nie ausgeführt
}

// ❌ SCHLECHT: TODO ohne Kontext
// TODO: fix this

// ✅ GUT: Sauberer Code
import { useMemo } from 'react';

// ✅ GUT: TODO als Issue
// Issue #123: Refactor filter logic for better performance
```

### 6.2 Deep Code Review (1h)

#### 6.2.1 Consistency Check (0.3h)

**Namenskonventionen prüfen:**
```typescript
// ✅ Komponenten: PascalCase
export function ListModal() {}

// ✅ Hooks: camelCase mit "use" Prefix
export function useLists() {}

// ✅ Functions: camelCase
function handleDelete() {}

// ✅ Constants: UPPER_SNAKE_CASE
const DEFAULT_PAGE_SIZE = 25;

// ✅ Types: PascalCase
interface ListModalProps {}
type ListCategory = 'media' | 'custom';
```

**Datei-Struktur prüfen:**
```
src/app/dashboard/contacts/lists/
├── page.tsx                               # ✅ Hauptseite
├── [listId]/page.tsx                      # ✅ Detailseite
├── components/
│   ├── shared/                            # ✅ Shared Components
│   │   ├── Alert.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── EmptyState.tsx
│   └── modals/
│       └── ListModal/                     # ✅ Modal Sections
│           ├── index.tsx
│           ├── BasicInfoSection.tsx
│           ├── CompanyFiltersSection.tsx
│           ├── PersonFiltersSection.tsx
│           ├── JournalistFiltersSection.tsx
│           ├── PreviewSection.tsx
│           ├── ContactSelectorSection.tsx
│           └── types.ts
└── __tests__/                             # ✅ Tests
    └── integration/
```

#### 6.2.2 Design System Compliance (0.3h)

**Prüfen:**
```typescript
// ✅ Box Headers: text-base (nicht text-lg)
<h3 className="text-base font-semibold text-zinc-900">

// ✅ Badges: Korrekte Farben
<Badge color="zinc">Kategorie</Badge>      // Categories
<Badge color="blue">Statisch</Badge>       // Static lists
<Badge color="purple">Journalist</Badge>   // Journalists (ohne Icon)

// ✅ Buttons: Design System Styling
<Button color="zinc">Abbrechen</Button>
<Button color="blue">Speichern</Button>

// ✅ Dialogs: Korrekte Struktur
<Dialog>
  <DialogTitle>Titel</DialogTitle>
  <DialogBody>Inhalt</DialogBody>
  <DialogActions>Buttons</DialogActions>
</Dialog>

// ❌ VERBOTEN: Shadow-Effekte
className="shadow-lg"  // Design Pattern verbietet shadows
```

**Durchsuchen:**
```bash
# Shadows finden (sollten nicht vorhanden sein)
grep -r "shadow-" src/app/dashboard/contacts/lists/

# Icons prüfen (nur /24/outline erlaubt)
grep -r "from '@heroicons" src/app/dashboard/contacts/lists/
# Erwartetes Format: '@heroicons/react/24/outline'
```

#### 6.2.3 Performance-Checks (0.2h)

```typescript
// ✅ Filter sind memoized
const filteredLists = useMemo(() => { /* ... */ }, [lists, filters]);

// ✅ Pagination ist memoized
const paginatedLists = useMemo(() => { /* ... */ }, [filteredLists, page]);

// ✅ React Query ist konfiguriert
const { data: lists } = useLists(orgId);  // mit 5min staleTime

// ❌ VERMEIDEN: Unnötige Re-Renders
// Prüfen mit React DevTools Profiler
```

#### 6.2.4 Accessibility-Checks (0.2h)

```typescript
// ✅ Labels für Inputs
<Label htmlFor="list-name">Listen-Name</Label>
<Input id="list-name" />

// ✅ ARIA-Attribute
<button aria-label="Liste löschen">
  <TrashIcon className="h-5 w-5" />
</button>

// ✅ Keyboard-Navigation
<Dialog onClose={onClose}>  // ESC zum Schließen
```

**Testen:**
- [ ] Tab-Navigation funktioniert
- [ ] ESC schließt Modals
- [ ] Enter submittet Forms
- [ ] Alle Buttons haben aria-labels oder sichtbaren Text

### 6.3 Final Review (0.5h)

**Pre-Deployment Checklist:**

```bash
# 1. Tests laufen
npm test
# Erwartung: ✅ Alle Tests grün

# 2. TypeScript kompiliert
npx tsc --noEmit
# Erwartung: ✅ 0 Errors

# 3. ESLint ist sauber
npx eslint src/app/dashboard/contacts/lists/ src/lib/hooks/useListsData.ts
# Erwartung: ✅ 0 Errors, 0 Warnings

# 4. Build funktioniert
npm run build
# Erwartung: ✅ Build erfolgreich

# 5. Lighthouse Score prüfen (lokal)
npm run dev
# Öffne: http://localhost:3000/dashboard/contacts/lists
# DevTools → Lighthouse → Run
# Erwartung: ✅ Performance 90+, Accessibility 95+

# 6. Bundle Size prüfen
npm run build
# Prüfe .next/static/ Größe
# Erwartung: ✅ Keine massiven Größenzunahmen
```

**Code-Qualitäts-Checklist:**
- [ ] ✅ Keine console.logs (außer in catch-Blöcken)
- [ ] ✅ Keine TypeScript Errors
- [ ] ✅ Keine ESLint Warnings
- [ ] ✅ Keine unused Imports
- [ ] ✅ Keine Dead Code
- [ ] ✅ Keine TODOs ohne Kontext
- [ ] ✅ Keine alten Kommentare
- [ ] ✅ Design System eingehalten
- [ ] ✅ Namenskonventionen konsistent
- [ ] ✅ Alle Tests grün
- [ ] ✅ Performance optimiert (memoization)
- [ ] ✅ Accessibility geprüft

**Git Commit:**
```bash
git add .
git commit -m "chore(lists): Production-ready code cleanup

- Removed all console.logs and debug code
- Fixed ESLint and TypeScript errors
- Removed unused imports and dead code
- Ensured Design System compliance
- Verified performance optimizations
- Confirmed accessibility standards
- All tests passing

🚀 Production Ready"
```

### 6.4 Staging Deployment (0.5h)

```bash
# 1. Deploy zu Staging
vercel deploy --target preview

# 2. Warte auf Deployment
# URL wird angezeigt: https://skamp-xyz123.vercel.app

# 3. Smoke Tests auf Staging
```

**Manuell testen:**
- [ ] Listen-Übersicht lädt
- [ ] Neue Liste erstellen funktioniert (dynamisch)
- [ ] Neue Liste erstellen funktioniert (statisch)
- [ ] Filter funktionieren
- [ ] Liste bearbeiten funktioniert
- [ ] Liste löschen funktioniert
- [ ] Export funktioniert
- [ ] Detailseite lädt
- [ ] Mobile-Ansicht funktioniert

**Performance-Check:**
```bash
# Lighthouse auf Staging
# DevTools → Lighthouse → Run auf Staging-URL
```

**Erwartung:**
- ✅ Performance: 90+
- ✅ Accessibility: 95+
- ✅ Best Practices: 90+
- ✅ SEO: 90+

### 6.5 Production Deployment (0.5h)

```bash
# 1. Merge zu main
git checkout main
git merge feature/lists-refactoring-production
git push origin main

# 2. Deploy zu Production
vercel deploy --prod

# 3. Monitor für erste 30 Minuten
vercel logs --follow --production

# Prüfen auf:
# ❌ Errors
# ❌ 500er Responses
# ❌ Lange Response Times
```

**Post-Deployment Verification:**
```bash
# 1. Production URL öffnen
open https://skamp.vercel.app/dashboard/contacts/lists

# 2. Schnelle Smoke Tests
# - Listen laden
# - Neue Liste erstellen
# - Filter anwenden

# 3. Monitoring prüfen
# - Sentry: Keine neuen Errors
# - Vercel Analytics: Response Times normal
# - User Feedback: Keine Beschwerden
```

### 6.6 Monitoring & Rollback-Plan (1h)

**Monitoring-Dashboard (erste 2 Stunden nach Deployment):**

```bash
# Sentry Errors prüfen
# https://sentry.io/...
# Erwartung: <5 neue Errors in 2h

# Vercel Analytics prüfen
vercel logs --production | grep "ERROR"
# Erwartung: Keine kritischen Errors

# Performance Metriken
# p95 Response Time: <2s
# Error Rate: <0.5%
```

**Success Criteria (nach 24h):**
- [ ] ✅ Keine kritischen Sentry-Errors
- [ ] ✅ Response Times stabil (<2s p95)
- [ ] ✅ Keine User-Beschwerden
- [ ] ✅ Conversion Rate stabil
- [ ] ✅ All Features funktionieren

**Rollback-Strategie (falls kritische Probleme auftreten):**

**Scenario 1: Kritischer Bug (User können nicht arbeiten)**
```bash
# Schnell-Rollback (5 Minuten)
vercel rollback
# oder
git revert HEAD~1
git push
vercel deploy --prod
```

**Scenario 2: Performance-Probleme**
```bash
# Feature-Flag deaktivieren (falls implementiert)
# Environment Variable setzen:
vercel env add USE_LEGACY_LISTS=true
vercel deploy --prod

# Oder: Staging-Branch deployen
git checkout feature/lists-refactoring-production
git revert HEAD~5  # Revert zu stabiler Version
git push
vercel deploy --prod
```

**Scenario 3: Partial Rollback**
```bash
# Nur spezifische Dateien zurücksetzen
git checkout HEAD~1 -- src/app/dashboard/contacts/lists/page.tsx
git commit -m "fix(lists): Rollback page.tsx to stable version"
git push
vercel deploy --prod
```

### ✅ **Checkpoint 6:**
- [ ] Code Quality: 100% (keine Warnings, keine TODOs, keine console.logs)
- [ ] Consistency: 100% (Namenskonventionen, Design System)
- [ ] Tests: Alle grün
- [ ] Staging: Erfolgreich getestet
- [ ] Production: Deployed und stabil
- [ ] Monitoring: Aktiv, keine kritischen Errors
- [ ] Rollback-Plan: Dokumentiert und getestet
- [ ] Git Commits: Sauber und aussagekräftig

**Final Git Commit:**
```bash
git commit -m "feat(lists): Production-ready refactoring complete

Phase 0: Setup & Backup ✅
Phase 1: React Query Integration ✅
Phase 2: Code-Separation ✅
Phase 3: Performance-Optimierung ✅
Phase 4: Testing ✅
Phase 5: Dokumentation ✅
Phase 6: Production-Ready & Rollout ✅

🚀 Listen-Modul ist jetzt production-ready:
- Super professioneller Code
- Keine Rückstände alter Implementierungen
- Vollständig getestet
- Dokumentiert
- Performance optimiert

📊 Ergebnisse:
- ESLint Errors: 0
- TypeScript Errors: 0
- Test Coverage: 60%+
- Lighthouse Score: 90+
- Code Quality: 100%
"
```

---

## SUCCESS-METRIKEN

### Code-Qualität:
- ✅ ESLint Errors: 0
- ✅ TypeScript Errors: 0
- ✅ Test Coverage: 60%+
- ✅ Max File Size: <400 Zeilen

### Performance:
- ✅ Initial Load: <2s
- ✅ Filter Response: <100ms
- ✅ React Query Caching: 5 min

### Dokumentation:
- ✅ README vorhanden
- ✅ API-Docs vollständig
- ✅ JSDoc vollständig
- ✅ Component-Docs vorhanden

---

## ROLLBACK-STRATEGIE

Falls kritische Probleme auftreten:

1. **Schnell-Rollback** (5 Minuten)
   ```bash
   git checkout main
   vercel deploy --prod
   ```

2. **Restore Backup** (10 Minuten)
   ```bash
   rm -rf src/app/dashboard/contacts/lists
   cp -r src/app/dashboard/contacts/lists.backup src/app/dashboard/contacts/lists
   git commit -m "Rollback: Restore lists backup"
   git push
   ```

---

## TEAM-KOMMUNIKATION

### Vor Start:
- [ ] Plan mit Team besprechen
- [ ] Timeline kommunizieren

### Während Migration:
- [ ] Aussagekräftige Git Commits
- [ ] Pull Requests für Reviews

### Nach Abschluss:
- [ ] Demo für Stakeholder
- [ ] Dokumentation teilen

---

**Nächster Schritt:** Phase 0 starten! 🚀
