# GET /api/v1/publications/{publicationId} - Vollständige API-Dokumentation

## Übersicht
Ruft eine einzelne Publication anhand ihrer ID ab.

## Endpoint Details
- **URL:** `GET /api/v1/publications/{publicationId}`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `publications:read`
- **Rate Limit:** Standard API Rate Limit

## Path Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `publicationId` | string | **Ja** | Eindeutige ID der Publication |

## Query Parameter (Optional)

| Parameter | Typ | Required | Default | Beschreibung |
|-----------|-----|----------|---------|--------------|
| `expand[]` | string[] | Nein | [] | Zusätzliche Daten laden |

### Expansion Options
- `publisher` - Detaillierte Publisher-Informationen laden
- `metrics` - Erweiterte Metriken laden
- `content` - Content-spezifische Details

## Response Schema

### Erfolgreiche Antwort (200)
```json
{
  "success": true,
  "data": {
    "id": "e5h8Pj79NamkTUL5km1q",
    "title": "Test Claude Publication",
    "subtitle": null,
    "publisher": {
      "id": "U6bLG4zoxEhI7jpRNXk9",
      "name": "Der Spiegel",
      "logoUrl": null
    },
    "type": "website",
    "format": "online",
    "frequency": null,
    "metrics": {
      "circulation": null,
      "circulationType": null,
      "monthlyUniqueVisitors": null,
      "monthlyPageViews": null,
      "targetAudience": null
    },
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
    "requestId": "e43a0a9e-34e8-46a8-bd71-808a7a3289d0",
    "timestamp": "2025-08-12T10:46:04.475Z",
    "version": "1.0.0"
  }
}
```

### Mit Publisher-Expansion
```json
{
  "success": true,
  "data": {
    "id": "e5h8Pj79NamkTUL5km1q",
    "title": "Test Claude Publication",
    "publisher": {
      "id": "U6bLG4zoxEhI7jpRNXk9",
      "name": "Der Spiegel",
      "logoUrl": "https://example.com/logo.png",
      "website": "https://spiegel.de",
      "industry": "Media"
    },
    // ... andere Felder
  }
}
```

## Beispiel Requests

### Standard Request
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications/e5h8Pj79NamkTUL5km1q" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Mit Publisher-Expansion
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications/e5h8Pj79NamkTUL5km1q?expand[]=publisher" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Mit mehreren Expansions
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications/e5h8Pj79NamkTUL5km1q?expand[]=publisher&expand[]=metrics" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Response Fields Erklärung

### Core Information
- `id`: Eindeutige System-ID der Publication
- `title`: Haupttitel der Publication
- `subtitle`: Untertitel (optional)
- `type`: Art der Publication (magazine, website, blog, etc.)
- `format`: Publikationsformat (print, online, hybrid)
- `frequency`: Erscheinungsfrequenz (daily, weekly, monthly, etc.)

### Publisher Information
- `publisher.id`: Publisher Company ID
- `publisher.name`: Publisher Company Name  
- `publisher.logoUrl`: Publisher Logo URL (wenn expand=publisher)

### Metrics & Audience
- `metrics.circulation`: Print-Auflage
- `metrics.circulationType`: Art der Auflage (printed, distributed, etc.)
- `metrics.monthlyUniqueVisitors`: Monatliche eindeutige Besucher
- `metrics.monthlyPageViews`: Monatliche Seitenaufrufe
- `metrics.targetAudience`: Beschreibung der Zielgruppe

### Geographic & Content
- `languages`: Array der Publikationssprachen (ISO codes)
- `countries`: Array der Zielländer (ISO codes)
- `geographicScope`: Geografischer Reichweite (local, national, international)
- `focusAreas`: Thematische Schwerpunkte
- `targetIndustries`: Zielindustrien

### Status & Verification
- `status`: Publication Status (active, inactive, suspended, etc.)
- `verified`: Verification Status (boolean)
- `verifiedAt`: Zeitstempel der Verifizierung (ISO 8601)

