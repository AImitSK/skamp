# Phase 0.2: MarkPublishedModal & EditClippingModal Refactoring

**Version:** 1.0
**Erstellt:** 2025-11-17
**Modul:** Shared Monitoring Modals
**Status:** 🚧 IN ARBEIT
**Template:** `docs/templates/module-refactoring-template.md` v2.1

---

## 📋 Übersicht

Refactoring der beiden zentralen Monitoring-Modals:
- **MarkPublishedModal** (368 Zeilen) - Artikel als veröffentlicht markieren
- **EditClippingModal** (240 Zeilen) - Veröffentlichung bearbeiten

**Scope:** Shared Components (Phase 0 der Monitoring-Refactoring-Checkliste)

**Ziel:** Production-Ready, performante, gut getestete Modals mit konsistentem UX

---

## 🎯 Ziele

- [x] ✅ Toast-Service statt Error-Dialoge (ABGESCHLOSSEN)
- [x] ✅ Design-Verbesserungen (Modal breiter, 2-spaltig) (ABGESCHLOSSEN)
- [ ] React Query für Mutations verwenden
- [ ] Multi-Step-Form modularisieren (MarkPublishedModal)
- [ ] Performance-Optimierungen (useCallback, useMemo, React.memo)
- [ ] Test-Coverage >80%
- [ ] Vollständige Dokumentation

---

## 📊 IST-ZUSTAND (vor Refactoring)

### MarkPublishedModal.tsx
- **Zeilen:** 393 → 368 (nach Toast-Integration & Design)
- **Komplexität:** HOCH
- **Probleme:**
  - ❌ Multi-Step-Form inline
  - ❌ PublicationSelector-Integration komplex
  - ❌ Keine React Query Mutations
  - ❌ Keine Performance-Optimierungen
  - ❌ Keine Tests

### EditClippingModal.tsx
- **Zeilen:** 262 → 240 (nach Toast-Integration & Design)
- **Komplexität:** MITTEL
- **Probleme:**
  - ❌ Keine React Query Mutations
  - ❌ Keine Performance-Optimierungen
  - ❌ Keine Tests

### Bereits durchgeführt ✅
1. **Toast-Integration** (17. Nov 2025)
   - toastService import hinzugefügt
   - Success-Toast nach erfolgreichem Speichern
   - Error-Toast statt Error-Dialog
   - Error-State und Error-Dialog entfernt
   - **Code-Reduktion:** -25 Zeilen (MarkPublished), -22 Zeilen (EditClipping)

2. **Design-Verbesserungen** (17. Nov 2025)
   - Modal breiter gemacht (size="3xl")
   - Felder 2-spaltig umorganisiert:
     - Artikel-URL & Artikel-Titel
     - Medium/Outlet & Medientyp
     - Veröffentlichungsdatum & Reichweite
   - Notizen-Feld entfernt
   - publicationNotes aus State und Logic entfernt

---

## 🚀 Die 8 Phasen

### Phase 0: Vorbereitung & Setup

**Status:** ✅ ABGESCHLOSSEN

#### Aufgaben

- [x] Feature-Branch erstellt
  ```bash
  # Branch bereits vorhanden: main
  # Kein separater Branch nötig - direkte Commits auf main
  ```

- [x] Ist-Zustand dokumentiert
  - MarkPublishedModal: 393 Zeilen (vor Toast), 368 Zeilen (aktuell)
  - EditClippingModal: 262 Zeilen (vor Toast), 240 Zeilen (aktuell)
  - Gesamt: 655 → 608 Zeilen (-47 Zeilen / -7.2%)

- [x] Backup-Dateien (nicht nötig - Git History ausreichend)

- [x] Dependencies geprüft
  - ✅ React Query installiert (`@tanstack/react-query`)
  - ✅ Testing Libraries vorhanden
  - ✅ TypeScript korrekt konfiguriert
  - ✅ react-hot-toast installiert (Toast-Service)

