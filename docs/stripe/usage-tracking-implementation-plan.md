# Real Usage Tracking Implementation Plan

**Status:** ⚡ IN PROGRESS - Phase 2 teilweise abgeschlossen
**Erstellt:** 2025-01-28
**Letztes Update:** 2025-10-28
**Ziel:** Mock-Daten durch echte Usage-Tracking-Daten ersetzen

---

## 🚀 STATUS UPDATE - 2025-10-28

### ✅ HEUTE IMPLEMENTIERT (Phase 2)

#### 1. **Contacts Usage Tracking** ✅ KOMPLETT
**Implementierung:**
- `syncContactsUsage()` in `usage-tracker.ts` (Zeile 125-193)
- Zählt Regular Contacts + Valid Journalist References
- Validiert References wie CRM-Page (beide Docs müssen existieren)
- Auto-Sync bei Billing Page Load (non-blocking)
- Manueller Sync über `/api/admin/sync-usage`

**Limit-Checks implementiert:**
- ✅ Einzelner Kontakt (`/api/v1/contacts` POST) - Zeile 82
- ✅ Bulk-Import (`/api/v1/contacts` POST Array) - Zeile 54
- ✅ Journalist Reference Import (`useEditorsData.ts`) - Zeile 54-74

**Verified:**
```
[Usage] Synced contacts for org abc123: 5 total (3 regular + 2 valid references)
```

#### 2. **Storage Usage Tracking** ✅ KOMPLETT
**Implementierung:**
- `syncStorageUsage()` in `usage-tracker.ts` (Zeile 296-332)
- Listet Files direkt aus Firebase Storage Bucket
- Path: `organizations/{organizationId}/`
- Source of Truth - was wirklich in Storage existiert
- Auto-Sync bei Billing Page Load (non-blocking)

**Admin Storage SDK:**
- `adminStorage` Export in `admin-init.ts` hinzugefügt
- `storageBucket` Parameter in Initialisierung

**Verified:**
```
[Usage] Synced storage for org abc123: 73064954 bytes (86 files)
→ 0.07 GB korrekt angezeigt auf Billing-Page ✅
```

**Vorteile dieser Methode:**
- ✅ Self-Healing (gelöschte Files zählen nicht)
- ✅ 100% akkurat (kein out-of-sync)
- ✅ Einfach (ein API-Call)
- ✅ Kein manuelles Tracking bei Upload/Delete nötig

#### 3. **Team Members Tracking** ✅ BEREITS VORHANDEN
- Bereits implementiert in vorheriger Session
- Auto-Sync bei Billing Page Load
- Zählt active team_members

**Auto-Sync beim Page-Load:**
```typescript
// /api/subscription/organization/route.ts (Zeile 44-52)
syncContactsUsage(auth.organizationId).catch(err => {
  console.error('Background contacts sync error:', err);
});

syncStorageUsage(auth.organizationId).catch(err => {
  console.error('Background storage sync error:', err);
});
```

### ⏳ NOCH NICHT IMPLEMENTIERT

#### Storage Limit-Checks beim Upload ❌
**Problem:** Storage wird getrackt, aber keine Limits beim Upload geprüft

**Upload-Stellen identifiziert (ca. 6-8 Stellen):**
1. Media Library Uploads (`media-assets-service.ts`)
2. PDF Template Uploads (`pdf-template-service.ts`)
3. Campaign Key Visual Uploads (`KeyVisualSection.tsx`)
4. Profile Picture Uploads (`profile-image-service.ts`)
5. Campaign Media Service (`campaign-media-service.ts`)
6. Weitere Upload-Komponenten

**Nötig:**
- Vor jedem Upload: Limit-Check gegen `usage.storageUsed + file.size > usage.storageLimit`
- Error Message: "Speicher-Limit erreicht (X GB / Y GB)"
- Client-seitige Pre-Checks (bessere UX)

#### Emails Tracking ❌
**Was fehlt:**
- `incrementEmailUsage()` Aufrufe in Email-Send-APIs
- Zählung von Empfängern (to, cc, bcc)
- Limit-Checks vor dem Senden

**APIs zu instrumentieren:**
- `/api/email/send/route.ts` (benötigt Auth)
- `/api/sendgrid/send-pr-campaign/route.ts` (hat Auth)
- `/api/email/send-approval/route.ts` (hat Auth)

#### AI Words Tracking ❌
**Was fehlt:**
- `incrementAIWordsUsage()` Aufrufe in Genkit-APIs
- Word-Counting nach Generation
- Limit-Checks vor der Generierung

**9 AI APIs zu instrumentieren:**
- `/api/ai/generate/route.ts` (benötigt Auth)
- `/api/ai/generate-structured/route.ts` (benötigt Auth)
- `/api/ai/generate-headlines/route.ts` (benötigt Auth)
- `/api/ai/email-response/route.ts` (benötigt Auth)
- `/api/ai/email-insights/route.ts` (benötigt Auth)
- `/api/ai/text-transform/route.ts` (benötigt Auth)
- `/api/ai/merge-variants/route.ts` (benötigt Auth)
- `/api/ai/analyze-keyword-seo/route.ts` (benötigt Auth)
- `/api/ai/custom-instruction/route.ts` (benötigt Auth)

