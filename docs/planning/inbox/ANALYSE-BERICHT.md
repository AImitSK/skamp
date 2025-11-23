# Analyse-Bericht: Email-System & Postfach-Architektur

**Datum**: 2025-11-23
**Analyst**: Claude AI
**Zweck**: Klärung offener Fragen zur Inbox & Email-System Integration

---

## Frage 1: Wo werden Projekt-Postfächer erstellt?

### Antwort: Beim Anlegen des Projekts

**Quelle**: `src/lib/firebase/project-service.ts:66-86`

**Mechanismus**:
```typescript
// In projectService.create()
const inboxAddress = `${docRef.id}@inbox.sk-online-marketing.de`.toLowerCase();

await addDoc(collection(db, 'inbox_project_mailboxes'), {
  organizationId: projectData.organizationId,
  projectId: docRef.id,
  projectName: projectData.title,
  inboxAddress: inboxAddress,
  status: 'active',
  unreadCount: 0,
  threadCount: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  createdBy: projectData.userId
});
```

### ❌ PROBLEM IDENTIFIZIERT: Falsches Format

**IST-Zustand**:
```typescript
const inboxAddress = `${docRef.id}@inbox.sk-online-marketing.de`.toLowerCase();
// Beispiel: 1uh6pwfwveeeafoyuzdn@inbox.sk-online-marketing.de
```

**SOLL-Zustand** (basierend auf Campaign Email API):
```typescript
const inboxAddress = `{localPart}-{projectId}@inbox.sk-online-marketing.de`;
// Beispiel: presse-RmUNYUCAqLT1XkuJ7GKJ@inbox.sk-online-marketing.de
```

**Grund für Diskrepanz**:
- Campaign-Versand (`/api/pr/email/send`) generiert Reply-To mit `emailAddressService.generateReplyToAddress()`
- Format: `{prefix}-{shortOrgId}-{shortEmailId}@inbox.sk-online-marketing.de`
- Projekt-Postfächer haben Format: `{projectId}@inbox.sk-online-marketing.de`
- **→ KEINE ÜBEREINSTIMMUNG = Antworten können nicht zugeordnet werden!**

### Fehlende Felder in Projekt-Postfächern

**Aktuell NICHT gesetzt**:
```typescript
emailAddressId: string;  // ❌ FEHLT - Welche Email wurde verwendet?
domainId: string | null; // ❌ FEHLT - Zu welcher Domain gehört das Projekt?
```

**Problem**: Ohne diese Referenzen kann das System nicht zuordnen:
- Welche Email-Adresse für ein Projekt verwendet wurde
- Zu welcher Domain ein Projekt gehört
- → Reply-To Parsing funktioniert nicht korrekt

---

## Frage 2: Campaign vs. PR-Project - Unterschied?

### Antwort: Zwei parallele Systeme gefunden

Nach Analyse der Dokumentation (`docs/campaigns-email/README.md`) und des Codes:

### System 1: Campaign Email System (AKTIV, Production-Ready)

**Status**: ✅ Production-Ready, vollständig getestet
**Verwendet für**: Pressemitteilungs-Versand
**Dokumentation**: `docs/campaigns-email/`
**Collection**: `pr_campaigns` (Kampagnen), `projects` (Projekte)

**API Endpoints**:
- `POST /api/pr/email/send` - Sofort/Geplanter Versand
- `POST /api/pr/email/test` - Test-Email
- `POST /api/pr/email/cron` - Scheduled Emails
- `GET /api/pr/email/cron` - Health-Check

**Services**:
- `emailSenderService` - Versand-Logik
- `emailComposerService` - Content-Komposition
- `emailAddressService` - EmailAddress CRUD

**Features**:
- ✅ Verifizierte Absender-Emails (`email_addresses` Collection)
- ✅ Multi-Step Email Composer
- ✅ Scheduled Emails mit Cron-Job
- ✅ Reply-To Forwarding: `{prefix}-{shortOrgId}-{shortEmailId}@inbox...`
- ✅ Test-Email Funktion
- ✅ PDF-Anhang Generation
- ✅ Variablen-System für personalisierte Emails
- ✅ 30/30 Tests bestanden

**Email-Body vs. Pressemitteilung**:
- `draft.content.body`: User-verfasster Email-Text mit Variablen
- `campaign.mainContent`: Vollständige PM (nur im PDF-Anhang)

### System 2: Reply-To Generator Service (TEILWEISE AKTIV)

**Status**: ⚠️ Teilweise implementiert, verwendet `pr_projects` Collection
**Quelle**: `src/lib/email/reply-to-generator-service.ts`

**Format**:
```typescript
const replyTo = `${localPart}-${projectId}@inbox.sk-online-marketing.de`;
```

**Problem**: Sucht in `pr_projects` Collection (Zeile 84):
```typescript
const projectDoc = await adminDb.collection('pr_projects').doc(projectId).get();
```

**Aber**: Keine `pr_projects` Collection in deiner Organisation!
- Nur `projects` Collection existiert
- → Service kann keine Projekt-Daten laden
- → Projekt-Postfach-Erstellung schlägt fehl

