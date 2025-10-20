// e2e/auth-helper.ts
// Shared authentication helper for E2E tests

import { Page } from '@playwright/test';

/**
 * Login Helper für E2E-Tests
 *
 * WICHTIG: Die Login-Page ist unter "/" (Root) nicht "/login"!
 */
export async function login(page: Page, email: string, password: string) {
  // Zur Root-Page navigieren (dies ist die Login-Page)
  await page.goto('/');

  // Auf Login-Form warten
  await page.waitForSelector('#email', { timeout: 10000 });

  // Login-Daten eingeben
  await page.fill('#email', email);
  await page.fill('#password', password);

  // Submit-Button klicken (innerhalb der Form)
  await page.click('button[type="submit"]');

  // Warten auf erfolgreichen Login (Redirect zu Dashboard)
  await page.waitForURL('/dashboard/**', { timeout: 15000 });
}

/**
 * Logout Helper für E2E-Tests
 */
export async function logout(page: Page) {
  // TODO: Implementieren sobald Logout-UI existiert
  // Aktuell: Cookies/LocalStorage löschen
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
}

/**
 * Test-User Credentials
 *
 * HINWEIS: Diese Credentials müssen im Firebase-Test-Projekt existieren!
 * Alternative: Vor Tests einen Test-User erstellen
 */
export const TEST_USER = {
  email: 'test@example.com',
  password: 'test1234',
} as const;

/**
 * Prüft ob User eingeloggt ist
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('/dashboard');
}
