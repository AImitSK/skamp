# Modul-Refactoring Template

**Version:** 1.0
**Basiert auf:** Listen-Modul Refactoring (Oktober 2025)
**Projekt:** CeleroPress

---

## 📋 Übersicht

Dieses Template bietet eine bewährte 6-Phasen-Struktur für die Refaktorierung von React-Modulen mit:
- React Query Integration
- Komponenten-Modularisierung
- Performance-Optimierung
- Comprehensive Testing
- Vollständige Dokumentation
- Production-Ready Code Quality

**Geschätzter Aufwand:** 2-4 Tage (je nach Modulgröße)

---

## 🎯 Ziele

- [ ] React Query für State Management integrieren
- [ ] Komponenten modularisieren (< 300 Zeilen pro Datei)
- [ ] Performance-Optimierungen implementieren
- [ ] Test-Coverage erreichen (>80%)
- [ ] Vollständige Dokumentation erstellen
- [ ] Production-Ready Code Quality sicherstellen

---

## 📁 Template-Struktur

### Modul-Ordnerstruktur

```
src/app/dashboard/[module]/
├── page.tsx                        # Hauptseite (Liste/Übersicht)
├── [id]/
│   └── page.tsx                    # Detailseite
├── __tests__/
│   ├── integration/
│   │   └── [module]-crud-flow.test.tsx
│   └── unit/
│       └── ...
├── components/
│   ├── shared/                     # Wiederverwendbare Komponenten
│   │   ├── Alert.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── EmptyState.tsx
│   │   └── __tests__/
│   │       ├── Alert.test.tsx
│   │       ├── ConfirmDialog.test.tsx
│   │       └── EmptyState.test.tsx
│   └── sections/                   # Modal/Form Sections
│       ├── index.tsx               # Hauptkomponente
│       ├── types.ts                # Shared Types
│       ├── BasicInfoSection.tsx
│       ├── [Feature]Section.tsx
│       └── ...
└── [Module].backup.tsx             # Backup der Originalversion

src/lib/hooks/
├── use[Module]Data.ts              # React Query Hooks
└── __tests__/
    └── use[Module]Data.test.tsx

docs/[module]/
├── README.md                       # Hauptdokumentation
├── api/
│   ├── README.md                   # API-Übersicht
│   └── [module]-service.md         # Service-Dokumentation
├── components/
│   └── README.md                   # Komponenten-Dokumentation
└── adr/
    └── README.md                   # Architecture Decision Records
```

---

## 🚀 Die 6 Phasen

### Phase 0: Vorbereitung & Setup

**Ziel:** Sicherer Start mit Backup und Dokumentation des Ist-Zustands

#### Aufgaben

- [ ] Feature-Branch erstellen
  ```bash
  git checkout -b feature/[module]-refactoring-production
  ```

- [ ] Ist-Zustand dokumentieren
  ```bash
  # Zeilen zählen
  wc -l src/app/dashboard/[module]/**/*.tsx

  # Oder mit cloc (wenn installiert)
  npx cloc src/app/dashboard/[module]
  ```

- [ ] Backup-Dateien erstellen
  ```bash
  # Große Komponenten sichern
  cp src/app/dashboard/[module]/[Component].tsx \
     src/app/dashboard/[module]/[Component].backup.tsx
  ```

- [ ] Dependencies prüfen
  - React Query installiert? (`@tanstack/react-query`)
  - Testing Libraries vorhanden? (`jest`, `@testing-library/react`)
  - TypeScript korrekt konfiguriert?

#### Deliverable

- Feature-Branch erstellt
- Backups angelegt
- Dokumentation des Ist-Zustands (Zeilen, Dateien, Struktur)

#### Phase-Bericht Template

```markdown
## Phase 0: Vorbereitung & Setup ✅

### Durchgeführt
- Feature-Branch: `feature/[module]-refactoring-production`
- Ist-Zustand: [X] Dateien, [Y] Zeilen Code
- Backups: [Liste der gesicherten Dateien]
- Dependencies: Alle vorhanden

### Struktur (Ist)
- page.tsx: [X] Zeilen
- [id]/page.tsx: [Y] Zeilen
- [Component].tsx: [Z] Zeilen

### Bereit für Phase 1
```

---

### Phase 1: React Query Integration

**Ziel:** State Management mit React Query ersetzen

#### 1.1 Custom Hooks erstellen

Datei: `src/lib/hooks/use[Module]Data.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { [module]Service } from '@/lib/firebase/[module]-service';

// Query Hooks
export function use[Module]s(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['[module]s', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization');
      return [module]Service.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
}

export function use[Module](id: string | undefined) {
  return useQuery({
    queryKey: ['[module]', id],
    queryFn: () => {
      if (!id) throw new Error('No ID');
      return [module]Service.getById(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation Hooks
export function useCreate[Module]() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { organizationId: string; [module]Data: any }) => {
      return [module]Service.create(data.[module]Data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['[module]s', variables.organizationId]
      });
    },
  });
}

export function useUpdate[Module]() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string; [module]Data: any }) => {
      await [module]Service.update(data.id, data.[module]Data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['[module]', variables.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['[module]s', variables.organizationId]
      });
    },
  });
}

export function useDelete[Module]() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; organizationId: string }) => {
      await [module]Service.delete(data.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['[module]s', variables.organizationId]
      });
    },
  });
}

export function useBulkDelete[Module]s() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { ids: string[]; organizationId: string }) => {
      await Promise.all(data.ids.map(id => [module]Service.delete(id)));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['[module]s', variables.organizationId]
      });
    },
  });
}
```

