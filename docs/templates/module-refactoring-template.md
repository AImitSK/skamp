# Modul-Refactoring Template

**Version:** 2.1 (Kompakt)
**Basiert auf:** Projects-Module Refactoring (Oktober 2025)
**Projekt:** CeleroPress

---

## 📋 Übersicht

Dieses Template bietet eine bewährte 8-Phasen-Struktur für die Refaktorierung von React-Modulen mit:
- Pre-Refactoring Cleanup (toter Code)
- React Query Integration
- Komponenten-Modularisierung
- Performance-Optimierung
- **Automated Testing** (via refactoring-test Agent) ⭐
- **Automated Documentation** (via refactoring-dokumentation Agent) ⭐
- Production-Ready Code Quality
- **Quality Gate Check** (via refactoring-quality-check Agent) ⭐

**Geschätzter Aufwand:** 2-4 Tage (je nach Modulgröße)

**Agent-Workflow:** Phases 4, 5 und 6.5 verwenden spezialisierte Agents!

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
├── page.tsx                        # Hauptseite
├── [id]/page.tsx                   # Detailseite
├── __tests__/                      # Tests
├── components/
│   ├── shared/                     # Wiederverwendbare Komponenten
│   └── sections/                   # Modal/Form Sections
└── [Module].backup.tsx             # Backup

src/lib/hooks/
└── use[Module]Data.ts              # React Query Hooks

docs/[module]/
├── README.md                       # Hauptdokumentation
├── api/[module]-service.md
├── components/README.md
└── adr/README.md
```

---

## 🚀 Die 8 Phasen

**Phasen-Übersicht:**
- **Phase 0:** Vorbereitung & Setup
- **Phase 0.5:** Pre-Refactoring Cleanup ⭐
- **Phase 1:** React Query Integration
- **Phase 2:** Code-Separation & Modularisierung
- **Phase 3:** Performance-Optimierung
- **Phase 4:** Testing (AGENT: refactoring-test)
- **Phase 5:** Dokumentation (AGENT: refactoring-dokumentation)
- **Phase 6:** Production-Ready Code Quality
- **Phase 6.5:** Quality Gate Check (AGENT: refactoring-quality-check)
- **Phase 7:** Merge zu Main

---

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
  ```

- [ ] Backup-Dateien erstellen
  ```bash
  cp src/app/dashboard/[module]/[Component].tsx \
     src/app/dashboard/[module]/[Component].backup.tsx
  ```

- [ ] Dependencies prüfen
  - React Query installiert? (`@tanstack/react-query`)
  - Testing Libraries vorhanden?
  - TypeScript korrekt konfiguriert?

#### Deliverable

- Feature-Branch erstellt
- Backups angelegt
- Dokumentation des Ist-Zustands (Zeilen, Dateien, Struktur)

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0 - Setup & Backup für [Module]-Refactoring"
```

---

### Phase 0.5: Pre-Refactoring Cleanup ⭐

**Ziel:** Toten Code entfernen BEVOR mit Refactoring begonnen wird

**Dauer:** 1-2 Stunden

**Warum wichtig?** Phase 6 (Code Quality) findet NICHT automatisch:
- Kommentierter Code
- Deprecated Funktionen
- TODO-Kommentare
- Unused State-Variablen (die irgendwo referenziert werden)

**→ Cleanup im Vorfeld verhindert, dass toter Code in Phase 2 modularisiert wird!**

#### Cleanup-Schritte

**1. TODOs finden & entfernen**
```bash
grep -rn "TODO:" src/app/dashboard/[module]
```
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen (nicht verschieben!)

**2. Console-Logs entfernen**
```bash
grep -rn "console\." src/app/dashboard/[module]
```
- [ ] Debug-Logs entfernen (console.log)
- [ ] Nur console.error() in catch-blocks behalten

**3. Deprecated Functions entfernen**
- [ ] Code auf "deprecated", "old", "legacy" durchsuchen
- [ ] Mock-Implementations identifizieren
- [ ] Functions + alle Aufrufe entfernen

**4. Unused State entfernen**
```bash
grep -n "useState" src/app/dashboard/[module]/page.tsx
```
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused States identifizieren und entfernen

**5. Kommentierte Code-Blöcke löschen**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Code-Blöcke vollständig löschen

**6. ESLint Auto-Fix**
```bash
npx eslint src/app/dashboard/[module] --fix
```
- [ ] ESLint mit --fix ausführen
- [ ] Manuelle Fixes für verbleibende Warnings

**7. Manueller Test**
```bash
npm run dev
```
- [ ] Dev-Server starten
- [ ] Modul manuell testen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt
- [ ] Debug-Console-Logs entfernt (~X Logs)
- [ ] Deprecated Functions entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup

- [X] TODO-Kommentare entfernt
- ~[Y] Debug-Console-Logs entfernt
- [Z] Deprecated Functions entfernt
- [A] Unused State entfernt
- Unused imports entfernt via ESLint

[Component].tsx: [X] → [Y] Zeilen (-[Z] Zeilen toter Code)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
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

// Mutation Hooks: create, update, delete, bulkDelete
// [Pattern wie oben, verkürzt]
```

