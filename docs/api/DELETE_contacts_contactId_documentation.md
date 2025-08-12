# DELETE /api/v1/contacts/{contactId}

Löscht einen Kontakt aus der CRM-Datenbank (Soft Delete).

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `contacts:delete`

## Request

### HTTP Method
```
DELETE /api/v1/contacts/{contactId}
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |

### Path Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `contactId` | string | ✅ | Eindeutige ID des zu löschenden Kontakts | `"hfh5BK0ImfcP7mqujsVC"` |

### Request Body
Kein Request Body erforderlich.

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Contact deleted successfully",
    "contactId": "hfh5BK0ImfcP7mqujsVC"
  },
  "meta": {
    "requestId": "req_1754988105427_hcx2vc",
    "timestamp": "2025-08-12T08:41:45.427Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `message` | string | Bestätigungsnachricht |
| `contactId` | string | ID des gelöschten Kontakts |

## Error Responses

### 404 Not Found - Kontakt nicht gefunden
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Contact not found"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T08:41:45.427Z",
    "version": "v1"
  }
}
```

### 401 Unauthorized - Ungültiger API Key
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid or expired API key"
  }
}
```

### 403 Forbidden - Fehlende Berechtigung
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Missing required permission: contacts:delete"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to delete contact"
  }
}
```

## cURL Beispiele

### Basis-Beispiel
```bash
curl -X DELETE "https://www.celeropress.com/api/v1/contacts/hfh5BK0ImfcP7mqujsVC" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Mit Fehlerbehandlung
```bash
curl -X DELETE "https://www.celeropress.com/api/v1/contacts/hfh5BK0ImfcP7mqujsVC" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -w "HTTP Status: %{http_code}\n" \
  -s -o /tmp/response.json && cat /tmp/response.json
```

### Batch Delete (mehrere Kontakte)
```bash
# Beispiel für das Löschen mehrerer Kontakte
for id in "contact1" "contact2" "contact3"; do
  curl -X DELETE "https://www.celeropress.com/api/v1/contacts/$id" \
    -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
  echo "Deleted contact: $id"
  sleep 0.1  # Rate Limiting berücksichtigen
done
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests
- **Batch Operations:** Bei vielen Löschvorgängen Rate Limits beachten

## Geschäftslogik

### Soft Delete Verhalten
- **Nicht permanent:** Kontakte werden nicht physisch gelöscht
- **Wiederherstellbar:** Gelöschte Kontakte können über Admin-Interface wiederhergestellt werden
- **Unsichtbar:** Gelöschte Kontakte erscheinen nicht mehr in Listen oder Suchen
- **Referenzen:** Bestehende Referenzen (z.B. in Kampagnen) bleiben bestehen
- **Audit Trail:** Löschvorgang wird für Compliance protokolliert

### Betroffene Daten
- **Kontakt Status:** `isActive` wird auf `false` gesetzt
- **Deleted Flags:** `deletedAt` und `deletedBy` werden gesetzt
- **E-Mail Freigabe:** E-Mail-Adresse wird für neue Kontakte wieder verfügbar
- **Suchindex:** Kontakt wird aus Suchindex entfernt

### Abhängigkeiten
- **Kampagnen:** Laufende Kampagnen-Zuordnungen bleiben bestehen
- **Aktivitäten:** Historische Aktivitäten bleiben erhalten
- **Firmen-Verknüpfungen:** Werden automatisch gelöst
- **Tags:** Tag-Zuordnungen werden entfernt

## Sicherheitsaspekte
- **Berechtigung:** Erfordert explizite `contacts:delete` Berechtigung
- **Organization Scope:** Nur Kontakte der eigenen Organisation können gelöscht werden
- **Audit Logging:** Alle Löschvorgänge werden protokolliert
- **Rollback:** Über Admin-Tools möglich (nicht über API)

## Wiederherstellung
- **Admin Interface:** Gelöschte Kontakte können über das Admin-Panel wiederhergestellt werden
- **Bulk Restore:** Massenwiederherstellung über Admin-Tools möglich
- **API Endpoint:** Aktuell kein öffentlicher Restore-Endpoint verfügbar
- **Zeitlimit:** Soft Delete Daten werden nach 90 Tagen automatisch bereinigt

## Best Practices
- **Confirmation:** UI sollte Löschvorgang bestätigen lassen
- **Backup Strategy:** Wichtige Kontakte vor Löschung exportieren
- **Batch Operations:** Bei vielen Löschvorgängen Rate Limits beachten
- **Error Handling:** 404 Errors elegant behandeln (Kontakt könnte bereits gelöscht sein)
- **User Notification:** Benutzer über erfolgreiche Löschung informieren

## Alternative Ansätze
- **Deaktivierung:** `PUT` mit `isActive: false` statt Löschung
- **Archivierung:** Tags wie "archived" statt Löschung verwenden
- **Export:** Kontakt-Export vor Löschung für Backup

## GDPR/DSGVO Compliance
- **Recht auf Löschung:** Soft Delete erfüllt DSGVO-Anforderungen
- **Aufbewahrungsfristen:** Automatische Bereinigung nach 90 Tagen
- **Audit Trail:** Compliance-konforme Protokollierung
- **Datenminimierung:** Gelöschte Kontakte werden aus aktiven Prozessen entfernt

---
**Status:** ✅ Funktioniert korrekt  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1