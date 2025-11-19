# Inbox Refactoring: Implementierungsplan

**Version:** 1.0
**Erstellt:** 19. Januar 2025
**Status:** Planung
**Projekt:** CeleroPress / SKAMP

---

## 📋 Übersicht

Dieser Implementierungsplan beschreibt die schrittweise Umsetzung des neuen Inbox-Systems mit:
- ✅ **Domain-basierten Postfächern** (pro Domain)
- ✅ **Projekt-basierten Postfächern** (pro Projekt)
- ✅ **Default Domain** (celeropress.com für schnellen Start)
- ✅ **Inbox-Deaktivierung** (Option für eigene Mail-Software)
- ✅ **Vereinfachtes Reply-To Pattern** (ohne campaignId)

---

## 🎯 Ziele

1. **Schneller Einstieg:** Neue Kunden können sofort loslegen (Default Domain)
2. **Flexibilität:** Kunden können eigene Mail-Software nutzen (Inbox optional)
3. **Projekt-Tracking:** Alle Campaign-Antworten landen im Projekt-Postfach
4. **Archivierung:** Archivierte Projekte leiten zu Domain-Postfach um
5. **Einfachheit:** Kein komplexes Reply-To Pattern mehr

---

## 📐 Architektur-Übersicht

### **Postfach-Typen:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. DOMAIN-POSTFÄCHER (pro Domain)                       │
│    Format: {domain}@inbox.sk-online-marketing.de       │
│    Beispiel: xyz@inbox.sk-online-marketing.de          │
│    Verwendung: Weiterleitungen, Archiv                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 2. PROJEKT-POSTFÄCHER (pro Projekt)                     │
│    Format: {localPart}-{projectId}@inbox.sk...         │
│    Beispiel: presse-proj-123@inbox.sk...               │
│    Verwendung: Campaign-Antworten                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 3. DEFAULT DOMAIN (celeropress.com)                     │
│    Format: {org-slug}@celeropress.com                  │
│    Beispiel: xyz-gmbh@celeropress.com                  │
│    Verwendung: Neukunden ohne eigene Domain            │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementierungs-Phasen

## PHASE 1: Datenmodell-Erweiterungen

### 1.1 TypeScript Interfaces erweitern

**Datei:** `src/types/email-domains-enhanced.ts`

```typescript
export interface EmailDomainEnhanced extends BaseEntity {
  // ... existing fields ...

  // Configuration
  isDefault?: boolean;      // Is this the default sending domain?
  isShared?: boolean;       // NEU: Shared across all organizations (z.B. celeropress.com)
  inboxEnabled?: boolean;   // NEU: Inbox für diese Domain aktiviert (Standard: true)
  allowedSenders?: string[];

  // ... rest of fields ...
}
```

**Datei:** `src/types/email.ts`

```typescript
export interface EmailAddress extends BaseEntity {
  // ... existing fields ...

  isDefault?: boolean;        // Default email for organization
  isSharedDomain?: boolean;   // NEU: Email auf shared domain (celeropress.com)
  inboxEnabled?: boolean;     // NEU: Inbox für diese Email aktiviert (Standard: true)

  // ... rest of fields ...
}
```

**NEU: Datei:** `src/types/inbox.ts`

