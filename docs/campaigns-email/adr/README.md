# Architecture Decision Records - Campaign Email System

**Version:** 1.0
**Projekt:** CeleroPress / SKAMP

---

## ADR-Übersicht

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| ADR-0001 | Verifizierte EmailAddress statt CRM-Kontakt-Emails | ✅ Accepted | Nov 2025 |
| ADR-0002 | React Hot Toast für User-Notifications | ✅ Accepted | Nov 2025 |
| ADR-0003 | 3-Step Wizard für Email-Composer | ✅ Accepted | Sep 2025 |
| ADR-0004 | Reply-To Forwarding zu CRM | ✅ Accepted | Okt 2025 |
| ADR-0005 | Vercel Cron für Scheduled Emails | ✅ Accepted | Sep 2025 |
| ADR-0006 | SendGrid als Email-Provider | ✅ Accepted | Sep 2025 |

---

## ADR-0001: Verifizierte EmailAddress statt CRM-Kontakt-Emails

**Status:** ✅ Accepted
**Datum:** November 2025
**Kontext:** Email-Versand mit unverifizierten CRM-Kontakt-Emails

### Problem

Das ursprüngliche System verwendete CRM-Kontakt-Emails als Absender:

```typescript
// ALT (Problematisch)
draft.sender = {
  type: 'contact',
  contactData: {
    email: 'journalist@example.com',  // ❌ Unverifiziert!
    name: 'Max Mustermann'
  }
};
```

**Probleme:**
1. ❌ **SendGrid 403 Forbidden** - Unverifizierte Domains
2. ❌ **Spoofing-Gefahr** - Beliebige Absender-Emails
3. ❌ **Keine Reply-To Verwaltung** - Antworten gehen verloren
4. ❌ **Keine Zentrale Verwaltung** - Absender pro Draft

### Entscheidung

Wir verwenden eine **dedizierte EmailAddress Collection** mit verifizierten Absender-Emails:

```typescript
// NEU (Production-Ready)
draft.emailAddressId = 'email-addr-123';

// EmailAddress Collection
interface EmailAddress {
  id: string;
  email: string;                    // presse@pr.celeropress.de
  domain: string;                   // pr.celeropress.de
  localPart: string;                // presse
  displayName: string;              // CeleroPress PR Team
  organizationId: string;
  isActive: boolean;                // true
  verificationStatus: 'verified';   // ✅ Verifiziert!
  isDefault: boolean;
}
```

### Alternativen

**Alternative 1: Weiter CRM-Kontakt-Emails verwenden**
- ❌ SendGrid Authentication nicht möglich
- ❌ 403 Forbidden Errors bleiben
- ❌ Professionelle Absender-Verwaltung fehlt

**Alternative 2: Hardcoded System-Email**
- ✅ Immer verifiziert
- ❌ Keine Flexibilität
- ❌ Keine Multi-Tenant Unterstützung

**Alternative 3: Absender pro User**
- ✅ Personalisiert
- ❌ Jeder User muss Domain verifizieren
- ❌ Zu komplex für Use-Case

### Konsequenzen

**Vorteile:**
- ✅ **Keine 403 Errors mehr** - Alle Emails verifiziert
- ✅ **Professionelle Absender** - Eigene PR-Domains
- ✅ **Reply-To Forwarding** - Automatisches Routing zu CRM
- ✅ **Zentrale Verwaltung** - Ein Service für alle
- ✅ **Multi-Tenant Ready** - Pro Organization

**Nachteile:**
- ⚠️ **Setup-Aufwand** - Domain Authentication in SendGrid
- ⚠️ **Migration Required** - Bestehende Drafts anpassen
- ⚠️ **Neue Komponente** - EmailAddressSelector

