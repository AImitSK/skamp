# Test-Analyse CeleroPress

**Datum:** 02.12.2025
**Status:** Dritte Reparatur-Runde abgeschlossen

---

## Zusammenfassung

### Ursprünglicher Stand (vor allen Fixes)
| Metrik | Wert |
|--------|------|
| Test Suites gesamt | 334 |
| Test Suites fehlgeschlagen | 123 |
| Tests gesamt | 4.486 |
| Tests bestanden | 3.763 (84%) |
| Tests fehlgeschlagen | 677 (15%) |

### Nach ersten Fixes
| Metrik | Wert | Änderung |
|--------|------|----------|
| Test Suites gesamt | 327 | -7 (E2E ausgeschlossen) |
| Test Suites fehlgeschlagen | 116 | -7 |
| Tests gesamt | 4.486 | - |
| Tests bestanden | 3.764 (84%) | +1 |
| Tests fehlgeschlagen | 676 (15%) | -1 |

### Aktueller Stand (02.12.2025 - nach 3 Runden parallel Agent-Reparaturen)
| Metrik | Wert | Änderung vs. Start |
|--------|------|----------|
| Test Suites gesamt | 329 | - |
| Test Suites fehlgeschlagen | 93 | **-30** ✅ |
| Test Suites bestanden | 236 | **+30** ✅ |
| Tests gesamt | 4.571 | +85 (neue Tests) |
| Tests bestanden | 3.960 (87%) | **+197** ✅ |
| Tests fehlgeschlagen | 563 (12%) | **-114** ✅ |
| Tests übersprungen | 10 | - |
| Tests TODO | 38 | - |

### Fortschritt Übersicht
```
Fehlgeschlagene Tests: 677 → 563 (-114 Tests, -17%)
Erfolgsrate: 84% → 87% (+3%)
```

---

## Durchgeführte Fixes

### ✅ 1. Jest Config: E2E Tests ausgeschlossen
**Datei:** `jest.config.js`
```js
testPathIgnorePatterns: [
  '<rootDir>/node_modules/',
  '<rootDir>/.next/',
  '<rootDir>/e2e/',  // NEU: E2E Tests nur mit Playwright
],
```
**Effekt:** 7 E2E Test Suites werden nicht mehr fälschlicherweise von Jest geladen.

### ✅ 2. Window.location Mock verbessert
**Datei:** `src/__tests__/setup.ts`
- Ursprünglicher Ansatz mit `delete window.location` verursachte jsdom-Fehler
- Neuer Ansatz: Nur fehlende Methoden hinzufügen (assign, replace, reload)

### ✅ 3. Firebase Firestore Mock erweitert
**Datei:** `src/__tests__/setup.ts`
- `Timestamp.fromMillis()` hinzugefügt
- `Timestamp.fromDate()` hinzugefügt
- `FieldValue` Methoden hinzugefügt
- Weitere Firestore-Funktionen: `limit`, `startAfter`, `onSnapshot`, `setDoc`

### ✅ 4. Firebase Storage Mock erweitert
**Datei:** `src/__tests__/setup.ts`
- Vollständigere Mock-Implementierung mit allen gängigen Methoden

### ✅ 5. TipTap Editor Mock hinzugefügt
**Datei:** `src/__tests__/setup.ts`
- `@tiptap/react` vollständig gemockt
- Editor-Commands und -Methoden implementiert

---

## Verbleibende Probleme

### Hauptfehlerursachen (nach Häufigkeit)

| Fehler | Anzahl | Beschreibung |
|--------|--------|--------------|
| Element type invalid | 266 | Komponenten-Import-Probleme |
| No QueryClient set | 82 | React Query Provider fehlt in Tests |
| mockResolvedValue undefined | 64 | Mock-Setup-Probleme |
| editor.can is not function | 38 | TipTap Editor Mock (teilweise behoben) |
| Timestamp.fromMillis | 10 | Firebase Mock (behoben) |

### Analyse der Hauptprobleme

#### 1. "Element type is invalid" (266 Fehler)
**Ursache:** Tests importieren Komponenten, die wiederum andere Komponenten importieren, die nicht korrekt gemockt sind.