#### 1.2 page.tsx anpassen

**Entfernen:**
```typescript
// Alte useEffect/loadData-Pattern entfernen
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
  use[Module]s,
  useCreate[Module],
  useUpdate[Module],
  useDelete[Module],
  useBulkDelete[Module]s
} from '@/lib/hooks/use[Module]Data';

// In der Komponente
const { data: items = [], isLoading, error } = use[Module]s(organizationId);
const create[Module] = useCreate[Module]();
const update[Module] = useUpdate[Module]();
const delete[Module] = useDelete[Module]();
const bulkDelete = useBulkDelete[Module]s();

// Handler anpassen
const handleCreate = async (data: any) => {
  await create[Module].mutateAsync({ organizationId, [module]Data: data });
};

const handleUpdate = async (id: string, data: any) => {
  await update[Module].mutateAsync({ id, organizationId, [module]Data: data });
};

const handleDelete = async (id: string) => {
  await delete[Module].mutateAsync({ id, organizationId });
};
```

#### 1.3 [id]/page.tsx anpassen

```typescript
const { data: item, isLoading, error, refetch } = use[Module](id);
const update[Module] = useUpdate[Module]();

const handleUpdate = async (data: any) => {
  await update[Module].mutateAsync({ id, organizationId, [module]Data: data });
  refetch(); // Optional: wenn Optimistic Updates nicht ausreichen
};
```

#### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`use[Module]Data.ts`)
- [ ] 6 Hooks implementiert (Query: getAll, getById | Mutation: create, update, delete, bulkDelete)
- [ ] page.tsx auf React Query umgestellt
- [ ] [id]/page.tsx auf React Query umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben
- [ ] Tests durchlaufen

#### Phase-Bericht Template

```markdown
## Phase 1: React Query Integration ✅

### Implementiert
- Custom Hooks in `use[Module]Data.ts` (6 Hooks)
- page.tsx vollständig auf React Query umgestellt
- [id]/page.tsx auf React Query umgestellt

### Vorteile
- Automatisches Caching (5min staleTime)
- Query Invalidierung bei Mutations
- Error Handling über React Query
- Weniger Boilerplate Code

### Fixes
- [Liste von behobenen TypeScript-Fehlern]

### Commit
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für [Module] abgeschlossen"
```
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Große Komponenten aufteilen, Duplikate eliminieren

#### Phase 2.1: Shared Components extrahieren

**Komponenten identifizieren:**
- Alert (Inline-Alerts)
- ConfirmDialog (Lösch-Bestätigungen)
- EmptyState (Leere Listen)
- LoadingSpinner
- ErrorBoundary

**Beispiel: Alert-Komponente**

Datei: `src/app/dashboard/[module]/components/shared/Alert.tsx`

```typescript
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title: string;
  message?: string;
  onClose?: () => void;
}

const alertConfig = {
  success: {
    icon: CheckCircleIcon,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    textColor: 'text-green-700',
  },
  error: {
    icon: XCircleIcon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-800',
    textColor: 'text-yellow-700',
  },
  info: {
    icon: InformationCircleIcon,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
  },
};

export default function Alert({ type, title, message, onClose }: AlertProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.bgColor} ${config.borderColor} p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.titleColor}`}>{title}</h3>
          {message && <div className={`mt-2 text-sm ${config.textColor}`}>{message}</div>}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md ${config.bgColor} p-1.5
                         ${config.iconColor} hover:bg-opacity-80
                         focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**In page.tsx integrieren:**
```typescript
import Alert from './components/shared/Alert';

// Inline-Alert entfernen, durch Import ersetzen
{alert && (
  <div className="mb-4">
    <Alert
      type={alert.type}
      title={alert.title}
      message={alert.message}
      onClose={() => setAlert(null)}
    />
  </div>
)}
```

**Weitere Shared Components:**
- **ConfirmDialog.tsx** - Lösch-Bestätigungen
- **EmptyState.tsx** - Leere Listen/Keine Ergebnisse

#### Phase 2.2: Große Komponenten modularisieren

**Faustregel:** Komponenten > 500 Zeilen sollten aufgeteilt werden

**Beispiel: Modal mit Tabs → Sections**

**Vorher:**
```
[Module]Modal.tsx (628 Zeilen) - Monolith
```

**Nachher:**
```
components/sections/
├── index.tsx (293 Zeilen) - Main Orchestrator
├── types.ts (73 Zeilen) - Shared Types
├── BasicInfoSection.tsx (77 Zeilen)
├── [Feature1]Section.tsx (83 Zeilen)
├── [Feature2]Section.tsx (77 Zeilen)
├── PreviewSection.tsx (105 Zeilen)
└── SelectorSection.tsx (28 Zeilen)
```