```typescript
import { Timestamp } from 'firebase/firestore';
import { BaseEntity } from './international';

/**
 * Domain-Postfach - Ein Postfach pro Domain
 */
export interface DomainMailbox extends BaseEntity {
  domainId: string;              // Referenz zu email_domains_enhanced
  domain: string;                // z.B. "xyz.de" oder "celeropress.com"
  inboxAddress: string;          // z.B. "xyz@inbox.sk-online-marketing.de"
  status: 'active' | 'inactive';
  unreadCount: number;
  threadCount: number;
  isDefault?: boolean;           // Default-Postfach für Organizations ohne Domain
  isShared?: boolean;            // Shared domain (celeropress.com)
}

/**
 * Projekt-Postfach - Ein Postfach pro Projekt
 */
export interface ProjectMailbox extends BaseEntity {
  projectId: string;             // Referenz zu pr_projects
  domainId: string;              // Referenz zu email_domains_enhanced
  projectName: string;           // Denormalisiert
  inboxAddress: string;          // z.B. "presse-proj-123@inbox.sk..."
  status: 'active' | 'completed' | 'archived';
  unreadCount: number;
  threadCount: number;
  campaignCount: number;
  completedAt?: Timestamp;
  archivedAt?: Timestamp;
  redirectTo?: string;           // Domain-Postfach ID (bei archiviert)
}

/**
 * Email Thread Erweiterungen
 */
export interface EmailThread extends BaseEntity {
  // ... existing fields ...

  // NEU: Domain & Projekt-Zuordnung
  domainId: string;              // Immer vorhanden
  projectId?: string;            // Optional (bei Projekt-Postfach)
  mailboxType: 'domain' | 'project';

  // NEU: Redirect-Metadata
  metadata?: {
    originalProjectId?: string;
    originalProjectName?: string;
    archivedAt?: Timestamp;
    redirectedAt?: Timestamp;
    redirectReason?: 'project_archived' | 'manual';
  };

  // ... rest of fields ...
}

/**
 * Email Message Erweiterungen
 */
export interface EmailMessage extends BaseEntity {
  // ... existing fields ...

  // NEU: Domain & Projekt-Zuordnung
  domainId: string;              // Immer vorhanden
  projectId?: string;            // Optional
  mailboxType: 'domain' | 'project';

  // NEU: Redirect-Metadata
  metadata?: {
    originalProjectId?: string;
    originalProjectName?: string;
  };

  // ... rest of fields ...
}
```

**Datei:** `src/types/project.ts`

```typescript
export interface PRProject extends BaseEntity {
  // ... existing fields ...

  domainId?: string;             // NEU: Referenz zur Domain
  useSystemInbox?: boolean;      // NEU: true = Inbox, false = eigene Software (Standard: true)

  // ... rest of fields ...
}
```

---

### 1.2 Firestore Collections

**Neue Collections:**

```typescript
// Collection: inbox_domain_mailboxes
{
  id: "mailbox-domain-xyz",
  domainId: "domain-xyz",
  domain: "xyz.de",
  inboxAddress: "xyz@inbox.sk-online-marketing.de",
  organizationId: "org-123",
  status: "active",
  unreadCount: 42,
  threadCount: 156,
  isDefault: false,
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// Collection: inbox_project_mailboxes
{
  id: "inbox-proj-123",
  projectId: "proj-123",
  domainId: "domain-xyz",
  organizationId: "org-123",
  projectName: "Website-Relaunch",
  inboxAddress: "presse-proj-123@inbox.sk-online-marketing.de",
  status: "active",
  unreadCount: 18,
  threadCount: 45,
  campaignCount: 2,
  createdAt: Timestamp
}
```

**Erweiterte Collections:**

```typescript
// Collection: email_threads (erweitern)
{
  // ... existing fields ...
  domainId: "domain-xyz",        // NEU
  projectId: "proj-123",         // NEU (optional)
  mailboxType: "project",        // NEU: 'domain' | 'project'
  metadata: {                    // NEU (bei Redirect)
    originalProjectId: "proj-123",
    originalProjectName: "Website-Relaunch",
    redirectReason: "project_archived"
  }
}

// Collection: email_messages (erweitern)
{
  // ... existing fields ...
  domainId: "domain-xyz",        // NEU
  projectId: "proj-123",         // NEU (optional)
  mailboxType: "project"         // NEU
}

// Collection: pr_projects (erweitern)
{
  // ... existing fields ...
  domainId: "domain-xyz",        // NEU
  useSystemInbox: true           // NEU (Standard: true)
}
```

---

### 1.3 Default Domain konfigurieren

**Firestore Update für bestehende Domain:**

```typescript
// Collection: email_domains_enhanced
// Document ID: icg2wwuTis8tv1WMCnKr

{
  // ... existing fields ...
  domain: "celeropress.com",
  status: "verified",

  // NEU:
  isDefault: true,               // Markiere als Default-Domain
  isShared: true,                // Wird von allen Organizations genutzt
  inboxEnabled: true             // Inbox aktiviert
}
```

