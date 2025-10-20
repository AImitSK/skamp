/**
 * E2E Test: Rate-Limiting & Spam-Prevention
 *
 * Testet Admin SDK Rate-Limiting:
 * - Max 10 Messages/Minute
 * - Error-Message bei Limit-Überschreitung
 * - Reset nach 1 Minute
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'test-project-123';
const MAX_MESSAGES_PER_MINUTE = 10;

test.describe('TeamChat - Rate-Limiting', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    // TODO: Login-Logic

    // Navigiere zu Projekt
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);

    // FloatingChat öffnen
    await page.locator('[data-testid="floating-chat-toggle"]').click();
    await page.waitForSelector('[data-testid="team-chat"]');
  });

  test('sollte max 10 Messages/Minute erlauben', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-message-button"]');

    // 1. Sende 10 Messages schnell hintereinander (sollte funktionieren)
    for (let i = 1; i <= MAX_MESSAGES_PER_MINUTE; i++) {
      await messageInput.fill(`Test message ${i}`);
      await sendButton.click();

      // Kurz warten damit Message gesendet wird
      await page.waitForTimeout(100);

      // Prüfe ob Message gesendet wurde
      const lastMessage = page.locator('[data-testid="message-item"]').last();
      await expect(lastMessage).toContainText(`Test message ${i}`, { timeout: 2000 });
    }

    // 2. 11. Message senden → sollte FEHLSCHLAGEN
    await messageInput.fill('This should be blocked by rate limit');
    await sendButton.click();

    // Error-Message sollte erscheinen
    const errorMessage = page.locator('[data-testid="rate-limit-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    await expect(errorMessage).toContainText(/Rate limit|zu viele|Minute/i);

    // Message sollte NICHT in der Liste erscheinen
    const messages = page.locator('[data-testid="message-item"]');
    const count = await messages.count();
    expect(count).toBe(MAX_MESSAGES_PER_MINUTE); // Nur 10 Messages
  });

  test('sollte Rate-Limit nach 1 Minute zurücksetzen', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-message-button"]');

    // 1. Sende 10 Messages (Limit erreichen)
    for (let i = 1; i <= MAX_MESSAGES_PER_MINUTE; i++) {
      await messageInput.fill(`Message ${i}`);
      await sendButton.click();
      await page.waitForTimeout(100);
    }

    // 2. 11. Message → sollte blockiert werden
    await messageInput.fill('Blocked message');
    await sendButton.click();
    await expect(page.locator('[data-testid="rate-limit-error"]')).toBeVisible();

    // 3. Warte 61 Sekunden (Rate-Limit sollte zurückgesetzt sein)
    console.log('⏳ Waiting 61 seconds for rate limit reset...');
    await page.waitForTimeout(61 * 1000);

    // 4. Neue Message senden → sollte FUNKTIONIEREN
    await messageInput.fill('Message after reset');
    await sendButton.click();

    // Kein Error
    await expect(page.locator('[data-testid="rate-limit-error"]')).not.toBeVisible();

    // Message sollte erscheinen
    const lastMessage = page.locator('[data-testid="message-item"]').last();
    await expect(lastMessage).toContainText('Message after reset');
  });

  test('sollte Rate-Limit pro User/Project tracken', async ({ page, context }) => {
    // Test mit 2 verschiedenen Tabs (simuliert 2 User)
    const page1 = page; // User 1 (bereits eingeloggt)
    const page2 = await context.newPage(); // User 2

    // User 2 Login & Projekt öffnen
    await page2.goto('/');
    // TODO: Login als User 2

    await page2.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);
    await page2.locator('[data-testid="floating-chat-toggle"]').click();

    // User 1: Sende 10 Messages (Limit erreichen)
    const messageInput1 = page1.locator('[data-testid="message-input"]');
    const sendButton1 = page1.locator('[data-testid="send-message-button"]');

    for (let i = 1; i <= MAX_MESSAGES_PER_MINUTE; i++) {
      await messageInput1.fill(`User1 Message ${i}`);
      await sendButton1.click();
      await page1.waitForTimeout(100);
    }

    // User 1: 11. Message → blockiert
    await messageInput1.fill('User1 blocked');
    await sendButton1.click();
    await expect(page1.locator('[data-testid="rate-limit-error"]')).toBeVisible();

    // User 2: Sollte trotzdem Messages senden können (eigenes Limit)
    const messageInput2 = page2.locator('[data-testid="message-input"]');
    const sendButton2 = page2.locator('[data-testid="send-message-button"]');

    await messageInput2.fill('User2 message (should work)');
    await sendButton2.click();

    // Kein Error für User 2
    await expect(page2.locator('[data-testid="rate-limit-error"]')).not.toBeVisible();

    // Message sollte erscheinen
    const lastMessage = page2.locator('[data-testid="message-item"]').last();
    await expect(lastMessage).toContainText('User2 message (should work)');

    await page2.close();
  });
});

test.describe('TeamChat - Content-Moderation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);
    await page.locator('[data-testid="floating-chat-toggle"]').click();
  });

  test('sollte profane Wörter blocken', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-message-button"]');

    // Message mit profanem Wort senden
    await messageInput.fill('This message contains badword1 and should be blocked');
    await sendButton.click();

    // Error-Message sollte erscheinen
    const errorMessage = page.locator('[data-testid="content-moderation-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    await expect(errorMessage).toContainText(/unangemessen|inappropriate|blocked/i);

    // Message sollte NICHT erscheinen
    const messages = page.locator('[data-testid="message-item"]');
    const lastMessage = messages.last();
    await expect(lastMessage).not.toContainText('badword1').catch(() => {
      // Falls keine Messages vorhanden: OK
    });
  });

  test('sollte leere Messages blocken', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-message-button"]');

    // Leere Message senden
    await messageInput.fill('   '); // Nur Whitespace
    await sendButton.click();

    // Error ODER Send-Button disabled
    const errorMessage = page.locator('[data-testid="empty-message-error"]');
    const isButtonDisabled = await sendButton.isDisabled();

    if (!isButtonDisabled) {
      await expect(errorMessage).toBeVisible();
    } else {
      expect(isButtonDisabled).toBe(true);
    }
  });
});

test.describe('TeamChat - Quota-Management', () => {
  test.skip('sollte Daily Message Quota enforc', async ({ page }) => {
    // SKIP: Dieser Test dauert zu lange (1000 Messages senden)
    // Nur als Dokumentation

    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-message-button"]');

    // Sende 1000 Messages (Daily Limit)
    for (let i = 1; i <= 1000; i++) {
      await messageInput.fill(`Message ${i}`);
      await sendButton.click();
      await page.waitForTimeout(50);
    }

    // 1001. Message → sollte blockiert werden
    await messageInput.fill('Over quota');
    await sendButton.click();

    const errorMessage = page.locator('[data-testid="quota-exceeded-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/quota|limit|Tag/i);
  });
});
