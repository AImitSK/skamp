# GET /api/v1/media-assets - Vollständige API-Dokumentation

## Übersicht
Ruft eine Liste aller Werbemittel (Media Assets) mit erweiterten Filteroptionen ab.

## Endpoint Details
- **URL:** `GET /api/v1/media-assets`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `advertisements:read`
- **Rate Limit:** Standard API Rate Limit

## Query Parameter

| Parameter | Typ | Required | Default | Beschreibung |
|-----------|-----|----------|---------|--------------| 
| **Textsuche** |
| `search` | string | Nein | - | Textsuche in Name, Display-Name und Beschreibung |
| **Filter** |
| `publicationIds[]` | string[] | Nein | [] | Filter nach Publication IDs |
| `types[]` | string[] | Nein | [] | Filter nach Werbemittel-Typen |
| `categories[]` | string[] | Nein | [] | Filter nach Kategorien |
| `tags[]` | string[] | Nein | [] | Filter nach Tags |
| **Preis-Filter** |
| `minPrice` | number | Nein | - | Mindestpreis |
| `maxPrice` | number | Nein | - | Maximalpreis |
| `currency` | string | Nein | - | Währung (EUR, USD, etc.) |
| `priceModels[]` | string[] | Nein | [] | Preismodelle (flat, cpm, cpc, etc.) |
| **Status** |
| `status[]` | string[] | Nein | [] | Filter nach Status (draft, active, etc.) |
| **Pagination** |
| `page` | integer | Nein | 1 | Seitennummer (min: 1) |
| `limit` | integer | Nein | 50 | Ergebnisse pro Seite (max: 100) |
| **Sortierung** |
| `sortBy` | string | Nein | createdAt | Sortierfeld |
| `sortOrder` | string | Nein | desc | Sortierreihenfolge (asc, desc) |

### Werbemittel-Typen (types)
- `display_banner` - Display Banner
- `native_ad` - Native Advertising
- `video_ad` - Video Werbung
- `text_ad` - Text-Anzeige
- `sponsored_content` - Sponsored Content
- `newsletter_ad` - Newsletter Werbung
- `social_media_ad` - Social Media Werbung

### Preismodelle (priceModels)
- `flat` - Festpreis
- `cpm` - Cost per Mille (Tausend Impressions)
- `cpc` - Cost per Click
- `cpa` - Cost per Action
- `negotiable` - Verhandelbar

### Status-Werte
- `draft` - Entwurf
- `active` - Aktiv
- `inactive` - Inaktiv
- `expired` - Abgelaufen

## Response Schema

