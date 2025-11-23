# Implementation Plan: Email-System & Postfach-Architektur Fixes

**Datum**: 2025-11-23
**Status**: Ready to Implement
**Ziel**: Vollständige Funktionsfähigkeit des Email-Systems mit korrektem Reply-To Routing

---

## Übersicht

Dieser Plan behebt 5 kritische Probleme im Email-System:

1. ✅ Default-Domain Setup bei Organization-Erstellung
2. ✅ Projekt-Postfach Format korrigieren
3. ✅ Fehlende Referenzen hinzufügen
4. ✅ Collection-Namen korrigieren
5. ✅ Legacy-Code entfernen

**Geschätzte Dauer**: 2-3 Stunden
**Reihenfolge**: Sequenziell (1 → 2 → 3 → 4 → 5)

---

## Phase 1: Default-Domain Setup (KRITISCH)

### 1.1 Code-Änderung: create-user-from-pending.ts

**Datei**: `src/lib/auth/create-user-from-pending.ts`
**Zeile**: Nach 136 (nach Usage Tracking Initialisierung)

**Einfügen**:

```typescript
  // 6. Setup Default Domain & Email Address
  try {
    console.log(`[Pending Signup] Setting up default domain and email...`);

    // 6.1 Erstelle celeropress.com Domain-Eintrag
    const domainRef = await adminDb.collection('email_domains_enhanced').add({
      organizationId: organizationId,
      domain: 'celeropress.com',
      status: 'verified',
      isDefault: true,
      verifiedAt: FieldValue.serverTimestamp(),
      emailsSent: 0,
      canDelete: false,  // System-Domain, kann nicht gelöscht werden
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: userId
    });

    const domainId = domainRef.id;
    console.log(`[Pending Signup] Created default domain: celeropress.com (${domainId})`);

    // 6.2 Erstelle Default Email-Adresse
    const shortOrgId = organizationId.toLowerCase().substring(0, 8);
    const defaultEmail = `${shortOrgId}@celeropress.com`;

    await adminDb.collection('email_addresses').add({
      organizationId: organizationId,
      domainId: domainId,
      email: defaultEmail,
      localPart: shortOrgId,
      domain: 'celeropress.com',
      displayName: pendingSignup.companyName,
      isDefault: true,
      isActive: true,
      canDelete: false,  // System-Email, kann nicht gelöscht werden
      verified: true,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: userId
    });

    console.log(`[Pending Signup] Created default email: ${defaultEmail}`);

    // WICHTIG: KEINE Domain-Mailbox für celeropress.com erstellen!
    // Domain-Mailboxes nur für benutzerdefinierte Domains

  } catch (error) {
    console.error('[Pending Signup] Failed to create default domain/email:', error);
    // Nicht kritisch werfen - User kann später manuell anlegen
  }
```

**Wichtig**:
- ✅ celeropress.com Domain mit `isDefault: true`
- ✅ Email-Format: `{orgId-short}@celeropress.com`
- ✅ `canDelete: false` für beide
- ❌ KEINE Domain-Mailbox erstellen

### 1.2 Migration-Script: Bestehende Organisationen

**Datei**: `scripts/setup-default-domains.ts`

