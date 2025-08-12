# POST /api/v1/publications - Vollständige API-Dokumentation

## Übersicht
Erstellt eine neue Publication oder führt einen Bulk-Import durch.

## Endpoint Details
- **URL:** `POST /api/v1/publications`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `publications:write`
- **Rate Limit:** Standard API Rate Limit

## Request Modes

### 1. Einzelne Publication erstellen
### 2. Bulk Import (bis zu 100 Publications)

Der Endpoint erkennt automatisch den Modus basierend auf der Request-Struktur.

## Single Publication Request Body

| Field | Typ | Required | Beschreibung |
|-------|-----|----------|--------------|
| **Core Fields** |
| `title` | string | **Ja** | Titel der Publication |
| `subtitle` | string | Nein | Untertitel |
| `publisherId` | string | **Ja** | ID des Publisher (Company) |
| `type` | string | **Ja** | Publikationstyp |
| `format` | string | **Ja** | Format (print/online/hybrid) |
| **Geographic** |
| `languages` | string[] | **Ja** | Sprachen (ISO codes) |
| `countries` | string[] | **Ja** | Länder (ISO codes) |
| `geographicScope` | string | Nein | Geografischer Umfang |
| **Content** |
| `focusAreas` | string[] | Nein | Thematische Schwerpunkte |
| `targetIndustries` | string[] | Nein | Zielindustrien |
| **Metrics** |
| `frequency` | string | Nein | Erscheinungsfrequenz |
| `circulation` | number | Nein | Auflage (Print) |
| `monthlyVisitors` | number | Nein | Monatliche Besucher |
| `targetAudience` | string | Nein | Zielgruppenbeschreibung |
| **URLs** |
| `website` | string | Nein | Website URL |
| `mediaKitUrl` | string | Nein | Media Kit URL |
| **Status** |
| `status` | string | Nein | Status (default: active) |
| `verified` | boolean | Nein | Verification Status |

### Publication Types
- `magazine` - Magazin
- `newspaper` - Zeitung  
- `website` - Website
- `blog` - Blog
- `podcast` - Podcast
- `newsletter` - Newsletter

### Publication Formats
- `print` - Gedruckt
- `online` - Online
- `hybrid` - Print + Online

## Bulk Import Request Body

| Field | Typ | Required | Beschreibung |
|-------|-----|----------|--------------|
| `publications` | object[] | **Ja** | Array von Publication-Objekten (max 100) |
| `continueOnError` | boolean | Nein | Bei Fehler trotzdem fortfahren (default: true) |

## Beispiel Requests

### Einzelne Publication erstellen
```bash
curl -X POST "https://www.celeropress.com/api/v1/publications" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Claude Publication",
    "publisherId": "U6bLG4zoxEhI7jpRNXk9",
    "type": "website",
    "format": "online",
    "languages": ["de"],
    "countries": ["DE"],
    "focusAreas": ["Technologie", "Innovation"],
    "frequency": "daily",
    "website": "https://test-publication.com"
  }'
```

### Vollständige Publication mit Metriken
```bash
curl -X POST "https://www.celeropress.com/api/v1/publications" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tech Weekly Magazine",
    "subtitle": "Die führende Technologie-Publikation",
    "publisherId": "U6bLG4zoxEhI7jpRNXk9",
    "type": "magazine",
    "format": "hybrid",
    "languages": ["de", "en"],
    "countries": ["DE", "AT", "CH"],
    "geographicScope": "regional",
    "focusAreas": ["Technologie", "Innovation", "Startups"],
    "targetIndustries": ["Software", "Hardware", "AI"],
    "frequency": "weekly",
    "circulation": 25000,
    "monthlyVisitors": 100000,
    "targetAudience": "Tech-Professionals und Führungskräfte",
    "website": "https://tech-weekly.com",
    "mediaKitUrl": "https://tech-weekly.com/media-kit.pdf",
    "verified": true
  }'
```

### Bulk Import (mehrere Publications)
```bash
curl -X POST "https://www.celeropress.com/api/v1/publications" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "publications": [
      {
        "title": "Publication 1",
        "publisherId": "U6bLG4zoxEhI7jpRNXk9",
        "type": "website",
        "format": "online",
        "languages": ["de"],
        "countries": ["DE"]
      },
      {
        "title": "Publication 2", 
        "publisherId": "dIc0ebQecIH6JeC2go50",
        "type": "magazine",
        "format": "print",
        "languages": ["de"],
        "countries": ["DE"]
      }
    ],
    "continueOnError": true
  }'
```

## Response Schema

### Single Publication Response (201)
```json
{
  "success": true,
  "data": {
    "id": "e5h8Pj79NamkTUL5km1q",
    "title": "Test Claude Publication",
    "subtitle": null,
    "publisher": {
      "id": "U6bLG4zoxEhI7jpRNXk9",
      "name": "Der Spiegel"
    },
    "type": "website",
    "format": "online",
    "metrics": {},
    "languages": ["de"],
    "countries": ["DE"],
    "geographicScope": "national",
    "focusAreas": [],
    "targetIndustries": [],
    "status": "active",
    "verified": false,
    "verifiedAt": null,
    "createdAt": "2025-08-12T10:45:54.186Z",
    "updatedAt": "2025-08-12T10:45:54.186Z",
    "website": null,
    "mediaKitUrl": null
  },
  "meta": {
    "requestId": "36bea5e8-3c75-4d96-ae9a-0ccb354b4a7d",
    "timestamp": "2025-08-12T10:45:54.401Z",
    "version": "1.0.0"
  }
}
```

