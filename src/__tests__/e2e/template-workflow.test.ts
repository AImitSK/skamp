// src/__tests__/e2e/template-workflow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Template System E2E Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('/api/auth/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { 
            id: 'test-user', 
            email: 'test@example.com',
            organizationId: 'test-org'
          }
        })
      });
    });

    // Mock template API responses
    await page.route('/api/templates', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          templates: [
            {
              id: 'modern-professional',
              name: 'Modern Professional',
              description: 'Clean and modern design',
              version: '1.0.0',
              isDefault: true
            },
            {
              id: 'classic-elegant',
              name: 'Classic Elegant',
              description: 'Traditional business layout',
              version: '1.0.0',
              isDefault: false
            }
          ]
        })
      });
    });

    // Mock PDF generation API
    await page.route('/api/generate-pdf', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          pdfBase64: 'bW9ja1BERkRhdGE=', // Mock base64 PDF
          fileName: 'test-campaign.pdf',
          metadata: {
            templateId: 'modern-professional',
            templateName: 'Modern Professional',
            renderMethod: 'template'
          }
        })
      });
    });
  });

  test('complete template workflow - settings to campaign', async ({ page }) => {
    // 1. Navigate to Template Settings
    await page.goto('/dashboard/settings/templates');
    
    await expect(page.getByText('PDF Templates')).toBeVisible();
    await expect(page.getByText('Modern Professional')).toBeVisible();
    await expect(page.getByText('Classic Elegant')).toBeVisible();

    // 2. Preview a template
    const modernTemplateCard = page.locator('[data-testid="template-card-modern-professional"]');
    await modernTemplateCard.getByRole('button', { name: /vorschau/i }).click();
    
    await expect(page.getByText('Template-Vorschau: Modern Professional')).toBeVisible();
    await page.getByRole('button', { name: /schließen/i }).click();

    // 3. Set template as default
    const classicTemplateCard = page.locator('[data-testid="template-card-classic-elegant"]');
    await classicTemplateCard.getByRole('button', { name: /als standard/i }).click();
    
    await expect(page.getByText('Template erfolgreich als Standard gesetzt')).toBeVisible();

    // 4. Navigate to Campaign Creation
    await page.goto('/dashboard/pr-tools/campaigns/campaigns/new');
    
    await expect(page.getByText('Neue Kampagne erstellen')).toBeVisible();

    // 5. Fill out campaign steps
    // Step 1: Basic Info
    await page.fill('input[name="campaignTitle"]', 'E2E Test Campaign');
    await page.selectOption('select[name="companyId"]', 'test-company');
    await page.click('button:has-text("Weiter")');

    // Step 2: Content
    await page.fill('[data-testid="content-editor"]', 'This is test content for E2E testing.');
    await page.click('button:has-text("Weiter")');

    // Step 3: Recipients (skip for this test)
    await page.click('button:has-text("Weiter")');

    // Step 4: Preview & Template Selection
    await expect(page.getByText('Vorschau & Template')).toBeVisible();
    
    // Should show default template (Classic Elegant from step 3)
    await expect(page.getByText('Aktuelles Template: Classic Elegant')).toBeVisible();

    // Change template
    await page.click('button:has-text("Template auswählen")');
    await expect(page.getByText('Template auswählen')).toBeVisible();
    
    await page.click('[data-testid="template-option-modern-professional"]');
    await expect(page.getByText('Template: Modern Professional')).toBeVisible();

    // Generate PDF with selected template
    await page.click('button:has-text("PDF generieren")');
    
    // Wait for PDF generation
    await expect(page.getByText('PDF wird generiert')).toBeVisible();
    await expect(page.getByText('PDF erfolgreich generiert')).toBeVisible();
    
    // Verify PDF metadata
    await expect(page.getByText('Template: Modern Professional')).toBeVisible();
    await expect(page.getByText('Render-Methode: template')).toBeVisible();

    // Download PDF
    const downloadPromise = page.waitForDownload();
    await page.click('button:has-text("PDF herunterladen")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBe('test-campaign.pdf');
  });

  test('template customization workflow', async ({ page }) => {
    await page.goto('/dashboard/settings/templates');
    
    // Create custom template
    await page.click('button:has-text("Custom Template erstellen")');
    await expect(page.getByText('Template erstellen')).toBeVisible();

    // Fill template details
    await page.fill('input[name="templateName"]', 'Custom E2E Template');
    await page.fill('textarea[name="templateDescription"]', 'Custom template for E2E testing');

    // Customize colors
    await page.click('[data-testid="color-scheme-tab"]');
    await page.fill('input[name="primaryColor"]', '#ff0000');
    await page.fill('input[name="secondaryColor"]', '#00ff00');

    // Customize typography
    await page.click('[data-testid="typography-tab"]');
    await page.selectOption('select[name="primaryFont"]', 'Georgia');
    await page.fill('input[name="baseFontSize"]', '12');

    // Preview changes
    await page.click('button:has-text("Vorschau")');
    await expect(page.getByText('Live-Vorschau')).toBeVisible();
    
    // Should show custom colors in preview
    const previewElement = page.locator('[data-testid="template-preview"]');
    await expect(previewElement).toHaveCSS('--template-primary', '#ff0000');

    // Save template
    await page.click('button:has-text("Template speichern")');
    await expect(page.getByText('Template erfolgreich gespeichert')).toBeVisible();

    // Verify template appears in list
    await expect(page.getByText('Custom E2E Template')).toBeVisible();
  });

  test('template analytics workflow', async ({ page }) => {
    // Mock analytics data
    await page.route('/api/v1/pdf-templates/analytics**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          usageStats: [
            {
              templateId: 'modern-professional',
              templateName: 'Modern Professional',
              usageCount: 150,
              lastUsed: new Date().toISOString(),
              isDefault: true,
              isSystem: true,
              averageGenerationTime: 1200
            }
          ],
          performanceMetrics: [
            {
              templateId: 'modern-professional',
              averageRenderTime: 450,
              averagePdfGenerationTime: 1200,
              cacheHitRate: 85,
              errorRate: 2,
              totalUsages: 150
            }
          ]
        })
      });
    });

    await page.goto('/dashboard/settings/templates/analytics');
    
    await expect(page.getByText('Template-Analytics')).toBeVisible();
    await expect(page.getByText('Modern Professional')).toBeVisible();
    await expect(page.getByText('150 Verwendungen')).toBeVisible();

    // Check performance metrics
    await expect(page.getByText('Performance-Metriken')).toBeVisible();
    await expect(page.getByText('1.2s')).toBeVisible(); // Generation time
    await expect(page.getByText('85%')).toBeVisible(); // Cache hit rate

    // Filter by time range
    await page.selectOption('select[name="timeRange"]', '90d');
    await expect(page.locator('select[name="timeRange"]')).toHaveValue('90d');

    // Export analytics
    const downloadPromise = page.waitForDownload();
    await page.click('button:has-text("Exportieren")');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('template-analytics');
  });

  test('error handling in template workflow', async ({ page }) => {
    // Mock template loading error
    await page.route('/api/templates', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    await page.goto('/dashboard/settings/templates');
    
    await expect(page.getByText('Fehler beim Laden der Templates')).toBeVisible();
    
    // Should show retry button
    await page.click('button:has-text("Erneut versuchen")');
    
    // Should attempt to reload templates
    await expect(page.getByText('Templates werden geladen')).toBeVisible();
  });

  test('template validation workflow', async ({ page }) => {
    await page.goto('/dashboard/settings/templates');
    
    // Try to create invalid template
    await page.click('button:has-text("Custom Template erstellen")');
    
    // Try to save without required fields
    await page.click('button:has-text("Template speichern")');
    
    await expect(page.getByText('Template-Name ist erforderlich')).toBeVisible();
    await expect(page.getByText('Template-Beschreibung ist erforderlich')).toBeVisible();

    // Fill invalid color values
    await page.fill('input[name="templateName"]', 'Invalid Template');
    await page.fill('textarea[name="templateDescription"]', 'Description');
    await page.fill('input[name="primaryColor"]', 'invalid-color');
    
    await page.click('button:has-text("Template speichern")');
    
    await expect(page.getByText('Ungültige Farbwerte')).toBeVisible();
  });
});