### Erfolgreiche Antwort (200)
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": "WFeEzLgtKts84loMg1A2",
        "name": "Premium Banner Ad",
        "displayName": "Homepage Banner 728x90",
        "description": "Premium Banner Platzierung auf der Homepage",
        "publications": [
          {
            "id": "D9T6DVbAPenrmmuf6ZNq",
            "title": "Tech Magazine"
          }
        ],
        "type": "display_banner",
        "category": "Technology",
        "tags": ["Premium", "Homepage", "Banner"],
        "pricing": {
          "priceModel": "flat",
          "listPrice": {
            "currency": "EUR",
            "amount": 1500
          },
          "discounts": [],
          "minimumOrder": null
        },
        "specifications": {
          "digitalSpecs": {
            "dimensions": "728x90",
            "maxFileSize": "150KB",
            "formats": ["JPG", "PNG", "GIF"],
            "clickTracking": true,
            "thirdPartyTracking": false,
            "animated": false
          }
        },
        "availability": {
          "startDate": "2025-01-01T00:00:00.000Z",
          "endDate": "2025-12-31T23:59:59.999Z",
          "bookingDeadline": {
            "type": "business_days",
            "days": 3
          },
          "leadTime": 5
        },
        "performance": {
          "averageCTR": 0.15,
          "averageImpressions": 50000,
          "totalBookings": 12
        },
        "status": "active",
        "createdAt": "2025-08-01T21:01:13.867Z",
        "updatedAt": "2025-08-12T14:19:57.328Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 50,
    "hasNext": false
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "363cc9c8-bb37-4a32-bdda-c393d0a5ffb0",
    "timestamp": "2025-08-12T14:19:34.757Z",
    "version": "1.0.0"
  }
}
```

## Beispiel Requests

### Basis-Request (alle Werbemittel)
```bash
curl -X GET "https://www.celeropress.com/api/v1/media-assets" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Mit Pagination
```bash
curl -X GET "https://www.celeropress.com/api/v1/media-assets?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Nach Typ filtern
```bash
curl -X GET "https://www.celeropress.com/api/v1/media-assets?types[]=display_banner&types[]=video_ad" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Nach Preis-Range filtern
```bash
curl -X GET "https://www.celeropress.com/api/v1/media-assets?minPrice=100&maxPrice=1000&currency=EUR" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Nach Publications filtern
```bash
curl -X GET "https://www.celeropress.com/api/v1/media-assets?publicationIds[]=D9T6DVbAPenrmmuf6ZNq" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Erweiterte Filterung
```bash
curl -X GET "https://www.celeropress.com/api/v1/media-assets?search=banner&types[]=display_banner&priceModels[]=flat&status[]=active&tags[]=Premium&sortBy=pricing.listPrice.amount&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Response Fields Erklärung

### Core Information
- `id`: Eindeutige ID des Werbemittels
- `name`: Interner Name des Werbemittels
- `displayName`: Anzeigename für Kunden
- `description`: Detaillierte Beschreibung
- `type`: Art des Werbemittels
- `category`: Kategorie/Branche
- `tags`: Tags für Filterung

### Publications
- `publications`: Array von Publications, in denen das Werbemittel verfügbar ist
- `publications[].id`: Publication ID
- `publications[].title`: Publication Titel

### Pricing
- `pricing.priceModel`: Preismodell (flat, cpm, cpc, etc.)
- `pricing.listPrice.currency`: Währung
- `pricing.listPrice.amount`: Preis
- `pricing.discounts`: Verfügbare Rabatte
- `pricing.minimumOrder`: Mindestbestellwert

### Specifications
- `specifications.digitalSpecs`: Digitale Spezifikationen
  - `dimensions`: Banner-Größe
  - `maxFileSize`: Maximale Dateigröße
  - `formats`: Erlaubte Dateiformate
  - `clickTracking`: Click-Tracking verfügbar
  - `thirdPartyTracking`: Third-Party Tracking erlaubt
  - `animated`: Animationen erlaubt

### Availability
- `availability.startDate`: Verfügbar ab
- `availability.endDate`: Verfügbar bis
- `availability.bookingDeadline`: Buchungsfrist
- `availability.leadTime`: Vorlaufzeit in Tagen

### Performance Metrics
- `performance.averageCTR`: Durchschnittliche Click-Through-Rate
- `performance.averageImpressions`: Durchschnittliche Impressions
- `performance.totalBookings`: Anzahl bisheriger Buchungen

### Status & Metadata
- `status`: Aktueller Status (draft, active, inactive)
- `createdAt`: Erstellungszeitpunkt
- `updatedAt`: Letzte Änderung

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | INVALID_REQUEST | Ungültige Query-Parameter |
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung advertisements:read |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | INTERNAL_SERVER_ERROR | Server-seitiger Fehler |

### Beispiel Error Response
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key"
  },
  "meta": {
    "requestId": "req_123456",
    "timestamp": "2025-08-12T14:19:34.757Z",
    "version": "1.0.0"
  }
}
```

## Implementierungsdetails
- **Service:** publications-api-service.ts (getMediaAssets Methode)
- **Collection:** Firestore advertisements Collection
- **Transformation:** Safe Timestamp Handling implementiert
- **Publications Resolution:** Automatische Publication-Info Resolution

## Performance Notes
- Standard Limit: 50 Werbemittel pro Request
- Maximum Limit: 100 Werbemittel pro Request
- Client-seitige Filterung nach Server-Query
- Publications werden async geladen

## Getestete Funktionalität ✅
- ✅ Basis-Abfrage ohne Parameter
- ✅ Timestamp-Transformation funktioniert
- ✅ Publications-Informationen korrekt aufgelöst
- ✅ Response-Format und Struktur korrekt
- ✅ Live-Test erfolgreich (1 Media Asset abgerufen)

**Status:** Vollständig funktionsfähig ✅

## Related Endpoints
- `POST /api/v1/media-assets` - Neues Werbemittel erstellen
- `GET /api/v1/publications` - Publications für Werbemittel abrufen