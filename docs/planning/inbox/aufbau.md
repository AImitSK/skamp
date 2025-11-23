# Inbox & Email-System Architektur

## 1. Grundlegende Domain-Struktur

### 1.1 SendGrid Master-Domain

**sk-online-marketing.de** ist die zentrale Infrastruktur-Domain für den gesamten Email-Betrieb:

- ✅ Bei SendGrid registriert und verifiziert
- ✅ Alle Emails werden ÜBER diese Domain versendet
- ✅ Alle Inbox-Postfächer nutzen `@inbox.sk-online-marketing.de`
- ❌ Erscheint NICHT in der Domain-Verwaltungs-UI
- ❌ Kann NICHT gelöscht werden (System-Domain)
- ❌ Bekommt KEIN Domain-Postfach (nur Projekt-Postfächer)

**Wichtig**: Diese Domain dient als technische Infrastruktur, NICHT als Absender-Domain für Organisationen.

### 1.2 Default-Domain: celeropress.com

**celeropress.com** ist die Standard-Absender-Domain für alle neuen Organisationen:

- ✅ Automatisch für jede neue Organisation verfügbar
- ✅ Ermöglicht Email-Versand ohne eigene Domain-Registrierung
- ✅ Ist als `isDefault: true` markiert
- ❌ Erscheint NICHT unter "Domains" in der UI
- ❌ Kann NICHT gelöscht werden (System-Domain)
- ❌ Bekommt KEIN Domain-Postfach

**Default Email-Adresse auf celeropress.com**:
- Format: `{organizationId}@celeropress.com` oder eindeutige Kennung falls Sicherheitsrisiko
- Ist als Standard-Email markiert (`isDefault: true`)
- Kann NICHT gelöscht werden (`canDelete: false`)
- Alle Team-Mitglieder haben Zugriff
- Sichtbar unter "E-Mail-Adressen"

**Funktionen mit Default-Domain**:
- ✅ Kampagnen versenden möglich
- ✅ Projekt-Postfächer werden erstellt
- ❌ Domain-Postfach existiert NICHT

### 1.3 Benutzerdefinierte Domains

Organisationen können zusätzliche Domains registrieren:

- ✅ Erscheinen unter "Domains" in der UI
- ✅ Können gelöscht werden (wenn nicht als Standard markiert)
- ✅ Bekommen automatisch ein Domain-Postfach
- ✅ Bekommen Projekt-Postfächer für jede Kampagne
- ✅ Können mehrere E-Mail-Adressen haben

**Collections**:
- `email_domains_enhanced` - Domain-Einträge
- `inbox_domain_mailboxes` - Domain-Postfächer
- `email_addresses` - E-Mail-Adressen für diese Domain

---

## 2. Postfach-Architektur

### 2.1 Domain-Postfächer (Domain Mailboxes)

**Collection**: `inbox_domain_mailboxes`

**Zweck**: Postfach für die gesamte Domain (alle Emails an diese Domain)

**Format**: `{domain}@inbox.sk-online-marketing.de`
**Beispiel**: `celeropress.com@inbox.sk-online-marketing.de`

**Wann erstellt**:
- Automatisch beim Registrieren einer neuen Domain
- NUR für benutzerdefinierte Domains
- NICHT für celeropress.com (Default-Domain)
- NICHT für sk-online-marketing.de (Infrastruktur-Domain)

