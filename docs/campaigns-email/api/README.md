# Campaign Email API Dokumentation

**Version:** 1.0
**Projekt:** CeleroPress / SKAMP

---

## 📋 API Endpoints Übersicht

| Endpoint | Methode | Beschreibung | Auth |
|----------|---------|--------------|------|
| `/api/pr/email/send` | POST | Sofort-Versand oder Planung | Firebase Token |
| `/api/pr/email/test` | POST | Test-Email versenden | Firebase Token |
| `/api/pr/email/cron` | POST | Geplante Emails verarbeiten | CRON_SECRET |
| `/api/pr/email/cron` | GET | Health-Check & Statistiken | CRON_SECRET |

---

## 1. POST /api/pr/email/send

**Zweck:** Email sofort versenden ODER für späteren Versand einplanen

### Request

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <firebase-id-token>
```

**Body (Sofort-Versand):**
```json
{
  "campaignId": "camp-123",
  "organizationId": "org-456",
  "sendImmediately": true,
  "draft": {
    "campaignId": "camp-123",
    "campaignTitle": "Neue Produkt-Ankündigung",
    "content": {
      "body": "Sehr geehrte{{r}} {{salutation}} {{lastName}},\n\nanbei senden wir Ihnen unsere Pressemitteilung zu {{campaignTitle}}.\n\nBeste Grüße",
      "signatureId": "sig-789" // Optional
    },
    // ⭐ WICHTIG: content.body ist NICHT campaign.mainContent
    // - content.body: User-verfasster Email-Text (personalisiert, mit Variablen)
    // - campaign.mainContent: Vollständige PM (nur im PDF-Anhang)
    "recipients": {
      "listIds": ["list-1", "list-2"],
      "listNames": ["Journalisten", "Tech-Medien"],
      "manual": [
        {
          "id": "manual-1",
          "email": "journalist@example.com",
          "firstName": "Max",
          "lastName": "Mustermann",
          "salutation": "Herr",
          "isValid": true
        }
      ],
      "totalCount": 25,
      "validCount": 25
    },
    "emailAddressId": "email-addr-123",
    "metadata": {
      "subject": "Pressemitteilung: Neue Produkt-Ankündigung",
      "preheader": "Kurze Zusammenfassung..."
    },
    "createdAt": "2025-11-13T10:00:00.000Z",
    "updatedAt": "2025-11-13T10:05:00.000Z"
  }
}
```

**Body (Geplanter Versand):**
```json
{
  "campaignId": "camp-123",
  "organizationId": "org-456",
  "sendImmediately": false,
  "scheduledDate": "2025-12-01T10:00:00.000Z",
  "draft": { /* Wie oben */ }
}
```

**Verfügbare Variablen in `content.body`:**

Die folgenden Variablen werden für jeden Empfänger individuell ersetzt:

| Variable | Beschreibung | Beispiel |
|----------|--------------|----------|
| `{{firstName}}` | Vorname des Empfängers | Max |
| `{{lastName}}` | Nachname des Empfängers | Mustermann |
| `{{salutation}}` | Anrede (Herr/Frau) | Herr |
| `{{salutationFormal}}` | Formelle Anrede | Sehr geehrter Herr |
| `{{title}}` | Titel des Empfängers | Dr. |
| `{{companyName}}` | Firma des Empfängers | Example GmbH |
| `{{campaignTitle}}` | Titel der Kampagne | Neue Produkt-Ankündigung |
| `{{senderName}}` | Name des Absenders | Anna Schmidt |

**Wichtig:** Variablen werden NUR im `content.body` ersetzt, NICHT in `campaign.mainContent` (PDF-Anhang)!

### Response

**Sofort-Versand (200 OK):**
```json
{
  "success": true,
  "result": {
    "successCount": 24,
    "failureCount": 1,
    "errors": [
      "invalid@example.com: Invalid email address"
    ]
  }
}
```

**Geplanter Versand (201 Created):**
```json
{
  "success": true,
  "scheduledEmailId": "scheduled-email-123",
  "scheduledFor": "2025-12-01T10:00:00.000Z"
}
```

### Fehler

**400 Bad Request:**
```json
{
  "success": false,
  "error": "campaignId ist erforderlich"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Campaign nicht gefunden: camp-123"
}
```

### Validation

```typescript
// Required Fields
if (!campaignId) {
  return { error: 'campaignId ist erforderlich' };
}

if (!organizationId) {
  return { error: 'organizationId ist erforderlich' };
}

