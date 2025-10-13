# Contacts Enhanced Service API

**Service:** `contactsEnhancedService`
**Collection:** `contacts_enhanced`
**Type:** `ContactEnhanced`

---

## Übersicht

Der `contactsEnhancedService` ist der zentrale Firebase Service für die Verwaltung von Kontakten im CRM-System. Er bietet volle CRUD-Funktionalität, erweiterte Suche, GDPR-Consent-Management, Import/Export und spezielle Journalist-Features mit Multi-Tenancy-Unterstützung.

## Import

```typescript
import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
```

---

## Methoden

### `getAll(organizationId: string): Promise<ContactEnhanced[]>`

Lädt alle Kontakte für eine Organization.

**Parameter:**
- `organizationId` (string) - ID der Organization

**Returns:** `Promise<ContactEnhanced[]>`

**Beispiel:**
```typescript
const contacts = await contactsEnhancedService.getAll(currentOrganization.id);
```

**Features:**
- ✅ Inkludiert Contact-References (globale Journalisten) transparent
- ✅ Automatische Multi-Tenancy-Filterung
- ✅ Erweitert um berechnete Display-Namen

---

### `getById(id: string, organizationId: string): Promise<ContactEnhanced | null>`

Lädt einen einzelnen Kontakt nach ID.

**Parameter:**
- `id` (string) - Contact ID
- `organizationId` (string) - Organization ID

**Returns:** `Promise<ContactEnhanced | null>`

**Beispiel:**
```typescript
const contact = await contactsEnhancedService.getById('contact_123', orgId);
if (contact) {
  console.log(contact.displayName, contact.emails);
}
```

**Features:**
- ✅ Unterstützt echte Contact-IDs
- ✅ Unterstützt Contact-Reference-IDs (Multi-Entity System)
- ✅ Returns `null` wenn nicht gefunden

---

### `create(data, context): Promise<string>`

Erstellt einen neuen Kontakt.

**Parameter:**
- `data` (`Omit<ContactEnhanced, 'id' | 'createdAt' | 'updatedAt' | ...>`) - Contact-Daten
- `context` (`{ organizationId: string; userId: string; autoGlobalMode?: boolean }`) - Kontext

**Returns:** `Promise<string>` - ID des erstellten Kontakts

**Pflichtfelder:**
- `name.firstName` oder `name.lastName` - Mindestens ein Namensfeld erforderlich

**Beispiel:**
```typescript
const contactId = await contactsEnhancedService.create({
  name: {
    firstName: 'Max',
    lastName: 'Mustermann',
    prefix: 'Dr.'
  },
  displayName: 'Dr. Max Mustermann', // Wird automatisch generiert wenn nicht vorhanden
  companyId: 'company_123',
  position: 'Chefredakteur',
  emails: [{
    type: 'work',
    email: 'max.mustermann@verlag.de',
    isPrimary: true,
    isVerified: false
  }],
  phones: [{
    type: 'work',
    number: '+49 89 12345678',
    countryCode: 'DE',
    isPrimary: true
  }],
  socialProfiles: [{
    platform: 'linkedin',
    url: 'https://linkedin.com/in/maxmustermann',
    handle: 'maxmustermann'
  }],
  mediaProfile: {
    isJournalist: true,
    publicationIds: ['pub_123'],
    beats: ['Wirtschaft', 'Technologie']
  },
  gdprConsents: [{
    type: 'marketing',
    granted: true,
    grantedAt: Timestamp.now(),
    source: 'web_form'
  }]
}, {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
});
```

**Validierung:**
- ❌ Fehler wenn weder `firstName` noch `lastName` vorhanden
- ✅ `displayName` wird automatisch aus Name generiert wenn nicht vorhanden
- ✅ E-Mail-Format-Validierung (optional)

**Globaler Modus:**
- Wenn `autoGlobalMode: true`, wird Kontakt als globaler Journalist erstellt (SuperAdmin)

---

### `update(id: string, data, context): Promise<void>`

Aktualisiert einen bestehenden Kontakt.

