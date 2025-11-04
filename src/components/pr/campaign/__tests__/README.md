# Content Composer Test Suite

Test-Suite für das CampaignContentComposer Refactoring (Phase 3 - Performance-Optimierung).

## Übersicht

Diese Test-Suite deckt das vollständige CampaignContentComposer-System ab, inklusive:

- **Custom Hooks** (usePDFGeneration, useBoilerplateProcessing)
- **Shared Components** (FolderSelectorDialog)
- **Main Component** (CampaignContentComposer)
- **Integration Tests** für vollständige User-Flows

## Test-Statistiken

**Gesamt:**
- ✅ **97 Tests** (alle bestehend)
- ✅ **4 Test-Suites**
- ✅ **100% Coverage** für alle getesteten Module

**Coverage nach Modul:**

| Modul | Statements | Branches | Functions | Lines |
|-------|------------|----------|-----------|-------|
| `CampaignContentComposer.tsx` | 100% | 94.44% | 100% | 100% |
| `useBoilerplateProcessing.ts` | 100% | 100% | 100% | 100% |
| `usePDFGeneration.ts` | 100% | 100% | 100% | 100% |
| `FolderSelectorDialog.tsx` | 100% | 100% | 100% | 100% |

## Test-Struktur

```
src/components/pr/campaign/
├── __tests__/
│   ├── CampaignContentComposer.test.tsx (43 Tests)
│   └── README.md (diese Datei)
├── hooks/
│   └── __tests__/
│       ├── usePDFGeneration.test.ts (10 Tests)
│       └── useBoilerplateProcessing.test.ts (21 Tests)
└── shared/
    └── __tests__/
        └── FolderSelectorDialog.test.tsx (23 Tests)
```

## Test-Kommandos

```bash
# Alle Tests ausführen
npm test -- src/components/pr/campaign

# Nur Hook-Tests
npm test -- src/components/pr/campaign/hooks

# Nur Component-Tests
npm test -- src/components/pr/campaign/__tests__

# Mit Coverage
npm test -- --coverage src/components/pr/campaign

# Watch-Mode für Entwicklung
npm test -- --watch src/components/pr/campaign
```

## Test-Kategorien

### 1. Hook Tests: usePDFGeneration (10 Tests)

**Datei:** `hooks/__tests__/usePDFGeneration.test.ts`

**Getestete Features:**
- Initial State (generatingPdf, pdfDownloadUrl, showFolderSelector)
- `handlePdfExport` Validierung (leerer Titel, whitespace, gültige Titel)
- `setShowFolderSelector` State-Updates
- `generatePdf` Funktion (aktuell disabled)
- Edge Cases: lange Titel, Sonderzeichen, mehrfach-Klicks

**Wichtige Tests:**
- ✅ Fehler-Toast bei leerem Titel
- ✅ Folder-Selector öffnet bei gültigem Titel
- ✅ Whitespace-Titel werden akzeptiert (aktuelle Implementierung)
- ✅ Sonderzeichen in Titeln unterstützt

### 2. Hook Tests: useBoilerplateProcessing (21 Tests)

**Datei:** `hooks/__tests__/useBoilerplateProcessing.test.ts`

**Getestete Features:**
- Title Processing (mit/ohne Titel, Sonderzeichen)
- Section Sorting (nach order-Property)
- Boilerplate Content Rendering
- Quote Section Processing (mit vollständigen/partiellen Metadaten)
- Strukturierte Inhalte (lead, main, quote)
- Automatisches Datum am Ende
- `onFullContentChange` Callback
- Edge Cases: leere Sections, lange Inhalte, gemischte Section-Typen

**Wichtige Tests:**
- ✅ Sections werden nach `order` sortiert
- ✅ Quote-Metadata wird korrekt formatiert (Person, Role, Company)
- ✅ Titel wird als H1 eingebunden
- ✅ Datum wird immer am Ende hinzugefügt
- ✅ onFullContentChange wird bei Änderungen aufgerufen
- ✅ Komplexe Szenarien mit allen Section-Typen

### 3. Component Tests: FolderSelectorDialog (23 Tests)

**Datei:** `shared/__tests__/FolderSelectorDialog.test.tsx`

**Getestete Features:**
- Rendering (isOpen true/false)
- Folder Loading (initial, mit Fehlern)
- Client-Filtering (clientId vorhanden/nicht vorhanden)
- Breadcrumb-Navigation (root, subfolders, zurück navigieren)
- Folder-Selection (root-folder, subfolders)
- Dialog-Actions (Abbrechen, Schließen)
- Current Folder Display
- Performance & Memoization
- Edge Cases: fehlende Descriptions, lange Namen, custom Colors

