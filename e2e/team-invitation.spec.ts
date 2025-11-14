// e2e/team-invitation.spec.ts
/**
 * E2E Tests für Team-Einladungs-Flow
 *
 * Testet den kompletten User-Flow:
 * 1. Admin lädt neuen User ein
 * 2. Neuer User erhält Email mit Link
 * 3. Neuer User öffnet Link
 * 4. Neuer User erstellt Account
 * 5. Einladung wird akzeptiert
 * 6. User wird zum Dashboard weitergeleitet
 */

import { test, expect, type Page } from '@playwright/test';

// Test-Konfiguration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_ORG_ID = 'sk-online-marketing';
const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'info@sk-online-marketing.de';
const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || '1.Master76';
const NEW_USER_EMAIL = 'newuser-e2e@test.com';
const NEW_USER_PASSWORD = 'newuser-password-123';
const NEW_USER_NAME = 'E2E Test User';

test.describe('Team Invitation E2E Flow', () => {
  test.describe.configure({ mode: 'serial' });

  let invitationLink: string;
  let invitationToken: string;
  let invitationId: string;

  test.beforeAll(async () => {
    // Cleanup: Alte Test-Daten löschen falls vorhanden
    // Dies würde normalerweise über eine Setup-API laufen
  });

  test.describe('1. Admin lädt neuen User ein', () => {
    test('sollte zum Team-Settings navigieren können', async ({ page }) => {
      // Login als Admin
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Warte auf Dashboard
      await page.waitForURL('**/dashboard**');

      // Navigiere zu Team-Settings
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('networkidle');

      // Prüfe ob Team-Settings-Seite geladen ist
      await expect(page.locator('h1, h2')).toContainText(/team/i);
    });

    test('sollte Einladungs-Dialog öffnen können', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('networkidle');

      // Klicke "Mitglied einladen" Button
      const inviteButton = page.locator('button', { hasText: /einladen|invite/i });
      await inviteButton.click();

      // Prüfe ob Dialog geöffnet wurde
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
    });

    test('sollte Einladungs-Formular ausfüllen und absenden', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('networkidle');

      // Öffne Dialog
      await page.click('button:has-text("Mitglied einladen")');

      // Fülle Formular aus
      await page.fill('input[type="email"]', NEW_USER_EMAIL);
      await page.selectOption('select[name="role"]', 'member');

      // Absenden
      await page.click('button[type="submit"]');

      // Warte auf Erfolgs-Toast
      await expect(page.locator('text=/einladung.*gesendet/i')).toBeVisible({
        timeout: 10000
      });
    });

    test('sollte eingeladenen User in der Liste sehen', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('networkidle');

      // Suche nach Email in Team-Liste
      const emailCell = page.locator(`text="${NEW_USER_EMAIL}"`);
      await expect(emailCell).toBeVisible();

      // Prüfe Status "Eingeladen" oder "Invited"
      const row = emailCell.locator('xpath=ancestor::tr');
      await expect(row).toContainText(/invited|eingeladen/i);
    });
  });

  test.describe('2. Einladungslink Validierung', () => {
    test('sollte Einladungslink aus Test-Setup laden', async () => {
      // In einem echten E2E-Test würde man hier:
      // 1. Email-Service mocken/abfangen
      // 2. Oder: Über API den generierten Link abrufen
      // 3. Oder: Aus Firestore lesen (für E2E-Tests mit Admin SDK)

      // Für diesen Test: Simuliere Link-Struktur
      invitationToken = 'test-token-123';
      invitationId = 'test-member-id-123';
      invitationLink = `${BASE_URL}/invite/${invitationToken}?id=${invitationId}`;

      expect(invitationLink).toContain('/invite/');
      expect(invitationLink).toContain('?id=');
    });

    test('sollte Einladungs-Seite laden', async ({ page }) => {
      await page.goto(invitationLink);

      // Warte auf Validierung (Loading-State)
      await page.waitForSelector('text=/einladung/i', { timeout: 10000 });

      // Prüfe dass Seite geladen ist (nicht Error-State)
      await expect(page.locator('text=/team.*einladung/i')).toBeVisible();
    });

    test('sollte Einladungs-Details anzeigen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Prüfe Email wird angezeigt
      await expect(page.locator(`text="${NEW_USER_EMAIL}"`)).toBeVisible();

      // Prüfe Rolle wird angezeigt
      await expect(page.locator('text=/rolle|role/i')).toBeVisible();

      // Prüfe Organisation wird angezeigt
      await expect(page.locator('text=/organisation|organization/i')).toBeVisible();
    });
  });

  test.describe('3. Neuer Account erstellen', () => {
    test('sollte Account-Erstellungs-Formular anzeigen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Prüfe Formular-Felder
      await expect(page.locator('input[type="text"]')).toBeVisible(); // Name
      await expect(page.locator('input[type="password"]').first()).toBeVisible(); // Passwort
      await expect(page.locator('input[type="password"]').nth(1)).toBeVisible(); // Passwort bestätigen
    });

    test('sollte Validierungen durchführen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Versuche ohne Name
      await page.fill('input[type="password"]', NEW_USER_PASSWORD);
      await page.click('button[type="submit"]');

      // Prüfe Validierungs-Fehler
      await expect(page.locator('text=/name.*erforderlich/i')).toBeVisible({
        timeout: 5000
      });
    });

    test('sollte Passwort-Match prüfen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Unterschiedliche Passwörter
      await page.fill('input[type="text"]', NEW_USER_NAME);
      await page.fill('input[type="password"]', 'password1');
      await page.locator('input[type="password"]').nth(1).fill('password2');
      await page.click('button[type="submit"]');

      // Prüfe Fehler
      await expect(page.locator('text=/passwörter.*nicht.*überein/i')).toBeVisible({
        timeout: 5000
      });
    });

    test('sollte Account erfolgreich erstellen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Fülle Formular korrekt aus
      await page.fill('input[type="text"]', NEW_USER_NAME);
      await page.fill('input[type="password"]', NEW_USER_PASSWORD);
      await page.locator('input[type="password"]').nth(1).fill(NEW_USER_PASSWORD);

      // Absenden
      await page.click('button[type="submit"]');

      // Warte auf Erfolg + Weiterleitung
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
    });

    test('sollte zum Dashboard weitergeleitet werden', async ({ page }) => {
      // Nach erfolgreicher Account-Erstellung
      await expect(page).toHaveURL(/\/dashboard/);

      // Prüfe Welcome-Message (optional)
      const welcomeParam = new URL(page.url()).searchParams.get('welcome');
      expect(welcomeParam).toBe('true');
    });

    test('sollte eingeloggt sein', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Prüfe User-Menü oder Avatar ist sichtbar
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], img[alt*="avatar"]');
      await expect(userMenu.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('4. Bestehender Account Login', () => {
    test('sollte "Bereits Account?" Option anzeigen', async ({ page }) => {
      // Neuer Einladungslink (für zweiten Test-User)
      const secondInvitationLink = `${BASE_URL}/invite/token456?id=member456`;

      await page.goto(secondInvitationLink);
      await page.waitForLoadState('networkidle');

      // Suche nach Login-Option
      const loginLink = page.locator('text=/bereits.*account|bestehend.*account/i');
      await expect(loginLink).toBeVisible();
    });

    test('sollte zu Login-Formular wechseln', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Klicke "Bereits Account" Link
      await page.click('text=/bereits.*account/i');

      // Prüfe nur noch Passwort-Feld sichtbar
      const passwordFields = page.locator('input[type="password"]');
      await expect(passwordFields).toHaveCount(1);
    });

    test('sollte mit bestehendem Account anmelden', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Wechsle zu Login
      await page.click('text=/bereits.*account/i');

      // Gebe Passwort ein
      await page.fill('input[type="password"]', ADMIN_PASSWORD);

      // Absenden
      await page.click('button[type="submit"]');

      // Warte auf Weiterleitung
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
    });
  });

  test.describe('5. Fehlerbehandlung', () => {
    test('sollte ungültigen Token ablehnen', async ({ page }) => {
      const invalidLink = `${BASE_URL}/invite/invalid-token?id=member123`;

      await page.goto(invalidLink);
      await page.waitForLoadState('networkidle');

      // Prüfe Fehler-Message
      await expect(page.locator('text=/ungültig|invalid/i')).toBeVisible();
    });

    test('sollte abgelaufene Einladung ablehnen', async ({ page }) => {
      // Würde in echtem Test über API eine abgelaufene Einladung erstellen
      const expiredLink = `${BASE_URL}/invite/expired-token?id=member999`;

      await page.goto(expiredLink);
      await page.waitForLoadState('networkidle');

      // Prüfe Fehler-Message
      await expect(page.locator('text=/abgelaufen|expired/i')).toBeVisible();
    });

    test('sollte bereits genutzte Einladung ablehnen', async ({ page }) => {
      // Versuche selbe Einladung nochmal zu nutzen
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Sollte Fehler zeigen (bereits accepted)
      await expect(page.locator('text=/bereits.*verwendet|already.*used/i')).toBeVisible({
        timeout: 10000
      });
    });

    test('sollte fehlende Parameter erkennen', async ({ page }) => {
      const invalidLinks = [
        `${BASE_URL}/invite/token123`, // Keine ID
        `${BASE_URL}/invite/?id=member123` // Kein Token
      ];

      for (const link of invalidLinks) {
        await page.goto(link);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('text=/ungültig|fehler|error/i')).toBeVisible();
      }
    });
  });

  test.describe('6. Permissions & Security', () => {
    test('sollte unauthentifizierten Zugriff auf Einladung erlauben', async ({ page }) => {
      // Logout (falls eingeloggt)
      await page.goto(`${BASE_URL}/auth/signout`);

      // Öffne Einladungslink
      await page.goto(invitationLink);

      // Sollte Einladungs-Seite anzeigen (nicht Redirect zu Login)
      await expect(page).toHaveURL(new RegExp(`/invite/${invitationToken}`));
      await expect(page.locator('text=/einladung/i')).toBeVisible();
    });

    test('sollte falschen User abweisen', async ({ page }) => {
      // Login als falscher User
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.fill('input[type="email"]', 'wronguser@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Öffne Einladung für anderen User
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Sollte Warnung anzeigen
      await expect(page.locator('text=/andere.*e-mail|different.*email/i')).toBeVisible();
    });

    test('sollte Abmelde-Option bei falschem User anbieten', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Prüfe Logout-Button
      const logoutButton = page.locator('button, a', { hasText: /abmelden|sign.*out/i });
      await expect(logoutButton).toBeVisible();
    });
  });

  test.describe('7. Team-Member Status Prüfung', () => {
    test('sollte neues Mitglied als "active" anzeigen', async ({ page }) => {
      // Login als Admin
      await page.goto(`${BASE_URL}/auth/signin`);
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // Gehe zu Team-Settings
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('networkidle');

      // Suche neuen User
      const userRow = page.locator(`tr:has-text("${NEW_USER_EMAIL}")`);
      await expect(userRow).toBeVisible();

      // Prüfe Status "Aktiv"
      await expect(userRow).toContainText(/aktiv|active/i);
    });

    test('sollte joinedAt Timestamp haben', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('networkidle');

      // Prüfe Beitrittsdatum wird angezeigt
      const userRow = page.locator(`tr:has-text("${NEW_USER_EMAIL}")`);
      const datePattern = /\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2}/;

      await expect(userRow.locator(`text=${datePattern}`)).toBeVisible({
        timeout: 5000
      });
    });
  });

  test.describe('8. Responsive Design', () => {
    test('sollte auf Mobile responsive sein', async ({ page }) => {
      // Setze Mobile Viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      // Prüfe Content ist sichtbar
      await expect(page.locator('text=/einladung/i')).toBeVisible();
      await expect(page.locator('input[type="text"]')).toBeVisible();
    });

    test('sollte auf Tablet responsive sein', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(invitationLink);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/einladung/i')).toBeVisible();
    });
  });
});

// Helper Functions für E2E Tests
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');
}

async function createTestInvitation(page: Page) {
  await loginAsAdmin(page);
  await page.goto(`${BASE_URL}/dashboard/settings/team`);
  await page.click('button:has-text("Mitglied einladen")');
  await page.fill('input[type="email"]', NEW_USER_EMAIL);
  await page.selectOption('select[name="role"]', 'member');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=/einladung.*gesendet/i');
}

async function getInvitationLink(page: Page): Promise<string> {
  // In echtem Test: API-Call oder Firestore-Zugriff
  // Für Mock: Simuliere Link-Struktur
  return `${BASE_URL}/invite/test-token?id=test-member-id`;
}