if (!draft.emailAddressId) {
  return { error: 'Unvollstaendiger Email-Entwurf' };
}

if (!sendImmediately && !scheduledDate) {
  return { error: 'scheduledDate ist erforderlich' };
}

// Scheduled Date Validation
if (scheduledDate) {
  const sendAt = new Date(scheduledDate);
  if (sendAt <= new Date()) {
    return { error: 'Geplantes Datum muss in der Zukunft liegen' };
  }
}
```

---

## 2. POST /api/pr/email/test

**Zweck:** Test-Email an eine beliebige Email-Adresse senden

### Request

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <firebase-id-token>
```

**Body:**
```json
{
  "campaignId": "camp-123",
  "recipientEmail": "test@example.com",
  "recipientName": "Test User",
  "draft": { /* EmailDraft wie oben */ }
}
```

### Response

**200 OK:**
```json
{
  "success": true,
  "messageId": "msg-123456",
  "timestamp": "2025-11-13T10:00:00.000Z"
}
```

**Fehler:**
```json
{
  "success": false,
  "error": "SendGrid API error: Rate limit exceeded"
}
```

---

## 3. POST /api/pr/email/cron

**Zweck:** Verarbeitet geplante Emails (aufgerufen von Vercel Cron alle 5 Minuten)

### Request

**Headers:**
```http
Authorization: Bearer <cron-secret>
```

**Body:** Leer (GET-Request von Vercel)

### Response

**200 OK:**
```json
{
  "success": true,
  "processed": 5,
  "successful": 4,
  "failed": 1,
  "timestamp": "2025-11-13T10:00:00.000Z"
}
```

### Workflow

```typescript
// 1. Finde alle pending Emails mit sendAt <= now
const snapshot = await adminDb
  .collection('scheduled_emails')
  .where('status', '==', 'pending')
  .where('sendAt', '<=', Timestamp.now())
  .limit(10) // Batch-Processing
  .get();

// 2. Verarbeite jede Email
for (const doc of snapshot.docs) {
  try {
    // 2.1 Status auf 'processing' setzen
    await doc.ref.update({ status: 'processing' });

    // 2.2 Email-Daten vorbereiten
    const preparedData = await emailSenderService.prepareEmailData(
      scheduledEmail.campaignId,
      scheduledEmail.organizationId,
      scheduledEmail.draft.content.signatureId,
      scheduledEmail.userId
    );

    // 2.3 Email versenden
    const result = await emailSenderService.sendToRecipients(
      scheduledEmail.draft.recipients,
      preparedData,
      scheduledEmail.draft.emailAddressId,
      scheduledEmail.draft.metadata
    );

    // 2.4 Status auf 'sent' setzen
    await doc.ref.update({
      status: 'sent',
      sentAt: Timestamp.now(),
      result: result
    });

  } catch (error) {
    // 2.5 Bei Fehler: Retry-Counter erhöhen
    const attempts = scheduledEmail.attempts + 1;
    if (attempts >= 3) {
      // Max retries erreicht → failed
      await doc.ref.update({
        status: 'failed',
        attempts: attempts,
        error: error.message
      });
    } else {
      // Retry möglich → zurück auf pending
      await doc.ref.update({
        status: 'pending',
        attempts: attempts,
        lastError: error.message
      });
    }
  }
}
```

---

## 4. GET /api/pr/email/cron

**Zweck:** Health-Check für Monitoring und Debugging

### Request

**Headers:**
```http
Authorization: Bearer <cron-secret>
```

### Response

**200 OK (Healthy):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-13T10:00:00.000Z",
  "stats": {
    "pending": 5,
    "processing": 0
  }
}
```

**500 Internal Server Error (Unhealthy):**
```json
{
  "status": "unhealthy",
  "error": "Firestore connection failed"
}
```

### Verwendung

```bash
# Health-Check
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/pr/email/cron

# Mit jq für Pretty Print
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/pr/email/cron | jq
```

---

## Services API

### emailSenderService

**Datei:** `src/lib/email/email-sender-service.ts`

#### prepareEmailData()

```typescript
interface PreparedEmailData {
  campaign: PRCampaign;
  signatureHtml: string;
  pdfBase64: string;
  mediaShareUrl?: string;
}

async prepareEmailData(
  campaignId: string,
  organizationId: string,
  signatureId?: string,
  userId?: string
): Promise<PreparedEmailData>
```

**Was macht es:**
1. Lädt Campaign aus Firestore
2. Lädt HTML-Signatur (optional)
3. Generiert PDF aus Campaign-Content
4. Holt/Erstellt Media-Share-Link

**Verwendung:**
```typescript
const preparedData = await emailSenderService.prepareEmailData(
  'camp-123',
  'org-456',
  'sig-789',
  'user-123'
);

