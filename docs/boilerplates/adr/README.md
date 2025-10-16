# Architecture Decision Records (ADR)

**Modul:** Boilerplates
**Version:** 1.0
**Letzte Aktualisierung:** 16. Oktober 2025

---

## 📋 Übersicht

Architecture Decision Records (ADRs) dokumentieren wichtige Architektur-Entscheidungen, die während der Entwicklung und des Refactorings des Boilerplates-Moduls getroffen wurden.

### Was ist ein ADR?

Ein ADR dokumentiert:
- **Kontext:** Die Situation und das Problem
- **Entscheidung:** Die getroffene Wahl
- **Alternativen:** Andere betrachtete Optionen
- **Konsequenzen:** Vor- und Nachteile der Entscheidung
- **Status:** Aktiv, Überholt, Verworfen

---

## 📚 ADR-Index

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| ADR-0001 | React Query vs. Redux | ✅ Aktiv | 16. Oktober 2025 |
| ADR-0002 | Tiptap Editor für Textbausteine | ✅ Aktiv | 16. Oktober 2025 |
| ADR-0003 | Toast-Service vs. Inline Alerts | ✅ Aktiv | 16. Oktober 2025 |
| ADR-0004 | Keine Modularisierung bei 400 Zeilen | ✅ Aktiv | 16. Oktober 2025 |

---

## ADR-0001: React Query vs. Redux

**Status:** ✅ Aktiv
**Datum:** 16. Oktober 2025
**Entscheider:** Development Team

### Kontext

Das Boilerplates-Modul benötigte eine State-Management-Lösung für Server-Daten (Boilerplates aus Firestore). Die vorhandene Implementierung nutzte `useState` + `useEffect` für manuelles State Management.

**Probleme der alten Lösung:**
- Kein Caching
- Manuelles Error Handling
- Manuelles Loading State Management
- Re-Fetching bei jedem Component Mount
- Keine automatische Cache-Invalidierung

**Anforderungen:**
- Automatisches Caching
- Optimistic Updates
- Error & Loading States
- Automatische Cache-Invalidierung bei Mutations
- Wiederverwendbare Hooks
- Performance-Optimierung

### Entscheidung

**Wir verwenden React Query (TanStack Query) für Server State Management.**

### Alternativen

#### 1. Redux + RTK Query
**Vorteile:**
- Etabliertes Ökosystem
- Gute DevTools
- Zentraler Store

**Nachteile:**
- Höhere Komplexität (Actions, Reducers, Slices)
- Mehr Boilerplate-Code
- Overhead für einfaches Daten-Fetching
- Nicht spezialisiert auf Server State

#### 2. SWR (Vercel)
**Vorteile:**
- Sehr einfache API
- Ähnlich wie React Query
- Gute Performance

**Nachteile:**
- Weniger Features als React Query
- Kleinere Community
- Weniger Mutation-Utilities

#### 3. Zustand + Custom Hooks
**Vorteile:**
- Minimale Bundle-Size
- Sehr flexibel

**Nachteile:**
- Viel Custom Code nötig
- Kein eingebautes Caching
- Kein Error/Loading State Management

### Gründe für React Query

1. **Spezialisiert auf Server State**
   - Designed für Daten-Fetching aus APIs
   - Automatisches Caching out-of-the-box

2. **Automatische Cache-Invalidierung**
   - Mutations invalidieren automatisch Queries
   - Keine manuellen Refreshes nötig

3. **Hervorragende Developer Experience**
   - Wiederverwendbare Hooks
   - React Query DevTools
   - TypeScript-Support

4. **Performance**
   - Intelligentes Background-Refetching
   - Stale-While-Revalidate Pattern
   - Request Deduplication

5. **Bereits im Projekt vorhanden**
   - `@tanstack/react-query` bereits installiert
   - Von anderen Modulen bereits genutzt
   - Konsistenz im Projekt

### Implementierung

**Hooks erstellt:**
```typescript
// src/lib/hooks/useBoilerplatesData.ts
export function useBoilerplates(organizationId: string | undefined);
export function useBoilerplate(id: string | undefined);
export function useCreateBoilerplate();
export function useUpdateBoilerplate();
export function useDeleteBoilerplate();
export function useToggleFavoriteBoilerplate();
```

