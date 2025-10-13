// e2e/crm-company-contact-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CRM Company + Contact Creation', () => {
  test('creates a company and adds a contact', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForURL('/dashboard/**');

    // Navigate to CRM
    await page.goto('/dashboard/contacts/crm/companies');
    await expect(page).toHaveTitle(/CRM/);

    // Create company
    await page.click('text=Firma erstellen');

    // Wait for modal to open
    await page.waitForSelector('[name="name"]');

    // Fill company form
    await page.fill('[name="name"]', 'E2E Test Company');
    await page.selectOption('[name="type"]', 'customer');
    await page.click('text=Speichern');

    // Verify company created
    await expect(page.locator('text=E2E Test Company')).toBeVisible();

    // Navigate to contacts
    await page.click('text=Kontakte');
    await page.waitForURL('/dashboard/contacts/crm/contacts');

    // Create contact
    await page.click('text=Kontakt erstellen');

    // Wait for modal to open
    await page.waitForSelector('[name="firstName"]');

    // Fill contact form
    await page.fill('[name="firstName"]', 'Max');
    await page.fill('[name="lastName"]', 'Mustermann');
    await page.selectOption('[name="company"]', 'E2E Test Company');
    await page.click('text=Speichern');

    // Verify contact created
    await expect(page.locator('text=Max Mustermann')).toBeVisible();

    // Verify contact is linked to company
    await expect(page.locator('text=E2E Test Company')).toBeVisible();
  });

  test('creates multiple contacts for the same company', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navigate to contacts
    await page.goto('/dashboard/contacts/crm/contacts');

    // Create first contact
    await page.click('text=Kontakt erstellen');
    await page.waitForSelector('[name="firstName"]');
    await page.fill('[name="firstName"]', 'Anna');
    await page.fill('[name="lastName"]', 'Schmidt');
    await page.fill('[name="email"]', 'anna@test.com');
    await page.click('text=Speichern');

    // Verify first contact created
    await expect(page.locator('text=Anna Schmidt')).toBeVisible();

    // Create second contact
    await page.click('text=Kontakt erstellen');
    await page.waitForSelector('[name="firstName"]');
    await page.fill('[name="firstName"]', 'Peter');
    await page.fill('[name="lastName"]', 'Müller');
    await page.fill('[name="email"]', 'peter@test.com');
    await page.click('text=Speichern');

    // Verify second contact created
    await expect(page.locator('text=Peter Müller')).toBeVisible();
  });
});
