# Refactoring Quick Reference

**Schnellzugriff für Modul-Refactoring**

---

## 🎯 Die 7 Phasen (Kurzversion)

| Phase | Was | Dauer | Output |
|-------|-----|-------|--------|
| **0. Setup** | Branch, Backup, Ist-Zustand | 30min | Feature-Branch, Backups |
| **0.5 Cleanup** ⭐ | TODOs, Console-Logs, toter Code | 1-2h | Saubere Basis, -X Zeilen |
| **1. React Query** | Custom Hooks, State Management | 4h | 6 Hooks, umgestellte Pages |
| **2. Modularisierung** | Shared Components, Sections | 4h | 3 Shared, aufgeteilte Modals |
| **3. Performance** | useCallback, useMemo, Debouncing | 2h | Optimierte Handler |
| **4. Testing** | Hook-, Integration-, Component-Tests | 4h | 20+ Tests, >80% Coverage |
| **5. Dokumentation** | README, API, Components, ADR | 3h | 2500+ Zeilen Docs |
| **6. Code Quality** | TypeScript, ESLint, Design System | 2h | 0 Errors, Production-Ready |
| **Merge** | Zu Main mergen | 30min | Deployed! |

**Gesamt:** ~2-3 Tage

---

## 📁 Ordnerstruktur (Ziel)

```
src/app/dashboard/[module]/
├── page.tsx                          # <300 Zeilen
├── [id]/page.tsx                     # <300 Zeilen
├── __tests__/
│   ├── integration/
│   └── unit/
├── components/
│   ├── shared/                       # Alert, ConfirmDialog, EmptyState
│   │   ├── Alert.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── EmptyState.tsx
│   │   └── __tests__/
│   └── sections/                     # Modal-Sections
│       ├── index.tsx
│       ├── types.ts
│       └── [Feature]Section.tsx

src/lib/hooks/
├── use[Module]Data.ts                # 6 Hooks
└── __tests__/
    └── use[Module]Data.test.tsx

docs/[module]/
├── README.md
├── api/
│   ├── README.md
│   └── [module]-service.md
├── components/
│   └── README.md
└── adr/
    └── README.md
```

---

## 🔧 Git-Kommandos

```bash
# Setup
git checkout -b feature/[module]-refactoring-production

# Nach jeder Phase committen
git add .
git commit -m "feat: Phase [X] - [Beschreibung]"

# Feature-Branch pushen
git push origin feature/[module]-refactoring-production

# Merge zu Main
git checkout main
git merge feature/[module]-refactoring-production --no-edit
git push origin main
```

---

## 🧪 Test-Kommandos

```bash
# Alle Tests
npm test

# Modul-Tests
npm test -- [module]

# Watch-Mode
npm test -- [module] --watch

# Coverage
npm run test:coverage

# TypeScript
npx tsc --noEmit

# ESLint
npx eslint src/app/dashboard/[module]
npx eslint src/app/dashboard/[module] --fix
```

---

## 📝 Commit-Messages (Deutsch)

```bash
# Phase 0
git commit -m "chore: Phase 0 - Setup & Backup für [Module]-Refactoring"

# Phase 0.5
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Deprecated Functions entfernt
- [A] Unused State entfernt
- Kommentierte Code-Blöcke gelöscht
- Unused imports entfernt via ESLint

[Component].tsx: [X] → [Y] Zeilen (-[Z] Zeilen toter Code)

Saubere Basis für React Query Integration (Phase 1).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Phase 1
git commit -m "feat: Phase 1 - React Query Integration für [Module] abgeschlossen

- Custom Hooks in use[Module]Data.ts erstellt
- page.tsx vollständig auf React Query umgestellt
- [id]/page.tsx auf React Query umgestellt

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Phase 2
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung abgeschlossen"

# Phase 3
git commit -m "feat: Phase 3 - Performance-Optimierung abgeschlossen"

# Phase 4
git commit -m "test: Phase 4 - Comprehensive Test Suite erstellt"

# Phase 5
git commit -m "docs: Phase 5 - Vollständige Dokumentation erstellt"

# Phase 6
git commit -m "chore: Phase 6 - Production-Ready Code Quality sichergestellt"
```