#### Deliverable

- ✅ Dokumentation des Ist-Zustands
- ✅ Dependencies geprüft

**Commit:** Nicht nötig (bereits im Git)

---

### Phase 0.5: Pre-Refactoring Cleanup

**Status:** ⏳ GEPLANT

**Dauer:** 1 Stunde

#### Cleanup-Schritte

**1. TODOs finden & entfernen**
```bash
grep -rn "TODO:" src/components/monitoring/MarkPublishedModal.tsx
grep -rn "TODO:" src/components/monitoring/EditClippingModal.tsx
```
- [ ] Alle TODO-Kommentare durchgehen
- [ ] Umsetzen oder entfernen

**2. Console-Logs entfernen**
```bash
grep -rn "console\." src/components/monitoring/MarkPublishedModal.tsx
grep -rn "console\." src/components/monitoring/EditClippingModal.tsx
```
- [ ] Debug-Logs entfernen (console.log)
- [ ] Nur console.error() in catch-blocks behalten

**3. Unused State entfernen**
- [ ] Alle useState-Deklarationen durchgehen
- [ ] Unused States identifizieren und entfernen

**4. Kommentierte Code-Blöcke löschen**
- [ ] Auskommentierte Code-Blöcke identifizieren
- [ ] Code-Blöcke vollständig löschen

**5. ESLint Auto-Fix**
```bash
npx eslint src/components/monitoring/MarkPublishedModal.tsx --fix
npx eslint src/components/monitoring/EditClippingModal.tsx --fix
```
- [ ] ESLint mit --fix ausführen
- [ ] Manuelle Fixes für verbleibende Warnings

**6. Manueller Test**
```bash
npm run dev
```
- [ ] Dev-Server starten
- [ ] Beide Modals manuell testen
- [ ] Keine Console-Errors

#### Checkliste Phase 0.5

- [ ] TODO-Kommentare entfernt
- [ ] Debug-Console-Logs entfernt
- [ ] Unused State-Variablen entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt
- [ ] Code funktioniert noch

**Commit:**
```bash
git add .
git commit -m "chore: Phase 0.5 - Pre-Refactoring Cleanup (Modals)

- TODO-Kommentare entfernt
- Debug-Console-Logs entfernt
- Unused State entfernt
- Unused imports entfernt via ESLint

MarkPublishedModal.tsx: X → Y Zeilen
EditClippingModal.tsx: X → Y Zeilen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 1: React Query Integration

**Status:** ⏳ GEPLANT

**Ziel:** Mutations mit React Query für optimistische Updates und besseres Error Handling

#### 1.1 Custom Hooks erstellen

**Datei:** `src/lib/hooks/useMonitoringMutations.ts`

**Mutations:**
1. `useMarkAsPublished()` - MarkPublishedModal
2. `useUpdateClipping()` - EditClippingModal

**Pattern:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clippingService } from '@/lib/firebase/clipping-service';
import { toastService } from '@/lib/utils/toast';

export function useMarkAsPublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MarkAsPublishedData) => {
      // 1. Create Clipping
      const clippingId = await clippingService.create(data.clipping, {
        organizationId: data.organizationId
      });

      // 2. Update Send
      await updateSend(data.sendId, {
        publishedStatus: 'published',
        clippingId,
        // ...
      });

      return clippingId;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['clippings'] });
      queryClient.invalidateQueries({ queryKey: ['sends'] });
      toastService.success('Erfolgreich als veröffentlicht markiert');
    },
    onError: (error) => {
      toastService.error(error.message || 'Fehler beim Speichern');
    }
  });
}

export function useUpdateClipping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateClippingData) => {
      // 1. Update Clipping
      await clippingService.update(data.clippingId, data.clipping, {
        organizationId: data.organizationId
      });

      // 2. Update Send
      await updateSend(data.sendId, data.sendUpdate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clippings'] });
      queryClient.invalidateQueries({ queryKey: ['sends'] });
      toastService.success('Veröffentlichung erfolgreich aktualisiert');
    },
    onError: (error) => {
      toastService.error(error.message || 'Fehler beim Speichern');
    }
  });
}
```

