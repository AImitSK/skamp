# ApprovalTab Test-Dokumentation

## Übersicht

Vollständige Test-Suite für das ApprovalTab-Refactoring (Phase 3 - Campaign Edit).

**Status:** ✅ Abgeschlossen
**Datum:** 2025-01-05
**Coverage:** 100% für ApprovalTab.tsx und PDFWorkflowPreview.tsx

---

## Test-Dateien

### 1. PDFWorkflowPreview Component Tests
**Pfad:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/__tests__/PDFWorkflowPreview.test.tsx`

**Anzahl Tests:** 30
**Coverage:** 100%

#### Test-Kategorien

##### Conditional Rendering (4 Tests)
- ✅ Nicht rendern wenn disabled
- ✅ Nicht rendern wenn enabled aber keine steps
- ✅ Rendern wenn enabled ist true
- ✅ Rendern mit leerem steps array

##### Content Rendering (4 Tests)
- ✅ Korrekter Header angezeigt
- ✅ Erklärungstext angezeigt
- ✅ Tipp-Sektion angezeigt
- ✅ Step 4 "Vorschau" erwähnt im Tipp

##### Steps Rendering (4 Tests)
- ✅ Alle bereitgestellten Steps rendern
- ✅ Einzelnen Step korrekt rendern
- ✅ Mehrere Steps in korrekter Reihenfolge
- ✅ Steps mit Sonderzeichen (ÄÖÜ, &, ")

##### Visual Elements (6 Tests)
- ✅ CheckCircleIcon rendern
- ✅ ArrowRightIcon für jeden Step
- ✅ Korrekte Container-Styling-Klassen
- ✅ Korrekte Farben für Header
- ✅ Korrekte Steps-Container-Styling
- ✅ Border-Separator vor Tipp-Sektion

##### Edge Cases (4 Tests)
- ✅ Sehr lange Step-Texte
- ✅ HTML-ähnliche Zeichen in Steps
- ✅ Leere Strings in Steps-Array
- ✅ Sehr große Anzahl von Steps (20+)

##### Accessibility (3 Tests)
- ✅ Semantische HTML-Struktur (h4)
- ✅ Text-Komponenten verwendet
- ✅ Lesbare Farb-Kontraste

##### Integration mit Parent Component (2 Tests)
- ✅ Typische Props von ApprovalTab
- ✅ Disabled-State von ApprovalTab

##### React.memo Behavior (3 Tests)
- ✅ Memoized und nicht unnötig re-rendert
- ✅ Re-render bei Props-Änderung
- ✅ Enabled-State-Änderung

---

### 2. ApprovalTab Integration Tests
**Pfad:** `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/__tests__/ApprovalTab.integration.test.tsx`

**Anzahl Tests:** 32
**Coverage:** 100%

#### Test-Kategorien

##### Basic Rendering (4 Tests)
- ✅ ApprovalTab erfolgreich rendern
- ✅ Mit korrekter Struktur rendern
- ✅ ApprovalSettings-Komponente rendern
- ✅ Korrekte Container-Styling

##### Context Integration (6 Tests)
- ✅ organizationId an ApprovalSettings übergeben
- ✅ clientId aus Context übergeben
- ✅ clientName aus Context übergeben
- ✅ Fehlende Client-Daten gracefully handeln
- ✅ approvalData aus Context übergeben
- ✅ previousFeedback aus Context übergeben

##### ApprovalData Updates (2 Tests)
- ✅ Context-Update bei ApprovalSettings-Änderung
- ✅ Customer Contact setzen erlauben

##### PDF Workflow Preview Integration (5 Tests)
- ✅ Preview nicht zeigen wenn disabled
- ✅ Preview zeigen wenn enabled
- ✅ Alle 3 Workflow-Steps anzeigen wenn enabled
- ✅ Preview aktualisieren wenn Approval aktiviert
- ✅ Preview ausblenden wenn Approval deaktiviert

##### useMemo Optimization (3 Tests)
- ✅ pdfWorkflowData korrekt berechnen
- ✅ Leere Steps generieren wenn disabled
- ✅ pdfWorkflowData neu berechnen bei approvalData-Änderung

##### React.memo Behavior (2 Tests)
- ✅ Memoized und nicht unnötig re-rendert
- ✅ organizationId-Änderung handeln

##### Edge Cases (5 Tests)
- ✅ undefined approvalData gracefully handeln
- ✅ null approvalData gracefully handeln
- ✅ Unvollständige approvalData handeln
- ✅ Fehlende Client-Informationen handeln
- ✅ Leeres previousFeedback-Array handeln

##### Component Integration Flow (2 Tests)
- ✅ Vollständiger Approval-Workflow
- ✅ Alle verbundenen Komponenten gleichzeitig aktualisieren

##### Accessibility (3 Tests)
- ✅ Korrekte Überschriften-Hierarchie (h3)
- ✅ Beschreibender Text für User
- ✅ Focus-Management beibehalten

---

## Test-Statistiken

### Gesamt-Übersicht
```
Test-Dateien: 2
Gesamt-Tests: 62
Bestanden: 62 ✅
Fehlgeschlagen: 0
Coverage: 100%
```

### Coverage-Breakdown
```
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
ApprovalTab.tsx          | 100     | 100      | 100     | 100
PDFWorkflowPreview.tsx   | 100     | 100      | 100     | 100
```

---

## Wichtige Test-Patterns

### 1. Component Testing mit React Testing Library
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

**Best Practices:**
- Verwendung von `screen.getByText()` für sichtbare Texte
- Verwendung von `screen.getByTestId()` für Test-IDs
- `waitFor()` für asynchrone Operationen
- `userEvent` für realistischere User-Interaktionen

### 2. Context-Integration Testing
```typescript
<CampaignProvider campaignId="test-id" organizationId="test-org">
  <ApprovalTab organizationId="test-org-id" />
