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
    // Cleanup: Test-User löschen falls vorhanden
    const { execSync } = require('child_process');
    try {
      execSync(`npx tsx scripts/cleanup-test-user.ts "${NEW_USER_EMAIL}"`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log('Cleanup failed or user did not exist');
    }
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
      await loginAsAdmin(page);
      await page.goto(`${BASE_URL}/dashboard/settings/team`);
      await page.waitForLoadState('domcontentloaded');

      // Warte auf Team-Mitglieder-Ladung
      await page.waitForTimeout(3000);

      // Prüfe dass der User in der Team-Liste sichtbar ist
      await expect(page.locator(`text="${NEW_USER_EMAIL}"`)).toBeVisible({ timeout: 10000 });
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

  test.describe('3. Permissions & Security', () => {
    test('sollte unauthentifizierten Zugriff auf Einladung erlauben', async ({ page }) => {
      // Logout (falls eingeloggt)
      await page.goto(`${BASE_URL}/auth/signout`);

      // Öffne Einladungslink
      await page.goto(invitationLink);

      // Sollte Einladungs-Seite anzeigen (nicht Redirect zu Login)
      await expect(page).toHaveURL(new RegExp(`/invite/${invitationToken}`));
      await expect(page.locator('text=/einladung/i')).toBeVisible();
    });
  });

  test.describe('4. Neuer Account erstellen', () => {
    test('sollte Account-Erstellungs-Formular anzeigen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe Formular-Felder
      await expect(page.locator('input[type="text"]')).toBeVisible(); // Name
      await expect(page.locator('input[type="password"]').first()).toBeVisible(); // Passwort
      await expect(page.locator('input[type="password"]').nth(1)).toBeVisible(); // Passwort bestätigen
    });

    test('sollte Validierungen durchführen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Prüfe dass Button initially disabled ist (keine Eingaben)
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();

      // Fülle nur Passwort (Name fehlt)
      await page.fill('input[type="password"]', NEW_USER_PASSWORD);

      // Button sollte immer noch disabled sein
      await expect(submitButton).toBeDisabled();
    });

    test('sollte Passwort-Match prüfen', async ({ page }) => {
      await page.goto(invitationLink);
      await page.waitForLoadState('domcontentloaded');

      // Unterschiedliche Passwörter eingeben
      await page.fill('input[type="text"]', NEW_USER_NAME);
      await page.locator('input[type="password"]').nth(0).fill('password1');
      await page.locator('input[type="password"]').nth(1).fill('password2');

      // Versuche zu submitten
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Fehlermeldung sollte erscheinen
      await expect(page.locator('text=/Passwörter stimmen nicht überein/i')).toBeVisible({ timeout: 3000 });
    });

    test('sollte Account erfolgreich erstellen und zum Dashboard weiterleiten', async ({ page }) => {
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

      // Prüfe URL und Welcome-Parameter
      await expect(page).toHaveURL(/\/dashboard/);
      const welcomeParam = new URL(page.url()).searchParams.get('welcome');
      expect(welcomeParam).toBe('true');
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