#### 1.2 Modals anpassen

**MarkPublishedModal.tsx:**
```typescript
import { useMarkAsPublished } from '@/lib/hooks/useMonitoringMutations';

export function MarkPublishedModal({ send, campaignId, onClose, onSuccess }: Props) {
  const markAsPublished = useMarkAsPublished();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await markAsPublished.mutateAsync({
        organizationId,
        sendId: send.id,
        campaignId,
        clipping: { /* ... */ },
        sendUpdate: { /* ... */ }
      });
      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  return (
    <Dialog>
      <form onSubmit={handleSubmit}>
        {/* ... */}
        <Button type="submit" disabled={markAsPublished.isPending}>
          {markAsPublished.isPending ? 'Speichern...' : 'Speichern'}
        </Button>
      </form>
    </Dialog>
  );
}
```

**EditClippingModal.tsx:**
```typescript
import { useUpdateClipping } from '@/lib/hooks/useMonitoringMutations';

export function EditClippingModal({ send, clipping, onClose, onSuccess }: Props) {
  const updateClipping = useUpdateClipping();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateClipping.mutateAsync({
        organizationId,
        clippingId: clipping.id,
        sendId: send.id,
        clipping: { /* ... */ },
        sendUpdate: { /* ... */ }
      });
      onSuccess();
    } catch (error) {
      // Error already handled by mutation
    }
  };

  // ... analog zu MarkPublishedModal
}
```

#### Checkliste Phase 1

- [ ] Hooks-Datei erstellt (`useMonitoringMutations.ts`)
- [ ] 2 Mutations implementiert (markAsPublished, updateClipping)
- [ ] MarkPublishedModal auf React Query umgestellt
- [ ] EditClippingModal auf React Query umgestellt
- [ ] Toast-Service in Mutations integriert
- [ ] Query-Invalidierung korrekt
- [ ] TypeScript-Fehler behoben
- [ ] Manuelle Tests durchgeführt

**Commit:**
```bash
git add .
git commit -m "feat: Phase 1 - React Query Mutations für Monitoring-Modals

- useMonitoringMutations Hook erstellt
- useMarkAsPublished() Mutation
- useUpdateClipping() Mutation
- Modals auf React Query umgestellt
- Toast-Service integriert
- Query-Invalidierung implementiert

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 2: Code-Separation & Modularisierung

**Status:** ⏳ GEPLANT

**Ziel:** Multi-Step-Form in MarkPublishedModal modularisieren

#### 2.1 Toast-Service ✅

**Status:** ✅ BEREITS DURCHGEFÜHRT (17. Nov 2025)

- [x] toastService import hinzugefügt
- [x] Success-Toast implementiert
- [x] Error-Toast implementiert
- [x] Error-Dialog entfernt
- [x] Error-State entfernt

**Code-Reduktion:** -13 Zeilen (MarkPublished), -9 Zeilen (EditClipping)

#### 2.2 MarkPublishedModal modularisieren

**Problem:** MarkPublishedModal ist komplex (368 Zeilen) mit:
- PublicationSelector-Integration
- Bedingtes Rendering (selectedPublication vs. nicht)
- AVE-Berechnung
- Sentiment-Score-Slider

**Lösung:** Multi-Step-Form in Sections aufteilen (OPTIONAL - nur wenn > 500 Zeilen)

**Entscheidung:** ❌ NICHT NÖTIG
- MarkPublishedModal: 368 Zeilen (< 500 Zeilen Schwellwert)
- EditClippingModal: 240 Zeilen (< 500 Zeilen Schwellwert)
- Beide Modals sind gut strukturiert und verständlich

**Alternative:** Kleinere Verbesserungen:
- [ ] AVE-Berechnung in useEffect extrahieren (bereits vorhanden)
- [ ] calculateAVE Utility verwenden (bereits vorhanden)
- [ ] PublicationSelector gut gekapselt (bleibt so)

#### Checkliste Phase 2

- [x] Toast-Service verwendet (bereits erledigt)
- [x] Design-Verbesserungen (bereits erledigt)
- [ ] Keine weitere Modularisierung nötig (< 500 Zeilen)

**Commit:** Nicht nötig (Phase bereits abgeschlossen in früheren Commits)

---

### Phase 3: Performance-Optimierung

**Status:** ⏳ GEPLANT

**Ziel:** Unnötige Re-Renders vermeiden

#### 3.1 useCallback für Handler

**MarkPublishedModal:**
```typescript
const handlePublicationSelect = useCallback((publication: MatchedPublication | null) => {
  setSelectedPublication(publication);
  if (publication) {
    const reach = getReachFromPublication(publication);
    setFormData(prev => ({
      ...prev,
      outletName: publication.name,
      outletType: publication.type,
      reach: reach ? reach.toString() : prev.reach
    }));
  }
}, []);