**Parameter:**
- `id` (string) - Contact ID
- `data` (`Partial<ContactEnhanced>`) - Zu aktualisierende Felder
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await contactsEnhancedService.update('contact_123', {
  position: 'Senior Redakteur',
  emails: [{
    type: 'work',
    email: 'max.mustermann@neuer-verlag.de',
    isPrimary: true,
    isVerified: true
  }],
  mediaProfile: {
    isJournalist: true,
    publicationIds: ['pub_123', 'pub_456'],
    beats: ['Wirtschaft', 'Technologie', 'Politik']
  }
}, {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
});
```

**Wichtig:**
- Nur geänderte Felder mitgeben (Partial Update)
- `updatedAt` und `updatedBy` werden automatisch gesetzt

---

### `delete(id: string, context): Promise<void>`

Löscht einen Kontakt (Soft Delete).

**Parameter:**
- `id` (string) - Contact ID
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await contactsEnhancedService.delete('contact_123', {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
});
```

**Soft Delete:**
- Kontakt wird nicht aus Firestore gelöscht
- `deletedAt` und `deletedBy` werden gesetzt
- Nicht mehr in `getAll()` sichtbar

---

### `searchEnhanced(organizationId, filters, options): Promise<ContactEnhancedListView[]>`

Erweiterte Suche mit Filtern.

**Parameter:**
- `organizationId` (string) - Organization ID
- `filters` (object) - Such-Filter
  - `search?: string` - Volltext-Suche (Name, E-Mail, Position, Company)
  - `companyIds?: string[]` - Filter nach Firmen
  - `tagIds?: string[]` - Filter nach Tags
  - `isJournalist?: boolean` - Nur Journalisten
  - `publicationIds?: string[]` - Filter nach Publications (Journalist-Filter)
  - `beats?: string[]` - Filter nach Beats (Journalist-Filter)
  - `hasGdprConsent?: boolean` - Nur Kontakte mit GDPR-Consent
  - `consentTypes?: string[]` - Filter nach Consent-Typen
- `options` (`QueryOptions`) - Optionale Query-Optionen

**Returns:** `Promise<ContactEnhancedListView[]>` - Erweiterte Contacts mit Metriken

**Beispiel:**
```typescript
// Suche nach Journalisten mit bestimmten Beats
const journalists = await contactsEnhancedService.searchEnhanced(
  currentOrganization.id,
  {
    isJournalist: true,
    beats: ['Wirtschaft', 'Technologie'],
    hasGdprConsent: true
  }
);

// Volltext-Suche
const results = await contactsEnhancedService.searchEnhanced(
  currentOrganization.id,
  { search: 'Müller Redakteur' }
);

// Filter nach Firma und Tags
const contacts = await contactsEnhancedService.searchEnhanced(
  currentOrganization.id,
  {
    companyIds: ['company_123'],
    tagIds: ['tag_vip']
  }
);
```

**Performance:**
- Client-seitige Filterung für komplexe Queries
- Automatische Metrik-Berechnung (lastContactDate)

---

### `getJournalists(organizationId, filters?): Promise<JournalistContact[]>`

Lädt alle Journalisten mit erweiterten Journalist-Daten.

**Parameter:**
- `organizationId` (string) - Organization ID
- `filters` (object, optional) - Filter-Optionen
  - `publicationIds?: string[]` - Filter nach Publications
  - `beats?: string[]` - Filter nach Beats
  - `hasPublicationContact?: boolean` - Nur Journalisten mit Publication-Kontaktdaten

**Returns:** `Promise<JournalistContact[]>`

**Beispiel:**
```typescript
// Alle Journalisten
const journalists = await contactsEnhancedService.getJournalists(
  currentOrganization.id
);

// Wirtschafts-Journalisten bei bestimmten Publications
const econJournalists = await contactsEnhancedService.getJournalists(
  currentOrganization.id,
  {
    publicationIds: ['pub_handelsblatt', 'pub_faz'],
    beats: ['Wirtschaft']
  }
);
```

**Features:**
- ✅ Inkludiert globale Journalisten (Premium-Datenbank)
- ✅ Erweitert um Publication-Details
- ✅ Sortiert nach Relevanz

---

### `addGdprConsent(contactId, consent, context): Promise<void>`

Fügt ein GDPR-Consent zu einem Kontakt hinzu.

