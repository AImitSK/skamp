# Implementierungsplan: Neues Email-Versand-System

**Datum:** 2025-01-12
**Status:** Planning
**Version:** 2.0 (Komplette Neuentwicklung)

---

## 1. Architektur-Übersicht

### Neue API-Endpunkte
```
/api/email/send        - Sofortiger Versand oder Planung
/api/email/cron/process - Vercel Cronjob (verarbeitet geplante Emails)
/api/email/status      - Status-Abfrage für gesendete Emails
```

### Vorteile dieser Architektur
- Klare Trennung: Planung vs. Ausführung
- Code-Wiederverwendung mit Test-Email-Route
- Skalierbar durch Vercel Cronjobs
- Keine Worker-Prozesse nötig

---

## 2. Datenmodell (Firestore)

### Collection: `scheduled_emails`
```typescript
{
  id: string;
  campaignId: string;
  organizationId: string;
  status: 'scheduled' | 'processing' | 'sent' | 'failed';
  scheduledFor: Timestamp;
  createdAt: Timestamp;
  processedAt?: Timestamp;

  // Email-Daten (identisch zu Test-Email)
  draft: {
    recipients: {
      listIds: string[];
      manual: ManualRecipient[];
    };
    sender: SenderInfo;
    content: {
      body: string;
      signatureId?: string;
    };
    metadata: {
      subject: string;
      preheader: string;
    };
  };

  // Ergebnis nach Versand
  result?: {
    successCount: number;
    failureCount: number;
    errors?: string[];
  };
}
```

---

## 3. Komponenten-Details

### 3.1 `/api/email/send` Route
**Funktion**: Entscheidet zwischen sofortigem Versand und Planung

```typescript
// Pseudo-Code
export async function POST(req: Request) {
  const { draft, campaign, sendAt } = await req.json();

  // Auth & Validation
  const auth = await authenticateRequest(req);

  if (sendAt && new Date(sendAt) > new Date()) {
    // PLANUNG: In Firestore speichern
    await adminDb.collection('scheduled_emails').add({
      status: 'scheduled',
      scheduledFor: admin.firestore.Timestamp.fromDate(new Date(sendAt)),
      draft,
      campaignId: campaign.id,
      organizationId: auth.organizationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, scheduled: true };
  } else {
    // SOFORT: Direkt versenden (Logik aus Test-Email)
    const result = await sendEmailsNow(draft, campaign, auth);
    return { success: true, result };
  }
}
```

### 3.2 Shared Service: `email-sender-service.ts`
**Funktion**: Gemeinsame Versand-Logik für Test-Email, Sofort-Versand und Cron

**Ort:** `src/lib/email/email-sender-service.ts`

```typescript
export class EmailSenderService {
  // Lädt Campaign, Signature, generiert PDF, etc.
  async prepareEmailData(
    campaignId: string,
    organizationId: string,
    signatureId?: string
  ): Promise<PreparedEmailData> {
    // 1. Campaign laden
    const campaign = await this.loadCampaign(campaignId, organizationId);

    // 2. HTML-Signatur laden (Admin SDK)
    const signatureHtml = await this.loadSignature(signatureId);

    // 3. PDF generieren
    const pdfBase64 = await this.generatePDF(campaign);

    // 4. Media-Share-Link
    const mediaShareUrl = await this.getOrCreateShareLink(campaign);

    return { campaign, signatureHtml, pdfBase64, mediaShareUrl };
  }

  // Versendet an alle Empfänger
  async sendToRecipients(
    recipients: Recipients,
    preparedData: PreparedEmailData,
    sender: SenderInfo,
    metadata: EmailMetadata
  ): Promise<SendResult> {
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[]
    };

    // Empfänger aus Listen laden
    const allRecipients = await this.loadAllRecipients(recipients);

    // Einzeln versenden
    for (const recipient of allRecipients) {
      try {
        const variables = this.prepareVariables(recipient, sender, preparedData.campaign);
        const html = this.buildEmailHtml(preparedData, variables, metadata);

        await this.sendViaSendGrid({
          to: recipient.email,
          subject: this.replaceVariables(metadata.subject, variables),
          html,
          attachments: [{
            content: preparedData.pdfBase64,
            filename: `${preparedData.campaign.title}.pdf`,
            type: 'application/pdf'
          }]
        });

        results.successCount++;
      } catch (error) {
        results.failureCount++;
        results.errors.push(`${recipient.email}: ${error.message}`);
      }
    }

    return results;
  }
}
```

