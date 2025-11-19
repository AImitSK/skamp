# Email-Fluss-Diagramm: Projekt-basierte Inbox

**Version:** 3.0 (Final)
**Erstellt:** 19. Januar 2025
**Aktualisiert:** 19. Januar 2025
**Status:** Konzept (Final)
**Projekt:** CeleroPress / SKAMP

---

## 📋 Übersicht

Dieses Dokument beschreibt den vollständigen Email-Fluss vom Domain-Setup bis zur Inbox-Anzeige mit **projekt-basierten Postfächern**, **domain-basierten Postfächern** und **Default Domain** für schnellen Einstieg.

### Kernkonzept

**Zentrale Inbox-Domain für ALLE Kunden:**
```
inbox.sk-online-marketing.de
```

**Drei Typen von Postfächern:**

1. **Default Domain Postfächer** (celeropress.com)
   - Format: `{organization-slug}@celeropress.com`
   - Beispiel: `xyz-gmbh@celeropress.com`
   - Verwendung:
     - Neukunden ohne eigene Domain
     - Sofortiger Start möglich
     - Upgrade-Path zu eigener Domain

2. **Domain-Postfächer** (pro registrierter Domain)
   - Format: `{domain}@inbox.sk-online-marketing.de`
   - Beispiel: `xyz@inbox.sk-online-marketing.de` für Domain `xyz.de`
   - Verwendung:
     - Optionale Weiterleitungen vom Kunden (`presse@xyz.de` → `xyz@inbox.sk...`)
     - Archivierte Projekt-E-Mails
     - Allgemeine Anfragen ohne Projekt-Bezug

3. **Projekt-Postfächer** (pro Projekt)
   - Format: `{localPart}-{projectId}@inbox.sk-online-marketing.de`
   - Beispiel: `presse-proj-123@inbox.sk-online-marketing.de`
   - Verwendung:
     - Campaign-Antworten
     - Alle Campaigns eines Projekts zusammen

### Inbox-Modi

**Inbox aktiviert (Standard):**
- Antworten landen in CeleroPress Inbox
- Team-Zusammenarbeit möglich
- Projekt-Tracking aktiv
- Reply-To: `{localPart}-{projectId}@inbox.sk...`

**Inbox deaktiviert (Optional):**
- Antworten landen beim Kunden-Provider
- Kunde nutzt eigene Mail-Software (Outlook/Thunderbird)
- Kein Projekt-Tracking in Inbox
- Reply-To: `{absender-email}` (identisch mit FROM)

---

## 🎯 Inbox-Struktur (FINAL)

```
📁 Domain-Postfächer (allgemein)
   ├─ 📧 xyz.de (xyz@inbox.sk-online-marketing.de)
   │   ├─ 42 ungelesen
   │   ├─ Weiterleitungen von presse@xyz.de (optional vom Kunden)
   │   └─ Archivierte Projekt-E-Mails
   ├─ 📧 abc-gmbh.de (abc-gmbh@inbox.sk-online-marketing.de)
   │   └─ 5 ungelesen
   └─ 📧 test-firma.de (test-firma@inbox.sk-online-marketing.de)
       └─ 0 ungelesen

📁 Projekte (aktiv)
   ├─ 📂 Website-Relaunch (xyz.de)
   │   ├─ 18 ungelesen
   │   ├─ Email-Adresse: presse@xyz.de
   │   ├─ Reply-To: presse-proj-123@inbox.sk...
   │   └─ Campaigns: 2 versendet
   ├─ 📂 Produkteinführung Q1 (xyz.de)
   │   ├─ 7 ungelesen
   │   ├─ Email-Adresse: presse@xyz.de
   │   └─ Reply-To: presse-proj-456@inbox.sk...
   └─ 📂 Messe 2025 (abc-gmbh.de)
       ├─ 0 ungelesen
       ├─ Email-Adresse: info@abc-gmbh.de
       └─ Reply-To: info-proj-789@inbox.sk...

📁 Team-Mitglieder (optional - parallel sichtbar)
   ├─ 👤 Peter Schmidt (25 ungelesen)
   │   └─ Alle Threads wo Peter assigned ist
   └─ 👤 Anna Müller (14 ungelesen)

📁 Archiv
   └─ 📂 Jahresbericht 2024 (abgeschlossen)
       ├─ Status: Archiviert am 15.01.2025
       ├─ Domain: xyz.de
       └─ Umleitung → xyz@inbox.sk-online-marketing.de
```

---

## 🔄 Email-Fluss: Alle Phasen

### PHASE 0: DEFAULT DOMAIN SETUP (Neukunden)

#### 0. Organization erstellen - Automatischer Email-Setup

```
Neuer Kunde registriert sich:
Organization Name: "XYZ GmbH"
         ↓
System generiert automatisch:
Organization Slug: "xyz-gmbh"
         ↓
Collection: organizations
{
  id: "org-123",
  name: "XYZ GmbH",
  slug: "xyz-gmbh",
  createdAt: Timestamp
}
         ↓
✅ Default Email-Adresse automatisch erstellt:
Collection: email_addresses
{
  id: "email-default-123",
  email: "xyz-gmbh@celeropress.com",
  localPart: "xyz-gmbh",
  domainId: "icg2wwuTis8tv1WMCnKr",  // celeropress.com
  displayName: "XYZ GmbH",
  organizationId: "org-123",
  isActive: true,
  isDefault: true,
  isSharedDomain: true,              // NEU: Kennzeichnung
  inboxEnabled: true,
  createdAt: Timestamp
}
         ↓
✅ Default Domain-Postfach erstellt:
Collection: inbox_domain_mailboxes
{
  id: "mailbox-xyz-gmbh",
  domainId: "icg2wwuTis8tv1WMCnKr",
  domain: "celeropress.com",
  inboxAddress: "xyz-gmbh@inbox.sk-online-marketing.de",
  organizationId: "org-123",
  status: "active",
  isDefault: true,
  isShared: true,
  unreadCount: 0,
  threadCount: 0,
  createdAt: Timestamp
}
         ↓
✅ Kunde kann SOFORT Campaigns versenden:
FROM: xyz-gmbh@celeropress.com
REPLY-TO: xyz-gmbh-proj-123@inbox.sk-online-marketing.de
```

