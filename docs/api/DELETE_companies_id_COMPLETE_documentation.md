# DELETE /api/v1/companies/{companyId} - Vollständige API-Dokumentation

## Übersicht
Führt ein Soft Delete einer Company durch (setzt isActive auf false).

## Endpoint Details
- **URL:** `DELETE /api/v1/companies/{companyId}`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `companies:write`
- **Rate Limit:** Standard API Rate Limit

## Path Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `companyId` | string | **Ja** | Eindeutige ID der zu löschenden Company |

## Request Body
Kein Request Body erforderlich.

## Response Schema

### Erfolgreiche Antwort (200)
```json
{
  "success": true,
  "data": {
    "message": "Company deleted successfully",
    "companyId": "38UFU9CwEMMj2Lb8srZk"
  },
  "meta": {
    "requestId": "req_1754995238218_d7emsy",
    "timestamp": "2025-08-12T10:40:38.218Z",
    "version": "v1"
  }
}
```

## Beispiel Request

### Standard DELETE Request
```bash
curl -X DELETE "https://www.celeropress.com/api/v1/companies/38UFU9CwEMMj2Lb8srZk" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Soft Delete Verhalten

### Was passiert beim DELETE:
1. **Soft Delete:** Company wird NICHT physisch gelöscht
2. **Status Update:** `isActive` wird auf `false` gesetzt
3. **Timestamp:** `updatedAt` wird aktualisiert
4. **Zusätzlich:** `deletedAt` Timestamp wird gesetzt
5. **Verfügbarkeit:** Company bleibt über GET-Requests abrufbar

### Nach dem Delete:
```json
{
  "id": "38UFU9CwEMMj2Lb8srZk",
  "name": "Company Name",
  "isActive": false,
  "updatedAt": "2025-08-12T10:40:38.086Z",
  // ... andere Felder bleiben unverändert
}
```

## Warum Soft Delete?

### Vorteile:
- **Referenzielle Integrität:** Verknüpfte Contacts/Publications bleiben funktional
- **Audit Trail:** Keine Datenverluste für Reporting
- **Wiederherstellung:** Companies können reaktiviert werden
- **Compliance:** Bessere Nachverfolgbarkeit für DSGVO/Audits

### Wiederherstellung:
Company kann über PUT-Request reaktiviert werden:
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/38UFU9CwEMMj2Lb8srZk" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung companies:write |
| 404 | RESOURCE_NOT_FOUND | Company mit dieser ID nicht gefunden |
| 409 | RESOURCE_CONFLICT | Company hat verknüpfte Kontakte (falls implementiert) |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | DATABASE_ERROR | Server-seitiger Datenbankfehler |

### Beispiel 404 Error
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Company not found"
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2025-08-12T10:40:38.218Z",
    "version": "v1"
  }
}
```

### Beispiel Conflict Error (wenn Contacts verknüpft)
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Cannot delete company with associated contacts. Remove contacts first."
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2025-08-12T10:40:38.218Z",
    "version": "v1"
  }
}
```

## Implementierungsdetails
- **Service:** Safe Companies Service (Firebase-sicher)
- **Collection:** companies_enhanced (Firestore)
- **Operation:** Firestore updateDoc (nicht deleteDoc)
- **Fields Updated:** `isActive: false`, `deletedAt: Timestamp.now()`, `updatedAt: Timestamp.now()`
- **Validation:** Prüft Existenz der Company vor Delete

## Firestore Update Query
```javascript
await updateDoc(doc(db, 'companies_enhanced', companyId), {
  isActive: false,
  deletedAt: now,
  updatedAt: now
});
```

## Auswirkungen auf andere Endpoints

### GET Endpoints:
- **GET /api/v1/companies:** Soft-deleted Companies werden standardmäßig NICHT gelistet
- **GET /api/v1/companies/{id}:** Soft-deleted Companies sind weiterhin abrufbar
- **Filter:** Über `isActive=false` Parameter können inactive Companies gelistet werden

### Search/Filter:
- Companies mit `isActive: false` werden aus Standard-Suchen ausgeschlossen
- Explizite Filterung möglich über `isActive` Parameter

## Bulk Delete
Für Bulk Delete mehrerer Companies verwenden Sie mehrere einzelne DELETE-Requests:

```bash
# Beispiel: 3 Companies löschen
for id in comp1 comp2 comp3; do
  curl -X DELETE "https://www.celeropress.com/api/v1/companies/$id" \
    -H "Authorization: Bearer YOUR_API_KEY"
done
```

## Recovery Strategien

### 1. Einzelne Company reaktivieren
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/COMPANY_ID" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

### 2. Gelöschte Companies listen
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies?isActive=false" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3. Bulk Recovery
Über mehrere PUT-Requests mit `isActive: true`

## Getestete Funktionalität ✅
- ✅ Erfolgreicher Soft Delete
- ✅ isActive auf false gesetzt
- ✅ updatedAt aktualisiert
- ✅ Company bleibt über GET abrufbar
- ✅ 404 bei nicht-existierender Company
- ✅ Live-Test erfolgreich (ID: 38UFU9CwEMMj2Lb8srZk)

## Monitoring & Logging
- Alle DELETE-Operationen werden geloggt
- requestId für Nachverfolgung
- Audit Trail über updatedAt/deletedAt Timestamps

**Status:** Vollständig funktionsfähig ✅