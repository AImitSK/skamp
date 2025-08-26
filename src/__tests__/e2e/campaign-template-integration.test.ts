// src/__tests__/e2e/campaign-template-integration.test.ts
import { test, expect } from '@playwright/test';

test.describe('Campaign Template Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and organization context
    await page.addInitScript(() => {
      window.localStorage.setItem('currentOrganization', JSON.stringify({
        id: 'test-org',
        name: 'Test Organization'
      }));
    });

    // Mock all template-related API endpoints
    await page.route('/api/templates**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          templates: [
            {
              id: 'modern-professional',
              name: 'Modern Professional',
              description: 'Clean and professional layout',
              version: '1.0.0',
              isDefault: true,
              isSystem: true
            },
            {
              id: 'classic-elegant', 
              name: 'Classic Elegant',
              description: 'Traditional business design',
              version: '1.0.0',
              isDefault: false,
              isSystem: true
            }
          ]
        })
      });
    });

    await page.route('/api/v1/pdf-templates**', route => {
      const url = new URL(route.request().url());
      
      if (url.pathname.includes('/preview')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            html: `
              <html>
                <head><title>Template Preview</title></head>
                <body style="--template-primary: #005fab;">
                  <h1>Template Preview</h1>
                  <p>This is a preview of the selected template</p>
                </body>
              </html>
            `,
            templateName: 'Modern Professional'
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            templates: []
          })
        });
      }
    });
  });

  test('campaign creation with template selection', async ({ page }) => {
    await page.goto('/dashboard/pr-tools/campaigns/campaigns/new');
    
    // Step 1: Campaign Info
    await page.fill('[data-testid="campaign-title"]', 'Template Integration Test Campaign');
    await page.selectOption('[data-testid="company-selector"]', 'test-company');
    
    await page.click('button:has-text("Weiter")');

    // Step 2: Content Creation
    await page.fill('[data-testid="content-editor"]', 'Test content for template integration.');
    
    // Add keywords
    await page.fill('[data-testid="keywords-input"]', 'template, integration, test');
    await page.click('button:has-text("Keyword hinzufügen")');

    // Add boilerplate section
    await page.click('button:has-text("+ Textbaustein")');
    await page.click('[data-testid="boilerplate-option-company-info"]');
    
    await page.click('button:has-text("Weiter")');

    // Step 3: Recipients (skip)
    await page.click('button:has-text("Weiter")');

    // Step 4: Preview with Template Selection
    await expect(page.getByText('Vorschau & Template')).toBeVisible();
    
    // Should show current template
    await expect(page.getByText(/aktuelles template/i)).toBeVisible();

    // Open template selector
    await page.click('[data-testid="template-selector-button"]');
    await expect(page.getByText('Template auswählen')).toBeVisible();

    // Should show available templates
    await expect(page.getByText('Modern Professional')).toBeVisible();
    await expect(page.getByText('Classic Elegant')).toBeVisible();

    // Preview a template
    const modernTemplateCard = page.locator('[data-testid="template-card-modern-professional"]');
    await modernTemplateCard.getByRole('button', { name: /vorschau/i }).click();
    
    await expect(page.getByText('Template-Vorschau')).toBeVisible();
    await expect(page.locator('[data-testid="template-preview-iframe"]')).toBeVisible();
    
    await page.click('button:has-text("Vorschau schließen")');

    // Select template
    await modernTemplateCard.getByRole('button', { name: /auswählen/i }).click();
    
    // Verify template selection
    await expect(page.getByText('Template: Modern Professional')).toBeVisible();

    // Campaign preview should update with template styles
    const previewContainer = page.locator('[data-testid="campaign-preview"]');
    await expect(previewContainer).toBeVisible();
    
    // Should show template-styled content
    await expect(previewContainer.locator('.title')).toHaveCSS('color', 'rgb(0, 95, 171)'); // #005fab
  });

  test('template customization in campaign workflow', async ({ page }) => {
    await page.goto('/dashboard/pr-tools/campaigns/campaigns/new');
    
    // Navigate to Step 4 (simplified)
    await page.fill('[data-testid="campaign-title"]', 'Customization Test');
    await page.click('button:has-text("Weiter")');
    await page.fill('[data-testid="content-editor"]', 'Content');
    await page.click('button:has-text("Weiter")');
    await page.click('button:has-text("Weiter")');

    // Select template
    await page.click('[data-testid="template-selector-button"]');
    await page.click('[data-testid="template-card-modern-professional"] button:has-text("Auswählen")');

    // Access template customization
    await page.click('[data-testid="template-customize-button"]');
    await expect(page.getByText('Template-Anpassungen')).toBeVisible();

    // Customize colors
    await page.click('[data-testid="customization-tab-colors"]');
    const primaryColorInput = page.locator('input[name="primaryColor"]');
    await primaryColorInput.fill('#ff0000');

    // Should show live preview update
    await expect(page.locator('[data-testid="live-preview"]')).toHaveCSS('--template-primary', '#ff0000');

    // Customize typography
    await page.click('[data-testid="customization-tab-typography"]');
    await page.selectOption('select[name="primaryFont"]', 'Georgia');
    await page.fill('input[name="baseFontSize"]', '12');

    // Apply customizations
    await page.click('button:has-text("Anpassungen übernehmen")');
    
    // Verify customizations applied to campaign preview
    const campaignPreview = page.locator('[data-testid="campaign-preview"]');
    await expect(campaignPreview).toHaveCSS('--template-primary', '#ff0000');
    await expect(campaignPreview).toHaveCSS('font-family', /Georgia/);
  });

  test('PDF generation with custom template', async ({ page }) => {
    // Mock PDF generation with template info
    await page.route('/api/generate-pdf', route => {
      const requestBody = route.request().postDataJSON();
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          pdfBase64: 'bW9ja1BERkRhdGE=',
          fileName: 'template-test.pdf',
          fileSize: 153600,
          metadata: {
            generatedAt: new Date().toISOString(),
            wordCount: 50,
            pageCount: 1,
            generationTimeMs: 1500,
            templateId: requestBody.templateId,
            templateName: 'Modern Professional',
            templateVersion: '1.0.0',
            cssInjectionTime: 200,
            renderMethod: 'template'
          }
        })
      });
    });

    await page.goto('/dashboard/pr-tools/campaigns/campaigns/new');
    
    // Quick navigation to Step 4
    await page.fill('[data-testid="campaign-title"]', 'PDF Generation Test');
    await page.click('button:has-text("Weiter")');
    await page.fill('[data-testid="content-editor"]', 'Content for PDF generation test.');
    await page.click('button:has-text("Weiter")');
    await page.click('button:has-text("Weiter")');

    // Select template
    await page.click('[data-testid="template-selector-button"]');
    await page.click('[data-testid="template-card-classic-elegant"] button:has-text("Auswählen")');

    // Generate PDF
    await page.click('[data-testid="generate-pdf-button"]');
    
    // Should show generation progress
    await expect(page.getByText(/pdf wird generiert/i)).toBeVisible();
    await expect(page.locator('[data-testid="pdf-generation-progress"]')).toBeVisible();

    // Wait for completion
    await expect(page.getByText('PDF erfolgreich generiert')).toBeVisible();

    // Should show PDF metadata
    await expect(page.getByText('Template: Modern Professional')).toBeVisible();
    await expect(page.getByText('Generierungszeit: 1.5s')).toBeVisible();
    await expect(page.getByText('Render-Methode: template')).toBeVisible();
    await expect(page.getByText('CSS-Injection: 200ms')).toBeVisible();

    // Should enable download
    const downloadButton = page.getByRole('button', { name: /pdf herunterladen/i });
    await expect(downloadButton).toBeEnabled();
    
    // Test download
    const downloadPromise = page.waitForDownload();
    await downloadButton.click();
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toBe('template-test.pdf');
  });

  test('template persistence across campaign edits', async ({ page }) => {
    // Mock campaign data with template
    await page.route('/api/campaigns/test-campaign', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-campaign',
          title: 'Existing Campaign',
          content: 'Existing content',
          templateId: 'classic-elegant',
          templateCustomizations: {
            colorScheme: {
              primary: '#ff0000'
            }
          }
        })
      });
    });

    await page.goto('/dashboard/pr-tools/campaigns/campaigns/edit/test-campaign');
    
    // Should load with saved template
    await expect(page.getByText('Template: Classic Elegant')).toBeVisible();
    
    // Should preserve customizations
    const customizedElement = page.locator('[data-testid="template-preview"]');
    await expect(customizedElement).toHaveCSS('--template-primary', '#ff0000');

    // Make changes to campaign
    await page.fill('[data-testid="campaign-title"]', 'Updated Campaign Title');
    
    // Save campaign
    await page.click('button:has-text("Kampagne speichern")');
    
    // Should preserve template settings
    await expect(page.getByText('Template: Classic Elegant')).toBeVisible();
  });

  test('template compatibility with different content types', async ({ page }) => {
    await page.goto('/dashboard/pr-tools/campaigns/campaigns/new');
    
    // Create campaign with rich content
    await page.fill('[data-testid="campaign-title"]', 'Rich Content Test');
    await page.click('button:has-text("Weiter")');

    // Add complex content
    const editor = page.locator('[data-testid="content-editor"]');
    await editor.fill(`
      <h2>Main Heading</h2>
      <p>This is a paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
      <ul>
        <li>List item 1</li>
        <li>List item 2</li>
      </ul>
      <blockquote>This is a quote block</blockquote>
    `);

    // Add key visual
    await page.click('[data-testid="add-key-visual"]');
    await page.fill('[data-testid="key-visual-url"]', 'https://example.com/image.jpg');
    await page.fill('[data-testid="key-visual-caption"]', 'Test image caption');

    // Add multiple boilerplate sections
    await page.click('button:has-text("+ Textbaustein")');
    await page.click('[data-testid="boilerplate-company"]');
    
    await page.click('button:has-text("+ Textbaustein")');
    await page.click('[data-testid="boilerplate-contact"]');

    await page.click('button:has-text("Weiter")');
    await page.click('button:has-text("Weiter")');

    // Select template and verify all content renders correctly
    await page.click('[data-testid="template-selector-button"]');
    await page.click('[data-testid="template-card-modern-professional"] button:has-text("Auswählen")');

    // Verify all content elements are styled correctly
    const preview = page.locator('[data-testid="campaign-preview"]');
    
    await expect(preview.locator('h2')).toBeVisible();
    await expect(preview.locator('strong')).toBeVisible();
    await expect(preview.locator('ul li')).toHaveCount(2);
    await expect(preview.locator('blockquote')).toBeVisible();
    await expect(preview.locator('img')).toBeVisible();
    await expect(preview.locator('[data-testid="boilerplate-sections"]')).toBeVisible();

    // All elements should have template-specific styling
    await expect(preview.locator('h2')).toHaveCSS('color', 'rgb(0, 95, 171)');
    await expect(preview.locator('blockquote')).toHaveCSS('border-left', '4px solid rgb(59, 130, 246)');
  });

  test('error handling during template operations', async ({ page }) => {
    await page.goto('/dashboard/pr-tools/campaigns/campaigns/new');
    
    // Navigate to template selection
    await page.fill('[data-testid="campaign-title"]', 'Error Test');
    await page.click('button:has-text("Weiter")');
    await page.fill('[data-testid="content-editor"]', 'Content');
    await page.click('button:has-text("Weiter")');
    await page.click('button:has-text("Weiter")');

    // Mock template loading error
    await page.route('/api/templates', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Template service unavailable'
        })
      });
    });

    await page.click('[data-testid="template-selector-button"]');
    
    // Should show error message
    await expect(page.getByText('Fehler beim Laden der Templates')).toBeVisible();
    
    // Should show retry option
    await page.click('button:has-text("Erneut versuchen")');

    // Mock PDF generation error
    await page.route('/api/generate-pdf', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'PDF generation failed'
        })
      });
    });

    // Fix template loading for next attempt
    await page.route('/api/templates', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          templates: [{ id: 'modern-professional', name: 'Modern Professional' }]
        })
      });
    });

    await page.reload();
    await page.click('[data-testid="template-selector-button"]');
    await page.click('[data-testid="template-card-modern-professional"] button:has-text("Auswählen")');

    // Try PDF generation
    await page.click('[data-testid="generate-pdf-button"]');
    
    await expect(page.getByText('PDF-Generierung fehlgeschlagen')).toBeVisible();
    await expect(page.getByText('Bitte versuchen Sie es erneut')).toBeVisible();
  });
});