**Domain-Postfach erstellen:**

```typescript
// Collection: inbox_domain_mailboxes
{
  id: "mailbox-celeropress",
  domainId: "icg2wwuTis8tv1WMCnKr",
  domain: "celeropress.com",
  inboxAddress: "celeropress@inbox.sk-online-marketing.de",
  organizationId: "system",      // System-Postfach
  status: "active",
  isDefault: true,
  isShared: true,
  unreadCount: 0,
  threadCount: 0,
  createdAt: Timestamp
}
```

---

## PHASE 2: Services implementieren

### 2.1 Reply-To Parser Service

**NEU: Datei:** `src/lib/email/reply-to-parser-service.ts`

```typescript
import { emailDomainService } from './email-domain-service';
import { projectService } from '../firebase/project-service';

export interface ParsedReplyTo {
  type: 'domain' | 'project';
  domain?: string;
  domainId?: string;
  localPart?: string;
  projectId?: string;
}

class ReplyToParserService {
  /**
   * Parst eine Reply-To Adresse
   *
   * Formate:
   * - Domain: {domain}@inbox.sk-online-marketing.de
   * - Projekt: {localPart}-{projectId}@inbox.sk-online-marketing.de
   */
  async parse(address: string): Promise<ParsedReplyTo> {
    const [localPartFull, domain] = address.split('@');

    // Prüfe ob Inbox-Domain
    if (domain !== 'inbox.sk-online-marketing.de') {
      throw new Error('Invalid inbox domain');
    }

    // Projekt-Postfach? (enthält Bindestrich)
    if (localPartFull.includes('-')) {
      const parts = localPartFull.split('-');

      if (parts.length === 2) {
        const localPart = parts[0];
        const projectId = parts[1];

        // Lookup domainId via projectId
        const project = await projectService.get(projectId);
        if (!project) {
          throw new Error(`Project not found: ${projectId}`);
        }

        return {
          type: 'project',
          localPart,
          projectId,
          domainId: project.domainId
        };
      }
    }

    // Domain-Postfach
    const domainName = localPartFull;
    const domainMailbox = await this.getDomainMailbox(domainName);

    return {
      type: 'domain',
      domain: domainName,
      domainId: domainMailbox.domainId
    };
  }

  private async getDomainMailbox(domainName: string) {
    // Query inbox_domain_mailboxes
    const snapshot = await getDocs(
      query(
        collection(db, 'inbox_domain_mailboxes'),
        where('domain', '==', domainName),
        limit(1)
      )
    );

    if (snapshot.empty) {
      throw new Error(`Domain mailbox not found: ${domainName}`);
    }

    return snapshot.docs[0].data();
  }
}

export const replyToParserService = new ReplyToParserService();
```

---

### 2.2 Redirect Handler Service

**NEU: Datei:** `src/lib/email/redirect-handler-service.ts`

```typescript
import { ParsedReplyTo } from './reply-to-parser-service';
import { projectService } from '../firebase/project-service';

export interface ThreadCreationParams {
  projectId: string | null;
  domainId: string;
  mailboxType: 'domain' | 'project';
  labels?: string[];
  metadata?: Record<string, any>;
}

class RedirectHandlerService {
  /**
   * Prüft ob Projekt archiviert ist und leitet ggf. um
   */
  async handleIncomingEmail(
    parsedReplyTo: ParsedReplyTo
  ): Promise<ThreadCreationParams> {

    // Domain-Postfach: Kein Redirect
    if (parsedReplyTo.type === 'domain') {
      return {
        projectId: null,
        domainId: parsedReplyTo.domainId!,
        mailboxType: 'domain'
      };
    }

    // Projekt-Postfach: Prüfe Status
    if (parsedReplyTo.type === 'project') {
      const project = await projectService.get(parsedReplyTo.projectId!);

      if (!project) {
        throw new Error(`Project not found: ${parsedReplyTo.projectId}`);
      }

      // Archiviert? → Redirect zu Domain-Postfach
      if (project.status === 'archived') {
        return {
          projectId: null,
          domainId: project.domainId!,
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

      // Aktiv → Projekt-Postfach
      return {
        projectId: parsedReplyTo.projectId,
        domainId: project.domainId!,
        mailboxType: 'project'
      };
    }

    throw new Error('Invalid parsed reply-to');
  }
}

export const redirectHandlerService = new RedirectHandlerService();
```

