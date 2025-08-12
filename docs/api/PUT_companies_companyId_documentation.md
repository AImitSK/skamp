# PUT /api/v1/companies/{companyId}

Aktualisiert eine bestehende Firma mit neuen Daten.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `companies:write`

## Request

### HTTP Method
```
PUT /api/v1/companies/{companyId}
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |
| `Content-Type` | string | ✅ | Muss `application/json` sein |

### Path Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `companyId` | string | ✅ | Eindeutige ID der zu aktualisierenden Firma | `"LcgPZAXaXDRijYr80yLw"` |

### Request Body Parameters
Alle Felder sind optional - nur die zu aktualisierenden Felder müssen gesendet werden.

| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `name` | string | ❌ | Neuer offizieller Firmenname | `"Tech Solutions GmbH"` |
| `tradingName` | string\|null | ❌ | Neuer Handelsname | `"TechSol"` |
| `legalName` | string\|null | ❌ | Neuer juristischer Name | `"Tech Solutions Gesellschaft mit beschränkter Haftung"` |
| `industry` | string\|null | ❌ | Neue Branche | `"Software"`, `"Medien"`, `"Beratung"` |
| `companySize` | string\|null | ❌ | Neue Firmengröße | `"startup"`, `"small"`, `"medium"`, `"large"` |
| `companyType` | string\|null | ❌ | Neuer Firmentyp | `"customer"`, `"supplier"`, `"partner"`, `"competitor"` |
| `founded` | string\|null | ❌ | Neues Gründungsdatum (ISO 8601) | `"2020-01-15"` |
| `website` | string\|null | ❌ | Neue Website URL | `"https://techsolutions.de"` |
| `phone` | string\|null | ❌ | Neue Haupt-Telefonnummer | `"+49 89 123456789"` |
| `email` | string\|null | ❌ | Neue Haupt-E-Mail-Adresse | `"info@techsolutions.de"` |
| `address` | object\|null | ❌ | Neue Firmenadresse | siehe unten |
| `address.street` | string | ❌ | Neue Straße und Hausnummer | `"Friedrichstraße 123"` |
| `address.city` | string | ❌ | Neue Stadt | `"Berlin"` |
| `address.postalCode` | string | ❌ | Neue Postleitzahl | `"10117"` |
| `address.country` | string | ❌ | Neues Land | `"Deutschland"` |
| `mediaType` | string\|null | ❌ | Neuer Medientyp | `"print"`, `"digital"`, `"tv"`, `"radio"` |
| `coverage` | string\|null | ❌ | Neue Reichweite | `"national"`, `"regional"`, `"local"` |
| `circulation` | number\|null | ❌ | Neue Auflage | `50000` |
| `audienceSize` | number\|null | ❌ | Neue Zielgruppengröße | `1000000` |
| `linkedinUrl` | string\|null | ❌ | Neue LinkedIn URL | `"https://linkedin.com/company/techsol"` |
| `twitterHandle` | string\|null | ❌ | Neuer Twitter Handle | `"techsol"` |
| `facebookUrl` | string\|null | ❌ | Neue Facebook URL | `"https://facebook.com/techsol"` |
| `instagramHandle` | string\|null | ❌ | Neuer Instagram Handle | `"techsol"` |
| `vatNumber` | string\|null | ❌ | Neue Umsatzsteuer-ID | `"DE987654321"` |
| `registrationNumber` | string\|null | ❌ | Neue Handelsregisternummer | `"HRB 98765"` |
| `tags` | string[]\|null | ❌ | Neue Tags (überschreibt alle bestehenden) | `["Kunde", "Software", "KI"]` |
| `notes` | string\|null | ❌ | Neue öffentliche Notizen | `"Wichtiger Partner im Bereich KI"` |
| `internalNotes` | string\|null | ❌ | Neue interne Notizen | `"Vertrag läuft Ende 2025 aus"` |
| `isActive` | boolean | ❌ | Neuer Aktivitätsstatus | `true`, `false` |

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "LcgPZAXaXDRijYr80yLw",
    "name": "Tech Solutions GmbH",
    "tradingName": "TechSol",
    "legalName": "Tech Solutions Gesellschaft mit beschränkter Haftung",
    "displayName": "TechSol",
    "industry": "Software",
    "companySize": "medium",
    "companyType": "customer",
    "founded": "2018-03-15",
    "website": "https://techsolutions.de",
    "domain": "techsolutions.de",
    "phone": "+49 89 987654321",
    "email": "info@techsolutions.de",
    "address": {
      "street": "Maximilianstraße 1",
      "city": "München",
      "postalCode": "80539",
      "country": "Deutschland",
      "formatted": "Maximilianstraße 1, München, 80539, Deutschland"
    },
    "mediaType": null,
    "coverage": null,
    "circulation": null,
    "audienceSize": null,
    "linkedinUrl": "https://linkedin.com/company/techsol",
    "twitterHandle": "techsol",
    "facebookUrl": null,
    "instagramHandle": null,
    "vatNumber": "DE987654321",
    "registrationNumber": "HRB 98765",
    "tags": [
      { "name": "Kunde", "color": null },
      { "name": "Software", "color": null },
      { "name": "KI", "color": null }
    ],
    "contactCount": 12,
    "publicationCount": 0,
    "notes": "Wichtiger Partner im Bereich KI",
    "internalNotes": "Vertrag läuft Ende 2025 aus",
    "isActive": true,
    "createdAt": "2018-03-15T10:30:00.000Z",
    "updatedAt": "2025-08-12T10:15:22.456Z",
    "lastContactAt": "2025-08-10T14:22:00.000Z",
    "activityScore": 87,
    "recentActivity": [
      {
        "type": "company_updated",
        "description": "Firma aktualisiert: Name geändert",
        "timestamp": "2025-08-12T10:15:22.456Z"
      }
    ]
  },
  "meta": {
    "requestId": "req_1754992500494_v1eu0p",
    "timestamp": "2025-08-12T10:15:22.456Z",
    "version": "v1"
  }
}
```

