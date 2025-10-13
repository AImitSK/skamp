# CRM Firebase Services API Reference

**Version:** 2.0
**Status:** Production Ready
**Last Updated:** 2025-10-13

## Übersicht

Die CRM Firebase Services bieten eine umfassende API für die Verwaltung von Firmen, Kontakten und Tags in der SKAMP-Plattform. Alle Services basieren auf Firestore und bieten volle CRUD-Funktionalität, Multi-Tenancy-Support und erweiterte Features wie Multi-Entity-References.

## Services

### 📦 [Companies Enhanced Service](./companies.md)
**Collection:** `companies_enhanced`
**Service:** `companiesEnhancedService`

Verwaltung von Firmen und Organisationen mit erweiterten Geschäftsdaten.

**Key Features:**
- ✅ Vollständige CRUD-Operationen
- ✅ Erweiterte Suche & Filter
- ✅ Konzernstrukturen (Parent/Subsidiaries)
- ✅ Business-Identifikatoren (VAT, Tax Numbers)
- ✅ Finanzinformationen
- ✅ CSV Import/Export
- ✅ Multi-Entity References (Globale Firmen)

**Quick Start:**
```typescript
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';

// Alle Firmen laden
const companies = await companiesEnhancedService.getAll(organizationId);

// Neue Firma erstellen
const companyId = await companiesEnhancedService.create({
  officialName: 'ACME GmbH',
  type: 'customer',
  mainAddress: { city: 'München', countryCode: 'DE' }
}, { organizationId, userId });
```

---

### 👥 [Contacts Enhanced Service](./contacts.md)
**Collection:** `contacts_enhanced`
**Service:** `contactsEnhancedService`

Verwaltung von Kontakten und Journalisten mit GDPR-Compliance.

**Key Features:**
- ✅ Vollständige CRUD-Operationen
- ✅ Journalist-spezifische Funktionen
- ✅ GDPR-Consent-Management
- ✅ Multi-Entity References (Globale Journalisten)
- ✅ Publication & Beat-Tracking
- ✅ Social Media Profile
- ✅ CSV Import/Export

**Quick Start:**
```typescript
import { contactsEnhancedService } from '@/lib/firebase/crm-service-enhanced';

// Alle Kontakte laden
const contacts = await contactsEnhancedService.getAll(organizationId);

// Journalist-Filter
const journalists = await contactsEnhancedService.getJournalists(organizationId, {
  beats: ['Wirtschaft']
});

// GDPR-Consent hinzufügen
await contactsEnhancedService.addGdprConsent(contactId, {
  type: 'marketing',
  granted: true,
  grantedAt: Timestamp.now(),
  source: 'web_form'
}, { organizationId, userId });
```

---

### 🏷️ [Tags Enhanced Service](./tags.md)
**Collection:** `tags`
**Service:** `tagsEnhancedService`

Verwaltung von Tags für Kategorisierung und Filterung.

**Key Features:**
- ✅ Vollständige CRUD-Operationen
- ✅ Verwendungs-Statistiken (Usage Count)
- ✅ Tag-Merging (Duplikat-Bereinigung)
- ✅ Legacy-Kompatibilität

**Quick Start:**
```typescript
import { tagsEnhancedService } from '@/lib/firebase/crm-service-enhanced';

// Tags mit Statistiken laden
const tags = await tagsEnhancedService.getWithUsageCount(organizationId);

// Neuen Tag erstellen
const tagId = await tagsEnhancedService.create({
  name: 'Premium',
  color: 'blue',
  description: 'Premium-Kunden'
}, { organizationId, userId });

// Tags mergen
await tagsEnhancedService.mergeTags(duplicateTagId, mainTagId, { organizationId, userId });
```

---

## Gemeinsame Features

Alle Services teilen diese grundlegenden Features:

### 🔐 Multi-Tenancy

Alle Services isolieren Daten automatisch nach `organizationId`:

```typescript
// Context-Object für alle Operationen
const context = {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
};

// Automatische Filterung nach Organization
const data = await service.getAll(context.organizationId);
```

### 🗑️ Soft Delete

Alle Delete-Operationen sind non-destructive:

```typescript
// Soft Delete
await service.delete(id, context);

// Entity existiert noch in Firestore mit:
// - deletedAt: Timestamp
// - deletedBy: userId

// Nicht mehr in getAll() sichtbar
const entities = await service.getAll(organizationId); // Exkludiert gelöschte
```

### 📝 Audit Trail

Alle Entities haben automatische Timestamp-Felder:

```typescript
interface BaseEntity {
  createdAt: Timestamp;      // Automatisch bei create()
  updatedAt: Timestamp;      // Automatisch bei update()
  createdBy: string;         // User-ID vom Context
  updatedBy: string;         // User-ID vom Context
  deletedAt?: Timestamp;     // Bei delete() gesetzt
  deletedBy?: string;        // User-ID bei delete()
}
```

