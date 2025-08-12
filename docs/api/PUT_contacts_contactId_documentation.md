# PUT /api/v1/contacts/{contactId}

Aktualisiert einen bestehenden Kontakt mit neuen Informationen.

## Authentifizierung
- **Methode:** API Key
- **Header:** `Authorization: Bearer <api-key>`
- **Berechtigungen:** `contacts:write`

## Request

### HTTP Method
```
PUT /api/v1/contacts/{contactId}
```

### Headers
| Name | Typ | Required | Beschreibung |
|------|-----|----------|--------------|
| `Authorization` | string | ✅ | API Key im Format `Bearer <api-key>` |
| `Content-Type` | string | ✅ | Muss `application/json` sein |

### Path Parameters
| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `contactId` | string | ✅ | Eindeutige ID des zu aktualisierenden Kontakts | `"hfh5BK0ImfcP7mqujsVC"` |

### Request Body Parameters
Alle Parameter sind optional - nur die zu ändernden Felder müssen übertragen werden.

| Parameter | Typ | Required | Beschreibung | Beispiel |
|-----------|-----|----------|--------------|----------|
| `firstName` | string | ❌ | Vorname des Kontakts | `"Max"` |
| `lastName` | string | ❌ | Nachname des Kontakts | `"Mustermann"` |
| `email` | string | ❌ | E-Mail-Adresse (muss eindeutig sein) | `"max.updated@example.com"` |
| `phone` | string | ❌ | Telefonnummer | `"+49 89 987654"` |
| `jobTitle` | string | ❌ | Berufsbezeichnung | `"Senior-Redakteur"` |
| `department` | string | ❌ | Abteilung | `"Politik"` |
| `companyId` | string | ❌ | ID der zugehörigen Firma | `"comp_987654321"` |
| `address` | object | ❌ | Adressdaten | siehe unten |
| `address.street` | string | ❌ | Straße und Hausnummer | `"Neue Straße 456"` |
| `address.city` | string | ❌ | Stadt | `"Berlin"` |
| `address.postalCode` | string | ❌ | Postleitzahl | `"10115"` |
| `address.country` | string | ❌ | Land | `"Deutschland"` |
| `linkedinUrl` | string | ❌ | LinkedIn Profil URL | `"https://linkedin.com/in/max-updated"` |
| `twitterHandle` | string | ❌ | Twitter Handle (ohne @) | `"maxupdated"` |
| `website` | string | ❌ | Website URL | `"https://max-updated.de"` |
| `mediaOutlets` | string[] | ❌ | Array von Medien-Outlets | `["Zeit Online", "FAZ"]` |
| `expertise` | string[] | ❌ | Array von Fachgebieten | `["Innenpolitik", "Europa"]` |
| `tags` | string[] | ❌ | Array von Tags | `["Senior", "Influencer"]` |
| `preferredContactMethod` | string | ❌ | Bevorzugter Kontaktweg | `"email"` oder `"phone"` |
| `communicationFrequency` | string | ❌ | Kommunikationshäufigkeit | `"weekly"`, `"monthly"`, `"quarterly"` |
| `notes` | string | ❌ | Öffentliche Notizen | `"Aktualisierte Expertise"` |
| `internalNotes` | string | ❌ | Interne Notizen | `"Neue Kontaktpräferenzen"` |
| `isActive` | boolean | ❌ | Ob der Kontakt aktiv ist | `true` oder `false` |

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "hfh5BK0ImfcP7mqujsVC",
    "firstName": "Max",
    "lastName": "Mustermann",
    "fullName": "Max Mustermann",
    "email": "max.updated@example.com",
    "phone": "+49 89 987654",
    "jobTitle": "Senior-Redakteur",
    "department": "Politik",
    "companyId": "comp_987654321",
    "companyInfo": {
      "id": "comp_987654321",
      "name": "Beispiel Verlag GmbH",
      "domain": "beispiel-verlag.de",
      "industry": "Medien"
    },
    "address": {
      "street": "Neue Straße 456",
      "city": "Berlin",
      "postalCode": "10115",
      "country": "Deutschland"
    },
    "linkedinUrl": "https://linkedin.com/in/max-updated",
    "twitterHandle": "maxupdated",
    "website": "https://max-updated.de",
    "mediaOutlets": ["Zeit Online", "FAZ"],
    "expertise": ["Innenpolitik", "Europa"],
    "tags": [
      { "name": "Senior" },
      { "name": "Influencer" }
    ],
    "preferredContactMethod": "email",
    "communicationFrequency": "monthly",
    "notes": "Aktualisierte Expertise",
    "internalNotes": "Neue Kontaktpräferenzen",
    "isActive": true,
    "createdAt": "2025-08-12T08:37:46.657Z",
    "updatedAt": "2025-08-12T08:45:00.123Z",
    "contactScore": 85,
    "recentActivity": []
  },
  "meta": {
    "requestId": "req_1754988300123_abc123",
    "timestamp": "2025-08-12T08:45:00.123Z",
    "version": "v1"
  }
}
```

### Response Fields
Siehe [GET /api/v1/contacts/{contactId}](./GET_contacts_contactId_documentation.md) für detaillierte Felderbeschreibung.

## Error Responses

### 404 Not Found - Kontakt nicht gefunden
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Contact not found"
  },
  "meta": {
    "requestId": "req_...",
    "timestamp": "2025-08-12T08:45:00.123Z",
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
    "message": "Another contact with this email already exists"
  }
}
```