### ❌ System 3: Veraltete Email-Services (DEPRECATED)

**Gefunden in Dokumentation**:
- `email-service.ts` - Marked as "Legacy Service"
- `SenderSelector.tsx` - Marked as "Deprecated"
- `Step1Content.tsx` - Marked as "Deprecated"

**Diese Services sollten GELÖSCHT werden**:
- Alte Implementierung ohne Admin SDK
- Nicht mehr in Verwendung
- Campaign Email System ist Nachfolger

---

## Frage 3: Default-Domain Setup - Wann?

### Antwort: Beim ersten erfolgreichen Login nach Stripe-Zahlung

**Quelle**: `src/lib/auth/create-user-from-pending.ts`

**Workflow**:
```
1. User registriert sich → pending_signups Collection
2. User zahlt via Stripe Checkout
3. Stripe Webhook: checkout.session.completed
4. createUserAndOrgFromPendingSignup() wird aufgerufen
   ├─ Erstellt Firebase Auth User
   ├─ Erstellt Organization mit Stripe-Daten
   ├─ Erstellt Team Member (Owner)
   ├─ Initialisiert Usage Tracking
   └─ Updated Stripe Subscription Metadata
5. User loggt sich ein → Organization ist bereits erstellt
```

### ❌ PROBLEM: Default-Domain Setup fehlt!

**Aktuell in `createUserAndOrgFromPendingSignup()`**:
- ✅ Organization erstellt (Zeile 97)
- ✅ Team Member erstellt (Zeile 124)
- ✅ Usage Tracking initialisiert (Zeile 129-136)
- ❌ celeropress.com Domain NICHT erstellt
- ❌ Default Email-Adresse NICHT erstellt

**Was fehlt**:
```typescript
// NACH Zeile 136 sollte eingefügt werden:

// 6. Setup Default Domain & Email
try {
  // 6.1 Erstelle celeropress.com Domain
  await adminDb.collection('email_domains_enhanced').add({
    organizationId: organizationId,
    domain: 'celeropress.com',
    status: 'verified',
    isDefault: true,
    verifiedAt: FieldValue.serverTimestamp(),
    emailsSent: 0,
    canDelete: false,  // System-Domain
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: userId
  });

  // 6.2 Erstelle Default Email-Adresse
  const defaultEmail = `${organizationId.toLowerCase().substring(0, 8)}@celeropress.com`;

  await adminDb.collection('email_addresses').add({
    organizationId: organizationId,
    domainId: null,  // System-Domain hat keinen domainId
    email: defaultEmail,
    localPart: organizationId.toLowerCase().substring(0, 8),
    domain: 'celeropress.com',
    displayName: pendingSignup.companyName,
    isDefault: true,
    isActive: true,
    canDelete: false,  // System-Email
    verified: true,
    status: 'active',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: userId
  });

  console.log(`[Pending Signup] Created default domain and email: ${defaultEmail}`);
} catch (error) {
  console.error('[Pending Signup] Failed to create default domain/email:', error);
  // Nicht kritisch, weitermachen
}
```

**Wichtig**:
- KEINE Domain-Mailbox für celeropress.com erstellen
- NUR für benutzerdefinierte Domains werden Domain-Mailboxen erstellt

---

## Frage 4: Email-Format für Default-Email

### Empfehlung: `{orgId-short}@celeropress.com`

**Optionen analysiert**:

### Option 1: Vollständige Org-ID (NICHT EMPFOHLEN)
```
hJ4gTE9Gm35epoub0zIU@celeropress.com
```
**Nachteile**:
- ❌ Sehr lang (24 Zeichen)
- ❌ Schwer zu merken
- ❌ Unprofessionell

### Option 2: Kurze Org-ID (EMPFOHLEN) ✅
```
hj4gte9g@celeropress.com
```
**Vorteile**:
- ✅ Eindeutig (erste 8 Zeichen)
- ✅ Kurz und handlich
- ✅ Technisch, aber nicht zu lang
- ✅ Lowercase → besser lesbar

**Implementation**:
```typescript
const shortOrgId = organizationId.toLowerCase().substring(0, 8);
const defaultEmail = `${shortOrgId}@celeropress.com`;
```

### Option 3: Org-Prefix (NICHT EMPFOHLEN)
```
org-hj4gte9g@celeropress.com
```
**Nachteile**:
- ❌ "org-" Prefix unnötig
- ❌ Länger

**Finale Empfehlung**: Option 2 verwenden

---

## Zusammenfassung der Probleme

### 1. Projekt-Postfach Format ❌
- **IST**: `{projectId}@inbox.sk-online-marketing.de`
- **SOLL**: `{localPart}-{projectId}@inbox.sk-online-marketing.de`
- **Fix in**: `src/lib/firebase/project-service.ts:68`

### 2. Fehlende Referenzen in Projekt-Postfächern ❌
- **FEHLT**: `emailAddressId`, `domainId`
- **Benötigt für**: Reply-To Parsing, Projekt-Zuordnung
- **Fix in**: `src/lib/firebase/project-service.ts:70-81`

