# Companies Enhanced Service API

**Service:** `companiesEnhancedService`
**Collection:** `companies_enhanced`
**Type:** `CompanyEnhanced`

---

## Übersicht

Der `companiesEnhancedService` ist der zentrale Firebase Service für die Verwaltung von Firmen im CRM-System. Er bietet volle CRUD-Funktionalität, erweiterte Suche, Import/Export und Multi-Tenancy-Unterstützung.

## Import

```typescript
import { companiesEnhancedService } from '@/lib/firebase/crm-service-enhanced';
```

---

## Methoden

### `getAll(organizationId: string): Promise<CompanyEnhanced[]>`

Lädt alle Firmen für eine Organization.

**Parameter:**
- `organizationId` (string) - ID der Organization

**Returns:** `Promise<CompanyEnhanced[]>`

**Beispiel:**
```typescript
const companies = await companiesEnhancedService.getAll(currentOrganization.id);
```

**Features:**
- ✅ Inkludiert Company-References (globale Firmen) transparent
- ✅ Automatische Multi-Tenancy-Filterung
- ✅ Erweitert um berechnete Metriken (contactCount)

---

### `getById(id: string, organizationId: string): Promise<CompanyEnhanced | null>`

Lädt eine einzelne Firma nach ID.

**Parameter:**
- `id` (string) - Company ID
- `organizationId` (string) - Organization ID

**Returns:** `Promise<CompanyEnhanced | null>`

**Beispiel:**
```typescript
const company = await companiesEnhancedService.getById('company_123', orgId);
if (company) {
  console.log(company.name, company.website);
}
```

**Features:**
- ✅ Unterstützt echte Company-IDs
- ✅ Unterstützt Company-Reference-IDs (Multi-Entity System)
- ✅ Returns `null` wenn nicht gefunden

---

### `create(data, context): Promise<string>`

Erstellt eine neue Firma.

**Parameter:**
- `data` (`Omit<CompanyEnhanced, 'id' | 'createdAt' | 'updatedAt' | ...>`) - Company-Daten
- `context` (`{ organizationId: string; userId: string; autoGlobalMode?: boolean }`) - Kontext

**Returns:** `Promise<string>` - ID der erstellten Firma

**Pflichtfelder:**
- `officialName` - Offizieller Firmenname

**Beispiel:**
```typescript
const companyId = await companiesEnhancedService.create({
  officialName: 'ACME GmbH',
  tradingName: 'ACME',
  name: 'ACME', // Wird automatisch gesetzt wenn nicht vorhanden
  type: 'customer',
  mainAddress: {
    street: 'Musterstraße 123',
    city: 'München',
    postalCode: '80331',
    countryCode: 'DE'
  },
  website: 'https://acme.de',
  emails: [{
    type: 'general',
    email: 'info@acme.de',
    isPrimary: true
  }]
}, {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
});
```

**Validierung:**
- ❌ Fehler wenn `officialName` fehlt oder leer
- ✅ `name` wird automatisch aus `tradingName` oder `officialName` generiert

**Globaler Modus:**
- Wenn `autoGlobalMode: true`, wird Firma als global erstellt (SuperAdmin)

---

### `update(id: string, data, context): Promise<void>`

Aktualisiert eine bestehende Firma.