### 🔍 Erweiterte Suche

Alle Services bieten `searchEnhanced()` mit Client-Side Filtering:

```typescript
const results = await companiesEnhancedService.searchEnhanced(
  organizationId,
  {
    search: 'Verlag München',      // Volltext-Suche
    types: ['customer'],            // Multi-Filter
    countries: ['DE'],              // Arrays
    tagIds: ['tag_vip']            // Tag-Filter
  }
);
```

### 📊 Import/Export

Companies und Contacts unterstützen Bulk-Operationen:

```typescript
// CSV Import mit Duplikat-Prüfung
const result = await service.import(
  data,
  context,
  {
    duplicateCheck: true,
    updateExisting: false
  }
);

console.log(`Erstellt: ${result.created}, Fehler: ${result.errors.length}`);
```

---

## TypeScript Types

Alle Types sind in `@/types/crm-enhanced.ts` definiert:

```typescript
import {
  CompanyEnhanced,
  ContactEnhanced,
  CompanyEnhancedListView,
  ContactEnhancedListView
} from '@/types/crm-enhanced';

import { Tag } from '@/types/crm'; // Legacy-Type
```

### Wichtigste Types

**CompanyEnhanced:**
- `id`, `name`, `officialName`, `tradingName`
- `type` (customer, partner, publisher, etc.)
- `mainAddress`, `emails`, `phones`, `website`
- `legalForm`, `identifiers`, `industryClassification`
- `parentCompanyId`, `subsidiaryIds`
- `tagIds`, `status`, `lifecycleStage`

**ContactEnhanced:**
- `id`, `name` (StructuredName), `displayName`
- `companyId`, `position`, `department`
- `emails`, `phones`, `addresses`, `website`
- `socialProfiles`, `mediaProfile` (Journalist-Daten)
- `gdprConsents`, `tagIds`, `status`

**Tag/TagEnhanced:**
- `id`, `name`, `color`, `description`
- `contactCount`, `companyCount` (Usage Stats)
- `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

---

## Multi-Entity Reference System

Das CRM unterstützt **Globale Entities** (Premium-Datenbank) transparent über ein Reference-System:

### Wie es funktioniert

1. **Globale Companies** (z.B. "Springer Verlag") existieren in `companies_enhanced` mit `isGlobal: true`
2. **Globale Contacts** (z.B. Journalisten) existieren in `contacts_enhanced` mit `isGlobal: true`
3. **Organizations** erstellen **References** statt eigene Kopien
4. **Services** kombinieren automatisch echte Entities + References

### Beispiel: Journalist-Reference

```typescript
// Globaler Journalist existiert in Premium-DB
const globalJournalist = {
  id: 'global_journalist_123',
  isGlobal: true,
  displayName: 'Max Mustermann',
  // ... vollständige Journalist-Daten
};

// Organization erstellt Reference
const reference = {
  localJournalistId: 'local-ref-journalist-xyz',
  globalJournalistId: 'global_journalist_123',
  organizationId: 'org_abc',
  // Lokale Metadaten (Notes, Tags)
  notes: 'Guter Kontakt für Tech-Themen',
  tags: ['vip']
};

// Service-Call gibt BEIDE zurück (transparent)
const contacts = await contactsEnhancedService.getAll('org_abc');
// → Enthält echte Kontakte UND Referenced Journalists

// UI zeigt Reference-Marker
if (contact._isReference) {
  // Read-Only für globale Daten
  // Editierbar: Lokale Metadaten (Notes, Tags)
}
```

### Vorteile

- ✅ **Single Source of Truth** für globale Daten
- ✅ **Immer aktuell** (keine veralteten Kopien)
- ✅ **Speicher-effizient** (keine Duplikate)
- ✅ **Transparent** für bestehende Services
- ✅ **Lokale Anpassungen** möglich (Notes, Tags)

---

## Fehlerbehandlung

### Standard-Pattern

```typescript
try {
  const entity = await service.getById(id, organizationId);

  if (!entity) {
    throw new Error('Entity nicht gefunden');
  }

  // ... weitere Logik

} catch (error) {
  console.error('Fehler beim Laden:', error);

  // User-Feedback
  toast.error(
    error instanceof Error
      ? error.message
      : 'Ein unbekannter Fehler ist aufgetreten'
  );
}
```

### Import-Fehlerbehandlung

```typescript
const result = await service.import(data, context, { duplicateCheck: true });

// Zeige Zusammenfassung
console.log(`Erfolgreich: ${result.created} erstellt, ${result.updated} aktualisiert`);

// Fehler verarbeiten
if (result.errors.length > 0) {
  console.error('Fehler beim Import:');
  result.errors.forEach(err => {
    console.error(`  Zeile ${err.row}: ${err.error}`);
  });
}

