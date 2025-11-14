# Scripts Documentation

Übersicht über alle verfügbaren Scripts im Projekt.

## Service Account Management

### check-service-accounts.ts

Prüft den Status von Service Accounts in Firebase Auth und Firestore.

```bash
npx tsx scripts/check-service-accounts.ts
```

**Prüft:**
- Firebase Auth User Existenz
- Custom Claims (organizationId, role)
- team_members Dokument
- Erforderliche Felder

**Output:**
```
✅ Alle Service Accounts sind korrekt konfiguriert!
```
oder
```
⚠️ Einige Service Accounts haben Probleme
  1. Custom Claim organizationId fehlt
  2. team_members Document fehlt
```

### setup-service-accounts.ts

Erstellt/aktualisiert Service Account Konfiguration in Firestore und Auth.

```bash
npx tsx scripts/setup-service-accounts.ts
```

**Führt aus:**
1. Prüft Firebase Auth User
2. Erstellt team_members Dokument
3. Setzt Custom Claims
4. Verifiziert Setup

**Konfiguriert:**
- `cron-service@celeropress.com` (UID: H2cyq2rzo5dOBWBMuChydh57pLh1)
- `test@example.com` (UID: GmeBGRXBBtWykKmNddv6GotMCJ02)

### convert-service-account-key.js

Konvertiert Firebase Admin SDK JSON zu .env.local Format.

```bash
node scripts/convert-service-account-key.js path/to/service-account.json
```

**Output:**
- Console: .env.local kompatible Zeile
- Datei: `firebase-admin-env.txt`
- Zwischenablage: (Windows only)

**Beispiel:**
```bash
node scripts/convert-service-account-key.js skamp-prod-firebase-adminsdk.json
```

## Migration Scripts

### test-migration.js

Testet Firestore Migrations.

```bash
npm run migrate:test
```

### migrate-team-folders.ts

Migriert Team-Ordner Struktur.

```bash
# Nur Ordner migrieren
npm run migrate:folders

# Nur Emails migrieren
npm run migrate:emails

# Alles migrieren
npm run migrate:all

# Dry-Run (nichts ändern)
npm run migrate:dry
```

## Test Data Scripts

### seed-matching-test-data.ts

Erstellt Test-Daten für das Matching-System.

```bash
npm run seed:matching-test
```

### cleanup-matching-test-data.ts

Entfernt Test-Daten vom Matching-System.

```bash
npm run cleanup:matching-test
```

## Firestore Scripts

### check-firestore-indexes.ts

Prüft ob alle benötigten Firestore Indexes existieren.

```bash
npm run check:indexes
```

**Prüft:**
- Fehlende Composite Indexes
- Index Status (building, ready, error)
- Empfehlungen für neue Indexes

## Nutzung in package.json

Alle Scripts sind als npm scripts verfügbar:

```json
{
  "scripts": {
    "migrate:test": "node scripts/test-migration.js",
    "migrate:folders": "npx ts-node scripts/migrate-team-folders.ts folders",
    "migrate:emails": "npx ts-node scripts/migrate-team-folders.ts emails",
    "migrate:all": "npx ts-node scripts/migrate-team-folders.ts all",
    "seed:matching-test": "npx tsx scripts/seed-matching-test-data.ts",
    "cleanup:matching-test": "npx tsx scripts/cleanup-matching-test-data.ts",
    "check:indexes": "npx tsx scripts/check-firestore-indexes.ts"
  }
}
```

## Best Practices

### TypeScript Scripts (tsx)

Für TypeScript-Scripts mit ES Modules:
```bash
npx tsx scripts/your-script.ts
```

### CommonJS Scripts (node)

Für JavaScript-Scripts:
```bash
node scripts/your-script.js
```

### Environment Variables

Scripts nutzen automatisch `.env.local`:
- Stelle sicher dass alle benötigten Variablen gesetzt sind
- Besonders wichtig: `FIREBASE_ADMIN_SERVICE_ACCOUNT`

### Error Handling

Scripts verwenden Exit-Codes:
- `0` = Erfolg
- `1` = Fehler

Beispiel:
```bash
npx tsx scripts/check-service-accounts.ts
if [ $? -ne 0 ]; then
  echo "Check failed"
  exit 1
fi
```

## Neue Scripts Hinzufügen

Template für neue Scripts:

```typescript
/**
 * Script Description
 *
 * Usage:
 *   npx tsx scripts/your-script.ts [args]
 */

import { adminDb } from '../src/lib/firebase/admin-init';

async function main() {
  try {
    console.log('🚀 Starting...');

    // Your logic here

    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
```

## Troubleshooting

### "Cannot find module"

Stelle sicher dass Dependencies installiert sind:
```bash
npm install
```

### "FIREBASE_ADMIN_SERVICE_ACCOUNT not set"

Siehe: `docs/setup/service-accounts-setup.md`

### TypeScript Errors

Prüfe tsconfig.json und stelle sicher dass:
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```

## Weitere Dokumentation

- Service Accounts: `docs/setup/service-accounts-setup.md`
- Testing: `docs/testing/team-invitation-tests.md`
- Campaign Email: `docs/campaigns-email/`
