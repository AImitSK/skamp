# GET /api/v1/publications - Vollständige API-Dokumentation

## Übersicht
Ruft eine Liste aller Publications mit erweiterten Filteroptionen und Pagination ab.

## Endpoint Details
- **URL:** `GET /api/v1/publications`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `publications:read`
- **Rate Limit:** Standard API Rate Limit

## Query Parameter

| Parameter | Typ | Required | Default | Beschreibung |
|-----------|-----|----------|---------|--------------|
| **Pagination** |
| `page` | integer | Nein | 1 | Seitennummer für Pagination (min: 1) |
| `limit` | integer | Nein | 50 | Anzahl Ergebnisse pro Seite (max: 100) |
| **Search** |
| `search` | string | Nein | - | Textsuche in Titel und Beschreibungen |
| **Publication Filters** |
| `types[]` | string[] | Nein | [] | Filterung nach Publikationstyp(en) |
| `formats[]` | string[] | Nein | [] | Filterung nach Format(en) |
| `frequencies[]` | string[] | Nein | [] | Filterung nach Erscheinungsfrequenz(en) |
| **Geographic Filters** |
| `languages[]` | string[] | Nein | [] | Filterung nach Sprache(n) |
| `countries[]` | string[] | Nein | [] | Filterung nach Land/Länder |
| **Publisher Filters** |
| `publisherIds[]` | string[] | Nein | [] | Filterung nach Publisher-IDs |
| **Content Filters** |
| `focusAreas[]` | string[] | Nein | [] | Filterung nach Themenschwerpunkten |
| `targetIndustries[]` | string[] | Nein | [] | Filterung nach Zielindustrien |
| **Metrics Filters** |
| `minCirculation` | integer | Nein | - | Mindest-Auflage |
| `maxCirculation` | integer | Nein | - | Maximal-Auflage |
| `minMonthlyVisitors` | integer | Nein | - | Mindest monatliche Besucher |
| `maxMonthlyVisitors` | integer | Nein | - | Maximal monatliche Besucher |
| **Status Filters** |
| `status[]` | string[] | Nein | [] | Filterung nach Status |
| `onlyVerified` | boolean | Nein | false | Nur verifizierte Publications |
| **Sorting** |
| `sortBy` | string | Nein | createdAt | Sortierfeld |
| `sortOrder` | string | Nein | desc | Sortierreihenfolge (asc, desc) |
| **Expansion** |
| `expand[]` | string[] | Nein | [] | Zusätzliche Daten laden (publisher) |

### Enum Values

#### Publication Types
- `magazine` - Magazin
- `newspaper` - Zeitung  
- `website` - Website
- `blog` - Blog
- `podcast` - Podcast
- `newsletter` - Newsletter

#### Publication Formats
- `print` - Gedruckt
- `online` - Online
- `hybrid` - Print + Online

#### Frequencies
- `daily` - Täglich
- `weekly` - Wöchentlich
- `monthly` - Monatlich
- `quarterly` - Vierteljährlich
- `yearly` - Jährlich

#### Sort Fields
- `title` - Nach Titel
- `createdAt` - Nach Erstellungsdatum
- `updatedAt` - Nach Änderungsdatum
- `circulation` - Nach Auflage

## Response Schema

### Erfolgreiche Antwort (200)
```json
{
  "success": true,
  "data": {
    "publications": [
      {
        "id": "q5gbzWYnn958AqyakHgU",
        "title": "Online Portal",
        "subtitle": null,
        "publisher": {
          "id": "U6bLG4zoxEhI7jpRNXk9", 
          "name": "Der Spiegel",
          "logoUrl": null
        },
        "type": "website",
        "format": "online",
        "frequency": "monthly",
        "metrics": {
          "circulation": null,
          "circulationType": null,
          "monthlyUniqueVisitors": 250000,
          "monthlyPageViews": null,
          "targetAudience": "IT-Professionals"
        },
        "languages": ["de"],
        "countries": ["DE"],
        "geographicScope": "national",
        "focusAreas": ["Technologie", "Innovation"],
        "targetIndustries": [],
        "status": "active",
        "verified": true,
        "verifiedAt": null,
        "createdAt": "2025-08-02T13:45:24.893Z",
        "updatedAt": "2025-08-04T09:25:09.108Z",
        "website": null,
        "mediaKitUrl": null
      }
    ],
    "total": 4,
    "page": 1,
    "limit": 50,
    "hasNext": false,
    "filters": {
      "types": [],
      "languages": [],
      "countries": [],
      "publisherIds": []
    }
  },
  "pagination": {
    "page": 1,
    "limit": 50, 
    "total": 4,
    "hasNext": false,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "428dc15a-4520-4ad6-8b97-234753b1a005",
    "timestamp": "2025-08-12T10:45:35.827Z",
    "version": "1.0.0"
  }
}
```