```typescript
// scripts/setup-default-domains.ts
// Erstellt celeropress.com Domain + Default-Email für alle bestehenden Organisationen

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function setupDefaultDomains() {
  console.log('\n🚀 Setup Default Domains for existing Organizations\n');

  // 1. Lade alle Organisationen
  const orgsSnapshot = await db.collection('organizations').get();
  console.log(`📊 Gefunden: ${orgsSnapshot.size} Organisationen\n`);

  let processed = 0;
  let skipped = 0;
  let created = 0;

  for (const orgDoc of orgsSnapshot.docs) {
    const org = orgDoc.data();
    const orgId = orgDoc.id;
    const orgName = org.name || 'Unbekannt';

    console.log(`\n📁 Organisation: ${orgName} (${orgId})`);

    // 2. Prüfe ob celeropress.com Domain bereits existiert
    const existingDomainSnapshot = await db.collection('email_domains_enhanced')
      .where('organizationId', '==', orgId)
      .where('domain', '==', 'celeropress.com')
      .limit(1)
      .get();

    if (!existingDomainSnapshot.empty) {
      console.log('   ⏭️  Domain existiert bereits - übersprungen');
      skipped++;
      processed++;
      continue;
    }

    // 3. Erstelle celeropress.com Domain
    const domainRef = await db.collection('email_domains_enhanced').add({
      organizationId: orgId,
      domain: 'celeropress.com',
      status: 'verified',
      isDefault: true,
      verifiedAt: FieldValue.serverTimestamp(),
      emailsSent: 0,
      canDelete: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: org.adminEmail || 'system'
    });

    console.log(`   ✅ Domain erstellt: ${domainRef.id}`);

    // 4. Prüfe ob Default-Email bereits existiert
    const existingEmailSnapshot = await db.collection('email_addresses')
      .where('organizationId', '==', orgId)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (!existingEmailSnapshot.empty) {
      console.log('   ⏭️  Default-Email existiert bereits - übersprungen');
      created++;
      processed++;
      continue;
    }

    // 5. Erstelle Default Email-Adresse
    const shortOrgId = orgId.toLowerCase().substring(0, 8);
    const defaultEmail = `${shortOrgId}@celeropress.com`;

    await db.collection('email_addresses').add({
      organizationId: orgId,
      domainId: domainRef.id,
      email: defaultEmail,
      localPart: shortOrgId,
      domain: 'celeropress.com',
      displayName: orgName,
      isDefault: true,
      isActive: true,
      canDelete: false,
      verified: true,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: org.adminEmail || 'system'
    });

    console.log(`   ✅ Email erstellt: ${defaultEmail}`);
    created++;
    processed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Zusammenfassung:`);
  console.log(`   Verarbeitet: ${processed}`);
  console.log(`   Neu erstellt: ${created}`);
  console.log(`   Übersprungen: ${skipped}`);
  console.log('\n✅ Migration abgeschlossen!\n');
}