**Wichtig:**
- Neue Kunden sind **sofort produktiv** ohne Domain-Registrierung
- Upgrade zu eigener Domain jederzeit möglich
- Default-Email bleibt parallel bestehen (optional)

---

### PHASE 1: SETUP (Eigene Domain - Optional)

#### 1. Domain registrieren (Settings > Domains)

```
Admin registriert: xyz.de
SendGrid Verifizierung: ✅
DNS Records: DKIM, SPF konfiguriert
         ↓
Domain Status: verified
Collection: email_domains_enhanced
{
  id: "domain-xyz",
  domain: "xyz.de",
  organizationId: "org-123",
  status: "verified",
  sendgridDomainId: "sg-123",
  verifiedAt: Timestamp
}
         ↓
✅ Domain-Postfach automatisch erstellt:
Collection: inbox_domain_mailboxes
{
  id: "mailbox-domain-xyz",
  domainId: "domain-xyz",
  domain: "xyz.de",
  inboxAddress: "xyz@inbox.sk-online-marketing.de",
  organizationId: "org-123",
  status: "active",
  unreadCount: 0,
  threadCount: 0,
  createdAt: Timestamp
}
```

**Wichtig:** Sobald eine Domain verifiziert wird, entsteht automatisch ein Domain-Postfach bei `inbox.sk-online-marketing.de`.

#### 2. Email-Adresse anlegen (Settings > Email)

```
Admin erstellt: presse@xyz.de
Display Name: "Pressestelle XYZ"
Team-Zuordnung: Peter Schmidt
Status: active
         ↓
Collection: email_addresses
{
  id: "email-abc123",
  email: "presse@xyz.de",
  localPart: "presse",
  domainId: "domain-xyz",
  assignedUserIds: ["user-peter"],
  isActive: true,
  organizationId: "org-123",
  createdAt: Timestamp
}
```

**Hinweis:** Die Email-Adresse `presse@xyz.de` ist nur für VERSAND über SendGrid. Um E-Mails zu EMPFANGEN, gibt es zwei Optionen:

**Option A (empfohlen): Kunde richtet Weiterleitung ein**
```
Kunde hat echtes Postfach: presse@xyz.de (bei Strato/IONOS/etc.)
Kunde richtet Weiterleitung ein:
  presse@xyz.de → xyz@inbox.sk-online-marketing.de

Vorteil: Journalisten können direkt an presse@xyz.de schreiben
```

**Option B: Ohne Weiterleitung**
```
Keine Weiterleitung → E-Mails an presse@xyz.de kommen NICHT an
Nur Antworten auf Campaigns funktionieren (via Reply-To)
```

---

### PHASE 2: PROJEKT & CAMPAIGN ERSTELLEN

#### 3. Projekt erstellen (PR > Projects)

```
Peter erstellt: "Website-Relaunch"
Projekt-ID: proj-123
Zugeordnete Email: presse@xyz.de
         ↓
Collection: pr_projects
{
  id: "proj-123",
  name: "Website-Relaunch",
  organizationId: "org-123",
  domainId: "domain-xyz",           // Referenz zur Domain
  emailAddressId: "email-abc123",   // presse@xyz.de
  status: "active",
  createdBy: "user-peter",
  createdAt: Timestamp
}
```

#### 4. Campaign erstellen & versenden

```
Peter erstellt Campaign:
- Titel: "Neue Website live"
- Empfänger: 50 Journalisten (aus Verteilerliste)
- Email-Adresse: presse@xyz.de
         ↓
Email Composer generiert:
{
  from: "presse@xyz.de",
  fromName: "Pressestelle XYZ",
  replyTo: "presse-proj-123@inbox.sk-online-marketing.de"
  //        ^^^^^^^^^^^^^^^^
  //        Pattern: {localPart}-{projectId}@inbox...
  //        KEINE campaignId mehr nötig!
}
         ↓
Collection: pr_campaigns
{
  id: "camp-456",
  projectId: "proj-123",
  emailAddressId: "email-abc123",
  replyToAddress: "presse-proj-123@inbox.sk-online-marketing.de",
  sentAt: Timestamp,
  recipientCount: 50,
  status: "sent"
}
         ↓
✅ Projekt-Postfach erstellt (on-demand):
Collection: inbox_project_mailboxes
{
  id: "inbox-proj-123",
  projectId: "proj-123",
  domainId: "domain-xyz",
  organizationId: "org-123",
  projectName: "Website-Relaunch",
  inboxAddress: "presse-proj-123@inbox.sk-online-marketing.de",
  status: "active",
  unreadCount: 0,
  threadCount: 0,
  campaignCount: 1,
  createdAt: Timestamp
}
```