#### 1.2 page.tsx anpassen

**Entfernen:**
```typescript
// Alte useEffect/loadData-Pattern entfernen
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadData = async () => { /* ... */ };
  loadData();
}, [organizationId]);
```

**Hinzufügen:**
```typescript
import { use[Module]s, useCreate[Module], useUpdate[Module], useDelete[Module] } from '@/lib/hooks/use[Module]Data';

const { data: items = [], isLoading, error } = use[Module]s(organizationId);
const create[Module] = useCreate[Module]();
const update[Module] = useUpdate[Module]();
const delete[Module] = useDelete[Module]();
```

#### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`use[Module]Data.ts`)
- [ ] 6 Hooks implementiert (Query: getAll, getById | Mutation: create, update, delete, bulkDelete)
- [ ] page.tsx auf React Query umgestellt
- [ ] [id]/page.tsx auf React Query umgestellt
- [ ] Alte loadData/useEffect entfernt
- [ ] TypeScript-Fehler behoben

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Integration für [Module]"
```

---

### Phase 2: Code-Separation & Modularisierung

**Ziel:** Große Komponenten aufteilen, Duplikate eliminieren

#### Phase 2.1: Toast-Service statt Alert-Komponente ⭐ EMPFOHLEN

**WICHTIG:** Anstatt inline Alert-Komponenten zu verwenden, sollte der **zentrale Toast-Service** genutzt werden!

**Vorteile:**
- ✅ **Weniger Code**: Kein lokaler Alert-State mehr (~35 Zeilen gespart)
- ✅ **Bessere UX**: Non-blocking Toasts
- ✅ **Konsistentes Design**: Einheitliche Benachrichtigungen
- ✅ **Automatisches Schließen**: Zeitbasiert nach 3-5 Sekunden
- ✅ **Zentrale Wartung**: Ein Service für alle Module
- ✅ **Production-Ready**: Bereits in CRM implementiert

**Service-Location:** `src/lib/utils/toast.ts`
**Basiert auf:** `react-hot-toast`

#### Verwendung

```typescript
import { toastService } from '@/lib/utils/toast';

// CREATE
const handleCreate = async (data: any) => {
  try {
    await create[Module].mutateAsync({ organizationId, [module]Data: data });
    toastService.success('Erfolgreich erstellt');
  } catch (error) {
    toastService.error('Fehler beim Erstellen');
  }
};

// DELETE
const handleDelete = async (id: string, name: string) => {
  try {
    await delete[Module].mutateAsync({ id, organizationId });
    toastService.success(`${name} erfolgreich gelöscht`);
  } catch (error) {
    toastService.error('Fehler beim Löschen');
  }
};

// BULK DELETE mit Anzahl
await bulkDelete.mutateAsync({ ids: selectedIds, organizationId });
toastService.success(`${selectedIds.length} Einträge erfolgreich gelöscht`);
```

**Toast-Typen:**
```typescript
toastService.success('Erfolgreich gespeichert');  // 3s, grün
toastService.error('Fehler beim Speichern');     // 5s, rot
toastService.warning('Achtung: Unvollständig');  // 4s, gelb
toastService.info('Hinweis: Wird aktualisiert'); // 4s, blau
```

#### Migration-Checkliste

- [ ] `import { toastService } from '@/lib/utils/toast'` hinzugefügt
- [ ] Alert-State entfernt (`useState<Alert | null>`)
- [ ] showAlert-Funktion entfernt
- [ ] Alert-JSX aus Return entfernt
- [ ] Alle CRUD-Handler mit toastService aktualisiert
- [ ] Bulk-Operations mit Anzahl-Feedback
- [ ] Alert-Component-Import entfernt

**Code-Reduktion:** ~33 Zeilen pro Page

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
└── PreviewSection.tsx (105 Zeilen)
```

