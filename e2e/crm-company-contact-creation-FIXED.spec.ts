// e2e/crm-company-contact-creation-FIXED.spec.ts
// KORRIGIERTE VERSION mit richtigem Login

import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth-helper';

test.describe('CRM Company + Contact Creation (FIXED)', () => {
  test('creates a company and adds a contact', async ({ page }) => {
    // ✅ Korrigierter Login (verwendet "/" statt "/login")
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to CRM
    await page.goto('/dashboard/contacts/crm/companies');

    // Warte auf Seitenladevorgang
    await expect(page).toHaveURL(/.*\/companies/);

    // Create company
    await page.click('text=Firma erstellen');

    // Wait for modal to open
    await page.waitForSelector('[name="name"]', { timeout: 5000 });

    // Fill company form
    await page.fill('[name="name"]', 'E2E Test Company');
    await page.selectOption('[name="type"]', 'customer');
    await page.click('text=Speichern');

    // Verify company created
    await expect(page.locator('text=E2E Test Company')).toBeVisible({ timeout: 10000 });

    // Navigate to contacts
    await page.click('text=Kontakte');
    await page.waitForURL(/.*\/contacts/, { timeout: 5000 });

    // Create contact
    await page.click('text=Kontakt erstellen');

    // Wait for modal to open
    await page.waitForSelector('[name="firstName"]', { timeout: 5000 });

    // Fill contact form
    await page.fill('[name="firstName"]', 'Max');
    await page.fill('[name="lastName"]', 'Mustermann');
    await page.selectOption('[name="company"]', 'E2E Test Company');
    await page.click('text=Speichern');

    // Verify contact created
    await expect(page.locator('text=Max Mustermann')).toBeVisible({ timeout: 10000 });

    // Verify contact is linked to company
    await expect(page.locator('text=E2E Test Company')).toBeVisible();
  });

  test('creates multiple contacts for the same company', async ({ page }) => {
    // ✅ Korrigierter Login
    await login(page, TEST_USER.email, TEST_USER.password);

    // Navigate to contacts
    await page.goto('/dashboard/contacts/crm/contacts');
    await page.waitForURL(/.*\/contacts/);

    // Create first contact
    await page.click('text=Kontakt erstellen');
    await page.waitForSelector('[name="firstName"]', { timeout: 5000 });
    await page.fill('[name="firstName"]', 'Anna');
    await page.fill('[name="lastName"]', 'Schmidt');
    await page.fill('[name="email"]', 'anna@test.com');
    await page.click('text=Speichern');

    // Verify first contact created
    await expect(page.locator('text=Anna Schmidt')).toBeVisible({ timeout: 10000 });

    // Create second contact
    await page.click('text=Kontakt erstellen');
    await page.waitForSelector('[name="firstName"]', { timeout: 5000 });
    await page.fill('[name="firstName"]', 'Peter');
    await page.fill('[name="lastName"]', 'Müller');
    await page.fill('[name="email"]', 'peter@test.com');
    await page.click('text=Speichern');

    // Verify second contact created
    await expect(page.locator('text=Peter Müller')).toBeVisible({ timeout: 10000 });
  });
});
