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

// Helper-Funktion: Warte auf Team-Settings-Seite
async function waitForTeamPage(page: Page) {
  await page.waitForSelector('h1:has-text("Team-Verwaltung")', { timeout: 10000 });
}

// Helper-Funktion: Login als Admin
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');
}

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
      await loginAsAdmin(page);

      // Navigiere zu Team-Settings
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await waitForTeamPage(page);

      // Prüfe ob Team-Settings-Seite geladen ist
      await expect(page.locator('h1')).toContainText('Team-Verwaltung');
    });

    test('sollte Einladungs-Dialog öffnen können', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await waitForTeamPage(page);

      // Klicke "Mitglied einladen" Button
      const inviteButton = page.locator('button', { hasText: /einladen|invite/i });
      await inviteButton.click();

      // Prüfe ob Dialog-Inhalt sichtbar ist (wartet auf Transition)
      await expect(page.locator('text="Neues Team-Mitglied einladen"')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('sollte Einladungs-Formular ausfüllen und absenden', async ({ page }) => {
      // Console-Logging aktivieren
      page.on('console', msg => console.log('BROWSER:', msg.text()));
      page.on('pageerror', err => console.error('PAGE ERROR:', err));

      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('domcontentloaded');

      // Öffne Dialog
      await page.click('button:has-text("Mitglied einladen")');

      // Warte auf Dialog-Inhalt
      await expect(page.locator('text="Neues Team-Mitglied einladen"')).toBeVisible();

      // Fülle E-Mail aus (Rolle ist standardmäßig "Mitglied")
      await page.fill('input[type="email"]', NEW_USER_EMAIL);

      // Warte kurz, damit Eingabe verarbeitet wird
      await page.waitForTimeout(500);

      // Absenden
      await page.click('button:has-text("Einladung senden")');

      // Warte auf Erfolgs-Toast oder Bestätigung
      await expect(page.locator('text=/einladung.*gesendet|erfolgreich/i')).toBeVisible({
        timeout: 10000
      });

      // Warte etwas, damit die Einladung verarbeitet wird
      await page.waitForTimeout(2000);
    });

    test('sollte eingeladenen User in der Liste sehen', async ({ page }) => {
      // Console-Logging aktivieren
      page.on('console', msg => console.log('BROWSER:', msg.text()));
      page.on('pageerror', err => console.error('PAGE ERROR:', err));
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          console.log('API:', response.status(), response.url());
        }
      });

      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('domcontentloaded');

      // Warte auf Team-Mitglieder-Ladung
      await page.waitForTimeout(3000);

      // Suche nach Email in Team-Liste
      await expect(page.locator(`text="${NEW_USER_EMAIL}"`)).toBeVisible({ timeout: 10000 });

      // Prüfe Status "Eingeladen" ist sichtbar (es gibt mehrere auf der Seite)
      await expect(page.locator('text=/Eingeladen/i').first()).toBeVisible();

      // Prüfe dass "Ausstehende Einladungen" nicht mehr "0" ist
      const pageText = await page.locator('body').textContent();
      const hasNoPendingInvitations = pageText?.includes('Ausstehende Einladungen') && pageText?.match(/Ausstehende Einladungen[^0-9]*0/);
      expect(hasNoPendingInvitations).toBeFalsy();
    });
  });

  test.describe('2. Einladungslink Validierung', () => {
    test('sollte Einladungslink aus Firestore laden', async () => {
      // Lade die Einladung aus Firestore via Script
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`npx tsx scripts/get-invitation-link.ts "${NEW_USER_EMAIL}" 2>&1`);
      // Finde die JSON-Zeile (letzte Zeile, die mit { beginnt)
      const lines = stdout.trim().split('\n');
      const jsonLine = lines.reverse().find(line => line.trim().startsWith('{'));
      const invitationData = JSON.parse(jsonLine!);

      invitationToken = invitationData.token;
      invitationId = invitationData.id;
      invitationLink = invitationData.link;

      console.log('🔗 Invitation Link:', invitationLink);
      console.log('📧 Email:', invitationData.email);
      console.log('🏢 Organization:', invitationData.organizationId);

      expect(invitationLink).toContain('/invite/');
      expect(invitationLink).toContain('?id=');
      expect(invitationToken).toBeTruthy();
      expect(invitationToken).toHaveLength(32); // Token sollte 32 Zeichen haben
    });

    test('sollte Einladungs-Seite laden', async ({ page }) => {
      await page.goto(invitationLink);

      // Warte auf Validierung (Loading-State)
      await page.waitForSelector('text=/einladung/i', { timeout: 10000 });

      // Prüfe dass Seite geladen ist (nicht Error-State)
      await expect(page.locator('text=/team.*einladung/i').first()).toBeVisible();
    });

    test('sollte Einladungs-Details anzeigen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

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
      await page.waitForLoadState('domcontentloaded');

      // Prüfe Formular-Felder
      await expect(page.locator('input[type="text"]')).toBeVisible(); // Name
      await expect(page.locator('input[type="password"]').first()).toBeVisible(); // Passwort
      await expect(page.locator('input[type="password"]').nth(1)).toBeVisible(); // Passwort bestätigen
    });

    test.skip('sollte Validierungen durchführen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Versuche ohne Name
      await page.fill('input[type="password"]', NEW_USER_PASSWORD);
      await page.click('button[type="submit"]');

      // Prüfe Validierungs-Fehler
      await expect(page.locator('text=/name.*erforderlich/i')).toBeVisible({
        timeout: 5000
      });
    });

    test.skip('sollte Passwort-Match prüfen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

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

    test.skip('sollte Account erfolgreich erstellen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Fülle Formular korrekt aus
      await page.fill('input[type="text"]', NEW_USER_NAME);
      await page.fill('input[type="password"]', NEW_USER_PASSWORD);
      await page.locator('input[type="password"]').nth(1).fill(NEW_USER_PASSWORD);

      // Absenden
      await page.click('button[type="submit"]');

      // Warte auf Erfolg + Weiterleitung
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
    });

    test.skip('sollte zum Dashboard weitergeleitet werden', async ({ page }) => {
      // Nach erfolgreicher Account-Erstellung
      await expect(page).toHaveURL(/\/dashboard/);

      // Prüfe Welcome-Message (optional)
      const welcomeParam = new URL(page.url()).searchParams.get('welcome');
      expect(welcomeParam).toBe('true');
    });

    test.skip('sollte eingeloggt sein', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe User-Menü oder Avatar ist sichtbar
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user"], img[alt*="avatar"]');
      await expect(userMenu.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe.skip('4. Bestehender Account Login', () => {
    test('sollte "Bereits Account?" Option anzeigen', async ({ page }) => {
      // Neuer Einladungslink (für zweiten Test-User)
      const secondInvitationLink = `${BASE_URL}/invite/token456?id=member456`;

      await page.goto(secondInvitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Suche nach Login-Option
      const loginLink = page.locator('text=/bereits.*account|bestehend.*account/i');
      await expect(loginLink).toBeVisible();
    });

    test('sollte zu Login-Formular wechseln', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Klicke "Bereits Account" Link
      await page.click('text=/bereits.*account/i');

      // Prüfe nur noch Passwort-Feld sichtbar
      const passwordFields = page.locator('input[type="password"]');
      await expect(passwordFields).toHaveCount(1);
    });

    test('sollte mit bestehendem Account anmelden', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

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

  test.describe.skip('5. Fehlerbehandlung', () => {
    test('sollte ungültigen Token ablehnen', async ({ page }) => {
      const invalidLink = `${BASE_URL}/invite/invalid-token?id=member123`;

      await page.goto(invalidLink);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe Fehler-Message
      await expect(page.locator('text=/ungültig|invalid/i')).toBeVisible();
    });

    test('sollte abgelaufene Einladung ablehnen', async ({ page }) => {
      // Würde in echtem Test über API eine abgelaufene Einladung erstellen
      const expiredLink = `${BASE_URL}/invite/expired-token?id=member999`;

      await page.goto(expiredLink);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe Fehler-Message
      await expect(page.locator('text=/abgelaufen|expired/i')).toBeVisible();
    });

    test('sollte bereits genutzte Einladung ablehnen', async ({ page }) => {
      // Versuche selbe Einladung nochmal zu nutzen
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

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
        await page.waitForLoadState('domcontentloaded');

        await expect(page.locator('text=/ungültig|fehler|error/i')).toBeVisible();
      }
    });
  });

  test.describe.skip('6. Permissions & Security', () => {
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
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'wronguser@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Öffne Einladung für anderen User
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Sollte Warnung anzeigen
      await expect(page.locator('text=/andere.*e-mail|different.*email/i')).toBeVisible();
    });

    test('sollte Abmelde-Option bei falschem User anbieten', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe Logout-Button
      const logoutButton = page.locator('button, a', { hasText: /abmelden|sign.*out/i });
      await expect(logoutButton).toBeVisible();
    });
  });

  test.describe.skip('7. Team-Member Status Prüfung', () => {
    test('sollte neues Mitglied als "active" anzeigen', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('domcontentloaded');

      // Suche neuen User
      const userRow = page.locator(`tr:has-text("${NEW_USER_EMAIL}")`);
      await expect(userRow).toBeVisible();

      // Prüfe Status "Aktiv"
      await expect(userRow).toContainText(/aktiv|active/i);
    });

    test('sollte joinedAt Timestamp haben', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe Beitrittsdatum wird angezeigt
      const userRow = page.locator(`tr:has-text("${NEW_USER_EMAIL}")`);
      const datePattern = /\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2}/;

      await expect(userRow.locator(`text=${datePattern}`)).toBeVisible({
        timeout: 5000
      });
    });
  });

  test.describe.skip('8. Responsive Design', () => {
    test('sollte auf Mobile responsive sein', async ({ page }) => {
      // Setze Mobile Viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe Content ist sichtbar
      await expect(page.locator('text=/einladung/i')).toBeVisible();
      await expect(page.locator('input[type="text"]')).toBeVisible();
    });

    test('sollte auf Tablet responsive sein', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('text=/einladung/i')).toBeVisible();
    });
  });
});

// Helper Functions für E2E Tests
async function createTestInvitation(page: Page) {
  await loginAsAdmin(page);
  await page.goto(`${BASE_URL}/dashboard/settings/team`);
  await page.waitForLoadState('domcontentloaded');
  await page.click('button:has-text("Mitglied einladen")');
  await page.waitForSelector('text="Neues Team-Mitglied einladen"');
  await page.fill('input[type="email"]', NEW_USER_EMAIL);
  await page.click('button:has-text("Einladung senden")');
  await page.waitForSelector('text=/einladung.*gesendet|erfolgreich/i', { timeout: 10000 });
}

async function getInvitationLink(page: Page): Promise<string> {
  // In echtem Test: API-Call oder Firestore-Zugriff
  // Für Mock: Simuliere Link-Struktur
  return `${BASE_URL}/invite/test-token?id=test-member-id`;
}
