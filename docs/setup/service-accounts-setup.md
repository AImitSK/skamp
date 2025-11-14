# Service Accounts Setup Guide

## Problem

Service Accounts (z.B. `cron-service@celeropress.com`, `test@example.com`) benötigen zwei Konfigurationen:

1. **Firebase Admin SDK Service Account Key** - Für Server-seitige API-Aufrufe
2. **team_members Collection Einträge** - Für organizationId und Permissions

Wenn diese fehlen, erhältst du Fehler wie:
- ❌ "FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable not set"
- ❌ "Missing or insufficient permissions"
- ❌ Cron Jobs schlagen fehl

## Lösung: Schritt-für-Schritt

### Schritt 1: Firebase Admin SDK Key erhalten

#### Option A: Von Firebase Console herunterladen (Empfohlen)

1. Gehe zu [Firebase Console → Service Accounts](https://console.firebase.google.com/project/skamp-prod/settings/serviceaccounts/adminsdk)
2. Klicke **"Generate new private key"**
3. Bestätige die Warnung
4. Speichere die JSON-Datei als `skamp-prod-firebase-adminsdk.json`

#### Option B: Existierenden Key verwenden

Falls du bereits einen Service Account Key hast, überspringe diesen Schritt.

### Schritt 2: Service Account Key konvertieren

Konvertiere die JSON-Datei zu einem `.env.local` kompatiblen Format:

```bash
node scripts/convert-service-account-key.js skamp-prod-firebase-adminsdk.json
```

**Output:**
```
✅ Service Account JSON geladen
   Project ID: skamp-prod
   Client Email: firebase-adminsdk-xxxxx@skamp-prod.iam.gserviceaccount.com

📋 Kopiere diese Zeile in deine .env.local:

────────────────────────────────────────────────────────────────────────────────
FIREBASE_ADMIN_SERVICE_ACCOUNT='{"type":"service_account","project_id":"skamp-prod",...}'
────────────────────────────────────────────────────────────────────────────────

✅ Gespeichert als: firebase-admin-env.txt
📋 In Zwischenablage kopiert (Windows)
```

### Schritt 3: Zur .env.local hinzufügen

1. Öffne `.env.local`
2. Füge die Zeile aus dem Output hinzu:

```bash
# Firebase Admin SDK Service Account
FIREBASE_ADMIN_SERVICE_ACCOUNT='{"type":"service_account","project_id":"skamp-prod","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@skamp-prod.iam.gserviceaccount.com",...}'
```

3. Speichere die Datei
4. **WICHTIG:** Lösche `firebase-admin-env.txt` nach dem Kopieren!

### Schritt 4: Service Accounts Status prüfen

Prüfe ob die Service Account User in Firebase Auth und team_members korrekt konfiguriert sind:

```bash
npx tsx scripts/check-service-accounts.ts
```

**Erwarteter Output (wenn alles OK):**
```
🔍 Service Account Status Check
================================

📋 Checking: cron-service@celeropress.com
   User ID: H2cyq2rzo5dOBWBMuChydh57pLh1
   ✅ Auth User existiert
      Email: cron-service@celeropress.com
   ✅ Custom Claim: organizationId = sk-online-marketing
   ✅ Custom Claim: role = service
   ✅ team_members Document existiert
      ID: H2cyq2rzo5dOBWBMuChydh57pLh1_sk-online-marketing
   ✅ Alle erforderlichen Felder vorhanden
      organizationId: sk-online-marketing
      role: service
      status: active
   ✅ Alle Prüfungen bestanden!

📋 Checking: test@example.com
   ...

================================
✅ Alle Service Accounts sind korrekt konfiguriert!
================================
```

**Falls Probleme gefunden werden:**
```
⚠️ Einige Service Accounts haben Probleme

Zum Beheben ausführen:
  npx tsx scripts/setup-service-accounts.ts
```

### Schritt 5: Service Accounts einrichten (falls fehlend)

Wenn der Check Probleme findet, führe das Setup-Script aus:

```bash
npx tsx scripts/setup-service-accounts.ts
```

**Was macht das Script:**
1. ✅ Prüft ob User in Firebase Auth existiert
2. ✅ Erstellt `team_members` Dokumente
3. ✅ Setzt Custom Claims (`organizationId`, `role`)
4. ✅ Verifiziert das Setup

**Erwarteter Output:**
```
🚀 Service Account Setup
========================

Super-Admin Org ID: sk-online-marketing
Service Accounts: 2

📋 Setup: cron-service@celeropress.com
   User ID: H2cyq2rzo5dOBWBMuChydh57pLh1
   ✓ Prüfe Firebase Auth...
   ✅ Auth User existiert: cron-service@celeropress.com
   ✓ Erstelle team_members/H2cyq2rzo5dOBWBMuChydh57pLh1_sk-online-marketing...
   ✅ team_members Document erstellt/aktualisiert
   ✓ Setze Custom Claims...
   ✅ Custom Claims gesetzt
   ✓ Verifiziere Setup...
   ✅ Verifikation erfolgreich:
      - organizationId: sk-online-marketing
      - role: service
      - status: active

✅ Service Account Setup abgeschlossen!
```

### Schritt 6: Verifizierung

1. **Check Script nochmal ausführen:**
   ```bash
   npx tsx scripts/check-service-accounts.ts
   ```
   Sollte jetzt alles ✅ zeigen.

2. **Cron Job testen:**
   ```bash
   # Triggere manuell einen Cron Job
   curl -X GET http://localhost:3000/api/pr/email/cron
   ```

3. **Dev Server neustarten:**
   ```bash
   npm run dev
   ```

## Service Account Konfiguration

### Aktuelle Service Accounts

| Email | User ID | Rolle | Zweck |
|-------|---------|-------|-------|
| cron-service@celeropress.com | H2cyq2rzo5dOBWBMuChydh57pLh1 | service | Cron Jobs (Email-Versand, Monitoring) |
| test@example.com | GmeBGRXBBtWykKmNddv6GotMCJ02 | admin | Tests & Development |

### Benötigte Felder in team_members

```typescript
{
  id: string;                    // "{userId}_{organizationId}"
  userId: string;                // Firebase Auth UID
  email: string;                 // Service Account Email
  organizationId: string;        // "sk-online-marketing"
  role: "service" | "admin";     // Rolle des Accounts
  status: "active";              // Immer active
  displayName: string;           // Anzeigename

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  joinedAt: Timestamp;
  lastActiveAt: Timestamp;

  // Keine Einladung
  invitedBy: null;
  invitationToken: null;
  invitationTokenExpiry: null;

  // Metadata
  isServiceAccount: true;
  description: string;
}
```

### Benötigte Custom Claims

```typescript
{
  organizationId: "sk-online-marketing",  // WICHTIG!
  role: "service" | "admin",
  isServiceAccount: true
}
```

## Troubleshooting

### Problem: "FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable not set"

**Ursache:** `.env.local` fehlt die Service Account Konfiguration

**Lösung:**
1. Folge Schritt 1-3 oben
2. Server neu starten: `npm run dev`

### Problem: "Missing or insufficient permissions"

**Ursache:** Service Account fehlt in `team_members` oder Custom Claims fehlen

**Lösung:**
1. Führe Check-Script aus: `npx tsx scripts/check-service-accounts.ts`
2. Führe Setup-Script aus: `npx tsx scripts/setup-service-accounts.ts`
3. User muss sich neu anmelden (damit Claims aktiv werden)

### Problem: "User existiert nicht in Firebase Auth"

**Ursache:** Service Account User wurde nicht in Firebase Console erstellt

**Lösung:**
1. Gehe zu [Firebase Console → Authentication](https://console.firebase.google.com/project/skamp-prod/authentication/users)
2. Klicke "Add user"
3. Email: `cron-service@celeropress.com`
4. Passwort: (starkes Passwort generieren)
5. Speichere User ID (UID)
6. Aktualisiere UID in `scripts/setup-service-accounts.ts` falls anders

### Problem: Custom Claims werden nicht gesetzt

**Ursache:** Firebase Admin SDK hat keine Berechtigung

**Lösung:**
1. Prüfe ob Service Account Key korrekt ist
2. Prüfe ob Service Account die Rolle "Firebase Admin SDK Administrator Service Agent" hat
3. In Firebase Console → IAM & Admin → IAM prüfen

### Problem: Cron Jobs funktionieren nicht nach Setup

**Ursache:** User muss sich neu anmelden damit Custom Claims aktiv werden

**Lösung:**
1. Für Service Accounts: Token regenerieren (falls API-basiert)
2. Für reguläre User: Logout + Login
3. Server neu starten: `npm run dev`

## Sicherheit

### ⚠️ WICHTIGE HINWEISE:

1. **NIEMALS** den Service Account Key in Git committen
2. `.gitignore` muss enthalten:
   ```
   firebase-admin-env.txt
   *-firebase-adminsdk-*.json
   ```
3. Service Account Keys regelmäßig rotieren (alle 90 Tage)
4. Keys nur in `.env.local` speichern (lokal)
5. Für Produktion: Vercel Environment Variables nutzen

### Key Rotation

Wenn du einen Key rotieren musst:

1. Neuen Key in Firebase Console generieren
2. Mit `convert-service-account-key.js` konvertieren
3. In `.env.local` ersetzen
4. Alten Key in Firebase Console löschen
5. Server neu starten

## Vercel Deployment

Für Produktion auf Vercel:

1. Gehe zu Vercel Dashboard → Project → Settings → Environment Variables
2. Füge hinzu:
   ```
   Name: FIREBASE_ADMIN_SERVICE_ACCOUNT
   Value: {"type":"service_account",...}
   Environment: Production
   ```
3. Redeploy auslösen

## Weitere Ressourcen

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Service Accounts IAM](https://cloud.google.com/iam/docs/service-accounts)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