**index.tsx Pattern:**
```typescript
import BasicInfoSection from './BasicInfoSection';
import { [Module]FormData } from './types';

export default function [Module]Modal({ isOpen, onClose, mode }: Props) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<[Module]FormData>(initialState);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="3xl">
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      <DialogBody>
        {activeTab === 'basic' && (
          <BasicInfoSection data={formData} onChange={handleFieldChange} />
        )}
      </DialogBody>
    </Dialog>
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

- [ ] Toast-Service statt Alert-Komponente verwendet
- [ ] Inline-Komponenten aus page.tsx entfernt
- [ ] Große Komponenten identifiziert (> 500 Zeilen)
- [ ] Section-Struktur erstellt
- [ ] types.ts für shared types angelegt
- [ ] Backward Compatibility sichergestellt

**Commit:**
```bash
git add .
git commit -m "feat: Phase 2 - Code-Separation & Modularisierung"
```

---

### Phase 3: Performance-Optimierung

**Ziel:** Unnötige Re-Renders vermeiden, Performance verbessern

#### 3.1 useCallback für Handler

```typescript
import { useCallback, useMemo } from 'react';

const handleCreate = useCallback(async (data: any) => {
  await create[Module].mutateAsync({ organizationId, [module]Data: data });
}, [create[Module], organizationId]);

const handleDelete = useCallback(async (id: string) => {
  await delete[Module].mutateAsync({ id, organizationId });
}, [delete[Module], organizationId]);
```

#### 3.2 useMemo für Computed Values

```typescript
// Dropdown-Optionen (statisch)
const categoryOptions = useMemo(() => {
  return CATEGORIES.map(cat => ({ value: cat.id, label: cat.label }));
}, []);

// Gefilterte/Sortierte Daten
const filteredItems = useMemo(() => {
  let result = items;
  if (searchTerm) {
    result = result.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}, [items, searchTerm]);

// Statistiken
const stats = useMemo(() => ({
  total: items.length,
  filtered: filteredItems.length,
  selected: selectedIds.length,
}), [items.length, filteredItems.length, selectedIds.length]);
```

#### 3.3 Debouncing für Search

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// In der Komponente
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms
```

#### 3.4 React.memo für Komponenten

```typescript
import React from 'react';

export default React.memo(function BasicInfoSection({ data, onChange }: Props) {
  return <FieldGroup>{/* ... */}</FieldGroup>;
});
```

#### Checkliste Phase 3

- [ ] useCallback für alle Handler
- [ ] useMemo für Dropdown-Optionen
- [ ] useMemo für gefilterte/sortierte Daten
- [ ] useMemo für Statistiken
- [ ] Debouncing für Search implementiert (300ms)
- [ ] React.memo für Section-Komponenten

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Ziel:** Comprehensive Test Suite mit >80% Coverage

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

**Warum Agent?**
- ✅ **100% Completion Guarantee** - Keine TODOs, keine "analog" Kommentare
- ✅ **Comprehensive Coverage** - Alle Edge Cases abgedeckt
- ✅ **Konsistente Qualität** - Einheitlicher Test-Standard
- ✅ **Zeitersparnis** - Agent erstellt vollständige Test Suite autonom

#### Agent aufrufen

**Schritt 1: Agent starten**
```
Prompt: "Starte refactoring-test Agent für [Module]-Refactoring"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle comprehensive Test Suite für [Module]-Refactoring nach Phase 3.

Context:
- Modul: [Module]
- Hooks: src/lib/hooks/use[Module]Data.ts
- Pages: src/app/dashboard/[module]/page.tsx, [id]/page.tsx
- Components: src/app/dashboard/[module]/components/

Requirements:
- Hook Tests (>80% Coverage)
- Integration Tests (CRUD Flow)
- Component Tests (Shared Components)
- Cleanup alter Tests
- Alle Tests müssen bestehen

Deliverable:
- Test-Suite vollständig implementiert
- Coverage Report (npm run test:coverage)
- Test-Dokumentation
```

**Der Agent wird:**
1. Alle Hook-Tests schreiben (getAll, getById, create, update, delete, bulkDelete)
2. Integration Tests schreiben (CRUD Flow End-to-End)
3. Component Tests schreiben
4. Alte/Redundante Tests entfernen
5. Failing Tests fixen
6. Coverage Report erstellen
7. Test-Dokumentation generieren

**Output:**
- `src/lib/hooks/__tests__/use[Module]Data.test.tsx`
- `src/app/dashboard/[module]/__tests__/integration/[module]-crud-flow.test.tsx`
- `src/app/dashboard/[module]/components/shared/__tests__/*.test.tsx`
- Coverage Report (>80%)
- Test-Dokumentation

#### Checkliste Phase 4

**Wenn Agent verwendet:**
- [ ] refactoring-test Agent aufgerufen
- [ ] Agent hat Test-Suite vollständig erstellt (KEINE TODOs!)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] Test-Dokumentation vorhanden

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (via refactoring-test Agent)"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Ziel:** Vollständige, wartbare Dokumentation

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