**Wichtig:**
- Das Projekt-Postfach wird automatisch beim ersten Campaign-Versand erstellt
- Reply-To Pattern enthält NUR `projectId`, KEINE `campaignId`
- Alle Campaigns eines Projekts nutzen dasselbe Reply-To Pattern

---

### PHASE 3: ANTWORTEN EMPFANGEN (Projekt-bezogen)

#### 5. Journalist antwortet auf Campaign

```
E-Mail kommt an: presse-proj-123@inbox.sk-online-marketing.de
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Webhook Handler (Inbound Parse - SendGrid)                 │
└─────────────────────────────────────────────────────────────┘
         ↓
POST /api/email/inbound
Body: {
  to: "presse-proj-123@inbox.sk-online-marketing.de",
  from: "journalist@zeitung.de",
  subject: "Re: Neue Website live",
  text: "Sehr geehrte Damen und Herren, vielen Dank...",
  html: "<p>Sehr geehrte Damen und Herren...</p>",
  messageId: "<xyz@zeitung.de>",
  inReplyTo: "<original@xyz.de>",
  references: ["<original@xyz.de>"]
}
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Reply-To Parser Service                                    │
└─────────────────────────────────────────────────────────────┘
parseReplyTo("presse-proj-123@inbox.sk-online-marketing.de")
         ↓
{
  type: "project",                  // Projekt-E-Mail (nicht Domain-E-Mail)
  localPart: "presse",
  projectId: "proj-123",
  domainId: "domain-xyz"            // Lookup via projectId
}
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Thread Matcher Service                                     │
└─────────────────────────────────────────────────────────────┘
findOrCreateThread({
  messageId: "<xyz@zeitung.de>",
  inReplyTo: "<original@xyz.de>",
  subject: "Re: Neue Website live",
  projectId: "proj-123",            // ← Aus Reply-To Parser
  domainId: "domain-xyz"
})
         ↓
Thread gefunden ODER neu erstellt:
Collection: email_threads
{
  id: "thread-789",
  organizationId: "org-123",
  projectId: "proj-123",            // ← NEU
  domainId: "domain-xyz",           // ← NEU
  mailboxType: "project",           // ← NEU: Kennzeichnung
  subject: "Re: Neue Website live",
  participants: [
    { email: "presse@xyz.de", name: "Pressestelle XYZ" },
    { email: "journalist@zeitung.de", name: "Max Journalist" }
  ],
  unreadCount: 1,
  lastMessageAt: Timestamp,
  createdAt: Timestamp
}
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Email Message erstellen                                    │
└─────────────────────────────────────────────────────────────┘
Collection: email_messages
{
  id: "msg-001",
  threadId: "thread-789",
  organizationId: "org-123",
  projectId: "proj-123",            // ← NEU
  domainId: "domain-xyz",           // ← NEU
  mailboxType: "project",           // ← NEU
  from: {
    email: "journalist@zeitung.de",
    name: "Max Journalist"
  },
  to: [{
    email: "presse-proj-123@inbox.sk-online-marketing.de"
  }],
  subject: "Re: Neue Website live",
  textContent: "Sehr geehrte Damen und Herren...",
  htmlContent: "<p>Sehr geehrte Damen und Herren...</p>",
  snippet: "Sehr geehrte Damen und Herren, vielen Dank...",
  folder: "inbox",
  isRead: false,
  receivedAt: Timestamp
}
         ↓
✅ E-Mail landet in:
   - Projekt-Postfach "Website-Relaunch" (proj-123)
   - Team-Member "Peter Schmidt" (da Campaign-Ersteller)
```

---

### PHASE 4: OPTIONALE WEITERLEITUNG (Domain-Postfach)

#### 6. Kunde richtet Weiterleitung ein (optional)

**Szenario:** Kunde hat echtes Postfach `presse@xyz.de` bei seinem Provider (Strato, IONOS, etc.)