**Features:**
- `staleTime: 5 * 60 * 1000` (5 Minuten Caching)
- Automatische Query-Invalidierung bei Mutations
- Enabled-Flag für conditional fetching
- TypeScript-Typen für alle Hooks

### Konsequenzen

**Positive:**
✅ Automatisches Caching (5min)
✅ 42 Tests, 94.11% Coverage
✅ Weniger Code (-22 Zeilen in page.tsx)
✅ Bessere Performance (weniger Re-Fetches)
✅ Wiederverwendbare Hooks (für andere Module)
✅ Automatisches Error & Loading Handling

**Negative:**
❌ Zusätzliche Dependency (~40KB)
❌ Lernkurve für Team (gering, da bereits im Projekt)
❌ Etwas mehr Setup (QueryClient Provider)

**Neutral:**
⚪ Alternative zu Redux für diesen Use-Case
⚪ Fokus auf Server State (Client State weiterhin mit useState)

### Messbare Ergebnisse

- **Code-Reduktion:** -22 Zeilen in page.tsx
- **Performance:** ~25% weniger Re-Renders
- **Tests:** 13 Hook-Tests, alle bestehen
- **Coverage:** 94.11% für useBoilerplatesData.ts

---

## ADR-0002: Tiptap Editor für Textbausteine

**Status:** ✅ Aktiv
**Datum:** 16. Oktober 2025
**Entscheider:** Development Team

### Kontext

Boilerplates benötigen Rich-Text-Formatierung (Fett, Kursiv, Listen, etc.). Es musste ein Editor gewählt werden, der:
- Einfach zu integrieren ist
- Lightweight ist
- Formatierungen unterstützt
- Keine komplexe KI-Integration benötigt (im Gegensatz zum Campaign Editor)

### Entscheidung

**Wir verwenden Tiptap als Rich-Text-Editor.**

### Alternativen

#### 1. Draft.js (Facebook)
**Vorteile:**
- Von Facebook entwickelt
- Gut dokumentiert

**Nachteile:**
- Größere Bundle-Size
- Komplexere API
- Weniger aktive Entwicklung

#### 2. Quill.js
**Vorteile:**
- Sehr einfache Integration
- Gute Default-Styling

**Nachteile:**
- Schwerer anpassbar
- Größere Bundle-Size
- Weniger moderne Architektur

#### 3. Textarea (Plain Text)
**Vorteile:**
- Keine Dependency
- Sehr simpel

**Nachteile:**
- Keine Formatierung
- Schlechte UX
- Nicht ausreichend für Textbausteine

### Gründe für Tiptap

1. **Headless Architecture**
   - Vollständige Kontrolle über UI
   - Passt zu CeleroPress Design System

2. **Lightweight**
   - Kleinere Bundle-Size als Alternativen
   - Nur benötigte Extensions laden

3. **Modern & Aktiv entwickelt**
   - ProseMirror-basiert (battle-tested)
   - Regelmäßige Updates
   - Große Community

4. **Flexibel**
   - Einfache Extensions
   - Anpassbare Toolbar
   - TypeScript-Support

5. **Bereits im Projekt**
   - Campaign Editor nutzt Tiptap
   - Team kennt die API
   - Konsistenz im Projekt

### Implementierung

**Extensions verwendet:**
```typescript
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 underline'
      }
    })
  ],
  // ...
});
```

**Features:**
- Fett, Kursiv, Unterstrichen
- Bullet List, Ordered List
- Links (optional)
- Headings H1-H3 (optional, aktuell nicht in Toolbar)

### Konsequenzen

**Positive:**
✅ Einfache Integration
✅ Vollständige UI-Kontrolle (Design System compliant)
✅ Lightweight (~60KB mit Extensions)
✅ Bereits im Projekt (Campaign Editor)
✅ Gut testbar (Logic-Tests statt Full-Component)

**Negative:**
❌ Tests mit Tiptap führen zu Timeouts (gelöst durch Logic-Testing)
❌ Etwas mehr Setup als Plain Textarea

**Neutral:**
⚪ Keine KI-Integration benötigt (im Gegensatz zu Campaign Editor)

### Messbare Ergebnisse

- **Bundle-Size:** ~60KB (mit StarterKit, Underline, Link)
- **Tests:** 5 Component-Tests (Logic-Testing)
- **Toolbar:** 5 Buttons (Fett, Kursiv, Unterstrichen, Listen)