### 400 Bad Request - Ungültige Daten
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST_FORMAT",
    "message": "Invalid JSON in request body"
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

### Einfaches Update
```bash
curl -X PUT "https://www.celeropress.com/api/v1/contacts/hfh5BK0ImfcP7mqujsVC" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "jobTitle": "Senior-Redakteur",
    "department": "Politik"
  }'
```

### Vollständiges Update
```bash
curl -X PUT "https://www.celeropress.com/api/v1/contacts/hfh5BK0ImfcP7mqujsVC" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Maximilian",
    "lastName": "Mustermann",
    "email": "maximilian.mustermann@example.com",
    "phone": "+49 89 123456789",
    "jobTitle": "Chefredakteur",
    "department": "Leitung",
    "address": {
      "street": "Pressestraße 123",
      "city": "München",
      "postalCode": "80331",
      "country": "Deutschland"
    },
    "mediaOutlets": ["Süddeutsche Zeitung", "BR24"],
    "expertise": ["Politik", "Wirtschaft", "International"],
    "tags": ["VIP", "Chefredakteur", "Influencer"],
    "preferredContactMethod": "email",
    "communicationFrequency": "weekly",
    "notes": "Jetzt Chefredakteur - wichtiger Kontakt"
  }'
```

### Kontakt deaktivieren
```bash
curl -X PUT "https://www.celeropress.com/api/v1/contacts/hfh5BK0ImfcP7mqujsVC" \
  -H "Authorization: Bearer cp_live_a3cb4788d991b5e0e0a4709e71a216cb" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false,
    "internalNotes": "Kontakt vorübergehend deaktiviert - Elternzeit"
  }'
```

## Rate Limiting
- **Standard:** 1000 Requests/Stunde, 60 Requests/Minute
- **Burst Limit:** 10 gleichzeitige Requests

## Geschäftslogik
- **Partial Updates:** Nur übertragene Felder werden aktualisiert
- **E-Mail Validierung:** Bei E-Mail-Änderung wird globale Eindeutigkeit geprüft
- **Contact Score:** Wird automatisch neu berechnet nach Updates
- **Company Population:** Firmeninformationen werden automatisch geladen (falls `companyId` gesetzt)
- **Timestamps:** `updatedAt` wird automatisch auf aktuelle Zeit gesetzt
- **Tag Normalization:** Tags werden automatisch normalisiert und dedupliziert

## Update-Strategien
- **Incremental Updates:** Nur geänderte Felder übertragen
- **Array Updates:** Arrays überschreiben vollständig (nicht append)
- **Null Values:** `null` setzt Felder zurück auf leer
- **Address Updates:** Adress-Objekt wird komplett ersetzt

## Validation Rules
- **firstName + lastName:** Mindestens eines muss gesetzt bleiben
- **Email Format:** Muss gültiges E-Mail-Format haben
- **Phone Numbers:** Werden automatisch formatiert
- **URLs:** Werden auf gültiges Format geprüft
- **Tags:** Maximum 20 Tags pro Kontakt

---
**Status:** ✅ Funktioniert korrekt  
**Letzte Aktualisierung:** 2025-08-12  
**Version:** v1