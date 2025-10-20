# ⚠️ E2E-Tests: Status-Update

**Status:** ⚠️ Login funktioniert, aber Organisation fehlt (2025-10-20)

## ✅ Behobene Probleme

1. ✅ Login-Route korrigiert (`/` statt `/login`)
2. ✅ Selektoren korrigiert (`#email` und `#password`)
3. ✅ URL-Pattern korrigiert (Regex statt String-Match)
4. ✅ Auth-Helper erstellt und in allen Tests integriert

## 🐛 Verbleibendes Hauptproblem

**Test-User hat keine Organisation!**

Die bestehenden E2E-Tests (`*.spec.ts`) schlagen jetzt aus folgendem Grund fehl:

### Dashboard zeigt:
```
⚠️ Keine Organisation gefunden

Sie sind derzeit keiner Organisation zugeordnet.
Bitte warten Sie auf eine Einladung oder kontaktieren Sie Ihren Administrator.
```

### Das bedeutet:
- ✅ Login funktioniert (User ist authentifiziert)
- ✅ Redirect zu `/dashboard` funktioniert
- ❌ **Test-User hat keine Organisation → kann CRM nicht nutzen!**

### Was passiert:
1. Test-User (test@example.com) wird in Firebase erstellt
2. Aber: `teamMemberService.createOwner()` wird NICHT aufgerufen
3. Ergebnis: User hat keine `organizationId` in Firestore
4. Dashboard zeigt Fehler statt Inhalte

## 📋 Betroffene Test-Dateien

Alle müssen korrigiert werden:

1. ❌ `crm-bulk-export.spec.ts` (4 Tests)
2. ❌ `crm-company-contact-creation.spec.ts` (2 Tests)
3. ❌ `crm-filter-search.spec.ts` (5 Tests)

**Gesamt:** 11 fehlgeschlagene Tests

## ✅ Lösungsbeispiele

### Erstellt:
- ✅ `auth-helper.ts` - Shared Login-Helper
- ✅ `crm-company-contact-creation-FIXED.spec.ts` - Beispiel-Test korrigiert

### Noch zu tun:
1. Alle anderen `*.spec.ts` Dateien korrigieren
2. Test-User in Firebase erstellen (`test@example.com`)
3. Tests mit korrigierten Selektoren ausführen
4. CRM-Routen prüfen (`/dashboard/contacts/crm/companies` existiert?)

## 🔧 Wie man die Tests korrigiert

### Alt (Fehlerhaft):
```typescript
test.beforeEach(async ({ page }) => {
  // ❌ Falsche Route
  await page.goto('/login');

  // ❌ Falsche Selektoren
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');

  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard/**');
});
```

### Neu (Korrekt):
```typescript
import { login, TEST_USER } from './auth-helper';

test.beforeEach(async ({ page }) => {
  // ✅ Verwendet Helper-Funktion mit korrekten Selektoren
  await login(page, TEST_USER.email, TEST_USER.password);
});
```

## 📝 Nächste Schritte

### 1. Test-User erstellen
```bash
# Firebase Console → Authentication → Add User
Email: test@example.com
Password: test1234
```

### 2. Tests korrigieren
```bash
# Alle *.spec.ts Dateien anpassen:
# - `/login` → Verwendung von auth-helper
# - beforeEach → import { login } verwenden
```

### 3. Tests ausführen
```bash
npm run test:e2e:ui   # Visuell debuggen
```

### 4. CRM-Routen verifizieren
- Prüfen ob `/dashboard/contacts/crm/companies` existiert
- Prüfen ob `/dashboard/contacts/crm/contacts` existiert
- Falls nicht → Tests anpassen oder Routen erstellen

## 🎯 Erwartetes Ergebnis nach Fix

```
Running 11 tests using 4 workers

  ✔ CRM Bulk Export › exports all companies
  ✔ CRM Bulk Export › exports selected companies
  ✔ CRM Bulk Export › exports all contacts
  ✔ CRM Bulk Export › exports filtered companies
  ✔ CRM Company + Contact Creation › creates a company and adds a contact
  ✔ CRM Company + Contact Creation › creates multiple contacts
  ✔ CRM Filter and Search › filters companies by type
  ✔ CRM Filter and Search › searches for companies by name
  ✔ CRM Filter and Search › filters contacts by journalist status
  ✔ CRM Filter and Search › combines multiple filters
  ✔ CRM Filter and Search › clears all filters

11 passed (1m 23s)
```

## 📚 Ressourcen

- **Auth Helper:** `e2e/auth-helper.ts`
- **Beispiel-Test:** `e2e/crm-company-contact-creation-FIXED.spec.ts`
- **Login-Page Code:** `src/app/page.tsx` (Zeile 350-416)
- **Playwright Docs:** https://playwright.dev

## ⚡ Quick Fix Command

```bash
# Rename alten Tests (Backup)
mv crm-bulk-export.spec.ts crm-bulk-export.spec.ts.old
mv crm-company-contact-creation.spec.ts crm-company-contact-creation.spec.ts.old
mv crm-filter-search.spec.ts crm-filter-search.spec.ts.old

# Dann: Alle Tests nach FIXED-Pattern neu schreiben
```

---

**Zuletzt aktualisiert:** 2025-10-20
**Status:** 🚧 Work in Progress
**Priorität:** ⚠️ Hoch (Tests komplett nicht funktionsfähig)