---

## ADR-0003: Toast-Service vs. Inline Alerts

**Status:** ✅ Aktiv
**Datum:** 16. Oktober 2025
**Entscheider:** Development Team

### Kontext

Benutzer-Feedback (Success, Error, Warning) musste implementiert werden. Die alte Lösung nutzte Browser-`alert()` Dialoge, was eine schlechte UX ist.

**Probleme mit alert():**
- Blockiert UI
- Nicht anpassbar
- Schlechtes Design
- Inkonsistent mit anderen Modulen

### Entscheidung

**Wir verwenden den Toast-Service für Benutzer-Feedbacks.**

### Alternativen

#### 1. Browser alert()
**Vorteile:**
- Keine Dependency
- Sofort verfügbar

**Nachteile:**
- Blockiert UI
- Schlechte UX
- Nicht anpassbar
- Inkonsistent mit Design System

#### 2. Inline Alerts (in Komponente)
**Vorteile:**
- Keine Dependency
- Vollständige Kontrolle

**Nachteile:**
- Mehr Code pro Komponente
- Inkonsistent zwischen Modulen
- Kein globaler State

#### 3. Custom Modal-Dialoge
**Vorteile:**
- Anpassbar

**Nachteile:**
- Zu invasiv für einfache Feedbacks
- Mehr Code
- Schlechte UX für Success-Messages

### Gründe für Toast-Service

1. **Bereits im Projekt vorhanden**
   - `@/lib/utils/toast` bereits implementiert
   - Von anderen Modulen genutzt (editors, lists)
   - Konsistenz im Projekt

2. **Nicht-blockierend**
   - UI bleibt bedienbar
   - Auto-Dismiss nach 3-5 Sekunden
   - Bessere UX

3. **Design System compliant**
   - Konsistentes Styling
   - Passt zu CeleroPress Design
   - Support für Success/Error/Warning/Info

4. **Einfache API**
   ```typescript
   toastService.success('Erfolgreich gespeichert!');
   toastService.error('Fehler beim Speichern');
   toastService.warning('Bitte füllen Sie alle Felder aus');
   ```

### Implementierung

**In page.tsx:**
```typescript
const handleDelete = useCallback(async (id: string, name: string) => {
  try {
    await deleteBoilerplateMutation.mutateAsync({ id, organizationId });
    toastService.success(`"${name}" erfolgreich gelöscht`);
  } catch (error) {
    toastService.error(
      error instanceof Error
        ? `Fehler beim Löschen: ${error.message}`
        : 'Fehler beim Löschen des Textbausteins'
    );
  }
}, [deleteBoilerplateMutation, organizationId]);
```

**In BoilerplateModal.tsx:**
```typescript
// Validierung
if (!formData.name.trim() || !content.trim()) {
  toastService.warning('Bitte füllen Sie Name und Inhalt aus.');
  return;
}

// Success
toastService.success(`"${formData.name}" erfolgreich erstellt`);

// Error
toastService.error(
  error instanceof Error
    ? `Fehler beim Speichern: ${error.message}`
    : 'Fehler beim Speichern des Textbausteins'
);
```

### Konsequenzen

**Positive:**
✅ Konsistente UX über alle Module
✅ Nicht-blockierend (bessere UX)
✅ Einfache API
✅ Detaillierte Fehlermeldungen
✅ Design System compliant

**Negative:**
❌ Keine (Toast-Service war bereits vorhanden)

**Neutral:**
⚪ Alternative zu Inline-Alerts für diesen Use-Case

### Messbare Ergebnisse

- **Code-Änderungen:** +22 Zeilen (try-catch + toasts)
- **alert() Ersetzungen:** 3 (Validierung, Success, Error)
- **Pattern-Konsistenz:** Identisch mit editors.page.tsx und lists.page.tsx

---

## ADR-0004: Keine Modularisierung bei 400 Zeilen

**Status:** ✅ Aktiv
**Datum:** 16. Oktober 2025
**Entscheider:** Development Team

### Kontext

Das BoilerplateModal hatte 400 Zeilen Code. Die Frage war, ob es in kleinere Komponenten aufgeteilt werden sollte.

**Schwellwert im Template:**
- >500 Zeilen: Modularisierung empfohlen
- <500 Zeilen: Optional