### Bulk Import Response (201)
```json
{
  "success": true,
  "data": {
    "totalRequested": 2,
    "successful": 2,
    "failed": 0,
    "results": [
      {
        "index": 0,
        "success": true,
        "publication": {
          "id": "abc123",
          "title": "Publication 1"
        }
      },
      {
        "index": 1,
        "success": true,
        "publication": {
          "id": "def456",
          "title": "Publication 2"
        }
      }
    ],
    "errors": []
  },
  "meta": {
    "requestId": "bulk-123456",
    "timestamp": "2025-08-12T10:45:54.401Z",
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
- `status`: "active" (wenn nicht anders angegeben)
- `verified`: false (wenn nicht anders angegeben)
- `geographicScope`: "national" (Standard)

## Validation Rules

### Required Fields
- `title`: Muss vorhanden und nicht leer
- `publisherId`: Muss existierende Company ID sein
- `type`: Muss gültiger Publication Type sein
- `format`: Muss gültiger Format sein
- `languages`: Array mit mindestens einer Sprache
- `countries`: Array mit mindestens einem Land

### Business Rules
- Publisher muss in derselben Organization existieren
- Type/Format Kombinationen werden validiert
- URLs werden auf gültiges Format geprüft
- Metriken müssen positive Zahlen sein

### Bulk Import Limits
- Maximum 100 Publications pro Request
- Bei `continueOnError: false` stoppt bei erstem Fehler
- Bei `continueOnError: true` werden erfolgreiche verarbeitet

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | REQUIRED_FIELD_MISSING | Pflichtfeld fehlt |
| 400 | VALIDATION_ERROR | Ungültige Feld-Werte |
| 400 | INVALID_REQUEST_FORMAT | Ungültiges Request-Format |
| 401 | UNAUTHORIZED | Fehlende Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung publications:write |
| 404 | RESOURCE_NOT_FOUND | Publisher nicht gefunden |
| 409 | RESOURCE_CONFLICT | Publication mit Titel bereits vorhanden |
| 413 | PAYLOAD_TOO_LARGE | Bulk Import zu groß (>100) |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | DATABASE_ERROR | Server-Fehler |

### Beispiel Validation Error
```json
{
  "success": false,
  "error": {
    "code": "REQUIRED_FIELD_MISSING",
    "message": "title is required",
    "field": "title"
  },
  "meta": {
    "requestId": "req_123456",
    "timestamp": "2025-08-12T10:45:54.401Z",
    "version": "1.0.0"
  }
}
```

### Bulk Import mit Fehlern
```json
{
  "success": true,
  "data": {
    "totalRequested": 2,
    "successful": 1,
    "failed": 1,
    "results": [
      {
        "index": 0,
        "success": true,
        "publication": {"id": "abc123"}
      },
      {
        "index": 1,
        "success": false,
        "error": {
          "code": "REQUIRED_FIELD_MISSING",
          "message": "title is required"
        }
      }
    ]
  }
}
```

## Publisher Validation

Der `publisherId` muss eine existierende Company in der gleichen Organization sein:

```bash
# Publisher vorher erstellen oder prüfen
curl -X GET "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Use Cases

### 1. Website/Blog hinzufügen
```json
{
  "title": "Tech Blog",
  "publisherId": "company-id",
  "type": "blog",
  "format": "online",
  "languages": ["de"],
  "countries": ["DE"],
  "website": "https://tech-blog.com"
}
```

### 2. Print Magazin mit Auflage
```json
{
  "title": "Business Magazin",
  "publisherId": "company-id",
  "type": "magazine",
  "format": "print",
  "languages": ["de"],
  "countries": ["DE", "AT"],
  "circulation": 50000,
  "frequency": "monthly"
}
```

### 3. Hybrid Publication
```json
{
  "title": "Digital & Print Weekly",
  "publisherId": "company-id", 
  "type": "magazine",
  "format": "hybrid",
  "languages": ["de", "en"],
  "countries": ["DE"],
  "circulation": 25000,
  "monthlyVisitors": 75000
}
```

## Implementierungsdetails
- **Service:** publications-api-service.ts
- **Collection:** Firestore publications
- **Publisher Resolution:** Automatische Company-Lookup
- **Transformation:** API Format → Publication Model
- **Bulk Processing:** Sequential mit Error Collection

## Getestete Funktionalität ✅
- ✅ Einzelne Publication erfolgreich erstellt
- ✅ Publisher-Information korrekt aufgelöst
- ✅ Automatische Feldgenerierung funktioniert
- ✅ Response-Format korrekt
- ✅ Live-Test erfolgreich (ID: e5h8Pj79NamkTUL5km1q)

**Status:** Vollständig funktionsfähig ✅

## Monitoring
- Alle CREATE-Operationen werden geloggt
- Bulk Operations mit detailliertem Erfolgs/Fehler-Tracking
- Request IDs für komplette Nachverfolgbarkeit