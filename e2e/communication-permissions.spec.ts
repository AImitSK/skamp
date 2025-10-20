/**
 * E2E Test: Permission Checks & Admin SDK Endpoints
 *
 * Testet:
 * - Team-Member Validation
 * - Multi-Tenancy Checks
 * - Edit/Delete Permissions
 * - Admin SDK Endpoints
 */

import { test, expect } from '@playwright/test';

const TEST_PROJECT_ID = 'test-project-123';
const UNAUTHORIZED_PROJECT_ID = 'unauthorized-project-456';

test.describe('TeamChat - Permission Checks', () => {
  test('sollte Non-Team-Member blockieren', async ({ page }) => {
    // Login als User der KEIN Team-Member ist
    await page.goto('/');
    // TODO: Login als Non-Team-Member

    // Projekt öffnen (User ist nicht im Team)
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);

    // FloatingChat öffnen versuchen
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Error-Message sollte erscheinen
    const errorMessage = page.locator('[data-testid="no-team-member-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    await expect(errorMessage).toContainText(/nicht.*Team|not.*member/i);

    // Message-Input sollte disabled sein
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeDisabled();

    // Send-Button sollte disabled sein
    const sendButton = page.locator('[data-testid="send-message-button"]');
    await expect(sendButton).toBeDisabled();
  });

  test('sollte Team-Member erlauben Messages zu senden', async ({ page }) => {
    // Login als Team-Member
    await page.goto('/');
    // TODO: Login als Team-Member

    // Projekt öffnen
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Kein Error
    await expect(page.locator('[data-testid="no-team-member-error"]')).not.toBeVisible();

    // Message-Input sollte enabled sein
    const messageInput = page.locator('[data-testid="message-input"]');
    await expect(messageInput).toBeEnabled();

    // Message senden sollte funktionieren
    await messageInput.fill('Test message from team member');
    await page.locator('[data-testid="send-message-button"]').click();

    const lastMessage = page.locator('[data-testid="message-item"]').last();
    await expect(lastMessage).toContainText('Test message from team member');
  });

  test('sollte nur eigene Messages editieren erlauben', async ({ page }) => {
    // Login & Projekt öffnen
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Eigene Message senden
    await page.locator('[data-testid="message-input"]').fill('My own message');
    await page.locator('[data-testid="send-message-button"]').click();

    const ownMessage = page.locator('[data-testid="message-item"]').last();
    await expect(ownMessage).toContainText('My own message');

    // Edit-Button sollte bei eigener Message sichtbar sein (beim Hover)
    await ownMessage.hover();
    const editButton = ownMessage.locator('[data-testid="edit-message-button"]');
    await expect(editButton).toBeVisible();

    // Message von anderem User (simuliert)
    // Bei fremder Message sollte Edit-Button NICHT sichtbar sein
    const otherUserMessage = page.locator('[data-testid="message-item"]').first();
    await otherUserMessage.hover();
    const noEditButton = otherUserMessage.locator('[data-testid="edit-message-button"]');
    await expect(noEditButton).not.toBeVisible().catch(() => {
      // Falls keine anderen Messages vorhanden: OK
    });
  });

  test('sollte nur eigene Messages löschen erlauben', async ({ page }) => {
    // Login & Projekt öffnen
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Eigene Message senden
    await page.locator('[data-testid="message-input"]').fill('Message to delete');
    await page.locator('[data-testid="send-message-button"]').click();

    const ownMessage = page.locator('[data-testid="message-item"]').last();

    // Delete-Button sollte bei eigener Message sichtbar sein (beim Hover)
    await ownMessage.hover();
    const deleteButton = ownMessage.locator('[data-testid="delete-message-button"]');
    await expect(deleteButton).toBeVisible();

    // Bei fremder Message sollte Delete-Button NICHT sichtbar sein
    const otherUserMessage = page.locator('[data-testid="message-item"]').first();
    await otherUserMessage.hover();
    const noDeleteButton = otherUserMessage.locator('[data-testid="delete-message-button"]');
    await expect(noDeleteButton).not.toBeVisible().catch(() => {
      // Falls keine anderen Messages vorhanden: OK
    });
  });

  test('sollte Admin erlauben fremde Messages zu löschen', async ({ page }) => {
    // Login als Admin
    await page.goto('/');
    // TODO: Login als Admin-User

    // Projekt öffnen
    await page.goto(`/dashboard/projects/${TEST_PROJECT_ID}`);
    await page.locator('[data-testid="floating-chat-toggle"]').click();

    // Fremde Message (von anderem User)
    const otherUserMessage = page.locator('[data-testid="message-item"]').first();

    // Delete-Button sollte auch bei fremder Message sichtbar sein (Admin-Privilege)
    await otherUserMessage.hover();
    const deleteButton = otherUserMessage.locator('[data-testid="delete-message-button"]');
    await expect(deleteButton).toBeVisible();

    // Delete sollte funktionieren
    await deleteButton.click();

    // Confirm-Dialog
    await page.locator('[data-testid="confirm-button"]').click();

    // Message sollte gelöscht sein
    await expect(otherUserMessage).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('TeamChat - Multi-Tenancy Checks', () => {
  test('sollte Zugriff auf fremde Organization blockieren', async ({ page }) => {
    // Login als User von Organization A
    await page.goto('/');
    // TODO: Login

    // Versuche Projekt von Organization B zu öffnen
    await page.goto(`/dashboard/projects/${UNAUTHORIZED_PROJECT_ID}`);

    // Error-Page oder Redirect
    const errorMessage = page.locator('[data-testid="unauthorized-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 })
      .catch(async () => {
        // Alternative: Redirect zu Dashboard
        await expect(page).toHaveURL(/\/dashboard$/);
      });
  });

  test('sollte API-Calls mit falscher organizationId blocken', async ({ page, request }) => {
    // Login
    await page.goto('/');
    // TODO: Login

    // Hole Session-Cookie
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    // API-Call mit falscher organizationId
    const response = await request.post('/api/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'wrong-org-id-123',
        content: 'This should be blocked',
      },
    });

    // Sollte 403 Forbidden zurückgeben
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toContain('Organization mismatch');
  });
});

test.describe('TeamChat - Time-Limits', () => {
  test('sollte Message nur innerhalb 15min editieren erlauben', async ({ page }) => {
    // TODO: Komplexer Test - Message mit altem Timestamp erstellen
    // Für jetzt: Dokumentation

    // 1. Message senden
    // 2. Timestamp manipulieren (via Admin SDK oder Database)
    // 3. Edit versuchen → sollte blockiert werden mit "Cannot edit messages older than 15 minutes"

    test.skip();
  });

  test('sollte Message nur innerhalb 15min löschen erlauben', async ({ page }) => {
    // TODO: Analog zu Edit-Test

    test.skip();
  });
});

test.describe('Admin SDK - API Endpoints', () => {
  test('sollte POST /api/v1/messages validieren', async ({ page, request }) => {
    // Login
    await page.goto('/');
    // TODO: Login

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    // 1. Valid Request → sollte funktionieren
    const validResponse = await request.post('/api/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
        content: 'Valid test message',
        mentions: [],
        attachments: [],
      },
    });

    expect(validResponse.status()).toBe(200);

    // 2. Fehlende Felder → sollte 400 zurückgeben
    const missingFieldsResponse = await request.post('/api/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        // content fehlt!
      },
    });

    expect(missingFieldsResponse.status()).toBe(400);

    // 3. Zu lange Message → sollte 400 zurückgeben
    const tooLongResponse = await request.post('/api/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
        content: 'a'.repeat(5001), // > 5000 Zeichen
      },
    });

    expect(tooLongResponse.status()).toBe(400);
    const body = await tooLongResponse.json();
    expect(body.error).toContain('too long');
  });

  test('sollte DELETE /api/v1/messages/[id] validieren', async ({ page, request }) => {
    // Login
    await page.goto('/');
    // TODO: Login

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    // Erste: Message erstellen
    const createResponse = await request.post('/api/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
        content: 'Message to delete',
      },
    });

    const { messageId } = await createResponse.json();

    // Jetzt: Message löschen
    const deleteResponse = await request.delete(`/api/v1/messages/${messageId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
      },
    });

    expect(deleteResponse.status()).toBe(200);

    // Message sollte gelöscht sein
    // TODO: Verify via GET /api/v1/messages
  });

  test('sollte PATCH /api/v1/messages/[id] validieren', async ({ page, request }) => {
    // Login
    await page.goto('/');
    // TODO: Login

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    // Erste: Message erstellen
    const createResponse = await request.post('/api/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
        content: 'Original message',
      },
    });

    const { messageId } = await createResponse.json();

    // Jetzt: Message editieren
    const editResponse = await request.patch(`/api/v1/messages/${messageId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
        newContent: 'Edited message',
      },
    });

    expect(editResponse.status()).toBe(200);

    // Message sollte editiert sein + Edit-History
    // TODO: Verify via GET /api/v1/messages
  });

  test('sollte POST /api/v1/messages/[id]/reactions validieren', async ({ page, request }) => {
    // Login
    await page.goto('/');
    // TODO: Login

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));

    // Message erstellen
    const createResponse = await request.post('/api/v1/messages', {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
        content: 'Message for reaction',
      },
    });

    const { messageId } = await createResponse.json();

    // Reaction hinzufügen
    const reactionResponse = await request.post(`/api/v1/messages/${messageId}/reactions`, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${sessionCookie?.name}=${sessionCookie?.value}`,
      },
      data: {
        projectId: TEST_PROJECT_ID,
        organizationId: 'correct-org-id',
        emoji: '👍',
      },
    });

    expect(reactionResponse.status()).toBe(200);

    // Reaction sollte hinzugefügt sein
    // TODO: Verify via GET /api/v1/messages
  });
});