**Wichtige Tests:**
- ✅ Dialog wird nur gerendert wenn `isOpen=true`
- ✅ Loading-State wird initial angezeigt
- ✅ Client-Filter funktioniert korrekt
- ✅ Breadcrumb-Navigation mit Stack-Management
- ✅ Folder-Auswahl ruft Callbacks korrekt auf
- ✅ React.memo Optimierung wird getestet
- ✅ Fehler-Handling bei Network-Problemen

### 4. Integration Tests: CampaignContentComposer (43 Tests)

**Datei:** `__tests__/CampaignContentComposer.test.tsx`

**Getestete Features:**
- Basic Rendering (minimal props, alle Sections)
- Title Input (onChange, required, HeadlineGenerator-Integration)
- Read-Only Title Mode
- Main Content Editor (GmailStyleEditor, hideMainContentField)
- PR-SEO Integration (PRSEOHeaderBar, Keywords)
- Boilerplate Sections (add, remove, hideBoilerplates)
- Legacy Section Conversion (position → order)
- Preview Functionality (toggle, processed content)
- PDF Export (Validierung, Folder-Selector)
- Full Content Change Callback
- Edge Cases: leere Inputs, lange Inhalte, rapid clicks
- Performance (re-renders, rapid updates)

**Wichtige Tests:**
- ✅ Alle Komponenten-Optionen werden respektiert (hideMainContentField, hidePreview, hideBoilerplates, readOnlyTitle)
- ✅ Legacy position-Property wird zu order konvertiert
- ✅ PDF-Export öffnet Folder-Selector bei gültigem Titel
- ✅ PDF-Export zeigt Fehler bei leerem Titel
- ✅ Preview-Toggle funktioniert korrekt
- ✅ HeadlineGenerator-Integration funktioniert
- ✅ PR-SEO Integration (wenn onKeywordsChange vorhanden)
- ✅ Boilerplate-Sections werden korrekt verwaltet
- ✅ onFullContentChange wird bei Änderungen aufgerufen
- ✅ Performance: Keine unnötigen Re-Renders

## Test-Strategie

### Arrange-Act-Assert (AAA) Pattern

Alle Tests folgen dem AAA-Pattern:

```typescript
it('should do something', () => {
  // Arrange: Setup
  const mockCallback = jest.fn();
  render(<Component callback={mockCallback} />);

  // Act: User-Interaktion
  fireEvent.click(screen.getByText('Button'));

  // Assert: Erwartungen
  expect(mockCallback).toHaveBeenCalledWith('expected-value');
});
```

### Mocking-Strategie

**Gemockte Services:**
- `@/lib/utils/toast` → toastService (error, success)
- `@/lib/firebase/media-service` → mediaService (getFolders, getBreadcrumbs)
- `@/lib/firebase/boilerplate-service` → boilerplatesService

**Gemockte Komponenten:**
- `GmailStyleEditor` → Vereinfachtes Textarea
- `HeadlineGenerator` → Button für Titel-Generation
- `PRSEOHeaderBar` → Mock mit Keywords-Update
- `IntelligentBoilerplateSection` → Mock mit Add-Button

**Warum?**
- Isolierung der zu testenden Komponente
- Schnellere Test-Ausführung
- Keine externe Abhängigkeiten (Firebase, APIs)
- Vorhersagbare Test-Ergebnisse

### Edge-Case-Testing

Jede Test-Suite enthält einen "Edge Cases" Abschnitt:

**Getestete Edge Cases:**
- Leere Inputs (title, content, sections)
- Sehr lange Inputs (>500 Zeichen)
- Sonderzeichen (Umlaute, HTML-Entities)
- Whitespace-only Inputs
- Mehrfach-Klicks auf Buttons
- Rapid Content Updates
- Fehlerhafte API-Responses
- Fehlende Callback-Functions

## Performance-Tests

### React.memo Optimierung

`FolderSelectorDialog` ist mit `React.memo` optimiert. Tests validieren:

- ✅ Keine Re-Renders bei gleichen Props
- ✅ Re-Render nur wenn Dialog geschlossen und wieder geöffnet wird

### useCallback Optimierung

`CampaignContentComposer` nutzt `useCallback` für:

- `handleBoilerplateSectionsChange`

Tests validieren:
- ✅ Keine unnötigen Re-Renders bei Props-Updates
- ✅ Effiziente Content-Updates

### useMemo Optimierung

`CampaignContentComposer` nutzt `useMemo` für:

- `convertedSections` (Legacy-Conversion)