---

### 2.3 Default Email Service

**NEU: Datei:** `src/lib/email/default-email-service.ts`

```typescript
import { emailAddressService } from './email-address-service';
import { emailDomainService } from './email-domain-service';

class DefaultEmailService {
  /**
   * Erstellt automatisch Default-Email bei Organization-Erstellung
   */
  async createDefaultEmailForOrganization(
    organizationId: string,
    organizationName: string
  ): Promise<string> {

    // 1. Default Domain holen
    const defaultDomain = await this.getDefaultDomain();

    if (!defaultDomain) {
      throw new Error('Default domain (celeropress.com) not configured');
    }

    // 2. Organization Slug generieren
    const slug = this.generateSlug(organizationName);

    // 3. Email-Adresse erstellen
    const emailAddress = await emailAddressService.create({
      email: `${slug}@celeropress.com`,
      localPart: slug,
      domainId: defaultDomain.id,
      displayName: organizationName,
      organizationId,
      isActive: true,
      isDefault: true,
      isSharedDomain: true,
      inboxEnabled: true
    });

    // 4. Domain-Postfach erstellen
    await this.createDomainMailbox({
      domainId: defaultDomain.id,
      organizationId,
      domain: 'celeropress.com',
      inboxAddress: `${slug}@inbox.sk-online-marketing.de`,
      isDefault: true,
      isShared: true
    });

    return emailAddress.id;
  }

  private async getDefaultDomain() {
    const snapshot = await getDocs(
      query(
        collection(db, 'email_domains_enhanced'),
        where('isDefault', '==', true),
        where('isShared', '==', true),
        limit(1)
      )
    );

    return snapshot.empty ? null : snapshot.docs[0].data();
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async createDomainMailbox(data: any) {
    return addDoc(collection(db, 'inbox_domain_mailboxes'), {
      ...data,
      status: 'active',
      unreadCount: 0,
      threadCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

export const defaultEmailService = new DefaultEmailService();
```

---

### 2.4 Email Composer anpassen

**Datei:** `src/lib/email/email-composer-service.ts`

```typescript
/**
 * Generiert Reply-To Adresse basierend auf Projekt-Einstellungen
 */
function generateReplyTo(
  project: PRProject,
  emailAddress: EmailAddress
): string {

  // Inbox deaktiviert? → Reply-To = FROM
  if (!project.useSystemInbox || !emailAddress.inboxEnabled) {
    return emailAddress.email;  // z.B. presse@xyz.de
  }

  // Shared Domain (celeropress.com)?
  if (emailAddress.isSharedDomain) {
    const org = await getOrganization(project.organizationId);
    return `${org.slug}-${project.id}@inbox.sk-online-marketing.de`;
    // Beispiel: xyz-gmbh-proj-123@inbox.sk...
  }

  // Eigene Domain
  return `${emailAddress.localPart}-${project.id}@inbox.sk-online-marketing.de`;
  // Beispiel: presse-proj-123@inbox.sk...
}
```

---

## PHASE 3: API-Anpassungen

### 3.1 Inbound Webhook aktualisieren

**Datei:** `src/app/api/email/inbound/route.ts`