```
┌─────────────────────────────────────────────────────────────┐
│ Kunde konfiguriert Weiterleitung bei seinem Provider       │
└─────────────────────────────────────────────────────────────┘

Provider-Einstellung (Strato/IONOS/etc.):
  presse@xyz.de → xyz@inbox.sk-online-marketing.de

         ↓
Journalist schreibt direkt an: presse@xyz.de
         ↓
Provider leitet weiter an: xyz@inbox.sk-online-marketing.de
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Webhook Handler (Inbound Parse - SendGrid)                 │
└─────────────────────────────────────────────────────────────┘
         ↓
POST /api/email/inbound
Body: {
  to: "xyz@inbox.sk-online-marketing.de",        // ← Domain-Postfach!
  from: "neue-journalistin@magazin.de",
  subject: "Anfrage: Interview",
  text: "Guten Tag, ich würde gerne...",
  html: "<p>Guten Tag, ich würde gerne...</p>"
}
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Reply-To Parser Service                                    │
└─────────────────────────────────────────────────────────────┘
parseReplyTo("xyz@inbox.sk-online-marketing.de")
         ↓
{
  type: "domain",                   // Domain-E-Mail (nicht Projekt)
  domain: "xyz.de",
  domainId: "domain-xyz",
  projectId: null                   // Keine Projekt-Zuordnung
}
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Thread Matcher Service                                     │
└─────────────────────────────────────────────────────────────┘
findOrCreateThread({
  messageId: "<abc@magazin.de>",
  subject: "Anfrage: Interview",
  projectId: null,                  // ← Keine Projekt-Zuordnung
  domainId: "domain-xyz",
  mailboxType: "domain"
})
         ↓
Thread erstellt:
Collection: email_threads
{
  id: "thread-999",
  organizationId: "org-123",
  projectId: null,                  // ← Domain-Postfach (kein Projekt)
  domainId: "domain-xyz",           // ← Referenz zur Domain
  mailboxType: "domain",            // ← NEU: Kennzeichnung
  subject: "Anfrage: Interview",
  participants: [
    { email: "xyz@inbox.sk-online-marketing.de", name: "XYZ GmbH" },
    { email: "neue-journalistin@magazin.de", name: "Lisa Neue" }
  ],
  labels: ["forwarded-from-customer"],  // ← Kennzeichnung: Weiterleitung
  unreadCount: 1,
  lastMessageAt: Timestamp
}
         ↓
Email Message erstellen:
Collection: email_messages
{
  id: "msg-002",
  threadId: "thread-999",
  organizationId: "org-123",
  projectId: null,                  // ← Domain-Postfach
  domainId: "domain-xyz",
  mailboxType: "domain",            // ← NEU
  folder: "inbox",
  from: {
    email: "neue-journalistin@magazin.de",
    name: "Lisa Neue"
  },
  to: [{
    email: "xyz@inbox.sk-online-marketing.de"
  }],
  subject: "Anfrage: Interview",
  textContent: "Guten Tag, ich würde gerne...",
  htmlContent: "<p>Guten Tag, ich würde gerne...</p>",
  isRead: false,
  receivedAt: Timestamp
}
         ↓
✅ E-Mail landet in:
   - Domain-Postfach "xyz.de" (xyz@inbox.sk...)
   - Sichtbar für alle Team-Members
   - Kann später Projekt zugeordnet werden (manuell oder KI)
```

**Optional: Manuelle Projekt-Zuordnung**

```
Admin/User klickt: "Zu Projekt zuordnen"
→ Wählt Projekt "Website-Relaunch" aus
→ Thread wird aktualisiert:
  {
    projectId: "proj-123",
    mailboxType: "project"
  }
→ Thread wandert von Domain-Postfach zu Projekt-Postfach
```

---

### PHASE 5: PETER ANTWORTET (aus Inbox)

#### 7. Peter antwortet im Projekt-Postfach

```
Peter öffnet Thread "thread-789" in Projekt "Website-Relaunch"
Klickt "Antworten"
         ↓
Compose Email Dialog (automatisch befüllt):
{
  from: "presse@xyz.de",            // ← Original Email-Adresse
  fromName: "Pressestelle XYZ",
  to: "journalist@zeitung.de",
  subject: "Re: Neue Website live",
  replyTo: "presse-proj-123@inbox.sk-online-marketing.de",  // ← GLEICHE Reply-To!

  // Thread-Kontext wird beibehalten
  threadId: "thread-789",
  projectId: "proj-123",
  inReplyTo: "<xyz@zeitung.de>",
  references: ["<original@xyz.de>", "<xyz@zeitung.de>"]
}
         ↓
POST /api/pr/email/send  # Campaign Versand API
         ↓
SendGrid versendet E-Mail:
From: presse@xyz.de
Reply-To: presse-proj-123@inbox.sk-online-marketing.de
         ↓
Email Message (Sent) erstellen:
Collection: email_messages
{
  id: "msg-003",
  threadId: "thread-789",
  projectId: "proj-123",            // ← Thread-Kontext
  domainId: "domain-xyz",
  folder: "sent",
  from: { email: "presse@xyz.de", name: "Pressestelle XYZ" },
  to: [{ email: "journalist@zeitung.de", name: "Max Journalist" }],
  subject: "Re: Neue Website live",
  textContent: "Sehr geehrter Herr Journalist...",
  sentAt: Timestamp
}
         ↓
Thread aktualisieren:
email_threads (thread-789)
{
  lastMessageAt: Timestamp,
  messageCount: 2
}
         ↓
✅ Antwort versendet
✅ Thread bleibt im Projekt-Postfach
✅ Journalist kann erneut antworten → landet wieder im Projekt (via Reply-To)
```

**Wichtig:** Die Reply-To Adresse bleibt für den gesamten Thread gleich, sodass alle Antworten im selben Projekt-Postfach landen.

---

### PHASE 6: PROJEKT ARCHIVIEREN

#### 8. Admin archiviert Projekt "Website-Relaunch"

```
Settings > Projekte > "Website-Relaunch" > Archivieren
         ↓
Collection: pr_projects (Update)
{
  id: "proj-123",
  name: "Website-Relaunch",
  status: "archived",               // ← Status ändern
  archivedAt: Timestamp,
  archivedBy: "user-admin",
  redirectToDomainId: "domain-xyz"  // ← Umleitung zu Domain-Postfach
}
         ↓
Collection: inbox_project_mailboxes (Update)
{
  id: "inbox-proj-123",
  projectId: "proj-123",
  status: "archived",
  archivedAt: Timestamp,
  redirectTo: "mailbox-domain-xyz"  // ← Umleitung zu Domain-Postfach
}
         ↓
Bestehende Threads (optional):
email_threads (WHERE projectId = "proj-123")
→ Bleiben unverändert
→ Sichtbar im Archiv-Ordner
→ Lesbar, aber nicht editierbar
         ↓
✅ Projekt archiviert
✅ Threads bleiben erhalten (lesbar im Archiv)
✅ Neue E-Mails werden umgeleitet (siehe Phase 7)
```

#### 9. Späte Antwort auf archiviertes Projekt