const handleDataLoad = useCallback((data: PublicationLookupResult) => {
  setLookupData(data);
}, []);

const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  // ... (React Query Mutation)
}, [markAsPublished, user, currentOrganization, formData, /* ... */]);
```

**EditClippingModal:**
```typescript
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  // ... (React Query Mutation)
}, [updateClipping, user, currentOrganization, formData, /* ... */]);
```

#### 3.2 useMemo für Computed Values

**MarkPublishedModal:**
```typescript
// AVE-Berechnung bereits in useEffect (gut!)
// Aber: useMemo statt useEffect verwenden
const calculatedAVE = useMemo(() => {
  if (formData.reach && formData.sentiment) {
    return calculateAVE(
      parseInt(formData.reach),
      formData.sentiment,
      formData.outletType
    );
  }
  return 0;
}, [formData.reach, formData.sentiment, formData.outletType]);
```

#### 3.3 React.memo für Komponenten

**PublicationSelector ist bereits eine eigene Komponente**
- [ ] React.memo für PublicationSelector prüfen (falls viele Re-Renders)

**MarkPublishedModal & EditClippingModal:**
- [ ] React.memo NICHT verwenden (Root-Komponenten, immer re-render wenn Dialog öffnet)

#### Checkliste Phase 3

- [ ] useCallback für handlePublicationSelect
- [ ] useCallback für handleDataLoad
- [ ] useCallback für handleSubmit (beide Modals)
- [ ] useMemo für calculatedAVE (statt useEffect)
- [ ] PublicationSelector Performance geprüft
- [ ] Manuelle Tests (keine Performance-Regression)

**Commit:**
```bash
git add .
git commit -m "feat: Phase 3 - Performance-Optimierung (Monitoring-Modals)

- useCallback für Handler
- useMemo für AVE-Berechnung
- PublicationSelector Performance geprüft

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 4: Testing ⭐ AGENT-WORKFLOW

**Status:** ⏳ GEPLANT

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-test Agent** durchgeführt!

#### Agent aufrufen

**Prompt:**
```markdown
Starte refactoring-test Agent für Monitoring-Modals Refactoring.

Erstelle comprehensive Test Suite für MarkPublishedModal & EditClippingModal nach Phase 3.

Context:
- Modals: src/components/monitoring/MarkPublishedModal.tsx, EditClippingModal.tsx
- Hooks: src/lib/hooks/useMonitoringMutations.ts
- Services: src/lib/firebase/clipping-service.ts

Requirements:
- Hook Tests (useMonitoringMutations - 2 Mutations)
- Component Tests (MarkPublishedModal, EditClippingModal)
- Integration Tests (Modal → Mutation → Service)
- Edge Cases (Fehlerbehandlung, Validierung)
- Cleanup alter Tests (falls vorhanden)
- Alle Tests müssen bestehen
- Coverage >80%

Deliverable:
- Test-Suite vollständig implementiert
- Coverage Report (npm run test:coverage)
- KEINE TODOs, KEINE "analog" Kommentare
```

