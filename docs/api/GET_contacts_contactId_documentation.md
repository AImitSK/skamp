# GET /api/v1/contacts/{contactId}

Lädt einen spezifischen Kontakt anhand seiner ID.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `contacts:read`

## Request

### HTTP Method
```
GET /api/v1/contacts/{contactId}
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |

### Path Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `contactId` | string | ✅ | Eindeutige ID des Kontakts | `"hfh5BK0ImfcP7mqujsVC"` |

### Query Parameters
Keine Query Parameter erforderlich.

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "hfh5BK0ImfcP7mqujsVC",
    "firstName": "Anna",
    "lastName": "Schmidt",
    "fullName": "Anna Schmidt", 
    "email": "anna@example.com",
    "phone": null,
    "jobTitle": null,
    "department": null,
    "companyId": null,
    "companyInfo": null,
    "address": null,
    "linkedinUrl": null,
    "twitterHandle": null,
    "website": null,
    "mediaOutlets": [],
    "expertise": [],
    "tags": [],
    "preferredContactMethod": null,
    "communicationFrequency": null,
    "notes": null,
    "internalNotes": null,
    "isActive": true,
    "createdAt": "2025-08-12T08:37:46.657Z",
    "updatedAt": "2025-08-12T08:37:46.657Z",
    "contactScore": 20,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1754988064337_kijmr8",
    "timestamp": "2025-08-12T08:41:04.337Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `id` | string | Eindeutige ID des Kontakts |
| `firstName` | string | Vorname |
| `lastName` | string | Nachname |
| `fullName` | string | Vollständiger Name (automatisch generiert) |
| `email` | string\|null | E-Mail-Adresse |
| `phone` | string\|null | Telefonnummer |
| `jobTitle` | string\|null | Berufsbezeichnung |
| `department` | string\|null | Abteilung |
| `companyId` | string\|null | ID der zugehörigen Firma |
| `companyInfo` | object\|null | Firmeninformationen (falls verknüpft) |
| `companyInfo.id` | string | Firmen-ID |
| `companyInfo.name` | string | Firmenname |
| `companyInfo.domain` | string | Website-Domain |
| `companyInfo.industry` | string | Branche |
| `address` | object\|null | Adressdaten |
| `address.street` | string | Straße und Hausnummer |
| `address.city` | string | Stadt |
| `address.postalCode` | string | Postleitzahl |
| `address.country` | string | Land |
| `linkedinUrl` | string\|null | LinkedIn Profil URL |
| `twitterHandle` | string\|null | Twitter Handle |
| `website` | string\|null | Website URL |
| `mediaOutlets` | string[] | Array von Medien-Outlets |
| `expertise` | string[] | Array von Fachgebieten |
| `tags` | object[] | Array von Tag-Objekten |
| `tags[].name` | string | Tag-Name |
| `preferredContactMethod` | string\|null | Bevorzugter Kontaktweg |
| `communicationFrequency` | string\|null | Kommunikationshäufigkeit |
| `notes` | string\|null | Öffentliche Notizen |
| `internalNotes` | string\|null | Interne Notizen |
| `isActive` | boolean | Ob der Kontakt aktiv ist |
| `contactScore` | number | Kontakt-Score (0-100) basierend auf Datenvollständigkeit |
| `recentActivity` | array | Liste der letzten Aktivitäten |
| `createdAt` | string | Erstellungszeitpunkt (ISO 8601) |
| `updatedAt` | string | Letzte Änderung (ISO 8601) |

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
    "timestamp": "2025-08-12T08:41:04.337Z", 
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
    "message": "Missing required permission: contacts:read"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to retrieve contact"
  }
}
```

## cURL Beispiele

### Basis-Beispiel
```bash
curl -X GET "https://www.celeropress.com/api/v1/contacts/hfh5BK0ImfcP7mqujsVC" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Mit ausführlicher Fehlerbehandlung
```bash
curl -X GET "https://www.celeropress.com/api/v1/contacts/hfh5BK0ImfcP7mqujsVC" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -w "HTTP Status: %{http_code}\n" \
  -s
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests

## Geschäftslogik
- **Company Population:** Falls `companyId` gesetzt ist, werden automatisch Firmeninformationen geladen
- **Contact Score:** Dynamisch berechnet basierend auf Datenvollständigkeit
- **Soft Delete:** Gelöschte Kontakte werden nicht zurückgegeben (404)
- **Organization Scope:** Nur Kontakte der eigenen Organisation sind sichtbar

## Verwendungszwecke
- **Kontakt-Details:** Vollständige Informationen für Detailansichten
- **Verknüpfungen:** Laden von Kontaktdaten für Zuordnungen
- **Validation:** Prüfung ob Kontakt existiert
- **Synchronisation:** Abrufen aktueller Daten

## Performance-Hinweise
- **Caching:** Response kann client-seitig für 5 Minuten gecacht werden
- **Company Data:** Firmeninformationen werden automatisch mitgeladen (falls verfügbar)
- **Recent Activity:** Wird dynamisch aus anderen Services geladen

---
**Status:** ✅ Funktioniert korrekt  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1