**index.tsx Pattern:**
```typescript
import BasicInfoSection from './BasicInfoSection';
import Feature1Section from './Feature1Section';
import Feature2Section from './Feature2Section';
import PreviewSection from './PreviewSection';
import { [Module]FormData } from './types';

export default function [Module]Modal({
  isOpen,
  onClose,
  mode
}: Props) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<[Module]FormData>(initialState);

  // State Management
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <DialogTitle>{mode === 'create' ? 'Erstellen' : 'Bearbeiten'}</DialogTitle>

      {/* Tabs */}
      <Tabs activeTab={activeTab} onChange={setActiveTab} />

      <DialogBody>
        {activeTab === 'basic' && (
          <BasicInfoSection
            data={formData}
            onChange={handleFieldChange}
          />
        )}
        {activeTab === 'feature1' && (
          <Feature1Section
            data={formData}
            onChange={handleFieldChange}
          />
        )}
        {/* ... weitere Tabs */}
      </DialogBody>

      <DialogActions>
        <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
        <Button onClick={handleSave}>Speichern</Button>
      </DialogActions>
    </Dialog>
  );
}
```

**Section Pattern:**
```typescript
// BasicInfoSection.tsx
interface Props {
  data: [Module]FormData;
  onChange: (field: string, value: any) => void;
}

export default function BasicInfoSection({ data, onChange }: Props) {
  return (
    <FieldGroup>
      <Field>
        <Label>Name *</Label>
        <Input
          value={data.name}
          onChange={(e) => onChange('name', e.target.value)}
        />
      </Field>
      {/* Weitere Felder */}
    </FieldGroup>
  );
}
```

**Backward Compatibility:**
```typescript
// [Module]Modal.tsx (3 Zeilen)
// Re-export für bestehende Imports
export { default } from './components/sections';
```

#### Checkliste Phase 2

- [ ] 3 Shared Components erstellt (Alert, ConfirmDialog, EmptyState)
- [ ] Inline-Komponenten aus page.tsx entfernt
- [ ] Inline-Komponenten aus [id]/page.tsx entfernt
- [ ] Große Komponenten identifiziert (> 500 Zeilen)
- [ ] Section-Struktur erstellt
- [ ] types.ts für shared types angelegt
- [ ] Backward Compatibility sichergestellt
- [ ] Imports in allen Dateien aktualisiert

#### Phase-Bericht Template

```markdown
## Phase 2: Code-Separation & Modularisierung ✅

### Phase 2.1: Shared Components
- Alert.tsx (85 Zeilen)
- ConfirmDialog.tsx (70 Zeilen)
- EmptyState.tsx (40 Zeilen)
- ~[X] Zeilen Duplikat-Code eliminiert

### Phase 2.2: [Component]-Modularisierung
- [Component].tsx: 628 Zeilen → 8 Dateien
- Sections: BasicInfo, Feature1, Feature2, Preview, Selector
- types.ts für shared types

### Vorteile
- Bessere Code-Lesbarkeit
- Einfachere Wartung
- Wiederverwendbare Komponenten
- Eigenständig testbare Sections

### Commit
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen"
```
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

#### 3.1 useCallback für Handler

```typescript
import { useCallback, useMemo } from 'react';

// Handler mit useCallback wrappen
const handleCreate = useCallback(async (data: any) => {
  await create[Module].mutateAsync({ organizationId, [module]Data: data });
}, [create[Module], organizationId]);

const handleUpdate = useCallback(async (id: string, data: any) => {
  await update[Module].mutateAsync({ id, organizationId, [module]Data: data });
}, [update[Module], organizationId]);

const handleDelete = useCallback(async (id: string) => {
  await delete[Module].mutateAsync({ id, organizationId });
}, [delete[Module], organizationId]);

const handleBulkDelete = useCallback(async () => {
  await bulkDelete.mutateAsync({ ids: selectedIds, organizationId });
  setSelectedIds([]);
}, [bulkDelete, selectedIds, organizationId]);
```

#### 3.2 useMemo für Computed Values

```typescript
// Dropdown-Optionen
const categoryOptions = useMemo(() => {
  return CATEGORIES.map(cat => ({
    value: cat.id,
    label: cat.label,
  }));
}, []); // Keine Dependencies = nur einmal berechnen

// Gefilterte/Sortierte Daten
const filteredItems = useMemo(() => {
  let result = items;

  // Filter anwenden
  if (searchTerm) {
    result = result.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (selectedCategory) {
    result = result.filter(item => item.category === selectedCategory);
  }

  // Sortierung
  result.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}, [items, searchTerm, selectedCategory]);

// Statistiken
const stats = useMemo(() => {
  return {
    total: items.length,
    filtered: filteredItems.length,
    selected: selectedIds.length,
  };
}, [items.length, filteredItems.length, selectedIds.length]);
```

#### 3.3 Debouncing für Live-Preview/Search