**Parameter:**
- `id` (string) - Company ID
- `data` (`Partial<CompanyEnhanced>`) - Zu aktualisierende Felder
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await companiesEnhancedService.update('company_123', {
  name: 'ACME Corporation',
  website: 'https://acme-corp.de',
  status: 'active'
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

Löscht eine Firma (Soft Delete).

**Parameter:**
- `id` (string) - Company ID
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await companiesEnhancedService.delete('company_123', {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
});
```

**Soft Delete:**
- Firma wird nicht aus Firestore gelöscht
- `deletedAt` und `deletedBy` werden gesetzt
- Nicht mehr in `getAll()` sichtbar

---

### `searchEnhanced(organizationId, filters, options): Promise<CompanyEnhancedListView[]>`

Erweiterte Suche mit Filtern.

**Parameter:**
- `organizationId` (string) - Organization ID
- `filters` (object) - Such-Filter
  - `search?: string` - Volltext-Suche (Name, Official Name, Trading Name, City, Identifiers)
  - `types?: string[]` - Filter nach Firmen-Typen
  - `industries?: string[]` - Filter nach Branchen
  - `countries?: string[]` - Filter nach Ländern (Country Codes)
  - `parentCompanyId?: string` - Filter nach Muttergesellschaft
  - `hasPublications?: boolean` - Nur Firmen mit Publications
  - `status?: string[]` - Filter nach Status
  - `tagIds?: string[]` - Filter nach Tags
- `options` (`QueryOptions`) - Optionale Query-Optionen

**Returns:** `Promise<CompanyEnhancedListView[]>` - Erweiterte Companies mit Metriken

**Beispiel:**
```typescript
// Suche nach Kunden in Deutschland mit Tag "VIP"
const companies = await companiesEnhancedService.searchEnhanced(
  currentOrganization.id,
  {
    types: ['customer'],
    countries: ['DE'],
    tagIds: ['tag_vip']
  }
);

// Volltext-Suche
const results = await companiesEnhancedService.searchEnhanced(
  currentOrganization.id,
  { search: 'Verlag München' }
);
```

**Performance:**
- Client-seitige Filterung für komplexe Queries
- Automatische Metrik-Berechnung (contactCount)

---

### `getSubsidiaries(parentCompanyId, organizationId, recursive): Promise<CompanyEnhanced[]>`

Lädt alle Tochtergesellschaften einer Firma.

**Parameter:**
- `parentCompanyId` (string) - ID der Muttergesellschaft
- `organizationId` (string) - Organization ID
- `recursive` (boolean) - Wenn `true`, lädt auch Unter-Tochtergesellschaften

**Returns:** `Promise<CompanyEnhanced[]>`

**Beispiel:**
```typescript
// Direkte Töchter
const subsidiaries = await companiesEnhancedService.getSubsidiaries(
  'company_parent',
  currentOrganization.id,
  false
);

// Komplette Konzernstruktur
const allSubsidiaries = await companiesEnhancedService.getSubsidiaries(
  'company_parent',
  currentOrganization.id,
  true
);
```

---

### `import(companies, context, options): Promise<ImportResult>`

Importiert mehrere Firmen mit Duplikat-Prüfung.

**Parameter:**
- `companies` (`Partial<CompanyEnhanced>[]`) - Array von Firmen-Daten
- `context` (`{ organizationId: string; userId: string; autoGlobalMode?: boolean }`)
- `options` (object)
  - `duplicateCheck?: boolean` - Duplikat-Prüfung aktivieren (default: false)
  - `updateExisting?: boolean` - Bestehende Firmen aktualisieren (default: false)

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
const result = await companiesEnhancedService.import(
  [
    { officialName: 'Firma A', type: 'customer' },
    { officialName: 'Firma B', type: 'partner' }
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
- Prüft nach Identifiers (VAT, Tax Number, etc.)
- Prüft nach gleichem Namen
- Bei Match: Überspringt oder aktualisiert je nach `updateExisting`

---

## Typen

### `CompanyEnhanced`

Vollständige Type-Definition siehe: [`src/types/crm-enhanced.ts:22-138`](../../src/types/crm-enhanced.ts)

**Wichtigste Felder:**
```typescript
interface CompanyEnhanced {
  // Basis
  id?: string;
  name: string;                      // Anzeigename
  officialName: string;              // Offizieller Name
  tradingName?: string;              // Handelsname
  type: CompanyType;                 // customer, partner, publisher, etc.

  // Adresse & Kontakt
  mainAddress?: InternationalAddress;
  emails?: { type: string; email: string; isPrimary?: boolean }[];
  phones?: PhoneNumber[];
  website?: string;

  // Business Info
  legalForm?: string;                // GmbH, AG, Ltd., etc.
  identifiers?: BusinessIdentifier[]; // VAT, Tax Number, etc.
  industryClassification?: IndustryClassification;
  financial?: FinancialInfo;

  // Konzernstruktur
  parentCompanyId?: string;
  subsidiaryIds?: string[];

  // Tags & Status
  tagIds?: string[];
  status?: 'prospect' | 'active' | 'inactive' | 'archived';
  lifecycleStage?: 'lead' | 'opportunity' | 'customer' | 'partner' | 'former';

  // Metadata (automatisch)
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt?: Timestamp | null;
}
```

### `CompanyEnhancedListView`

Erweiterte Company für Listen-Ansichten mit berechneten Feldern:
```typescript
interface CompanyEnhancedListView extends CompanyEnhanced {
  contactCount?: number;         // Anzahl zugeordneter Kontakte
  lastContactDate?: Timestamp;   // Letzte Kontakt-Interaktion
  openOpportunities?: number;    // Offene Opportunities
  totalRevenue?: MoneyAmount;    // Gesamt-Umsatz
}
```

---

## Best Practices

### 1. Fehlerbehandlung

```typescript
try {
  const company = await companiesEnhancedService.getById(id, orgId);
  if (!company) {
    throw new Error('Firma nicht gefunden');
  }
  // ...
} catch (error) {
  console.error('Fehler beim Laden der Firma:', error);
  // User-Feedback anzeigen
}
```

### 2. Performance-Optimierung

```typescript
// ✅ Gut: Lade einmal, dann filter client-seitig
const allCompanies = await companiesEnhancedService.getAll(orgId);
const customers = allCompanies.filter(c => c.type === 'customer');
const partners = allCompanies.filter(c => c.type === 'partner');

// ❌ Schlecht: Mehrfach laden
const customers = await companiesEnhancedService.searchEnhanced(orgId, { types: ['customer'] });
const partners = await companiesEnhancedService.searchEnhanced(orgId, { types: ['partner'] });
```

### 3. Partial Updates

```typescript
// ✅ Gut: Nur geänderte Felder
await companiesEnhancedService.update(id, {
  website: 'https://new-website.de'
}, context);

// ❌ Schlecht: Komplettes Objekt
await companiesEnhancedService.update(id, company, context);
```

---

## Siehe auch

- [Contacts API](./contacts.md) - Kontakt-Service-Dokumentation
- [Tags API](./tags.md) - Tag-Service-Dokumentation
- [TypeScript Types](../../src/types/crm-enhanced.ts) - Vollständige Type-Definitionen
- [Components](../components/README.md) - React-Komponenten

---

**Letzte Aktualisierung:** 2025-10-13
**Maintainer:** SKAMP Development Team