```
E-Mail kommt an: presse-proj-123@inbox.sk-online-marketing.de
(Journalist antwortet Wochen/Monate später)
         ↓
Webhook Handler: POST /api/email/inbound
         ↓
Reply-To Parser:
{
  type: "project",
  projectId: "proj-123",
  domainId: "domain-xyz"
}
         ↓
Projekt-Lookup:
pr_projects.find(proj-123)
→ status: "archived"
→ redirectToDomainId: "domain-xyz"
         ↓
┌─────────────────────────────────────────────────────────────┐
│ Redirect Handler (NEU)                                     │
└─────────────────────────────────────────────────────────────┘
Thread erstellen in Domain-Postfach:
Collection: email_threads
{
  id: "thread-888",
  organizationId: "org-123",
  projectId: null,                  // ← Umgeleitet, kein aktives Projekt
  domainId: "domain-xyz",           // ← Domain-Postfach
  mailboxType: "domain",
  subject: "Re: Neue Website live",
  labels: [
    "redirected-from-archived",
    "original-project:proj-123"
  ],
  metadata: {
    originalProjectId: "proj-123",
    originalProjectName: "Website-Relaunch",
    archivedAt: Timestamp,
    redirectedAt: Timestamp,
    redirectReason: "project_archived"
  },
  unreadCount: 1,
  participants: [
    { email: "xyz@inbox.sk-online-marketing.de", name: "XYZ GmbH" },
    { email: "journalist@zeitung.de", name: "Max Journalist" }
  ]
}
         ↓
Email Message erstellen:
Collection: email_messages
{
  id: "msg-004",
  threadId: "thread-888",
  projectId: null,
  domainId: "domain-xyz",
  mailboxType: "domain",
  labels: ["redirected-from-archived"],
  metadata: {
    originalProjectId: "proj-123",
    originalProjectName: "Website-Relaunch"
  },
  from: { email: "journalist@zeitung.de", name: "Max Journalist" },
  to: [{ email: "presse-proj-123@inbox.sk-online-marketing.de" }],
  subject: "Re: Neue Website live",
  textContent: "...",
  folder: "inbox",
  isRead: false,
  receivedAt: Timestamp
}
         ↓
✅ E-Mail landet in:
   - Domain-Postfach "xyz.de" (xyz@inbox.sk...)
   - Mit Badge: "Umgeleitet von: Website-Relaunch (archiviert)"
   - Mit Kontext-Info im Thread-Header
   - Team kann entscheiden:
     → Ignorieren
     → Antworten (via presse@xyz.de, neue Konversation)
     → Projekt re-aktivieren (falls nötig)
     → Neues Projekt erstellen
```

**UI-Darstellung (Beispiel):**

```
┌─────────────────────────────────────────────────────────────┐
│ 📧 Domain-Postfach: xyz.de                                  │
│    (xyz@inbox.sk-online-marketing.de)                       │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ 🔀 Umgeleitet • Website-Relaunch (archiviert)         │ │
│ │                                                       │ │
│ │ Max Journalist <journalist@zeitung.de>                │ │
│ │ Re: Neue Website live                                 │ │
│ │                                                       │ │
│ │ "Vielen Dank für Ihre Informationen. Ich hätte..."   │ │
│ │                                                       │ │
│ │ Vor 2 Stunden • Ungelesen                             │ │
│ └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Datenmodell: Neue Collections

### inbox_domain_mailboxes (NEU)

Domain-Postfächer - Ein Postfach pro registrierter Domain.

```typescript
interface DomainMailbox {
  id: string;
  domainId: string;                 // Referenz zu email_domains_enhanced
  domain: string;                   // z.B. "xyz.de"
  inboxAddress: string;             // z.B. "xyz@inbox.sk-online-marketing.de"
  organizationId: string;
  status: 'active' | 'inactive';
  unreadCount: number;
  threadCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Beispiel:**
```json
{
  "id": "mailbox-domain-xyz",
  "domainId": "domain-xyz",
  "domain": "xyz.de",
  "inboxAddress": "xyz@inbox.sk-online-marketing.de",
  "organizationId": "org-123",
  "status": "active",
  "unreadCount": 42,
  "threadCount": 156,
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### inbox_project_mailboxes

Projekt-spezifische Postfächer.

```typescript
interface ProjectMailbox {
  id: string;
  projectId: string;                // Referenz zu pr_projects
  domainId: string;                 // Referenz zu email_domains_enhanced
  organizationId: string;
  projectName: string;              // Denormalisiert für schnellen Zugriff
  inboxAddress: string;             // z.B. "presse-proj-123@inbox.sk..."
  status: 'active' | 'completed' | 'archived';
  unreadCount: number;
  threadCount: number;
  campaignCount: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  archivedAt?: Timestamp;
  redirectTo?: string;              // ID des Domain-Postfachs (bei archiviert)
}
```

**Beispiel:**
```json
{
  "id": "inbox-proj-123",
  "projectId": "proj-123",
  "domainId": "domain-xyz",
  "organizationId": "org-123",
  "projectName": "Website-Relaunch",
  "inboxAddress": "presse-proj-123@inbox.sk-online-marketing.de",
  "status": "active",
  "unreadCount": 18,
  "threadCount": 45,
  "campaignCount": 2,
  "createdAt": "2025-01-10T09:30:00Z"
}
```

### email_threads (Erweiterung)

Bestehende Collection mit neuen Feldern.

```typescript
interface EmailThread {
  // ... existing fields ...

