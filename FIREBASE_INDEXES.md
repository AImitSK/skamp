# Firebase Indexes für Campaign Editor 4.0

## Erforderliche Indexes

### PDF Versions Collection

Für die PDF-Versionierung wird folgender Composite Index benötigt:

```
Collection: pdf_versions
Fields: campaignId (Ascending), version (Descending), __name__ (Ascending)
```

**Erstellen über Firebase Console:**

1. Gehe zu: https://console.firebase.google.com/v1/r/project/skamp-prod/firestore/indexes?create_composite=Ck9wcm9qZWN0cy9za2FtcC1wcm9kL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wZGZfdmVyc2lvbnMvaW5kZXhlcy9fEAEaDgoKY2FtcGFpZ25JZBABGgsKB3ZlcnNpb24QAhoMCghfX25hbWVfXxAC

2. Oder manuell erstellen:
   - Collection Group: `pdf_versions`
   - Fields:
     - `campaignId`: Ascending
     - `version`: Descending  
     - `__name__`: Ascending

**Query die diesen Index benötigt:**
```javascript
query(
  collection(db, 'pdf_versions'),
  where('campaignId', '==', campaignId),
  orderBy('version', 'desc'),
  limit(50)
)
```

**Zweck:**
Dieser Index ermöglicht das effiziente Laden der PDF-Version-Historie einer Kampagne, sortiert nach Versionsnummer (neueste zuerst).

## Index Status

- [ ] PDF Versions Index erstellt
- [ ] Index-Erstellung bestätigt
- [ ] Funktionalität getestet

## Hinweise

- Der Index kann 5-10 Minuten dauern bis er aktiv ist
- Ohne diesen Index schlägt `getVersionHistory()` fehl
- Nach Index-Erstellung sollte die PDF-Generierung funktionieren