---

## 📁 IMPLEMENTIERTE DATEIEN

### Core Services
- `src/lib/firebase/admin-init.ts` - adminStorage Export
- `src/lib/usage/usage-tracker.ts` - syncContactsUsage, syncStorageUsage

### API Routes
- `src/app/api/subscription/organization/route.ts` - Auto-Sync Background
- `src/app/api/admin/sync-usage/route.ts` - Manueller Sync Button
- `src/app/api/usage/check-contacts-limit/route.ts` - Client-seitiger Limit-Check
- `src/app/api/v1/contacts/route.ts` - Limit-Checks vor Create

### Hooks
- `src/lib/hooks/useEditorsData.ts` - Journalist Reference Limit-Check

### Debug Tools
- `scripts/check-storage-usage.ts` - Storage Usage Analyse-Script

---

## 🎯 NÄCHSTE SCHRITTE (FÜR MORGEN)

### Priority 1: Storage Limit-Checks (2-3h)
1. Alle Upload-Stellen finden (Grep nach `uploadBytes`, `uploadBytesResumable`)
2. Pre-Upload Limit-Check implementieren:
   ```typescript
   // Check storage limit
   const usage = await getUsage(organizationId);
   const newTotal = usage.storageUsed + file.size;

   if (usage.storageLimit !== -1 && newTotal > usage.storageLimit) {
     throw new Error('Storage limit exceeded');
   }
   ```
3. Client-seitige Pre-Checks (verhindert Upload-Start)
4. Error Messages + Upgrade-CTA

**Geschätzte Upload-Stellen:**
- `useUploadMediaAsset` Hook (Media Library)
- `uploadCampaignHeroImage` (Campaign Media)
- `uploadTemplate` (PDF Templates)
- `uploadProfileImage` (Profile Pictures)
- Direct `uploadBytes` calls in Components

### Priority 2: Emails Tracking (3-4h)
1. Email-Send-APIs mit Auth ausstatten
2. `incrementEmailUsage(orgId, recipientCount)` aufrufen
3. Limit-Checks vor dem Senden
4. Frontend: Token mitschicken

### Priority 3: AI Words Tracking (4-5h)
1. Word-Counter Utility erstellen
2. Alle 9 AI-APIs mit Auth ausstatten
3. `incrementAIWordsUsage(orgId, wordCount)` aufrufen
4. Limit-Checks vor der Generierung
5. Frontend: Token mitschicken

---

## 📊 METRIKEN STATUS

| Metrik | Tracking | Limit-Check | Auto-Sync | Status |
|--------|----------|-------------|-----------|--------|
| **Contacts** | ✅ | ✅ (3 Stellen) | ✅ | FERTIG |
| **Storage** | ✅ | ❌ (0 Stellen) | ✅ | HALB FERTIG |
| **Team Members** | ✅ | ✅ | ✅ | FERTIG |
| **Emails** | ⏳ | ❌ | - | OFFEN |
| **AI Words** | ⏳ | ❌ | - | OFFEN |

---

## 🔍 VERIFIKATION

### Storage Usage Check
```bash
# Script ausführen für detaillierte Analyse
npx tsx scripts/check-storage-usage.ts YOUR_ORG_ID

# Output zeigt:
# - Files nach Ordner gruppiert
# - Top 5 größte Files
# - Total: Bytes, KB, MB, GB
# - Vergleich: Storage vs Firestore
```

### Vercel Logs Check
```
1. Billing-Page öffnen
2. "Usage aktualisieren" klicken (3-Punkte-Menü)
3. Vercel Logs öffnen
4. Suche nach:
   - [Usage] Synced contacts
   - [Usage] Synced storage
   - Team members sync
```

**Beispiel Logs von heute:**
```
[Usage] Synced contacts for org kqU...: 5 total (3 regular + 2 valid references)
[Usage] Synced storage for org kqU...: 73064954 bytes (86 files)
```

---

## ⚠️ OFFENE FRAGEN (für morgen klären)

1. **Storage Uploads:** Welche Upload-Methode wird bevorzugt?
   - Option A: Zentrale Upload-API (empfohlen, ermöglicht Limit-Check)
   - Option B: Client SDK + Post-Upload Sync (komplexer)

2. **Grace Period:** Sofort blocken bei Limit oder 24h Grace Period?

3. **Promo/Beta Accounts:** Sollen diese getrackt werden? (Aktuell: unlimited)

4. **Overage:** Über Limit hinaus gegen Extra-Kosten erlauben?

---

## Übersicht