```typescript
import { useState, useEffect, useCallback } from 'react';

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

// In der Komponente
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms Delay

// Filter verwenden debouncedSearchTerm
const filteredItems = useMemo(() => {
  if (!debouncedSearchTerm) return items;
  return items.filter(item =>
    item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );
}, [items, debouncedSearchTerm]);
```

#### 3.4 React.memo für Komponenten

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

// Mit Custom Comparison
export default React.memo(
  function PreviewSection({ data, items }: Props) {
    return <div>{/* ... */}</div>;
  },
  (prevProps, nextProps) => {
    // Nur re-rendern wenn data oder items sich ändern
    return prevProps.data === nextProps.data &&
           prevProps.items === nextProps.items;
  }
);
```

#### Checkliste Phase 3

- [ ] useCallback für alle Handler
- [ ] useMemo für Dropdown-Optionen
- [ ] useMemo für gefilterte/sortierte Daten
- [ ] useMemo für Statistiken
- [ ] Debouncing für Search implementiert
- [ ] Debouncing für Live-Preview implementiert (500ms)
- [ ] React.memo für Section-Komponenten
- [ ] Performance-Tests durchgeführt

#### Phase-Bericht Template

```markdown
## Phase 3: Performance-Optimierung ✅

### Implementiert
- useCallback für [X] Handler
- useMemo für [Y] Computed Values
- Debouncing (300ms Search, 500ms Preview)
- React.memo für Section-Komponenten

### Messbare Verbesserungen
- Re-Renders reduziert um ~[X]%
- Preview-Berechnung optimiert
- Dropdown-Options-Caching

### Commit
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen"
```
```

---

### Phase 4: Testing

**Ziel:** Comprehensive Test Suite mit >80% Coverage

#### 4.1 Hook Tests

Datei: `src/lib/hooks/__tests__/use[Module]Data.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { use[Module]s, useCreate[Module] } from '../use[Module]Data';
import * as [module]Service from '@/lib/firebase/[module]-service';

// Mock Service
jest.mock('@/lib/firebase/[module]-service');

// Test Wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('use[Module]Data Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('use[Module]s', () => {
    it('sollte [Module] laden', async () => {
      const mockData = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ];

      ([module]Service.getAll as jest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(
        () => use[Module]s('org-123'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });

    it('sollte Error bei fehlendem organizationId werfen', async () => {
      const { result } = renderHook(
        () => use[Module]s(undefined),
        { wrapper: createWrapper() }
      );

      expect(result.current.isError).toBe(false); // Query ist disabled
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreate[Module]', () => {
    it('sollte [Module] erstellen und Cache invalidieren', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ id: 'new-123' });
      ([module]Service.create as jest.Mock).mockImplementation(mockCreate);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useCreate[Module](), { wrapper });

      await waitFor(() => expect(result.current.isIdle).toBe(true));

      const newData = { name: 'New [Module]' };
      await result.current.mutateAsync({
        organizationId: 'org-123',
        [module]Data: newData,
      });

      expect(mockCreate).toHaveBeenCalledWith(newData);
    });
  });
});
```

#### 4.2 Integration Tests

Datei: `src/app/dashboard/[module]/__tests__/integration/[module]-crud-flow.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import [Module]Page from '../../page';
import * as [module]Service from '@/lib/firebase/[module]-service';

jest.mock('@/lib/firebase/[module]-service');

function renderWithProviders(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
}

describe('[Module] CRUD Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sollte kompletten CRUD-Flow durchlaufen', async () => {
    const user = userEvent.setup();

    // Mock: Leere Liste
    ([module]Service.getAll as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<[Module]Page />);

    // CREATE
    await waitFor(() => expect(screen.getByText(/Neu hinzufügen/i)).toBeInTheDocument());

    const createButton = screen.getByText(/Neu hinzufügen/i);
    await user.click(createButton);

    // Form ausfüllen & speichern
    // ...

    // READ
    // ...

    // UPDATE
    // ...

    // DELETE
    // ...
  });
});
```

#### 4.3 Component Tests

Datei: `src/app/dashboard/[module]/components/shared/__tests__/Alert.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('sollte Close-Button aufrufen', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<Alert type="info" title="Info" onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

#### 4.4 Test-Cleanup

**Alte Tests identifizieren:**
```bash
# Tests für [Module] finden
find src -name "*.test.tsx" -o -name "*.test.ts" | grep [module]

# Tests ausführen
npm test -- [module]
```

**Entfernen:**
- Placeholder-Tests ohne Assertions
- Tests mit `it.skip()` oder `test.todo()`
- Redundante Tests (duplikate Logik)

**Fixen:**
- Failing Tests aktualisieren
- Mock-Implementations anpassen
- TypeScript-Fehler beheben

#### Checkliste Phase 4

- [ ] Hook-Tests erstellt (8 Tests)
- [ ] Integration-Tests erstellt (2+ Tests)
- [ ] Component-Tests für Shared Components (19 Tests)
- [ ] Alte/Redundante Tests entfernt
- [ ] Failing Tests gefixt
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage-Report erstellt (npm run test:coverage)
- [ ] Coverage >80%

#### Phase-Bericht Template

```markdown
## Phase 4: Testing ✅

