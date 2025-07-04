# SKAMP API Dokumentation

## 📋 Inhaltsverzeichnis
- [Übersicht](#übersicht)
- [Authentifizierung](#authentifizierung)
- [AI/KI-Endpoints](#aiki-endpoints)
- [SendGrid-Endpoints](#sendgrid-endpoints)
- [Öffentliche Share-Endpoints](#öffentliche-share-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Beispiele](#beispiele)

## 🌐 Übersicht

Die SKAMP API verwendet Next.js 14 App Router API Routes. Alle API-Endpoints befinden sich unter `/api/`.

### Base URL
```
Development: http://localhost:3000/api
Production: https://app.skamp.de/api
```

### Response Format
Alle API-Responses folgen diesem Format:
```json
{
  "success": true|false,
  "data": {...} | "result",
  "error": "Fehlermeldung bei success: false",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## 🔐 Authentifizierung

Die meisten API-Endpoints erfordern Firebase Authentication. Öffentliche Endpoints sind speziell gekennzeichnet.

### Firebase Auth Token
```javascript
// Client-side Authentication
const idToken = await auth.currentUser.getIdToken();

// API Request mit Token
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  }
});
```

## 🤖 AI/KI-Endpoints

### Generate Press Release
Generiert eine neue Pressemitteilung mit Google Gemini.

**Endpoint:** `POST /api/ai/generate`

**Request Body:**
```json
{
  "prompt": "Produkteinführung für neue KI-Software",
  "mode": "generate",
  "context": {
    "industry": "Technologie",
    "tone": "modern",
    "audience": "b2b"
  }
}
```

**Parameters:**
- `prompt` (required): Beschreibung der gewünschten Pressemitteilung
- `mode` (required): `"generate"` für neue Texte, `"improve"` für Verbesserungen
- `existingContent` (optional): Bestehender Text bei `mode: "improve"`
- `context` (optional): Kontext-Informationen
  - `industry`: Branche
  - `tone`: `"formal"` | `"modern"` | `"technical"` | `"startup"`
  - `audience`: `"b2b"` | `"consumer"` | `"media"`

**Response:**
```json
{
  "success": true,
  "generatedText": "<h1>Überschrift</h1><p>...</p>",
  "mode": "generate",
  "aiProvider": "gemini",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "postProcessed": false
}
```

**Error Codes:**
- `400`: Ungültiger Request (fehlender Prompt)
- `401`: Ungültiger Gemini API Key
- `429`: Quota überschritten
- `500`: Server-Fehler

---

### Generate Structured Press Release
Generiert eine strukturierte Pressemitteilung mit separaten Komponenten.

**Endpoint:** `POST /api/ai/generate-structured`

**Request Body:**
```json
{
  "prompt": "Neue Partnerschaft zwischen Tech-Unternehmen",
  "context": {
    "industry": "Technologie",
    "tone": "professional",
    "audience": "media",
    "companyName": "TechCorp GmbH"
  }
}
```

**Response:**
```json
{
  "success": true,
  "structured": {
    "headline": "TechCorp und DataPro vereinen Kräfte",
    "leadParagraph": "Die führenden Tech-Unternehmen...",
    "bodyParagraphs": [
      "Die Partnerschaft umfasst...",
      "Gemeinsam werden die Unternehmen...",
      "Der Markt reagiert positiv..."
    ],
    "quote": {
      "text": "Diese Partnerschaft ist ein Meilenstein",
      "person": "Dr. Max Müller",
      "role": "CEO",
      "company": "TechCorp GmbH"
    },
    "boilerplate": "Über TechCorp: TechCorp ist..."
  },
  "headline": "TechCorp und DataPro vereinen Kräfte",
  "htmlContent": "<p><strong>Die führenden...</strong></p>...",
  "rawText": "Original Gemini Output...",
  "aiProvider": "gemini",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### Get AI Templates
Lädt vordefinierte Templates für verschiedene Pressemitteilungstypen.

**Endpoint:** `GET /api/ai/templates`

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "product",
      "title": "Produkteinführung (Tech)",
      "category": "product",
      "prompt": "Produktname: DataSense Pro...",
      "industries": ["Technologie & Software", "E-Commerce"],
      "structure": {
        "focus": ["Problem/Challenge", "Lösung", "Vorteile"],
        "tone": "modern",
        "audience": "b2b"
      },
      "description": "Produktname: DataSense Pro..."
    }
  ],
  "count": 10,
  "categories": ["product", "finance", "partnership", "corporate"],
  "version": "2.0"
}
```

**Template Categories:**
- `product`: Produktankündigungen
- `finance`: Finanzierungsrunden
- `partnership`: Partnerschaften
- `corporate`: Unternehmensnews
- `research`: Studien & Forschung
- `event`: Veranstaltungen

---

### AI Health Check
Prüft den Status des AI-Services.

**Endpoint:** `GET /api/ai/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "service": "SKAMP Gemini AI Assistant",
  "version": "1.0.0",
  "configured": true
}
```

## 📧 SendGrid-Endpoints

### Send PR Campaign
Versendet eine PR-Kampagne an mehrere Empfänger.

**Endpoint:** `POST /api/sendgrid/send-pr-campaign`

**Request Body:**
```json
{
  "recipients": [
    {
      "email": "journalist@zeitung.de",
      "name": "Max Mustermann",
      "firstName": "Max",
      "lastName": "Mustermann",
      "companyName": "Tageszeitung"
    }
  ],
  "campaignEmail": {
    "subject": "{{companyName}} präsentiert neue Innovation",
    "greeting": "Sehr geehrte/r {{firstName}} {{lastName}},",
    "introduction": "wir freuen uns, Ihnen heute...",
    "pressReleaseHtml": "<h1>Überschrift</h1><p>Inhalt...</p>",
    "closing": "Für weitere Informationen stehen wir gerne zur Verfügung.",
    "signature": "Mit freundlichen Grüßen\n{{senderName}}\n{{senderTitle}}"
  },
  "senderInfo": {
    "name": "Anna Schmidt",
    "title": "PR Manager",
    "company": "TechCorp GmbH",
    "phone": "+49 123 456789",
    "email": "pr@techcorp.de"
  }
}
```

**Variablen für Personalisierung:**
- `{{firstName}}`, `{{lastName}}`, `{{fullName}}`
- `{{companyName}}`
- `{{senderName}}`, `{{senderTitle}}`, `{{senderCompany}}`
- `{{currentDate}}`

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "email": "journalist@zeitung.de",
      "status": "sent",
      "messageId": "sg-message-id-123"
    }
  ],
  "summary": {
    "total": 1,
    "success": 1,
    "failed": 0
  }
}
```