// preparedData.pdfBase64 → Anhang
// preparedData.signatureHtml → Email-Footer
// preparedData.mediaShareUrl → Link in Email
```

#### sendToRecipients()

```typescript
interface SendResult {
  successCount: number;
  failureCount: number;
  errors: string[];
}

async sendToRecipients(
  recipients: EmailDraft['recipients'],
  preparedData: PreparedEmailData,
  emailAddressId: string,
  metadata: EmailMetadata,
  emailBody: string  // ⭐ NEU: User-verfasster Email-Text
): Promise<SendResult>
```

**Was macht es:**
1. Lädt EmailAddress aus Firestore
2. Validiert Verifizierung (isActive, verificationStatus)
3. **Filtert ungültige Email-Adressen** (trailing/leading dots, fehlende Domain)
3. Lädt alle Empfänger (Listen + Manuelle)
4. Sendet einzeln via SendGrid
5. Generiert Reply-To Address

**Parameter:**
- `emailBody`: User-verfasster Text aus `draft.content.body`
  - Enthält Variablen wie `{{firstName}}`, `{{companyName}}`
  - Wird personalisiert für jeden Empfänger
  - **Unterscheidet sich von `campaign.mainContent`** (PDF-Anhang)

**Verwendung:**
```typescript
const result = await emailSenderService.sendToRecipients(
  draft.recipients,
  preparedData,
  'email-addr-123',
  draft.metadata,
  draft.content.body  // ⭐ Email-Body aus Draft
);

console.log(`Erfolgreich: ${result.successCount}`);
console.log(`Fehlgeschlagen: ${result.failureCount}`);
console.log(`Fehler: ${result.errors.join(', ')}`);
```

**Email-Validierung:**

Der Service filtert automatisch ungültige Email-Adressen:
- ❌ Trailing/leading dots: `example.@domain.com`, `.user@domain.com`
- ❌ Fehlende Domain: `user@`
- ❌ Fehlende TLD: `user@domain`
- ✅ Duplikate werden entfernt

Bei ungültigen Emails erscheint in den Logs: `⚠️ Ungültige Email-Adresse übersprungen: {email}`
```

### emailAddressService

**Datei:** `src/lib/email/email-address-service.ts`

#### getEmailAddressById()

```typescript
async getEmailAddressById(id: string): Promise<EmailAddress | null>
```

**Verwendung:**
```typescript
const emailAddress = await emailAddressService.getEmailAddressById('email-123');
if (!emailAddress) {
  throw new Error('EmailAddress nicht gefunden');
}
```

#### getEmailAddressesByOrganization()

```typescript
async getEmailAddressesByOrganization(
  organizationId: string
): Promise<EmailAddress[]>
```

**Verwendung (Client-Side):**
```typescript
// In React Komponente
const addresses = await emailAddressService.getEmailAddressesByOrganization(
  currentOrganization.id
);

const activeAddresses = addresses.filter(
  addr => addr.isActive && addr.verificationStatus === 'verified'
);
```

#### generateReplyToAddress()

```typescript
async generateReplyToAddress(
  organizationId: string,
  emailAddressId: string
): Promise<string>
```

**Format:** `{prefix}-{shortOrgId}-{shortEmailId}@inbox.sk-online-marketing.de`

**Verwendung:**
```typescript
const replyTo = await emailAddressService.generateReplyToAddress(
  'org-456',
  'email-123'
);
// → "presse-org45678-email123@inbox.sk-online-marketing.de"
```

### emailComposerService

**Datei:** `src/lib/email/email-composer-service.ts`

#### prepareVariables()

```typescript
interface EmailVariables {
  recipient: {
    firstName: string;
    lastName: string;
    email: string;
    salutation: string;
    title?: string;
    companyName?: string;
  };
  sender: {
    name: string;
    email: string;
    company?: string;
    title?: string;
    phone?: string;
  };
  campaign: {
    title: string;
    date: string;
    clientName: string;
  };
}

prepareVariables(
  recipientData: any,
  senderData: any,
  campaign: PRCampaign
): EmailVariables
```

#### replaceVariables()

```typescript
replaceVariables(
  text: string,
  variables: EmailVariables
): string
```

