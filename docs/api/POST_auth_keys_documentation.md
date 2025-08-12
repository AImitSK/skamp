# POST /api/v1/auth/keys

Erstelle einen neuen API-Key für die Organisation.

## Authentifizierung
- **Methode:** Firebase Auth Token
- **Header:** `Authorization: Bearer <firebase-token>`
- **Berechtigungen:** Admin-Zugriff erforderlich

## Request

### HTTP Method
```
POST /api/v1/auth/keys
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | Firebase Auth Token im Format `Bearer <token>` |
| `Content-Type` | string | ✅ | Muss `application/json` sein |

### Request Body Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `name` | string | ✅ | Name des API-Keys für Identifikation | `"Produktions-API"` |
| `permissions` | string[] | ✅ | Array der gewährten Berechtigungen | `["contacts:read", "contacts:write"]` |
| `expiresInDays` | number | ❌ | Ablaufzeit in Tagen (Default: 365) | `90` |
| `rateLimit` | object | ❌ | Rate Limiting Einstellungen | siehe unten |
| `rateLimit.requestsPerHour` | number | ❌ | Max Requests pro Stunde (Default: 1000) | `500` |
| `rateLimit.requestsPerMinute` | number | ❌ | Max Requests pro Minute (Default: 60) | `30` |
| `allowedIPs` | string[] | ❌ | Liste erlaubter IP-Adressen | `["192.168.1.1", "10.0.0.1"]` |

### Verfügbare Berechtigungen
| Permission | Beschreibung |
|------------|--------------|
| `contacts:read` | Kontakte lesen |
| `contacts:write` | Kontakte erstellen und bearbeiten |
| `contacts:delete` | Kontakte löschen |
| `companies:read` | Firmen lesen |
| `companies:write` | Firmen erstellen und bearbeiten |
| `companies:delete` | Firmen löschen |
| `publications:read` | Publikationen lesen |
| `publications:write` | Publikationen erstellen und bearbeiten |
| `publications:delete` | Publikationen löschen |
| `advertisements:read` | Anzeigen lesen |
| `advertisements:write` | Anzeigen erstellen und bearbeiten |
| `advertisements:delete` | Anzeigen löschen |
| `webhooks:manage` | Webhooks verwalten |
| `analytics:read` | Analytics-Daten lesen |

## Response

### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "CyQ9OCDcB6GX7kQUD008",
    "name": "Test Key",
    "key": "cp_test_27d446f73205924849bb224b75d5e68a",
    "keyPreview": "cp_test_...",
    "permissions": ["contacts:read", "contacts:write"],
    "isActive": true,
    "rateLimit": {
      "requestsPerHour": 1000,
      "requestsPerMinute": 60,
      "burstLimit": 10
    },
    "usage": {
      "totalRequests": 0,
      "requestsThisHour": 0,
      "requestsToday": 0
    },
    "createdAt": "2025-08-12T08:31:15.685Z"
  },
  "meta": {
    "requestId": "req_1754987475686_1t3o1j",
    "timestamp": "2025-08-12T08:31:15.686Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `id` | string | Eindeutige ID des API-Keys |
| `name` | string | Name des API-Keys |
| `key` | string | **Vollständiger API-Key (nur bei Erstellung sichtbar!)** |
| `keyPreview` | string | Gekürzte Vorschau des Keys |
| `permissions` | string[] | Gewährte Berechtigungen |
| `isActive` | boolean | Ob der Key aktiv ist |
| `rateLimit` | object | Rate Limiting Einstellungen |
| `usage` | object | Nutzungsstatistiken |
| `createdAt` | string | Erstellungszeitpunkt (ISO 8601) |

## Error Responses

### 400 Bad Request - Fehlende Parameter
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST_DATA",
    "message": "Name and permissions are required"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T08:31:15.686Z",
    "version": "v1"
  }
}
```

### 401 Unauthorized - Ungültiger Token
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED", 
    "message": "Invalid or expired authentication token"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create API key"
  }
}
```

## cURL Beispiele

### Basis-Beispiel
```bash
curl -X POST "https://www.celeropress.com/api/v1/auth/keys" \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Produktions-API",
    "permissions": ["contacts:read", "contacts:write", "companies:read"]
  }'
```

### Erweiterte Konfiguration
```bash
curl -X POST "https://www.celeropress.com/api/v1/auth/keys" \
  -H "Authorization: Bearer <firebase-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Staging-API",
    "permissions": ["contacts:read", "companies:read"],
    "expiresInDays": 90,
    "rateLimit": {
      "requestsPerHour": 500,
      "requestsPerMinute": 30
    },
    "allowedIPs": ["192.168.1.100", "10.0.0.50"]
  }'
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests
- **Konfigurierbar** über `rateLimit` Parameter

## Sicherheitshinweise
⚠️ **WICHTIG:** Der vollständige API-Key wird nur **einmalig** bei der Erstellung zurückgegeben. Speichere ihn sicher!

- API-Keys sind sensible Daten - niemals in öffentlichen Repositories speichern
- Verwende IP-Einschränkungen für zusätzliche Sicherheit
- Regelmäßig Rotation der API-Keys
- Überwache die Usage-Statistiken

---
**Status:** ✅ Funktioniert korrekt  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1