  // NEU: Domain & Projekt-Zuordnung
  domainId: string;                 // Referenz zu email_domains_enhanced (immer vorhanden)
  projectId?: string;               // Referenz zu pr_projects (null bei Domain-Postfach)
  mailboxType: 'domain' | 'project';  // Typ des Postfachs

  // NEU: Redirect-Metadata (bei umgeleiteten Threads)
  metadata?: {
    originalProjectId?: string;
    originalProjectName?: string;
    archivedAt?: Timestamp;
    redirectedAt?: Timestamp;
    redirectReason?: 'project_archived' | 'manual';
  };
}
```

### email_messages (Erweiterung)

Bestehende Collection mit neuen Feldern.

```typescript
interface EmailMessage {
  // ... existing fields ...

  // NEU: Domain & Projekt-Zuordnung
  domainId: string;                 // Referenz zu email_domains_enhanced (immer vorhanden)
  projectId?: string;               // Referenz zu pr_projects (null bei Domain-Postfach)
  mailboxType: 'domain' | 'project';  // Typ des Postfachs

  // NEU: Redirect-Metadata
  metadata?: {
    originalProjectId?: string;
    originalProjectName?: string;
  };
}
```

---

## 🔧 Services: Neue & Angepasste

### reply-to-parser-service.ts (NEU)

Parst Reply-To Adressen und unterscheidet zwischen Domain- und Projekt-E-Mails.

```typescript
interface ParsedReplyTo {
  type: 'domain' | 'project';       // Typ der E-Mail
  domain?: string;                  // z.B. "xyz.de" (bei domain)
  domainId?: string;                // Referenz zu domain (bei domain)
  localPart?: string;               // z.B. "presse" (bei project)
  projectId?: string;               // z.B. "proj-123" (bei project)
}

class ReplyToParserService {
  /**
   * Parst eine Reply-To Adresse
   *
   * Zwei Formate:
   * 1. Domain-Postfach: {domain}@inbox.sk-online-marketing.de
   * 2. Projekt-Postfach: {localPart}-{projectId}@inbox.sk-online-marketing.de
   *
   * Beispiele:
   * - "xyz@inbox.sk-online-marketing.de" → domain mailbox
   * - "presse-proj-123@inbox.sk-online-marketing.de" → project mailbox
   */
  async parse(address: string): Promise<ParsedReplyTo> {
    const [localPartFull, domain] = address.split('@');

    // Check if it's inbox domain
    if (domain !== 'inbox.sk-online-marketing.de') {
      throw new Error('Invalid inbox domain');
    }

    // Check if it's a project mailbox (contains hyphen)
    if (localPartFull.includes('-')) {
      const parts = localPartFull.split('-');

      if (parts.length === 2) {
        const localPart = parts[0];     // "presse"
        const projectId = parts[1];     // "proj-123"

        // Lookup domainId via projectId
        const project = await this.getProject(projectId);

        return {
          type: 'project',
          localPart,
          projectId,
          domainId: project.domainId
        };
      }
    }

    // Domain mailbox
    const domainName = localPartFull;   // "xyz"
    const domainMailbox = await this.getDomainMailbox(domainName);

    return {
      type: 'domain',
      domain: domainName,
      domainId: domainMailbox.domainId
    };
  }
}
```

### redirect-handler-service.ts (NEU)

Behandelt umgeleitete E-Mails von archivierten Projekten.

```typescript
class RedirectHandlerService {
  /**
   * Prüft ob ein Projekt archiviert ist und leitet ggf. um
   */
  async handleIncomingEmail(
    parsedReplyTo: ParsedReplyTo,
    incomingEmail: IncomingEmail
  ): Promise<ThreadCreationParams> {

    // Domain-Postfach: Kein Redirect nötig
    if (parsedReplyTo.type === 'domain') {
      return {
        projectId: null,
        domainId: parsedReplyTo.domainId!,
        mailboxType: 'domain'
      };
    }

    // Projekt-Postfach: Prüfe ob archiviert
    if (parsedReplyTo.type === 'project') {
      const project = await this.getProject(parsedReplyTo.projectId!);

      if (project.status === 'archived') {
        // Redirect to domain mailbox
        return {
          projectId: null,
          domainId: project.domainId,
          mailboxType: 'domain',
          labels: ['redirected-from-archived'],
          metadata: {
            originalProjectId: project.id,
            originalProjectName: project.name,
            archivedAt: project.archivedAt,
            redirectedAt: new Date(),
            redirectReason: 'project_archived'
          }
        };
      }

      // Project is active
      return {
        projectId: parsedReplyTo.projectId,
        domainId: project.domainId,
        mailboxType: 'project'
      };
    }

    throw new Error('Invalid parsed reply-to');
  }
}
```

### thread-matcher-service.ts (ANGEPASST)

Erweitert um Domain & Projekt-Zuordnung.

```typescript
// Bestehende Methode erweitern
async findOrCreateThread(params: {
  messageId: string;
  subject: string;
  domainId: string;              // NEU: Immer vorhanden
  projectId?: string;            // NEU: Optional (bei Projekt-Postfach)
  mailboxType: 'domain' | 'project';  // NEU
  // ... existing params
}): Promise<EmailThread> {
  // ... existing logic ...

  // Beim Erstellen eines neuen Threads:
  const thread = {
    // ... existing fields ...
    domainId: params.domainId,
    projectId: params.projectId || null,
    mailboxType: params.mailboxType
  };

  return thread;
}
```

---

## 🎨 UI-Komponenten: Anpassungen

### InboxSidebar (ANGEPASST)

Neue Ordner-Struktur mit Domain-Postfächern und Projekt-Postfächern.

```typescript
<InboxSidebar>
  {/* Domain-Postfächer */}
  <FolderSection title="Domain-Postfächer">
    <DomainMailboxItem
      icon={EnvelopeIcon}
      label="xyz.de"
      inboxAddress="xyz@inbox.sk..."
      unreadCount={42}
      description="Weiterleitungen & Archiv"
      onClick={() => selectDomainMailbox('domain-xyz')}
    />
    <DomainMailboxItem
      icon={EnvelopeIcon}
      label="abc-gmbh.de"
      inboxAddress="abc-gmbh@inbox.sk..."
      unreadCount={5}
      onClick={() => selectDomainMailbox('domain-abc')}
    />
  </FolderSection>