Aktuell zeigt die Billing-Page Mock-Daten für Usage-Metriken. Dieses Dokument beschreibt den Plan zur Implementierung von Real-Time Usage Tracking für:

- **Emails** (SendGrid)
- **Kontakte** (CRM)
- **AI-Wörter** (Genkit Flows)
- **Storage** (Firebase Storage)
- **Team Members** (Active Users)

---

## 1. Aktueller Stand

### ✅ Bereits implementiert (Phase 0)

**Dateien:**
- `src/lib/usage/usage-tracker.ts` (252 Zeilen) - Core Service
- `src/app/api/subscription/organization/route.ts` - Liest Real-Data
- `src/app/api/stripe/webhooks/route.ts` - Initialisiert Usage bei neuen Subscriptions

**Funktionen verfügbar:**
```typescript
// Usage Tracker Service
initializeUsageTracking(organizationId, tier)
getUsage(organizationId)
incrementEmailUsage(organizationId, count)
updateContactsUsage(organizationId, delta)
incrementAIWordsUsage(organizationId, wordCount)
updateStorageUsage(organizationId, bytesUsed)
updateTeamMembersUsage(organizationId, activeCount)
updateUsageLimits(organizationId, newTier)
resetMonthlyUsage(organizationId)
checkUsageLimits(organizationId)
```

**Firestore Structure:**
```
organizations/{orgId}/
  └── usage/
      └── current/
          ├── emailsSent: number
          ├── emailsLimit: number
          ├── contactsTotal: number
          ├── contactsLimit: number
          ├── aiWordsUsed: number
          ├── aiWordsLimit: number
          ├── storageUsed: number (bytes)
          ├── storageLimit: number (bytes)
          ├── teamMembersActive: number
          ├── teamMembersLimit: number
          ├── tier: string
          └── lastUpdated: timestamp
```

---

## 2. Problem-Analyse

### 🚨 Hauptproblem: Fehlende Authentication in APIs

**APIs OHNE `withAuth` Middleware:**

#### Email APIs
- ❌ `/api/email/send/route.ts` - Kein Auth, kein organizationId
- ✅ `/api/sendgrid/send-pr-campaign/route.ts` - Hat Auth
- ✅ `/api/email/send-approval/route.ts` - Hat Auth

#### AI APIs (Genkit)
- ❌ `/api/ai/generate/route.ts` - Kein Auth
- ❌ `/api/ai/generate-structured/route.ts` - Kein Auth
- ❌ `/api/ai/generate-headlines/route.ts` - Kein Auth
- ❌ `/api/ai/email-response/route.ts` - Kein Auth
- ❌ `/api/ai/email-insights/route.ts` - Kein Auth
- ❌ `/api/ai/text-transform/route.ts` - Kein Auth
- ❌ `/api/ai/merge-variants/route.ts` - Kein Auth
- ❌ `/api/ai/analyze-keyword-seo/route.ts` - Kein Auth
- ❌ `/api/ai/custom-instruction/route.ts` - Kein Auth

#### CRM APIs
- ✅ `/api/v1/contacts/route.ts` - Hat Auth (APIMiddleware.withAuth)
- ✅ `/api/v1/companies/route.ts` - Hat Auth

#### Storage APIs
- Keine expliziten Upload-APIs gefunden
- Upload läuft vermutlich direkt über Firebase Client SDK

**Warum ist das ein Problem?**
- Ohne `organizationId` können wir nicht tracken WER die Ressource verwendet
- Usage kann nicht zum richtigen Account zugeordnet werden
- Limit-Checks nicht möglich

---

## 3. Lösungsansätze

### Option A: Auth zu allen APIs hinzufügen ⭐ EMPFOHLEN

**Vorteile:**
- Sauber und konsistent
- Ermöglicht Limit-Checks VOR der Aktion
- Sicherheit: Nur authentifizierte User können APIs nutzen

**Nachteile:**
- Breaking Change für Frontend (muss Token mitschicken)
- Mehr Arbeit (13+ API Routes anpassen)

**Implementation:**
```typescript
// VORHER
export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  const result = await generatePressReleaseFlow({ prompt });
  return NextResponse.json(result);
}

// NACHHER
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    const { prompt } = await req.json();

    // Optional: Limit-Check VORHER
    const limits = await checkUsageLimits(auth.organizationId);
    if (!limits.withinLimits && limits.exceededLimits.includes('aiWords')) {
      return NextResponse.json({ error: 'AI Words limit exceeded' }, { status: 429 });
    }

    // Generate
    const result = await generatePressReleaseFlow({ prompt });

    // Track Usage
    const wordCount = result.generatedText.split(/\s+/).length;
    await incrementAIWordsUsage(auth.organizationId, wordCount);

    return NextResponse.json(result);
  });
}
```

### Option B: organizationId aus Request Body lesen ❌ NICHT EMPFOHLEN

**Vorteile:**
- Kein Breaking Change

