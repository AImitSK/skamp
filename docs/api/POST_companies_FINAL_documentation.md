# POST /api/v1/companies - Firmen erstellen

## Übersicht
**Route:** `POST /api/v1/companies`  
**Beschreibung:** Erstellt eine neue Firma oder mehrere Firmen (Bulk-Operation)  
**Authentifizierung:** API-Key erforderlich  
**Berechtigung:** `companies:write`

---

## Parameter-Tabelle

### Request Body (application/json)

#### Einzelne Firma
| Name | Typ | Required | Beschreibung |
|------|-----|----------|-------------|
| `name` | string | ✅ | Firmenname |
| `tradingName` | string | ❌ | Handelsname |
| `legalName` | string | ❌ | Rechtlicher Name |
| `industry` | string | ❌ | Branche |
| `companySize` | string | ❌ | Firmengröße |
| `companyType` | enum | ❌ | Firmentyp: `media_house`, `agency`, `corporate`, `startup`, `nonprofit`, `government` |
| `founded` | number | ❌ | Gründungsjahr |
| `website` | string | ❌ | Website URL |
| `phone` | string | ❌ | Telefonnummer |
| `email` | string | ❌ | E-Mail-Adresse |
| `vatNumber` | string | ❌ | Umsatzsteuer-Nummer |
| `registrationNumber` | string | ❌ | Handelsregisternummer |
| `tags` | string[] | ❌ | Tags für Kategorisierung |
| `notes` | string | ❌ | Öffentliche Notizen |

#### Bulk-Operation
| Name | Typ | Required | Beschreibung |
|------|-----|----------|-------------|
| `companies` | CompanyCreateRequest[] | ✅ | Array von Firmen-Objekten |
| `continueOnError` | boolean | ❌ | Bei Fehlern fortfahren (Standard: true) |

---

## Request Body Schema

### Einzelne Firma
```json
{
  "name": "string",
  "tradingName": "string",
  "legalName": "string", 
  "industry": "string",
  "companySize": "string",
  "companyType": "media_house|agency|corporate|startup|nonprofit|government",
  "founded": 2023,
  "website": "https://example.com",
  "phone": "+49 123 456789",
  "email": "contact@example.com",
  "vatNumber": "DE123456789",
  "registrationNumber": "HRB 12345",
  "tags": ["kunde", "premium"],
  "notes": "Wichtiger Kunde"
}
```

### Bulk-Operation
```json
{
  "companies": [
    {
      "name": "Firma 1",
      "industry": "Software"
    },
    {
      "name": "Firma 2", 
      "industry": "Media"
    }
  ],
  "continueOnError": true
}
```

---

## Response Schema

### Erfolgreiche Erstellung (201)
```json
{
  "success": true,
  "data": {
    "id": "jistJjRdRmUc9ydaMIBR",
    "name": "Test Company API Reparatur",
    "tradingName": null,
    "legalName": null,
    "displayName": "Test Company API Reparatur",
    "industry": "Software",
    "companySize": null,
    "companyType": null,
    "founded": null,
    "website": "https://test-api-repair.com",
    "domain": "test-api-repair.com",
    "phone": null,
    "email": null,
    "vatNumber": null,
    "registrationNumber": null,
    "tags": [],
    "contactCount": 0,
    "publicationCount": 0,
    "notes": null,
    "isActive": true,
    "createdAt": "2025-08-12T15:42:33.300Z",
    "updatedAt": "2025-08-12T15:42:33.300Z",
    "activityScore": 30,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1755013353546_yrll6c",
    "timestamp": "2025-08-12T15:42:33.547Z",
    "version": "v1"
  }
}
```

### Bulk-Operation Erfolg (201)
```json
{
  "success": true,
  "data": {
    "successful": 8,
    "failed": 2,
    "total": 10,
    "companies": [
      {
        "id": "abc123",
        "name": "Firma 1"
      }
    ],
    "errors": [
      {
        "index": 3,
        "error": "Name ist erforderlich",
        "company": {...}
      }
    ]
  }
}
```

---

## Error Codes

| Code | Status | Beschreibung |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Pflichtfelder fehlen oder ungültiges Format |
| `INVALID_REQUEST_FORMAT` | 400 | Content-Type muss application/json sein |
| `DUPLICATE_COMPANY` | 409 | Firma mit diesem Namen existiert bereits |
| `UNAUTHORIZED` | 401 | API-Key fehlt oder ungültig |
| `FORBIDDEN` | 403 | Berechtigung `companies:write` fehlt |
| `INTERNAL_ERROR` | 500 | Server-Fehler |

---

## cURL-Beispiele

### 1. Einzelne Firma erstellen
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company API Reparatur",
    "website": "https://test-api-repair.com",
    "industry": "Software"
  }'
```

### 2. Firma mit vollständigen Daten
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Musterfirma GmbH",
    "tradingName": "Musterfirma",
    "legalName": "Musterfirma Gesellschaft mit beschränkter Haftung",
    "industry": "Medien",
    "companySize": "50-200",
    "companyType": "media_house",
    "founded": 2018,
    "website": "https://musterfirma.de",
    "phone": "+49 30 12345678",
    "email": "info@musterfirma.de",
    "vatNumber": "DE987654321",
    "registrationNumber": "HRB 98765",
    "tags": ["medienhaus", "premium", "kunde"],
    "notes": "Strategischer Partner seit 2020"
  }'
```

### 3. Bulk-Erstellung (mehrere Firmen)
```bash
curl -X POST "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "companies": [
      {
        "name": "Tech Startup A",
        "industry": "Software",
        "companyType": "startup"
      },
      {
        "name": "Media Corp B", 
        "industry": "Medien",
        "companyType": "media_house"
      }
    ],
    "continueOnError": true
  }'
```

---

## Authentifizierung
**API-Key:** Header `Authorization: Bearer YOUR_API_KEY`  
**Berechtigung:** `companies:write`  

---

## Rate Limiting
- **Limit:** 100 Requests/Minute pro API-Key
- **Bulk-Operations:** Zählen als 1 Request unabhängig von der Anzahl Firmen
- **Header:** `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Status
✅ **VOLLSTÄNDIG FUNKTIONSFÄHIG** (Getestet 2025-08-12)
- Route funktioniert perfekt  
- Einzelerstellung: ✅ Erfolgreich
- Bulk-Operation: ✅ Implementiert
- Alle Validierungen aktiv
- Response-Format korrekt