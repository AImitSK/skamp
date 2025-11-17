# CRM Tags Migration Script

## Problem

Durch einen Multi-Tenancy Bug im `CompanyModal.tsx` wurden Tags mit `userId` statt `organizationId` gespeichert:

```typescript
// ❌ FALSCH (vor dem Fix):
tagsEnhancedService.create(
  { name, color, organizationId: userId },  // userId!
  { organizationId: userId, userId: userId }
);
```

**Resultat:**
- Super Admin Tags: Sichtbar (Zufall, weil userId = organizationId beim Laden)
- Neue Organization Tags: **NICHT sichtbar** (userId ≠ organizationId)

## Lösung

Das Migrations-Script:
1. ✅ Analysiert alle Tags in der `tags` Collection
2. ✅ Identifiziert Tags mit `userId` als `organizationId`
3. ✅ Zeigt detaillierten Migrations-Plan
4. ✅ Migriert Tags zur richtigen `organizationId`
5. ✅ Speichert alte ID für Audit-Trail

---

## Voraussetzungen

### 1. Firebase Service Account Key

Das Script benötigt `firebase-service-account.json` im Projekt-Root:

```bash
# Stelle sicher, dass die Datei existiert:
ls firebase-service-account.json
```

**Wo bekomme ich den Key?**
- Firebase Console → Project Settings → Service Accounts → Generate New Private Key
- Datei als `firebase-service-account.json` im Projekt-Root speichern

### 2. Dependencies

```bash
# Firebase Admin SDK sollte bereits installiert sein
npm install firebase-admin
```

---

## Usage

### Schritt 1: Script ausführen

```bash
npx tsx scripts/migrate-crm-tags.ts
```

### Schritt 2: Analyse-Output prüfen

Das Script zeigt alle betroffenen Tags:

```
🔍 Analysiere Tags in Firestore...

📊 Gefunden: 15 Tags

📋 Migrations-Plan:
════════════════════════════════════════════════════════════════

1. Tag: "Kunde"
   ID: abc123def456
   Farbe: blue
   Aktuell organizationId: Xy9zAbC123def456ghi789  (← userId!)
   Vorschlag: org_456
   Grund: createdBy unterscheidet sich von organizationId (userId)
   Verwendet: 5 Kontakte, 3 Firmen

2. Tag: "Partner"
   ID: xyz789ghi012
   Farbe: green
   Aktuell organizationId: Lm3nOpQ456rst789uvw012  (← userId!)
   Vorschlag: MANUELL EINGEBEN
   Grund: userId als organizationId gefunden

════════════════════════════════════════════════════════════════

Gesamt: 2 Tags müssen migriert werden
```

### Schritt 3: Ziel-organizationId eingeben

```
📝 Bitte gib die Ziel-organizationId ein:
   (Die organizationId, zu der die Tags migriert werden sollen)

organizationId: org_456
```

**Woher bekomme ich die organizationId?**

Option A: Aus dem Firebase Dashboard
```
Firestore → organizations → Dokument-ID kopieren
```

Option B: Aus der App (als Super Admin)
```javascript
// In Browser Console:
console.log(currentOrganization.id);
```

Option C: Via Script
```bash
# Zeige alle Organizations:
npx tsx -e "
const admin = require('firebase-admin');
const app = admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });
const db = admin.firestore();
db.collection('organizations').get().then(snap => {
  snap.docs.forEach(doc => console.log(doc.id, '→', doc.data().name));
  process.exit(0);
});
"
```

### Schritt 4: Bestätigen

```
⚠️  Warnung: Dies wird 2 Tags zu organizationId "org_456" migrieren.

Fortfahren? (ja/nein): ja
```

### Schritt 5: Migration läuft

```
🚀 Starte Migration zu organizationId: org_456

   Migriere: "Kunde" (abc123def456)...
      ✅ Erfolgreich
   Migriere: "Partner" (xyz789ghi012)...
      ✅ Erfolgreich

════════════════════════════════════════════════════════════════

✅ Migration abgeschlossen:
   Erfolgreich: 2
   Fehler: 0

💡 Die Tags haben jetzt die korrekte organizationId: org_456
   Die alte organizationId wurde in _migratedFrom gespeichert.

✅ Fertig! Die Tags sollten jetzt in der CRM-Tabelle sichtbar sein.
```

---

## Was passiert bei der Migration?

Für jeden Tag:

```typescript
// VORHER:
{
  id: "abc123",
  name: "Kunde",
  color: "blue",
  organizationId: "Xy9zAbC123def456ghi789",  // ← userId!
  createdBy: "Xy9zAbC123def456ghi789",
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// NACHHER:
{
  id: "abc123",
  name: "Kunde",
  color: "blue",
  organizationId: "org_456",  // ← Richtige organizationId! ✅
  createdBy: "Xy9zAbC123def456ghi789",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  _migratedFrom: "Xy9zAbC123def456ghi789",  // Audit-Trail
  _migratedAt: Timestamp  // Audit-Trail
}
```

**Audit-Trail Felder:**
- `_migratedFrom`: Alte (falsche) organizationId für Nachvollziehbarkeit
- `_migratedAt`: Zeitpunkt der Migration

---

## Sicherheit

### Dry-Run (Vorschau ohne Änderungen)

Wenn du erst sehen willst, welche Tags betroffen sind **ohne zu migrieren**:

```bash
# Kommentiere in migrate-crm-tags.ts die Zeilen aus:
# await migrateTags(plans, targetOrgId.trim());
```

### Backup

**Empfohlen:** Erstelle ein Firestore-Backup vor der Migration:

```bash
# Via Firebase Console:
# Firestore → Backups → Create Backup
```

### Rollback

Falls nötig, kannst du die Migration rückgängig machen:

```typescript
// Rollback-Script:
const tagsSnapshot = await db.collection('tags')
  .where('_migratedAt', '!=', null)
  .get();

for (const doc of tagsSnapshot.docs) {
  const data = doc.data();
  if (data._migratedFrom) {
    await doc.ref.update({
      organizationId: data._migratedFrom,
      _migratedFrom: null,
      _migratedAt: null
    });
  }
}
```

---

## Troubleshooting

### Fehler: "Cannot find module 'firebase-service-account.json'"

```bash
# Lösung: Service Account Key herunterladen
# Firebase Console → Project Settings → Service Accounts → Generate Key
# Als firebase-service-account.json im Projekt-Root speichern
```

### Fehler: "Permission denied"

```bash
# Lösung: Service Account braucht Firestore-Rechte
# Firebase Console → IAM & Admin → Service Accounts
# Rolle hinzufügen: "Cloud Datastore User" oder "Cloud Datastore Owner"
```

### Script findet keine Tags

```bash
# Mögliche Ursachen:
# 1. Alle Tags haben bereits korrekte organizationId ✅
# 2. Service Account hat keine Leseberechtigung ❌
# 3. Collection-Name ist anders (nicht "tags") ❌

# Debug:
npx tsx -e "
const admin = require('firebase-admin');
const app = admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });
const db = admin.firestore();
db.collection('tags').limit(5).get().then(snap => {
  console.log('Tags gefunden:', snap.size);
  snap.docs.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
});
"
```

---

## Nach der Migration

### 1. Test in der App

1. Als User der migrierten Organization anmelden
2. CRM → Firmen öffnen
3. Tag-Filter öffnen
4. **Tags sollten jetzt sichtbar sein!** ✅

### 2. Verifizierung in Firestore

```bash
# Prüfe migrierte Tags:
npx tsx -e "
const admin = require('firebase-admin');
const app = admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });
const db = admin.firestore();
db.collection('tags')
  .where('_migratedAt', '!=', null)
  .get()
  .then(snap => {
    console.log('Migrierte Tags:', snap.size);
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(data.name, '→', data.organizationId, '(vorher:', data._migratedFrom + ')');
    });
    process.exit(0);
  });
"
```

### 3. Cleanup (Optional)

Nach erfolgreicher Verifikation kannst du die Audit-Felder entfernen:

```typescript
// Entferne _migratedFrom und _migratedAt Felder:
const tagsSnapshot = await db.collection('tags')
  .where('_migratedAt', '!=', null)
  .get();

for (const doc of tagsSnapshot.docs) {
  await doc.ref.update({
    _migratedFrom: admin.firestore.FieldValue.delete(),
    _migratedAt: admin.firestore.FieldValue.delete()
  });
}
```

---

## Weitere Infos

- **Bug-Fix Commit:** `b5d3e5b3`
- **Betroffene Datei:** `src/app/dashboard/contacts/crm/CompanyModal.tsx`
- **Root Cause:** userId statt organizationId in `loadTags()` und `handleCreateTag()`

---

**Letzte Aktualisierung:** 2025-11-17
