# POST /api/v1/companies

Erstellt eine neue Firma in der CRM-Datenbank.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `companies:write`

## Request

### HTTP Method
```
POST /api/v1/companies
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |
| `Content-Type` | string | ✅ | Muss `application/json` sein |

### Request Body Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `name` | string | ✅ | Offizieller Firmenname | `"Tech Innovations GmbH"` |
| `tradingName` | string | ❌ | Handelsname (falls abweichend) | `"TechInno"` |
| `legalName` | string | ❌ | Vollständiger juristischer Name | `"Tech Innovations Gesellschaft mit beschränkter Haftung"` |
| `industry` | string | ❌ | Branche/Industrie | `"Technologie"`, `"Medien"`, `"Beratung"` |
| `companySize` | string | ❌ | Firmengröße | `"startup"`, `"small"`, `"medium"`, `"large"` |
| `companyType` | string | ❌ | Firmentyp | `"customer"`, `"supplier"`, `"partner"`, `"competitor"` |
| `founded` | string | ❌ | Gründungsdatum | `"2020-01-15"` |
| `website` | string | ❌ | Website URL | `"https://tech-innovations.de"` |
| `phone` | string | ❌ | Haupt-Telefonnummer | `"+49 89 123456789"` |
| `email` | string | ❌ | Haupt-E-Mail-Adresse | `"info@tech-innovations.de"` |
| `address` | object | ❌ | Firmenadresse | siehe unten |
| `address.street` | string | ❌ | Straße und Hausnummer | `"Friedrichstraße 123"` |
| `address.city` | string | ❌ | Stadt | `"Berlin"` |
| `address.postalCode` | string | ❌ | Postleitzahl | `"10117"` |
| `address.country` | string | ❌ | Land | `"Deutschland"` |
| `mediaType` | string | ❌ | Medientyp (für Verlage) | `"print"`, `"digital"`, `"tv"`, `"radio"` |
| `coverage` | string | ❌ | Reichweite (für Medien) | `"national"`, `"regional"`, `"local"` |
| `circulation` | number | ❌ | Auflage (für Print-Medien) | `50000` |
| `audienceSize` | number | ❌ | Zielgruppengröße | `1000000` |
| `linkedinUrl` | string | ❌ | LinkedIn Unternehmens-URL | `"https://linkedin.com/company/tech-innovations"` |
| `twitterHandle` | string | ❌ | Twitter Handle (ohne @) | `"techinnovations"` |
| `facebookUrl` | string | ❌ | Facebook Seiten-URL | `"https://facebook.com/techinnovations"` |
| `instagramHandle` | string | ❌ | Instagram Handle (ohne @) | `"techinnovations"` |
| `vatNumber` | string | ❌ | Umsatzsteuer-ID | `"DE123456789"` |
| `registrationNumber` | string | ❌ | Handelsregisternummer | `"HRB 12345"` |
| `tags` | string[] | ❌ | Array von Tags | `["Kunde", "Premium", "Tech"]` |
| `notes` | string | ❌ | Öffentliche Notizen | `"Wichtiger Partner im Bereich KI"` |
| `internalNotes` | string | ❌ | Interne Notizen | `"Vertrag läuft Ende 2025 aus"` |

### Bulk Import Unterstützung
Für Bulk-Import können Sie auch ein Array von Firmen oder ein Objekt mit `companies` Array senden:

```json
{
  "companies": [
    { "name": "Firma A", "website": "https://firma-a.de" },
    { "name": "Firma B", "industry": "Medien" }
  ],
  "continueOnError": true
}
```

## Response

### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "Bz9X41ihqnZoEL95U0BR",
    "name": "Test Company",
    "tradingName": null,
    "legalName": null,
    "displayName": "Test Company",
    "industry": null,
    "companySize": null,
    "companyType": null,
    "founded": null,
    "website": "https://test.com",
    "domain": "test.com",
    "phone": null,
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
    "internalNotes": null,
    "isActive": true,
    "createdAt": "2025-08-12T08:54:52.610Z",
    "updatedAt": "2025-08-12T08:54:52.610Z",
    "activityScore": 18,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1754988892845_vy0hh4",
    "timestamp": "2025-08-12T08:54:52.845Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `id` | string | Eindeutige ID der Firma |
| `name` | string | Offizieller Firmenname |
| `displayName` | string | Anzeigename (automatisch generiert) |
| `domain` | string\|null | Extrahierte Domain der Website |
| `contactCount` | number | Anzahl zugeordneter Kontakte |
| `publicationCount` | number | Anzahl zugeordneter Publikationen |
| `activityScore` | number | Aktivitätsscore (0-100) |
| `isActive` | boolean | Ob die Firma aktiv ist |
| `createdAt` | string | Erstellungszeitpunkt (ISO 8601) |
| `updatedAt` | string | Letzte Änderung (ISO 8601) |
| `recentActivity` | array | Liste der letzten Aktivitäten |

## Error Responses

### 400 Bad Request - Fehlende Pflichtfelder
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST_DATA",
    "message": "Company name is required"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T08:54:52.845Z",
    "version": "v1"
  }
}
```

