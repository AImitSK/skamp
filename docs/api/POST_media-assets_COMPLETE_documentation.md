# POST /api/v1/media-assets - Vollständige API-Dokumentation

## Übersicht
Erstellt ein neues Werbemittel (Media Asset) für eine oder mehrere Publications.

## Endpoint Details
- **URL:** `POST /api/v1/media-assets`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `advertisements:write`
- **Rate Limit:** Standard API Rate Limit

## Request Body

| Field | Typ | Required | Beschreibung |
|-------|-----|----------|--------------|
| **Core Fields** |
| `name` | string | **Ja** | Interner Name des Werbemittels |
| `displayName` | string | Nein | Anzeigename für Kunden |
| `description` | string | Nein | Detaillierte Beschreibung |
| `publicationIds` | string[] | **Ja** | IDs der Publications |
| `type` | string | **Ja** | Typ des Werbemittels |
| `category` | string | Nein | Kategorie/Branche |
| `tags` | string[] | Nein | Tags für Organisation |
| **Pricing** |
| `pricing` | object | **Ja** | Preisinformationen |
| `pricing.priceModel` | string | **Ja** | Preismodell (flat, cpm, cpc, etc.) |
| `pricing.listPrice` | object | **Ja** | Listenpreis |
| `pricing.listPrice.currency` | string | **Ja** | Währung (EUR, USD, etc.) |
| `pricing.listPrice.amount` | number | **Ja** | Preis |
| `pricing.discounts` | array | Nein | Verfügbare Rabatte |
| `pricing.minimumOrder` | object | Nein | Mindestbestellwert |
| **Specifications** |
| `specifications` | object | Nein | Technische Spezifikationen |
| `specifications.digitalSpecs` | object | Nein | Digitale Specs |
| `specifications.digitalSpecs.dimensions` | string | Nein | Banner-Größe (z.B. "728x90") |
| `specifications.digitalSpecs.maxFileSize` | string | Nein | Max. Dateigröße |
| `specifications.digitalSpecs.formats` | string[] | Nein | Erlaubte Formate |
| `specifications.digitalSpecs.clickTracking` | boolean | Nein | Click-Tracking verfügbar |
| `specifications.digitalSpecs.thirdPartyTracking` | boolean | Nein | Third-Party Tracking |
| `specifications.digitalSpecs.animated` | boolean | Nein | Animationen erlaubt |
| **Availability** |
| `availability` | object | Nein | Verfügbarkeit |
| `availability.startDate` | string | Nein | Verfügbar ab (ISO 8601) |
| `availability.endDate` | string | Nein | Verfügbar bis (ISO 8601) |
| `availability.bookingDeadline` | object | Nein | Buchungsfrist |
| `availability.leadTime` | number | Nein | Vorlaufzeit in Tagen |

### Werbemittel-Typen
- `display_banner` - Display Banner
- `native_ad` - Native Advertising  
- `video_ad` - Video Werbung
- `text_ad` - Text-Anzeige
- `sponsored_content` - Sponsored Content
- `newsletter_ad` - Newsletter Werbung
- `social_media_ad` - Social Media Werbung

### Preismodelle
- `flat` - Festpreis
- `cpm` - Cost per Mille
- `cpc` - Cost per Click
- `cpa` - Cost per Action
- `negotiable` - Verhandelbar

## Beispiel Requests

### Basis Werbemittel erstellen
```bash
curl -X POST "https://www.celeropress.com/api/v1/media-assets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Homepage Banner",
    "displayName": "Premium Homepage Banner",
    "publicationIds": ["D9T6DVbAPenrmmuf6ZNq"],
    "type": "display_banner",
    "category": "Technology",
    "description": "Premium Banner Platzierung auf der Homepage",
    "pricing": {
      "priceModel": "flat",
      "listPrice": {
        "currency": "EUR",
        "amount": 1500
      }
    },
    "tags": ["Premium", "Homepage"]
  }'
```

### Display Banner mit Spezifikationen
```bash
curl -X POST "https://www.celeropress.com/api/v1/media-assets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Leaderboard Banner",
    "displayName": "Top Leaderboard 728x90",
    "publicationIds": ["D9T6DVbAPenrmmuf6ZNq"],
    "type": "display_banner",
    "category": "Technology",
    "pricing": {
      "priceModel": "cpm",
      "listPrice": {
        "currency": "EUR",
        "amount": 25
      }
    },
    "specifications": {
      "digitalSpecs": {
        "dimensions": "728x90",
        "maxFileSize": "150KB",
        "formats": ["JPG", "PNG", "GIF"],
        "clickTracking": true,
        "thirdPartyTracking": true,
        "animated": false
      }
    },
    "availability": {
      "bookingDeadline": {
        "type": "business_days",
        "days": 5
      },
      "leadTime": 7
    }
  }'
```

### Video Ad mit Zeitbegrenzung
```bash
curl -X POST "https://www.celeropress.com/api/v1/media-assets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pre-Roll Video Ad",
    "displayName": "15-Second Pre-Roll",
    "publicationIds": ["pub1", "pub2"],
    "type": "video_ad",
    "category": "Entertainment",
    "pricing": {
      "priceModel": "cpm",
      "listPrice": {
        "currency": "EUR",
        "amount": 45
      }
    },
    "specifications": {
      "digitalSpecs": {
        "duration": "15s",
        "formats": ["MP4", "WEBM"],
        "maxFileSize": "10MB",
        "clickTracking": true
      }
    },
    "availability": {
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z"
    }
  }'
```