  {/* Projekt-Postfächer */}
  <FolderSection title="Projekte">
    <ProjectMailboxItem
      icon={FolderIcon}
      label="Website-Relaunch"
      domain="xyz.de"
      inboxAddress="presse-proj-123@inbox.sk..."
      unreadCount={18}
      campaignCount={2}
      status="active"
      onClick={() => selectProjectMailbox('proj-123')}
    />
    <ProjectMailboxItem
      icon={FolderIcon}
      label="Produkteinführung Q1"
      domain="xyz.de"
      inboxAddress="presse-proj-456@inbox.sk..."
      unreadCount={7}
      campaignCount={1}
      status="active"
      onClick={() => selectProjectMailbox('proj-456')}
    />
  </FolderSection>

  {/* Archiv */}
  <FolderSection title="Archiv" collapsed>
    <ProjectMailboxItem
      icon={ArchiveBoxIcon}
      label="Jahresbericht 2024"
      domain="xyz.de"
      status="archived"
      onClick={() => selectArchivedProject('proj-789')}
    />
  </FolderSection>
</InboxSidebar>
```

### EmailViewer (ANGEPASST)

Zeigt Redirect-Hinweise und Projekt-Kontext an.

```typescript
<EmailViewer thread={selectedThread}>
  {/* Redirect-Hinweis bei umgeleiteten Threads */}
  {thread.metadata?.redirectReason === 'project_archived' && (
    <Alert type="info">
      <Icon icon={ArrowPathIcon} />
      Umgeleitet von Projekt: {thread.metadata.originalProjectName} (archiviert)
    </Alert>
  )}

  {/* Projekt-Kontext bei aktiven Projekten */}
  {thread.projectId && (
    <ProjectContext
      projectId={thread.projectId}
      domainId={thread.domainId}
    />
  )}

  {/* Email-Nachrichten */}
  <EmailMessages messages={threadMessages} />