**Migration:**
```typescript
// Alte Drafts migrieren
const drafts = await getDrafts();
for (const draft of drafts) {
  if (draft.sender && !draft.emailAddressId) {
    // Finde passende EmailAddress für Organization
    const defaultEmail = await emailAddressService.getDefaultForOrganization(
      draft.organizationId
    );

    if (defaultEmail) {
      await updateDoc(draft.id, {
        emailAddressId: defaultEmail.id,
        sender: null // Deprecated Field entfernen
      });
    }
  }
}
```

---

## ADR-0002: React Hot Toast für User-Notifications

**Status:** ✅ Accepted
**Datum:** November 2025
**Kontext:** Inline Alert-Komponenten vs. Zentralisierte Toasts

### Problem

Jede Komponente hatte eigene Alert-State-Verwaltung:

```typescript
// ALT (Pro Komponente 35 Zeilen Code)
const [alert, setAlert] = useState<Alert | null>(null);

const showAlert = (type: 'success' | 'error', message: string) => {
  setAlert({ type, message });
  setTimeout(() => setAlert(null), 3000);
};

return (
  <>
    {alert && (
      <div className={`alert alert-${alert.type}`}>
        {alert.message}
        <button onClick={() => setAlert(null)}>×</button>
      </div>
    )}
    {/* Rest der Komponente */}
  </>
);
```

**Probleme:**
1. ❌ **Code-Duplikation** - Alert-State in jeder Komponente
2. ❌ **Inkonsistentes Styling** - Jede Komponente anders
3. ❌ **Blocking UI** - Alerts überdecken Content
4. ❌ **Manuelle Verwaltung** - setTimeout in jedem Handler

### Entscheidung

Wir verwenden **react-hot-toast** mit zentralem `toastService`:

```typescript
// NEU (0 Zeilen State-Management pro Komponente)
import { toastService } from '@/lib/utils/toast';

const handleCreate = async () => {
  try {
    await createSomething();
    toastService.success('Erfolgreich erstellt');
  } catch (error) {
    toastService.error('Fehler beim Erstellen');
  }
};
```

**Toast-Service:**
```typescript
// src/lib/utils/toast.ts
export const toastService = {
  success: (message: string) => toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: { /* CeleroPress Design System */ }
  }),

  error: (message: string) => toast.error(message, {
    duration: 5000,  // Länger für Fehler
    position: 'top-right'
  }),

  promise: <T>(promise: Promise<T>, messages: {...}) =>
    toast.promise(promise, messages)
};
```

### Alternativen

**Alternative 1: Weiter Inline-Alerts**
- ✅ Keine neue Dependency
- ❌ Code-Duplikation bleibt
- ❌ Inkonsistentes Styling

**Alternative 2: Sonner (Alternative Toast Library)**
- ✅ Moderne Library
- ❌ Weniger etabliert
- ❌ Team-Umstellung nötig

**Alternative 3: Custom Toast-System**
- ✅ Volle Kontrolle
- ❌ Wartungsaufwand
- ❌ Rad neu erfinden

### Konsequenzen

**Vorteile:**
- ✅ **~35 Zeilen Code gespart** - Pro Komponente
- ✅ **Konsistentes Design** - CeleroPress Design System
- ✅ **Non-Blocking** - Toasts stören Content nicht
- ✅ **Auto-Dismiss** - Automatisches Schließen
- ✅ **Promise-Support** - Loading → Success/Error
- ✅ **Stacking** - Mehrere Toasts parallel

**Nachteile:**
- ⚠️ **Neue Dependency** - react-hot-toast (~5KB)
- ⚠️ **Team-Learning** - Neue API lernen (minimal)

**Verwendung:**
```typescript
// Standard-Toasts
toastService.success('Gespeichert');
toastService.error('Fehler');
toastService.warning('Achtung');
toastService.info('Hinweis');

// Promise-Toasts (Loading → Success/Error)
toastService.promise(
  saveData(),
  {
    loading: 'Wird gespeichert...',
    success: 'Gespeichert',
    error: 'Fehler beim Speichern'
  }
);

// Custom Duration
toastService.success('Wird bald geschlossen'); // 3s default
```

