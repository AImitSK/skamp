# API-Dokumentation - Verteiler-Tab

> **Modul**: Projekt-Verteilerlisten API
> **Version**: 2.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 26. Oktober 2025

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Services](#services)
- [Helper-Funktionen](#helper-funktionen)
- [TypeScript-Typen](#typescript-typen)
- [Error-Handling](#error-handling)
- [Best Practices](#best-practices)
- [Code-Beispiele](#code-beispiele)

---

## Übersicht

Die Verteiler-Tab API besteht aus zwei Haupt-Services und mehreren Helper-Modulen:

### Services

1. **project-lists-service**
   - Verwaltung von Projekt-Verteilerlisten
   - Verknüpfung mit Master-Listen
   - CRUD-Operationen für Custom-Listen
   - Kontakte-Abruf

2. **lists-service**
   - Verwaltung von Master-Listen (organisationsweit)
   - Kontakte-Abruf mit Filtern
   - Dynamische Listen-Evaluierung

### Helper-Module

1. **list-helpers.ts**
   - Kategorie-Farben
   - Datum-Formatierung
   - Filter-Optionen

2. **filter-helpers.ts**
   - Filter-Rendering
   - Icon-Mapping
   - Label-Übersetzung

---

## Services

### project-lists-service

**Datei:** `src/lib/firebase/project-lists-service.ts`
**Zeilen:** ~400

Siehe detaillierte Dokumentation: [project-lists-service.md](./project-lists-service.md)

#### Funktionen

| Funktion | Beschreibung | Return Type |
|----------|--------------|-------------|
| `getProjectLists()` | Ruft alle Projekt-Listen ab | `Promise<ProjectDistributionList[]>` |
| `linkMasterList()` | Verknüpft Master-Liste mit Projekt | `Promise<string>` |
| `createProjectList()` | Erstellt neue Projekt-Liste | `Promise<string>` |
| `updateProjectList()` | Aktualisiert Projekt-Liste | `Promise<void>` |
| `unlinkList()` | Entfernt Verknüpfung/löscht Liste | `Promise<void>` |
| `getProjectListContacts()` | Ruft Kontakte einer Liste ab | `Promise<ContactEnhanced[]>` |
| `getMasterListsWithDetails()` | Ruft mehrere Master-Listen ab | `Promise<DistributionList[]>` |

#### Verwendung

```typescript
import { projectListsService } from '@/lib/firebase/project-lists-service';

// Projekt-Listen abrufen
const lists = await projectListsService.getProjectLists(projectId);

// Master-Liste verknüpfen
const listId = await projectListsService.linkMasterList(
  projectId,
  masterListId,
  userId,
  organizationId
);

// Custom Liste erstellen
const newListId = await projectListsService.createProjectList(
  projectId,
  {
    name: 'Lokale Presse Bayern',
    description: 'Regionalpresse für bayerischen Markt',
    category: 'press',
    type: 'dynamic',
    filters: {
      countries: ['DE'],
      publications: {
        geographicScopes: ['regional']
      }
    }
  },
  userId,
  organizationId
);
```

### lists-service

**Datei:** `src/lib/firebase/lists-service.ts`
**Zeilen:** ~592

#### Hauptfunktionen

| Funktion | Beschreibung | Return Type |
|----------|--------------|-------------|
| `getAll()` | Ruft alle Master-Listen einer Org ab | `Promise<DistributionList[]>` |
| `getById()` | Ruft einzelne Master-Liste ab | `Promise<DistributionList \| null>` |
| `getContacts()` | Ruft Kontakte einer Master-Liste ab | `Promise<ContactEnhanced[]>` |
| `create()` | Erstellt neue Master-Liste | `Promise<string>` |
| `update()` | Aktualisiert Master-Liste | `Promise<void>` |
| `delete()` | Löscht Master-Liste | `Promise<void>` |

#### Verwendung

```typescript
import { listsService } from '@/lib/firebase/lists-service';

// Alle Master-Listen abrufen
const masterLists = await listsService.getAll(organizationId);

// Einzelne Liste abrufen
const list = await listsService.getById(listId);

// Kontakte abrufen
const contacts = await listsService.getContacts(list);
```

---

## Helper-Funktionen

### list-helpers.ts

**Datei:** `src/components/projects/distribution/helpers/list-helpers.ts`
**Zeilen:** 64

#### getCategoryColor

```typescript
export function getCategoryColor(category?: string): string
```

**Beschreibung:** Gibt die passende Farbe für eine Listen-Kategorie zurück.

**Parameter:**
- `category` (optional): Kategorie-String ('press', 'customers', 'partners', 'leads', 'custom')

**Return:** Farb-String für Badge-Komponente

**Beispiel:**
```typescript
import { getCategoryColor } from './helpers/list-helpers';

const color = getCategoryColor('press'); // 'purple'
const defaultColor = getCategoryColor(); // 'zinc'
```

**Mapping:**
```typescript
{
  'press': 'purple',
  'customers': 'blue',
  'partners': 'green',
  'leads': 'amber',
  default: 'zinc'
}
```

#### formatDate

```typescript
export function formatDate(timestamp: any): string
```

**Beschreibung:** Formatiert einen Firestore-Timestamp in deutsches Datumsformat.

**Parameter:**
- `timestamp`: Firestore Timestamp-Objekt

**Return:** Formatierter Datums-String (z.B. "26. Okt. 2025")

**Beispiel:**
```typescript
import { formatDate } from './helpers/list-helpers';

const dateStr = formatDate(list.addedAt); // "26. Okt. 2025"
const fallback = formatDate(null); // "Unbekannt"
```

#### Filter-Optionen

**categoryOptions**
```typescript
export const categoryOptions = [
  { value: 'press', label: 'Presse' },
  { value: 'customers', label: 'Kunden' },
  { value: 'partners', label: 'Partner' },
  { value: 'leads', label: 'Leads' },
  { value: 'custom', label: 'Benutzerdefiniert' }
];
```

**projectListTypeOptions**
```typescript
export const projectListTypeOptions = [
  { value: 'linked', label: 'Verknüpft' },
  { value: 'custom', label: 'Projekt' },
  { value: 'combined', label: 'Kombiniert' }
];
```

**masterListTypeOptions**
```typescript
export const masterListTypeOptions = [
  { value: 'dynamic', label: 'Dynamisch' },
  { value: 'static', label: 'Statisch' }
];
```

**Verwendung:**
```typescript
import { categoryOptions, projectListTypeOptions } from './helpers/list-helpers';

<ListFilterButton
  categoryOptions={categoryOptions}
  typeOptions={projectListTypeOptions}
  // ...
/>
```

### filter-helpers.ts

**Datei:** `src/components/projects/distribution/helpers/filter-helpers.ts`
**Zeilen:** 240

#### renderFilterValue

```typescript
export function renderFilterValue(key: string, value: any, tags: Tag[]): string
```

**Beschreibung:** Rendert einen Filter-Wert als menschenlesbaren String.

**Parameter:**
- `key`: Filter-Key (z.B. 'tagIds', 'companyTypes', 'countries')
- `value`: Filter-Wert (Array oder Primitive)
- `tags`: Array von Tag-Objekten für Referenz-Auflösung

**Return:** Formatierter String

**Beispiele:**
```typescript
import { renderFilterValue } from './helpers/filter-helpers';

// Tag-IDs auflösen
renderFilterValue('tagIds', ['tag1', 'tag2'], tags);
// → "Technologie, Innovation"

// Company Types
renderFilterValue('companyTypes', ['media', 'publisher'], []);
// → "Medien, Verlage"

// Countries
renderFilterValue('countries', ['DE', 'AT', 'CH'], []);
// → "Deutschland, Österreich, Schweiz"

// Boolean
renderFilterValue('hasEmail', true, []);
// → "Ja"

// Lange Arrays (>3 Elemente)
renderFilterValue('industries', ['tech', 'finance', 'health', 'education'], []);
// → "tech, finance, health (+1 weitere)"
```

#### renderPublicationFilterValue

```typescript
export function renderPublicationFilterValue(
  key: string,
  value: any,
  publications: Publication[]
): string
```

**Beschreibung:** Rendert einen Publikations-Filter-Wert als menschenlesbaren String.

**Parameter:**
- `key`: Filter-Key (z.B. 'publicationIds', 'types', 'frequencies')
- `value`: Filter-Wert
- `publications`: Array von Publication-Objekten

**Return:** Formatierter String

**Beispiele:**
```typescript
import { renderPublicationFilterValue } from './helpers/filter-helpers';

// Publication IDs
renderPublicationFilterValue('publicationIds', ['pub1', 'pub2'], publications);
// → "Süddeutsche Zeitung, Frankfurter Allgemeine"

// Types
renderPublicationFilterValue('types', ['newspaper', 'magazine'], []);
// → "Zeitung, Magazin"

// Frequencies
renderPublicationFilterValue('frequencies', ['daily', 'weekly'], []);
// → "Täglich, Wöchentlich"

// Geographic Scopes
renderPublicationFilterValue('geographicScopes', ['national', 'international'], []);
// → "National, International"

// Circulation Ranges
renderPublicationFilterValue('minPrintCirculation', 50000, []);
// → "50.000"
```

#### getFilterIcon

```typescript
export function getFilterIcon(key: string): React.ComponentType
```

**Beschreibung:** Gibt das passende Heroicon für einen Filter-Key zurück.

**Parameter:**
- `key`: Filter-Key

**Return:** Heroicon-Komponente

**Mapping:**
```typescript
{
  'companyTypes': BuildingOfficeIcon,
  'industries': BuildingOfficeIcon,
  'countries': GlobeAltIcon,
  'tagIds': TagIcon,
  'positions': UsersIcon,
  'hasEmail': EnvelopeIcon,
  'hasPhone': PhoneIcon,
  'beats': NewspaperIcon,
  'publications': DocumentTextIcon,
  default: FunnelIcon
}
```

**Verwendung:**
```typescript
import { getFilterIcon } from './helpers/filter-helpers';

const Icon = getFilterIcon('tagIds'); // TagIcon
<Icon className="h-4 w-4" />
```

#### getPublicationFilterIcon

```typescript
export function getPublicationFilterIcon(key: string): React.ComponentType
```

**Beschreibung:** Gibt das passende Heroicon für einen Publikations-Filter-Key zurück.

**Mapping:**
```typescript
{
  'publicationIds': DocumentTextIcon,
  'types': NewspaperIcon,
  'formats': DocumentTextIcon,
  'frequencies': ClockIcon,
  'countries': GlobeAltIcon,
  'geographicScopes': GlobeAltIcon,
  'languages': LanguageIcon,
  'focusAreas': TagIcon,
  'targetIndustries': BuildingOfficeIcon,
  'minPrintCirculation': ChartBarIcon,
  'maxPrintCirculation': ChartBarIcon,
  'minOnlineVisitors': ChartBarIcon,
  'maxOnlineVisitors': ChartBarIcon,
  'onlyVerified': CheckCircleIcon,
  'status': ListBulletIcon,
  'publisherIds': BuildingOfficeIcon,
  default: DocumentTextIcon
}
```

#### getFilterLabel

```typescript
export function getFilterLabel(key: string): string
```

**Beschreibung:** Gibt das deutsche Label für einen Filter-Key zurück.

**Mapping:**
```typescript
{
  'companyTypes': 'Firmentypen',
  'industries': 'Branchen',
  'countries': 'Länder',
  'tagIds': 'Tags',
  'positions': 'Positionen',
  'hasEmail': 'Mit E-Mail',
  'hasPhone': 'Mit Telefon',
  'beats': 'Ressorts',
  'publications': 'Publikationen'
}
```

#### getPublicationFilterLabel

```typescript
export function getPublicationFilterLabel(key: string): string
```

**Beschreibung:** Gibt das deutsche Label für einen Publikations-Filter-Key zurück.

**Mapping:**
```typescript
{
  'publicationIds': 'Spezifische Publikationen',
  'types': 'Publikationstypen',
  'formats': 'Formate',
  'frequencies': 'Erscheinungsweise',
  'countries': 'Zielländer',
  'geographicScopes': 'Reichweite',
  'languages': 'Sprachen',
  'focusAreas': 'Themenschwerpunkte',
  'targetIndustries': 'Zielbranchen',
  'minPrintCirculation': 'Min. Druckauflage',
  'maxPrintCirculation': 'Max. Druckauflage',
  'minOnlineVisitors': 'Min. Online-Besucher',
  'maxOnlineVisitors': 'Max. Online-Besucher',
  'onlyVerified': 'Verifizierung',
  'status': 'Status',
  'publisherIds': 'Verlage'
}
```

---

## TypeScript-Typen

### ProjectDistributionList

```typescript
export interface ProjectDistributionList {
  id?: string;
  projectId: string;
  organizationId: string;
  type: 'linked' | 'custom' | 'combined';

  // Für verknüpfte Listen
  masterListId?: string;

  // Für projekt-eigene Listen
  name?: string;
  description?: string;
  category?: string;
  listType?: 'static' | 'dynamic';
  filters?: ListFilters;
  contactIds?: string[];

  // Für kombinierte Listen
  linkedLists?: string[];
  additionalContacts?: string[];

  // Metadaten
  addedBy: string;
  addedAt?: Timestamp;
  lastModified?: Timestamp;

  // Cache
  cachedContactCount?: number;
  cachedContactsSnapshot?: string[];
}
```

### DistributionList

```typescript
export interface DistributionList {
  id?: string;
  organizationId?: string;
  userId?: string;
  name: string;
  description?: string;
  category: 'press' | 'customers' | 'partners' | 'leads' | 'custom';
  type: 'static' | 'dynamic';
  filters?: ListFilters;
  contactIds?: string[];
  contactCount: number;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastUpdated?: Timestamp;
}
```

### ListFilters

```typescript
export interface ListFilters {
  // Basis-Filter
  companyTypes?: string[];
  industries?: string[];
  countries?: string[];
  tagIds?: string[];
  positions?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  beats?: string[];

  // Publikations-Filter
  publications?: {
    publicationIds?: string[];
    types?: string[];
    formats?: string[];
    frequencies?: string[];
    countries?: string[];
    geographicScopes?: string[];
    languages?: string[];
    focusAreas?: string[];
    targetIndustries?: string[];
    minPrintCirculation?: number;
    maxPrintCirculation?: number;
    minOnlineVisitors?: number;
    maxOnlineVisitors?: number;
    onlyVerified?: boolean;
    status?: string[];
    publisherIds?: string[];
  };
}
```

---

## Error-Handling

### Service-Errors

Alle Service-Funktionen werfen Errors bei Fehlern und loggen sie in die Console:

```typescript
try {
  const lists = await projectListsService.getProjectLists(projectId);
} catch (error) {
  console.error('Fehler beim Abrufen der Projekt-Listen:', error);
  // Error wird geworfen, muss in aufrufender Funktion behandelt werden
}
```

### Error-Typen

#### Firestore-Errors

```typescript
try {
  await projectListsService.linkMasterList(/* ... */);
} catch (error) {
  if (error.code === 'permission-denied') {
    // Security Rules verweigern Zugriff
    toastService.error('Zugriff verweigert');
  } else if (error.code === 'not-found') {
    // Dokument nicht gefunden
    toastService.error('Liste nicht gefunden');
  } else {
    // Allgemeiner Fehler
    toastService.error('Fehler beim Verknüpfen der Liste');
  }
}
```

#### Validierungs-Errors

```typescript
try {
  await projectListsService.linkMasterList(
    projectId,
    masterListId,
    userId,
    organizationId
  );
} catch (error) {
  if (error.message === 'Diese Liste ist bereits mit dem Projekt verknüpft') {
    toastService.warning('Liste bereits verknüpft');
  } else if (error.message === 'Master-Liste nicht gefunden') {
    toastService.error('Liste nicht gefunden');
  }
}
```

### Best Practices

**✅ Do:**
```typescript
try {
  await service.method();
  toastService.success('Erfolgsmeldung');
} catch (error) {
  console.error('Kontext:', error); // Für Debugging
  toastService.error('Benutzerfreundliche Fehlermeldung');
}
```

**❌ Don't:**
```typescript
// Keine stillen Fehler
try {
  await service.method();
} catch (error) {
  // Nichts tun - schlecht!
}

// Keine generischen Error-Messages
catch (error) {
  toastService.error('Fehler'); // Zu unspezifisch
}
```

---

## Best Practices

### 1. Service-Aufrufe

**✅ Do:**
```typescript
// Mit try-catch und Toast
try {
  const lists = await projectListsService.getProjectLists(projectId);
  // Verarbeitung
} catch (error) {
  console.error('Fehler beim Laden:', error);
  toastService.error('Fehler beim Laden der Listen');
}
```

**❌ Don't:**
```typescript
// Ohne Error-Handling
const lists = await projectListsService.getProjectLists(projectId); // Kann crashen
```

### 2. Type-Safety

**✅ Do:**
```typescript
// Type Guards verwenden
const isProjectList = (l: any): l is ProjectDistributionList =>
  'projectId' in l;

if (isProjectList(list)) {
  // TypeScript weiß hier, dass list ein ProjectDistributionList ist
  console.log(list.projectId);
}
```

**❌ Don't:**
```typescript
// Type Casting ohne Prüfung
const projectList = list as ProjectDistributionList; // Unsicher
```

### 3. Helper-Funktionen

**✅ Do:**
```typescript
// Helpers importieren und verwenden
import { getCategoryColor, formatDate } from './helpers/list-helpers';

const color = getCategoryColor(list.category);
const date = formatDate(list.addedAt);
```

**❌ Don't:**
```typescript
// Code duplizieren
const color = list.category === 'press' ? 'purple' :
              list.category === 'customers' ? 'blue' : 'zinc'; // Duplikat
```

### 4. Performance

**✅ Do:**
```typescript
// Batch-Operationen für mehrere Listen
const masterListIds = projectLists
  .filter(l => l.type === 'linked' && l.masterListId)
  .map(l => l.masterListId!);

if (masterListIds.length > 0) {
  const details = await projectListsService.getMasterListsWithDetails(masterListIds);
  // Alle auf einmal laden
}
```

**❌ Don't:**
```typescript
// Einzelne Aufrufe in Schleife
for (const list of projectLists) {
  if (list.masterListId) {
    const details = await listsService.getById(list.masterListId); // Langsam!
  }
}
```

---

## Code-Beispiele

### Vollständiger CRUD-Flow

```typescript
import { projectListsService } from '@/lib/firebase/project-lists-service';
import { toastService } from '@/lib/utils/toast';

// 1. Listen abrufen
async function loadLists(projectId: string) {
  try {
    const lists = await projectListsService.getProjectLists(projectId);
    return lists;
  } catch (error) {
    console.error('Fehler beim Laden:', error);
    toastService.error('Fehler beim Laden der Listen');
    return [];
  }
}

// 2. Master-Liste verknüpfen
async function linkMaster(projectId: string, masterListId: string, userId: string, orgId: string) {
  try {
    const listId = await projectListsService.linkMasterList(
      projectId,
      masterListId,
      userId,
      orgId
    );
    toastService.success('Liste erfolgreich verknüpft');
    return listId;
  } catch (error) {
    console.error('Fehler beim Verknüpfen:', error);
    toastService.error('Fehler beim Verknüpfen der Liste');
    return null;
  }
}

// 3. Custom Liste erstellen
async function createCustom(projectId: string, userId: string, orgId: string) {
  try {
    const listId = await projectListsService.createProjectList(
      projectId,
      {
        name: 'Lokale Presse Bayern',
        description: 'Regionalpresse für bayerischen Markt',
        category: 'press',
        type: 'dynamic',
        filters: {
          countries: ['DE'],
          publications: {
            geographicScopes: ['regional']
          }
        }
      },
      userId,
      orgId
    );
    toastService.success('Liste erfolgreich erstellt');
    return listId;
  } catch (error) {
    console.error('Fehler beim Erstellen:', error);
    toastService.error('Fehler beim Erstellen der Liste');
    return null;
  }
}

// 4. Liste aktualisieren
async function updateList(listId: string, updates: any) {
  try {
    await projectListsService.updateProjectList(listId, updates);
    toastService.success('Liste erfolgreich aktualisiert');
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    toastService.error('Fehler beim Aktualisieren der Liste');
  }
}

// 5. Verknüpfung entfernen / Liste löschen
async function deleteList(projectId: string, listId: string) {
  try {
    await projectListsService.unlinkList(projectId, listId);
    toastService.success('Liste erfolgreich entfernt');
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    toastService.error('Fehler beim Löschen der Liste');
  }
}
```

### Filter-Rendering

```typescript
import {
  renderFilterValue,
  getFilterIcon,
  getFilterLabel
} from './helpers/filter-helpers';

function FilterDisplay({ filters, tags }: { filters: ListFilters, tags: Tag[] }) {
  return (
    <div className="space-y-3">
      {Object.entries(filters).map(([key, value]) => {
        if (key === 'publications' || !value) return null;

        const Icon = getFilterIcon(key);
        const label = getFilterLabel(key);
        const displayValue = renderFilterValue(key, value, tags);

        return (
          <div key={key} className="flex items-start gap-3">
            <Icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-700">{label}</p>
              <p className="text-sm text-gray-900">{displayValue}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Batch-Laden von Master-Listen-Details

```typescript
import { projectListsService } from '@/lib/firebase/project-lists-service';

async function loadMasterListDetails(
  projectLists: ProjectDistributionList[]
): Promise<Map<string, DistributionList>> {
  // Alle verknüpften Master-Listen-IDs sammeln
  const linkedMasterIds = projectLists
    .filter(l => l.type === 'linked' && l.masterListId)
    .map(l => l.masterListId!);

  if (linkedMasterIds.length === 0) {
    return new Map();
  }

  // Batch-Laden
  const details = await projectListsService.getMasterListsWithDetails(linkedMasterIds);

  // In Map umwandeln für schnellen Zugriff
  const detailsMap = new Map<string, DistributionList>();
  details.forEach(d => {
    if (d.id) detailsMap.set(d.id, d);
  });

  return detailsMap;
}

// Verwendung
const projectLists = await projectListsService.getProjectLists(projectId);
const masterListDetails = await loadMasterListDetails(projectLists);

// Zugriff
const masterList = masterListDetails.get(projectList.masterListId || '');
const listName = projectList.name || masterList?.name || 'Unbenannt';
```

---

## Siehe auch

- [Detaillierte API-Referenz: project-lists-service.md](./project-lists-service.md)
- [Hauptdokumentation](../README.md)
- [Komponenten-Dokumentation](../components/README.md)
- [Architecture Decision Records](../adr/README.md)

---

**Version:** 2.0.0
**Erstellt:** 26. Oktober 2025
**Maintainer:** CeleroPress Team