### Response Fields
Die Response enthält alle Felder wie bei `GET /api/v1/companies/{companyId}` mit den aktualisierten Werten und einer neuen `updatedAt` Zeit.

## Error Responses

### 400 Bad Request - Validierungsfehler
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T10:15:22.456Z",
    "version": "v1"
  }
}
```

### 404 Not Found - Firma nicht gefunden
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Company not found"
  }
}
```

### 409 Conflict - Name/Domain bereits vergeben
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Another company with this name or domain already exists"
  }
}
```

### 401 Unauthorized - Ungültiger API Key
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid or expired API key"
  }
}
```

### 403 Forbidden - Fehlende Berechtigung
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Missing required permission: companies:write"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Internal server error"
  }
}
```

## cURL Beispiele

### Basis-Update (Name ändern)
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Tech Solutions GmbH"
  }'
```

### Mehrere Felder aktualisieren
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Solutions GmbH",
    "tradingName": "TechSolutions",
    "industry": "Software",
    "companySize": "large",
    "website": "https://techsolutions.de",
    "phone": "+49 89 123456789",
    "email": "contact@techsolutions.de"
  }'
```

### Adresse aktualisieren
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "address": {
      "street": "Neue Straße 42",
      "city": "Hamburg",
      "postalCode": "20095",
      "country": "Deutschland"
    }
  }'
```

### Social Media und Tags
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "linkedinUrl": "https://linkedin.com/company/techsolutions",
    "twitterHandle": "techsolutions",
    "tags": ["Kunde", "Premium", "Software", "Enterprise"],
    "notes": "Größter Kunde im Enterprise-Segment"
  }'
```

### Medienunternehmen-spezifische Felder
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaType": "print",
    "coverage": "national",
    "circulation": 75000,
    "audienceSize": 250000
  }'
```

### Null-Werte setzen (Felder leeren)
```bash
curl -X PUT "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "tradingName": null,
    "phone": null,
    "notes": null
  }'
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests
- **Update Operations:** Zählen als reguläre Requests

## Geschäftslogik

### Update-Verhalten
- **Partial Updates:** Nur gesendete Felder werden aktualisiert
- **Null Values:** Explizite `null` Werte leeren das Feld
- **Missing Fields:** Nicht gesendete Felder bleiben unverändert
- **Computed Fields:** `displayName`, `domain`, `activityScore` werden automatisch aktualisiert

### Validierung
- **Name Uniqueness:** Firmennamen müssen pro Organisation eindeutig sein
- **Domain Uniqueness:** Website-Domains müssen pro Organisation eindeutig sein
- **Email Validation:** E-Mail-Adressen werden auf korrektes Format geprüft
- **URL Validation:** Website und Social Media URLs werden validiert
- **Phone Formatting:** Telefonnummern werden automatisch formatiert

### Automatische Updates
- **Display Name:** Wird aus `tradingName` oder `name` generiert
- **Domain Extraction:** Domain wird automatisch aus Website-URL extrahiert
- **Activity Score:** Wird basierend auf neuer Datenvollständigkeit neu berechnet
- **Updated At:** Wird automatisch auf aktuellen Zeitstempel gesetzt

### Duplicate Prevention
- Prüfung auf Name-Konflikte mit anderen Firmen in derselben Organisation
- Prüfung auf Domain-Konflikte bei Website-Änderungen
- Ausnahme: Updates der gleichen Firma sind erlaubt

## Validation Rules
- **Name:** Mindestens 2 Zeichen, maximal 200 Zeichen
- **Email:** Muss gültiges E-Mail-Format haben
- **Website:** Muss gültige URL sein (http/https)
- **Phone:** Internationale Formate werden erkannt und normalisiert
- **VAT Number:** Format wird länderspezifisch validiert
- **Tags:** Maximum 20 Tags pro Firma, jeder Tag maximal 50 Zeichen

## Data Integrity
- **Organization Isolation:** Updates sind nur innerhalb der eigenen Organisation möglich
- **Referential Integrity:** Verknüpfte Kontakte bleiben erhalten
- **Audit Trail:** Alle Änderungen werden für Compliance getrackt
- **Backup Data:** Alte Werte werden für Rollback-Fähigkeit gesichert

## Performance-Optimierungen
- **Single Document Update:** Effiziente direkte Firestore-Updates
- **Conditional Updates:** Nur geänderte Felder werden übertragen
- **Computed Field Optimization:** Activity Score nur bei relevanten Änderungen neu berechnet
- **Index Optimization:** Updates nutzen optimierte Datenbankindizes

## Verwendungszwecke
- **CRM Updates:** Pflege von Firmenstammdaten
- **Lead Qualification:** Anreicherung von Firmeninformationen
- **Data Enrichment:** Integration externer Datenquellen
- **User Interface:** Echtzeit-Updates in Admin-Interfaces

## Sicherheitshinweise
- **Input Sanitization:** Alle Eingaben werden bereinigt und validiert
- **XSS Prevention:** HTML-Inhalte werden escaped
- **SQL Injection:** NoSQL-Injection-Schutz durch Firebase
- **Permission Enforcement:** Strikte Berechtigungsprüfung pro Request

---
**Status:** 🔄 In Reparatur - Service-Problem diagnostiziert  
**Problem:** Next.js 15 Parameter-Parsing repariert, aber Firebase Service-Layer hat Import-/Collection-Probleme  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1