### Test Suite
- Hook-Tests: 8/8 bestanden
- Integration-Tests: 2/2 bestanden
- Component-Tests: 19/19 bestanden
- **Gesamt: 29/29 Tests bestanden**

### Coverage
- Statements: [X]%
- Branches: [X]%
- Functions: [X]%
- Lines: [X]%

### Cleanup
- [X] alte Tests entfernt
- [X] redundante Tests gelöscht

### Commit
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt"
```
```

---

### Phase 5: Dokumentation

**Ziel:** Vollständige, wartbare Dokumentation

#### 5.1 Struktur anlegen

```bash
mkdir -p docs/[module]/{api,components,adr}
```

#### 5.2 README.md (Hauptdokumentation)

Datei: `docs/[module]/README.md`

```markdown
# [Module]-Modul Dokumentation

**Version:** 1.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** [Datum]

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Architektur](#architektur)
- [Technologie-Stack](#technologie-stack)
- [Installation & Setup](#installation--setup)
- [API-Dokumentation](#api-dokumentation)
- [Komponenten](#komponenten)
- [Testing](#testing)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

---

## Übersicht

[Kurze Beschreibung des Moduls, Zweck, Hauptfunktionen]

---

## Features

- ✅ **Feature 1** - Beschreibung
- ✅ **Feature 2** - Beschreibung
- ✅ **React Query Integration** - Automatisches Caching & State Management
- ✅ **Modular Architecture** - Wartbare, kleine Komponenten
- ✅ **Performance-Optimiert** - useCallback, useMemo, Debouncing
- ✅ **Comprehensive Tests** - >80% Coverage

---

## Architektur

### Übersicht

```
[Module]-Modul (Production-Ready)
├── React Query State Management
├── Modular Components (< 300 Zeilen)
├── Shared Components (Alert, ConfirmDialog, etc.)
├── Performance-Optimierungen
└── Comprehensive Test Suite
```

### Ordnerstruktur

[Detaillierte Ordnerstruktur]

---

## Technologie-Stack

- **React 18** - UI Framework
- **Next.js 15** - App Router
- **TypeScript** - Type Safety
- **React Query v5** - State Management
- **Firebase Firestore** - Backend
- **Tailwind CSS** - Styling
- **Jest + Testing Library** - Testing

---

## Installation & Setup

[Setup-Anweisungen]

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

# [Module]-Tests
npm test -- [module]

# Coverage
npm run test:coverage
```

### Test-Coverage

- **Hook-Tests:** 8 Tests
- **Integration-Tests:** 2 Tests
- **Component-Tests:** 19 Tests
- **Gesamt:** 29 Tests

---

## Performance

### Optimierungen

- **useCallback:** Handler memoized
- **useMemo:** Dropdown-Options, gefilterte Daten
- **Debouncing:** Search (300ms), Preview (500ms)
- **React.memo:** Section-Komponenten

### Messungen

- Re-Renders reduziert um ~[X]%
- Initial Load: [X]ms
- Filter-Anwendung: [X]ms

---

## Troubleshooting

### Häufige Probleme

#### Problem 1
**Symptom:** [Beschreibung]
**Lösung:** [Lösung]

---

## Referenzen

- [API-Dokumentation](./api/[module]-service.md)
- [Komponenten-Dokumentation](./components/README.md)
- [ADRs](./adr/README.md)
- [Design System](../../design-system/DESIGN_SYSTEM.md)

---

**Maintainer:** [Name]
**Team:** CeleroPress Development Team
```

#### 5.3 API-Dokumentation

Siehe separates Template in diesem Dokument: [API-Dokumentation Template](#api-dokumentation-template)

#### 5.4 Komponenten-Dokumentation

Siehe separates Template in diesem Dokument: [Komponenten-Dokumentation Template](#komponenten-dokumentation-template)

#### 5.5 ADR-Dokumentation

Datei: `docs/[module]/adr/README.md`

```markdown
# Architecture Decision Records (ADRs) - [Module]

## ADR-Index

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| ADR-0001 | React Query vs. Redux | Accepted | [Datum] |
| ADR-0002 | Component Modularization Strategy | Accepted | [Datum] |

---

## ADR-0001: React Query für State Management

**Status:** Accepted
**Datum:** [Datum]

### Kontext

Das [Module]-Modul benötigte ein State Management für Server-Daten mit:
- Automatischem Caching
- Optimistic Updates
- Error Handling
- Query Invalidierung

### Entscheidung

Wir haben uns für **React Query** entschieden.

### Alternativen

1. **Redux Toolkit + RTK Query**
   - ✅ Etabliert, große Community
   - ❌ Mehr Boilerplate
   - ❌ Komplexere Setup

2. **Zustand + SWR**
   - ✅ Leichtgewichtig
   - ❌ Weniger Features
   - ❌ Manuelle Cache-Verwaltung

### Konsequenzen

