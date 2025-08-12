# GET /api/v1/companies - Vollständige API-Dokumentation

## Übersicht
Ruft eine Liste aller Companies mit Filterung und Pagination ab.

## Endpoint Details
- **URL:** `GET /api/v1/companies`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `companies:read`
- **Rate Limit:** Standard API Rate Limit

## Query Parameter

| Parameter | Typ | Required | Default | Beschreibung |
|-----------|-----|----------|---------|--------------|
| `page` | integer | Nein | 1 | Seitennummer für Pagination (min: 1) |
| `limit` | integer | Nein | 25 | Anzahl Ergebnisse pro Seite (max: 100) |
| `search` | string | Nein | - | Textsuche in Namen und Beschreibungen |
| `industry` | string/array | Nein | - | Filterung nach Industrie(n) |
| `companyType` | string/array | Nein | - | Filterung nach Company-Typ(en) |
| `mediaType` | string/array | Nein | - | Filterung nach Media-Typ(en) |
| `coverage` | string/array | Nein | - | Filterung nach Coverage-Bereich(en) |
| `country` | string | Nein | - | Filterung nach Land |
| `city` | string | Nein | - | Filterung nach Stadt |
| `tags` | string/array | Nein | - | Filterung nach Tags |
| `isActive` | boolean | Nein | - | Filterung nach Active-Status |
| `circulationMin` | integer | Nein | - | Minimum Auflage |
| `circulationMax` | integer | Nein | - | Maximum Auflage |
| `audienceSizeMin` | integer | Nein | - | Minimum Zielgruppengröße |
| `audienceSizeMax` | integer | Nein | - | Maximum Zielgruppengröße |
| `sortBy` | string | Nein | updatedAt | Sortierfeld (name, createdAt, updatedAt) |
| `sortOrder` | string | Nein | desc | Sortierreihenfolge (asc, desc) |

## Response Schema

### Erfolgreiche Antwort (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string", 
      "tradingName": "string|null",
      "legalName": "string|null",
      "displayName": "string",
      "industry": "string|null",
      "companySize": "string|null", 
      "companyType": "string|null",
      "founded": "number|null",
      "website": "string|null",
      "domain": "string|null",
      "phone": "string|null",
      "email": "string|null",
      "address": {
        "street": "string|null",
        "city": "string|null", 
        "postalCode": "string|null",
        "country": "string|null",
        "formatted": "string"
      },
      "mediaType": "string|null",
      "coverage": "string|null", 
      "circulation": "number|null",
      "audienceSize": "number|null",
      "linkedinUrl": "string|null",
      "twitterHandle": "string|null",
      "facebookUrl": "string|null",
      "instagramHandle": "string|null",
      "vatNumber": "string|null",
      "registrationNumber": "string|null",
      "tags": [
        {
          "name": "string",
          "color": "string|undefined"
        }
      ],
      "contactCount": 0,
      "publicationCount": 0,
      "notes": "string|null",
      "isActive": true,
      "createdAt": "2025-08-12T10:37:23.966Z",
      "updatedAt": "2025-08-12T10:37:23.966Z",
      "lastContactAt": "string|undefined",
      "activityScore": 30,
      "recentActivity": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 9,
    "hasNext": false,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "req_1754994766069_8q84eu",
    "timestamp": "2025-08-12T10:32:46.069Z",
    "version": "v1"
  }
}
```

## Beispiel Requests

### Basis-Request
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Mit Filterung und Pagination
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies?page=1&limit=10&search=tech&industry=software&sortBy=name&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Mit mehreren Industrien
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies?industry[]=software&industry[]=technology" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | INVALID_REQUEST | Ungültige Query-Parameter |
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung companies:read |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | DATABASE_ERROR | Server-seitiger Datenbankfehler |

### Beispiel Error Response
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR", 
    "message": "Failed to retrieve companies"
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2025-08-12T10:32:46.069Z",
    "version": "v1"
  }
}
```

## Implementierungsdetails
- **Service:** Safe Companies Service (Firebase-sicher)
- **Collections:** companies_enhanced (primär), companies (fallback)
- **Sortierung:** Client-seitig (kein Firestore orderBy wegen Index-Problemen)
- **Migration:** Legacy Companies werden automatisch on-the-fly migriert

## Getestete Funktionalität ✅
- ✅ Basis-Abfrage ohne Parameter
- ✅ Pagination (page/limit)
- ✅ Response-Format korrekt
- ✅ Error-Handling
- ✅ Authentifizierung/Autorisierung
- ✅ 9 Companies erfolgreich abgerufen (Live-Test)

**Status:** Vollständig funktionsfähig ✅