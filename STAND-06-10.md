# Stand: 06.10.2025 - Admin SDK Migration für Matching Cron Jobs

## ✅ Heute erfolgreich implementiert:

### 1. Admin SDK Scan-Funktion
- **Datei**: `src/lib/firebase-admin/matching-service.ts`
- **Status**: ✅ Vollständig implementiert und auf Production getestet
- **Funktionalität**:
  - Scannt alle Organisationen nach Matching-Kandidaten
  - Generiert Match-Keys (Email/Name-basiert)
  - Berechnet Quality-Scores
  - Erstellt/Aktualisiert Kandidaten in Firestore
- **Test-Ergebnis Production**:
  - 10 Organisationen gescannt
  - 692 Kontakte verarbeitet
  - 146 Kandidaten gefunden/aktualisiert
  - Keine Permission Errors mehr! 🎉
  - Laufzeit: ~101 Sekunden

### 2. Admin SDK Auto-Import-Funktion
- **Datei**: `src/lib/firebase-admin/matching-service.ts` (Funktion: `autoImportCandidates`)
- **Status**: ✅ Vollständig implementiert, aber noch nicht getestet
- **Funktionalität**:
  - Lädt pending Kandidaten über Score-Threshold
  - KI-Merge mit Gemini 2.0 Flash (optional)
  - Company Matching/Erstellung
  - Publication Matching/Erstellung
  - Contact-Erstellung mit vollständigen Daten
  - Fehlerbehandlung mit detaillierten Stats

### 3. API Routes auf Admin SDK umgestellt
- **Dateien**:
  - `src/app/api/matching/scan/route.ts` ✅ Deployed & Getestet
  - `src/app/api/matching/auto-import/route.ts` ✅ Implementiert, aber Settings-Problem

### 4. Admin SDK Settings Service erstellt
- **Datei**: `src/lib/firebase-admin/matching-settings-service.ts`
- **Status**: ⏸️ Lokal erstellt, noch nicht deployed
- **Problem gefunden**: Auto-Import Route verwendete Client SDK für Settings → konnte Settings nicht laden

---

## ⏸️ NOCH OFFEN für morgen:

### 1. Settings Service Fix deployen
**Problem**:
- Auto-Import Route meldet "Auto-import is disabled", obwohl in UI alles aktiviert ist
- Grund: Route verwendete `matchingSettingsService` (Client SDK) statt Admin SDK
- Settings konnten nicht geladen werden → Fallback auf Defaults (disabled)

**Lösung bereits implementiert**:
- ✅ Neue Datei erstellt: `src/lib/firebase-admin/matching-settings-service.ts`
- ✅ Auto-Import Route aktualisiert: Nutzt jetzt `getSettings()` und `saveSettings()` aus Admin SDK Version

**Noch zu tun**:
```bash
# Änderungen sind lokal bereit
git add src/lib/firebase-admin/matching-settings-service.ts
git add src/app/api/matching/auto-import/route.ts
git commit -m "fix: Settings Service auf Admin SDK umgestellt"
git push
```

### 2. Auto-Import auf Production testen
Nach dem Deploy:
```bash
curl -X POST "https://www.celeropress.com/api/matching/auto-import" \
  -H "Content-Type: application/json" \
  -d '{"secret":"wCF63i7NwetDOIghOneagKx1k1k41Nez6fYcxBRyoF4="}'
```

**Erwartetes Ergebnis**:
```json
{
  "success": true,
  "stats": {
    "candidatesProcessed": 146,
    "candidatesImported": X,  // Abhängig von Score ≥ 60
    "candidatesFailed": 0,
    "errors": []
  }
}
```

---

## 📊 Aktuelle Konfiguration:

### Matching Settings (in UI aktiviert):
- ✅ **KI-Daten-Merge**: Aktiviert (Gemini 2.0 Flash)
- ✅ **Automatischer Scan**: Täglich um 02:00 Uhr
- ✅ **Automatischer Import**: Aktiviert, Score-Schwellwert: 60/100
- ✅ **Import-Zeit**: Täglich um 04:00 Uhr (1h nach Scan)

### Cron Jobs (Vercel):
```json
{
  "crons": [
    {
      "path": "/api/matching/scan?secret=$CRON_SECRET",
      "schedule": "0 3 * * *"  // 3:00 AM daily (UTC+1 = 02:00 deutscher Zeit)
    },
    {
      "path": "/api/matching/auto-import?secret=$CRON_SECRET",
      "schedule": "0 4 * * *"  // 4:00 AM daily (UTC+1 = 03:00 deutscher Zeit)
    }
  ]
}
```

---

## 🔧 Technische Details:

### Admin SDK vs Client SDK
**Warum Admin SDK für Cron Jobs?**
- Client SDK benötigt Browser-Authentifizierung → funktioniert nicht in Vercel Functions
- Client SDK wirft "Permission Denied" Errors auf Server
- Admin SDK hat volle Server-side Permissions

**Was verwendet jetzt Admin SDK?**
- ✅ `scanForCandidates()` - Matching Scan
- ✅ `autoImportCandidates()` - Auto-Import
- ⏸️ `getSettings()` / `saveSettings()` - Settings (noch zu deployen)

**Was bleibt Client SDK?**
- ✅ Frontend (Super Admin Center UI)
- ✅ Manuelle Imports über UI

### Wichtige Dateien:

```
src/lib/firebase-admin/
  ├── matching-service.ts           ✅ Deployed
  └── matching-settings-service.ts  ⏸️ Lokal, noch zu deployen

src/app/api/matching/
  ├── scan/route.ts                 ✅ Deployed & funktioniert
  └── auto-import/route.ts          ⏸️ Aktualisiert, noch zu deployen
```

---

## 🚀 Nächste Schritte (Morgen):

1. **Commit & Push** der Settings Service Änderungen
2. **Warten auf Vercel Deployment** (~2 Minuten)
3. **Auto-Import testen** auf Production
4. **Verifizieren**: Wurden Kontakte importiert?
5. **Optional**: Erste Nacht abwarten und prüfen ob Cron Jobs automatisch laufen

---

## 📝 Notizen:

### Environment Variables:
- `CRON_SECRET`: `wCF63i7NwetDOIghOneagKx1k1k41Nez6fYcxBRyoF4=` (in Vercel & .env.production)
- `NEXT_PUBLIC_BASE_URL`: `https://www.celeropress.com`

### SuperAdmin Credentials (für Cron Jobs):
```typescript
const SUPER_ADMIN_USER_ID = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';
const SUPER_ADMIN_EMAIL = 'info@sk-online-marketing.de';
const SUPER_ADMIN_ORG_ID = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';
```

### Test-Scripts:
- Lokal: `scripts/test-cron-jobs.ts`
- Production: `scripts/test-cron-prod.ps1`

---

**Letzte Änderungen**: 06.10.2025, 16:50 Uhr
**Status**: Settings Service Fix bereit zum Deploy
**Nächster Test**: Auto-Import nach Deploy
