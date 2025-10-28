# Phase 0 Setup Guide - Special Accounts System

> **Schritt-für-Schritt Anleitung zur Aktivierung von Phase 0**

---

## Übersicht

Nach dem Merge von `feature/stripe-phase-0-special-accounts` müssen folgende Schritte durchgeführt werden:

---

## ✅ Schritt 1: Migration ausführen

Das Migration Script fügt allen bestehenden Organizations das neue `accountType` Field hinzu.

### Option A: Über Firebase Functions (Empfohlen für Production)

1. **Erstelle eine temporäre Cloud Function:**

```typescript
// functions/src/migrate-orgs.ts
import * as admin from 'firebase-admin';

export const migrateOrganizations = async () => {
  const orgsSnapshot = await admin.firestore().collection('organizations').get();

  console.log(`Migrating ${orgsSnapshot.size} organizations...`);

  for (const doc of orgsSnapshot.docs) {
    const data = doc.data();

    if (data.accountType) {
      console.log(`✅ ${doc.id} already migrated`);
      continue;
    }

    await doc.ref.update({
      accountType: 'regular',
      tier: data.tier || 'STARTER',
      updatedAt: admin.firestore.Timestamp.now(),
    });

    console.log(`✅ Migrated ${doc.id} to regular account`);
  }

  console.log('✅ Migration complete');
};
```

2. **Ausführen:**
```bash
firebase functions:shell
migrateOrganizations()
```

### Option B: Über Firebase Console (Manuell)

1. Gehe zu **Firestore** in Firebase Console
2. Öffne die `organizations` Collection
3. Für jedes Dokument:
   - Füge Field `accountType` hinzu: `"regular"`
   - Füge Field `tier` hinzu (falls nicht vorhanden): `"STARTER"`
   - Update `updatedAt` auf aktuelles Timestamp

### Option C: Lokal mit Environment Variables

```bash
# .env.local mit FIREBASE_ADMIN_SERVICE_ACCOUNT befüllen
npx tsx src/scripts/migrate-organizations-to-accounttype.ts
```

---

## ✅ Schritt 2: Super-Admin Claim setzen

Der Super-Admin benötigt ein Firebase Custom Claim.

### Option A: Firebase Console (Empfohlen)

1. Gehe zu **Authentication** → **Users**
2. Wähle deinen Admin-User
3. Öffne den **User UID** Details-Tab
4. Führe in der Firebase CLI aus:

```bash
firebase auth:update YOUR_USER_UID --set-custom-user-claims '{"role":"super-admin"}'
```

### Option B: Cloud Function

Erstelle eine einmalige Cloud Function:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const setSuperAdmin = functions.https.onCall(async (data, context) => {
  // Security: Nur für authentifizierte Requests
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Not authenticated');
  }

  const { userId } = data;

  await admin.auth().setCustomUserClaims(userId, { role: 'super-admin' });

  return { success: true, message: `Set super-admin claim for ${userId}` };
});
```

### Option C: Über API Route (Existing Super-Admin)

Wenn du bereits einen Super-Admin hast:

```typescript
// POST /api/super-admin/set-claim
// Body: { userId: "USER_ID_HERE" }

import { setSuperAdminClaim } from '@/lib/api/super-admin-check';
await setSuperAdminClaim(userId);
```

---

## ✅ Schritt 3: Firestore Rules deployen

Die neuen Firestore Rules für `promoCodes` Collection deployen:

```bash
firebase deploy --only firestore:rules
```

**Erwartetes Ergebnis:**
```
✔ Deploy complete!

Firestore Rules:
✓ firestore.rules updated
```

---

## ✅ Schritt 4: Testing

### 4.1 Super-Admin Access testen

1. Navigiere zu: `https://celeropress.com/dashboard/super-admin/accounts`
2. Wenn Super-Admin Claim gesetzt ist:
   - ✅ Seite wird angezeigt
   - ✅ "Account Management" Header sichtbar
   - ✅ Promo-Code Manager sichtbar

3. Wenn **NICHT** gesetzt:
   - ❌ "Zugriff verweigert" Meldung
   - → Gehe zurück zu Schritt 2

### 4.2 Promo-Code erstellen