  {/* Antwort-Optionen */}
  <ComposeReply
    thread={thread}
    defaultReplyTo={thread.projectId
      ? `{localPart}-${thread.projectId}@inbox.sk-online-marketing.de`
      : `${thread.domain}@inbox.sk-online-marketing.de`
    }
  />
</EmailViewer>
```

---

### PHASE 7: ALTERNATIVE - Eigene Mail-Software (Optional)

#### 10. Kunde deaktiviert System-Inbox

**Szenario:** Kunde möchte eigene Mail-Software nutzen (Outlook, Thunderbird, etc.)

```
┌─────────────────────────────────────────────────────────────┐
│ Kunde hat eigene Domain: xyz.de                             │
│ Kunde hat eigenes Postfach: presse@xyz.de (bei Strato)     │
│ Kunde möchte mit Outlook/Thunderbird arbeiten              │
└─────────────────────────────────────────────────────────────┘
         ↓
Projekt-Einstellung: "System-Inbox deaktivieren"
         ↓
Collection: pr_projects (Update)
{
  id: "proj-123",
  name: "Website-Relaunch",
  useSystemInbox: false,        // ← NEU: Inbox deaktiviert
  emailAddressId: "email-abc123" // presse@xyz.de
}
```

#### 11. Campaign versenden ohne Inbox

```
Email Composer generiert:
{
  from: "presse@xyz.de",
  fromName: "Pressestelle XYZ",
  replyTo: "presse@xyz.de"      // ← GLEICHE wie FROM! (keine Inbox)
  //        ^^^^^^^^^^^^^^^
  //        KEIN Projekt-Postfach, da Inbox deaktiviert
}
         ↓
SendGrid versendet E-Mail:
FROM: presse@xyz.de
REPLY-TO: presse@xyz.de
         ↓
Collection: pr_campaigns
{
  id: "camp-789",
  projectId: "proj-123",
  emailAddressId: "email-abc123",
  replyToAddress: "presse@xyz.de",  // ← Gleiche wie FROM
  useSystemInbox: false,             // ← Kennzeichnung
  sentAt: Timestamp,
  recipientCount: 50,
  status: "sent"
}
```

#### 12. Journalist antwortet (landet beim Kunden)

```
Journalist antwortet auf Campaign:
AN: presse@xyz.de             // ← Direkt an Kunden-Postfach
         ↓
Provider (Strato) empfängt E-Mail
         ↓
Kunde liest/beantwortet mit Outlook/Thunderbird
         ↓
✅ E-Mail landet NICHT in CeleroPress Inbox
✅ Kunde arbeitet mit gewohnter Software
⚠️  KEIN Projekt-Tracking in der Inbox
⚠️  KEINE Team-Zusammenarbeit möglich
```

**UI-Schalter in Projekt-Einstellungen:**

```
┌─────────────────────────────────────────────────────────┐
│ Projekt-Einstellungen: Website-Relaunch                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Email-Verwaltung                                        │
│                                                         │
│ ● System-Inbox verwenden ⭐ Empfohlen                   │
│   └─ Antworten landen in der CeleroPress Inbox         │
│   └─ Team-Zusammenarbeit möglich                       │
│   └─ Projekt-Tracking aktiv                            │
│   └─ Reply-To: presse-proj-123@inbox.sk...             │
│                                                         │
│ ○ Eigene Mail-Software verwenden                       │
│   └─ Antworten landen in deinem Postfach               │
│   └─ Du arbeitest mit Outlook/Thunderbird/etc.         │
│   └─ Reply-To: presse@xyz.de (gleich wie FROM)         │
│   ⚠️  Kein Projekt-Tracking in der Inbox               │
│   ⚠️  Keine Team-Zusammenarbeit                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Vorteile Inbox deaktiviert:**
- ✅ Kunde nutzt gewohnte Software
- ✅ Keine neue Plattform lernen
- ✅ Direkter Zugriff auf alle E-Mails

**Nachteile Inbox deaktiviert:**
- ❌ Kein Projekt-Tracking
- ❌ Keine Team-Zusammenarbeit
- ❌ Keine zentralisierte Verwaltung
- ❌ Kunde muss selbst E-Mails organisieren

**Empfehlung:**
- Standard: Inbox aktiviert (bessere Funktionen)
- Optional: Inbox deaktiviert (für Power-User mit eigener Infrastruktur)

---

## ✅ Zusammenfassung: Was sich ändert

### Neue Konzepte

1. **Default Domain (celeropress.com)** 🆕
   - Format: `{organization-slug}@celeropress.com`
   - Automatisch bei Organization-Erstellung
   - Neukunden können SOFORT loslegen
   - Upgrade-Path zu eigener Domain

2. **Domain-Postfächer** (pro registrierter Domain)
   - Format: `{domain}@inbox.sk-online-marketing.de`
   - Für Weiterleitungen vom Kunden (optional)
   - Für archivierte Projekt-E-Mails
   - Für allgemeine Anfragen ohne Projekt-Bezug

3. **Projekt-Postfächer** (pro Projekt)
   - Format: `{localPart}-{projectId}@inbox.sk-online-marketing.de`
   - Automatisch beim ersten Campaign-Versand erstellt
   - Alle Campaigns eines Projekts zusammen
   - KEINE campaignId mehr im Pattern!

4. **Inbox-Deaktivierung (Optional)** 🆕
   - Projekt-Einstellung: `useSystemInbox: false`
   - Reply-To = FROM (keine Inbox)
   - Für Kunden mit eigener Mail-Software
   - Kein Projekt-Tracking, aber volle Kontrolle

5. **Vereinfachtes Reply-To Pattern**
   - ALT: `presse-{projectId}-{campaignId}@inbox.sk...`
   - NEU: `presse-{projectId}@inbox.sk...`
   - Einfacher und übersichtlicher

6. **Archivierungs-Logik**
   - Archivierte Projekte leiten zu Domain-Postfach um
   - Alte Threads bleiben im Archiv sichtbar

7. **Optionale Weiterleitung**
   - Kunde kann echtes Postfach `presse@xyz.de` weiterleiten
   - Weiterleitung zu `xyz@inbox.sk-online-marketing.de`
   - Journalisten können direkt an `presse@xyz.de` schreiben

### Geänderte Components

- `InboxSidebar`: Domain-Postfächer + Projekt-Postfächer
- `EmailViewer`: Redirect-Hinweise + Projekt-Kontext
- `ComposeEmail`: Automatische Reply-To Generation basierend auf Thread

### Neue Services

- `ReplyToParserService`: Parst Domain- und Projekt-E-Mails
- `RedirectHandlerService`: Behandelt archivierte Projekte

### Erweiterte Collections

- `email_threads`: `domainId`, `projectId`, `mailboxType`, `metadata`
- `email_messages`: `domainId`, `projectId`, `mailboxType`, `metadata`

### Neue Collections

- `inbox_domain_mailboxes`: Domain-Postfächer (pro Domain)
- `inbox_project_mailboxes`: Projekt-Postfächer (pro Projekt)

### Wichtige Vereinfachungen

- ❌ **KEINE** `inbox_general_mailboxes` (pro Email-Adresse)
- ✅ **NUR** `inbox_domain_mailboxes` (pro Domain)
- ❌ **KEINE** `campaignId` im Reply-To Pattern
- ✅ **NUR** `projectId` im Reply-To Pattern
- ❌ **KEINE** MX Records pro Kunden-Domain nötig
- ✅ **NUR** zentrale Domain `inbox.sk-online-marketing.de`

---

## 🚀 Nächste Schritte

1. ✅ **Email-Fluss-Diagramm erstellt** (dieses Dokument - Version 2.0)
2. ⏳ **Implementierungsplan erstellen** (siehe `implementation-plan.md`)
3. ⏳ **Datenmodell finalisieren** (TypeScript Interfaces)
4. ⏳ **Services implementieren** (Reply-To Parser, Redirect Handler)
5. ⏳ **Inbox UI refactoren** (Neue Ordner-Struktur)
6. ⏳ **Testing & Migration**

---

**Erstellt von:** Claude AI & Stefan Kühne
**Version:** 2.0 (Vereinfacht)
**Letzte Aktualisierung:** 19. Januar 2025
