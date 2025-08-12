# GET /api/v1/companies/{companyId}

Lädt eine spezifische Firma anhand ihrer ID.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `companies:read`

## Request

### HTTP Method
```
GET /api/v1/companies/{companyId}
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |

### Path Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `companyId` | string | ✅ | Eindeutige ID der Firma | `"LcgPZAXaXDRijYr80yLw"` |

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "LcgPZAXaXDRijYr80yLw",
    "name": "Tech Innovations GmbH",
    "tradingName": "TechInno",
    "legalName": "Tech Innovations Gesellschaft mit beschränkter Haftung",
    "displayName": "TechInno",
    "industry": "Technologie",
    "companySize": "medium",
    "companyType": "customer",
    "founded": "2018-03-15",
    "website": "https://techinnnovations.de",
    "domain": "techinnnovations.de",
    "phone": "+49 89 987654321",
    "email": "info@techinnnovations.de",
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
    "linkedinUrl": "https://linkedin.com/company/techinnno",
    "twitterHandle": "techinnno",
    "facebookUrl": "https://facebook.com/techinnno",
    "instagramHandle": "techinnno",
    "vatNumber": "DE987654321",
    "registrationNumber": "HRB 98765",
    "tags": [
      { "name": "Kunde", "color": null },
      { "name": "Software", "color": null },
      { "name": "KI", "color": null }
    ],
    "contactCount": 12,
    "publicationCount": 0,
    "notes": "Spezialisiert auf KI-Lösungen für Mittelstand",
    "internalNotes": "Vertrag läuft Ende 2025 aus",
    "isActive": true,
    "createdAt": "2018-03-15T10:30:00.000Z",
    "updatedAt": "2025-08-12T08:45:30.123Z",
    "lastContactAt": "2025-08-10T14:22:00.000Z",
    "activityScore": 85,
    "recentActivity": [
      {
        "type": "contact_created",
        "description": "Neuer Kontakt hinzugefügt: Max Mustermann",
        "timestamp": "2025-08-10T14:22:00.000Z"
      }
    ]
  },
  "meta": {
    "requestId": "req_1754992410406_4vjlkc",
    "timestamp": "2025-08-12T09:53:30.406Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `id` | string | Eindeutige ID der Firma |
| `name` | string | Offizieller Firmenname |
| `tradingName` | string\|null | Handelsname (falls abweichend) |
| `legalName` | string\|null | Vollständiger juristischer Name |
| `displayName` | string | Anzeigename (automatisch generiert) |
| `industry` | string\|null | Branche/Industrie |
| `companySize` | string\|null | Firmengröße (`startup`, `small`, `medium`, `large`) |
| `companyType` | string\|null | Firmentyp (`customer`, `supplier`, `partner`, `competitor`) |
| `founded` | string\|null | Gründungsdatum (ISO 8601) |
| `website` | string\|null | Website URL |
| `domain` | string\|null | Extrahierte Domain der Website |
| `phone` | string\|null | Haupt-Telefonnummer |
| `email` | string\|null | Haupt-E-Mail-Adresse |
| `address` | object\|null | Firmenadresse |
| `address.street` | string | Straße und Hausnummer |
| `address.city` | string | Stadt |
| `address.postalCode` | string | Postleitzahl |
| `address.country` | string | Land |
| `address.formatted` | string | Formatierte Adresse |
| `mediaType` | string\|null | Medientyp (für Verlage: `print`, `digital`, `tv`, `radio`) |
| `coverage` | string\|null | Reichweite (für Medien: `national`, `regional`, `local`) |
| `circulation` | number\|null | Auflage (für Print-Medien) |
| `audienceSize` | number\|null | Zielgruppengröße |
| `linkedinUrl` | string\|null | LinkedIn Unternehmens-URL |
| `twitterHandle` | string\|null | Twitter Handle (ohne @) |
| `facebookUrl` | string\|null | Facebook Seiten-URL |
| `instagramHandle` | string\|null | Instagram Handle (ohne @) |
| `vatNumber` | string\|null | Umsatzsteuer-ID |
| `registrationNumber` | string\|null | Handelsregisternummer |
| `tags` | object[] | Array von Tag-Objekten |
| `tags[].name` | string | Tag-Name |
| `tags[].color` | string\|null | Tag-Farbe (optional) |
| `contactCount` | number | Anzahl zugeordneter Kontakte |
| `publicationCount` | number | Anzahl zugeordneter Publikationen |
| `notes` | string\|null | Öffentliche Notizen |
| `internalNotes` | string\|null | Interne Notizen |
| `isActive` | boolean | Ob die Firma aktiv ist |
| `createdAt` | string | Erstellungszeitpunkt (ISO 8601) |
| `updatedAt` | string | Letzte Änderung (ISO 8601) |
| `lastContactAt` | string\|null | Letzter Kontakt (ISO 8601) |
| `activityScore` | number | Aktivitätsscore (0-100) |
| `recentActivity` | array | Liste der letzten Aktivitäten |

## Error Responses

### 404 Not Found - Firma nicht gefunden
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Company not found"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T09:53:30.406Z",
    "version": "v1"
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
    "message": "Missing required permission: companies:read"
  }
}
```