**Verfügbare Variablen:**
- `{{firstName}}` → Max
- `{{lastName}}` → Mustermann
- `{{email}}` → max@example.com
- `{{companyName}}` → Example GmbH
- `{{campaignTitle}}` → Neue Produkt-Ankündigung
- `{{senderName}}` → Stefan Kühne
- `{{senderEmail}}` → presse@pr.celeropress.de

**Verwendung:**
```typescript
const variables = emailComposerService.prepareVariables(
  recipient,
  sender,
  campaign
);

const personalizedSubject = emailComposerService.replaceVariables(
  "Pressemitteilung für {{companyName}}: {{campaignTitle}}",
  variables
);
// → "Pressemitteilung für Example GmbH: Neue Produkt-Ankündigung"
```

---

## Error Codes & Messages

### Common Errors

| Error Code | Message | Bedeutung | Lösung |
|------------|---------|-----------|--------|
| 400 | `campaignId ist erforderlich` | Campaign-ID fehlt | `campaignId` im Request body |
| 400 | `Unvollstaendiger Email-Entwurf` | Draft incomplete | Alle required Fields prüfen |
| 400 | `Geplantes Datum muss in der Zukunft liegen` | Scheduled date in past | Datum korrigieren |
| 401 | `Unauthorized` | Missing/Invalid auth | Token prüfen |
| 401 | `Invalid token` | Firebase token invalid | Neu einloggen |
| 404 | `Campaign nicht gefunden: {id}` | Campaign existiert nicht | Campaign-ID prüfen |
| 403 | `Zugriff verweigert: Campaign gehört zu anderer Organization` | Wrong organization | Organization-Check |
| 500 | `EmailAddress nicht gefunden: {id}` | EmailAddress deleted/invalid | EmailAddress prüfen |
| 500 | `EmailAddress ist nicht aktiv oder verifiziert` | Email not verified | SendGrid verifizieren |
| 500 | `PDF-Generation fehlgeschlagen` | PDF API error | Content/Template prüfen |
| 500 | `SendGrid rate limit exceeded` | Too many emails | Warten oder Upgrade |

### SendGrid Error Handling

```typescript
try {
  await sgMail.send(msg);
} catch (error: any) {
  if (error.code === 403) {
    // Domain nicht verifiziert
    throw new Error('SendGrid Domain Authentication erforderlich');
  }
  if (error.code === 429) {
    // Rate Limit
    throw new Error('SendGrid Rate Limit erreicht');
  }
  if (error.code === 401) {
    // Invalid API Key
    throw new Error('SendGrid API Key ungültig');
  }
  throw error;
}
```

---

## Rate Limiting

### SendGrid Limits

**Free Tier:**
- 100 emails/Tag
- 2.000 Kontakte

**Essentials ($19.95/Monat):**
- 50.000 emails/Monat
- 5.000 Kontakte

**Pro ($89.95/Monat):**
- 100.000+ emails/Monat
- 10.000+ Kontakte

### Batch-Processing

```typescript
// Cron-Job limitiert auf 10 Emails pro Run
const snapshot = await adminDb
  .collection('scheduled_emails')
  .where('status', '==', 'pending')
  .where('sendAt', '<=', Timestamp.now())
  .limit(10) // ← Batch Size
  .get();
```

**Warum 10?**
- Verhindert Timeouts (Vercel: 10s Limit für Hobby, 60s für Pro)
- Verhindert SendGrid Rate Limits
- Ermöglicht schnelle Iteration (alle 5 Minuten)

---

## Testing

### API Tests

**Datei:** `src/__tests__/api/pr/email/send.test.ts`

```typescript
describe('POST /api/pr/email/send', () => {
  it('sollte Email sofort versenden', async () => {
    mockEmailSenderService.sendToRecipients.mockResolvedValue({
      successCount: 10,
      failureCount: 0,
      errors: []
    });

    const response = await POST(createMockRequest({
      campaignId: 'camp-123',
      organizationId: 'org-456',
      draft: validDraft,
      sendImmediately: true
    }, 'valid-token'));

    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.result.successCount).toBe(10);
  });
});
```

### Integration Tests

```bash
# Alle API Tests
npm test -- src/__tests__/api/pr/email

# Nur Send API
npm test -- send.test.ts

# Nur Cron API
npm test -- cron.test.ts
```

---

## Weitere Informationen

- [Haupt-Dokumentation](../README.md)
- [Komponenten-Dokumentation](../components/README.md)
- [Architecture Decision Records](../adr/README.md)

---

**Version:** 1.0
**Letzte Aktualisierung:** 13. November 2025
