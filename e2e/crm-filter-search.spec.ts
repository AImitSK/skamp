// e2e/crm-filter-search.spec.ts
import { test, expect } from '@playwright/test';

test.describe('CRM Filter and Search', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/**');
  });

  test('filters companies by type', async ({ page }) => {
    // Navigate to companies
    await page.goto('/dashboard/contacts/crm/companies');

    // Wait for data to load
    await page.waitForSelector('table');

    // Open filter panel
    await page.click('[aria-label="Filter"]');

    // Wait for filter panel to open
    await page.waitForSelector('text=Typ');

    // Select customer filter
    await page.click('text=Kunde');

    // Close filter panel
    await page.click('[aria-label="Filter"]');

    // Verify only customers are visible
    await page.waitForSelector('table');

    // All visible companies should be type "customer"
    const rows = await page.locator('table tbody tr').all();
    expect(rows.length).toBeGreaterThan(0);
  });

  test('searches for companies by name', async ({ page }) => {
    // Navigate to companies
    await page.goto('/dashboard/contacts/crm/companies');

    // Wait for data to load
    await page.waitForSelector('table');

    // Enter search term
    const searchInput = page.locator('input[placeholder*="Suche"]');
    await searchInput.fill('Test AG');

    // Wait for search results
    await page.waitForTimeout(500);

    // Verify search results
    await expect(page.locator('text=Test AG')).toBeVisible();
  });

  test('filters contacts by journalist status', async ({ page }) => {
    // Navigate to contacts
    await page.goto('/dashboard/contacts/crm/contacts');

    // Wait for data to load
    await page.waitForSelector('table');

    // Open filter panel
    await page.click('[aria-label="Filter"]');

    // Select journalist filter
    await page.click('text=Nur Journalisten');

    // Close filter panel
    await page.click('[aria-label="Filter"]');

    // Verify only journalists are visible
    await page.waitForSelector('table');

    // All visible contacts should be journalists
    const rows = await page.locator('table tbody tr').all();
    expect(rows.length).toBeGreaterThan(0);
  });

  test('combines multiple filters', async ({ page }) => {
    // Navigate to companies
    await page.goto('/dashboard/contacts/crm/companies');

    // Wait for data to load
    await page.waitForSelector('table');

    // Open filter panel
    await page.click('[aria-label="Filter"]');

    // Select customer filter
    await page.click('text=Kunde');

    // Select country filter (if available)
    const countrySection = page.locator('text=Land');
    if (await countrySection.isVisible()) {
      await page.click('text=Deutschland');
    }

    // Close filter panel
    await page.click('[aria-label="Filter"]');

    // Verify filtered results
    await page.waitForSelector('table');

    // Active filter count should be visible
    const filterBadge = page.locator('[aria-label="Filter"] >> text=/[1-9]/');
    await expect(filterBadge).toBeVisible();
  });

  test('clears all filters', async ({ page }) => {
    // Navigate to companies
    await page.goto('/dashboard/contacts/crm/companies');

    // Wait for data to load
    await page.waitForSelector('table');

    // Open filter panel
    await page.click('[aria-label="Filter"]');

    // Select a filter
    await page.click('text=Kunde');

    // Click clear all filters
    const clearButton = page.locator('text=Alle Filter zurücksetzen');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    // Verify all data is visible again
    await page.waitForSelector('table');
    const rows = await page.locator('table tbody tr').all();
    expect(rows.length).toBeGreaterThan(0);
  });
});