---

### SendGrid Webhook
Empfängt Event-Updates von SendGrid (Öffnungen, Klicks, Bounces).

**Endpoint:** `POST /api/sendgrid/webhook`

**🔓 Öffentlich** (kein Auth Token erforderlich)

**Request Body (von SendGrid):**
```json
[
  {
    "email": "recipient@example.com",
    "timestamp": 1642000000,
    "event": "delivered",
    "sg_message_id": "msg-123",
    "smtp-id": "smtp-123"
  },
  {
    "email": "recipient@example.com",
    "timestamp": 1642000100,
    "event": "open",
    "ip": "192.168.1.1",
    "useragent": "Mozilla/5.0..."
  }
]
```

**Event Types:**
- `delivered`: E-Mail zugestellt
- `open`: E-Mail geöffnet
- `click`: Link geklickt
- `bounce`: E-Mail abgewiesen
- `dropped`: E-Mail verworfen
- `deferred`: Zustellung verzögert
- `blocked`: E-Mail blockiert

**Response:**
```json
{
  "success": true,
  "processed": 2
}
```

## 🔗 Öffentliche Share-Endpoints

### Freigabe-Ansicht
Zeigt eine Kampagne zur Freigabe an.

**Route:** `/freigabe/[shareId]` (Page, nicht API)