### 3.3 `/api/email/cron/process` Route
**Funktion**: Von Vercel Cronjob alle 5 Minuten aufgerufen
**Ort**: `src/app/api/email/cron/process/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { EmailSenderService } from '@/lib/email/email-sender-service';

// POST Handler für den eigentlichen Cron-Job
export async function POST(request: NextRequest) {
  try {
    // 1. Authentifizierung (wie in cleanup-pending-signups)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.warn('[Email Cron] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[Email Cron] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Email Cron] Starting processing of scheduled emails...');

    const now = new Date();

    // 2. Alle fälligen Emails holen
    const snapshot = await adminDb
      .collection('scheduled_emails')
      .where('status', '==', 'scheduled')
      .where('scheduledFor', '<=', now)
      .limit(50) // Max 50 pro Durchlauf (wie in cleanup-pending-signups)
      .get();

    if (snapshot.empty) {
      console.log('[Email Cron] No scheduled emails to process');
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No scheduled emails'
      });
    }

    console.log(`[Email Cron] Found ${snapshot.size} scheduled emails to process`);

    const senderService = new EmailSenderService();
    const results = [];

    // 3. Emails verarbeiten
    for (const doc of snapshot.docs) {
      const emailJob = doc.data();
      console.log(`[Email Cron] Processing email job: ${doc.id}`);

      try {
        // Status auf processing setzen
        await doc.ref.update({ status: 'processing' });

        // Email vorbereiten und versenden
        const preparedData = await senderService.prepareEmailData(
          emailJob.campaignId,
          emailJob.organizationId,
          emailJob.draft.content.signatureId
        );

        const result = await senderService.sendToRecipients(
          emailJob.draft.recipients,
          preparedData,
          emailJob.draft.sender,
          emailJob.draft.metadata
        );

        // Erfolg speichern
        await doc.ref.update({
          status: 'sent',
          processedAt: new Date(),
          result
        });

        console.log(`[Email Cron] Successfully sent email job ${doc.id}: ${result.successCount} emails`);
        results.push({ id: doc.id, success: true, ...result });

      } catch (error: any) {
        console.error(`[Email Cron] Failed to process email job ${doc.id}:`, error);

        // Fehler speichern
        await doc.ref.update({
          status: 'failed',
          processedAt: new Date(),
          result: {
            successCount: 0,
            failureCount: 0,
            errors: [error.message]
          }
        });

        results.push({ id: doc.id, success: false, error: error.message });
      }
    }

    console.log(`[Email Cron] Finished processing ${results.length} email jobs`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Email Cron] Error during cron execution:', error);
    return NextResponse.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
}

// GET Handler für Health-Check (wie in cleanup-pending-signups)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Zähle pending scheduled emails
  const pendingSnapshot = await adminDb
    .collection('scheduled_emails')
    .where('status', '==', 'scheduled')
    .count()
    .get();

  return NextResponse.json({
    status: 'healthy',
    endpoint: 'email-cron-process',
    configured: !!cronSecret,
    pendingEmails: pendingSnapshot.data().count,
    timestamp: new Date().toISOString()
  });
}
```

---

## 4. Vercel Cron Konfiguration

### `vercel.json`

**Hinzufügen zu bestehender Konfiguration:**

```json
{
  "functions": {
    // ... existing functions ...
    "src/app/api/email/cron/process/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/email/send/route.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    // ... existing crons ...
    {
      "path": "/api/email/cron/process",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Cron-Expression:** `*/5 * * * *` = Alle 5 Minuten
**MaxDuration:** 300 Sekunden (5 Min) für Cron-Job, 60 Sekunden für Sofort-Versand

### Environment Variables
```bash
CRON_SECRET=<existing>                     # ✅ Bereits vorhanden
CRON_SERVICE_EMAIL=<existing>              # ✅ Bereits vorhanden
CRON_SERVICE_PASSWORD=<existing>           # ✅ Bereits vorhanden
CRON_SERVICE_UID=<existing>                # ✅ Bereits vorhanden
SENDGRID_API_KEY=<existing>                # ✅ Bereits vorhanden
NEXT_PUBLIC_BASE_URL=<existing>            # ✅ Bereits vorhanden
```

**Alle benötigten Environment Variables sind bereits konfiguriert!**

---

## 5. Frontend-Integration

### Step 4 (Versand-Planung) - UI-Erweiterung

**Datei:** `src/components/pr/email/Step4SendOptions.tsx`

```typescript
// Neues UI-Element
<div className="space-y-4">
  <div>
    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={sendMode === 'immediate'}
        onChange={() => setSendMode('immediate')}
        className="text-[#005fab] focus:ring-[#005fab]"
      />
      <span className="font-medium">Sofort versenden</span>
    </label>
  </div>

  <div>
    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={sendMode === 'scheduled'}
        onChange={() => setSendMode('scheduled')}
        className="text-[#005fab] focus:ring-[#005fab]"
      />
      <span className="font-medium">Geplanter Versand</span>
    </label>

    {sendMode === 'scheduled' && (
      <div className="ml-6 mt-3">
        <label className="block text-sm font-medium mb-1">
          Versandzeitpunkt
        </label>
        <Input
          type="datetime-local"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="max-w-xs"
        />
        <p className="text-sm text-gray-500 mt-1">
          Ihre Zeitzone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </p>
      </div>
    )}
  </div>
