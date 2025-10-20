# E2E Tests mit Playwright

End-to-End Tests für kritische User-Flows im CeleroPress CRM.

## 📋 Übersicht

**Test-Dateien:**
- `crm-company-contact-creation.spec.ts` - Firmen und Kontakte erstellen
- `crm-bulk-export.spec.ts` - Bulk-Export von CRM-Daten
- `crm-filter-search.spec.ts` - Filter- und Suchfunktionen

**Abdeckung:**
- CRM Company Management
- CRM Contact Management
- Bulk-Export (CSV)
- Filter & Search

## 🚀 Tests ausführen

### Alle Tests ausführen
```bash
npm run test:e2e
```

### Mit UI (visuelles Debugging)
```bash
npm run test:e2e:ui
```

### Im Browser-Fenster (headed mode)
```bash
npm run test:e2e:headed
```

### Debug-Modus (Playwright Inspector)
```bash
npm run test:e2e:debug
```

### Test-Report anzeigen
```bash
npm run test:e2e:report
```

### Einzelnen Test ausführen
```bash
npx playwright test crm-company-contact-creation
```

## ⚙️ Konfiguration

**Datei:** `playwright.config.ts` (im Root)

**Wichtige Settings:**
- Base URL: `http://localhost:3000`
- Browser: Chromium (Standard)
- Retry: 0 (lokal), 2 (CI)
- Webserver: Startet automatisch `npm run dev`

## 🔧 Voraussetzungen

**Vor dem ersten Test-Lauf:**

1. **Playwright installiert?**
   ```bash
   npm install -D @playwright/test
   ```

2. **Browser installiert?**
   ```bash
   npx playwright install chromium
   ```

3. **Webserver läuft?**
   - Wird automatisch gestartet via `playwright.config.ts`
   - Oder manuell: `npm run dev`

## 📝 Test-Struktur

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup (z.B. Login)
    await page.goto('/login');
    // ...
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/some-page');

    // Act
    await page.click('button');

    // Assert
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

## 🐛 Debugging

**Test fehlgeschlagen?**

1. **Screenshots anschauen:**
   - Automatisch erstellt bei Failures
   - Location: `test-results/`

2. **Video anschauen:**
   - Nur bei Failures aufgezeichnet
   - Location: `test-results/`

3. **Trace anschauen:**
   ```bash
   npx playwright show-trace test-results/.../trace.zip
   ```

4. **Mit Inspector debuggen:**
   ```bash
   npm run test:e2e:debug
   ```

## 📚 Ressourcen

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Locators Guide](https://playwright.dev/docs/locators)
- [Assertions](https://playwright.dev/docs/test-assertions)

## ⚠️ Wichtig

**Vor Commit:**
- Alle E2E-Tests müssen bestehen
- Keine `.only()` im Code lassen
- Test-Daten aufräumen (cleanup)
- Keine hardcodierte URLs/Credentials

**CI/CD:**
- Tests laufen automatisch in GitHub Actions
- Bei Failure: Screenshots/Videos verfügbar als Artifacts