---

## ADR-0003: 3-Step Wizard für Email-Composer

**Status:** ✅ Accepted
**Datum:** September 2025
**Kontext:** Komplexer Email-Versand-Prozess

### Problem

Email-Versand erfordert viele Eingaben:
- Empfänger-Listen
- Manuelle Empfänger
- Absender-Email
- Betreff & Vorschautext
- Signatur
- Scheduling

**Einzel-Form wäre:**
- ❌ Überwältigend (>800 Zeilen Code)
- ❌ Scroll-Marathon
- ❌ Unklare Reihenfolge

### Entscheidung

3-Step Wizard mit klarer Struktur:

```
Step 1: Empfänger auswählen
  → Listen laden
  → Manuelle Empfänger hinzufügen
  → Validierung: Min. 1 Empfänger

Step 2: Email-Details konfigurieren
  → Absender-Email wählen
  → Betreff & Vorschautext
  → Signatur optional
  → Validierung: Pflichtfelder

Step 3: Vorschau & Versand
  → Realistische Vorschau (Desktop/Mobile)
  → Test-Email optional
  → Sofort ODER Geplant
  → Validierung: Scheduling
```

### Konsequenzen

**Vorteile:**
- ✅ **Guided Experience** - Klare Reihenfolge
- ✅ **Bessere UX** - Keine Überforderung
- ✅ **Step-Validierung** - Fehler früh erkennen
- ✅ **Modularität** - Komponenten wiederverwendbar

**Nachteile:**
- ⚠️ **Mehr Klicks** - 3 Steps durchlaufen
- ⚠️ **State Management** - Komplexer durch Steps

---

## ADR-0004: Reply-To Forwarding zu CRM

**Status:** ✅ Accepted
**Datum:** Oktober 2025
**Kontext:** Antworten auf Pressemitteilungen verfolgen

### Problem

Antworten auf Pressemitteilungen gingen verloren:
- ❌ Journalist antwortet → Email geht an Absender
- ❌ Kein Tracking in CRM
- ❌ Keine Thread-Zuordnung

### Entscheidung

**Reply-To Forwarding** mit eindeutigen Adressen:

```
FROM: presse@pr.celeropress.de
REPLY-TO: presse-org456-email123@inbox.sk-online-marketing.de
```

**Workflow:**
1. Email wird mit eindeutiger Reply-To gesendet
2. Journalist antwortet
3. Antwort landet auf inbox.sk-online-marketing.de
4. Inbox-Service routet zu CRM (thread-matcher)
5. CRM ordnet Antwort dem Thread/Kontakt zu

**Format:**
```typescript
generateReplyToAddress(organizationId, emailAddressId): string
// → "{prefix}-{shortOrgId}-{shortEmailId}@inbox.sk-online-marketing.de"
```

### Konsequenzen

**Vorteile:**
- ✅ **Zentrale Inbox** - Alle Antworten an einem Ort
- ✅ **Thread-Tracking** - Automatische Zuordnung
- ✅ **CRM-Integration** - Direkt ins CRM
- ✅ **Eindeutige IDs** - Keine Kollisionen

**Nachteile:**
- ⚠️ **Inbox-Service nötig** - Zusätzliche Infrastruktur
- ⚠️ **DNS-Setup** - inbox.sk-online-marketing.de
- ⚠️ **Komplexität** - Routing-Logik

---

## ADR-0005: Vercel Cron für Scheduled Emails

**Status:** ✅ Accepted
**Datum:** September 2025
**Kontext:** Zeitgesteuerter Email-Versand

### Problem

Emails sollen zu bestimmten Zeiten versendet werden:
- Pressemitteilungen um 10:00 Uhr
- Embargo-Termine einhalten
- Zeitzone-Unterstützung

### Entscheidung

