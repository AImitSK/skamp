# GET /api/v1/companies

Lädt eine Liste aller Firmen mit Filterung und Pagination.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `companies:read`

## Request

### HTTP Method
```
GET /api/v1/companies
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |

### Query Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel | Default |
|-----------|-----|----------|--------------|----------|---------|
| `page` | number | ❌ | Seitennummer für Pagination | `2` | `1` |
| `limit` | number | ❌ | Anzahl Firmen pro Seite (1-100) | `50` | `25` |
| `search` | string | ❌ | Suchbegriff für Name, Domain oder Branche | `"Verlag"` | - |
| `industry` | string | ❌ | Filter nach Branche | `"Medien"` | - |
| `location` | string | ❌ | Filter nach Standort | `"München"` | - |
| `size` | string | ❌ | Filter nach Firmengröße | `"startup"`, `"small"`, `"medium"`, `"large"` | - |
| `isActive` | boolean | ❌ | Filter nach Status | `true` | - |
| `tags` | string | ❌ | Filter nach Tags (kommagetrennt) | `"kunde,prospect"` | - |
| `sortBy` | string | ❌ | Sortierfeld | `"name"`, `"createdAt"`, `"updatedAt"`, `"activityScore"` | `"updatedAt"` |
| `sortOrder` | string | ❌ | Sortierreihenfolge | `"asc"`, `"desc"` | `"desc"` |

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "LcgPZAXaXDRijYr80yLw",
      "name": "Beispiel GmbH", 
      "tradingName": "Beispiel",
      "displayName": "Beispiel",
      "website": "https://www.beispiel.de",
      "domain": "www.beispiel.de",
      "industry": null,
      "size": null,
      "address": null,
      "phone": null,
      "email": null,
      "description": null,
      "tags": [],
      "contactCount": 9,
      "publicationCount": 0,
      "isActive": true,
      "createdAt": "2025-08-02T14:03:57.585Z",
      "updatedAt": "2025-08-02T14:03:57.585Z", 
      "activityScore": 38,
      "recentActivity": []
    },
    {
      "id": "U6bLG4zoxEhI7jpRNXk9",
      "name": "Der Spiegel",
      "displayName": "Der Spiegel",
      "website": "https://www.spiegel.de",
      "domain": "www.spiegel.de",
      "industry": "Medien",
      "tags": [
        { "name": "Nachrichtenmagazin" },
        { "name": "Print" }
      ],
      "contactCount": 9,
      "publicationCount": 0,
      "isActive": true,
      "createdAt": "2025-07-31T20:24:00.694Z",
      "updatedAt": "2025-07-31T20:24:00.694Z",
      "activityScore": 38,
      "recentActivity": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 8,
    "hasNext": false,
    "hasPrevious": false
  },
  "meta": {
    "requestId": "req_1754988691202_mlqff7",
    "timestamp": "2025-08-12T08:51:31.202Z",
    "version": "v1"
  }
}
```

### Response Fields

#### Company Object
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `id` | string | Eindeutige ID der Firma |
| `name` | string | Offizieller Firmenname |
| `tradingName` | string\|null | Handelsname (falls abweichend) |
| `displayName` | string | Anzeigename (automatisch generiert) |
| `website` | string\|null | Website URL |
| `domain` | string\|null | Extrahierte Domain der Website |
| `industry` | string\|null | Branche/Industrie |
| `size` | string\|null | Firmengröße (`startup`, `small`, `medium`, `large`) |
| `address` | object\|null | Firmenadresse |
| `address.street` | string | Straße und Hausnummer |
| `address.city` | string | Stadt |
| `address.postalCode` | string | Postleitzahl |
| `address.country` | string | Land |
| `phone` | string\|null | Haupt-Telefonnummer |
| `email` | string\|null | Haupt-E-Mail-Adresse |
| `description` | string\|null | Firmenbeschreibung |
| `tags` | object[] | Array von Tag-Objekten |
| `tags[].name` | string | Tag-Name |
| `contactCount` | number | Anzahl zugeordneter Kontakte |
| `publicationCount` | number | Anzahl zugeordneter Publikationen |
| `isActive` | boolean | Ob die Firma aktiv ist |
| `activityScore` | number | Aktivitätsscore (0-100) |
| `recentActivity` | array | Liste der letzten Aktivitäten |
| `createdAt` | string | Erstellungszeitpunkt (ISO 8601) |
| `updatedAt` | string | Letzte Änderung (ISO 8601) |

#### Pagination Object
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `page` | number | Aktuelle Seite |
| `limit` | number | Anzahl Items pro Seite |
| `total` | number | Gesamtanzahl der Firmen |
| `hasNext` | boolean | Ob weitere Seiten existieren |
| `hasPrevious` | boolean | Ob vorherige Seiten existieren |

## Error Responses

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

### 400 Bad Request - Ungültige Parameter
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST_PARAMETERS",
    "message": "Invalid pagination parameters"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to retrieve companies"
  }
}
```

## cURL Beispiele

### Basis-Abfrage
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Mit Pagination
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies?page=2&limit=50" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Mit Suchfilter
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies?search=Verlag&industry=Medien" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Erweiterte Filterung
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies?industry=Technologie&size=startup&tags=kunde,saas&sortBy=activityScore&sortOrder=desc" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

### Mit Location Filter
```bash
curl -X GET "https://www.celeropress.com/api/v1/companies?location=München&isActive=true&limit=10" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb"
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests
- **Pagination:** Große Resultsets über mehrere Requests laden

## Geschäftslogik

### Suchfunktionalität
- **Name Search:** Durchsucht Firmenname und Handelsname
- **Domain Search:** Sucht in Website-Domains
- **Industry Search:** Filtert nach Branchen
- **Fuzzy Matching:** Ähnliche Begriffe werden gefunden
- **Tag Search:** Durchsucht zugewiesene Tags

### Activity Score Berechnung
- **Contact Activity:** Anzahl und Aktivität der Kontakte
- **Publication Activity:** Zugeordnete Publikationen
- **Engagement:** Interaktionen und Kommunikation
- **Data Completeness:** Vollständigkeit der Firmendaten
- **Recent Activity:** Gewichtung aktueller Aktivitäten

### Sortieroptionen
- **Name:** Alphabetisch nach Firmenname
- **Created:** Nach Erstellungsdatum  
- **Updated:** Nach letzter Änderung (Standard)
- **Activity Score:** Nach Aktivitätsbewertung
- **Contact Count:** Nach Anzahl Kontakte

## Performance-Optimierungen
- **Database Indexing:** Optimiert für häufige Suchbegriffe
- **Caching:** Response kann 5 Minuten gecacht werden
- **Pagination:** Effizienz bei großen Datasets
- **Field Selection:** Nur notwendige Felder werden geladen

## Verwendungszwecke
- **Firmenlisten:** Übersichten für CRM-Dashboards
- **Kontakt-Zuordnung:** Firmen für Kontakt-Verknüpfungen finden
- **Reporting:** Basis für Firmen-Analysen
- **Synchronisation:** Export für externe Systeme

---
**Status:** ✅ Funktioniert korrekt  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1