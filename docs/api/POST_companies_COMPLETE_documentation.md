# POST /api/v1/companies - Vollständige API-Dokumentation

## Übersicht
Erstellt eine neue Company im System.

## Endpoint Details
- **URL:** `POST /api/v1/companies`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `companies:write`
- **Rate Limit:** Standard API Rate Limit

## Request Body Schema

| Field | Typ | Required | Beschreibung |
|-------|-----|----------|--------------|
| `name` | string | **Ja** | Name der Company (wird getrimmt) |
| `tradingName` | string | Nein | Handelsname |
| `legalName` | string | Nein | Rechtlicher Name |
| `industry` | string | Nein | Industriebereich |
| `companySize` | string | Nein | Unternehmensgröße |
| `companyType` | string | Nein | Art des Unternehmens |
| `founded` | number | Nein | Gründungsjahr |
| `website` | string | Nein | Website URL (wird validiert) |
| `phone` | string | Nein | Telefonnummer |
| `email` | string | Nein | E-Mail-Adresse (wird validiert) |
| `address` | object | Nein | Adressinformationen |
| `mediaType` | string | Nein | Art der Medien |
| `coverage` | string | Nein | Abdeckungsbereich |
| `circulation` | number | Nein | Auflage/Reichweite |
| `audienceSize` | number | Nein | Zielgruppengröße |
| `linkedinUrl` | string | Nein | LinkedIn Profil URL |
| `twitterHandle` | string | Nein | Twitter Handle |
| `facebookUrl` | string | Nein | Facebook Seiten-URL |
| `instagramHandle` | string | Nein | Instagram Handle |
| `vatNumber` | string | Nein | USt-IdNr. |
| `registrationNumber` | string | Nein | Handelsregisternummer |
| `tags` | string[] | Nein | Array von Tag-Namen |
| `notes` | string | Nein | Öffentliche Notizen |
| `internalNotes` | string | Nein | Interne Notizen |

### Address Object Schema
```json
{
  "street": "string",
  "city": "string", 
  "postalCode": "string",
  "country": "string"
}
```

## Beispiel Request Body
```json
{
  "name": "Tech Innovations GmbH",
  "tradingName": "TechInno",
  "industry": "Software",
  "website": "https://techinno.com",
  "email": "contact@techinno.com",
  "phone": "+49 123 456789",
  "address": {
    "street": "Musterstraße 123",
    "city": "Berlin", 
    "postalCode": "10115",
    "country": "Deutschland"
  },
  "tags": ["Technologie", "Innovation", "Software"],
  "notes": "Vielversprechendes Tech-Startup"
}
```

## Response Schema

### Erfolgreiche Antwort (201)
```json
{
  "success": true,
  "data": {
    "id": "38UFU9CwEMMj2Lb8srZk",
    "name": "Tech Innovations GmbH",
    "tradingName": "TechInno",
    "legalName": null,
    "displayName": "TechInno",
    "industry": "Software",
    "companySize": null,
    "companyType": null,
    "founded": null,
    "website": "https://techinno.com",
    "domain": "techinno.com",
    "phone": "+49 123 456789",
    "email": "contact@techinno.com",
    "address": {
      "street": "Musterstraße 123",
      "city": "Berlin",
      "postalCode": "10115", 
      "country": "Deutschland",
      "formatted": "Musterstraße 123, Berlin, 10115, Deutschland"
    },
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
    "tags": [
      {"name": "Technologie"},
      {"name": "Innovation"},
      {"name": "Software"}
    ],
    "contactCount": 0,
    "publicationCount": 0,
    "notes": "Vielversprechendes Tech-Startup",
    "isActive": true,
    "createdAt": "2025-08-12T10:37:23.966Z",
    "updatedAt": "2025-08-12T10:37:23.966Z",
    "activityScore": 30,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1754995044213_jgi2up",
    "timestamp": "2025-08-12T10:37:24.213Z",
    "version": "v1"
  }
}
```

## Beispiel Requests

### Minimal-Request
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minimal Company"
  }'
```

### Vollständiger Request
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company Claude API",
    "website": "https://claude-test.com",
    "industry": "Software",
    "email": "test@claude-test.com",
    "tags": ["Test", "API", "Claude"]
  }'
```

## Validation Rules

### Required Fields
- `name`: Muss vorhanden und nicht leer sein

### Format Validierung  
- `website`: Muss gültige URL sein (wenn angegeben)
- `email`: Muss gültiges E-Mail-Format haben (wenn angegeben)
- `name`: Wird automatisch getrimmt

### Auto-Generated Fields
- `id`: Automatisch generierte UUID
- `organizationId`: Aus Auth-Context übernommen
- `userId`: Aus Auth-Context übernommen  
- `createdBy`: Aus Auth-Context übernommen
- `createdAt`: Automatischer Timestamp
- `updatedAt`: Automatischer Timestamp
- `isActive`: Standardwert `true`
- `activityScore`: Berechnet basierend auf Vollständigkeit
- `domain`: Extrahiert aus website URL

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | REQUIRED_FIELD_MISSING | name ist erforderlich |
| 400 | VALIDATION_ERROR | Ungültiges URL/E-Mail-Format |
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung companies:write |
| 409 | RESOURCE_CONFLICT | Company mit Name/Domain existiert bereits |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | DATABASE_ERROR | Server-seitiger Datenbankfehler |

### Beispiel Validation Error
```json
{
  "success": false,
  "error": {
    "code": "REQUIRED_FIELD_MISSING",
    "message": "name is required"
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2025-08-12T10:37:24.213Z", 
    "version": "v1"
  }
}
```

## Implementierungsdetails
- **Service:** Safe Companies Service (Firebase-sicher)
- **Collection:** companies_enhanced (Firestore)
- **Duplicat-Check:** Name und Domain werden geprüft
- **Transformation:** API Request → CompanyEnhanced Format
- **Activity Score:** Automatisch berechnet (0-100)

## Getestete Funktionalität ✅
- ✅ Erfolgreiche Company-Erstellung
- ✅ Required Field Validation (name)
- ✅ URL/E-Mail-Format-Validation
- ✅ Automatische Domain-Extraktion
- ✅ Activity Score Berechnung
- ✅ Live-Test erfolgreich (ID: 38UFU9CwEMMj2Lb8srZk)

**Status:** Vollständig funktionsfähig ✅