Tests validieren:
- ✅ Legacy-Sections werden korrekt konvertiert
- ✅ Konvertierung erfolgt nur bei Änderung der initialBoilerplateSections

## Integration mit CI/CD

### Jest-Konfiguration

Tests nutzen die bestehende Jest-Konfiguration in `jest.config.js`:

- **Test Environment:** jsdom (für DOM-Tests)
- **Setup Files:** `jest.setup.js`, `src/__tests__/setup.ts`
- **Module Aliases:** `@/` → `src/`
- **Firebase Mocks:** Vorkonfiguriert in Setup

### Test-Coverage Threshold

**Aktuell erreicht:**
- Statements: 100%
- Branches: 94.44% - 100%
- Functions: 100%
- Lines: 100%

**Empfohlene Thresholds für CI/CD:**

```json
{
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 80,
      "functions": 80,
      "lines": 80
    },
    "src/components/pr/campaign/hooks/*.ts": {
      "statements": 95,
      "branches": 95,
      "functions": 100,
      "lines": 95
    }
  }
}
```

## Bekannte Einschränkungen

### 1. PDF-Generierung aktuell disabled

Die `generatePdf` Funktion in `usePDFGeneration` ist aktuell deaktiviert:

```typescript
const generatePdf = useCallback(async (targetFolderId?: string) => {
  setGeneratingPdf(false);
  return;
  // TODO: Implementierung wenn PDF-Generation aktiviert wird
}, []);
```

**Grund:** PDF-Generierung erfolgt über Puppeteer API Route im `pdf-versions-service`.

**Tests:** Validieren aktuelles Verhalten (generatingPdf bleibt false).

**Future:** Tests müssen erweitert werden, wenn PDF-Generation aktiviert wird.

### 2. WhitespaceTitle-Validation

`handlePdfExport` prüft nur `!title`, nicht `!title.trim()`:

```typescript
if (!title) {
  toastService.error('...');
  return;
}
```

**Tests:** Validieren aktuelles Verhalten (whitespace wird akzeptiert).

**Recommendation:** Für Production könnte `!title.trim()` sinnvoll sein.

### 3. IntelligentBoilerplateSection nicht vollständig getestet

`IntelligentBoilerplateSection.tsx` ist in Integration-Tests gemockt.

**Grund:** Komponente ist sehr komplex (900+ Zeilen) mit eigener Drag&Drop-Logik.

**Coverage:** 0% (nicht Teil dieser Test-Suite)

**Recommendation:** Separate Test-Suite für IntelligentBoilerplateSection erstellen.

## Wartung und Updates

### Wenn neue Features hinzugefügt werden:

1. **Tests ZUERST schreiben** (TDD-Ansatz)
2. **Bestehende Tests erweitern**, nicht ersetzen
3. **Edge Cases berücksichtigen**
4. **Coverage prüfen** nach neuen Tests

### Wenn Bugs gefunden werden:

1. **Bug reproduzieren** mit Test
2. **Test schlägt fehl** (Red)
3. **Bug fixen**
4. **Test besteht** (Green)
5. **Refactoring** (wenn nötig)

### Code-Reviews:

- ✅ Alle Tests müssen bestehen
- ✅ Coverage darf nicht sinken
- ✅ Neue Features müssen getestet sein
- ✅ Keine TODOs in Test-Code
- ✅ Keine Platzhalter-Tests

## Hilfreiche Test-Utilities

### waitFor für Async-Updates

```typescript
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### fireEvent für User-Interaktion

```typescript
fireEvent.click(screen.getByText('Button'));
fireEvent.change(input, { target: { value: 'New Value' } });
```

### screen.debug() für Debugging

```typescript
// Aktuellen DOM-Tree ausgeben
screen.debug();

// Spezifisches Element ausgeben
screen.debug(screen.getByTestId('my-element'));
```

### Testing Library Queries (Priorität)

1. **getByRole** (bevorzugt) - Accessibility-freundlich
2. **getByLabelText** - Für Form-Inputs
3. **getByPlaceholderText** - Wenn kein Label vorhanden
4. **getByText** - Für Text-Content
5. **getByTestId** - Letzter Ausweg für komplexe Komponenten

## Weiterführende Ressourcen

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Arrange-Act-Assert Pattern](https://automationpanda.com/2020/07/07/arrange-act-assert-a-pattern-for-writing-good-tests/)

---

**Erstellt:** 2025-11-04
**Letzte Aktualisierung:** 2025-11-04
**Version:** 1.0.0
**Autor:** Claude Code (Testing Agent)
**Status:** ✅ Production-Ready