</div>
```

### Versand-Handler

```typescript
const handleSend = async () => {
  setIsSending(true);

  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draft: emailDraft,
        campaign: campaign,
        sendAt: sendMode === 'scheduled' ? scheduledDate : null
      })
    });

    if (!response.ok) {
      throw new Error('Versand fehlgeschlagen');
    }

    const data = await response.json();

    if (data.scheduled) {
      toast.success(`Email wurde geplant für ${new Date(scheduledDate).toLocaleString('de-DE')}`);
      router.push(`/pr/campaigns/${campaign.id}`);
    } else {
      toast.success(
        `Email versendet! ${data.result.successCount} erfolgreich, ${data.result.failureCount} fehlgeschlagen`
      );
      router.push(`/pr/campaigns/${campaign.id}`);
    }
  } catch (error) {
    toast.error('Fehler beim Email-Versand');
    console.error(error);
  } finally {
    setIsSending(false);
  }
};
```

---

## 6. Migrations-Plan

### Phase 1: Vorbereitung (1-2 Tage)
- [x] Alle Test-Email-Fixes dokumentiert
- [x] Environment Variables (CRON_SECRET, etc.) - Bereits vorhanden!
- [ ] `email-sender-service.ts` erstellen - Logik aus Test-Email extrahieren
- [ ] Collection `scheduled_emails` in Firestore erstellen
- [ ] TypeScript-Typen für neue Datenmodelle erstellen

### Phase 2: Backend (2-3 Tage)
- [ ] `/api/email/send` Route implementieren
- [ ] `/api/email/cron/process` Route implementieren
- [ ] `email-sender-service.ts` testen mit Unit-Tests
- [ ] Vercel Cron in `vercel.json` konfigurieren
- [ ] Test-Email-Route refactoren (auf neuen Service umstellen)

### Phase 3: Frontend (1-2 Tage)
- [ ] Step4 erweitern mit Datum/Zeit-Picker UI
- [ ] Send-Handler anpassen für neue API
- [ ] Loading-States und Error-Handling
- [ ] Status-Anzeige für geplante Emails (optional, in Campaign-Übersicht)

### Phase 4: Testing & Rollout (2-3 Tage)
- [ ] E2E-Tests für Sofort-Versand
- [ ] E2E-Tests für geplanten Versand (mit manueller Cron-Trigger)
- [ ] Staging-Deployment und Testing
- [ ] Migration alter geplanter Emails (falls vorhanden)
- [ ] Production-Deployment
- [ ] Alte `/api/email/schedule` Route als deprecated markieren

### Phase 5: Cleanup (1 Tag)
- [ ] Alte Route entfernen (nach 2 Wochen Übergangsphase)
- [ ] Monitoring für Cron-Job einrichten (Vercel Logs)
- [ ] Dokumentation aktualisieren
- [ ] Performance-Optimierungen falls nötig

---

## 7. Risiken & Mitigation

### Risiko 1: Vercel Cron Limits
**Problem**: Vercel Free-Tier hat Limits für Cron-Ausführung
**Lösung**:
- Alle 5 Minuten = 288 Ausführungen/Tag (sollte für MVP ausreichen)
- Monitoring einrichten für verpasste Ausführungen
- Bei Bedarf: Upgrade auf Pro-Plan oder SendGrid Scheduled Send API als Fallback

### Risiko 2: Zeitzone-Probleme
**Problem**: Benutzer wählt lokale Zeit, Server interpretiert falsch
**Lösung**:
- Frontend sendet ISO-String mit Timezone-Info
- Backend verwendet `Timestamp.fromDate()` (UTC-basiert)
- UI zeigt gewählte Zeit in Benutzer-Timezone an
- Bestätigungs-Dialog mit formatierter Zeit vor Planung

### Risiko 3: Große Empfänger-Listen
**Problem**: Versand dauert zu lange, Vercel Function Timeout (10 Min bei Pro)
**Lösung**:
- Batch-Processing: Max 50 Email-Jobs pro Cron-Durchlauf
- Pro Email-Job: Max 100 Empfänger gleichzeitig versenden
- Große Listen werden über mehrere Durchläufe verteilt
- Status-Tracking pro Email-Job
- Progress-Indication im Frontend

### Risiko 4: SendGrid Rate Limits
**Problem**: SendGrid hat Rate Limits je nach Plan
**Lösung**:
- Rate Limiting im Code implementieren (z.B. 10 Emails/Sekunde)
- Retry-Logik mit Exponential Backoff
- Error-Handling für 429-Responses
- Monitoring für SendGrid-Quota

### Risiko 5: Fehler beim PDF-Generation
**Problem**: PDF-Service schlägt fehl, Email kann nicht versendet werden
**Lösung**:
- Fallback: Email ohne PDF versenden (mit Hinweis)
- Retry-Logik für PDF-Generation (max 3 Versuche)
- Detailliertes Error-Logging
- Admin-Benachrichtigung bei wiederholten Fehlern

---

## 8. Erfolgs-Kriterien

### Feature-Parität erreicht wenn:
- ✅ Sofort-Versand funktioniert wie Test-Email
- ✅ HTML-Signaturen werden korrekt geladen (Admin SDK)
- ✅ PDFs enthalten korrekten Content (mainContent, nicht contentHtml)
- ✅ Media-Share-Links werden eingefügt
- ✅ Variablen werden ersetzt (salutationFormal, title, etc.)
- ✅ Geplanter Versand funktioniert zuverlässig (±5 Minuten Genauigkeit)
- ✅ Alte `/api/email/schedule` Route kann deaktiviert werden
- ✅ Keine unnötigen Info-Boxen im Email-Body

### Qualitäts-Kriterien:
- ✅ Unit-Tests für `email-sender-service.ts` (min. 80% Coverage)
- ✅ E2E-Tests für beide Versand-Modi
- ✅ Logging für Debugging (wie in Test-Email)
- ✅ Error-Handling mit aussagekräftigen Meldungen
- ✅ TypeScript-Typen für alle neuen APIs
- ✅ Dokumentation (API-Docs, User-Docs)

### Performance-Kriterien:
- ✅ Sofort-Versand: < 30 Sekunden für 100 Empfänger
- ✅ Cron-Verarbeitung: < 5 Minuten für 50 Email-Jobs
- ✅ PDF-Generation: < 5 Sekunden pro PDF
- ✅ Keine Memory-Leaks bei großen Listen

---

## 9. Code-Extraktion aus Test-Email

### Zu extrahierende Funktionen aus `/api/email/test/route.ts`:

1. **Signature Loading** (Zeilen 60-80)
   ```typescript
   async loadSignature(signatureId?: string): Promise<string>
   ```

2. **PDF Generation** (Zeilen 85-150)
   ```typescript
   async generatePDF(campaign: PRCampaign): Promise<string>
   ```

3. **Media Share Link** (Zeilen 155-165)
   ```typescript
   async getOrCreateShareLink(campaign: PRCampaign): Promise<string | undefined>
   ```

4. **Variable Preparation** (bereits in email-composer-service.ts)
   ```typescript
   prepareVariables(contact, sender, campaign): EmailVariables
   ```

5. **Email HTML Building** (Zeilen 170-250)
   ```typescript
   buildEmailHtml(preparedData, variables, metadata, isTest): string
   ```

6. **SendGrid Sending** (Zeilen 255-290)
   ```typescript
   async sendViaSendGrid(emailData): Promise<void>
   ```

---

## 10. Nächste Schritte

### Sofort starten mit:
1. **Phase 1, Task 3**: `src/lib/email/email-sender-service.ts` erstellen
2. **Phase 1, Task 3**: Logik aus `/api/email/test/route.ts` extrahieren
3. **Phase 1, Task 4**: Collection `scheduled_emails` in Firestore anlegen (kann auch später)
4. **Phase 1, Task 5**: TypeScript-Typen für neue Datenmodelle erstellen

**WICHTIG:** Alle Environment Variables (CRON_SECRET, etc.) sind bereits vorhanden!

### Geschätzter Gesamtaufwand:
**5-8 Arbeitstage** (alle Phasen, da Infrastruktur bereits vorhanden)

---

## 11. Offene Fragen

- [ ] Soll es eine Admin-UI geben um geplante Emails einzusehen/zu stornieren?
- [ ] Soll es Email-Benachrichtigungen bei fehlgeschlagenen Versänden geben?
- [ ] Wie lange sollen alte `scheduled_emails` Dokumente aufbewahrt werden? (Auto-Cleanup nach 30 Tagen?)
- [ ] Brauchen wir eine Vorschau-Funktion für geplante Emails?
- [ ] Soll der Absender eine Bestätigungs-Email nach erfolgreichem Versand erhalten?

---

**Letzte Aktualisierung:** 2025-01-12
**Erstellt von:** Claude AI
**Review:** Pending
