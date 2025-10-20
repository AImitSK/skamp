// e2e/crm-bulk-export.spec.ts
import { test, expect } from '@playwright/test';
import { login, TEST_USER } from './auth-helper';
import * as fs from 'fs';

test.describe('CRM Bulk Export', () => {
  test.beforeEach(async ({ page }) => {
    // ✅ Korrigierter Login mit auth-helper
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('exports all companies', async ({ page }) => {
    // Navigate to companies
    await page.goto('/dashboard/contacts/crm/companies');

    // Wait for data to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Click export button
    const exportButton = page.locator('button', { hasText: /Exportieren|Export/i });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Trigger export
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/companies.*\.csv/i);

    // Save and verify file
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Read file content
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8');

      // Verify CSV headers
      expect(content).toContain('Name');
      expect(content).toContain('Typ');

      // Verify CSV has data rows
      const lines = content.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    }
  });

  test('exports selected companies', async ({ page }) => {
    // Navigate to companies
    await page.goto('/dashboard/contacts/crm/companies');

    // Wait for data to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Select multiple companies
    const checkboxes = await page.locator('table input[type="checkbox"]').all();

    // Select first two companies (skip header)
    if (checkboxes.length > 2) {
      await checkboxes[1].click();
      await checkboxes[2].click();
    }

    // Open bulk actions menu
    await page.click('button:has-text("Aktionen")');

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export selected
    await page.click('text=Export');

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/companies.*\.csv/i);
  });

  test('exports all contacts', async ({ page }) => {
    // Navigate to contacts
    await page.goto('/dashboard/contacts/crm/contacts');

    // Wait for data to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Click export button
    const exportButton = page.locator('button', { hasText: /Exportieren|Export/i });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Trigger export
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/contacts.*\.csv/i);

    // Save and verify file
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Read file content
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8');

      // Verify CSV headers
      expect(content).toContain('Name');
      expect(content).toContain('E-Mail');

      // Verify CSV has data rows
      const lines = content.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    }
  });

  test('exports filtered companies', async ({ page }) => {
    // Navigate to companies
    await page.goto('/dashboard/contacts/crm/companies');

    // Wait for data to load
    await page.waitForSelector('table', { timeout: 10000 });

    // Open filter panel
    await page.click('[aria-label="Filter"]');

    // Select customer filter
    await page.click('text=Kunde');

    // Close filter panel
    await page.click('[aria-label="Filter"]');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    const exportButton = page.locator('button', { hasText: /Exportieren|Export/i });
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/companies.*\.csv/i);

    // Verify only filtered data is exported
    const downloadPath = await download.path();
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8');

      // All exported companies should be type "customer"
      expect(content).toMatch(/customer/i);
    }
  });
});