### URLs & Resources
- `website`: Haupt-Website der Publication
- `mediaKitUrl`: Link zum Media Kit

### Metadata
- `createdAt`: Erstellungszeitpunkt (ISO 8601)
- `updatedAt`: Letztes Update (ISO 8601)

## Publication Types Details

### Magazine
```json
{
  "type": "magazine",
  "format": "print|hybrid",
  "metrics": {
    "circulation": 50000,
    "circulationType": "printed"
  }
}
```

### Website/Blog
```json
{
  "type": "website",
  "format": "online",
  "metrics": {
    "monthlyUniqueVisitors": 250000,
    "monthlyPageViews": 1000000
  }
}
```

### Newspaper
```json
{
  "type": "newspaper", 
  "format": "print|hybrid",
  "frequency": "daily",
  "metrics": {
    "circulation": 100000
  }
}
```

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | INVALID_REQUEST | Ungültige publicationId |
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung publications:read |
| 404 | RESOURCE_NOT_FOUND | Publication mit dieser ID nicht gefunden |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | DATABASE_ERROR | Server-seitiger Datenbankfehler |

### Beispiel 404 Error
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Publication not found"
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2025-08-12T10:46:04.475Z",
    "version": "1.0.0"
  }
}
```

## Expansion Behavior

### publisher Expansion
Lädt detaillierte Publisher-Informationen:
- Vollständige Company-Daten
- Logo URL
- Website
- Industry Information
- Contact Details

### metrics Expansion  
Lädt erweiterte Metriken:
- Historical Data
- Trend Information
- Comparative Metrics
- Audience Demographics

### content Expansion
Lädt Content-spezifische Details:
- Editorial Calendar
- Content Categories
- Recent Articles/Issues
- Content Guidelines

## Use Cases

### 1. Publication-Details für Media Kit
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications/ID?expand[]=publisher&expand[]=metrics" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 2. Publisher-Lookup für Contact
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications/ID?expand[]=publisher" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3. Basic Publication Info
```bash
curl -X GET "https://www.celeropress.com/api/v1/publications/ID" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Performance Notes
- Base Request: ~100ms Response Time
- Publisher Expansion: +50ms (Company Lookup)
- Metrics Expansion: +30ms (Additional Queries)
- Multiple Expansions: Additive Performance Impact

## Caching Strategy
- Base Publication Data: 5min Cache
- Publisher Information: 15min Cache
- Metrics Data: 30min Cache

## Implementierungsdetails
- **Service:** publications-api-service.ts
- **Collection:** Firestore publications
- **Publisher Resolution:** Safe Companies Service Integration
- **Timestamp Handling:** Sichere Firestore → ISO 8601 Konvertierung
- **Error Handling:** Graceful Degradation bei Publisher-Lookups

## Data Sources
1. **Primär:** publications Collection (Firestore)
2. **Publisher:** companies_enhanced Collection (via Safe Service)
3. **Metrics:** Historical metrics aggregation (optional)

## Security Notes
- Publications sind organization-scoped
- Publisher muss in gleicher Organization sein
- Soft-deleted Publications sind nicht abrufbar

## Getestete Funktionalität ✅
- ✅ Erfolgreicher Abruf existierender Publication
- ✅ Korrekte Datenstruktur und -transformation  
- ✅ 404 bei nicht-existierender ID
- ✅ Publisher-Informationen korrekt aufgelöst
- ✅ Sichere Timestamp-Transformation
- ✅ Live-Test erfolgreich (ID: e5h8Pj79NamkTUL5km1q)

**Status:** Vollständig funktionsfähig ✅

## Related Endpoints
- `GET /api/v1/publications` - List all Publications
- `POST /api/v1/publications` - Create new Publication
- `PUT /api/v1/publications/{id}` - Update Publication
- `DELETE /api/v1/publications/{id}` - Delete Publication
- `GET /api/v1/companies/{publisherId}` - Get Publisher Details