**Warum Agent?**
- ✅ **Comprehensive Documentation** - Alle Bereiche vollständig dokumentiert
- ✅ **Konsistenter Standard** - Einheitliche Dokumentationsqualität
- ✅ **Code-Beispiele** - Funktionierende, getestete Beispiele
- ✅ **Automatische Struktur** - README, API, Components, ADR
- ✅ **Zeitersparnis** - Agent erstellt 2.500+ Zeilen autonom

#### Agent aufrufen

**Schritt 1: Agent starten**
```
Prompt: "Starte refactoring-dokumentation Agent für [Module]-Refactoring"
```

**Schritt 2: Agent-Prompt**
```markdown
Erstelle umfassende Dokumentation für [Module]-Refactoring nach Phase 4.

Context:
- Modul: [Module]
- Hooks: src/lib/hooks/use[Module]Data.ts
- Service: src/lib/firebase/[module]-service.ts
- Pages: src/app/dashboard/[module]/page.tsx, [id]/page.tsx
- Components: src/app/dashboard/[module]/components/
- Tests: Comprehensive Test Suite mit >80% Coverage

Requirements:
- README.md (Hauptdokumentation 400+ Zeilen)
- API-Dokumentation (Service-Methoden 800+ Zeilen)
- Komponenten-Dokumentation (Props, Usage 650+ Zeilen)
- ADR-Dokumentation (Entscheidungen 350+ Zeilen)
- Code-Beispiele (funktionierend, getestet)

Deliverable:
- Vollständige Dokumentation (2.500+ Zeilen)
- Funktionierende Code-Beispiele
```

**Der Agent wird:**
1. docs/[module]/ Ordner-Struktur anlegen
2. README.md erstellen (Hauptdokumentation)
3. api/README.md + api/[module]-service.md erstellen
4. components/README.md erstellen
5. adr/README.md erstellen (Architecture Decision Records)
6. Code-Beispiele einbauen
7. Troubleshooting-Guides schreiben

**Output:**
- `docs/[module]/README.md` (400+ Zeilen)
- `docs/[module]/api/[module]-service.md` (800+ Zeilen)
- `docs/[module]/components/README.md` (650+ Zeilen)
- `docs/[module]/adr/README.md` (350+ Zeilen)
- **Gesamt: 2.500+ Zeilen Dokumentation**

#### ADR-Beispiel (verkürzt)

**docs/[module]/adr/README.md:**

```markdown
# Architecture Decision Records - [Module]

## ADR-0001: React Query für State Management

**Status:** Accepted
**Datum:** [Datum]

### Entscheidung
Wir haben uns für **React Query** entschieden.

### Alternativen
1. Redux Toolkit: ❌ Mehr Boilerplate
2. Zustand + SWR: ❌ Weniger Features

### Konsequenzen
✅ Weniger Boilerplate, automatisches Caching
⚠️ Neue Dependency, Team muss lernen
```

#### Checkliste Phase 5

**Wenn Agent verwendet:**
- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Agent hat vollständige Dokumentation erstellt (2.500+ Zeilen)
- [ ] Alle Dateien vorhanden (README, API, Components, ADR)
- [ ] Code-Beispiele funktionieren
- [ ] Alle Links funktionieren

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation (via refactoring-dokumentation Agent)"
```

---

### Phase 6: Production-Ready Code Quality

**Ziel:** Code bereit für Production-Deployment

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit
```

**Häufige Fehler:**
- Missing imports
- Incorrect prop types
- Type mismatches