**Der Agent wird:**
1. Hook-Tests schreiben (useMarkAsPublished, useUpdateClipping)
2. Component-Tests schreiben (Rendering, Formular-Validierung, Submit)
3. Integration-Tests schreiben (Modal → Mutation → Toast)
4. Edge-Cases testen (Fehler, fehlende Permissions, etc.)
5. Alte/Redundante Tests entfernen
6. Failing Tests fixen
7. Coverage Report erstellen

**Output:**
- `src/lib/hooks/__tests__/useMonitoringMutations.test.tsx`
- `src/components/monitoring/__tests__/MarkPublishedModal.test.tsx`
- `src/components/monitoring/__tests__/EditClippingModal.test.tsx`
- Coverage Report (>80%)

#### Checkliste Phase 4

- [ ] refactoring-test Agent aufgerufen
- [ ] Agent hat Test-Suite vollständig erstellt (KEINE TODOs!)
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80% (npm run test:coverage)
- [ ] Test-Dokumentation vorhanden

**Commit:**
```bash
git add .
git commit -m "test: Phase 4 - Comprehensive Test Suite (Monitoring-Modals)

via refactoring-test Agent:
- Hook-Tests (useMonitoringMutations)
- Component-Tests (MarkPublishedModal, EditClippingModal)
- Integration-Tests (Modal → Mutation → Service)
- Edge-Cases vollständig getestet
- Coverage: >80%

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 5: Dokumentation ⭐ AGENT-WORKFLOW

**Status:** ⏳ GEPLANT

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-dokumentation Agent** durchgeführt!

#### Agent aufrufen

**Prompt:**
```markdown
Starte refactoring-dokumentation Agent für Monitoring-Modals Refactoring.

Erstelle umfassende Dokumentation für MarkPublishedModal & EditClippingModal nach Phase 4.

Context:
- Modals: src/components/monitoring/MarkPublishedModal.tsx (368 Zeilen), EditClippingModal.tsx (240 Zeilen)
- Hooks: src/lib/hooks/useMonitoringMutations.ts
- Services: src/lib/firebase/clipping-service.ts
- Tests: Comprehensive Test Suite mit >80% Coverage

Requirements:
- README.md (Hauptdokumentation 200+ Zeilen)
- API-Dokumentation (Hook-Methoden 150+ Zeilen)
- Komponenten-Dokumentation (Props, Usage 250+ Zeilen)
- ADR-Dokumentation (Entscheidungen 150+ Zeilen)
- Code-Beispiele (funktionierend, getestet)

Deliverable:
- Vollständige Dokumentation (750+ Zeilen)
- Funktionierende Code-Beispiele
- KEINE Platzhalter
```

**Der Agent wird:**
1. `docs/monitoring/modals/` Ordner-Struktur anlegen
2. README.md erstellen (Hauptdokumentation)
3. api/useMonitoringMutations.md erstellen
4. components/README.md erstellen (beide Modals)
5. adr/README.md erstellen (Toast-Service, React Query, Design)
6. Code-Beispiele einbauen
7. Troubleshooting-Guide schreiben

**Output:**
- `docs/monitoring/modals/README.md` (200+ Zeilen)
- `docs/monitoring/modals/api/useMonitoringMutations.md` (150+ Zeilen)
- `docs/monitoring/modals/components/README.md` (250+ Zeilen)
- `docs/monitoring/modals/adr/README.md` (150+ Zeilen)
- **Gesamt: 750+ Zeilen Dokumentation**

#### Checkliste Phase 5

- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] Agent hat vollständige Dokumentation erstellt (750+ Zeilen)
- [ ] Alle Dateien vorhanden (README, API, Components, ADR)
- [ ] Code-Beispiele funktionieren
- [ ] Alle Links funktionieren
- [ ] KEINE Platzhalter

**Commit:**
```bash
git add .
git commit -m "docs: Phase 5 - Vollständige Dokumentation (Monitoring-Modals)