---

## 🎨 Design System (Wichtigste Regeln)

**Location:** `docs/design-system/DESIGN_SYSTEM.md`

### Do's ✅

```tsx
// Farben
primary: '#005fab'            // CI-Blau
accent: '#dedc00'             // Gelb-Grün (Checkboxen)
text: 'text-zinc-700'         // Standard-Text
border: 'border-zinc-300'     // Inputs/Buttons

// Icons (NUR /24/outline!)
import { Icon } from "@heroicons/react/24/outline"
<Icon className="h-5 w-5 text-zinc-700" />

// Buttons
<Button className="bg-primary hover:bg-primary-hover text-white h-10 px-6 rounded-lg">
  <PlusIcon className="h-4 w-4 mr-2" />
  Neu
</Button>

// Inputs
<Input className="h-10 border-zinc-300 focus:ring-2 focus:ring-primary" />

// Checkboxen (Custom Component!)
<Checkbox checked={isChecked} onChange={setIsChecked} />
// Farbe: #dedc00 mit weißem Häkchen

// Focus-States
focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
```

### Don'ts ❌

```tsx
// ❌ Keine Schatten (außer Dropdowns)
className="shadow-md shadow-lg"

// ❌ Keine /20/solid Icons
import { Icon } from "@heroicons/react/20/solid"

// ❌ Keine anderen Icon-Libraries
import { Icon } from "react-icons"

// ❌ Keine nativen Checkboxen
<input type="checkbox" />

// ❌ Keine Gray/Slate-Paletten
className="text-gray-600 border-slate-300"
```

---

## 🚀 React Query Patterns

### Hooks Template

```typescript
// src/lib/hooks/use[Module]Data.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query: Get All
export function use[Module]s(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['[module]s', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization');
      return [module]Service.getAll(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5min
  });
}

// Query: Get By ID
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

// Mutation: Create
export function useCreate[Module]() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => [module]Service.create(data.[module]Data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['[module]s', variables.organizationId] });
    },
  });
}

// Mutation: Update
export function useUpdate[Module]() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => [module]Service.update(data.id, data.[module]Data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['[module]', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['[module]s', variables.organizationId] });
    },
  });
}

// Mutation: Delete
export function useDelete[Module]() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => [module]Service.delete(data.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['[module]s', variables.organizationId] });
    },
  });
}

// Mutation: Bulk Delete
export function useBulkDelete[Module]s() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      await Promise.all(data.ids.map(id => [module]Service.delete(id)));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['[module]s', variables.organizationId] });
    },
  });
}
```

### Usage in Components

```typescript
// In page.tsx
const { data: items = [], isLoading, error } = use[Module]s(organizationId);
const create[Module] = useCreate[Module]();
const delete[Module] = useDelete[Module]();

const handleCreate = async (data: any) => {
  await create[Module].mutateAsync({ organizationId, [module]Data: data });
};

const handleDelete = async (id: string) => {
  await delete[Module].mutateAsync({ id, organizationId });
};
```

---

## ⚡ Performance Patterns

```typescript
// useCallback für Handler
const handleSave = useCallback(async (data: any) => {
  await update.mutateAsync({ id, data });
}, [update, id]);

// useMemo für Computed Values
const filteredItems = useMemo(() => {
  return items.filter(item => item.name.includes(searchTerm));
}, [items, searchTerm]);

const dropdownOptions = useMemo(() => {
  return CATEGORIES.map(cat => ({ value: cat.id, label: cat.label }));
}, []);

// Debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const debouncedSearch = useDebounce(searchTerm, 300);

// React.memo für Komponenten
export default React.memo(function MySection({ data, onChange }: Props) {
  return <div>{/* ... */}</div>;
});
```