1. Auf `/dashboard/super-admin/accounts`
2. Im "Promo-Code erstellen" Formular:
   - **Code:** `TEST2025`
   - **Tier:** `BUSINESS`
   - **Max. Nutzungen:** `10`
   - **Gültigkeit:** `3` (Monate)
3. Klicke "Promo-Code erstellen"

**Erwartetes Ergebnis:**
- ✅ Toast: "Promo-Code "TEST2025" erstellt!"
- ✅ Code erscheint in der Liste unten

### 4.3 Promo-Code anwenden (Optional)

Erstelle eine API Route oder verwende Postman:

```bash
POST /api/promo-code/apply
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "code": "TEST2025"
}
```

**Erwartetes Ergebnis:**
```json
{
  "success": true,
  "tier": "BUSINESS",
  "message": "Promo-Code erfolgreich eingelöst! Ihr Account wurde auf BUSINESS upgradet."
}
```

**In Firestore prüfen:**
```javascript
// organizations/{orgId}
{
  accountType: "promo",
  tier: "BUSINESS",
  promoDetails: {
    code: "TEST2025",
    grantedBy: "promo-code",
    grantedAt: Timestamp,
    expiresAt: Timestamp (in 3 Monaten),
    reason: "Promo Code: TEST2025",
    originalTier: "BUSINESS"
  }
}
```

---

## ✅ Schritt 5: Verify Migration

Öffne Firestore Console und prüfe:

**1. Organizations Collection:**
- ✅ Alle Docs haben `accountType` Field
- ✅ Alle Docs haben `tier` Field
- ✅ Default: `accountType = "regular"`

**2. PromoCodes Collection:**
- ✅ Collection existiert (kann leer sein)
- ✅ Falls Promo-Code erstellt: Doc mit `code`, `tier`, `maxUses`, etc.

**3. Security Rules:**
```bash
firebase firestore:rules
```
- ✅ `match /promoCodes/{codeId}` vorhanden
- ✅ `allow read: if isAuthenticated()`
- ✅ `allow write: if isSuperAdmin()`

---

## 🐛 Troubleshooting

### Problem: "Zugriff verweigert" auf /dashboard/super-admin/accounts

**Ursache:** Super-Admin Claim nicht gesetzt

**Lösung:**
1. In Browser-Console: `await firebase.auth().currentUser.getIdTokenResult(true)`
2. Prüfe `claims.role` → sollte `"super-admin"` sein
3. Falls nicht: Gehe zu Schritt 2 (Super-Admin Claim setzen)
4. Nach Setzen: User muss sich **neu einloggen** (Token refresh)

### Problem: "Ungültiger Promo-Code"

**Ursache:** Code existiert nicht in Firestore

**Lösung:**
1. Öffne Firestore Console → `promoCodes` Collection
2. Prüfe ob Code existiert (Case-Sensitive!)
3. Prüfe `active: true` und `expiresAt` nicht abgelaufen

### Problem: Migration Script kann nicht ausgeführt werden

**Ursache:** Fehlende Firebase Admin Credentials

**Lösung:**
- Verwende Option A (Cloud Function) oder Option B (Manuell)
- Füge `.env.local` hinzu mit `FIREBASE_ADMIN_SERVICE_ACCOUNT` für Option C

---

## ✅ Checkliste

Nach erfolgreichem Setup sollten folgende Punkte erfüllt sein:

- [ ] Alle Organizations haben `accountType` Field
- [ ] Mindestens ein User hat Super-Admin Claim
- [ ] Firestore Rules deployed mit `promoCodes` Rules
- [ ] `/dashboard/super-admin/accounts` ist für Super-Admin zugänglich
- [ ] Promo-Codes können erstellt werden
- [ ] Promo-Codes können angewendet werden (Optional getestet)

---

## 🎯 Nächste Schritte

Nach erfolgreichem Setup:

**Option A: Phase 0.5 - Super-Admin Support Dashboard**
- Organizations Overview mit Live Usage
- Quick Actions für Telefon-Support
- Kann parallel zu Phase 1 laufen

**Option B: Phase 1 - Stripe Setup**
- Stripe Account konfigurieren
- SDK Integration
- Subscription-Limits Config

---

**Erstellt:** 2025-10-28
**Phase:** 0 - Special Accounts System
**Status:** ✅ Implementiert, Testing erforderlich