via refactoring-dokumentation Agent:
- README.md (Hauptdokumentation)
- API-Dokumentation (useMonitoringMutations)
- Komponenten-Dokumentation (beide Modals)
- ADR-Dokumentation (Entscheidungen)
- Gesamt: 750+ Zeilen

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6: Production-Ready Code Quality

**Status:** ⏳ GEPLANT

#### 6.1 TypeScript Check

```bash
npx tsc --noEmit src/components/monitoring/MarkPublishedModal.tsx
npx tsc --noEmit src/components/monitoring/EditClippingModal.tsx
npx tsc --noEmit src/lib/hooks/useMonitoringMutations.ts
```

**Zu beheben:**
- [ ] Type-Fehler in Modals
- [ ] Type-Fehler in Hooks
- [ ] Missing imports

#### 6.2 ESLint Check

```bash
npx eslint src/components/monitoring/MarkPublishedModal.tsx --fix
npx eslint src/components/monitoring/EditClippingModal.tsx --fix
npx eslint src/lib/hooks/useMonitoringMutations.ts --fix
```

**Zu beheben:**
- [ ] Unused imports
- [ ] Unused variables
- [ ] Missing dependencies in useCallback/useMemo
- [ ] console.log statements

#### 6.3 Console Cleanup

```bash
grep -r "console\." src/components/monitoring/MarkPublishedModal.tsx
grep -r "console\." src/components/monitoring/EditClippingModal.tsx
```

**Erlaubt:**
```typescript
// ✅ Production-relevante Errors in catch-blocks
console.error('Fehler beim Markieren als veröffentlicht:', error);
```

**Zu entfernen:**
```typescript
// ❌ Debug-Logs
console.log('formData:', formData);
```

#### 6.4 Design System Compliance

**Prüfen gegen:** `docs/design-system/DESIGN_SYSTEM.md`

- [x] ✅ Keine Schatten (außer Dropdowns) - bereits compliant
- [x] ✅ Nur Heroicons /24/outline - bereits compliant
- [x] ✅ Zinc-Palette für neutrale Farben - bereits compliant
- [x] ✅ #005fab für Primary Actions - bereits compliant
- [ ] Focus-Rings prüfen (focus:ring-2 focus:ring-primary)

#### 6.5 Final Build Test

```bash
npm run build
npm run start
```

**Prüfen:**
- [ ] Build erfolgreich?
- [ ] Keine TypeScript-Errors?
- [ ] App startet korrekt?
- [ ] Modals funktionieren im Production-Build?

#### Checkliste Phase 6

- [ ] TypeScript: 0 Fehler in Modals & Hooks
- [ ] ESLint: 0 Warnings in Modals & Hooks
- [ ] Console-Cleanup: Nur production-relevante Logs
- [ ] Design System: Vollständig compliant
- [ ] Build: Erfolgreich
- [ ] Production-Test: Modals funktionieren