**🔓 Öffentlich** - Kein Login erforderlich

**Features:**
- Kampagnen-Vorschau
- Freigabe/Ablehnung mit Kommentar
- Angehängte Medien-Anzeige

### Media Share
Zeigt geteilte Medien-Dateien an.

**Route:** `/share/[shareId]` (Page, nicht API)

**🔓 Öffentlich** - Optional passwortgeschützt

**Features:**
- Datei-/Ordner-Anzeige
- Download (wenn erlaubt)
- Passwort-Schutz

## ❌ Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": "Beschreibung des Fehlers",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### Common Error Codes

| Status | Code | Beschreibung |
|--------|------|--------------|
| 400 | BAD_REQUEST | Ungültige Request-Daten |
| 401 | UNAUTHORIZED | Fehlende/ungültige Authentifizierung |
| 403 | FORBIDDEN | Keine Berechtigung |
| 404 | NOT_FOUND | Ressource nicht gefunden |
| 429 | RATE_LIMITED | Zu viele Anfragen |
| 500 | INTERNAL_ERROR | Server-Fehler |

### AI-spezifische Fehler

| Code | Beschreibung | Lösung |
|------|--------------|---------|
| QUOTA_EXCEEDED | Gemini API Limit erreicht | Später erneut versuchen |
| SAFETY_BLOCKED | Content von Safety-Filter blockiert | Prompt umformulieren |
| API_KEY_INVALID | Ungültiger API Key | GEMINI_API_KEY prüfen |

## ⏱️ Rate Limiting

### Gemini API Limits
- **Free Tier**: 60 Requests/Minute
- **Pro Tier**: 1000 Requests/Minute

### SendGrid Limits
- **Free**: 100 E-Mails/Tag
- **Essentials**: 40.000 E-Mails/Monat

### Implementierung
```javascript
// Exponential Backoff bei Rate Limits
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
        continue;
      }
      throw error;
    }
  }
}
```

## 💻 Beispiele

### Vollständiges Beispiel: Pressemitteilung generieren

```javascript
// 1. Template abrufen
const templatesRes = await fetch('/api/ai/templates');
const { templates } = await templatesRes.json();

// 2. Strukturierte PM generieren
const generateRes = await fetch('/api/ai/generate-structured', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({
    prompt: templates[0].prompt,
    context: {
      industry: 'Technologie',
      tone: 'modern',
      audience: 'b2b',
      companyName: 'Meine Firma GmbH'
    }
  })
});

const { structured, htmlContent } = await generateRes.json();

// 3. In Kampagne speichern
const campaign = {
  title: structured.headline,
  contentHtml: htmlContent,
  // ... weitere Felder
};
```

### E-Mail-Versand mit Tracking

```javascript
// 1. Kampagne versenden
const sendRes = await fetch('/api/sendgrid/send-pr-campaign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({
    recipients: contacts,
    campaignEmail: emailContent,
    senderInfo: senderData
  })
});

// 2. SendGrid Webhook konfigurieren
// In SendGrid Dashboard:
// Webhook URL: https://app.skamp.de/api/sendgrid/webhook
// Events: All

// 3. Events werden automatisch verarbeitet
// Status-Updates in Firestore: email_campaign_sends
```

## 🔒 Sicherheit

### Best Practices
1. **API Keys** immer in Umgebungsvariablen
2. **Rate Limiting** implementieren
3. **Input Validation** für alle Endpoints
4. **CORS** nur für erlaubte Origins
5. **Webhook Verification** für SendGrid

### Umgebungsvariablen
```env
# .env.local
GEMINI_API_KEY=your-gemini-api-key
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@skamp.de
SENDGRID_FROM_NAME=SKAMP
```

## 📚 Weiterführende Dokumentation

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Google Gemini API](https://ai.google.dev/docs)
- [SendGrid API](https://docs.sendgrid.com/api-reference)
- [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)