**Parameter:**
- `contactId` (string) - Contact ID
- `consent` (`GdprConsent`) - Consent-Daten
  - `type` - 'marketing' | 'newsletter' | 'data_processing' | 'third_party_sharing'
  - `granted` (boolean) - Consent erteilt?
  - `grantedAt` (Timestamp) - Zeitpunkt der Erteilung
  - `source` (string) - Quelle (z.B. 'web_form', 'email', 'phone')
  - `ipAddress?` (string) - IP-Adresse (optional)
  - `userAgent?` (string) - User Agent (optional)
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await contactsEnhancedService.addGdprConsent(
  'contact_123',
  {
    id: 'consent_' + Date.now(),
    type: 'marketing',
    granted: true,
    grantedAt: Timestamp.now(),
    source: 'web_form',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  },
  {
    organizationId: currentOrganization.id,
    userId: currentUser.uid
  }
);
```

**Wichtig:**
- GDPR-Consents sind append-only (werden nicht gelöscht, nur revoked)
- IP-Adresse und User Agent als Nachweis empfohlen
- Consent-Historie bleibt erhalten

---

### `revokeGdprConsent(contactId, consentId, context): Promise<void>`

Widerruft ein bestehenden GDPR-Consent.

**Parameter:**
- `contactId` (string) - Contact ID
- `consentId` (string) - Consent ID
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await contactsEnhancedService.revokeGdprConsent(
  'contact_123',
  'consent_123456',
  {
    organizationId: currentOrganization.id,
    userId: currentUser.uid
  }
);
```

**Soft Revoke:**
- Consent wird nicht gelöscht
- `revokedAt` und `revokedBy` werden gesetzt
- Historie bleibt erhalten (GDPR-Compliance)

---

### `import(contacts, context, options): Promise<ImportResult>`

Importiert mehrere Kontakte mit Duplikat-Prüfung.

**Parameter:**
- `contacts` (`Partial<ContactEnhanced>[]`) - Array von Contact-Daten
- `context` (`{ organizationId: string; userId: string; autoGlobalMode?: boolean }`)
- `options` (object)
  - `duplicateCheck?: boolean` - Duplikat-Prüfung aktivieren (default: false)
  - `updateExisting?: boolean` - Bestehende Kontakte aktualisieren (default: false)

**Returns:** `Promise<ImportResult>`
```typescript
{
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; error: string }[];
  warnings: { row: number; warning: string }[];
}
```

**Beispiel:**
```typescript
const result = await contactsEnhancedService.import(
  [
    {
      name: { firstName: 'Max', lastName: 'Mustermann' },
      emails: [{ email: 'max@example.com', type: 'work', isPrimary: true }],
      companyId: 'company_123',
      position: 'Redakteur'
    },
    {
      name: { firstName: 'Anna', lastName: 'Schmidt' },
      emails: [{ email: 'anna@example.com', type: 'work', isPrimary: true }],
      mediaProfile: { isJournalist: true, beats: ['Wirtschaft'] }
    }
  ],
  {
    organizationId: currentOrganization.id,
    userId: currentUser.uid
  },
  {
    duplicateCheck: true,
    updateExisting: false
  }
);

console.log(`Erstellt: ${result.created}, Übersprungen: ${result.skipped}`);
result.errors.forEach(err => console.error(`Zeile ${err.row}: ${err.error}`));
```

**Duplikat-Erkennung:**
- Prüft nach E-Mail-Adressen
- Prüft nach gleichem Namen + Firma
- Bei Match: Überspringt oder aktualisiert je nach `updateExisting`

---

## Typen

### `ContactEnhanced`

Vollständige Type-Definition siehe: [`src/types/crm-enhanced.ts:140-311`](../../src/types/crm-enhanced.ts)

**Wichtigste Felder:**
```typescript
interface ContactEnhanced {
  // Basis
  id?: string;
  name: StructuredName;                // { firstName, lastName, middleName?, prefix?, suffix? }
  displayName: string;                 // Anzeigename (automatisch generiert)

  // Firma & Position
  companyId?: string;                  // Zugeordnete Firma
  position?: string;                   // Jobposition
  department?: string;                 // Abteilung

  // Kontaktdaten
  emails?: ContactEmail[];             // E-Mail-Adressen mit Typ & Primary-Flag
  phones?: PhoneNumber[];              // Telefonnummern
  addresses?: InternationalAddress[];  // Adressen
  website?: string;                    // Persönliche Website

  // Social Media
  socialProfiles?: SocialProfile[];    // LinkedIn, Twitter, etc.

  // Journalist-Daten
  mediaProfile?: {
    isJournalist: boolean;
    publicationIds: string[];          // Zugeordnete Publications
    beats?: string[];                  // Themen-Ressorts
    position?: string;                 // Redaktions-Position
    languages?: string[];              // Arbeitssprachen
    pressCardNumber?: string;          // Presseausweis-Nr.
  };

  // GDPR & Consent
  gdprConsents?: GdprConsent[];        // Consent-Historie

  // Tags & Status
  tagIds?: string[];
  status?: 'active' | 'inactive' | 'archived';
  lifecycleStage?: 'lead' | 'contact' | 'partner' | 'former';

  // Metadata (automatisch)
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt?: Timestamp | null;
}
```