**Commit:**
```bash
git add .
git commit -m "chore: Phase 6 - Production-Ready Code Quality (Monitoring-Modals)

- TypeScript: 0 Fehler
- ESLint: 0 Warnings
- Console-Cleanup durchgeführt
- Design System: Vollständig compliant
- Build: Erfolgreich

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Phase 6.5: Quality Gate Check ⭐ AGENT-WORKFLOW

**Status:** ⏳ GEPLANT

**🤖 WICHTIG:** Diese Phase wird vom **refactoring-quality-check Agent** durchgeführt!

**PROAKTIV:** Agent wird AUTOMATISCH vor Phase 7 (Merge) aufgerufen!

#### Agent-Workflow

**Der Agent überprüft:**

**Phase 0/0.5 Checks:**
- [x] Ist-Zustand dokumentiert
- [ ] Toter Code entfernt

**Phase 1 Checks:**
- [ ] useMonitoringMutations.ts existiert
- [ ] 2 Mutations implementiert (markAsPublished, updateClipping)
- [ ] Modals verwenden Hooks (KEINE alten try-catch inline!)

**Phase 2 Checks:**
- [x] Toast-Service verwendet (statt Alert)
- [x] Design-Verbesserungen implementiert

**Phase 3 Checks:**
- [ ] useCallback für Handler
- [ ] useMemo für Computed Values

**Phase 4 Checks:**
- [ ] Tests existieren
- [ ] Alle Tests bestehen (npm test)
- [ ] Coverage >80%
- [ ] KEINE TODOs in Tests

**Phase 5 Checks:**
- [ ] docs/monitoring/modals/ existiert
- [ ] README.md vollständig (>200 Zeilen)
- [ ] API-Docs vollständig (>150 Zeilen)
- [ ] Component-Docs vollständig (>250 Zeilen)
- [ ] ADR-Docs vollständig (>150 Zeilen)
- [ ] KEINE Platzhalter

**Phase 6 Checks:**
- [ ] TypeScript: 0 Fehler
- [ ] ESLint: 0 Warnings
- [ ] Build erfolgreich

**Integration Checks:**
- [ ] Modals in RecipientTrackingList integriert
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
git commit -m "chore: Phase 6.5 - Quality Gate Check bestanden (Monitoring-Modals)

via refactoring-quality-check Agent:
- Alle Phasen 0-6 überprüft
- Integration Checks bestanden
- GO-Empfehlung erhalten

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🔄 Phase 7: Merge zu Main

**Status:** ⏳ GEPLANT

**⚠️ WICHTIG:** Nur nach erfolgreichem Phase 6.5 Quality Gate Check!

### Workflow

```bash
# 0. VORHER: Phase 6.5 Quality Gate Check erfolgreich?
# → Agent muss "GO" gegeben haben!

# 1. Finaler Commit (falls noch Änderungen)
git add .
git commit -m "chore: Finaler Cleanup vor Merge (Monitoring-Modals)"

# 2. Push zu Main
git push origin main