**Nachteile:**
- Unsicher (User kann fremde organizationId angeben)
- Keine echte Auth
- Limit-Checks nutzlos (User kann es umgehen)

### Option C: Hybrid-Ansatz (Optional Auth) 🤔 KOMPLEX

**Vorteile:**
- Kein Breaking Change
- Optional bessere Security

**Nachteile:**
- Komplex zu implementieren
- Schwer zu testen
- Verwirrendes API-Design

---

## 4. Implementation Plan (Option A)

### Phase 1: Email Usage Tracking

**Ziel:** Jede gesendete Email tracken

#### 1.1 Email Send API mit Auth ausstatten

**Datei:** `src/app/api/email/send/route.ts`

**Änderungen:**
```typescript
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { incrementEmailUsage, checkUsageLimits } from '@/lib/usage/usage-tracker';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    const body = await req.json();
    const { to, cc, bcc } = body;

    // Berechne Anzahl Empfänger
    const recipientCount = (to?.length || 0) + (cc?.length || 0) + (bcc?.length || 0);

    // Limit-Check
    const limits = await checkUsageLimits(auth.organizationId);
    if (!limits.withinLimits && limits.exceededLimits.includes('emails')) {
      return NextResponse.json(
        { error: 'Email limit exceeded. Please upgrade your plan.' },
        { status: 429 }
      );
    }

    // Send email (existing logic)
    const [response] = await sgMail.send(msg);

    // Track usage
    await incrementEmailUsage(auth.organizationId, recipientCount);

    return NextResponse.json({
      success: true,
      messageId,
      sendGridMessageId: response.headers['x-message-id']
    });
  });
}
```

#### 1.2 Frontend anpassen

**Dateien:** Alle Komponenten die `/api/email/send` aufrufen

**Änderungen:**
```typescript
// VORHER
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to, subject, htmlContent })
});

// NACHHER
import { auth } from '@/lib/firebase/client-init';

const token = await auth.currentUser?.getIdToken();
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ to, subject, htmlContent })
});

if (response.status === 429) {
  toast.error('Email-Limit erreicht. Bitte Plan upgraden.');
}
```

**Betroffene Komponenten (schätzen):**
- Email Composer
- Campaign Send
- Approval Email Send

---

### Phase 2: AI Words Usage Tracking

**Ziel:** Alle AI-Generierungen tracken

#### 2.1 Alle AI API Routes mit Auth ausstatten

**Dateien:**
- `src/app/api/ai/generate/route.ts`
- `src/app/api/ai/generate-structured/route.ts`
- `src/app/api/ai/generate-headlines/route.ts`
- `src/app/api/ai/email-response/route.ts`
- `src/app/api/ai/email-insights/route.ts`
- `src/app/api/ai/text-transform/route.ts`
- `src/app/api/ai/merge-variants/route.ts`
- `src/app/api/ai/analyze-keyword-seo/route.ts`
- `src/app/api/ai/custom-instruction/route.ts`

**Standard-Pattern:**
```typescript
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { incrementAIWordsUsage, checkUsageLimits } from '@/lib/usage/usage-tracker';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    const data = await req.json();

    // Limit-Check (optional, nur für unlimited !== true)
    const limits = await checkUsageLimits(auth.organizationId);
    if (!limits.withinLimits && limits.exceededLimits.includes('aiWords')) {
      return NextResponse.json(
        { error: 'AI Words limit exceeded. Please upgrade your plan.' },
        { status: 429 }
      );
    }

    // Generate (existing Genkit Flow)
    const result = await someGenkitFlow(data);

    // Count words
    const wordCount = result.generatedText.split(/\s+/).filter(w => w.length > 0).length;

    // Track usage
    await incrementAIWordsUsage(auth.organizationId, wordCount);

    return NextResponse.json(result);
  });
}
```

#### 2.2 Word Counting Utility

**Datei:** `src/lib/usage/word-counter.ts` (NEU)

```typescript
/**
 * Count words in text
 * Filters empty strings and counts only valid words
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;

  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Count words in structured output
 * Handles objects with multiple text fields
 */
export function countWordsInStructured(data: any): number {
  if (typeof data === 'string') {
    return countWords(data);
  }

  if (typeof data === 'object' && data !== null) {
    let total = 0;

    for (const value of Object.values(data)) {
      if (typeof value === 'string') {
        total += countWords(value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          total += countWordsInStructured(item);
        });
      } else if (typeof value === 'object') {
        total += countWordsInStructured(value);
      }
    }

    return total;
  }

  return 0;
}
```

#### 2.3 Frontend anpassen

**Alle AI-nutzenden Komponenten müssen Token mitschicken:**
- PR Assistent
- Headline Generator
- Email Response
- Text Transform
- SEO Analyzer
- etc.

**Standard-Pattern:**
```typescript
const token = await auth.currentUser?.getIdToken();
const response = await fetch('/api/ai/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ prompt, context })
});

if (response.status === 429) {
  const error = await response.json();
  toast.error(error.error || 'AI-Limit erreicht');
}
```