### `ContactEnhancedListView`

Erweiterte Contact für Listen-Ansichten mit berechneten Feldern:
```typescript
interface ContactEnhancedListView extends ContactEnhanced {
  companyName?: string;              // Company Display Name
  lastContactDate?: Timestamp;       // Letzte Interaktion
  emailCampaignStats?: {            // E-Mail-Statistiken
    sent: number;
    opened: number;
    clicked: number;
  };
}
```

### `JournalistContact`

Spezialisierte Contact-Type für Journalisten:
```typescript
interface JournalistContact extends ContactEnhanced {
  publicationDetails?: {
    name: string;
    type: string;
    reach?: number;
  }[];
  performanceMetrics?: {
    totalPitches: number;
    acceptedPitches: number;
    publishedArticles: number;
    averageResponseTime: number;     // in Stunden
  };
}
```

### `GdprConsent`

GDPR-Consent-Datenstruktur:
```typescript
interface GdprConsent {
  id: string;
  type: 'marketing' | 'newsletter' | 'data_processing' | 'third_party_sharing';
  granted: boolean;
  grantedAt: Timestamp;
  source: string;                    // 'web_form', 'email', 'phone', etc.
  ipAddress?: string;                // Nachweis
  userAgent?: string;                // Nachweis
  revokedAt?: Timestamp;             // Widerruf
  revokedBy?: string;                // Widerruf durch User-ID
}
```

---

## Best Practices

### 1. Fehlerbehandlung

```typescript
try {
  const contact = await contactsEnhancedService.getById(id, orgId);
  if (!contact) {
    throw new Error('Kontakt nicht gefunden');
  }
  // ...
} catch (error) {
  console.error('Fehler beim Laden des Kontakts:', error);
  // User-Feedback anzeigen
}
```

### 2. Display-Namen

```typescript
// ✅ Gut: displayName wird automatisch generiert
const contactId = await contactsEnhancedService.create({
  name: { firstName: 'Max', lastName: 'Mustermann', prefix: 'Dr.' }
  // displayName wird zu "Dr. Max Mustermann"
}, context);

// ❌ Nicht notwendig: displayName manuell setzen
const contactId = await contactsEnhancedService.create({
  name: { firstName: 'Max', lastName: 'Mustermann' },
  displayName: 'Max Mustermann'  // Redundant
}, context);
```

### 3. GDPR-Consent Management

```typescript
// ✅ Gut: Consent mit Nachweis
await contactsEnhancedService.addGdprConsent(contactId, {
  id: 'consent_' + Date.now(),
  type: 'marketing',
  granted: true,
  grantedAt: Timestamp.now(),
  source: 'web_form',
  ipAddress: request.ip,           // Wichtig für Nachweis
  userAgent: request.headers['user-agent']
}, context);

// ❌ Schlecht: Consent ohne Nachweis
await contactsEnhancedService.addGdprConsent(contactId, {
  id: 'consent_' + Date.now(),
  type: 'marketing',
  granted: true,
  grantedAt: Timestamp.now(),
  source: 'unknown'
}, context);
```

### 4. Journalist-Filter

```typescript
// ✅ Gut: Spezifische Journalist-Suche
const journalists = await contactsEnhancedService.getJournalists(orgId, {
  beats: ['Wirtschaft'],
  publicationIds: ['pub_handelsblatt']
});

// ❌ Schlecht: Über normale Search mit manueller Filterung
const allContacts = await contactsEnhancedService.getAll(orgId);
const journalists = allContacts.filter(c => c.mediaProfile?.isJournalist);
```

### 5. Partial Updates

```typescript
// ✅ Gut: Nur geänderte Felder
await contactsEnhancedService.update(id, {
  position: 'Senior Redakteur'
}, context);

// ❌ Schlecht: Komplettes Objekt
await contactsEnhancedService.update(id, contact, context);
```

---

## Siehe auch

- [Companies API](./companies.md) - Company-Service-Dokumentation
- [Tags API](./tags.md) - Tag-Service-Dokumentation
- [TypeScript Types](../../src/types/crm-enhanced.ts) - Vollständige Type-Definitionen
- [Components](../components/README.md) - React-Komponenten

---

**Letzte Aktualisierung:** 2025-10-13
**Maintainer:** SKAMP Development Team