#### 6.2 ESLint Check

```bash
npx eslint src/app/dashboard/[module] --fix
```

**Zu beheben:**
- Unused imports
- Unused variables
- Missing dependencies in useEffect/useCallback/useMemo
- console.log statements

#### 6.3 Console Cleanup

```bash
grep -r "console\." src/app/dashboard/[module]
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors in catch-blocks
console.error('Failed to load data:', error);
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('data:', data);
```

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

```
✓ Keine Schatten (außer Dropdowns)
✓ Nur Heroicons /24/outline
✓ Zinc-Palette für neutrale Farben
✓ #005fab für Primary Actions
✓ Focus-Rings (focus:ring-2 focus:ring-primary)
```

#### 6.5 Final Build Test

```bash
npm run build
npm run start
```

**Prüfen:**
- Build erfolgreich?
- Keine TypeScript-Errors?
- App startet korrekt?
- [Module] funktioniert im Production-Build?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in [Module]
- [ ] ESLint: 0 Warnings in [Module]
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: App funktioniert

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Ziel:** FINALE Überprüfung ALLER Phasen vor Merge zu Main

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** durchgeführt!

**PROAKTIV:** Agent wird AUTOMATISCH vor Phase 7 (Merge) aufgerufen!

**Warum Agent?**
- ✅ **Comprehensive Check** - Überprüft ALLE Phasen 0-6
- ✅ **Implementation Verification** - Files erstellt UND integriert?
- ✅ **Test Verification** - Tests bestehen UND Coverage >80%?
- ✅ **Code Quality** - TypeScript, ESLint, Build erfolgreich?
- ✅ **Safety Gate** - Verhindert unvollständige Merges

#### Warum Quality Gate?

**Problem ohne Quality Gate:**
- ✅ Dateien erstellt → ❌ ABER nicht integriert
- ✅ Tests geschrieben → ❌ ABER nicht alle bestehen
- ✅ Docs geschrieben → ❌ ABER voller TODOs

**Lösung mit Quality Gate:**
- ✅ **FULL Implementation** - Dateien erstellt UND verwendet
- ✅ **FULL Integration** - Alter Code entfernt, neuer Code integriert
- ✅ **FULL Testing** - Tests bestehen UND Coverage erreicht

#### Agent-Workflow

**Der Agent überprüft:**

**Phase 0/0.5 Checks:**
- [ ] Feature-Branch existiert
- [ ] Backup-Dateien vorhanden
- [ ] Toter Code entfernt

**Phase 1 Checks:**
- [ ] use[Module]Data.ts existiert
- [ ] 6 Hooks implementiert
- [ ] page.tsx verwendet Hooks (KEINE alten loadData!)

**Phase 2 Checks:**
- [ ] Toast-Service verwendet (statt Alert)
- [ ] Große Komponenten aufgeteilt (< 500 Zeilen)
- [ ] Backward Compatibility sichergestellt

**Phase 3 Checks:**
- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] React.memo für Komponenten

**Phase 4 Checks:**
- [ ] Tests existieren
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80%
- [ ] KEINE TODOs in Tests

**Phase 5 Checks:**
- [ ] docs/[module]/ existiert
- [ ] README.md vollständig (>400 Zeilen)
- [ ] API-Docs vollständig (>800 Zeilen)
- [ ] Component-Docs vollständig (>650 Zeilen)
- [ ] ADR-Docs vollständig (>350 Zeilen)
- [ ] KEINE Platzhalter ([TODO], etc.)

**Phase 6 Checks:**
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build erfolgreich

**Integration Checks (KRITISCH!):**
- [ ] Alte Dateien gelöscht
- [ ] Imports aktualisiert (überall)
- [ ] Keine unused Imports/Variables

**Output:**
- Comprehensive Quality Report
- Liste von Problemen (falls vorhanden)
- GO/NO-GO Empfehlung für Merge

#### Checkliste Phase 6.5

- [ ] refactoring-quality-check Agent aufgerufen
- [ ] Quality Report erhalten
- [ ] ALLE Checks bestanden (GO)
- [ ] Falls NO-GO: Probleme behoben und Agent erneut aufgerufen

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden"
```

---

## 🔄 Phase 7: Merge zu Main

**Letzte Phase:** Code zu Main mergen

**⚠️ WICHTIG:** Nur nach erfolgreichem Phase 6.5 Quality Gate Check!

### Workflow

```bash
# 0. VORHER: Phase 6.5 Quality Gate Check erfolgreich?
# → Agent muss "GO" gegeben haben!