setupDefaultDomains().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});
```

**Ausführen**:
```bash
npx tsx scripts/setup-default-domains.ts
```

---

## Phase 2: Projekt-Postfach Format korrigieren

### 2.1 Strategie-Entscheidung

**Problem**: Projekt-Postfächer benötigen `emailAddressId`, aber:
- Bei Projekt-Erstellung ist keine EmailAddress ausgewählt
- EmailAddress wird erst im Email Composer gewählt

**Lösung**: Projekt-Postfach bei Campaign-Versand erstellen ✅

**Vorteile**:
- ✅ EmailAddress ist verfügbar
- ✅ Korrektes Format möglich
- ✅ Alle Referenzen vorhanden
- ✅ `reply-to-generator-service.ts` macht das bereits!

**Änderung**:
1. Projekt-Erstellung: KEIN Postfach erstellen
2. Campaign-Versand: Postfach bei Bedarf erstellen

### 2.2 Code-Änderung: project-service.ts

**Datei**: `src/lib/firebase/project-service.ts`
**Zeilen**: 66-86

**ENTFERNEN**:
```typescript
// Automatische Projekt-Postfach-Erstellung
try {
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

} catch (mailboxError) {
  console.error('[ProjectService] Error creating project mailbox:', mailboxError);
  // Fehler nicht werfen - Projekt wurde trotzdem erstellt
}
```

**Ersetzen durch**:
```typescript
// Projekt-Postfach wird später bei Campaign-Versand erstellt
// (wenn EmailAddress bekannt ist)
console.log('[ProjectService] Project created, mailbox will be created on first campaign send');
```

**Begründung**:
- Projekt-Postfach benötigt EmailAddress
- EmailAddress wird erst im Email Composer gewählt
- `reply-to-generator-service.ts:57-122` erstellt Postfach automatisch

### 2.3 Code-Änderung: reply-to-generator-service.ts

**Datei**: `src/lib/email/reply-to-generator-service.ts`
**Zeile**: 84

**VON**:
```typescript
const projectDoc = await adminDb.collection('pr_projects').doc(projectId).get();
```

**ZU**:
```typescript
const projectDoc = await adminDb.collection('projects').doc(projectId).get();
```

**Zeile**: 92-111

**ERWEITERN** (fehlende Felder hinzufügen):
```typescript
// Erstelle Projekt-Postfach
const mailboxData = {
  projectId,
  domainId: project?.domainId || null,  // ✅ Bereits vorhanden
  emailAddressId: emailAddress.id,       // ❌ NEU HINZUFÜGEN
  organizationId: project?.organizationId,
  userId: project?.userId,
  projectName: project?.title || 'Unbekanntes Projekt',
  inboxAddress,
  status: 'active',
  unreadCount: 0,
  threadCount: 0,
  campaignCount: 1,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  createdBy: project?.userId,
  updatedBy: project?.userId
};
```

**Wichtig**: `emailAddress.id` ist verfügbar, weil `emailAddress` als Parameter übergeben wird!

### 2.4 Migration-Script: Bestehende Projekt-Postfächer löschen

**Datei**: `scripts/cleanup-project-mailboxes.ts`

```typescript
// scripts/cleanup-project-mailboxes.ts
// Löscht alle bestehenden Projekt-Postfächer (werden bei Campaign-Versand neu erstellt)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function cleanupProjectMailboxes() {
  console.log('\n🗑️  Cleanup: Lösche bestehende Projekt-Postfächer\n');
  console.log('⚠️  Diese werden beim nächsten Campaign-Versand neu erstellt!\n');

  const mailboxesSnapshot = await db.collection('inbox_project_mailboxes').get();
  console.log(`📊 Gefunden: ${mailboxesSnapshot.size} Projekt-Postfächer\n`);

  if (mailboxesSnapshot.size === 0) {
    console.log('✅ Keine Postfächer zum Löschen\n');
    return;
  }

  let deleted = 0;

  for (const doc of mailboxesSnapshot.docs) {
    const mb = doc.data();
    console.log(`🗑️  Lösche: ${mb.inboxAddress} (Projekt: ${mb.projectId})`);
    await doc.ref.delete();
    deleted++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✅ ${deleted} Postfächer gelöscht\n`);
  console.log('💡 Beim nächsten Campaign-Versand werden sie mit korrektem Format neu erstellt\n');
}

cleanupProjectMailboxes().then(() => process.exit(0)).catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});
```

**Ausführen**:
```bash
npx tsx scripts/cleanup-project-mailboxes.ts
```

**Wichtig**:
- Diese Aktion ist SAFE - Postfächer werden automatisch neu erstellt
- Keine Daten gehen verloren (Emails sind in `email_threads` + `email_messages`)

---

## Phase 3: Campaign-Versand anpassen

### 3.1 Code-Änderung: send-pr-campaign/route.ts

**Datei**: `src/app/api/sendgrid/send-pr-campaign/route.ts`

**Nach Zeile 105** (nachdem EmailAddress geladen wurde):

**HINZUFÜGEN**:
```typescript
// NEU: Stelle sicher dass Projekt-Postfach existiert
if (data.projectId) {
  try {
    const { replyToGeneratorService } = await import('@/lib/email/reply-to-generator-service');

    // generateReplyTo() erstellt automatisch Projekt-Postfach wenn nicht existiert
    const replyTo = await replyToGeneratorService.generateReplyTo(
      data.projectId,
      emailAddress,
      true  // useSystemInbox = true
    );

    console.log('📬 Project mailbox ensured, Reply-To:', replyTo);
  } catch (error) {
    console.error('⚠️ Failed to ensure project mailbox:', error);
    // Nicht kritisch - Campaign kann trotzdem versendet werden
  }
}
```

**Wichtig**: Dies stellt sicher, dass:
1. Projekt-Postfach mit korrektem Format erstellt wird
2. EmailAddressId gesetzt wird
3. DomainId gesetzt wird
4. Reply-To korrekt generiert wird

---

## Phase 4: Legacy-Code entfernen

### 4.1 Dateien löschen

**Löschen**:
```bash
rm src/lib/email/email-service.ts
rm src/components/pr/email/SenderSelector.tsx
rm src/components/pr/email/Step1Content.tsx
```

**Begründung**:
- `email-service.ts`: Markiert als "Legacy Service"
- `SenderSelector.tsx`: Markiert als "Deprecated"
- `Step1Content.tsx`: Markiert als "Deprecated"
- Werden nicht mehr verwendet

### 4.2 Import-Bereinigung

**Suchen und entfernen**:
```bash
# Suche nach Importen der gelöschten Dateien
grep -r "email-service" src/
grep -r "SenderSelector" src/
grep -r "Step1Content" src/
```

**Falls gefunden**: Imports entfernen und durch Campaign Email System ersetzen

---

## Phase 5: Testing & Validation

### 5.1 Test-Checkliste

**Nach jeder Phase testen**:

#### Phase 1: Default-Domain Setup
```bash
# 1. Migration ausführen
npx tsx scripts/setup-default-domains.ts

# 2. Prüfen
npx tsx scripts/check-email-addresses.ts <orgId>

# Erwartung:
# ✅ celeropress.com Domain vorhanden (isDefault: true)
# ✅ {orgId-short}@celeropress.com Email vorhanden (isDefault: true)
# ❌ KEINE Domain-Mailbox für celeropress.com
```

#### Phase 2: Projekt-Postfach Format
```bash
# 1. Cleanup ausführen
npx tsx scripts/cleanup-project-mailboxes.ts

# 2. Prüfen
npx tsx scripts/analyze-project-mailboxes.ts <orgId>

# Erwartung:
# ✅ Keine Projekt-Postfächer vorhanden
```

#### Phase 3: Campaign-Versand
```bash
# 1. Neue Kampagne erstellen
# 2. Email senden
# 3. Prüfen

npx tsx scripts/analyze-project-mailboxes.ts <orgId>

# Erwartung:
# ✅ Projekt-Postfach erstellt mit Format: {localPart}-{projectId}@inbox...
# ✅ emailAddressId gesetzt
# ✅ domainId gesetzt
```

#### Phase 4: Legacy-Code
```bash
# 1. Build ausführen
npm run build

# Erwartung:
# ✅ Keine Fehler
# ✅ Keine Warnungen zu fehlenden Importen
```

### 5.2 End-to-End Test

**Kompletter Workflow**:

```
1. Neue Organisation erstellen (via Stripe)
   → celeropress.com Domain vorhanden
   → Default-Email vorhanden

2. Neues Projekt erstellen
   → KEIN Projekt-Postfach erstellt

3. Kampagne in Projekt erstellen
   → Campaign-Daten angelegt

4. Email Composer öffnen
   → Default-Email auswählbar
   → Empfänger hinzufügen

5. Email versenden
   → Projekt-Postfach automatisch erstellt
   → Reply-To korrekt generiert
   → Email erfolgreich versendet

6. Empfänger antwortet
   → Email kommt an Reply-To Adresse
   → Inbound Parser verarbeitet
   → Email landet in korrektem Projekt-Postfach
   → Thread wird korrekt zugeordnet

7. In Inbox prüfen
   → Projekt-Postfach in Sidebar sichtbar
   → Antwort-Email sichtbar
   → Thread korrekt dargestellt
```

### 5.3 Validation-Script

**Datei**: `scripts/validate-email-system.ts`

```typescript
// scripts/validate-email-system.ts
// Validiert das Email-System Setup für eine Organisation

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function validateEmailSystem(orgId: string) {
  console.log(`\n🔍 Validiere Email-System für Organization: ${orgId}\n`);

  let errors = 0;
  let warnings = 0;

  // 1. Prüfe celeropress.com Domain
  console.log('1️⃣ Prüfe Default-Domain...');
  const domainSnapshot = await db.collection('email_domains_enhanced')
    .where('organizationId', '==', orgId)
    .where('domain', '==', 'celeropress.com')
    .where('isDefault', '==', true)
    .limit(1)
    .get();

  if (domainSnapshot.empty) {
    console.log('   ❌ celeropress.com Domain FEHLT!');
    errors++;
  } else {
    const domain = domainSnapshot.docs[0].data();
    console.log(`   ✅ celeropress.com Domain vorhanden (${domainSnapshot.docs[0].id})`);

    if (domain.status !== 'verified') {
      console.log('   ⚠️  Domain nicht verifiziert!');
      warnings++;
    }
  }

  // 2. Prüfe Default-Email
  console.log('\n2️⃣ Prüfe Default-Email...');
  const emailSnapshot = await db.collection('email_addresses')
    .where('organizationId', '==', orgId)
    .where('isDefault', '==', true)
    .limit(1)
    .get();

  if (emailSnapshot.empty) {
    console.log('   ❌ Default-Email FEHLT!');
    errors++;
  } else {
    const email = emailSnapshot.docs[0].data();
    console.log(`   ✅ Default-Email vorhanden: ${email.email}`);

    if (email.domain !== 'celeropress.com') {
      console.log(`   ⚠️  Default-Email nicht auf celeropress.com: ${email.domain}`);
      warnings++;
    }

    if (!email.isActive) {
      console.log('   ⚠️  Default-Email nicht aktiv!');
      warnings++;
    }
  }

  // 3. Prüfe Domain-Mailbox (sollte NICHT existieren)
  console.log('\n3️⃣ Prüfe Domain-Mailbox für celeropress.com...');
  const domainMailboxSnapshot = await db.collection('inbox_domain_mailboxes')
    .where('organizationId', '==', orgId)
    .where('domain', '==', 'celeropress.com')
    .limit(1)
    .get();

  if (!domainMailboxSnapshot.empty) {
    console.log('   ⚠️  Domain-Mailbox für celeropress.com existiert (sollte NICHT sein)');
    warnings++;
  } else {
    console.log('   ✅ Keine Domain-Mailbox für celeropress.com (korrekt)');
  }

  // 4. Prüfe Projekt-Postfächer Format
  console.log('\n4️⃣ Prüfe Projekt-Postfächer...');
  const projectMailboxes = await db.collection('inbox_project_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`   📊 ${projectMailboxes.size} Projekt-Postfächer gefunden`);

  projectMailboxes.forEach(doc => {
    const mb = doc.data();
    const address = mb.inboxAddress;

    // Prüfe Format: muss {etwas}-{projectId}@inbox... sein
    const parts = address.split('@')[0].split('-');

    if (parts.length < 2) {
      console.log(`   ❌ Falsches Format: ${address}`);
      errors++;
    } else {
      console.log(`   ✅ Korrektes Format: ${address}`);
    }

    // Prüfe Referenzen
    if (!mb.emailAddressId) {
      console.log(`   ⚠️  emailAddressId fehlt: ${address}`);
      warnings++;
    }
  });

  // Zusammenfassung
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validierungs-Ergebnis:\n');

  if (errors === 0 && warnings === 0) {
    console.log('✅ PERFEKT! Email-System korrekt konfiguriert\n');
  } else {
    console.log(`❌ Fehler: ${errors}`);
    console.log(`⚠️  Warnungen: ${warnings}\n`);
  }
}

const orgId = process.argv[2];
if (!orgId) {
  console.log('Usage: npx tsx scripts/validate-email-system.ts <orgId>');
  process.exit(1);
}

validateEmailSystem(orgId).then(() => process.exit(0));
```

---

## Zusammenfassung

### Änderungen pro Datei

| Datei | Aktion | Zeilen |
|-------|--------|--------|
| `src/lib/auth/create-user-from-pending.ts` | Hinzufügen | ~50 |
| `src/lib/firebase/project-service.ts` | Entfernen | ~20 |
| `src/lib/email/reply-to-generator-service.ts` | Ändern | 2 |
| `src/app/api/sendgrid/send-pr-campaign/route.ts` | Hinzufügen | ~15 |
| `src/lib/email/email-service.ts` | Löschen | - |
| `src/components/pr/email/SenderSelector.tsx` | Löschen | - |
| `src/components/pr/email/Step1Content.tsx` | Löschen | - |

### Scripts erstellen

| Script | Zweck |
|--------|-------|
| `scripts/setup-default-domains.ts` | Migration: Default-Domain Setup |
| `scripts/cleanup-project-mailboxes.ts` | Migration: Alte Postfächer löschen |
| `scripts/validate-email-system.ts` | Testing: System validieren |

### Ausführungs-Reihenfolge

```bash
# 1. Code-Änderungen durchführen (Phases 1-4)

# 2. Migrations-Scripts ausführen
npx tsx scripts/setup-default-domains.ts
npx tsx scripts/cleanup-project-mailboxes.ts

# 3. Build testen
npm run build

# 4. Validieren
npx tsx scripts/validate-email-system.ts <orgId>

# 5. End-to-End Test
# → Neue Kampagne erstellen und versenden
```

---

**Erstellt**: 2025-11-23
**Status**: Ready to Implement
**Geschätzte Dauer**: 2-3 Stunden

Nach erfolgreicher Implementierung:
- ✅ Default-Domain automatisch bei Signup
- ✅ Projekt-Postfächer mit korrektem Format
- ✅ Reply-To Routing funktioniert
- ✅ Keine Legacy-Code-Reste
- ✅ System vollständig getestet
