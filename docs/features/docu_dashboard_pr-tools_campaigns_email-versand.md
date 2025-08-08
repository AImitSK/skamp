# Feature-Dokumentation: E-Mail-Versand für PR-Kampagnen

## 🎯 Überblick

Das E-Mail-Versand-System ist ein kritischer Bestandteil der CeleroPress PR-Kampagnen-Plattform. Es ermöglicht den professionellen Versand von Pressemitteilungen an ausgewählte Medienverteiler mit umfassendem Tracking und Analytics.

## 📋 Kernfunktionen

### 1. Versand-Workflow
```
Kampagne (approved) → EmailSendModal → Empfänger-Validierung → 
SendGrid API → Tracking-Setup → Status-Update → Real-time Analytics
```

### 2. Technische Integration
- **E-Mail-Service**: SendGrid API v3
- **Tracking**: Webhook-basierte Öffnungs-/Klick-Verfolgung  
- **Template-System**: HTML/Text E-Mail-Vorlagen
- **Fehlerbehandlung**: Bounce/Spam-Management

## 🔧 Technische Architektur

### EmailSendModal Komponente
**Datei**: `src/components/pr/EmailSendModal.tsx`

**Funktionen**:
- Empfänger-Vorschau aus Verteilerlisten
- E-Mail-Template-Preview 
- Versand-Zeitplanung (sofort/geplant)
- Validierung und Fehlerbehandlung

```typescript
interface EmailSendModalProps {
  campaign: PRCampaign;
  onClose: () => void;
  onSent: (result: SendResult) => void;
}
```

### SendGrid Service Integration
**Datei**: `src/lib/email/sendgrid-service.ts`

**Methoden**:
```typescript
class SendGridService {
  async sendCampaignEmails(campaign: PRCampaign, recipients: EmailRecipient[]): Promise<SendResult>
  async validateEmailList(emails: string[]): Promise<ValidationResult>
  async setupTrackingWebhooks(): Promise<void>
  async processWebhookEvent(event: WebhookEvent): Promise<void>
}
```

## 📊 E-Mail-Template-System

### Template-Struktur
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{campaign.title}}</title>
</head>
<body>
  <div class="email-container">
    <header class="email-header">
      <img src="{{client.logo}}" alt="{{client.name}}">
      <h1>{{campaign.title}}</h1>
    </header>
    
    <main class="email-content">
      {{{campaign.contentHtml}}}
      
      <!-- Boilerplate Sections -->
      {{#each boilerplateSections}}
        <section class="boilerplate-{{type}}">
          {{{content}}}
        </section>
      {{/each}}
    </main>
    
    <footer class="email-footer">
      <p>{{client.name}} | {{client.contact}}</p>
      <!-- Tracking Pixel -->
      <img src="{{trackingPixelUrl}}" width="1" height="1" alt="">
    </footer>
  </div>
</body>
</html>
```

### Template-Variablen
- `{{campaign.*}}`: Kampagnen-Daten
- `{{client.*}}`: Kunden-Information
- `{{recipient.*}}`: Empfänger-spezifische Daten
- `{{trackingPixelUrl}}`: Analytics-Tracking-URL
- `{{unsubscribeUrl}}`: Abmelde-Link (DSGVO-konform)

## 🚀 Versand-Prozess (Detailliert)

### Phase 1: Pre-Send Validation
1. **Kampagnen-Status prüfen**: Muss `approved` oder `draft` sein
2. **Empfänger-Liste validieren**: 
   ```typescript
   const validation = await sendgridService.validateEmailList(recipients);
   // Entfernt bounced, spam-marked, ungültige Adressen
   ```
3. **Medien-Anhänge prüfen**: Max. 25MB Gesamtgröße
4. **Template-Rendering testen**: Vorschau generieren

### Phase 2: Send Preparation
1. **Tracking-URLs generieren**:
   ```typescript
   const trackingData = {
     campaignId: campaign.id,
     recipientId: recipient.id,
     trackingPixelUrl: `${baseUrl}/track/open/${campaignId}/${recipientId}`,
     clickTrackingUrls: generateClickTrackingUrls(campaign.contentHtml)
   };
   ```

2. **E-Mail-Personalisierung**:
   ```typescript
   const personalizedContent = templateEngine.render(campaign.contentHtml, {
     recipient: recipient,
     client: client,
     campaign: campaign,
     tracking: trackingData
   });
   ```

### Phase 3: Batch-Versand
```typescript
// Versand in 50er-Batches (SendGrid-Limit: 1000/Sekunde)
const batches = chunkArray(validRecipients, 50);
for (const batch of batches) {
  const sendResult = await sendgridService.sendBatch({
    from: campaign.senderEmail,
    subject: campaign.title,
    html: personalizedContent,
    recipients: batch,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true, substitutionTag: '%openTrack%' }
    }
  });
  
  // Status-Updates in Echtzeit
  await prService.updateSendProgress(campaign.id, {
    sentCount: sendResult.sentCount,
    failedCount: sendResult.failedCount,
    status: 'sending'
  });
  
  // Rate-Limiting-Pause
  await sleep(100); 
}
```

### Phase 4: Post-Send Processing
1. **Kampagnen-Status aktualisieren**:
   ```typescript
   await prService.update(campaign.id, {
     status: 'sent',
     sentAt: serverTimestamp(),
     finalSendStats: {
       totalRecipients: recipients.length,
       successfulSends: successCount,
       failures: failureCount
     }
   });
   ```

2. **Analytics-System initialisieren**:
   ```typescript
   await analyticsService.initializeCampaignTracking(campaign.id, {
     expectedMetrics: ['opens', 'clicks', 'bounces', 'unsubscribes'],
     trackingPeriod: '30days'
   });
   ```

## 📈 Real-Time Analytics & Tracking

### Webhook-Events (SendGrid)
```typescript
interface WebhookEvent {
  event: 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spam_report';
  email: string;
  timestamp: number;
  campaignId: string;
  recipientId: string;
  url?: string; // für click events
  reason?: string; // für bounce/drop events
}
```

### Event-Processing
**Route**: `/api/webhooks/sendgrid`
```typescript
export async function POST(request: Request) {
  const events = await request.json();
  
  for (const event of events) {
    await processWebhookEvent(event);
  }
  
  return new Response('OK', { status: 200 });
}