// Warnungen verarbeiten
if (result.warnings.length > 0) {
  console.warn('Warnungen:');
  result.warnings.forEach(warn => {
    console.warn(`  Zeile ${warn.row}: ${warn.warning}`);
  });
}
```

---

## Performance Best Practices

### 1. Lade einmal, filter client-seitig

```typescript
// ✅ Gut
const allCompanies = await companiesEnhancedService.getAll(orgId);
const customers = allCompanies.filter(c => c.type === 'customer');
const partners = allCompanies.filter(c => c.type === 'partner');

// ❌ Schlecht
const customers = await companiesEnhancedService.searchEnhanced(orgId, { types: ['customer'] });
const partners = await companiesEnhancedService.searchEnhanced(orgId, { types: ['partner'] });
```

### 2. Verwende useMemo für Filter

```typescript
const filteredCompanies = useMemo(() => {
  let result = companies;

  if (selectedTypes.length > 0) {
    result = result.filter(c => selectedTypes.includes(c.type));
  }

  if (searchQuery) {
    result = result.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return result;
}, [companies, selectedTypes, searchQuery]);
```

### 3. Parallel Loading

```typescript
// ✅ Gut: Parallel laden
const [companies, contacts, tags] = await Promise.all([
  companiesEnhancedService.getAll(orgId),
  contactsEnhancedService.getAll(orgId),
  tagsEnhancedService.getAll(orgId)
]);

// ❌ Schlecht: Sequentiell
const companies = await companiesEnhancedService.getAll(orgId);
const contacts = await contactsEnhancedService.getAll(orgId);
const tags = await tagsEnhancedService.getAll(orgId);
```

### 4. Partial Updates

```typescript
// ✅ Gut: Nur geänderte Felder
await service.update(id, { website: 'https://new-url.de' }, context);

// ❌ Schlecht: Komplettes Objekt
await service.update(id, entity, context);
```

---

## Testing

Alle Services sind vollständig getestet:

### Unit Tests

```typescript
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';

describe('CompaniesEnhancedService', () => {
  it('should create a company', async () => {
    const id = await companiesEnhancedService.create(mockData, context);
    expect(id).toBeDefined();
  });

  it('should throw error for missing officialName', async () => {
    await expect(
      companiesEnhancedService.create({ name: 'Test' }, context)
    ).rejects.toThrow('Offizieller Firmenname ist erforderlich');
  });
});
```

### Integration Tests

```typescript
describe('CRM Integration', () => {
  it('should handle complete CRUD flow', async () => {
    // Create
    const id = await companiesEnhancedService.create(mockData, context);

    // Read
    const company = await companiesEnhancedService.getById(id, orgId);
    expect(company).toBeDefined();

    // Update
    await companiesEnhancedService.update(id, { website: 'https://new.de' }, context);
    const updated = await companiesEnhancedService.getById(id, orgId);
    expect(updated?.website).toBe('https://new.de');

    // Delete
    await companiesEnhancedService.delete(id, context);
    const deleted = await companiesEnhancedService.getById(id, orgId);
    expect(deleted).toBeNull();
  });
});
```

---

## Migration von Legacy-Services

### Von altem CRM-Service

```typescript
// Alt
import { crmService } from '@/lib/firebase/crm-service';
const companies = await crmService.getCompanies(orgId);

// Neu
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
const companies = await companiesEnhancedService.getAll(orgId);
```

### Von altem Tag-Service

```typescript
// Alt
import { tagService } from '@/lib/firebase/tag-service';
const tags = await tagService.getTags(userId);

// Neu
import { tagsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
const tags = await tagsEnhancedService.getAllAsLegacyTags(organizationId);
```

---

## Siehe auch

- **API Docs:**
  - [Companies API](./companies.md) - Firmen-Service-Dokumentation
  - [Contacts API](./contacts.md) - Kontakt-Service-Dokumentation
  - [Tags API](./tags.md) - Tag-Service-Dokumentation

- **Components:**
  - [Component Docs](../components/README.md) - React-Komponenten

- **Architecture:**
  - [ADR-0001: Testing Strategy](../adr/ADR-0001-crm-module-testing-strategy.md)
  - [ADR-0002: Route-Based Navigation](../adr/ADR-0002-route-based-navigation.md)

- **Types:**
  - [`src/types/crm-enhanced.ts`](../../../src/types/crm-enhanced.ts) - TypeScript Types
  - [`src/types/crm.ts`](../../../src/types/crm.ts) - Legacy Types

- **Implementation:**
  - [`src/lib/firebase/crm-service-enhanced.ts`](../../../src/lib/firebase/crm-service-enhanced.ts) - Service-Implementierung

---

**Maintainer:** SKAMP Development Team
**Contact:** dev@skamp.de
**Version:** 2.0
**Last Review:** 2025-10-13
**Next Review:** Q2 2026