### 3. pr_projects vs projects Collection ❌
- **Problem**: `reply-to-generator-service.ts` sucht in `pr_projects`
- **Realität**: Nur `projects` existiert
- **Fix in**: `src/lib/email/reply-to-generator-service.ts:84`

### 4. Default-Domain Setup fehlt ❌
- **Problem**: Keine celeropress.com Domain/Email bei Organization-Erstellung
- **Fix in**: `src/lib/auth/create-user-from-pending.ts` nach Zeile 136

### 5. Veraltete Email-Services ❌
- **Problem**: Legacy-Code existiert noch
- **Zu löschen**:
  - `src/lib/email/email-service.ts` (Legacy Service)
  - `src/components/pr/email/SenderSelector.tsx` (Deprecated)
  - `src/components/pr/email/Step1Content.tsx` (Deprecated)

---

## Empfohlener Fix-Plan

### Phase 1: Daten-Konsistenz (KRITISCH)

**1.1 Default-Domain Setup hinzufügen**
```
Datei: src/lib/auth/create-user-from-pending.ts
Zeilen: Nach 136
Action: celeropress.com Domain + Default-Email erstellen
Format: {orgId-short}@celeropress.com
```

**1.2 Projekt-Postfach Format korrigieren**
```
Datei: src/lib/firebase/project-service.ts:68
Änderung:
  VON: const inboxAddress = `${docRef.id}@inbox...`.toLowerCase();
  ZU:   const inboxAddress = `${localPart}-${docRef.id}@inbox...`.toLowerCase();

Problem: localPart ist nicht verfügbar in create()
Lösung: Muss von EmailAddress geholt werden (siehe 1.3)
```

**1.3 Fehlende Referenzen hinzufügen**
```
Datei: src/lib/firebase/project-service.ts:70-81
Neue Parameter:
  - emailAddressId: string (von wo?)
  - domainId: string | null (von wo?)

Problem: project-service.create() bekommt diese Daten NICHT!
Lösung: Project-Erstellung muss EmailAddress übergeben bekommen
```

### Phase 2: Service-Vereinheitlichung

**2.1 Collection-Name korrigieren**
```
Datei: src/lib/email/reply-to-generator-service.ts:84
Änderung: pr_projects → projects
```

**2.2 Reply-To Generierung vereinheitlichen**
```
Problem: Zwei verschiedene Services mit unterschiedlichen Formaten
  - emailAddressService.generateReplyToAddress()
  - replyToGeneratorService.generateReplyTo()

Lösung: EIN einheitliches Format verwenden
```

### Phase 3: Cleanup

**3.1 Legacy-Code löschen**
```
Löschen:
  - src/lib/email/email-service.ts
  - src/components/pr/email/SenderSelector.tsx
  - src/components/pr/email/Step1Content.tsx
```

---

## Offene Architektur-Frage ⚠️

### Problem: Projekt-Erstellung ohne Email-Adresse

**Aktueller Flow**:
```
1. User erstellt Projekt (project-service.create())
   → Projekt-Postfach wird automatisch erstellt
   → Aber: Welche EmailAddress soll verwendet werden?
   → EmailAddress-ID ist NICHT verfügbar!
```

**Campaign-Versand Flow**:
```
1. User wählt EmailAddress im Email Composer
2. Campaign wird versendet mit dieser EmailAddress
3. Reply-To wird generiert: {prefix}-{shortOrgId}-{shortEmailId}@inbox...
4. Aber: Projekt-Postfach existiert mit falschem Format!
```

**Zwei mögliche Lösungen**:

### Lösung A: Projekt-Postfach bei Campaign-Versand erstellen ✅
```
- Projekt-Erstellung: KEIN Postfach
- Campaign-Versand: Erstelle Projekt-Postfach wenn nicht existiert
- Vorteil: EmailAddress ist verfügbar
- Nachteil: Postfach erst nach erstem Versand
```

### Lösung B: Default-EmailAddress verwenden
```
- Projekt-Erstellung: Verwende Default-EmailAddress der Org
- Projekt-Postfach: {defaultLocalPart}-{projectId}@inbox...
- Vorteil: Postfach sofort verfügbar
- Nachteil: Kann später nicht geändert werden
```

**Empfehlung**: Lösung A
- Projekt-Postfach wird bei Campaign-Versand erstellt
- `reply-to-generator-service.ts:61-81` macht genau das!
- Aber: Muss auf `projects` Collection umgestellt werden

---

## Nächste Schritte

1. **Entscheidung treffen**: Lösung A oder B für Projekt-Postfach-Erstellung?
2. **Default-Domain Setup implementieren** in `create-user-from-pending.ts`
3. **Migration-Script** für bestehende Organisationen (celeropress.com + Default-Email)
4. **Projekt-Postfach-Logik** anpassen (Format + Referenzen)
5. **Legacy-Code entfernen**
6. **Testen** mit echter Campaign + Antwort

---

**Erstellt**: 2025-11-23
**Nächste Review**: Nach Implementierung