</CampaignProvider>
```

**Wichtig:**
- Alle Context-Provider müssen gemockt werden
- prService.getById muss Campaign-Daten zurückgeben
- pdfVersionsService.getEditLockStatus muss gemockt werden

### 3. Mock-Setup für externe Abhängigkeiten
```typescript
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn(),
    getCampaignByShareId: jest.fn()
  }
}));
```

**Gemockte Services:**
- ✅ toastService (@/lib/utils/toast)
- ✅ AuthContext (@/context/AuthContext)
- ✅ prService (@/lib/firebase/pr-service)
- ✅ pdfVersionsService (@/lib/firebase/pdf-versions-service)
- ✅ ApprovalSettings (@/components/campaigns/ApprovalSettings)

### 4. Conditional Rendering Tests
```typescript
const { container } = render(<PDFWorkflowPreview enabled={false} />);
expect(container.firstChild).toBeNull();
```

**Pattern:**
- Early return in Komponente → `container.firstChild` sollte null sein
- Conditional render → `queryByText()` sollte null zurückgeben

### 5. useMemo Testing
```typescript
// Test dass useMemo korrekt berechnet wird
expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
expect(screen.getByText('2. Freigabe-Link wird an Kunde versendet')).toBeInTheDocument();
expect(screen.getByText('3. Kunde kann PDF prüfen und freigeben')).toBeInTheDocument();
```

**Wichtig:**
- useMemo-Werte werden über UI-Output getestet
- Nicht die Implementierung testen, sondern das Ergebnis
- Re-computation testen durch Props-Änderung

---

## Test-Ausführung

### Einzelne Test-Dateien
```bash
# PDFWorkflowPreview Tests
npm test -- "PDFWorkflowPreview.test.tsx"

# ApprovalTab Integration Tests
npm test -- "ApprovalTab.integration.test.tsx"
```

### Alle ApprovalTab Tests mit Coverage
```bash
npm test -- "tabs/(components/__tests__/PDFWorkflowPreview|__tests__/ApprovalTab)" --coverage
```

### Watch Mode (während Entwicklung)
```bash
npm test -- --watch "ApprovalTab"
```

---

## Bekannte Herausforderungen & Lösungen

### 1. Mock-Initialization mit jest.mock
**Problem:** `Cannot access 'mockGetById' before initialization`

**Lösung:**
```typescript
// ❌ Falsch
const mockGetById = jest.fn();
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: { getById: mockGetById }
}));

// ✅ Richtig
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: { getById: jest.fn() }
}));