**Vercel Cron-Jobs** mit `scheduled_emails` Collection:

```json
// vercel.json
{
  "crons": [{
    "path": "/api/pr/email/cron",
    "schedule": "*/5 * * * *"  // Alle 5 Minuten
  }]
}
```

**Workflow:**
1. User plant Email → `scheduled_emails { status: 'pending' }`
2. Cron läuft alle 5 Minuten
3. Findet Emails mit `sendAt <= now`
4. Versendet → `status: 'sent'`
5. Bei Fehler: Retry (max 3x)

### Alternativen

**Alternative 1: Firebase Cloud Functions**
- ✅ Native Firebase
- ❌ Kältestarts (Slow)
- ❌ Zusätzliche Kosten

**Alternative 2: AWS EventBridge**
- ✅ Sehr zuverlässig
- ❌ Zusätzliche Infrastruktur
- ❌ Vendor Lock-In

**Alternative 3: Eigener Cron-Server**
- ✅ Volle Kontrolle
- ❌ Wartungsaufwand
- ❌ Infrastruktur-Kosten

### Konsequenzen

**Vorteile:**
- ✅ **Einfach** - Vercel Cron out-of-the-box
- ✅ **Zuverlässig** - Vercel-Infrastruktur
- ✅ **Keine Extra-Kosten** - In Vercel Plan inkludiert
- ✅ **Retry-Logik** - Automatisches Retry bei Fehlern

**Nachteile:**
- ⚠️ **5-Minuten-Granularität** - Nicht sekunden-genau
- ⚠️ **Vendor Lock-In** - Vercel-abhängig
- ⚠️ **10s Timeout (Hobby)** - Batch-Processing nötig

---

## ADR-0006: SendGrid als Email-Provider

**Status:** ✅ Accepted
**Datum:** September 2025
**Kontext:** Email-Versand-Provider Auswahl

### Problem

Transactional Emails für Pressemitteilungen:
- Hohe Zustellraten erforderlich
- Domain Authentication
- DKIM/SPF Support
- API-Zugriff

### Entscheidung

**SendGrid** als Primary Email Provider:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: recipient.email,
  from: { email: 'presse@pr.celeropress.de', name: 'CeleroPress' },
  replyTo: 'presse-org456@inbox.sk-online-marketing.de',
  subject: 'Pressemitteilung',
  html: emailHtml,
  attachments: [{ content: pdfBase64, filename: 'PM.pdf' }]
});
```

### Alternativen

**Alternative 1: AWS SES**
- ✅ Günstig ($0.10 / 1000 emails)
- ❌ Komplexere Setup
- ❌ Weniger Features

**Alternative 2: Mailgun**
- ✅ Ähnliche Features
- ❌ Höhere Preise
- ❌ Weniger etabliert in EU

**Alternative 3: Postmark**
- ✅ Exzellente Zustellraten
- ❌ Teurer
- ❌ Kein Free Tier

### Konsequenzen

**Vorteile:**
- ✅ **Free Tier** - 100 emails/Tag gratis
- ✅ **Domain Authentication** - DKIM, SPF, DMARC
- ✅ **Einfache API** - @sendgrid/mail Package
- ✅ **Zustellraten** - >99%
- ✅ **Analytics** - Dashboard & Reports

**Nachteile:**
- ⚠️ **Rate Limits** - Free: 100/Tag
- ⚠️ **Vendor Lock-In** - SendGrid-spezifisch

**Pricing:**
- Free: 100 emails/Tag
- Essentials: $19.95/Monat (50.000/Monat)
- Pro: $89.95/Monat (100.000+/Monat)

---

## Referenzen

- [Haupt-Dokumentation](../README.md)
- [API-Dokumentation](../api/README.md)
- [Komponenten-Dokumentation](../components/README.md)

---

**Version:** 1.0
**Letzte Aktualisierung:** 13. November 2025