**Beispiel-Kette:**
```
key-visual-feature.test.tsx
  → KeyVisualSection.tsx
    → AssetSelectorModal.tsx
      → SimpleProjectUploadModal.tsx
        → AuthContext.tsx
          → ProfileImageService (versucht getStorage() beim Import)
```

**Lösung:** Tests müssen entweder:
- Die gesamte Import-Kette mocken
- Oder einen Test-Wrapper mit allen Providern bereitstellen

#### 2. "No QueryClient set" (82 Fehler)
**Ursache:** Tests verwenden Komponenten mit `useQuery`/`useMutation` ohne `QueryClientProvider`.

**Lösung:** Test-Utility mit Provider-Wrapper erstellen:
```tsx
// Empfohlener Ansatz für Tests:
const queryClient = new QueryClient();
render(
  <QueryClientProvider client={queryClient}>
    <KomponenteZumTesten />
  </QueryClientProvider>
);
```

---

## Teststruktur

### Verzeichnisstruktur
```
src/
├── __tests__/                    # Zentrale Tests
│   ├── setup.ts                  # Jest Setup (verbessert ✅)
│   ├── setupFirebaseMocks.ts     # Firebase Mocks
│   ├── __mocks__/                # Mock-Definitionen
│   ├── api/                      # API Tests
│   ├── components/               # Komponenten Tests
│   ├── features/                 # Feature Tests
│   └── ...
├── app/**/___tests__/            # Co-located Tests
├── components/**/___tests__/     # Co-located Tests
└── lib/**/___tests__/            # Co-located Tests

e2e/                              # E2E Tests (Playwright)
├── *.spec.ts                     # Ausgeführt mit: npm run test:e2e
```

### Test-Kommandos
| Kommando | Beschreibung |
|----------|--------------|
| `npm test` | Alle Unit/Integration Tests |
| `npm run test:watch` | Tests im Watch-Modus |
| `npm run test:coverage` | Tests mit Coverage-Report |
| `npm run test:e2e` | E2E Tests (Playwright) |
| `npm run test:e2e:ui` | E2E Tests mit UI |

---

## Empfohlene nächste Schritte

### Priorität 1: Test-Utils verwenden

Die Datei `src/__tests__/test-utils.tsx` existiert bereits mit `renderWithProviders()`.

**Problem:** 198 Tests importieren direkt von `@testing-library/react` statt von unserer test-utils.

**Lösung für einzelne Tests:**
```tsx
// VORHER (verursacht "No QueryClient" Fehler)
import { render } from '@testing-library/react';
render(<MeineKomponente />);

// NACHHER (funktioniert)
import { renderWithProviders } from '@/__tests__/test-utils';
renderWithProviders(<MeineKomponente />);
```

**Hinweis:** Ein globaler Mock für React Query funktioniert nicht, da er Tests kaputt macht die einen echten QueryClient brauchen.

2. **Komponenten-Mocks für häufige Abhängigkeiten**
   - AuthContext (bereits in test-utils.tsx)
   - ProfileImageService (verursacht "Element type invalid" Fehler)
   - Komplexe UI-Komponenten

### Priorität 2: Strukturelle Verbesserungen

3. **Test-Isolation verbessern**
   - Jeden Test unabhängig machen
   - Keine globalen State-Mutationen

4. **Flaky Tests identifizieren**
   - Tests mehrfach ausführen
   - Timing-Probleme beheben

### Priorität 3: Langfristig

5. **Coverage-Ziele definieren**
   - Kritische Pfade: 80%+
   - Utility-Funktionen: 90%+
   - UI-Komponenten: 70%+

6. **CI/CD Integration**
   - Tests bei jedem PR
   - Coverage-Reports
   - Blocking bei Regression

---

## Anhang: Konfigurationsdateien

### jest.config.js (aktuell)
```js
testPathIgnorePatterns: [
  '<rootDir>/node_modules/',
  '<rootDir>/.next/',
  '<rootDir>/e2e/',
],
testMatch: [
  '**/__tests__/**/*.(ts|tsx|js)',
  '**/*.(test|spec).(ts|tsx|js)',
],
```

### Wichtige Setup-Dateien
- `jest.config.js` - Haupt-Konfiguration
- `jest.setup.js` - Basis-Setup
- `src/__tests__/setup.ts` - Erweiterte Mocks
- `src/__tests__/setupFirebaseMocks.ts` - Firebase-spezifische Mocks