# 1. Finaler Commit (falls noch Änderungen)
git add .
git commit -m "chore: Finaler Cleanup vor Merge"

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

- [ ] ⭐ Phase 6.5 Quality Gate Check bestanden (GO)
- [ ] Alle 8 Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

---

## 📝 Checkliste: Gesamtes Refactoring

### Vorbereitung (Phase 0)
- [ ] Feature-Branch erstellt
- [ ] Backups angelegt
- [ ] Ist-Zustand dokumentiert

### Phase 0.5: Pre-Refactoring Cleanup
- [ ] TODO-Kommentare entfernt
- [ ] Debug-Console-Logs entfernt
- [ ] Deprecated Functions entfernt
- [ ] Unused State entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt

### Phase 1: React Query
- [ ] Custom Hooks erstellt (6 Hooks)
- [ ] page.tsx umgestellt
- [ ] [id]/page.tsx umgestellt
- [ ] Alte loadData/useEffect entfernt

### Phase 2: Modularisierung
- [ ] Toast-Service verwendet (statt Alert)
- [ ] Inline-Komponenten entfernt
- [ ] Große Komponenten aufgeteilt
- [ ] Section-Struktur erstellt
- [ ] Backward Compatibility sichergestellt

### Phase 3: Performance
- [ ] useCallback für Handler
- [ ] useMemo für Computed Values
- [ ] Debouncing implementiert
- [ ] React.memo für Komponenten

### Phase 4: Testing ⭐ AGENT
- [ ] refactoring-test Agent aufgerufen
- [ ] Hook-Tests (100% implementiert)
- [ ] Integration-Tests (vollständig)
- [ ] Component-Tests (KEINE TODOs)
- [ ] Alle Tests bestehen
- [ ] Coverage >80%

### Phase 5: Dokumentation ⭐ AGENT
- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] README.md (400+ Zeilen, vollständig)
- [ ] API-Docs (800+ Zeilen, vollständig)
- [ ] Component-Docs (650+ Zeilen, vollständig)
- [ ] ADR-Docs (350+ Zeilen, vollständig)
- [ ] Keine Platzhalter

### Phase 6: Code Quality
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Console-Cleanup
- [ ] Design System Compliance
- [ ] Build erfolgreich

### Phase 6.5: Quality Gate ⭐ AGENT
- [ ] refactoring-quality-check Agent aufgerufen
- [ ] ALLE Phasen überprüft
- [ ] Integration Checks bestanden
- [ ] GO-Empfehlung erhalten

### Phase 7: Merge
- [ ] Phase 6.5 Quality Gate bestanden (GO)
- [ ] Feature-Branch gepushed
- [ ] Main gemerged
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

---

## 🚀 Nächste Schritte nach Refactoring

1. **Team-Demo:** Features und neue Architektur vorstellen
2. **Monitoring:** Performance-Metriken aufsetzen
3. **User-Feedback:** Sammeln und iterieren
4. **Weitere Module:** Template für andere Module anwenden

---

**Version:** 2.1 (Kompakt)
**Basiert auf:** Projects-Module Refactoring (Oktober 2025)
**Kompakt-Version erstellt:** November 2025

**Changelog:**
- **v2.1 (November 2025):** Kompakte Version erstellt (50% Reduktion)
  - Code-Beispiele auf essentials reduziert
  - Detaillierte Templates entfernt (Agents erstellen diese)
  - Fokus auf Workflow und Checklisten
  - Alle wichtigen Entscheidungspunkte beibehalten

- **v2.0 (November 2025):** Agent-Workflow Integration
  - Phase 4, 5, 6.5 mit Agents
  - Toast-Service Richtlinien erweitert

- **v1.1 (Oktober 2025):** Phase 0.5 Cleanup hinzugefügt

- **v1.0 (Oktober 2025):** Initial Template

---

*Dieses Template ist ein lebendes Dokument. Feedback willkommen!*

**Wichtige Hinweise:**
- ⭐ **Agent-Workflow ist EMPFOHLEN** für Phase 4, 5 und 6.5
- ⭐ **Phase 6.5 ist OBLIGATORISCH** vor Merge zu Main
- ⭐ **toastService ist STANDARD** für Feedback-Messages
