# GET /api/v1/companies/{companyId} - Vollständige API-Dokumentation

## Übersicht
Ruft eine einzelne Company anhand ihrer ID ab.

## Endpoint Details
- **URL:** `GET /api/v1/companies/{companyId}`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `companies:read`
- **Rate Limit:** Standard API Rate Limit

## Path Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `companyId` | string | **Ja** | Eindeutige ID der Company |

## Response Schema

### Erfolgreiche Antwort (200)
```json
{
  "success": true,
  "data": {
    "id": "38UFU9CwEMMj2Lb8srZk",
    "name": "Updated Claude API Company",
    "tradingName": null,
    "legalName": null,
    "displayName": "Updated Claude API Company",
    "industry": "AI Technology",
    "companySize": null,
    "companyType": null,
    "founded": null,
    "website": "https://claude-test.com",
    "domain": "claude-test.com",
    "phone": "+49 123 456789",
    "email": null,
    "address": null,
    "mediaType": null,
    "coverage": null,
    "circulation": null,
    "audienceSize": null,
    "linkedinUrl": null,
    "twitterHandle": null,
    "facebookUrl": null,
    "instagramHandle": null,
    "vatNumber": null,
    "registrationNumber": null,
    "tags": [],
    "contactCount": 0,
    "publicationCount": 0,
    "notes": null,
    "isActive": false,
    "createdAt": "2025-08-12T10:37:23.966Z",
    "updatedAt": "2025-08-12T10:40:38.086Z",
    "lastContactAt": undefined,
    "activityScore": 40,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1754995247297_hns8x4",
    "timestamp": "2025-08-12T10:40:47.297Z",
    "version": "v1"
  }
}
```

## Beispiel Requests

### Standard Request
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies/38UFU9CwEMMj2Lb8srZk" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | INVALID_REQUEST | Ungültige companyId |
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung companies:read |
| 404 | RESOURCE_NOT_FOUND | Company mit dieser ID nicht gefunden |
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
    "timestamp": "2025-08-12T10:40:47.297Z",
    "version": "v1"
  }
}
```

## Response Fields Erklärung

### Core Information
- `id`: Eindeutige System-ID
- `name`: Primärer Firmenname
- `displayName`: Anzeigename (tradingName falls vorhanden, sonst name)
- `isActive`: Status (false = soft deleted)

### Contact Information
- `website`: Vollständige URL
- `domain`: Extrahierte Domain aus Website
- `phone`, `email`: Kontaktdaten
- `address`: Vollständiges Adress-Objekt mit formatted String

### Business Information
- `industry`: Industriezweig
- `companySize`: Unternehmensgröße
- `companyType`: Art des Unternehmens
- `founded`: Gründungsjahr

### Media Information
- `mediaType`: Art der Medienaktivitäten
- `coverage`: Abdeckungsbereich
- `circulation`: Auflage/Reichweite
- `audienceSize`: Zielgruppengröße

### Social Media
- `linkedinUrl`, `twitterHandle`, `facebookUrl`, `instagramHandle`

### Legal Information  
- `vatNumber`: USt-IdNr.
- `registrationNumber`: Handelsregisternummer

### Metadata
- `tags`: Array von Tag-Objekten mit Name (und optional Color)
- `contactCount`: Anzahl verknüpfter Kontakte
- `publicationCount`: Anzahl verknüpfter Publikationen
- `notes`: Öffentliche Notizen
- `activityScore`: Berechneter Score (0-100) basierend auf Vollständigkeit
- `createdAt`, `updatedAt`: ISO 8601 Timestamps
- `lastContactAt`: Zeitpunkt des letzten Kontakts (optional)
- `recentActivity`: Array kürzlicher Aktivitäten

## Implementierungsdetails
- **Service:** Safe Companies Service (Firebase-sicher)
- **Collections:** companies_enhanced (primär), companies (legacy fallback)
- **Migration:** Legacy Companies werden automatisch on-the-fly migriert
- **Soft Delete:** Inactive Companies (isActive: false) werden trotzdem zurückgegeben

## Data Sources
1. **Primär:** companies_enhanced Collection (neue Format)
2. **Fallback:** companies Collection (legacy Format, wird migriert)
3. **Transformation:** Legacy → Enhanced Format automatisch

## Getestete Funktionalität ✅
- ✅ Erfolgreicher Abruf existierender Company
- ✅ Korrekte Datenstruktur und -transformation
- ✅ 404 bei nicht-existierender ID
- ✅ Soft-deleted Companies werden korrekt angezeigt
- ✅ Live-Test erfolgreich (ID: 38UFU9CwEMMj2Lb8srZk)

**Status:** Vollständig funktionsfähig ✅