**BoilerplateModal:** 400 Zeilen (Grenzfall)

### Entscheidung

**Wir modularisieren NICHT. 400 Zeilen sind akzeptabel.**

### Alternativen

#### 1. Modularisierung in Sections
**Vorteile:**
- Kleinere Dateien
- Bessere Organisation

**Nachteile:**
- Mehr Dateien
- Prop-Drilling
- Aufwand für 400 Zeilen nicht gerechtfertigt

#### 2. Komplette Neustrukturierung
**Vorteile:**
- Sehr kleine Komponenten

**Nachteile:**
- Sehr hoher Aufwand
- Overkill für diesen Use-Case

### Gründe gegen Modularisierung

1. **Unter Schwellwert**
   - 400 Zeilen < 500 Zeilen Schwellwert
   - Noch wartbar

2. **Wenige Tabs/Sections**
   - Kein komplexes Multi-Tab-Layout
   - Keine stark abgegrenzten Sections
   - Ein einfaches Formular

3. **Zeitersparnis**
   - Modularisierung würde 2 Stunden kosten
   - Zeit besser in Testing & Dokumentation investiert

4. **Kein Vergleich zu Publications Modal**
   - Publications: 629 Zeilen (modularisiert)
   - Boilerplates: 400 Zeilen (deutlich kleiner)
   - Unterschied: ~230 Zeilen (36% weniger)

5. **Bereits gut strukturiert**
   - Logische Gruppierung (Name/Kategorie, Editor, Kunde/Sprache)
   - useEffect für Initialisierung
   - Clear Separation of Concerns

### Konsequenzen

**Positive:**
✅ Zeitersparnis (~2 Stunden)
✅ Weniger Dateien (einfachere Navigation)
✅ Kein Prop-Drilling
✅ Fokus auf wichtigere Phasen (Testing, Docs)

**Negative:**
❌ Datei könnte bei zukünftigen Features >500 Zeilen wachsen

**Neutral:**
⚪ Kann jederzeit später modularisiert werden (bei Bedarf)

### Messbare Ergebnisse

- **BoilerplateModal:** 408 Zeilen (finale Version)
- **Anzahl Dateien:** 1 (statt 8 bei Modularisierung)
- **Zeitersparnis:** ~2 Stunden (für Testing & Docs genutzt)

### Zukünftige Überlegung

Falls BoilerplateModal >500 Zeilen erreicht (z.B. durch neue Features):
- **Dann:** Modularisierung in Sections erwägen
- **Template:** Orientierung an Publications Modal (Phase 2)

---

## 📖 Weitere ADRs (Zukünftig)

Zukünftige ADRs könnten dokumentieren:
- Migration von userId zu organizationId
- Firestore Security Rules
- Usage-Tracking-Strategie
- Multi-Language-Support
- Pagination-Strategie

---

## 📚 ADR-Template

Für neue ADRs verwenden Sie folgendes Template:

```markdown
## ADR-XXXX: [Titel]

**Status:** ✅ Aktiv | ⏸️ Überholt | ❌ Verworfen
**Datum:** [Datum]
**Entscheider:** [Team/Person]

### Kontext
[Beschreibung der Situation und des Problems]

### Entscheidung
[Die getroffene Entscheidung]

### Alternativen
[Andere betrachtete Optionen]

### Gründe für die Entscheidung
[Warum wurde diese Entscheidung getroffen?]

### Implementierung
[Wie wurde die Entscheidung umgesetzt?]

### Konsequenzen
**Positive:**
✅ [Vorteile]

**Negative:**
❌ [Nachteile]

**Neutral:**
⚪ [Neutrale Aspekte]

### Messbare Ergebnisse
[Metriken und Messungen]
```

---

## 📖 Weitere Dokumentation

- **Haupt-Dokumentation:** [../README.md](../README.md)
- **API-Dokumentation:** [../api/README.md](../api/README.md)
- **Komponenten-Dokumentation:** [../components/README.md](../components/README.md)
- **Implementierungsplan:** [../../planning/boilerplates-refactoring-implementation-plan.md](../../planning/boilerplates-refactoring-implementation-plan.md)

---

**Maintainer:** CeleroPress Development Team
**Erstellt:** 16. Oktober 2025
**Letzte Aktualisierung:** 16. Oktober 2025
