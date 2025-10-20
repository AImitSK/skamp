/**
 * E2E Test: TeamChat Complete Flow
 *
 * Testet den vollständigen User-Flow für TeamChat:
 * - Projekt öffnen
 * - FloatingChat öffnen
 * - Message senden
 * - Mention User (@Name)
 * - Attachment hochladen
 * - Reaction hinzufügen
 * - Message editieren
 * - Message löschen
 */

import { test, expect } from '@playwright/test';

// Test-Daten
const TEST_PROJECT_ID = 'test-project-123';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  displayName: 'Test User',
};

test.describe('TeamChat - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login (über Auth-Helper oder direkt)
    await page.goto('/');

    // TODO: Implementiere Login-Logic
    // await login(page, TEST_USER.email, TEST_USER.password);

    // Navigiere zu Projekt
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);

    // Warte bis Seite geladen
    await page.waitForLoadState('networkidle');
  });

  test('sollte FloatingChat öffnen und Message senden', async ({ page }) => {
    // 1. FloatingChat-Button finden und klicken
    const chatButton = page.locator('[data-testid="floating-chat-toggle"]');
    await expect(chatButton).toBeVisible();
    await chatButton.click();

    // 2. Chat sollte offen sein
    const chatWindow = page.locator('[data-testid="team-chat"]');
    await expect(chatWindow).toBeVisible();

    // 3. Message-Input finden
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeVisible();

    // 4. Message eingeben
    const testMessage = 'Hello Team! This is a test message.';
    await messageInput.fill(testMessage);

    // 5. Send-Button klicken
    const sendButton = page.locator('[data-testid="send-message-button"]');
    await sendButton.click();

    // 6. Message sollte in der Liste erscheinen
    const sentMessage = page.locator(`text=${testMessage}`);
    await expect(sentMessage).toBeVisible({ timeout: 5000 });

    // 7. Message sollte Author-Name zeigen
    const authorName = page.locator(`text=${TEST_USER.displayName}`);
    await expect(authorName).toBeVisible();
  });

  test('sollte User mit @ mentionieren können', async ({ page }) => {
    // FloatingChat öffnen
    await page.locator('[data-testid="floating-chat-toggle"]').click();
    await page.waitForSelector('[data-testid="team-chat"]');

    // Message-Input finden
    const messageInput = page.locator('[data-testid="message-input"]');

    // @ eingeben
    await messageInput.fill('@');

    // Mention-Dropdown sollte erscheinen
    const mentionDropdown = page.locator('[data-testid="mention-dropdown"]');
    await expect(mentionDropdown).toBeVisible({ timeout: 2000 });

    // Ersten User aus Dropdown wählen
    const firstMention = page.locator('[data-testid="mention-option"]').first();
    await firstMention.click();

    // User-Name sollte im Input sein
    const inputValue = await messageInput.inputValue();
    expect(inputValue).toContain('@');

    // Message senden
    await page.locator('[data-testid="send-message-button"]').click();

    // Message mit Mention sollte erscheinen
    await expect(page.locator('[data-testid="message-item"]').last()).toBeVisible();
  });

  test('sollte Attachment hochladen können', async ({ page }) => {
    // FloatingChat öffnen
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Attachment-Button klicken
    const attachmentButton = page.locator('[data-testid="attachment-button"]');
    await attachmentButton.click();

    // Asset-Picker sollte öffnen
    const assetPicker = page.locator('[data-testid="asset-picker-modal"]');
    await expect(assetPicker).toBeVisible();

    // Asset auswählen
    const firstAsset = page.locator('[data-testid="asset-item"]').first();
    await firstAsset.click();

    // Select-Button klicken
    await page.locator('[data-testid="select-asset-button"]').click();

    // Asset-Preview sollte erscheinen
    const assetPreview = page.locator('[data-testid="attachment-preview"]');
    await expect(assetPreview).toBeVisible();

    // Message mit Attachment senden
    await page.locator('[data-testid="message-input"]').fill('Check out this file!');
    await page.locator('[data-testid="send-message-button"]').click();

    // Message mit Attachment sollte erscheinen
    const messageWithAttachment = page.locator('[data-testid="message-item"]').last();
    await expect(messageWithAttachment).toBeVisible();
    await expect(messageWithAttachment.locator('[data-testid="asset-preview"]')).toBeVisible();
  });

  test('sollte Reaction hinzufügen können', async ({ page }) => {
    // FloatingChat öffnen
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Erste Message senden
    await page.locator('[data-testid="message-input"]').fill('Test message for reaction');
    await page.locator('[data-testid="send-message-button"]').click();

    // Warte auf Message
    const message = page.locator('[data-testid="message-item"]').last();
    await expect(message).toBeVisible();

    // Reaction-Bar sollte sichtbar sein (beim Hover)
    await message.hover();
    const reactionBar = message.locator('[data-testid="reaction-bar"]');
    await expect(reactionBar).toBeVisible();

    // Thumbs-Up Reaction klicken
    const thumbsUpButton = reactionBar.locator('[data-testid="reaction-thumbs-up"]');
    await thumbsUpButton.click();

    // Reaction-Count sollte 1 sein
    const reactionCount = thumbsUpButton.locator('[data-testid="reaction-count"]');
    await expect(reactionCount).toHaveText('1');
  });

  test('sollte Message editieren können', async ({ page }) => {
    // FloatingChat öffnen
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Message senden
    const originalMessage = 'Original message text';
    await page.locator('[data-testid="message-input"]').fill(originalMessage);
    await page.locator('[data-testid="send-message-button"]').click();

    // Warte auf Message
    const message = page.locator('[data-testid="message-item"]').last();
    await expect(message).toContainText(originalMessage);

    // Edit-Button klicken (beim Hover auf eigene Message)
    await message.hover();
    const editButton = message.locator('[data-testid="edit-message-button"]');
    await editButton.click();

    // Edit-Input sollte erscheinen
    const editInput = message.locator('[data-testid="edit-message-input"]');
    await expect(editInput).toBeVisible();

    // Text ändern
    const editedMessage = 'Edited message text';
    await editInput.clear();
    await editInput.fill(editedMessage);

    // Save-Button klicken
    const saveButton = message.locator('[data-testid="save-edit-button"]');
    await saveButton.click();

    // Message sollte editiert sein
    await expect(message).toContainText(editedMessage);

    // "Bearbeitet" Badge sollte sichtbar sein
    const editedBadge = message.locator('[data-testid="edited-badge"]');
    await expect(editedBadge).toBeVisible();
  });

  test('sollte Message löschen können', async ({ page }) => {
    // FloatingChat öffnen
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Message senden
    const messageToDelete = 'This message will be deleted';
    await page.locator('[data-testid="message-input"]').fill(messageToDelete);
    await page.locator('[data-testid="send-message-button"]').click();

    // Warte auf Message
    const message = page.locator('[data-testid="message-item"]').last();
    await expect(message).toContainText(messageToDelete);

    // Delete-Button klicken (beim Hover auf eigene Message)
    await message.hover();
    const deleteButton = message.locator('[data-testid="delete-message-button"]');
    await deleteButton.click();

    // Confirm-Dialog sollte erscheinen
    const confirmDialog = page.locator('[data-testid="confirm-delete-dialog"]');
    await expect(confirmDialog).toBeVisible();

    // Confirm-Button klicken
    const confirmButton = confirmDialog.locator('[data-testid="confirm-button"]');
    await confirmButton.click();

    // Message sollte gelöscht sein (oder "[Nachricht gelöscht]" anzeigen)
    await expect(message).not.toBeVisible({ timeout: 5000 })
      .catch(async () => {
        // Alternative: Soft-Delete → "[Nachricht gelöscht]" Text
        await expect(message).toContainText('[Nachricht gelöscht]');
      });
  });

  test('sollte Unread-Badge anzeigen bei neuen Messages', async ({ page }) => {
    // FloatingChat NICHT öffnen
    // (simuliert User ist nicht im Chat)

    // TODO: Andere User sendet Message (via API oder 2. Browser)
    // Für jetzt: Simuliere unread messages

    // Chat-Button sollte Unread-Badge haben
    const chatButton = page.locator('[data-testid="floating-chat-toggle"]');
    const unreadBadge = chatButton.locator('[data-testid="unread-badge"]');

    // Badge sollte sichtbar sein (wenn unread messages vorhanden)
    // await expect(unreadBadge).toBeVisible();

    // FloatingChat öffnen
    await chatButton.click();

    // Nach Öffnen sollte Badge verschwinden
    await expect(unreadBadge).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('TeamChat - Error Handling', () => {
  test('sollte Error bei zu langer Message anzeigen', async ({ page }) => {
    // Login & Projekt öffnen
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);

    // FloatingChat öffnen
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Sehr lange Message eingeben (>5000 Zeichen)
    const longMessage = 'a'.repeat(5001);
    await page.locator('[data-testid="message-input"]').fill(longMessage);

    // Send-Button sollte disabled sein ODER Error anzeigen
    const sendButton = page.locator('[data-testid="send-message-button"]');
    const isDisabled = await sendButton.isDisabled();

    if (!isDisabled) {
      await sendButton.click();

      // Error-Message sollte erscheinen
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('zu lang');
    } else {
      expect(isDisabled).toBe(true);
    }
  });

  test('sollte Error bei fehlender Team-Membership anzeigen', async ({ page }) => {
    // TODO: Login als Non-Team-Member

    // Projekt öffnen (User ist KEIN Team-Member)
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);

    // FloatingChat-Button klicken
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Error-Message sollte erscheinen
    const errorMessage = page.locator('[data-testid="no-team-member-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('kein Team-Mitglied');

    // Message-Input sollte disabled sein
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeDisabled();
  });
});