### Native Ad mit Rabatt
```bash
curl -X POST "https://www.celeropress.com/api/v1/media-assets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Native Article Ad",
    "displayName": "Sponsored Article Placement",
    "publicationIds": ["D9T6DVbAPenrmmuf6ZNq"],
    "type": "native_ad",
    "category": "Business",
    "pricing": {
      "priceModel": "flat",
      "listPrice": {
        "currency": "EUR",
        "amount": 2500
      },
      "discounts": [
        {
          "type": "volume",
          "description": "10% bei 3+ Buchungen",
          "percentage": 10,
          "minQuantity": 3
        }
      ]
    }
  }'
```

## Response Schema

### Erfolgreiche Antwort (201)
```json
{
  "success": true,
  "data": {
    "id": "3VJV7ZL1C9cRK3SUJXfr",
    "name": "Test Claude Media Asset",
    "displayName": "Claude Test Banner",
    "description": "Test Media Asset erstellt über API",
    "publications": [
      {
        "id": "D9T6DVbAPenrmmuf6ZNq",
        "title": "Tech Magazine"
      }
    ],
    "type": "display_banner",
    "category": "Technology",
    "tags": ["Test", "API", "Claude"],
    "pricing": {
      "priceModel": "flat",
      "listPrice": {
        "currency": "EUR",
        "amount": 199
      }
    },
    "specifications": {
      "digitalSpecs": {
        "clickTracking": true,
        "thirdPartyTracking": false,
        "animated": false
      }
    },
    "availability": {},
    "status": "draft",
    "createdAt": "2025-08-12T14:19:57.328Z",
    "updatedAt": "2025-08-12T14:19:57.328Z"
  },
  "meta": {
    "requestId": "ad5d15ab-8df9-4117-8737-da283bff4b46",
    "timestamp": "2025-08-12T14:19:57.667Z",
    "version": "1.0.0"
  }
}
```

## Auto-Generated Fields

Bei der Erstellung werden automatisch gesetzt:
- `id`: Eindeutige UUID
- `organizationId`: Aus Auth-Context
- `createdBy`: User ID aus Auth-Context
- `createdAt`: Aktueller Timestamp
- `updatedAt`: Aktueller Timestamp
- `status`: "draft" (Standard)
- `performance`: Leere Performance-Metriken

## Validation Rules

### Required Fields
- `name`: Muss vorhanden und nicht leer sein
- `publicationIds`: Mindestens eine gültige Publication ID
- `type`: Muss gültiger Werbemittel-Typ sein
- `pricing.priceModel`: Muss gültiges Preismodell sein
- `pricing.listPrice`: Muss Currency und Amount haben

### Business Rules
- Publications müssen in derselben Organization existieren
- Preis muss positiv sein (amount > 0)
- Start-/End-Datum müssen logisch sein (start < end)
- Booking Deadline muss positiv sein

### Format Validation
- ISO 8601 für Datumsfelder
- Währungscodes nach ISO 4217
- Dimensions Format: "WIDTHxHEIGHT"

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | REQUIRED_FIELD_MISSING | Pflichtfeld fehlt |
| 400 | VALIDATION_ERROR | Ungültige Feld-Werte |
| 401 | UNAUTHORIZED | Fehlende Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung advertisements:write |
| 404 | RESOURCE_NOT_FOUND | Publication nicht gefunden |
| 409 | RESOURCE_CONFLICT | Werbemittel mit Name bereits vorhanden |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | DATABASE_ERROR | Server-Fehler |

### Beispiel Validation Error
```json
{
  "success": false,
  "error": {
    "code": "REQUIRED_FIELD_MISSING",
    "message": "name is required",
    "field": "name"
  },
  "meta": {
    "requestId": "req_123456",
    "timestamp": "2025-08-12T14:19:57.667Z",
    "version": "1.0.0"
  }
}
```

## Publication Validation

Die `publicationIds` müssen existierende Publications in der gleichen Organization sein:

```bash
# Publications vorher prüfen
curl -X GET "https://www.celeropress.com/api/v1/publications" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Use Cases

### 1. Banner Ad für Multiple Publications
```json
{
  "name": "Multi-Pub Banner",
  "publicationIds": ["pub1", "pub2", "pub3"],
  "type": "display_banner",
  "pricing": {
    "priceModel": "flat",
    "listPrice": {"currency": "EUR", "amount": 500}
  }
}
```

### 2. CPM-basierte Video Ad
```json
{
  "name": "Video Campaign Q1",
  "publicationIds": ["video-portal-id"],
  "type": "video_ad",
  "pricing": {
    "priceModel": "cpm",
    "listPrice": {"currency": "EUR", "amount": 35}
  }
}
```

### 3. Newsletter Sponsoring
```json
{
  "name": "Weekly Newsletter Ad",
  "publicationIds": ["newsletter-id"],
  "type": "newsletter_ad",
  "pricing": {
    "priceModel": "flat",
    "listPrice": {"currency": "EUR", "amount": 750}
  }
}
```

## Implementierungsdetails
- **Service:** publications-api-service.ts (createMediaAsset Methode)
- **Collection:** Firestore advertisements Collection
- **Publication Resolution:** Automatische Validierung
- **Transformation:** API Format → Advertisement Model

## Getestete Funktionalität ✅
- ✅ Werbemittel erfolgreich erstellt
- ✅ Publication-Validierung funktioniert
- ✅ Automatische Feldgenerierung korrekt
- ✅ Response-Format korrekt
- ✅ Live-Test erfolgreich (ID: 3VJV7ZL1C9cRK3SUJXfr)

**Status:** Vollständig funktionsfähig ✅

## Monitoring
- Alle CREATE-Operationen werden geloggt
- Request IDs für komplette Nachverfolgbarkeit
- Performance-Metriken werden nach ersten Buchungen gefüllt