**Felder**:
```typescript
{
  id: string;                    // Firestore Doc ID
  organizationId: string;        // Organisation
  domainId: string;              // Referenz zu email_domains_enhanced
  domain: string;                // Domain-Name (z.B. "meine-firma.de")
  inboxAddress: string;          // Postfach-Email
  status: 'active' | 'archived';
  unreadCount: number;
  threadCount: number;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

### 2.2 Projekt-Postfächer (Project Mailboxes)

**Collection**: `inbox_project_mailboxes`

**Zweck**: Postfach für ein spezifisches Projekt (Kampagne)

**Aktuelles Format** (FALSCH):
```
{projectId}@inbox.sk-online-marketing.de
Beispiel: 1uh6pwfwveeeafoyuzdn@inbox.sk-online-marketing.de
```

**Richtiges Format** (SOLL):
```
{localPart}-{projectId}@inbox.sk-online-marketing.de
Beispiel: presse-RmUNYUCAqLT1XkuJ7GKJ@inbox.sk-online-marketing.de
```

**Problem**: Die Projekt-Postfächer stimmen NICHT mit den Campaign Reply-To Adressen überein!

**Felder**:
```typescript
{
  id: string;                    // Firestore Doc ID
  organizationId: string;        // Organisation
  projectId: string;             // Referenz zu projects Collection
  domainId: string | null;       // Referenz zu email_domains_enhanced (FEHLT aktuell!)
  emailAddressId: string;        // Referenz zu email_addresses (FEHLT aktuell!)
  projectName: string;           // Projekt-Name
  inboxAddress: string;          // Postfach-Email
  status: 'active' | 'archived';
  unreadCount: number;
  threadCount: number;
  campaignCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

---

## 3. Reply-To Adressen-Generierung

### 3.1 Für Campaign-Versand

**Quelle**: `src/lib/email/email-address-service.ts:978-995`

**Methode**: `generateReplyToAddress(organizationId, emailAddressId)`

**Format**:
```typescript
const prefix = emailAddress.localPart.substring(0, 10).replace(/[^a-z0-9]/gi, '');
const shortOrgId = organizationId.substring(0, 8);
const shortEmailId = emailAddressId.substring(0, 8);

return `${prefix}-${shortOrgId}-${shortEmailId}@inbox.sk-online-marketing.de`;
```

**Beispiel**:
```
Email: presse@celeropress.com
Email ID: dPhDKsaNx8awXEcABlZ3
Org ID: hJ4gTE9Gm35epoub0zIU

Reply-To: presse-hJ4gTE9G-dPhDKsaN@inbox.sk-online-marketing.de
```

**Problem**: Dieses Format wird beim Campaign-Versand generiert, aber es gibt KEIN entsprechendes Projekt-Postfach mit diesem Format!

### 3.2 Für Projekt-Postfächer (ReplyToGeneratorService)

**Quelle**: `src/lib/email/reply-to-generator-service.ts:43-48`

**Methode**: `generateReplyTo(projectId, emailAddress, useSystemInbox)`

**Format**:
```typescript
const localPart = emailAddress.localPart || 'email';
return `${localPart}-${projectId}@inbox.sk-online-marketing.de`;
```

**Beispiel**:
```
Email: presse@celeropress.com
Project ID: RmUNYUCAqLT1XkuJ7GKJ

Reply-To: presse-RmUNYUCAqLT1XkuJ7GKJ@inbox.sk-online-marketing.de
```

**Problem**: Dieser Service wird für PR-Projekte verwendet (Collection: `pr_projects`), aber die gibt es in dieser Organisation nicht!

---

## 4. Datenfluss bei Campaign-Versand

### 4.1 Ablauf beim Versenden einer Kampagne

```
1. User erstellt Kampagne in Projekt
   ↓
2. API Route: /api/sendgrid/send-pr-campaign
   ↓
3. emailAddressService.getDefaultForOrganizationServer(orgId)
   → Lädt: presse@celeropress.com (ID: dPhDKsaNx8awXEcABlZ3)
   ↓
4. emailAddressService.generateReplyToAddress(orgId, emailAddressId)
   → Generiert: presse-hJ4gTE9G-dPhDKsaN@inbox.sk-online-marketing.de
   ↓
5. SendGrid versendet Email mit:
   - FROM: presse@celeropress.com
   - REPLY-TO: presse-hJ4gTE9G-dPhDKsaN@inbox.sk-online-marketing.de
   ↓
6. Empfänger antwortet an REPLY-TO
   ↓
7. SendGrid Inbound Parse empfängt Email
   ↓
8. API Route: /api/email/inbound
   ↓
9. Problem: Kein Postfach mit diesem Format existiert!
```

### 4.2 Fehlende Verknüpfung

**Projekt-Postfach** (existiert):
```
Collection: inbox_project_mailboxes
{
  projectId: "RmUNYUCAqLT1XkuJ7GKJ",
  inboxAddress: "rmunyucaqlt1xkuj7gkj@inbox.sk-online-marketing.de",
  emailAddressId: MISSING,  // ❌
  domainId: MISSING          // ❌
}
```

**Campaign Reply-To** (wird generiert):
```
presse-hJ4gTE9G-dPhDKsaN@inbox.sk-online-marketing.de
```

**Ergebnis**: Keine Übereinstimmung! Antworten können nicht zugeordnet werden.

---

## 5. Collections-Übersicht

### 5.1 Email-Domains

**Collection**: `email_domains_enhanced`

```typescript
{
  id: string;
  organizationId: string;
  domain: string;              // z.B. "celeropress.com"
  status: 'pending' | 'verified' | 'failed';
  isDefault: boolean;          // Standard-Domain?
  verifiedAt?: Timestamp;
  sendgridDomainId?: number;   // SendGrid Domain ID
  dnsRecords?: DnsRecord[];
  emailsSent?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Wichtig**:
- celeropress.com sollte für jede Org existieren mit `isDefault: true`
- Wird NICHT in UI unter "Domains" angezeigt wenn `isDefault: true`
- Benutzerdefinierte Domains haben `isDefault: false`

### 5.2 Email-Adressen

**Collection**: `email_addresses`

```typescript
{
  id: string;
  organizationId: string;
  domainId: string;            // Referenz zu email_domains_enhanced
  email: string;               // Vollständige Email
  localPart: string;           // Teil vor @
  domain: string;              // Teil nach @
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
  canDelete: boolean;          // false für System-Emails
  verified: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Wichtig**:
- Jede Org sollte Default-Email auf celeropress.com haben
- Format: `{orgId}@celeropress.com` (oder andere eindeutige Kennung)
- `canDelete: false` für System-Email

### 5.3 Projekte

**Collection**: `projects`

```typescript
{
  id: string;
  organizationId: string;
  name?: string;
  type?: string;
  // ... weitere Felder
}
```

**Wichtig**: Dies ist NICHT `pr_projects`! Unterschiedliche Collections für unterschiedliche Projekt-Typen.

---

## 6. Inbox Layout-Struktur

### Seite: `/dashboard/communication/inbox`

### Root: InboxLayout (layout.tsx)
- Versteckt die Dashboard-Sidebar
- Entfernt Padding vom Main-Content
- Stellt volle Breite für Inbox bereit

### Hauptkomponenten-Hierarchie:

```
InboxPage (page.tsx)
├── [Toolbar / Funktionsbar]
│   ├── Toggle Buttons (Sidebar-Controls)
│   ├── Suchfeld
│   ├── "Neue E-Mail" Button
│   └── Refresh Button
│
├── [Main Content Area] (3-Spalten-Layout)
│   ├── [Spalte 1] TeamFolderSidebar (Ordner-Spalte)
│   │   ├── Allgemein (Posteingang, Gesendet, etc.)
│   │   ├── Domain-Postfächer (inbox_domain_mailboxes)
│   │   └── Projekt-Postfächer (inbox_project_mailboxes)
│   │
│   ├── [Spalte 2] EmailList (Email-Liste)
│   │   ├── Folder Header (Mailbox-Email mit Copy-Button)
│   │   ├── Error State (bei Fehler)
│   │   └── EmailList Komponente
│   │       └── zeigt: threads (gefiltert)
│   │
│   └── [Spalte 3] EmailViewer (Email-Nachricht)
│       ├── EmailViewer Komponente (wenn Thread ausgewählt)
│       │   └── zeigt: threadEmails
│       └── Empty State (wenn keine Auswahl)
│
└── [Modal] ComposeEmail
    └── komponente: ComposeEmail (bei showCompose=true)
```

---

## 7. Probleme und erforderliche Fixes

### 7.1 Problem: Projekt-Postfach Format

**Aktuell**: `{projectId}@inbox.sk-online-marketing.de`
**Soll**: `{localPart}-{projectId}@inbox.sk-online-marketing.de`

**Grund**: Muss mit Campaign Reply-To Format übereinstimmen

**Fix erforderlich in**:
- Projekt-Postfach-Erstellung (wo?)
- Projekt-Postfach-Query (TeamFolderSidebar?)

### 7.2 Problem: Fehlende Referenzen

**Projekt-Postfächer haben keine**:
- `emailAddressId` - Welche Email-Adresse wurde verwendet?
- `domainId` - Zu welcher Domain gehört das Projekt?

**Fix erforderlich**:
- Beim Erstellen von Projekt-Postfächern diese IDs mitgeben
- Datenbank-Migration für bestehende Postfächer

### 7.3 Problem: Default-Domain Setup

**Fehlende Komponenten für neue Organisationen**:
1. ❌ celeropress.com Domain-Eintrag in `email_domains_enhanced`
2. ❌ Default Email-Adresse `{orgId}@celeropress.com` in `email_addresses`

**Fix erforderlich**:
- Organisation Creation Hook
- Automatisches Setup bei neuer Organisation

### 7.4 Problem: pr_projects vs projects

**ReplyToGeneratorService** sucht in `pr_projects`
**Tatsächlich existiert**: `projects`

**Fix erforderlich**:
- Collection-Name korrigieren oder
- Unterschiedliche Services für unterschiedliche Projekt-Typen

---

## 8. Firestore Security Rules

Alle Email-Collections sind org-isoliert:

```javascript
// email_domains_enhanced
allow read: if isAuthenticated()
            && resource.data.organizationId == request.auth.token.organizationId;

// email_addresses
allow read: if isAuthenticated()
            && resource.data.organizationId == request.auth.token.organizationId;

// inbox_domain_mailboxes
allow read: if isAuthenticated()
            && resource.data.organizationId == request.auth.token.organizationId;

// inbox_project_mailboxes
allow read: if isAuthenticated()
            && resource.data.organizationId == request.auth.token.organizationId;

// email_threads
allow read: if isAuthenticated()
            && resource.data.organizationId == request.auth.token.organizationId;

// email_messages
allow read: if isAuthenticated()
            && resource.data.organizationId == request.auth.token.organizationId;
```

---

## 9. Nächste Schritte

### Priority 1: Daten-Konsistenz herstellen

1. ✅ Default-Domain Setup für alle Organisationen
   - celeropress.com Domain-Einträge
   - Default Email-Adressen

2. ✅ Projekt-Postfach Format korrigieren
   - Von: `{projectId}@...`
   - Zu: `{localPart}-{projectId}@...`

3. ✅ Fehlende Referenzen hinzufügen
   - `emailAddressId` zu allen Projekt-Postfächern
   - `domainId` zu allen Projekt-Postfächern

### Priority 2: Code-Fixes

1. ✅ Collection-Name korrigieren (pr_projects vs projects)
2. ✅ Projekt-Postfach-Erstellung vereinheitlichen
3. ✅ Reply-To Generierung vereinheitlichen

### Priority 3: Automatisierung

1. ✅ Organisation Creation Hook
   - Auto-Setup von celeropress.com
   - Auto-Setup von Default-Email
2. ✅ Domain Registration Hook
   - Auto-Erstellung von Domain-Postfach
3. ✅ Campaign Creation Hook
   - Auto-Erstellung von Projekt-Postfach mit korrektem Format

---

## 10. Datenmodell-Visualisierung

```
Organization (hJ4gTE9Gm35epoub0zIU)
│
├── email_domains_enhanced
│   ├── celeropress.com (isDefault: true, NICHT in UI)
│   └── meine-firma.de (isDefault: false, in UI sichtbar)
│
├── email_addresses
│   ├── hj4gte9gm35@celeropress.com (isDefault: true, canDelete: false)
│   ├── info@meine-firma.de (isDefault: false, canDelete: true)
│   └── kontakt@meine-firma.de (isDefault: false, canDelete: true)
│
├── inbox_domain_mailboxes
│   └── meine-firma.de@inbox.sk-online-marketing.de
│       (KEIN Postfach für celeropress.com!)
│
├── projects
│   ├── Projekt A (RmUNYUCAqLT1XkuJ7GKJ)
│   ├── Projekt B (1uh6pWfwVeEEaFoyuZDN)
│   └── Projekt C (tDMAVyH6xGtL4dYsvJBC)
│
└── inbox_project_mailboxes
    ├── info-RmUNYUCAqLT1XkuJ7GKJ@inbox.sk-online-marketing.de
    │   (emailAddressId: info@meine-firma.de)
    │   (domainId: meine-firma.de)
    │
    ├── hj4gte9gm35-1uh6pWfwVeEEaFoyuZDN@inbox.sk-online-marketing.de
    │   (emailAddressId: hj4gte9gm35@celeropress.com)
    │   (domainId: celeropress.com)
    │
    └── kontakt-tDMAVyH6xGtL4dYsvJBC@inbox.sk-online-marketing.de
        (emailAddressId: kontakt@meine-firma.de)
        (domainId: meine-firma.de)
```

---

**Letzte Aktualisierung**: 2025-11-23
**Status**: Architektur dokumentiert, Probleme identifiziert, Fixes ausstehend
