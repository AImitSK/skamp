# DELETE /api/v1/companies/{companyId}

Löscht eine bestehende Firma aus der CRM-Datenbank (Soft Delete).

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `companies:delete`

## Request

### HTTP Method
```
DELETE /api/v1/companies/{companyId}
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |

### Path Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `companyId` | string | ✅ | Eindeutige ID der zu löschenden Firma | `"LcgPZAXaXDRijYr80yLw"` |

### Request Body
Keine Request Body erforderlich.

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "message": "Company deleted successfully",
    "companyId": "LcgPZAXaXDRijYr80yLw"
  },
  "meta": {
    "requestId": "req_1754992635203_tk1i6m",
    "timestamp": "2025-08-12T09:57:15.203Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `message` | string | Bestätigungsnachricht |
| `companyId` | string | ID der gelöschten Firma |

## Error Responses

### 404 Not Found - Firma nicht gefunden
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Company not found"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T09:57:15.203Z",
    "version": "v1"
  }
}
```

### 409 Conflict - Firma hat noch zugeordnete Kontakte
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Cannot delete company with associated contacts. Remove contacts first."
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
    "message": "Missing required permission: companies:delete"
  }
}
```

### 400 Bad Request - Ungültige Company ID
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST_PARAMETERS",
    "message": "Invalid company ID format"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error"
  }
}
```

## cURL Beispiele

### Basis-Löschung
```bash
curl -X DELETE "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Mit Verbose Output
```bash
curl -X DELETE "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -v
```

### Fehlerbehandlung testen
```bash
curl -X DELETE "https://www.celeropress.com/api/v1/companies/invalid-id" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Response in Datei speichern
```bash
curl -X DELETE "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -o delete_response.json
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests
- **Delete Operations:** Zählen als reguläre Requests

## Geschäftslogik

### Soft Delete Verhalten
- **Soft Delete:** Firmen werden nicht physisch gelöscht, sondern als inaktiv markiert
- **Data Preservation:** Alle historischen Daten bleiben erhalten
- **Referential Integrity:** Verknüpfungen zu Kontakten werden beibehalten
- **Audit Trail:** Lösch-Aktion wird vollständig protokolliert

### Abhängigkeits-Prüfung
- **Contact Check:** Prüfung auf zugeordnete aktive Kontakte
- **Publication Check:** Prüfung auf zugeordnete Publikationen
- **Integration Check:** Prüfung auf externe System-Verknüpfungen
- **Cascade Prevention:** Verhindert ungewollte Daten-Kaskaden

### Wiederherstell-Optionen
- **Admin Recovery:** Administratoren können gelöschte Firmen wiederherstellen
- **Data Export:** Gelöschte Daten können vor endgültiger Löschung exportiert werden
- **Compliance Retention:** Daten werden entsprechend rechtlicher Vorgaben aufbewahrt

## Validation Rules
- **ID Format:** Company ID muss gültiges Firestore Document ID Format haben
- **Ownership:** Firma muss zur Organisation des API Keys gehören
- **Status:** Bereits gelöschte Firmen können nicht erneut gelöscht werden
- **Dependencies:** Aktive Abhängigkeiten müssen vor Löschung entfernt werden

## Data Impact
- **Company Record:** `isActive` wird auf `false` gesetzt
- **Deletion Timestamp:** `deletedAt` wird auf aktuellen Zeitstempel gesetzt
- **Deletion User:** `deletedBy` wird mit User ID gesetzt
- **Search Exclusion:** Firma wird aus Standard-Suchergebnissen entfernt

## Security Considerations
- **Permission Enforcement:** Strikte Prüfung der `companies:delete` Berechtigung
- **Organization Isolation:** Löschung nur innerhalb der eigenen Organisation
- **Audit Logging:** Vollständige Protokollierung aller Lösch-Aktivitäten
- **Recovery Protection:** Schutz vor unautorisierten Wiederherstellungen

## Performance Implications
- **Single Operation:** Einzelne Firestore-Update-Operation
- **Index Updates:** Automatische Aktualisierung aller relevanten Indizes
- **Cache Invalidation:** Clearing von relevanten Cache-Einträgen
- **Real-time Updates:** Benachrichtigung verbundener Clients über Änderungen

## Compliance Features
- **GDPR Compliance:** Unterstützung für "Right to be Forgotten"
- **Data Retention:** Konfigurierbare Aufbewahrungszeiten
- **Export Options:** Vollständiger Daten-Export vor endgültiger Löschung
- **Audit Trail:** Lückenlose Nachverfolgung aller Lösch-Operationen

## Error Handling Strategies
- **Graceful Degradation:** Teilweise Löschung mit Fehler-Report
- **Rollback Capability:** Automatisches Rollback bei kritischen Fehlern
- **Dependency Resolution:** Hilfreiche Fehlermeldugen bei Abhängigkeits-Konflikten
- **Recovery Guidance:** Klare Anweisungen zur Problembehebung

## Integration Impact
- **External Systems:** Benachrichtigung verbundener Systeme über Löschung
- **Webhooks:** Auslösung von `company.deleted` Webhook-Events
- **Search Indexes:** Entfernung aus Suchindizes
- **Analytics:** Update von Berichts- und Dashboard-Daten

## Verwendungszwecke
- **Data Cleanup:** Bereinigung von Test- oder Duplikat-Daten
- **Compliance Requests:** GDPR "Right to be Forgotten" Umsetzung
- **Account Closure:** Vollständige Entfernung bei Kunden-Kündigung
- **Data Migration:** Bereinigung vor System-Migrationen

## Best Practices
- **Backup First:** Immer Backup vor kritischen Lösch-Operationen
- **Dependency Check:** Manuelle Prüfung aller Abhängigkeiten vor Löschung
- **User Confirmation:** Doppelte Bestätigung bei kritischen Operationen
- **Recovery Plan:** Klare Strategie für Wiederherstellung falls erforderlich

---
**Status:** 🔄 In Reparatur - Service-Problem diagnostiziert  
**Problem:** Next.js 15 Parameter-Parsing repariert, aber Firebase Service-Layer hat Import-/Collection-Probleme  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1