✅ **Vorteile:**
- Weniger Boilerplate Code
- Automatisches Caching (5min staleTime)
- Built-in Error Handling
- Query Invalidierung out-of-the-box

⚠️ **Trade-offs:**
- Neue Dependency
- Team muss React Query lernen

---
```

#### Checkliste Phase 5

- [ ] docs/[module]/README.md erstellt (400+ Zeilen)
- [ ] docs/[module]/api/README.md erstellt (300+ Zeilen)
- [ ] docs/[module]/api/[module]-service.md erstellt (800+ Zeilen)
- [ ] docs/[module]/components/README.md erstellt (650+ Zeilen)
- [ ] docs/[module]/adr/README.md erstellt (350+ Zeilen)
- [ ] Alle Links funktionieren
- [ ] Code-Beispiele getestet
- [ ] Screenshots/Diagramme hinzugefügt (optional)

#### Phase-Bericht Template

```markdown
## Phase 5: Dokumentation ✅

### Erstellt
- README.md (400+ Zeilen) - Hauptdokumentation
- api/README.md (300+ Zeilen) - API-Übersicht
- api/[module]-service.md (800+ Zeilen) - Detaillierte API-Referenz
- components/README.md (650+ Zeilen) - Komponenten-Dokumentation
- adr/README.md (350+ Zeilen) - Architecture Decision Records

### Gesamt
- **2.500+ Zeilen Dokumentation**
- Vollständige Code-Beispiele
- Troubleshooting-Guides
- Performance-Messungen

### Commit
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt"
```
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
# Alle Fehler anzeigen
npx tsc --noEmit

# Nur [Module]-Dateien prüfen
npx tsc --noEmit | grep [module]
```

**Häufige Fehler:**
- Missing imports
- Incorrect prop types
- Undefined variables
- Type mismatches

**Fixen:**
- Imports ergänzen
- Types definieren
- Optional Chaining (`?.`) verwenden

#### 6.2 ESLint Check

```bash
# Alle Warnings/Errors
npx eslint src/app/dashboard/[module]

# Auto-Fix
npx eslint src/app/dashboard/[module] --fix
```

**Zu beheben:**
- Unused imports
- Unused variables
- Missing dependencies in useEffect/useCallback/useMemo
- console.log statements

#### 6.3 Console Cleanup

```bash
# Console-Statements finden
grep -r "console\." src/app/dashboard/[module]

# Oder mit ripgrep
rg "console\." src/app/dashboard/[module]
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors
console.error('Failed to load data:', error);
console.warn('Deprecated feature used');

// ✅ In Catch-Blöcken
try {
  // ...
} catch (error) {
  console.error('Error:', error);
}
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('data:', data);
console.log('entering function');

// ❌ Development-Logs
console.log('📊 Stats:', stats);
```

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

```bash
# Checklist
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary Actions
✓ #dedc00 für Checkboxen
✓ Konsistente Höhen (h-10 für Toolbar)
✓ Konsistente Borders (zinc-300 für Inputs)
✓ Focus-Rings (focus:ring-2 focus:ring-primary)
```

**Häufige Abweichungen:**
- Schatten (shadow-md, shadow-lg) → entfernen
- /20/solid Icons → durch /24/outline ersetzen
- Inkonsistente Grautöne → auf Zinc vereinheitlichen
- Fehlende Focus-States → hinzufügen

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
- [Module] funktioniert im Production-Build?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in [Module]
- [ ] ESLint: 0 Warnings in [Module]
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant (oder Ausnahmen dokumentiert)
- [ ] Build: Erfolgreich (npm run build)
- [ ] Production-Test: App funktioniert
- [ ] Performance: Kein Lag, flüssiges UI
- [ ] Accessibility: Focus-States, ARIA-Labels

#### Phase-Bericht Template

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

### Ausnahmen (Design System)
- [Dokumentierte Ausnahmen mit Begründung]

### Commit
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt"
```
```

---

## 🔄 Merge zu Main

**Letzte Phase:** Code zu Main mergen

### Workflow

```bash
# 1. Finaler Commit (Test-Cleanup, etc.)
git add .
git commit -m "test: Finaler Test-Cleanup"

# 2. Push Feature-Branch
git push origin feature/[module]-refactoring-production

# 3. Zu Main wechseln und mergen
git checkout main
git merge feature/[module]-refactoring-production --no-edit

# 4. Main pushen
git push origin main

# 5. Tests auf Main
npm test -- [module]
```

### Checkliste Merge

- [ ] Alle 6 Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden
- [ ] Production-Deployment geplant

### Final Report

```markdown
## ✅ [Module]-Refactoring erfolgreich abgeschlossen!

### Status
- **Alle 6 Phasen:** Abgeschlossen
- **Tests:** [X]/[X] bestanden
- **Coverage:** [X]%
- **Dokumentation:** [Y] Zeilen

### Änderungen
- +[X] Zeilen hinzugefügt
- -[Y] Zeilen entfernt
- [Z] Dateien geändert

### Highlights
- React Query Integration mit 6 Custom Hooks
- [Component] von [X] Zeilen → [Y] modulare Dateien
- Performance-Optimierungen (useCallback, useMemo, Debouncing)
- Comprehensive Test Suite ([X] Tests)
- [Y]+ Zeilen Dokumentation

### Nächste Schritte
- [ ] Production-Deployment vorbereiten
- [ ] Team-Demo durchführen
- [ ] Monitoring aufsetzen
```

