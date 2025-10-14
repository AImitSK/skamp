# Listen-Refactoring: Detaillierter Implementierungsplan

**Projekt:** SKAMP Listen-Modul Production-Ready Refactoring
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
| **6** | Code Quality | 2h | Phase 5 | Low |

**TOTAL:** 20 Stunden (~3 Tage à 7h)

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

## PHASE 6: CODE QUALITY (2h)

### 6.1 ESLint & TypeScript (1h)

```bash
# ESLint prüfen
npx eslint src/app/dashboard/contacts/lists/ --fix
npx eslint src/components/listen/ --fix

# TypeScript prüfen
npx tsc --noEmit --project tsconfig.json
```

### 6.2 Cleanup (1h)

- [ ] Console.logs entfernen
- [ ] Unused Imports entfernen
- [ ] Kommentare aktualisieren
- [ ] TODOs bereinigen

### ✅ **Checkpoint 6:**
- [ ] Keine ESLint-Errors
- [ ] Keine TypeScript-Errors
- [ ] Keine Console.logs
- [ ] Keine unused Imports
- [ ] Git Commit: `chore(lists): Code quality improvements`

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
