# Admin SDK API Routes - Server-Side Validation

> **Module**: Communication Components - Admin SDK
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Base URL**: `/api/v1/messages`

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Authentifizierung](#authentifizierung)
- [POST /api/v1/messages](#post-apiv1messages)
- [PATCH /api/v1/messages/messageId](#patch-apiv1messagesmessageid)
- [DELETE /api/v1/messages/messageId](#delete-apiv1messagesmessageid)
- [Security Features](#security-features)
- [Error Responses](#error-responses)
- [Testing](#testing)

---

## Übersicht

Die **Admin SDK API Routes** bieten Server-Side Validation für alle kritischen Message-Operationen. Alle Mutationen (Create, Edit, Delete) laufen über Next.js API Routes mit Firebase Admin SDK.

### Warum Admin SDK?

**Problem:** Client-Side Firebase SDK hat KEINE:
- ✅ Rate-Limiting
- ✅ Content-Moderation
- ✅ Server-Side Permissions
- ✅ Audit-Logs
- ✅ Time-Limits

**Lösung:** Alle Mutations via Admin SDK API Routes.

### API-Übersicht

| Endpoint | Methode | Auth | Beschreibung |
|----------|---------|------|--------------|
| `/api/v1/messages` | POST | ✅ | Message erstellen |
| `/api/v1/messages/[messageId]` | PATCH | ✅ | Message bearbeiten |
| `/api/v1/messages/[messageId]` | DELETE | ✅ | Message löschen |

---

## Authentifizierung

Alle Requests benötigen einen gültigen **Firebase ID Token** im `Authorization` Header.

### Request Header

```http
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

### Token generieren (Client)

```typescript
import { useAuth } from '@/context/AuthContext';

const { user } = useAuth();
const idToken = await user.getIdToken();
```

### Token verifizieren (Server)

```typescript
import { adminAuth } from '@/lib/firebase/admin-init';

const authHeader = request.headers.get('Authorization');
const token = authHeader?.substring(7); // Remove 'Bearer '

const decodedToken = await adminAuth.verifyIdToken(token);
const userId = decodedToken.uid;
```

### authenticatedFetch Helper

**Empfohlen:** Nutze `authenticatedFetch()` für automatisches Token-Handling.

```typescript
import { authenticatedFetch } from '@/lib/utils/api-client';

const response = await authenticatedFetch('/api/v1/messages', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

---

## POST /api/v1/messages

Erstellt eine neue Team-Chat Message mit Server-Side Validation.

### Endpoint

```
POST /api/v1/messages
```

### Request Body

```typescript
{
  projectId: string;           // Firestore Project ID
  content: string;             // Message Text (min 1 char)
  authorId: string;            // Firebase User UID
  authorName: string;          // User Display Name
  authorPhotoUrl?: string;     // Optional User Photo URL
  organizationId: string;      // Multi-Tenancy Organization ID
  mentions?: string[];         // Optional @-Mentions
}
```

### Request Beispiel

```typescript
const response = await authenticatedFetch('/api/v1/messages', {
  method: 'POST',
  body: JSON.stringify({
    projectId: 'project-123',
    content: '@Max Please review this design!',
    authorId: 'user-789',
    authorName: 'Anna Schmidt',
    authorPhotoUrl: 'https://example.com/anna.jpg',
    organizationId: 'org-456',
    mentions: ['Max']
  }),
});

const data = await response.json();
```

### Response (Success)

**HTTP 200 OK**

```json
{
  "success": true,
  "messageId": "msg-abc123def456"
}
```

### Response (Errors)

#### 401 Unauthorized - Missing Token

```json
{
  "error": "Unauthorized - Missing token",
  "status": 401
}
```

#### 401 Unauthorized - Invalid Token

```json
{
  "error": "Unauthorized - Invalid token",
  "status": 401
}
```

#### 400 Bad Request - Missing Fields

```json
{
  "error": "Missing required fields",
  "status": 400
}
```

#### 403 Forbidden - User ID Mismatch

```json
{
  "error": "User ID mismatch",
  "status": 403
}
```

#### 429 Too Many Requests - Rate Limited

```json
{
  "error": "Rate limit exceeded. Max 10 messages per minute.",
  "status": 429
}
```

#### 400 Bad Request - Profanity Detected

```json
{
  "error": "Message contains inappropriate content",
  "status": 400
}
```

#### 404 Not Found - Project Not Found

```json
{
  "error": "Project not found",
  "status": 404
}
```

#### 403 Forbidden - Not Team Member

```json
{
  "error": "Not authorized. User is not a team member.",
  "status": 403
}
```

### Server-Side Validations

Die API Route führt folgende Checks durch:

1. ✅ **Auth:** Firebase ID Token verifizieren
2. ✅ **User-ID:** `authorId === userId` (Spoofing verhindern)
3. ✅ **Required Fields:** `projectId`, `content`, `organizationId`
4. ✅ **Rate-Limit:** Max 10 Messages/Minute pro User/Projekt
5. ✅ **Content-Moderation:** Profanity-Filter
6. ✅ **Team-Membership:** User ist in `project.assignedTo`
7. ✅ **Mention-Validation:** Erwähnte User existieren (Warnung)
8. ✅ **Audit-Log:** Log für `message_created` Action

### Implementation Snippet

```typescript
// src/app/api/v1/messages/route.ts
export async function POST(request: NextRequest) {
  // 1. Auth
  const token = request.headers.get('Authorization')?.substring(7);
  const decodedToken = await adminAuth.verifyIdToken(token);
  const userId = decodedToken.uid;

  // 2. Body
  const { projectId, content, authorId, organizationId } = await request.json();

  // 3. Validierung
  if (authorId !== userId) {
    return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
  }

  // 4. Rate-Limit
  if (!checkRateLimit(userId, projectId)) {
    return NextResponse.json({
      error: 'Rate limit exceeded. Max 10 messages per minute.'
    }, { status: 429 });
  }

  // 5. Content-Moderation
  if (containsProfanity(content)) {
    return NextResponse.json({
      error: 'Message contains inappropriate content'
    }, { status: 400 });
  }

  // 6. Team-Membership
  const project = await adminDb.collection('projects').doc(projectId).get();
  const isTeamMember = project.data()?.assignedTo?.includes(userId);

  if (!isTeamMember) {
    return NextResponse.json({
      error: 'Not authorized. User is not a team member.'
    }, { status: 403 });
  }

  // 7. Save Message
  const messageRef = await adminDb
    .collection('projects')
    .doc(projectId)
    .collection('teamMessages')
    .add({ content, authorId, timestamp: new Date(), ... });

  // 8. Audit-Log
  await createAuditLog({
    userId,
    action: 'message_created',
    projectId,
    messageId: messageRef.id,
    details: { mentionsCount: mentions.length }
  });

  return NextResponse.json({ success: true, messageId: messageRef.id });
}
```

---

## PATCH /api/v1/messages/[messageId]

Bearbeitet eine existierende Message (mit Permission & Time-Limit Check).

### Endpoint

```
PATCH /api/v1/messages/[messageId]
```

### Request Body

```typescript
{
  projectId: string;     // Firestore Project ID
  newContent: string;    // Neuer Message Text
}
```

### Request Beispiel

```typescript
const response = await authenticatedFetch('/api/v1/messages/msg-abc123', {
  method: 'PATCH',
  body: JSON.stringify({
    projectId: 'project-123',
    newContent: 'Updated message content'
  }),
});
```

### Response (Success)

**HTTP 200 OK**

```json
{
  "success": true
}
```

### Response (Errors)

#### 403 Forbidden - Not Message Author

```json
{
  "error": "Forbidden. You can only edit your own messages.",
  "status": 403
}
```

#### 403 Forbidden - Time Limit Exceeded

```json
{
  "error": "Time limit exceeded. Messages can only be edited within 15 minutes.",
  "status": 403
}
```

#### 400 Bad Request - Profanity Detected

```json
{
  "error": "Message contains inappropriate content",
  "status": 400
}
```

### Server-Side Validations

1. ✅ **Auth:** Firebase ID Token verifizieren
2. ✅ **Message Exists:** Message mit `messageId` existiert
3. ✅ **Permission:** `message.authorId === userId`
4. ✅ **Time-Limit:** Message ist <15min alt
5. ✅ **Content-Moderation:** Profanity-Filter
6. ✅ **Edit-History:** Alte Version speichern
7. ✅ **Audit-Log:** Log für `message_edited` Action

### Edit-History Schema

```typescript
{
  editHistory: [
    {
      previousContent: 'Old content',
      editedAt: Timestamp,
      editedBy: 'user-789'
    }
  ]
}
```

---

## DELETE /api/v1/messages/[messageId]

Löscht eine Message (Soft-Delete für Audit).

### Endpoint

```
DELETE /api/v1/messages/[messageId]?projectId=project-123
```

**Query Parameter:**
- `projectId` (required): Firestore Project ID

### Request Beispiel

```typescript
const response = await authenticatedFetch(
  '/api/v1/messages/msg-abc123?projectId=project-123',
  { method: 'DELETE' }
);
```

### Response (Success)

**HTTP 200 OK**

```json
{
  "success": true
}
```

### Response (Errors)

#### 400 Bad Request - Missing projectId

```json
{
  "error": "Missing projectId query parameter",
  "status": 400
}
```

#### 403 Forbidden - Not Message Author

```json
{
  "error": "Forbidden. You can only delete your own messages.",
  "status": 403
}
```

#### 403 Forbidden - Time Limit Exceeded

```json
{
  "error": "Time limit exceeded. Messages can only be deleted within 15 minutes.",
  "status": 403
}
```

### Server-Side Validations

1. ✅ **Auth:** Firebase ID Token verifizieren
2. ✅ **Query Param:** `projectId` vorhanden
3. ✅ **Message Exists:** Message mit `messageId` existiert
4. ✅ **Permission:** `message.authorId === userId`
5. ✅ **Time-Limit:** Message ist <15min alt
6. ✅ **Soft-Delete:** Setze `deleted: true` (kein Hard-Delete!)
7. ✅ **Audit-Log:** Log für `message_deleted` Action

### Soft-Delete Schema

```typescript
{
  deleted: true,
  deletedAt: Timestamp,
  deletedBy: 'user-789'
}
```

**Wichtig:** Messages werden NICHT aus Firestore gelöscht, sondern nur als `deleted: true` markiert. Dies ermöglicht Audit-Trails.

---

## Security Features

### 1. Rate-Limiting

**Limit:** 10 Messages pro Minute pro User/Projekt

**Implementation:**

```typescript
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, projectId: string): boolean {
  const key = `${userId}:${projectId}`;
  const now = Date.now();
  const limit = rateLimitCache.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimitCache.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 10) return false;

  limit.count++;
  return true;
}
```

**Wichtig:** Aktuell In-Memory. Für Production: Redis/Memcached!

### 2. Content-Moderation

**Profanity-Filter:** Einfache Blacklist (erweiterbar).

```typescript
const PROFANITY_LIST = [
  'fuck', 'shit', 'asshole', 'bitch', 'damn',
  'scheiße', 'arschloch', 'fick'
];

function containsProfanity(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return PROFANITY_LIST.some(word => lowerContent.includes(word));
}
```

**TODO:** Integration mit externem Service (Perspective API, AWS Comprehend).

### 3. Permission-Checks

**Team-Membership:**

```typescript
const projectDoc = await adminDb.collection('projects').doc(projectId).get();
const project = projectDoc.data();

const isTeamMember =
  project.assignedTo?.includes(userId) ||
  project.userId === userId ||
  project.projectManager === userId;
```

**Edit/Delete Permission:**

```typescript
if (message.authorId !== userId) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 4. Time-Limits

**15 Minuten** für Edits/Deletes.

```typescript
const EDIT_DELETE_TIME_LIMIT = 15 * 60 * 1000; // 15min in ms

const messageAge = Date.now() - message.timestamp.toDate().getTime();
if (messageAge > EDIT_DELETE_TIME_LIMIT) {
  return NextResponse.json({
    error: 'Time limit exceeded. Messages can only be edited within 15 minutes.'
  }, { status: 403 });
}
```

### 5. Audit-Logs

**Firestore Collection:** `audit-logs`

```typescript
async function createAuditLog(data: {
  userId: string;
  action: string;
  projectId: string;
  messageId: string;
  details: any;
}) {
  await adminDb.collection('audit-logs').add({
    ...data,
    timestamp: new Date(),
    type: 'team-chat'
  });
}
```

**Actions:**
- `message_created`
- `message_edited`
- `message_deleted`
- `message_rate_limited`
- `message_profanity_blocked`
- `message_unauthorized_team`

---

## Error Responses

### HTTP Status Codes

| Code | Bedeutung | Beispiel |
|------|-----------|----------|
| 200 | Success | Message erstellt/bearbeitet/gelöscht |
| 400 | Bad Request | Fehlende Felder, Profanity |
| 401 | Unauthorized | Token fehlt/ungültig |
| 403 | Forbidden | Keine Permissions, Time-Limit |
| 404 | Not Found | Project/Message nicht gefunden |
| 429 | Too Many Requests | Rate-Limit erreicht |
| 500 | Server Error | Interner Fehler |

### Error Response Schema

```typescript
{
  error: string;    // Human-readable Error Message
  status: number;   // HTTP Status Code
}
```

### Client-Side Error Handling

```typescript
try {
  const response = await authenticatedFetch('/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();

    if (error.status === 429) {
      toast.error('Bitte warten Sie eine Minute.');
    } else if (error.status === 400 && error.error.includes('inappropriate')) {
      toast.error('Nachricht enthält unangemessene Inhalte.');
    } else if (error.status === 403) {
      toast.error('Keine Berechtigung.');
    } else {
      toast.error(error.error || 'Unbekannter Fehler');
    }

    throw new Error(error.error);
  }

  return await response.json();
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

---

## Testing

### Unit Tests (Jest)

```typescript
// src/app/api/v1/messages/__tests__/route.test.ts
import { POST } from '../route';

describe('POST /api/v1/messages', () => {
  it('sollte Message erstellen bei gültigem Token', async () => {
    const request = createMockRequest({
      headers: { 'Authorization': `Bearer ${validToken}` },
      body: { projectId: 'test-project', content: 'Test', ... }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.messageId).toBeDefined();
  });

  it('sollte 401 bei fehlendem Token', async () => {
    const request = createMockRequest({ body: { ... } });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('sollte 429 bei Rate-Limit', async () => {
    // Sende 10 Messages
    for (let i = 0; i < 10; i++) {
      await POST(createValidRequest());
    }

    // 11. Message sollte fehlschlagen
    const response = await POST(createValidRequest());
    expect(response.status).toBe(429);
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/team-chat-api-routes.spec.ts
import { test, expect } from '@playwright/test';

test('sollte Rate-Limiting nach 10 Messages triggern', async ({ page }) => {
  await page.goto('/projects/test-project');

  // Sende 10 Messages
  for (let i = 0; i < 10; i++) {
    await page.fill('[data-testid="message-input"]', `Message ${i}`);
    await page.click('[data-testid="send-button"]');
  }

  // 11. Message
  await page.fill('[data-testid="message-input"]', 'Message 11');
  await page.click('[data-testid="send-button"]');

  await expect(page.locator('[data-testid="error-message"]')).toContainText(
    'Rate limit exceeded'
  );
});
```

---

**Version:** 2.0.0
**Letzte Aktualisierung:** 2025-10-20