## Beispiel Requests

### Basis-Request (alle Publications)
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Mit Pagination
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?page=2&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Nur Websites auf Deutsch
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?types[]=website&languages[]=de" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Mit Publisher-Expansion
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?expand[]=publisher" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Erweiterte Filterung
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?search=tech&types[]=magazine&types[]=website&languages[]=de&countries[]=DE&onlyVerified=true&minCirculation=10000&sortBy=title&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Nach bestimmten Publishern
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?publisherIds[]=U6bLG4zoxEhI7jpRNXk9&publisherIds[]=dIc0ebQecIH6JeC2go50" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Response Fields Erklärung

### Core Information
- `id`: Eindeutige System-ID der Publication
- `title`: Haupttitel der Publication
- `subtitle`: Untertitel (optional)
- `type`: Art der Publication (magazine, website, etc.)
- `format`: Publikationsformat (print, online, hybrid)
- `frequency`: Erscheinungsfrequenz

### Publisher Information
- `publisher.id`: Publisher Company ID
- `publisher.name`: Publisher Company Name
- `publisher.logoUrl`: Publisher Logo (wenn expand=publisher)

### Metrics
- `metrics.circulation`: Auflage (bei Print)
- `metrics.monthlyUniqueVisitors`: Monatliche Unique Visitors
- `metrics.targetAudience`: Beschreibung der Zielgruppe

### Geographic & Content
- `languages`: Array der Sprachen (ISO codes)
- `countries`: Array der Länder (ISO codes) 
- `geographicScope`: Geografischer Umfang
- `focusAreas`: Thematische Schwerpunkte
- `targetIndustries`: Zielindustrien

### Status & Verification
- `status`: Publication Status (active, inactive, etc.)
- `verified`: Verification Status
- `verifiedAt`: Verification Timestamp (wenn verifiziert)

### URLs & Resources
- `website`: Publication Website
- `mediaKitUrl`: URL zum Media Kit

## Advanced Filtering Examples

### Tech Publications nur in DACH-Region
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?focusAreas[]=Technologie&countries[]=DE&countries[]=AT&countries[]=CH" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### High-Traffic Websites
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?formats[]=online&minMonthlyVisitors=100000" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Print Magazines mit hoher Auflage
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications?types[]=magazine&formats[]=print&minCirculation=50000" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | INVALID_REQUEST | Ungültige Query-Parameter |
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung publications:read |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | INTERNAL_SERVER_ERROR | Server-seitiger Fehler |

## Implementierungsdetails
- **Service:** publications-api-service.ts mit Safe Timestamp Handling
- **Collections:** Firestore publications Collection
- **Publisher Resolution:** Automatische Publisher-Info Resolution
- **Transformation:** Sichere Timestamp-Konvertierung (Firestore → ISO 8601)
- **Problem gelöst:** `verifiedAt?.toISOString()` TypeError behoben

## Performance Notes
- Standard Limit: 50 Publications pro Request
- Maximum Limit: 100 Publications pro Request
- Publisher-Expansion erhöht Response-Zeit
- Filtering wird Server-seitig durchgeführt

## Getestete Funktionalität ✅
- ✅ Basis-Abfrage ohne Parameter (4 Publications)
- ✅ Timestamp-Transformation funktioniert
- ✅ Publisher-Informationen korrekt aufgelöst
- ✅ Response-Format und Struktur korrekt
- ✅ Error-Handling funktional
- ✅ Live-Test erfolgreich

**Status:** Vollständig funktionsfähig ✅

## Bekannte Limitierungen
- Statistics Endpoint hat separate Timestamp-Probleme
- Bulk-Operations nicht über GET verfügbar
- Advanced Search könnte erweitert werden