---

### Phase 3: Contacts Usage Tracking

**Ziel:** Contact Create/Delete tracken

#### 3.1 CRM APIs erweitern

**Status:** APIs haben bereits Auth ✅

**Datei:** `src/app/api/v1/contacts/route.ts`

**Änderungen:** Usage Tracking nach erfolgreicher Operation

```typescript
// In POST Handler (nach createContact)
export const POST = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    const body = await RequestParser.parseJSON<ContactCreateRequest>(request);

    // Create contact (existing)
    const contact = await contactsAPIService.createContact(
      body,
      context.organizationId,
      context.userId
    );

    // Track usage ✨ NEU
    await updateContactsUsage(context.organizationId, +1);

    return APIMiddleware.successResponse(contact, 201);
  },
  ['contacts:write']
);

// In DELETE Handler
export const DELETE = APIMiddleware.withAuth(
  async (request: NextRequest, context) => {
    // Delete contact (existing)
    await contactsAPIService.deleteContact(
      contactId,
      context.organizationId
    );

    // Track usage ✨ NEU
    await updateContactsUsage(context.organizationId, -1);

    return APIMiddleware.successResponse({ success: true });
  },
  ['contacts:delete']
);

// In POST Bulk Handler
// Nach erfolgreichem Bulk-Import
await updateContactsUsage(context.organizationId, result.created.length);
```

**Betroffene Dateien:**
- `src/app/api/v1/contacts/route.ts` (POST, DELETE)
- `src/app/api/v1/contacts/[contactId]/route.ts` (DELETE)

#### 3.2 Initial Sync für bestehende Organizations

**Problem:** Bestehende Organizations haben Kontakte, aber keine Usage-Zahl

**Lösung:** Admin-Tool zum Synchronisieren