---

## 📚 Zusätzliche Templates

### API-Dokumentation Template

Datei: `docs/[module]/api/[module]-service.md`

```markdown
# [Module]-Service API-Dokumentation

**Version:** 1.0
**Service:** `[module]-service.ts`
**Location:** `src/lib/firebase/[module]-service.ts`

---

## Übersicht

Der [Module]-Service bietet alle CRUD-Operationen für [Module] über Firebase Firestore.

---

## Methoden

### getAll()

Lädt alle [Module] für eine Organisation.

**Signatur:**
```typescript
async function getAll(organizationId: string): Promise<[Module][]>
```

**Parameter:**
- `organizationId` (string) - ID der Organisation

**Rückgabe:**
- `Promise<[Module][]>` - Array von [Module]-Objekten

**Beispiel:**
```typescript
const items = await [module]Service.getAll('org-123');
console.log(items); // [{ id: '1', name: '...' }, ...]
```

**Fehler:**
- Wirft Error wenn organizationId leer
- Wirft Error bei Firestore-Fehlern

---

### getById()

Lädt ein einzelnes [Module] per ID.

**Signatur:**
```typescript
async function getById(id: string): Promise<[Module] | null>
```

**Parameter:**
- `id` (string) - [Module]-ID

**Rückgabe:**
- `Promise<[Module] | null>` - [Module]-Objekt oder null

**Beispiel:**
```typescript
const item = await [module]Service.getById('item-123');
if (item) {
  console.log(item.name);
}
```

---

### create()

Erstellt ein neues [Module].

**Signatur:**
```typescript
async function create(data: Create[Module]Input): Promise<{ id: string }>
```

**Parameter:**
- `data` (Create[Module]Input) - [Module]-Daten ohne ID

```typescript
interface Create[Module]Input {
  name: string;
  description?: string;
  organizationId: string;
  // ... weitere Felder
}
```

**Rückgabe:**
- `Promise<{ id: string }>` - ID des erstellten [Module]

**Beispiel:**
```typescript
const result = await [module]Service.create({
  name: 'Neues [Module]',
  description: 'Beschreibung',
  organizationId: 'org-123',
});
console.log(result.id); // 'new-item-123'
```

---

[Weitere Methoden dokumentieren: update(), delete(), etc.]

---

## TypeScript-Typen

### [Module]

```typescript
interface [Module] {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  // ... weitere Felder
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
  const items = await [module]Service.getAll(orgId);
} catch (error) {
  console.error('Failed to load [module]:', error);
  // User-freundliche Error-Message anzeigen
}
```

---

## Performance

### Caching

React Query cached Daten für **5 Minuten** (staleTime).

### Optimierungen

- Firestore Indexes für häufige Queries
- Batch-Operations für Bulk-Delete
- Query-Invalidierung nur bei Änderungen

---
```

### Komponenten-Dokumentation Template

Datei: `docs/[module]/components/README.md`

```markdown
# [Module] Komponenten-Dokumentation

**Version:** 1.0
**Letzte Aktualisierung:** [Datum]

---

## Übersicht

Alle Komponenten des [Module]-Moduls mit Verwendungsbeispielen, Props und Best Practices.

---

## Shared Components

### Alert

**Pfad:** `components/shared/Alert.tsx`
**Verwendung:** Feedback-Messages, Validierungs-Fehler

#### Props

```typescript
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose?: () => void;
}
```

#### Beispiel

```tsx
<Alert
  type="error"
  title="Validierungsfehler"
  message="Bitte alle Pflichtfelder ausfüllen"
  onClose={() => setAlert(null)}
/>
```

#### Styling

- Success: Grün (green-500)
- Error: Rot (red-500)
- Warning: Gelb (yellow-500)
- Info: Blau (blue-500)

---

### ConfirmDialog

**Pfad:** `components/shared/ConfirmDialog.tsx`
**Verwendung:** Lösch-Bestätigungen, Destructive Actions

#### Props

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
}
```

#### Beispiel

```tsx
<ConfirmDialog
  isOpen={showDeleteDialog}
  onClose={() => setShowDeleteDialog(false)}
  onConfirm={handleDelete}
  title="Eintrag löschen?"
  message="Diese Aktion kann nicht rückgängig gemacht werden."
  type="danger"
  confirmLabel="Löschen"
/>
```

---

[Weitere Komponenten dokumentieren]

---

## Section Components

### BasicInfoSection

**Pfad:** `components/sections/BasicInfoSection.tsx`
**Verwendung:** Name, Beschreibung, Kategorie

#### Props

```typescript
interface BasicInfoSectionProps {
  data: [Module]FormData;
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}
```

#### Beispiel

