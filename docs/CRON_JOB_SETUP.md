# Cron Job Service User Setup

## Übersicht

Der Auto-Import Cron Job benötigt einen **Service User** für sichere Firestore-Zugriffe.

**Sicherheitskonzept:**
- ✅ Cron Job authentifiziert sich mit CRON_SECRET (API-Zugriff)
- ✅ Service User authentifiziert sich mit Email/Password (Firestore-Zugriff)
- ✅ Service User hat `organizationId: 'superadmin-org'` Custom Claim
- ✅ Firestore Rules erlauben nur authenticated requests
- ✅ Kein Admin SDK nötig

---

## Setup-Schritte

### 1. Service User in Firebase Auth erstellen

**Option A: Firebase Console (Empfohlen)**

1. Gehe zu [Firebase Console](https://console.firebase.google.com/project/skamp-prod/authentication/users)
2. Klicke "Add user"
3. Eingaben:
   - **Email:** `cron-service@celeropress.com`
   - **Password:** <generiere ein sicheres Passwort, z.B. mit: `openssl rand -base64 32`>
4. Klicke "Add user"
5. **Wichtig:** Notiere das Passwort!

**Option B: Firebase CLI**

```bash
firebase auth:import users.json --project skamp-prod
```

`users.json`:
```json
{
  "users": [{
    "localId": "cron-service-user",
    "email": "cron-service@celeropress.com",
    "passwordHash": "<bcrypt-hash>",
    "emailVerified": true
  }]
}
```

---

### 2. Custom Claim setzen (SuperAdmin)

Der Service User braucht `organizationId: 'superadmin-org'` als Custom Claim.

**Option A: Cloud Function (Empfohlen)**

Erstelle eine Cloud Function:

```typescript
// functions/src/setCustomClaims.ts
import * as admin from 'firebase-admin';

export const setServiceUserClaims = functions.https.onRequest(async (req, res) => {
  const secret = req.query.secret;

  if (secret !== process.env.ADMIN_SECRET) {
    res.status(401).send('Unauthorized');
    return;
  }

  const email = 'cron-service@celeropress.com';
  const user = await admin.auth().getUserByEmail(email);

  await admin.auth().setCustomUserClaims(user.uid, {
    organizationId: 'superadmin-org'
  });

  res.send('Custom claims set for service user');
});
```

Dann aufrufen:
```bash
curl "https://your-region-your-project.cloudfunctions.net/setServiceUserClaims?secret=<ADMIN_SECRET>"
```

**Option B: Firebase Admin SDK Script**

```javascript
// scripts/set-service-user-claims.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setCustomClaims() {
  const email = 'cron-service@celeropress.com';
  const user = await admin.auth().getUserByEmail(email);

  await admin.auth().setCustomUserClaims(user.uid, {
    organizationId: 'superadmin-org'
  });

  console.log('✅ Custom claims set for', email);
}

setCustomClaims().then(() => process.exit(0));
```

Ausführen:
```bash
node scripts/set-service-user-claims.js
```

---

### 3. Environment Variables setzen

**Lokal (.env.local):**

```bash
CRON_SERVICE_EMAIL=cron-service@celeropress.com
CRON_SERVICE_PASSWORD=<das-sichere-passwort-aus-schritt-1>
```

**Vercel (Production):**

```bash
vercel env add CRON_SERVICE_EMAIL
# Eingeben: cron-service@celeropress.com
# Environment: Production, Preview, Development

vercel env add CRON_SERVICE_PASSWORD
# Eingeben: <das-sichere-passwort>
# Environment: Production, Preview, Development
```

---

### 4. Firestore Rules deployen

```bash
firebase deploy --only firestore:rules
```

Die neuen Rules erlauben Zugriff nur für:
- ✅ Authenticated Users
- ✅ SuperAdmin (`organizationId: 'superadmin-org'`)
- ✅ Organization Members (für ihre Org)

---

### 5. Testen

**Lokal:**

```bash
npm run dev

# In neuem Terminal:
curl "http://localhost:3000/api/matching/auto-import?secret=<CRON_SECRET>"
```

**Production:**

```bash
curl "https://www.celeropress.com/api/matching/auto-import?secret=<CRON_SECRET>"
```

**Erwartetes Ergebnis:**

```json
{
  "success": true,
  "stats": {
    "candidatesProcessed": 100,
    "candidatesImported": 99,
    "candidatesFailed": 1,
    "errors": [...]
  },
  "settings": {
    "minScore": 60,
    "useAiMerge": true
  }
}
```

---

## Vercel Cron Job

Der Cron Job läuft automatisch **täglich um 04:00 UTC**.

**Konfiguration:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/matching/auto-import?secret=$CRON_SECRET",
      "schedule": "0 4 * * *"
    }
  ]
}
```

**Vercel übergibt automatisch `$CRON_SECRET` als Environment Variable.**

---

## Troubleshooting

### Fehler: "Service credentials not configured"

**Lösung:** Environment Variables nicht gesetzt.

```bash
vercel env ls  # Prüfe ob CRON_SERVICE_EMAIL und CRON_SERVICE_PASSWORD existieren
```

### Fehler: "Service authentication failed"

**Ursachen:**
1. **Falsches Passwort** → Prüfe Environment Variable
2. **User existiert nicht** → Prüfe Firebase Console
3. **Email nicht verifiziert** → In Firebase Console verifizieren

### Fehler: "Missing or insufficient permissions"

**Ursachen:**
1. **Custom Claim fehlt** → Führe Schritt 2 nochmal aus
2. **Firestore Rules falsch** → Deploye Rules nochmal
3. **Token nicht aktualisiert** → Service User muss neu einloggen (passiert automatisch)

**Prüfen:**

```bash
# Custom Claims prüfen (via Cloud Function oder Script)
firebase auth:export users.json
cat users.json | jq '.users[] | select(.email=="cron-service@celeropress.com") | .customAttributes'
```

### Cron Job läuft nicht

**Prüfen:**
1. **Vercel Dashboard → Deployments → Cron Jobs**
2. **Vercel Logs:** `vercel logs <deployment-url>`
3. **CRON_SECRET korrekt gesetzt:** `vercel env ls`

---

## Sicherheitshinweise

### ✅ Sicher:
- Service User nur für Cron Jobs
- Starkes, zufälliges Passwort
- Custom Claim `superadmin-org` nur für Service User
- CRON_SECRET schützt API-Zugriff
- Firestore Rules prüfen Authentication

### ❌ Nicht sicher:
- Service User Credentials in Code
- `allow read, write: if true` (alte Version)
- Kein Logout nach Cron Job
- Shared Passwords

---

## Next Steps

Nach erfolgreichem Setup:

1. ✅ **Monitor Cron Job Logs** (Vercel Dashboard)
2. ✅ **Prüfe Settings:** `https://www.celeropress.com/api/debug/matching-settings`
3. ✅ **Teste manuell:** `curl "https://www.celeropress.com/api/matching/auto-import?secret=<CRON_SECRET>"`
4. ✅ **Warte auf nächsten Auto-Run** (täglich 04:00 UTC)

---

## FAQ

**Q: Warum kein Admin SDK?**
A: Organisationsrichtlinie. Client SDK + Service User ist sicherer und einfacher.

**Q: Kann ich einen anderen Service User verwenden?**
A: Ja, aber er braucht `organizationId: 'superadmin-org'` Custom Claim.

**Q: Was passiert wenn Service User kompromittiert wird?**
A: Password in Firebase Console ändern, Environment Variables updaten, redeploy.

**Q: Wie oft läuft der Cron Job?**
A: Täglich um 04:00 UTC (konfigurierbar in `vercel.json`).
