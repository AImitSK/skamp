# PUT /api/v1/companies/{companyId} - Vollständige API-Dokumentation

## Übersicht
Aktualisiert eine existierende Company anhand ihrer ID.

## Endpoint Details
- **URL:** `PUT /api/v1/companies/{companyId}`
- **Authentifizierung:** Bearer Token (API Key) erforderlich
- **Berechtigung:** `companies:write`
- **Rate Limit:** Standard API Rate Limit

## Path Parameter

| Parameter | Typ | Required | Beschreibung |
|-----------|-----|----------|--------------|
| `companyId` | string | **Ja** | Eindeutige ID der zu aktualisierenden Company |

## Request Body Schema

Alle Felder sind optional - nur die gewünschten Änderungen senden.

| Field | Typ | Required | Beschreibung |
|-------|-----|----------|--------------|
| `name` | string | Nein | Name der Company (wird getrimmt) |
| `tradingName` | string\|null | Nein | Handelsname |
| `legalName` | string\|null | Nein | Rechtlicher Name |
| `industry` | string\|null | Nein | Industriebereich |
| `companySize` | string\|null | Nein | Unternehmensgröße |
| `companyType` | string\|null | Nein | Art des Unternehmens |
| `founded` | number\|null | Nein | Gründungsjahr |
| `website` | string\|null | Nein | Website URL (wird validiert) |
| `phone` | string\|null | Nein | Telefonnummer |
| `email` | string\|null | Nein | E-Mail-Adresse (wird validiert) |
| `address` | object\|null | Nein | Adressinformationen |
| `mediaType` | string\|null | Nein | Art der Medien |
| `coverage` | string\|null | Nein | Abdeckungsbereich |
| `circulation` | number\|null | Nein | Auflage/Reichweite |
| `audienceSize` | number\|null | Nein | Zielgruppengröße |
| `linkedinUrl` | string\|null | Nein | LinkedIn Profil URL |
| `twitterHandle` | string\|null | Nein | Twitter Handle |
| `facebookUrl` | string\|null | Nein | Facebook Seiten-URL |
| `instagramHandle` | string\|null | Nein | Instagram Handle |
| `vatNumber` | string\|null | Nein | USt-IdNr. |
| `registrationNumber` | string\|null | Nein | Handelsregisternummer |
| `tags` | string[] | Nein | Array von Tag-Namen |
| `notes` | string\|null | Nein | Öffentliche Notizen |
| `internalNotes` | string\|null | Nein | Interne Notizen |
| `isActive` | boolean | Nein | Active-Status |

## Beispiel Request Body
```json
{
  "name": "Updated Company Name",
  "industry": "AI Technology", 
  "phone": "+49 123 456789",
  "website": "https://new-website.com",
  "tags": ["AI", "Technology", "Innovation"]
}
```

## Response Schema

### Erfolgreiche Antwort (200)
Vollständiges Company-Objekt mit aktualisierten Werten.

```json
{
  "success": true,
  "data": {
    "id": "38UFU9CwEMMj2Lb8srZk",
    "name": "Updated Company Name",
    "tradingName": null,
    "legalName": null,
    "displayName": "Updated Company Name",
    "industry": "AI Technology",
    "companySize": null,
    "companyType": null,
    "founded": null,
    "website": "https://new-website.com",
    "domain": "new-website.com",
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
    "tags": [
      {"name": "AI"},
      {"name": "Technology"}, 
      {"name": "Innovation"}
    ],
    "contactCount": 0,
    "publicationCount": 0,
    "notes": null,
    "isActive": true,
    "createdAt": "2025-08-12T10:37:23.966Z",
    "updatedAt": "2025-08-12T10:40:28.848Z",
    "lastContactAt": undefined,
    "activityScore": 40,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1754995229132_ev6v7c",
    "timestamp": "2025-08-12T10:40:29.132Z",
    "version": "v1"
  }
}
```

## Beispiel Requests

### Einzelnes Feld aktualisieren
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/38UFU9CwEMMj2Lb8srZk" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "industry": "Artificial Intelligence"
  }'
```

### Mehrere Felder aktualisieren
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/38UFU9CwEMMj2Lb8srZk" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Claude API Company",
    "industry": "AI Technology",
    "phone": "+49 123 456789",
    "website": "https://new-claude-test.com"
  }'
```

### Company deaktivieren (Soft Delete via PUT)
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/38UFU9CwEMMj2Lb8srZk" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

## Update-Verhalten

### Partial Update
- Nur gesendete Felder werden aktualisiert
- Nicht gesendete Felder bleiben unverändert
- `null` Werte überschreiben existierende Werte
- `undefined` Felder werden ignoriert

### Auto-Updates
- `updatedAt`: Automatisch auf aktuellen Timestamp gesetzt
- `domain`: Automatisch aus website extrahiert (wenn website geändert wird)
- `activityScore`: Neu berechnet basierend auf Vollständigkeit
- `displayName`: Neu berechnet (tradingName falls vorhanden, sonst name)

### Validation
- Alle Validierungsregeln wie bei POST werden angewendet
- `name`: Wird getrimmt wenn angegeben
- `website`: URL-Format wird validiert
- `email`: E-Mail-Format wird validiert

## Error Responses

| Status Code | Error Code | Beschreibung |
|-------------|------------|--------------|
| 400 | VALIDATION_ERROR | Ungültiges URL/E-Mail-Format |
| 401 | UNAUTHORIZED | Fehlende oder ungültige Authentifizierung |
| 403 | FORBIDDEN | Fehlende Berechtigung companies:write |
| 404 | RESOURCE_NOT_FOUND | Company mit dieser ID nicht gefunden |
| 409 | RESOURCE_CONFLICT | Name/Domain-Konflikt mit anderer Company |
| 429 | RATE_LIMIT_EXCEEDED | Rate Limit überschritten |
| 500 | DATABASE_ERROR | Server-seitiger Datenbankfehler |

### Beispiel Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid website URL format"
  },
  "meta": {
    "requestId": "req_123456789",
    "timestamp": "2025-08-12T10:40:29.132Z",
    "version": "v1"
  }
}
```

## Implementierungsdetails
- **Service:** Safe Companies Service (Firebase-sicher)
- **Collection:** companies_enhanced (Firestore)
- **Update Strategy:** Firestore updateDoc mit Partial Updates
- **Conflict Detection:** Name und Domain-Duplikate werden geprüft
- **Transformation:** API Update Request → Partial CompanyEnhanced

## Use Cases

### 1. Kontaktdaten aktualisieren
```json
{
  "phone": "+49 987 654321",
  "email": "new-contact@company.com"
}
```

### 2. Adresse hinzufügen/ändern
```json
{
  "address": {
    "street": "Neue Straße 456",
    "city": "München",
    "postalCode": "80331",
    "country": "Deutschland"
  }
}
```

### 3. Tags erweitern
```json
{
  "tags": ["Existing Tag", "New Tag", "Another Tag"]
}
```

### 4. Unternehmensinformationen aktualisieren
```json
{
  "companySize": "50-200 Mitarbeiter",
  "industry": "Software Development", 
  "founded": 2020
}
```

## Getestete Funktionalität ✅
- ✅ Erfolgreiche Partial Updates
- ✅ Automatische updatedAt Aktualisierung
- ✅ Domain-Extraktion bei Website-Änderung
- ✅ Activity Score Neuberechnung
- ✅ 404 bei nicht-existierender Company
- ✅ Live-Test erfolgreich (ID: 38UFU9CwEMMj2Lb8srZk)

**Status:** Vollständig funktionsfähig ✅