### 409 Conflict - Firma bereits vorhanden
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Company with this name or domain already exists"
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

## cURL Beispiele

### Basis-Firma
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Neue Firma GmbH",
    "website": "https://neue-firma.de"
  }'
```

### Vollständige Firma
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Solutions GmbH",
    "tradingName": "TechSol",
    "legalName": "Tech Solutions Gesellschaft mit beschränkter Haftung",
    "industry": "Technologie",
    "companySize": "medium",
    "companyType": "customer",
    "founded": "2018-03-15",
    "website": "https://techsol.de",
    "phone": "+49 89 987654321",
    "email": "info@techsol.de",
    "address": {
      "street": "Maximilianstraße 1",
      "city": "München",
      "postalCode": "80539",
      "country": "Deutschland"
    },
    "linkedinUrl": "https://linkedin.com/company/techsol",
    "twitterHandle": "techsol",
    "vatNumber": "DE987654321",
    "registrationNumber": "HRB 98765",
    "tags": ["Kunde", "Software", "KI"],
    "notes": "Spezialisiert auf KI-Lösungen für Mittelstand"
  }'
```

### Medienunternehmen
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regional Journal GmbH",
    "industry": "Medien",
    "companyType": "publisher",
    "website": "https://regional-journal.de",
    "mediaType": "print",
    "coverage": "regional",
    "circulation": 25000,
    "audienceSize": 75000,
    "address": {
      "street": "Pressegasse 10",
      "city": "Hamburg",
      "postalCode": "20095",
      "country": "Deutschland"
    },
    "tags": ["Verlag", "Lokalnachrichten"]
  }'
```

### Bulk Import
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {
        "name": "Startup A",
        "companySize": "startup",
        "industry": "Technologie"
      },
      {
        "name": "Mittelstand B", 
        "companySize": "medium",
        "industry": "Maschinenbau"
      }
    ],
    "continueOnError": true
  }'
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Bulk Import:** Zählt als 1 Request pro Firma
- **Burst Limit:** 10 gleichzeitige Requests

## Geschäftslogik
- **Automatische Validierung:** Firmennamen und Domains werden auf Eindeutigkeit geprüft
- **Domain Extraktion:** Domain wird automatisch aus Website-URL extrahiert
- **Display Name:** Wird automatisch generiert (tradingName oder name)
- **Activity Score:** Wird basierend auf Datenvollständigkeit berechnet
- **Duplicate Detection:** Verhindert Doppeleinträge basierend auf Name/Domain

## Validation Rules
- **Name:** Pflichtfeld, mindestens 2 Zeichen
- **Website:** Muss gültiges URL-Format haben
- **E-Mail:** Muss gültiges E-Mail-Format haben
- **Phone Numbers:** Werden automatisch formatiert
- **VAT Numbers:** Format wird validiert (länderspezifisch)
- **Tags:** Maximum 20 Tags pro Firma

## Automatische Anreicherung
- **Domain Extraktion:** Aus Website-URL
- **Company Size Detection:** Basierend auf verfügbaren Daten
- **Industry Classification:** Automatische Kategorisierung
- **Social Media Validation:** URLs werden auf Gültigkeit geprüft

## Medienspezifische Felder
Für Medienunternehmen (Verlage, TV, Radio):
- **mediaType:** Art des Mediums
- **coverage:** Reichweite (lokal, regional, national)
- **circulation:** Auflage bei Print-Medien
- **audienceSize:** Zielgruppengröße

---
**Status:** ✅ Funktioniert korrekt  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1