### 400 Bad Request - Ungültige Company ID
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST_PARAMETERS",
    "message": "Invalid company ID format"
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

### Basis-Abfrage
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Mit JSON Pretty Print
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies/LcgPZAXaXDRijYr80yLw" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  | jq
```

### Fehlerbehandlung
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies/invalid-id" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests

## Geschäftslogik

### Company Lookup
- **ID-basierte Suche:** Direkte Suche über Firestore Document ID
- **Permissions:** Prüfung der Organization-Zugehörigkeit
- **Data Enhancement:** Automatische Anreicherung mit Contact Count und Activity Score
- **Legacy Migration:** Unterstützt sowohl alte als auch neue Company-Datenstrukturen

### Datenquellen
Die API kombiniert Daten aus verschiedenen Collections:
- **Primary:** `companies_enhanced` (neue Struktur)
- **Fallback:** `companies` (Legacy-Struktur mit automatischer Migration)
- **Relations:** Zugeordnete Kontakte für Contact Count
- **Computed:** Activity Score basierend auf Datenvollständigkeit und Aktivität

### Activity Score Berechnung
- **Basic Info:** 20 Punkte für Website, 15 für E-Mail, 10 für Telefon
- **Social Media:** 15 Punkte für LinkedIn, 10 für Twitter, 5 für Facebook
- **Business Data:** 10 Punkte für Adresse, 5 für Gründungsdatum
- **Relations:** Bis zu 20 Punkte basierend auf Contact Count

## Performance-Optimierungen
- **Single Document Lookup:** Effiziente ID-basierte Suche
- **Lazy Loading:** Contact Count wird nur bei Bedarf berechnet
- **Caching:** Response kann 10 Minuten gecacht werden
- **Collection Strategy:** Primäre Suche in optimierter Collection

## Verwendungszwecke
- **Firmendetails:** Vollständige Firmenprofile für CRM-Ansichten
- **Kontakt-Integration:** Basis für Kontakt-zu-Firma-Verknüpfungen
- **Lead Qualification:** Vollständige Firmendaten für Sales-Prozesse
- **Reporting:** Einzelfirmen-Analysen und KPI-Berechnungen

## Sicherheitshinweise
- **Organization Isolation:** Firmen sind pro Organization isoliert
- **Permission Check:** Jeder Request wird gegen API-Key-Berechtigungen geprüft
- **Data Sanitization:** Alle Response-Daten werden gefiltert und validiert

## Migration Notes
Diese Route unterstützt die Migration von der Legacy-Company-Struktur zur Enhanced-Struktur:
- Automatische Erkennung des Datenformats
- On-the-fly Migration für Legacy-Daten
- Backward Compatibility für bestehende Integrationen

---
**Status:** 🔄 In Reparatur - Service-Problem diagnostiziert  
**Problem:** Next.js 15 Parameter-Parsing repariert, aber Firebase Service-Layer hat Import-/Collection-Probleme  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1