**Datei:** `src/app/api/admin/sync-contacts-usage/route.ts` (NEU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/api/auth-middleware';
import { adminDb } from '@/lib/firebase/admin-init';
import { updateContactsUsage } from '@/lib/usage/usage-tracker';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    try {
      // Count contacts in Firestore
      const contactsSnapshot = await adminDb
        .collection('contacts')
        .where('organizationId', '==', auth.organizationId)
        .count()
        .get();

      const totalContacts = contactsSnapshot.data().count;

      // Update usage (set absolute value)
      const usageRef = adminDb
        .collection('organizations')
        .doc(auth.organizationId)
        .collection('usage')
        .doc('current');

      await usageRef.update({
        contactsTotal: totalContacts,
        lastUpdated: new Date()
      });

      return NextResponse.json({
        success: true,
        contactsTotal: totalContacts
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}
```

---

### Phase 4: Storage Usage Tracking

**Ziel:** Firebase Storage Usage tracken

#### 4.1 Problem-Analyse

**Aktuell:**
- Upload läuft vermutlich direkt über Firebase Client SDK
- Keine zentrale API
- Schwer zu tracken

**Möglichkeiten:**

**A) Zentrale Upload API erstellen** ⭐ EMPFOHLEN
```typescript
// src/app/api/storage/upload/route.ts (NEU)
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, auth: AuthContext) => {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // Limit check
    const usage = await getUsage(auth.organizationId);
    const newTotal = usage.storageUsed + file.size;

    if (usage.storageLimit !== -1 && newTotal > usage.storageLimit) {
      return NextResponse.json(
        { error: 'Storage limit exceeded' },
        { status: 429 }
      );
    }

    // Upload to Firebase Storage (using Admin SDK)
    const bucket = admin.storage().bucket();
    const fileName = `${auth.organizationId}/${nanoid()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    await bucket.file(fileName).save(Buffer.from(fileBuffer), {
      metadata: {
        contentType: file.type,
        metadata: {
          organizationId: auth.organizationId,
          uploadedBy: auth.userId,
          originalName: file.name
        }
      }
    });

    // Calculate new total storage
    const totalStorage = await calculateTotalStorage(auth.organizationId);
    await updateStorageUsage(auth.organizationId, totalStorage);

    return NextResponse.json({
      success: true,
      fileName,
      size: file.size
    });
  });
}
```

**B) Cloud Function für Storage Trigger**
```typescript
// functions/src/storage-tracking.ts
export const onStorageChange = functions.storage.object().onFinalize(async (object) => {
  const metadata = object.metadata;
  const organizationId = metadata?.organizationId;

  if (!organizationId) return;

  // Calculate total storage for org
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({
    prefix: `${organizationId}/`
  });

  const totalBytes = files.reduce((sum, file) => sum + parseInt(file.metadata.size || '0'), 0);

  // Update Firestore
  await updateStorageUsage(organizationId, totalBytes);
});
```

**C) Periodischer Cron-Job**
- Jeden Tag alle Organizations durchgehen
- Storage neu berechnen
- Nicht real-time, aber einfach

**Empfehlung:** Option A + C
- Zentrale Upload API für neue Uploads (real-time)
- Cron-Job als Backup für Konsistenz (täglich)

---

### Phase 5: Team Members Usage Tracking

**Ziel:** Anzahl aktiver Team-Mitglieder tracken

#### 5.1 Problem-Analyse

**Aktuell:**
- `team_members` Collection hat User-Einträge
- Keine automatische Zählung

**Wo tracken?**
- Bei Team-Member Invite (wenn Status → active)
- Bei Team-Member Remove (wenn deleted oder deactivated)

#### 5.2 Implementation

**TODO:** Team-Member APIs finden und erweitern

**Pattern:**
```typescript
// Nach erfolgreichem Invite
const activeMembers = await adminDb
  .collection('team_members')
  .where('organizationId', '==', organizationId)
  .where('status', '==', 'active')
  .count()
  .get();

await updateTeamMembersUsage(organizationId, activeMembers.data().count);
```

---

## 5. Migration Plan für bestehende Organizations

### Problem
Bestehende Organizations haben:
- ✅ Stripe Subscription
- ❌ Keine Usage-Tracking-Daten

### Lösung: Admin Migration Tool

**Datei:** `src/app/api/admin/migrate-usage/route.ts` (NEU)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin-init';
import { initializeUsageTracking } from '@/lib/usage/usage-tracker';
import { SubscriptionTier } from '@/types/organization';

export async function POST(request: NextRequest) {
  try {
    // Nur Super-Admin erlauben
    // TODO: Add super-admin check

    const { organizationId } = await request.json();

    // Get organization
    const orgDoc = await adminDb
      .collection('organizations')
      .doc(organizationId)
      .get();

    if (!orgDoc.exists) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const orgData = orgDoc.data();
    const tier = orgData?.tier as SubscriptionTier;

    // Check if usage already exists
    const usageDoc = await adminDb
      .collection('organizations')
      .doc(organizationId)
      .collection('usage')
      .doc('current')
      .get();

    if (usageDoc.exists) {
      return NextResponse.json({
        success: true,
        message: 'Usage already initialized',
        existing: usageDoc.data()
      });
    }

    // Initialize usage tracking
    await initializeUsageTracking(organizationId, tier);

    // Sync real data

    // 1. Count contacts
    const contactsCount = await adminDb
      .collection('contacts')
      .where('organizationId', '==', organizationId)
      .count()
      .get();

    // 2. Count team members
    const teamMembersCount = await adminDb
      .collection('team_members')
      .where('organizationId', '==', organizationId)
      .where('status', '==', 'active')
      .count()
      .get();

    // 3. Calculate storage (if possible)
    // TODO: Implement storage calculation

    // Update usage with real data
    await adminDb
      .collection('organizations')
      .doc(organizationId)
      .collection('usage')
      .doc('current')
      .update({
        contactsTotal: contactsCount.data().count,
        teamMembersActive: teamMembersCount.data().count,
        lastUpdated: new Date()
      });

    return NextResponse.json({
      success: true,
      message: 'Usage initialized and synced',
      data: {
        contacts: contactsCount.data().count,
        teamMembers: teamMembersCount.data().count
      }
    });

  } catch (error: any) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Bulk Migration:**
```typescript
// src/scripts/migrate-all-organizations.ts
export async function migrateAllOrganizations() {
  const orgsSnapshot = await adminDb
    .collection('organizations')
    .where('stripeSubscriptionId', '!=', null)
    .get();

  console.log(`Migrating ${orgsSnapshot.size} organizations...`);

  for (const orgDoc of orgsSnapshot.docs) {
    try {
      await fetch('https://your-domain.com/api/admin/migrate-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        },
        body: JSON.stringify({ organizationId: orgDoc.id })
      });

      console.log(`✅ Migrated: ${orgDoc.id}`);
    } catch (error) {
      console.error(`❌ Failed: ${orgDoc.id}`, error);
    }
  }

  console.log('Migration complete!');
}
```

---

## 6. Limit Enforcement Strategy

### Soft Limits (Warning) vs Hard Limits (Block)

**Empfehlung:**

| Metric | Type | Strategy |
|--------|------|----------|
| Emails | Hard Limit | Block bei 100% |
| Contacts | Hard Limit | Block bei 100% |
| AI Words | Soft Limit | Warning bei 90%, Block bei 100% |
| Storage | Hard Limit | Block bei 100% |
| Team Members | Hard Limit | Block bei Limit |

**Implementation:**

```typescript
// Soft Limit (Warning)
const usage = await getUsage(organizationId);
const percentage = (usage.aiWordsUsed / usage.aiWordsLimit) * 100;

if (percentage >= 90 && percentage < 100) {
  // Allow, but warn
  console.warn(`⚠️ AI Words at ${percentage}% for org ${organizationId}`);
  // TODO: Send email notification
}

if (percentage >= 100) {
  // Block
  return NextResponse.json(
    { error: 'AI Words limit exceeded. Please upgrade.' },
    { status: 429 }
  );
}

// Hard Limit (Block immediately)
if (usage.emailsSent >= usage.emailsLimit) {
  return NextResponse.json(
    { error: 'Email limit reached. Upgrade to send more.' },
    { status: 429 }
  );
}
```

---

## 7. Monthly Reset Strategy

### Welche Metriken müssen monatlich zurückgesetzt werden?

- ✅ **Emails** - Monthly Reset
- ❌ **Contacts** - Kumulativ (kein Reset)
- ✅ **AI Words** - Monthly Reset
- ❌ **Storage** - Kumulativ (kein Reset)
- ❌ **Team Members** - Snapshot (kein Reset)

### Implementation: Cloud Scheduler + Cloud Function

**Cron:** Jeden 1. des Monats um 00:00 UTC

```typescript
// functions/src/monthly-reset.ts
export const monthlyUsageReset = functions.pubsub
  .schedule('0 0 1 * *') // 1st of every month at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting monthly usage reset...');

    const orgsSnapshot = await adminDb
      .collection('organizations')
      .get();

    for (const orgDoc of orgsSnapshot.docs) {
      try {
        await resetMonthlyUsage(orgDoc.id);
        console.log(`✅ Reset usage for org: ${orgDoc.id}`);
      } catch (error) {
        console.error(`❌ Failed to reset org: ${orgDoc.id}`, error);
      }
    }

    console.log('Monthly usage reset complete!');
  });
```

---

## 8. Error Handling & Edge Cases

### Edge Case 1: Gleichzeitige Requests

**Problem:** 2 Requests gleichzeitig → Race Condition bei Usage Update

**Lösung:** Firestore Transactions oder FieldValue.increment()

```typescript
// RICHTIG (Atomic)
await usageRef.update({
  emailsSent: FieldValue.increment(count),
  lastUpdated: FieldValue.serverTimestamp()
});

// FALSCH (Race Condition möglich)
const usage = await getUsage(orgId);
await usageRef.update({
  emailsSent: usage.emailsSent + count
});
```

**Status:** ✅ Bereits korrekt implementiert in `usage-tracker.ts`

### Edge Case 2: Failed Operations

**Problem:** API-Call failed, aber Usage wurde schon getrackt

**Lösung:** Tracking NACH erfolgreicher Operation

```typescript
// RICHTIG
try {
  // 1. Check limits
  const limits = await checkUsageLimits(organizationId);
  if (!limits.withinLimits) throw new Error('Limit exceeded');

  // 2. Perform operation
  const result = await sendEmail(...);

  // 3. Track ONLY if successful
  await incrementEmailUsage(organizationId, count);

  return result;
} catch (error) {
  // No tracking if failed
  throw error;
}
```

### Edge Case 3: Retroactive Usage Corrections

**Problem:** Bug führte zu falscher Usage-Zählung

**Lösung:** Admin-Tool zum Korrigieren

```typescript
// src/app/api/admin/correct-usage/route.ts
export async function POST(request: NextRequest) {
  const { organizationId, metric, newValue } = await request.json();

  await adminDb
    .collection('organizations')
    .doc(organizationId)
    .collection('usage')
    .doc('current')
    .update({
      [metric]: newValue,
      lastUpdated: new Date()
    });

  return NextResponse.json({ success: true });
}
```

---

## 9. Testing Strategy

### Unit Tests

**Datei:** `src/lib/usage/__tests__/usage-tracker.test.ts`

```typescript
describe('Usage Tracker', () => {
  test('incrementEmailUsage adds to counter', async () => {
    await initializeUsageTracking('test-org', 'STARTER');
    await incrementEmailUsage('test-org', 10);

    const usage = await getUsage('test-org');
    expect(usage.emailsSent).toBe(10);
  });

  test('checkUsageLimits detects exceeded limits', async () => {
    // Setup: Set usage to 100%
    await setUsage('test-org', { emailsSent: 2500, emailsLimit: 2500 });

    const result = await checkUsageLimits('test-org');
    expect(result.withinLimits).toBe(false);
    expect(result.exceededLimits).toContain('emails');
  });
});
```

### Integration Tests

**Test Szenarien:**
1. Email senden → Usage steigt
2. Contact erstellen → Usage steigt
3. AI generieren → Usage steigt
4. Limit erreichen → 429 Error
5. Tier upgrade → Limits steigen

### Manual Testing Checklist

- [ ] Neue Organization erstellen → Usage initialisiert
- [ ] Email senden → Counter +1
- [ ] Bulk-Email (3 Empfänger) → Counter +3
- [ ] Contact erstellen → Counter +1
- [ ] AI Generate → Words gezählt
- [ ] Limit erreichen → Blocked
- [ ] Upgrade → Neues Limit aktiv
- [ ] Monthly Reset → Emails/AI zurück auf 0

---

## 10. Rollout Plan

### Phase 1: Infrastructure (ERLEDIGT ✅)
- ✅ Usage Tracker Service
- ✅ Firestore Structure
- ✅ Webhook Integration

### Phase 2: Email Tracking (Woche 1)
- [ ] `/api/email/send` mit Auth ausstatten
- [ ] Frontend Token-Handling
- [ ] Testing
- [ ] Deploy

### Phase 3: AI Tracking (Woche 2)
- [ ] Word Counter Utility
- [ ] Alle 9 AI APIs mit Auth ausstatten
- [ ] Frontend Token-Handling
- [ ] Testing
- [ ] Deploy

### Phase 4: CRM Tracking (Woche 3)
- [ ] Contacts API erweitern
- [ ] Initial Sync Tool
- [ ] Testing
- [ ] Deploy

### Phase 5: Storage & Team (Woche 4)
- [ ] Storage Upload API erstellen
- [ ] Team Members Tracking
- [ ] Testing
- [ ] Deploy

### Phase 6: Migration & Cleanup (Woche 5)
- [ ] Alle Organizations migrieren
- [ ] Mock-Data Code entfernen
- [ ] Documentation Update
- [ ] Monitoring Setup

---

## 11. Monitoring & Alerts

### Metrics to Track

**Firestore:**
- Usage-Collection Growth
- Failed Updates (Errors)

**Application Logs:**
- `incrementEmailUsage` calls
- `checkUsageLimits` failures
- 429 Responses (Limit Exceeded)

### Alert Rules

**Alert 1: High 429 Rate**
- Condition: >10 limit-exceeded responses in 5 minutes
- Action: Email to team
- Reason: Possible misconfigured limits

**Alert 2: Usage Sync Failures**
- Condition: Failed `incrementUsage` calls
- Action: Slack notification
- Reason: Data consistency issue

**Alert 3: Organizations without Usage Data**
- Condition: org with subscription but no usage doc
- Action: Daily report
- Reason: Migration incomplete

---

## 12. Success Criteria

✅ **Phase 2 (Usage Tracking) ist erfolgreich wenn:**

1. Alle Metriken zeigen Real-Data (keine Mock-Daten)
2. Limit-Checks funktionieren (429 bei Überschreitung)
3. Billing-Page zeigt korrekte Nutzung
4. Monthly Reset funktioniert automatisch
5. Alle bestehenden Organizations migriert
6. Keine Performance-Regression (<100ms Overhead)
7. Zero Downtime während Migration

---

## 13. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking Change im Frontend | HIGH | HIGH | Phased Rollout, Feature Flag |
| Performance-Regression | MEDIUM | MEDIUM | Caching, Limit-Checks optional |
| Race Conditions | LOW | LOW | Atomic Updates (FieldValue.increment) |
| Migration Failures | MEDIUM | LOW | Rollback Script, Testing |
| False Limit Blocks | HIGH | MEDIUM | Soft Limits, Manual Override Tool |

---

## 14. Open Questions

1. **Storage API:** Wie werden Files aktuell hochgeladen? Direkt Client → Firebase oder über API?
2. **Team Members API:** Wo werden Team-Mitglieder verwaltet? Welche Route?
3. **Promo/Beta Accounts:** Sollen diese tracked werden oder unlimited bleiben?
4. **Grace Period:** Wenn Limit erreicht - sofort blocken oder 24h Grace Period?
5. **Overage:** Über Limit hinaus erlauben gegen Extra-Kosten?

---

## 15. Next Steps

**Sofort:**
1. Open Questions klären
2. Frontend Token-Handling Pattern festlegen
3. Phase 2 (Email) starten

**Diese Woche:**
1. Email API mit Auth ausstatten
2. Frontend anpassen
3. Testing
4. Deploy

**Nächste Woche:**
1. AI APIs mit Auth ausstatten
2. Word Counter implementieren
3. Testing
4. Deploy

---

## Anhang: Code Snippets

### A) Frontend Auth Helper

```typescript
// src/lib/api/client-fetch.ts
import { auth } from '@/lib/firebase/client-init';

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
}

// Usage
const response = await authenticatedFetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to, subject, htmlContent })
});
```

### B) Limit-Check Hook

```typescript
// src/hooks/useUsageLimits.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useUsageLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchLimits = async () => {
      const token = await user.getIdToken();
      const response = await fetch('/api/subscription/organization', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      setLimits(data.organization.usage);
      setLoading(false);
    };

    fetchLimits();
  }, [user]);

  const isNearLimit = (metric: string, threshold = 90) => {
    if (!limits) return false;
    const percentage = (limits[`${metric}Used`] / limits[`${metric}Limit`]) * 100;
    return percentage >= threshold;
  };

  return { limits, loading, isNearLimit };
}
```

---

**Ende des Plans**
