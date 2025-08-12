# POST /api/v1/contacts

Erstellt einen neuen Kontakt in der CRM-Datenbank.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `contacts:write`

## Request

### HTTP Method
```
POST /api/v1/contacts
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |
| `Content-Type` | string | ✅ | Muss `application/json` sein |

### Request Body Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `firstName` | string | ✅ | Vorname des Kontakts | `"Max"` |
| `lastName` | string | ✅ | Nachname des Kontakts | `"Mustermann"` |
| `email` | string | ❌ | E-Mail-Adresse (muss eindeutig sein) | `"max@example.com"` |
| `phone` | string | ❌ | Telefonnummer | `"+49 123 456789"` |
| `jobTitle` | string | ❌ | Berufsbezeichnung | `"Chefredakteur"` |
| `department` | string | ❌ | Abteilung | `"Redaktion"` |
| `companyId` | string | ❌ | ID der zugehörigen Firma | `"comp_123456789"` |
| `address` | object | ❌ | Adressdaten | siehe unten |
| `address.street` | string | ❌ | Straße und Hausnummer | `"Musterstraße 123"` |
| `address.city` | string | ❌ | Stadt | `"München"` |
| `address.postalCode` | string | ❌ | Postleitzahl | `"80331"` |
| `address.country` | string | ❌ | Land | `"Deutschland"` |
| `linkedinUrl` | string | ❌ | LinkedIn Profil URL | `"https://linkedin.com/in/max-mustermann"` |
| `twitterHandle` | string | ❌ | Twitter Handle (ohne @) | `"maxmustermann"` |
| `website` | string | ❌ | Website URL | `"https://max-mustermann.de"` |
| `mediaOutlets` | string[] | ❌ | Array von Medien-Outlets | `["Süddeutsche Zeitung", "BR"]` |
| `expertise` | string[] | ❌ | Array von Fachgebieten | `["Politik", "Wirtschaft"]` |
| `tags` | string[] | ❌ | Array von Tags | `["VIP", "Pressekontakt"]` |
| `preferredContactMethod` | string | ❌ | Bevorzugter Kontaktweg | `"email"` oder `"phone"` |
| `communicationFrequency` | string | ❌ | Kommunikationshäufigkeit | `"weekly"`, `"monthly"`, `"quarterly"` |
| `notes` | string | ❌ | Öffentliche Notizen | `"Spezialisiert auf Umweltthemen"` |
| `internalNotes` | string | ❌ | Interne Notizen | `"Bevorzugt Termine am Vormittag"` |

### Bulk Import Unterstützung
Für Bulk-Import können Sie auch ein Array von Kontakten oder ein Objekt mit `contacts` Array senden:

```json
{
  "contacts": [
    { "firstName": "Max", "lastName": "Mustermann" },
    { "firstName": "Anna", "lastName": "Schmidt" }
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
    "id": "owUZDtvwqCkZbPTC8xhw",
    "firstName": "Max",
    "lastName": "Mustermann", 
    "fullName": "Max Mustermann",
    "email": "max@example.com",
    "phone": "123456789",
    "jobTitle": null,
    "department": null,
    "companyId": null,
    "address": null,
    "linkedinUrl": null,
    "twitterHandle": null,
    "website": null,
    "mediaOutlets": [],
    "expertise": [],
    "tags": [],
    "preferredContactMethod": null,
    "communicationFrequency": null,
    "notes": null,
    "internalNotes": null,
    "isActive": true,
    "createdAt": "2025-08-12T08:32:59.740Z",
    "updatedAt": "2025-08-12T08:32:59.740Z",
    "contactScore": 35,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1754987579660_g38zgt",
    "timestamp": "2025-08-12T08:32:59.660Z",
    "version": "v1"
  }
}
```

### Response Fields
| Field | Typ | Beschreibung |
|-------|-----|--------------|
| `id` | string | Eindeutige ID des Kontakts |
| `firstName` | string | Vorname |
| `lastName` | string | Nachname |
| `fullName` | string | Vollständiger Name (automatisch generiert) |
| `contactScore` | number | Automatisch berechneter Kontakt-Score (0-100) |
| `isActive` | boolean | Ob der Kontakt aktiv ist |
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
    "message": "firstName and lastName are required"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T08:32:59.660Z",
    "version": "v1"
  }
}
```

### 409 Conflict - E-Mail bereits vergeben
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "Contact with this email already exists"
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
    "message": "Missing required permission: contacts:write"
  }
}
```

## cURL Beispiele

### Basis-Kontakt
```bash
curl -X POST "https://www.celeropress.com/api/v1/contacts" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "max@example.com"
  }'
```

### Vollständiger Kontakt
```bash
curl -X POST "https://www.celeropress.com/api/v1/contacts" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Anna",
    "lastName": "Schmidt",
    "email": "anna.schmidt@newspaper.de",
    "phone": "+49 89 123456",
    "jobTitle": "Chefredakteurin",
    "department": "Politik",
    "address": {
      "street": "Pressestraße 1",
      "city": "München", 
      "postalCode": "80331",
      "country": "Deutschland"
    },
    "mediaOutlets": ["Süddeutsche Zeitung"],
    "expertise": ["Politik", "Wirtschaft"],
    "tags": ["VIP", "Pressekontakt"],
    "preferredContactMethod": "email",
    "notes": "Spezialisiert auf deutsche Politik"
  }'
```

### Bulk Import
```bash
curl -X POST "https://www.celeropress.com/api/v1/contacts" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {
        "firstName": "Max",
        "lastName": "Mustermann",
        "email": "max@example.com"
      },
      {
        "firstName": "Anna", 
        "lastName": "Schmidt",
        "email": "anna@example.com"
      }
    ],
    "continueOnError": true
  }'
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute  
- **Bulk Import:** Zählt als 1 Request pro Kontakt
- **Burst Limit:** 10 gleichzeitige Requests

## Geschäftslogik
- **Automatische Validierung:** E-Mail-Adressen werden auf Eindeutigkeit geprüft
- **Contact Score:** Wird automatisch basierend auf Vollständigkeit der Daten berechnet
- **Display Name:** Wird automatisch aus Vor- und Nachname generiert
- **Soft Delete:** Gelöschte Kontakte werden nicht überschrieben

## Sicherheitshinweise
- E-Mail-Adressen müssen eindeutig sein (globale Eindeutigkeit)
- Sensible Daten in `internalNotes` speichern
- Tags werden automatisch normalisiert (Groß-/Kleinschreibung)

---
**Status:** ✅ Funktioniert korrekt  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1