async function processWebhookEvent(event: WebhookEvent) {
  // Analytics-Datenbank aktualisieren
  await analyticsService.recordEvent(event.campaignId, {
    type: event.event,
    recipientEmail: event.email,
    timestamp: new Date(event.timestamp * 1000),
    metadata: {
      clickedUrl: event.url,
      bounceReason: event.reason
    }
  });
  
  // Real-time Updates via WebSocket (optional)
  notificationService.broadcastAnalyticsUpdate(event.campaignId, event);
}
```

## ⚠️ Fehlerbehandlung & Compliance

### Bounce-Management
```typescript
class BounceHandler {
  async processBounce(event: WebhookEvent) {
    const bounceType = this.classifyBounce(event.reason);
    
    if (bounceType === 'hard') {
      // E-Mail dauerhaft als ungültig markieren
      await recipientService.markAsInvalid(event.email, {
        reason: 'hard_bounce',
        campaign: event.campaignId,
        timestamp: new Date()
      });
    } else if (bounceType === 'soft') {
      // Temporärer Fehler - Retry-Logic
      await this.scheduleRetry(event.email, event.campaignId);
    }
  }
}
```

### DSGVO-Compliance
1. **Einverständnis-Tracking**:
   ```typescript
   interface ConsentRecord {
     email: string;
     consentDate: Date;
     consentType: 'explicit' | 'legitimate_interest';
     source: 'import' | 'signup' | 'api';
     ipAddress: string;
   }
   ```

2. **Abmelde-Management**:
   ```typescript
   // Unsubscribe-URL in jeder E-Mail
   const unsubscribeUrl = `${baseUrl}/unsubscribe/${recipientId}/${campaignId}`;
   
   // One-Click Unsubscribe (RFC 8058)
   headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
   headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
   ```

## 🧪 Testing & Quality Assurance

### E-Mail-Vorschau-System
```typescript
// Verschiedene E-Mail-Clients simulieren
const previewClients = [
  'outlook_2016', 'gmail_webmail', 'apple_mail', 
  'outlook_mobile', 'gmail_mobile'
];

for (const client of previewClients) {
  const preview = await emailPreviewService.generatePreview({
    html: campaignHtml,
    client: client,
    deviceType: client.includes('mobile') ? 'mobile' : 'desktop'
  });
  
  // Automatische Prüfungen
  const issues = await emailValidator.checkIssues(preview, {
    checkImages: true,
    checkLinks: true,
    checkSpamScore: true
  });
}
```

### Spam-Score-Prüfung
```typescript
interface SpamAnalysis {
  score: number; // 0-10 (0 = kein Spam, 10 = definitiv Spam)
  issues: Array<{
    category: 'content' | 'headers' | 'links' | 'images';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
}
```

## 📊 Performance & Monitoring

### Versand-Metriken
- **Durchsatz**: Ziel 500 E-Mails/Minute
- **Erfolgsrate**: >95% Zustellrate
- **Latenz**: <30 Sekunden für 1000 Empfänger
- **Fehlerrate**: <1% technische Fehler

### Monitoring-Dashboard
```typescript
interface SendingMetrics {
  campaignsActive: number;
  emailsInQueue: number;
  avgDeliveryTime: number;
  currentThroughput: number;
  errorRate: number;
  webhookLatency: number;
}
```

## 🔒 Sicherheit

### API-Key-Management
- **SendGrid API-Key**: Rotiert monatlich
- **Webhook-Validierung**: HMAC-SHA256 Signatur-Prüfung
- **Rate-Limiting**: Max 10.000 E-Mails/Stunde pro Organization

### Daten-Sicherheit
- **E-Mail-Inhalte**: Verschlüsselt in Datenbank
- **Empfänger-Daten**: PII-Anonymisierung nach 2 Jahren
- **Tracking-Daten**: Cookie-less Tracking wo möglich

## 🚨 Notfall-Verfahren

### Versand-Stopp (Emergency)
```typescript
// Sofortiger Stopp aller Versendungen
await emergencyService.stopAllCampaigns({
  reason: 'content_issue', // oder 'technical_issue'
  affectedCampaigns: 'all', // oder specific campaign IDs
  notifyUsers: true
});
```

### Bounce-Storm-Behandlung
- **Trigger**: >10% Bounce-Rate in 10 Minuten
- **Aktion**: Automatischer Kampagnen-Stopp
- **Benachrichtigung**: Admin-Team + betroffene User

---

**Letzte Aktualisierung**: 08.08.2025  
**Version**: 1.0  
**Ansprechpartner**: PR-Tools Development Team