# 3. Tests auf Main
npm test -- monitoring
```

### Checkliste Merge

- [ ] ⭐ Phase 6.5 Quality Gate Check bestanden (GO)
- [ ] Alle 8 Phasen abgeschlossen
- [ ] Alle Tests bestehen
- [ ] Dokumentation vollständig
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

---

## 📝 Checkliste: Gesamtes Refactoring

### Vorbereitung (Phase 0)
- [x] ✅ Ist-Zustand dokumentiert
- [x] ✅ Dependencies geprüft

### Phase 0.5: Pre-Refactoring Cleanup
- [ ] TODO-Kommentare entfernt
- [ ] Debug-Console-Logs entfernt
- [ ] Unused State entfernt
- [ ] Kommentierte Code-Blöcke gelöscht
- [ ] ESLint Auto-Fix durchgeführt
- [ ] Manueller Test durchgeführt

### Phase 1: React Query
- [ ] Custom Hooks erstellt (2 Mutations)
- [ ] MarkPublishedModal umgestellt
- [ ] EditClippingModal umgestellt
- [ ] Toast-Service in Mutations integriert

### Phase 2: Modularisierung
- [x] ✅ Toast-Service verwendet (bereits erledigt)
- [x] ✅ Design-Verbesserungen (bereits erledigt)
- [x] ✅ Keine weitere Modularisierung nötig

### Phase 3: Performance
- [ ] useCallback für Handler
- [ ] useMemo für AVE-Berechnung
- [ ] PublicationSelector Performance geprüft

### Phase 4: Testing ⭐ AGENT
- [ ] refactoring-test Agent aufgerufen
- [ ] Hook-Tests (100% implementiert)
- [ ] Component-Tests (KEINE TODOs)
- [ ] Integration-Tests (vollständig)
- [ ] Alle Tests bestehen
- [ ] Coverage >80%

### Phase 5: Dokumentation ⭐ AGENT
- [ ] refactoring-dokumentation Agent aufgerufen
- [ ] README.md (200+ Zeilen, vollständig)
- [ ] API-Docs (150+ Zeilen, vollständig)
- [ ] Component-Docs (250+ Zeilen, vollständig)
- [ ] ADR-Docs (150+ Zeilen, vollständig)
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
- [ ] Main gepushed
- [ ] Tests auf Main bestanden

---

## 📊 Metriken & Ergebnisse

### Code-Reduktion (bisher)

| Komponente | Vorher | Nach Toast+Design | Ziel (nach Phase 3) | Ersparnis |
|------------|--------|-------------------|---------------------|-----------|
| **MarkPublishedModal** | 393 | 368 | ~330 | -63 (-16%) |
| **EditClippingModal** | 262 | 240 | ~220 | -42 (-16%) |
| **GESAMT** | **655** | **608** | **~550** | **-105 (-16%)** |

### Bereits erreicht ✅

**Toast-Integration (17. Nov 2025):**
- Code-Reduktion: -47 Zeilen (-7.2%)
- Error-Dialog entfernt (beide Modals)
- Success-Feedback hinzugefügt
- Konsistente UX mit Rest der App

**Design-Verbesserungen (17. Nov 2025):**
- Modal breiter (size="3xl")
- 2-spaltige Felder (3 Gruppen)
- Notizen-Feld entfernt
- publicationNotes aus State/Logic entfernt

### Noch zu erreichen

**Phase 1-3:**
- React Query Mutations
- Performance-Optimierungen
- **Geschätzte Code-Reduktion:** -50 Zeilen

**Phase 4-5:**
- Comprehensive Tests (>80% Coverage)
- Vollständige Dokumentation (750+ Zeilen)

---

## 🔗 Referenzen

### Projekt-Spezifisch
- **Master-Checkliste:** `docs/planning/monitoring/monitoring-refactoring-master-checklist.md`
- **Design System:** `docs/design-system/DESIGN_SYSTEM.md`
- **Template:** `docs/templates/module-refactoring-template.md`

### Verwandte Komponenten
- **PublicationSelector:** `src/components/monitoring/PublicationSelector.tsx`
- **RecipientTrackingList:** `src/components/monitoring/RecipientTrackingList.tsx`
- **ClippingService:** `src/lib/firebase/clipping-service.ts`

---

## 🚀 Nächste Schritte

1. **Phase 0.5:** Pre-Refactoring Cleanup
2. **Phase 1:** React Query Mutations implementieren
3. **Phase 3:** Performance-Optimierungen
4. **Phase 4:** Agent für Tests aufrufen
5. **Phase 5:** Agent für Dokumentation aufrufen
6. **Phase 6:** Code Quality prüfen
7. **Phase 6.5:** Agent für Quality Gate aufrufen
8. **Phase 7:** Merge zu Main

---

**Version:** 1.0
**Erstellt:** 2025-11-17
**Zuletzt aktualisiert:** 2025-11-17

**Changelog:**
- **2025-11-17:** Initial Plan erstellt
  - IST-Zustand dokumentiert (655 → 608 Zeilen)
  - Toast-Integration & Design-Verbesserungen als abgeschlossen markiert
  - 8 Phasen definiert
  - Agent-Workflow für Phase 4, 5, 6.5 geplant
  - Geschätzte Code-Reduktion: -16%