```typescript
import { replyToParserService } from '@/lib/email/reply-to-parser-service';
import { redirectHandlerService } from '@/lib/email/redirect-handler-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import { emailMessageService } from '@/lib/email/email-message-service';

// Hinweis: Diese Route ist für INBOUND emails (von SendGrid)
// Für Campaign-Versand nutzen wir: /api/pr/email/send
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Reply-To parsen
    const parsedReplyTo = await replyToParserService.parse(body.to);

    // 2. Redirect-Handling (Archivierung)
    const threadParams = await redirectHandlerService.handleIncomingEmail(
      parsedReplyTo
    );

    // 3. Thread finden oder erstellen
    const thread = await threadMatcherService.findOrCreateThread({
      messageId: body.messageId,
      subject: body.subject,
      from: body.from,
      to: body.to,
      ...threadParams
    });

    // 4. Message erstellen
    const message = await emailMessageService.create({
      threadId: thread.id,
      from: body.from,
      to: body.to,
      subject: body.subject,
      textContent: body.text,
      htmlContent: body.html,
      ...threadParams
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inbound email error:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}
```

---

### 3.2 Organization-Erstellung Hook

**Datei:** `src/lib/hooks/useOrganizationCreation.ts` (oder im Backend)

```typescript
import { defaultEmailService } from '@/lib/email/default-email-service';

export async function onOrganizationCreated(
  organizationId: string,
  organizationName: string
) {
  try {
    // Automatisch Default-Email erstellen
    await defaultEmailService.createDefaultEmailForOrganization(
      organizationId,
      organizationName
    );

    console.log(`Default email created for org: ${organizationId}`);
  } catch (error) {
    console.error('Failed to create default email:', error);
    // Nicht kritisch - User kann manuell erstellen
  }
}
```

---

## PHASE 4: UI-Refactoring

### 4.1 Inbox Sidebar

**Datei:** `src/components/inbox/InboxSidebar.tsx`

Neue Struktur:

```typescript
<InboxSidebar>
  {/* Domain-Postfächer */}
  <FolderSection title="Domain-Postfächer">
    {domainMailboxes.map(mailbox => (
      <DomainMailboxItem
        key={mailbox.id}
        mailbox={mailbox}
        isDefault={mailbox.isDefault}
        onClick={() => selectDomainMailbox(mailbox)}
      />
    ))}
  </FolderSection>

  {/* Projekt-Postfächer */}
  <FolderSection title="Projekte">
    {projectMailboxes.map(mailbox => (
      <ProjectMailboxItem
        key={mailbox.id}
        mailbox={mailbox}
        onClick={() => selectProjectMailbox(mailbox)}
      />
    ))}
  </FolderSection>

  {/* Archiv */}
  <FolderSection title="Archiv" collapsed>
    {archivedMailboxes.map(mailbox => (
      <ProjectMailboxItem
        key={mailbox.id}
        mailbox={mailbox}
        archived
      />
    ))}
  </FolderSection>
</InboxSidebar>
```

**NEU: Komponenten:**
- `DomainMailboxItem.tsx` - Zeigt Domain-Postfach mit Badge (Default/Standard)
- `ProjectMailboxItem.tsx` - Zeigt Projekt mit Campaign-Count

---

### 4.2 Email Composer - Inbox Toggle

**Datei:** `src/components/pr/email/EmailComposer.tsx`

Neuer Toggle im Step 2:

```typescript
<div className="space-y-4">
  {/* Email-Adresse auswählen */}
  <EmailAddressSelector
    value={draft.emailAddressId}
    onChange={(id) => setDraft({ ...draft, emailAddressId: id })}
  />

  {/* NEU: Inbox-Modus Toggle */}
  <div className="border rounded-lg p-4 space-y-3">
    <h3 className="font-medium text-sm">Email-Verwaltung</h3>

    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="radio"
        name="inboxMode"
        checked={useSystemInbox}
        onChange={() => setUseSystemInbox(true)}
      />
      <div>
        <div className="font-medium text-sm">
          System-Inbox verwenden ⭐ Empfohlen
        </div>
        <div className="text-xs text-gray-600">
          • Antworten landen in der CeleroPress Inbox<br/>
          • Team-Zusammenarbeit möglich<br/>
          • Projekt-Tracking aktiv
        </div>
      </div>
    </label>

    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="radio"
        name="inboxMode"
        checked={!useSystemInbox}
        onChange={() => setUseSystemInbox(false)}
      />
      <div>
        <div className="font-medium text-sm">
          Eigene Mail-Software verwenden
        </div>
        <div className="text-xs text-gray-600">
          • Antworten landen in deinem Postfach<br/>
          • Du arbeitest mit Outlook/Thunderbird/etc.<br/>
          ⚠️ Kein Projekt-Tracking in der Inbox
        </div>
      </div>
    </label>
  </div>

  {/* Info: Reply-To Vorschau */}
  {!useSystemInbox && (
    <Alert type="info">
      Antworten gehen an: <strong>{selectedEmail.email}</strong>
    </Alert>
  )}
</div>
```