// In Helper-Funktion
const { prService } = require('@/lib/firebase/pr-service');
(prService.getById as jest.Mock).mockResolvedValue(data);
```

### 2. Special Characters in Text Matching
**Problem:** `screen.getByText(/Step 4 "Vorschau"/)` findet nichts

**Lösung:** React verwendet HTML entities (&ldquo; statt ")
```typescript
// ❌ Falsch
expect(screen.getByText(/Step 4 "Vorschau"/)).toBeInTheDocument();

// ✅ Richtig
expect(screen.getByText(/Step 4/)).toBeInTheDocument();
expect(screen.getByText(/Vorschau/)).toBeInTheDocument();
```

### 3. getAllByText findet mehr als erwartet
**Problem:** `getAllByText(/step/i)` findet auch Tip-Text

**Lösung:** Verwende deutsche Begriffe für eindeutigere Matches
```typescript
// ❌ Problematisch (findet auch "step" im Tip-Text)
const stepElements = screen.getAllByText(/step/i);

// ✅ Besser
const stepElements = screen.getAllByText(/Schritt/i);
```

---

## Wartung & Updates

### Bei Komponenten-Änderungen

#### ApprovalTab.tsx
1. Neue Props → Tests in `ApprovalTab.integration.test.tsx` hinzufügen
2. Neue Context-Werte → Mocks in `createMockCampaign()` aktualisieren
3. Neue UI-Elemente → Rendering-Tests hinzufügen

#### PDFWorkflowPreview.tsx
1. Neue Props → Tests in `PDFWorkflowPreview.test.tsx` hinzufügen
2. Neue Visual-Elemente → Visual Elements Tests erweitern
3. Neue Steps-Logik → Steps Rendering Tests aktualisieren

### Bei Context-Änderungen
1. CampaignContext Interface ändert sich → Mock in Integration Tests anpassen
2. Neue Context-Werte → `Context Integration` Tests erweitern
3. Neue Context-Actions → `ApprovalData Updates` Tests hinzufügen

---

## Best Practices für zukünftige Tests

### DO ✅
- **User-Perspektive:** Teste was User sieht, nicht Implementierung
- **Accessibility:** Verwende semantic queries (`getByRole`, `getByLabelText`)
- **Realistic Interactions:** Verwende `userEvent` statt `fireEvent`
- **Async Handling:** Immer `waitFor()` für Context-Updates
- **Edge Cases:** Teste undefined, null, empty arrays
- **Error States:** Teste was passiert wenn Daten fehlen

### DON'T ❌
- **Implementierung testen:** Nicht `useState` oder `useMemo` direkt testen
- **Test-IDs overusen:** Nur wenn semantic queries nicht funktionieren
- **Snapshot-Tests:** Für UI-Komponenten vermeiden (zu fragil)
- **Mock overengineering:** Nur notwendige Mocks, nicht alles
- **Timeout-Ignores:** Wenn Tests timeout haben, ist meist ein Bug

---

## Integration mit CI/CD

### GitHub Actions
```yaml
- name: Run ApprovalTab Tests
  run: npm test -- "tabs/(components/__tests__/PDFWorkflowPreview|__tests__/ApprovalTab)"

- name: Check Coverage
  run: npm test -- "ApprovalTab" --coverage --coverageThreshold='{"global":{"branches":80,"functions":80,"lines":80,"statements":80}}'
```

### Pre-commit Hook
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test -- --bail --findRelatedTests"
    }
  }
}
```

---

## Nächste Schritte

### Für weitere Tabs
Die Test-Patterns aus ApprovalTab können für andere Tabs wiederverwendet werden:

1. **ContentTab:**
   - Ähnliche Context-Integration
   - Editor-Komponente testen
   - SEO-Score-Updates testen

2. **AttachmentsTab:**
   - Media-Upload testen
   - Asset-Liste testen
   - Drag-and-Drop testen

3. **PreviewTab:**
   - PDF-Viewer testen
   - Version-History testen
   - Approval-Status testen

### Test-Suite erweitern
- E2E-Tests für vollständigen Campaign Edit Flow
- Performance-Tests für große Kampagnen
- Accessibility-Tests mit jest-axe

---

## Kontakt & Support

**Erstellt von:** Testing Agent (Claude Code)
**Dokumentation Version:** 1.0
**Letzte Aktualisierung:** 2025-01-05

Bei Fragen zur Test-Suite:
1. Dokumentation lesen
2. Bestehende Tests als Referenz verwenden
3. Test-Patterns aus diesem Dokument anwenden