---

## 🧪 Testing Patterns

### Hook Test

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

test('sollte Daten laden', async () => {
  const { result } = renderHook(() => use[Module]s('org-123'), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([...]);
});
```

### Component Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('sollte Alert rendern', () => {
  render(<Alert type="success" title="Erfolg" />);
  expect(screen.getByText('Erfolg')).toBeInTheDocument();
});

test('sollte onClick aufrufen', async () => {
  const user = userEvent.setup();
  const onClick = jest.fn();
  render(<Button onClick={onClick}>Click</Button>);
  await user.click(screen.getByText('Click'));
  expect(onClick).toHaveBeenCalledTimes(1);
});
```

---

## 📊 Erfolgsmetriken

### Code Quality

- ✅ Komponenten: Alle <300 Zeilen
- ✅ TypeScript: 0 Fehler
- ✅ ESLint: 0 Warnings
- ✅ Console: Nur production-relevante Logs

### Testing

- ✅ Coverage: >80%
- ✅ Tests: 20+ Tests
- ✅ Pass-Rate: 100%

### Performance

- ✅ Re-Renders: Reduziert um ~30%
- ✅ Initial Load: <500ms
- ✅ Filter: <100ms

### Dokumentation

- ✅ README: 400+ Zeilen
- ✅ API-Docs: 800+ Zeilen
- ✅ Component-Docs: 650+ Zeilen
- ✅ Gesamt: 2500+ Zeilen

---

## 🔍 Console Cleanup

```bash
# Finden
grep -r "console\." src/app/dashboard/[module]
rg "console\." src/app/dashboard/[module]

# Erlaubt ✅
console.error('Error:', error);      // In catch-blocks
console.warn('Deprecated:', feature); // Wichtige Warnungen

# Entfernen ❌
console.log('data:', data);           // Debug-Logs
console.log('📊 Stats:', stats);      // Development-Logs
```

---

## 🎯 Checkliste (Kurzversion)

### Phase 0
- [ ] Branch erstellt
- [ ] Backups angelegt
- [ ] Ist-Zustand dokumentiert

### Phase 0.5 ⭐
- [ ] TODO-Kommentare entfernt
- [ ] Console-Logs entfernt
- [ ] Deprecated Functions entfernt
- [ ] Unused State entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test bestanden

### Phase 1
- [ ] 6 Hooks erstellt
- [ ] page.tsx umgestellt
- [ ] [id]/page.tsx umgestellt

### Phase 2
- [ ] 3 Shared Components
- [ ] Große Komponenten aufgeteilt

### Phase 3
- [ ] useCallback
- [ ] useMemo
- [ ] Debouncing

### Phase 4
- [ ] 20+ Tests
- [ ] >80% Coverage

### Phase 5
- [ ] 5 Dokumentations-Dateien
- [ ] 2500+ Zeilen

### Phase 6
- [ ] 0 TypeScript-Fehler
- [ ] 0 ESLint-Warnings
- [ ] Design System compliant

### Merge
- [ ] Alle 7 Phasen abgeschlossen
- [ ] Zu Main gemerged
- [ ] Tests bestanden

---

## 📞 Ressourcen

### Interne Docs

- **Full Template:** `docs/templates/module-refactoring-template.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Project Instructions:** `CLAUDE.md`

### Beispiel-Implementierung

- **Listen-Modul:** `src/app/dashboard/contacts/lists/`
- **Listen-Docs:** `docs/lists/README.md`

### Externe Links

- [React Query](https://tanstack.com/query/latest)
- [Next.js](https://nextjs.org/docs)
- [Testing Library](https://testing-library.com/react)

---

**Version:** 1.1
**Erstellt:** Oktober 2025
**Basiert auf:** Listen-Modul & Editors-Modul Refactoring
**Letzte Aktualisierung:** Oktober 2025 (Phase 0.5 hinzugefügt)

---

*Für Details siehe: `docs/templates/module-refactoring-template.md`*