---

### 4.3 Onboarding-Flow

**Datei:** `src/components/onboarding/EmailSetup.tsx`

```typescript
function EmailSetupStep() {
  return (
    <div className="space-y-6">
      <h2>Deine erste Email-Adresse</h2>

      {/* Default Email (automatisch erstellt) */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <span className="font-medium">Standard-Email erstellt</span>
        </div>
        <div className="text-sm text-gray-700">
          Du kannst sofort loslegen mit:<br/>
          <strong>{organizationSlug}@celeropress.com</strong>
        </div>
      </div>

      {/* Upgrade-Option */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-2">
          Professioneller Auftritt (optional)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Registriere deine eigene Domain für maximale Professionalität
        </p>
        <Button
          onClick={() => router.push('/dashboard/settings/domain')}
          variant="outline"
        >
          Eigene Domain registrieren
        </Button>
      </div>

      {/* Weiter */}
      <Button onClick={onNext}>
        Weiter zum Dashboard
      </Button>
    </div>
  );
}
```

---

## PHASE 5: Testing

### 5.1 Unit Tests

**Test-Szenarien:**

```typescript
// reply-to-parser-service.test.ts
describe('ReplyToParserService', () => {
  it('parst Domain-Postfach korrekt', async () => {
    const result = await service.parse('xyz@inbox.sk-online-marketing.de');
    expect(result.type).toBe('domain');
    expect(result.domain).toBe('xyz');
  });

  it('parst Projekt-Postfach korrekt', async () => {
    const result = await service.parse('presse-proj-123@inbox.sk...');
    expect(result.type).toBe('project');
    expect(result.projectId).toBe('proj-123');
  });

  it('wirft Fehler bei ungültiger Domain', async () => {
    await expect(
      service.parse('test@gmail.com')
    ).rejects.toThrow('Invalid inbox domain');
  });
});

// redirect-handler-service.test.ts
describe('RedirectHandlerService', () => {
  it('leitet archiviertes Projekt um', async () => {
    const parsedReplyTo = {
      type: 'project',
      projectId: 'archived-proj',
      domainId: 'domain-xyz'
    };

    const result = await service.handleIncomingEmail(parsedReplyTo);

    expect(result.mailboxType).toBe('domain');
    expect(result.projectId).toBeNull();
    expect(result.labels).toContain('redirected-from-archived');
  });
});

// default-email-service.test.ts
describe('DefaultEmailService', () => {
  it('erstellt Default-Email für neue Organization', async () => {
    const emailId = await service.createDefaultEmailForOrganization(
      'org-123',
      'XYZ GmbH'
    );

    const email = await emailAddressService.get(emailId);
    expect(email.email).toBe('xyz-gmbh@celeropress.com');
    expect(email.isDefault).toBe(true);
  });
});
```

---

### 5.2 Integration Tests

**Test-Szenarien:**

1. **Default Domain Flow:**
   - Organization erstellen
   - Default-Email wird automatisch angelegt
   - Campaign versenden funktioniert
   - Antwort landet in Inbox

2. **Eigene Domain Flow:**
   - Domain registrieren
   - Email-Adresse anlegen
   - Domain-Postfach wird erstellt
   - Campaign versenden
   - Antwort landet in Projekt-Postfach

3. **Archivierung Flow:**
   - Projekt archivieren
   - Antwort auf alte Campaign
   - Landet in Domain-Postfach mit Redirect-Badge

4. **Inbox deaktiviert:**
   - Projekt mit `useSystemInbox: false`
   - Campaign versenden
   - Reply-To = FROM (keine Inbox)

