# GET /api/v1/contacts

Hole alle Kontakte der Organisation mit optionalen Filtern und Pagination.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: <api-key>`
- **Berechtigungen:** `contacts:read`

## Request

### HTTP Method
```
GET /api/v1/contacts
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key ohne "Bearer" Prefix |
| `Content-Type` | string | ❌ | Nicht erforderlich für GET |

### Query Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `page` | number | ❌ | Seitennummer (Standard: 1) | `2` |
| `limit` | number | ❌ | Anzahl pro Seite (Max: 100, Standard: 25) | `50` |
| `search` | string | ❌ | Suche in Name und E-Mail | `"Max"` |
| `isActive` | boolean | ❌ | Filter nach Status | `true` |
| `tags` | string | ❌ | Filter nach Tags (kommagetrennt) | `"wichtig,partner"` |

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "WvX36ukyyz2bqlvQikLv",
      "firstName": "Max",
      "lastName": "Mustermann",
      "fullName": "Max Mustermann",
      "email": "max@example.com",
      "phone": "123456789",
      "department": "Marketing",
      "mediaOutlets": [],
      "expertise": [],
      "tags": [
        {"name": "wichtig"},
        {"name": "partner"}
      ],
      "isActive": true,
      "contactScore": 20,
      "recentActivity": [],
      "createdAt": "2025-08-12T14:45:54.414Z",
      "updatedAt": "2025-08-12T14:45:54.414Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 10,
    "hasNext": false,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "req_1755011536886_1vtcca",
    "timestamp": "2025-08-12T15:12:16.886Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `id` | string | Eindeutige Kontakt-ID |
| `firstName` | string | Vorname |
| `lastName` | string | Nachname |
| `fullName` | string | Vollständiger Name (automatisch generiert) |
| `email` | string | E-Mail-Adresse |
| `phone` | string | Telefonnummer (optional) |
| `department` | string | Abteilung (optional) |
| `mediaOutlets` | array | Zugehörige Medienorganisationen |
| `expertise` | array | Fachgebiete |
| `tags` | array | Tags für Kategorisierung |
| `isActive` | boolean | Status (aktiv/inaktiv) |
| `contactScore` | number | Bewertung (0-100) |
| `recentActivity` | array | Letzte Aktivitäten |
| `createdAt` | string | Erstellungszeitpunkt (ISO 8601) |
| `updatedAt` | string | Letzte Änderung (ISO 8601) |

## Error Responses

### 401 Unauthorized - Ungültiger API Key
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid API key"
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

### 400 Bad Request - Ungültige Parameter
```json
{
  "success": false,
  "error": {
    "code": "INVALID_QUERY_PARAMS",
    "message": "Invalid limit parameter: must be between 1 and 100"
  }
}
```

## cURL Beispiele

### Basis-Anfrage
```bash
curl -X GET "https://www.celeropress.com/api/v1/contacts" \
  -H "Authorization: cp_live_your_api_key"
```

### Mit Pagination
```bash
curl -X GET "https://www.celeropress.com/api/v1/contacts?page=2&limit=50" \
  -H "Authorization: cp_live_your_api_key"
```

### Mit Suche und Filter
```bash
curl -X GET "https://www.celeropress.com/api/v1/contacts?search=Max&isActive=true&tags=wichtig,partner" \
  -H "Authorization: cp_live_your_api_key"
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde pro API Key
- **Burst:** 10 gleichzeitige Requests
- **Headers:** `X-RateLimit-*` für aktuelle Limits

## Berechtigungen
- **Erforderlich:** `contacts:read`
- **Zusätzlich:** Keine weiteren Berechtigungen nötig

---
**Status:** ✅ Funktioniert korrekt (10 Kontakte erfolgreich)
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1