```tsx
<BasicInfoSection
  data={formData}
  onChange={handleFieldChange}
  errors={validationErrors}
/>
```

---

[Weitere Sections dokumentieren]

---

## Best Practices

### Komponenten-Größe

- ✅ **< 300 Zeilen:** Gut wartbar
- ⚠️ **300-500 Zeilen:** Prüfen ob aufspaltbar
- ❌ **> 500 Zeilen:** Aufteilen!

### Props-Design

- ✅ **Typed Props:** TypeScript Interfaces verwenden
- ✅ **Optional Props:** Mit `?` markieren
- ✅ **Default Values:** In Destructuring setzen

```typescript
function MyComponent({
  required,
  optional = 'default',
  callback = () => {},
}: Props) {
  // ...
}
```

### Performance

- ✅ **React.memo:** Für teure Komponenten
- ✅ **useCallback:** Für Props-Callbacks
- ✅ **useMemo:** Für Computed Values

---
```

---

## 📊 Erfolgsmetriken

### Code Quality

- **Zeilen-Reduktion:** ~[X]% durch Modularisierung
- **Komponenten-Größe:** Alle < 300 Zeilen
- **Code-Duplikation:** ~[Y] Zeilen eliminiert
- **TypeScript-Fehler:** 0
- **ESLint-Warnings:** 0

### Testing

- **Test-Coverage:** > 80%
- **Anzahl Tests:** [X] Tests
- **Pass-Rate:** 100%

### Performance

- **Re-Renders:** Reduktion um ~[X]%
- **Initial Load:** < [Y]ms
- **Filter-Anwendung:** < [Z]ms

### Dokumentation

- **Zeilen:** [X]+ Zeilen
- **Dateien:** [Y] Dokumente
- **Code-Beispiele:** [Z] Beispiele

---

## 📝 Checkliste: Gesamtes Refactoring

### Vorbereitung

- [ ] Feature-Branch erstellt
- [ ] Backups angelegt
- [ ] Ist-Zustand dokumentiert
- [ ] Dependencies geprüft

### Phase 1: React Query

- [ ] Custom Hooks erstellt (6 Hooks)
- [ ] page.tsx umgestellt
- [ ] [id]/page.tsx umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben

### Phase 2: Modularisierung

- [ ] 3 Shared Components erstellt
- [ ] Inline-Komponenten entfernt
- [ ] Große Komponenten aufgeteilt
- [ ] Section-Struktur erstellt
- [ ] types.ts angelegt
- [ ] Backward Compatibility sichergestellt

### Phase 3: Performance

- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] Debouncing implementiert
- [ ] React.memo für Komponenten

### Phase 4: Testing

- [ ] Hook-Tests (8 Tests)
- [ ] Integration-Tests (2+ Tests)
- [ ] Component-Tests (19 Tests)
- [ ] Alte Tests entfernt
- [ ] Alle Tests bestehen
- [ ] Coverage >80%

### Phase 5: Dokumentation

- [ ] README.md (400+ Zeilen)
- [ ] API-Docs (300+ Zeilen)
- [ ] Service-Docs (800+ Zeilen)
- [ ] Component-Docs (650+ Zeilen)
- [ ] ADR-Docs (350+ Zeilen)

### Phase 6: Code Quality

- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup
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

### Projekt-Spezifisch

- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`
- **Testing Setup:** `src/__tests__/setup.ts`

### Externe Ressourcen

- [React Query Docs](https://tanstack.com/query/latest)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest](https://jestjs.io/docs/getting-started)

---

## 💡 Tipps & Tricks

### Git Workflow

```bash
# Regelmäßig committen (nach jeder Phase)
git add .
git commit -m "feat: Phase [X] abgeschlossen"

# Branch aktuell halten
git fetch origin
git merge origin/main
```

### Testing

```bash
# Schneller Test-Run (nur [Module])
npm test -- [module]

# Watch-Mode für Entwicklung
npm test -- [module] --watch

# Coverage mit Details
npm run test:coverage -- --verbose
```

### Performance-Debugging

```typescript
// React DevTools Profiler verwenden
// Oder custom Hook:

function useWhyDidYouUpdate(name: string, props: any) {
  const previousProps = useRef<any>();

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: any = {};

      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }

    previousProps.current = props;
  });
}
```

---

## 🚀 Nächste Schritte nach Refactoring

1. **Team-Demo:** Features und neue Architektur vorstellen
2. **Monitoring:** Performance-Metriken aufsetzen
3. **User-Feedback:** Sammeln und iterieren
4. **Weitere Module:** Template für andere Module anwenden
5. **Kontinuierliche Verbesserung:** ADRs updaten, Docs pflegen

---

## 📞 Support

**Team:** CeleroPress Development Team
**Maintainer:** [Name]
**Fragen?** Siehe Team README oder Slack-Channel

---

**Version:** 1.0
**Basiert auf:** Listen-Modul Refactoring (erfolgreich abgeschlossen am [Datum])
**Template erstellt:** [Datum]

---

*Dieses Template ist ein lebendes Dokument. Feedback und Verbesserungen sind willkommen!*
