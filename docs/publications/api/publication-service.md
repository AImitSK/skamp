# Publication Service - Detaillierte API-Referenz

**Version:** 1.0
**Service:** `publicationService`
**Pfad:** `@/lib/firebase/library-service`
**Letztes Update:** 15. Oktober 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Import & Setup](#import--setup)
- [Methoden](#methoden)
  - [getAll](#getall)
  - [getById](#getbyid)
  - [create](#create)
  - [update](#update)
  - [softDelete](#softdelete)
  - [verify](#verify)
- [TypeScript-Typen](#typescript-typen)
- [Error Handling](#error-handling)
- [Performance & Caching](#performance--caching)
- [Code-Beispiele](#code-beispiele)

---

## Übersicht

Der `publicationService` ist der zentrale Service für alle Publications-Operationen in Firebase Firestore.

**Hauptfunktionen:**
- CRUD-Operationen für Publications
- Multi-Tenancy Support (organizationId)
- Soft Delete Pattern
- Verification Workflow
- Audit Trail (createdBy, updatedBy, timestamps)

**Firestore Collection:**
```
publications/
├── {publicationId}/
│   ├── id: string
│   ├── title: string
│   ├── type: PublicationType
│   ├── organizationId: string
│   ├── isDeleted: boolean
│   ├── verified: boolean
│   ├── createdAt: Timestamp
│   ├── updatedAt: Timestamp
│   ├── createdBy: string
│   └── updatedBy: string
```

---

## Import & Setup

### Import

```typescript
import { publicationService } from '@/lib/firebase/library-service';
import type { Publication } from '@/types/library';
```

### Context-Objekt

Alle Mutations benötigen ein Context-Objekt:

```typescript
interface Context {
  organizationId: string;  // Multi-Tenancy ID
  userId: string;          // Aktueller User für Audit Trail
}
```

---

## Methoden

### getAll

Lädt alle Publikationen einer Organisation.

**Signatur:**
```typescript
async getAll(organizationId: string): Promise<Publication[]>
```

**Parameter:**
- `organizationId` (string, required) - ID der Organisation

**Return:**
- `Promise<Publication[]>` - Array aller Publikationen (ohne isDeleted)

**Beispiel:**
```typescript
const publications = await publicationService.getAll('org-123');

console.log(`${publications.length} Publikationen geladen`);
publications.forEach(pub => {
  console.log(`- ${pub.title} (${pub.type})`);
});
```

**Query Details:**
```typescript
// Firestore Query:
collection('publications')
  .where('organizationId', '==', organizationId)
  .where('isDeleted', '==', false)
  .orderBy('createdAt', 'desc')
```

**Error Cases:**
- Wirft Error wenn `organizationId` fehlt
- Gibt leeres Array zurück wenn keine Publikationen vorhanden

---

### getById

Lädt eine einzelne Publikation.

**Signatur:**
```typescript
async getById(
  id: string,
  organizationId: string
): Promise<Publication | null>
```

**Parameter:**
- `id` (string, required) - Publikation ID
- `organizationId` (string, required) - Organisation ID

**Return:**
- `Promise<Publication | null>` - Publikation oder null wenn nicht gefunden

**Beispiel:**
```typescript
const publication = await publicationService.getById(
  'pub-123',
  'org-123'
);

if (publication) {
  console.log('Gefunden:', publication.title);
} else {
  console.log('Publikation nicht gefunden');
}
```

**Security:**
- Prüft automatisch auf `organizationId` Match
- Gibt `null` zurück bei falscher Organization
- Filtered gelöschte Publikationen (isDeleted = true)

---

### create

Erstellt eine neue Publikation.

**Signatur:**
```typescript
async create(
  data: Partial<Publication>,
  context: Context
): Promise<Publication>
```

**Parameter:**
- `data` (Partial<Publication>, required) - Publikationsdaten
- `context` (Context, required) - Organization & User Context

**Return:**
- `Promise<Publication>` - Die erstellte Publikation mit ID

**Pflichtfelder:**
```typescript
{
  title: string;              // ✅ Required
  publisherId: string;        // ✅ Required
  publisherName: string;      // ✅ Required
  type: PublicationType;      // ✅ Required
  format: PublicationFormat;  // ✅ Required
  languages: LanguageCode[];  // ✅ Required (min. 1)
  geographicTargets: CountryCode[];  // ✅ Required (min. 1)
}
```

**Beispiel:**
```typescript
const newPublication = await publicationService.create(
  {
    title: 'Süddeutsche Zeitung',
    subtitle: 'Die große Tageszeitung',
    publisherId: 'publisher-123',
    publisherName: 'Süddeutscher Verlag',
    type: 'newspaper',
    format: 'both',
    languages: ['de'],
    geographicTargets: ['DE'],
    focusAreas: ['politics', 'economy'],
    status: 'active',
    verified: false,
    websiteUrl: 'https://www.sueddeutsche.de',
    metrics: {
      frequency: 'daily',
      print: {
        circulation: 250000,
        circulationType: 'sold',
        pricePerIssue: { amount: 3.5, currency: 'EUR' }
      }
    }
  },
  {
    organizationId: 'org-123',
    userId: 'user-456'
  }
);

console.log('Erstellt:', newPublication.id);
```

**Automatisch hinzugefügt:**
```typescript
{
  id: string;                 // Auto-generated
  organizationId: string;     // Aus context
  isDeleted: false;           // Default
  createdAt: Timestamp;       // Jetzt
  updatedAt: Timestamp;       // Jetzt
  createdBy: string;          // context.userId
  updatedBy: string;          // context.userId
}
```

---

### update

Aktualisiert eine bestehende Publikation.

**Signatur:**
```typescript
async update(
  id: string,
  data: Partial<Publication>,
  context: Context
): Promise<void>
```

**Parameter:**
- `id` (string, required) - Publikation ID
- `data` (Partial<Publication>, required) - Update-Daten (partial)
- `context` (Context, required) - Organization & User Context

**Return:**
- `Promise<void>` - Kein Return-Value

**Beispiel - Partial Update:**
```typescript
// Nur Titel updaten
await publicationService.update(
  'pub-123',
  { title: 'Neuer Titel' },
  { organizationId: 'org-123', userId: 'user-456' }
);

// Mehrere Felder
await publicationService.update(
  'pub-123',
  {
    title: 'Updated Title',
    subtitle: 'Updated Subtitle',
    status: 'inactive',
    metrics: {
      frequency: 'weekly',
      print: {
        circulation: 300000
      }
    }
  },
  { organizationId: 'org-123', userId: 'user-456' }
);
```

**Automatisch aktualisiert:**
```typescript
{
  updatedAt: Timestamp;  // Neue Timestamp
  updatedBy: string;     // context.userId
}
```

**Security:**
- Prüft automatisch auf `organizationId` Match
- Verhindert Update von anderen Organizations
- Verhindert Update von gelöschten Publikationen

---

### softDelete

Löscht eine Publikation (Soft Delete Pattern).

**Signatur:**
```typescript
async softDelete(
  id: string,
  context: Context
): Promise<void>
```

**Parameter:**
- `id` (string, required) - Publikation ID
- `context` (Context, required) - Organization & User Context

**Return:**
- `Promise<void>`

**Beispiel:**
```typescript
await publicationService.softDelete(
  'pub-123',
  { organizationId: 'org-123', userId: 'user-456' }
);

console.log('Publikation gelöscht (soft delete)');
```

**Was passiert:**
```typescript
{
  isDeleted: true,       // Flag gesetzt
  deletedAt: Timestamp,  // Timestamp hinzugefügt
  deletedBy: string,     // User-ID
  updatedAt: Timestamp,  // Update-Timestamp
  updatedBy: string      // User-ID
}
```

**Wichtig:**
- ⚠️ Daten bleiben in Firestore (kein Hard Delete)
- ⚠️ Werden in Queries automatisch gefiltert
- ✅ Kann wiederhergestellt werden (isDeleted = false)

---

### verify

Verifiziert eine Publikation.

**Signatur:**
```typescript
async verify(
  id: string,
  context: Context
): Promise<void>
```

**Parameter:**
- `id` (string, required) - Publikation ID
- `context` (Context, required) - Organization & User Context

**Return:**
- `Promise<void>`

**Beispiel:**
```typescript
await publicationService.verify(
  'pub-123',
  { organizationId: 'org-123', userId: 'user-456' }
);

console.log('Publikation verifiziert');
```

**Was passiert:**
```typescript
{
  verified: true,        // Flag gesetzt
  verifiedAt: Timestamp, // Timestamp hinzugefügt
  verifiedBy: string,    // User-ID
  updatedAt: Timestamp,  // Update-Timestamp
  updatedBy: string      // User-ID
}
```

**Use Case:**
- Quality Gates für Publikationen
- Datenqualität sicherstellen
- Review-Workflow

---

## TypeScript-Typen

### Publication

```typescript
interface Publication {
  // IDs & Meta
  id: string;
  organizationId: string;

  // Basic Info
  title: string;
  subtitle?: string;
  publisherId: string;
  publisherName: string;
  type: PublicationType;
  format: PublicationFormat;
  status: PublicationStatus;

  // Localization
  languages: LanguageCode[];
  geographicTargets: CountryCode[];
  geographicScope?: GeographicScope;

  // Content
  focusAreas?: string[];
  websiteUrl?: string;
  internalNotes?: string;

  // Metrics
  metrics?: PublicationMetrics;

  // Identifiers
  identifiers?: PublicationIdentifier[];
  socialMediaUrls?: SocialMediaUrl[];

  // Monitoring
  monitoringConfig?: MonitoringConfig;

  // Flags
  verified: boolean;
  isDeleted: boolean;

  // Audit Trail
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  verifiedAt?: Timestamp;
  verifiedBy?: string;
  deletedAt?: Timestamp;
  deletedBy?: string;
}
```

### PublicationType

```typescript
type PublicationType =
  | 'newspaper'          // Zeitung
  | 'magazine'           // Magazin
  | 'journal'            // Fachzeitschrift
  | 'trade_publication'  // Branchenpublikation
  | 'newsletter'         // Newsletter
  | 'website'            // Website
  | 'blog'               // Blog
  | 'news_portal'        // Nachrichtenportal
  | 'broadcast'          // TV/Radio
  | 'podcast'            // Podcast
  | 'social_media'       // Social Media
  | 'other';             // Sonstiges
```

### PublicationFormat

```typescript
type PublicationFormat =
  | 'print'      // Nur Print
  | 'online'     // Nur Digital
  | 'both'       // Print & Digital
  | 'broadcast'; // TV/Radio
```

### PublicationMetrics

```typescript
interface PublicationMetrics {
  frequency: PublicationFrequency;
  targetAudience?: string;
  targetAgeGroup?: string;
  targetGender?: 'all' | 'predominantly_male' | 'predominantly_female';

  // Print-spezifisch
  print?: {
    circulation?: number;
    circulationType?: 'sold' | 'distributed' | 'free';
    pricePerIssue?: Money;
    subscriptionPrice?: {
      monthly?: Money;
      annual?: Money;
    };
    pageCount?: number;
    paperFormat?: string;
  };

  // Online-spezifisch
  online?: {
    monthlyUniqueVisitors?: number;
    monthlyPageViews?: number;
    avgSessionDuration?: number;
    bounceRate?: number;
    registeredUsers?: number;
    paidSubscribers?: number;
    newsletterSubscribers?: number;
    domainAuthority?: number;
    hasPaywall?: boolean;
    hasMobileApp?: boolean;
  };
}
```

### MonitoringConfig

```typescript
interface MonitoringConfig {
  isEnabled: boolean;
  websiteUrl: string;
  rssFeedUrls: string[];
  autoDetectRss?: boolean;
  checkFrequency: 'daily' | 'twice_daily';
  keywords?: string[];
  totalArticlesFound?: number;
}
```

---

## Error Handling

### Standard-Errors

**Missing organizationId:**
```typescript
try {
  await publicationService.getAll('');
} catch (error) {
  console.error(error.message); // "No organization"
}
```

**Missing ID:**
```typescript
try {
  await publicationService.getById('', 'org-123');
} catch (error) {
  console.error(error.message); // "No ID"
}
```

**Permission Denied:**
```typescript
try {
  await publicationService.getAll('other-org-id');
} catch (error) {
  console.error(error.code); // "permission-denied"
}
```

### Best Practices

```typescript
async function loadPublications(orgId: string) {
  try {
    const pubs = await publicationService.getAll(orgId);
    return pubs;
  } catch (error) {
    console.error('Fehler beim Laden:', error);

    // Toast-Notification
    toastService.error('Publikationen konnten nicht geladen werden');

    // Fallback
    return [];
  }
}
```

---

## Performance & Caching

### React Query Empfehlung

**❌ Direkte Service-Calls vermeiden:**
```typescript
// Nicht empfohlen in Components
const pubs = await publicationService.getAll(orgId);
```

**✅ React Query Hooks verwenden:**
```typescript
// Empfohlen: Automatisches Caching
const { data: pubs } = usePublications(orgId);
```

### Caching-Strategie

Mit React Query:
- **StaleTime:** 5 Minuten
- **CacheTime:** 10 Minuten
- **Refetch on Window Focus:** Ja
- **Background Refetching:** Ja

### Batch Operations

Für Bulk-Updates:

```typescript
// ❌ Nicht: Individual Updates
for (const id of publicationIds) {
  await publicationService.update(id, data, context);
}

// ✅ Besser: Batch Write (wenn verfügbar)
// Oder: Promise.all() für parallele Ausführung
await Promise.all(
  publicationIds.map(id =>
    publicationService.update(id, data, context)
  )
);
```

---

## Code-Beispiele

### Kompletter CRUD-Flow

```typescript
import { publicationService } from '@/lib/firebase/library-service';

async function fullCrudExample(
  organizationId: string,
  userId: string
) {
  const context = { organizationId, userId };

  // 1. CREATE
  const newPub = await publicationService.create(
    {
      title: 'Test Publication',
      publisherId: 'pub-123',
      publisherName: 'Test Publisher',
      type: 'magazine',
      format: 'online',
      languages: ['de'],
      geographicTargets: ['DE'],
      status: 'active',
      verified: false,
    },
    context
  );
  console.log('Created:', newPub.id);

  // 2. READ (List)
  const allPubs = await publicationService.getAll(organizationId);
  console.log(`Total: ${allPubs.length} publications`);

  // 3. READ (Single)
  const pub = await publicationService.getById(newPub.id, organizationId);
  console.log('Loaded:', pub?.title);

  // 4. UPDATE
  await publicationService.update(
    newPub.id,
    { title: 'Updated Title' },
    context
  );
  console.log('Updated');

  // 5. VERIFY
  await publicationService.verify(newPub.id, context);
  console.log('Verified');

  // 6. DELETE
  await publicationService.softDelete(newPub.id, context);
  console.log('Deleted (soft)');
}
```

### Error Handling Best Practice

```typescript
async function safeLoad(orgId: string) {
  try {
    if (!orgId) {
      throw new Error('Organization ID required');
    }

    const publications = await publicationService.getAll(orgId);

    if (publications.length === 0) {
      console.log('Keine Publikationen gefunden');
    }

    return publications;

  } catch (error: any) {
    // Log für Debugging
    console.error('Load Error:', {
      message: error.message,
      code: error.code,
      orgId
    });

    // User-Friendly Message
    if (error.code === 'permission-denied') {
      throw new Error('Zugriff verweigert');
    } else if (error.message === 'No organization') {
      throw new Error('Keine Organisation ausgewählt');
    } else {
      throw new Error('Fehler beim Laden der Publikationen');
    }
  }
}
```

---

**Nächste Schritte:**

- 📖 [Zurück zur API-Übersicht](./README.md)
- 📖 [Komponenten-Dokumentation](../components/README.md)
- 📖 [Hauptdokumentation](../README.md)