---

## PHASE 6: Migration & Deployment

### 6.1 Daten-Migration

**Script:** `scripts/migrate-to-new-inbox.ts`

```typescript
/**
 * Migriert bestehende Threads zu neuem Format
 */
async function migrateThreads() {
  const threads = await getAllThreads();

  for (const thread of threads) {
    // Finde zugehörige Domain
    const domain = await getDomainForThread(thread);

    // Update Thread
    await updateThread(thread.id, {
      domainId: domain.id,
      mailboxType: thread.projectId ? 'project' : 'domain'
    });
  }
}

/**
 * Erstellt Domain-Postfächer für alle Domains
 */
async function createDomainMailboxes() {
  const domains = await getAllDomains();

  for (const domain of domains) {
    await createDomainMailbox({
      domainId: domain.id,
      domain: domain.domain,
      inboxAddress: `${domain.domain}@inbox.sk-online-marketing.de`,
      organizationId: domain.organizationId,
      status: 'active'
    });
  }
}
```

---

### 6.2 Rollback-Plan

**Falls Probleme auftreten:**

1. **Sofort:** Feature-Flag deaktivieren
   ```typescript
   const USE_NEW_INBOX = false;
   ```

2. **Daten:** Backup vor Migration
   ```bash
   npm run backup-firestore
   ```

3. **Services:** Alte Services parallel laufen lassen
   ```typescript
   if (USE_NEW_INBOX) {
     return newInboxService.handleEmail(data);
   } else {
     return oldInboxService.handleEmail(data);
   }
   ```

---

### 6.3 Deployment-Schritte

**1. Vorbereitung:**
- [ ] Backup aller Firestore-Collections
- [ ] Feature-Flag implementieren
- [ ] Monitoring aufsetzen

**2. Deployment:**
- [ ] TypeScript Interfaces deployen
- [ ] Services deployen (ohne Aktivierung)
- [ ] Default Domain konfigurieren
- [ ] Tests in Production laufen lassen

**3. Aktivierung:**
- [ ] Feature-Flag für 10% der User aktivieren
- [ ] Monitoring prüfen
- [ ] Bei Erfolg: 50% → 100%

**4. Cleanup:**
- [ ] Alte Services entfernen
- [ ] Feature-Flag entfernen
- [ ] Dokumentation aktualisieren

---

## 📊 Erfolgs-Metriken

**KPIs:**
- ✅ Onboarding-Zeit: < 5 Minuten (mit Default Domain)
- ✅ Email-Deliverability: > 95%
- ✅ Inbox-Adoption: > 80% nutzen System-Inbox
- ✅ Archivierungs-Rate: 100% der archivierten Projekte funktionieren

**Monitoring:**
- Fehlerrate Inbound Webhook: < 1%
- Reply-To Parser Erfolgsrate: > 99%
- Redirect Handler Performance: < 200ms

---

## 🚧 Offene Punkte & Entscheidungen

### Zu klären:

1. **Organization-Slug Uniqueness:**
   - Was passiert wenn zwei Organizations gleichen Slug generieren?
   - Lösung: Suffix anhängen (xyz-gmbh-2)

2. **Default Domain Limits:**
   - Sollen Default-Domain-Nutzer Limits haben?
   - Vorschlag: Max 100 Empfänger/Campaign

3. **Migration Zeitplan:**
   - Wann migrieren wir bestehende Daten?
   - Vorschlag: Schrittweise über 2 Wochen

4. **Inbox-Toggle Default:**
   - Soll `useSystemInbox` standardmäßig `true` sein?
   - Antwort: Ja, mit Info-Banner

---

## ✅ Nächste Schritte

1. **Review dieses Plans** mit Team
2. **Priorisierung** der Phasen festlegen
3. **Zeitplan** erstellen (Sprints/Milestones)
4. **Start mit Phase 1** (Datenmodell)

---

**Erstellt von:** Claude AI & Stefan Kühne
**Version:** 1.0
**Letzte Aktualisierung:** 19. Januar 2025
