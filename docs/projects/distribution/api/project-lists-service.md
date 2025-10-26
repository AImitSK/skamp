# project-lists-service API-Referenz

> **Service**: Projekt-Verteilerlisten Management
> **Datei**: `src/lib/firebase/project-lists-service.ts`
> **Zeilen**: 401
> **Version**: 2.0.0

---

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Interface: ProjectDistributionList](#interface-projectdistributionlist)
- [Funktionen](#funktionen)
  - [getProjectLists](#getprojectlists)
  - [linkMasterList](#linkmasterlist)
  - [createProjectList](#createprojectlist)
  - [createCombinedList](#createcombinedlist)
  - [getProjectListContacts](#getprojectlistcontacts)
  - [unlinkList](#unlinklist)
  - [updateProjectList](#updateprojectlist)
  - [Helper-Funktionen](#helper-funktionen)
- [Code-Beispiele](#code-beispiele)
- [Error-Handling](#error-handling)
- [Performance-Hinweise](#performance-hinweise)

---

## Übersicht

Der `projectListsService` verwaltet Projekt-spezifische Verteilerlisten. Diese Listen können sein:
- **Linked**: Verknüpft mit einer Master-Liste
- **Custom**: Projektspezifische Liste (dynamisch oder statisch)
- **Combined**: Kombination mehrerer Listen

**Firestore Collection:** `project_distribution_lists`

---

## Interface: ProjectDistributionList

```typescript
export interface ProjectDistributionList {
  // IDs
  id?: string;
  projectId: string;
  organizationId: string;

  // Typ
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

### Feld-Beschreibungen

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | `string?` | Dokument-ID |
| `projectId` | `string` | Firestore Projekt-ID |
| `organizationId` | `string` | Organisations-ID (für Security Rules) |
| `type` | `'linked' \| 'custom' \| 'combined'` | Listen-Typ |
| `masterListId` | `string?` | Referenz zur Master-Liste (nur bei `type='linked'`) |
| `name` | `string?` | Listen-Name (nur bei `type='custom' \| 'combined'`) |
| `description` | `string?` | Listen-Beschreibung |
| `category` | `string?` | Kategorie ('press', 'customers', etc.) |
| `listType` | `'static' \| 'dynamic'?` | Typ (nur bei `type='custom'`) |
| `filters` | `ListFilters?` | Filter-Objekt (nur bei `listType='dynamic'`) |
| `contactIds` | `string[]?` | Kontakt-IDs (nur bei `listType='static'`) |
| `linkedLists` | `string[]?` | Master-Listen-IDs (nur bei `type='combined'`) |
| `additionalContacts` | `string[]?` | Zusätzliche Kontakt-IDs (nur bei `type='combined'`) |
| `addedBy` | `string` | User-ID des Erstellers |
| `addedAt` | `Timestamp?` | Erstellungszeitpunkt |
| `lastModified` | `Timestamp?` | Letzte Änderung |
| `cachedContactCount` | `number?` | Gecachte Kontaktanzahl (Performance) |
| `cachedContactsSnapshot` | `string[]?` | Snapshot der Kontakt-IDs (nur bei `type='combined'`) |

---

## Funktionen

### getProjectLists

```typescript
async getProjectLists(projectId: string): Promise<ProjectDistributionList[]>
```

**Beschreibung:** Ruft alle Verteilerlisten eines Projekts ab.

**Parameter:**
- `projectId` - Firestore Projekt-ID

**Return:** Array von `ProjectDistributionList`

**Firestore Query:**
```typescript
query(
  collection(db, 'project_distribution_lists'),
  where('projectId', '==', projectId),
  orderBy('addedAt', 'desc')
)
```

**Beispiel:**
```typescript
const lists = await projectListsService.getProjectLists('project-123');

console.log(`${lists.length} Listen gefunden`);

lists.forEach(list => {
  console.log(`${list.name || list.masterListId} (${list.type})`);
});
```

**Error-Handling:**
```typescript
try {
  const lists = await projectListsService.getProjectLists(projectId);
} catch (error) {
  console.error('Fehler beim Laden:', error);
  // Service gibt leeres Array zurück bei Fehler
  return [];
}
```

**Performance:**
- ✅ Index erforderlich: `projectId ASC, addedAt DESC`
- ⚡ Durchschnittliche Query-Zeit: ~50-100ms
- 📊 Typische Anzahl Dokumente: 5-20 pro Projekt

---

### linkMasterList

```typescript
async linkMasterList(
  projectId: string,
  masterListId: string,
  userId: string,
  organizationId: string
): Promise<string>
```

**Beschreibung:** Verknüpft eine Master-Liste mit einem Projekt.

**Parameter:**
- `projectId` - Firestore Projekt-ID
- `masterListId` - ID der zu verknüpfenden Master-Liste
- `userId` - ID des ausführenden Benutzers
- `organizationId` - Organisations-ID

**Return:** ID des erstellten Projekt-Listen-Dokuments

**Validierung:**
- Prüft, ob Liste bereits verknüpft ist
- Prüft, ob Master-Liste existiert
- Lädt `contactCount` von Master-Liste

**Beispiel:**
```typescript
try {
  const listId = await projectListsService.linkMasterList(
    'project-123',
    'master-list-456',
    'user-789',
    'org-001'
  );

  console.log(`Liste verknüpft: ${listId}`);
  toastService.success('Liste erfolgreich verknüpft');
} catch (error) {
  if (error.message === 'Diese Liste ist bereits mit dem Projekt verknüpft') {
    toastService.warning('Liste bereits verknüpft');
  } else if (error.message === 'Master-Liste nicht gefunden') {
    toastService.error('Liste nicht gefunden');
  } else {
    toastService.error('Fehler beim Verknüpfen');
  }
}
```

**Erstelltes Dokument:**
```typescript
{
  projectId: 'project-123',
  organizationId: 'org-001',
  type: 'linked',
  masterListId: 'master-list-456',
  addedBy: 'user-789',
  addedAt: serverTimestamp(),
  cachedContactCount: 42
}
```

**Errors:**
- `'Diese Liste ist bereits mit dem Projekt verknüpft'`
- `'Master-Liste nicht gefunden'`
- Firestore-Errors (permission-denied, etc.)

---

### createProjectList

```typescript
async createProjectList(
  projectId: string,
  listData: {
    name: string;
    description?: string;
    category?: string;
    type?: 'static' | 'dynamic';
    filters?: ListFilters;
    contactIds?: string[];
  },
  userId: string,
  organizationId: string
): Promise<string>
```

**Beschreibung:** Erstellt eine neue projektspezifische Liste.

**Parameter:**
- `projectId` - Firestore Projekt-ID
- `listData` - Listen-Daten
  - `name` - Listen-Name (erforderlich)
  - `description` - Beschreibung (optional)
  - `category` - Kategorie (optional, default: 'custom')
  - `type` - 'static' oder 'dynamic' (optional, wird automatisch ermittelt)
  - `filters` - Filter-Objekt (nur bei dynamic)
  - `contactIds` - Kontakt-IDs (nur bei static)
- `userId` - User-ID
- `organizationId` - Organisations-ID

**Return:** ID des erstellten Dokuments

**Automatische Typ-Ermittlung:**
```typescript
const listType = listData.type ||
  (listData.filters && Object.keys(listData.filters).length > 0 ? 'dynamic' : 'static');
```

**Beispiel (Statisch):**
```typescript
const listId = await projectListsService.createProjectList(
  'project-123',
  {
    name: 'Ausgewählte Journalisten',
    description: 'Handverlesene Kontakte für exklusive Meldungen',
    category: 'press',
    type: 'static',
    contactIds: ['contact-1', 'contact-2', 'contact-3']
  },
  userId,
  organizationId
);
```

**Beispiel (Dynamisch):**
```typescript
const listId = await projectListsService.createProjectList(
  'project-123',
  {
    name: 'Lokale Presse Bayern',
    description: 'Regionalpresse für bayerischen Markt',
    category: 'press',
    type: 'dynamic',
    filters: {
      countries: ['DE'],
      publications: {
        geographicScopes: ['regional'],
        types: ['newspaper', 'online']
      }
    }
  },
  userId,
  organizationId
);
```

**Kontaktzahl-Berechnung:**
- **Dynamisch:** Führt Filter-Query aus und zählt Ergebnisse
- **Statisch:** Nimmt Länge von `contactIds`

**Performance:**
- ⚡ Statisch: ~50ms
- ⚡ Dynamisch: ~200-500ms (abhängig von Filterung)

---

### createCombinedList

```typescript
async createCombinedList(
  projectId: string,
  listIds: string[],
  additionalContacts: string[] = [],
  name: string,
  description: string,
  userId: string,
  organizationId: string
): Promise<string>
```

**Beschreibung:** Erstellt eine kombinierte Liste aus mehreren Master-Listen und optionalen zusätzlichen Kontakten.

**Parameter:**
- `projectId` - Firestore Projekt-ID
- `listIds` - Array von Master-Listen-IDs
- `additionalContacts` - Zusätzliche Kontakt-IDs (optional)
- `name` - Listen-Name
- `description` - Beschreibung
- `userId` - User-ID
- `organizationId` - Organisations-ID

**Return:** ID des erstellten Dokuments

**Deduplizierung:**
Kontakte werden automatisch dedupliziert - jede ID erscheint nur einmal.

**Beispiel:**
```typescript
const listId = await projectListsService.createCombinedList(
  'project-123',
  ['master-list-1', 'master-list-2', 'master-list-3'],
  ['contact-special-1', 'contact-special-2'],
  'Kombinierte Presse-Liste',
  'Alle Presse-Kontakte plus Spezialisten',
  userId,
  organizationId
);
```

**Cache:**
```typescript
{
  cachedContactCount: 127, // Deduplizierte Gesamtzahl
  cachedContactsSnapshot: ['id1', 'id2', ...] // Alle IDs für schnellen Zugriff
}
```

**Performance:**
- ⚡ Erstellung: ~500-2000ms (abhängig von Anzahl Listen)
- ✅ Schneller Abruf dank Cache

---

### getProjectListContacts

```typescript
async getProjectListContacts(projectListId: string): Promise<ContactEnhanced[]>
```

**Beschreibung:** Ruft alle Kontakte einer Projekt-Liste ab.

**Parameter:**
- `projectListId` - ID der Projekt-Liste

**Return:** Array von `ContactEnhanced`

**Verhalten je nach Typ:**

#### Type: 'linked'
```typescript
// Lädt Master-Liste und ruft deren Kontakte ab
const masterList = await listsService.getById(listData.masterListId);
return await listsService.getContacts(masterList);
```

#### Type: 'custom'
```typescript
// Bei dynamic: Filtert Kontakte
if (listData.filters) {
  return await this.getFilteredContacts(listData.filters, organizationId);
}

// Bei static: Lädt Kontakte per IDs
if (listData.contactIds) {
  return await this.getContactsByIds(listData.contactIds, organizationId);
}
```

#### Type: 'combined'
```typescript
// Nutzt Cache wenn vorhanden
if (listData.cachedContactsSnapshot) {
  return await this.getContactsByIds(listData.cachedContactsSnapshot, organizationId);
}

// Sonst: Neu berechnen
// - Lädt alle verknüpften Listen
// - Sammelt alle Kontakte
// - Dedupliziert
```

**Beispiel:**
```typescript
const contacts = await projectListsService.getProjectListContacts('list-123');

console.log(`${contacts.length} Kontakte geladen`);

contacts.forEach(contact => {
  const name = contact.name?.firstName
    ? `${contact.name.firstName} ${contact.name.lastName}`
    : `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
  console.log(`- ${name} (${contact.companyName})`);
});
```

**Performance:**
| Typ | Durchschnitt | Mit Cache |
|-----|--------------|-----------|
| linked | 100-200ms | - |
| custom (static) | 50-150ms | - |
| custom (dynamic) | 200-800ms | - |
| combined | 300-1000ms | 50-150ms |

---

### unlinkList

```typescript
async unlinkList(projectId: string, listId: string): Promise<void>
```

**Beschreibung:** Entfernt eine Verknüpfung oder löscht eine Projekt-Liste.

**Parameter:**
- `projectId` - Projekt-ID (für Logging, nicht verwendet)
- `listId` - ID der zu löschenden Projekt-Liste

**Return:** `void`

**Hinweis:** Diese Funktion löscht **nur** das Projekt-Listen-Dokument, nicht die Master-Liste!

**Beispiel:**
```typescript
try {
  await projectListsService.unlinkList('project-123', 'list-456');
  toastService.success('Verknüpfung erfolgreich entfernt');
} catch (error) {
  toastService.error('Fehler beim Entfernen der Verknüpfung');
}
```

**Firestore-Operation:**
```typescript
await deleteDoc(doc(db, 'project_distribution_lists', listId));
```

---

### updateProjectList

```typescript
async updateProjectList(
  listId: string,
  updates: Partial<ProjectDistributionList>
): Promise<void>
```

**Beschreibung:** Aktualisiert eine Projekt-Liste.

**Parameter:**
- `listId` - ID der zu aktualisierenden Liste
- `updates` - Partial-Update-Objekt

**Return:** `void`

**Automatische Cache-Aktualisierung:**
Wenn `listType`, `filters` oder `contactIds` geändert werden, wird `cachedContactCount` automatisch neu berechnet.

**Beispiel (Name + Beschreibung):**
```typescript
await projectListsService.updateProjectList('list-123', {
  name: 'Aktualisierter Name',
  description: 'Neue Beschreibung'
});
```

**Beispiel (Filter ändern):**
```typescript
await projectListsService.updateProjectList('list-123', {
  filters: {
    countries: ['DE', 'AT', 'CH'],
    publications: {
      types: ['newspaper']
    }
  }
});
// → cachedContactCount wird automatisch neu berechnet
```

**Beispiel (Kontakte ändern):**
```typescript
await projectListsService.updateProjectList('list-123', {
  contactIds: ['contact-1', 'contact-2', 'contact-3', 'contact-4']
});
// → cachedContactCount = 4
```

**Automatisch hinzugefügt:**
```typescript
{
  ...updates,
  cachedContactCount, // Neu berechnet wenn nötig
  lastModified: serverTimestamp()
}
```

---

## Helper-Funktionen

### getFilteredContacts

```typescript
async getFilteredContacts(
  filters: ListFilters,
  organizationId: string
): Promise<ContactEnhanced[]>
```

**Beschreibung:** (Privat) Filtert Kontakte basierend auf Filter-Objekt.

**Unterstützte Filter:**
- `hasEmail` - Boolean
- `hasPhone` - Boolean
- `tagIds` - Array (mindestens ein Tag muss matchen)

**Beispiel:**
```typescript
const contacts = await this.getFilteredContacts(
  {
    hasEmail: true,
    tagIds: ['tag-tech', 'tag-innovation']
  },
  'org-001'
);
```

**Hinweis:** Vereinfachte Implementierung - sollte erweitert werden für vollständige Filter-Unterstützung.

---

### getContactsByIds

```typescript
async getContactsByIds(
  contactIds: string[],
  organizationId?: string
): Promise<ContactEnhanced[]>
```

**Beschreibung:** (Privat) Lädt Kontakte per IDs.

**Delegation:** Nutzt `listsService.getContactsByIds()` - unterstützt Firestore References automatisch.

**Beispiel:**
```typescript
const contacts = await this.getContactsByIds(
  ['contact-1', 'contact-2', 'contact-3'],
  'org-001'
);
```

---

### getMasterListsWithDetails

```typescript
async getMasterListsWithDetails(
  masterListIds: string[]
): Promise<DistributionList[]>
```

**Beschreibung:** Lädt mehrere Master-Listen auf einmal.

**Parameter:**
- `masterListIds` - Array von Master-Listen-IDs

**Return:** Array von `DistributionList`

**Beispiel:**
```typescript
const linkedIds = projectLists
  .filter(l => l.type === 'linked')
  .map(l => l.masterListId!)
  .filter(Boolean);

const masterListDetails = await projectListsService.getMasterListsWithDetails(linkedIds);

// In Map umwandeln für schnellen Zugriff
const detailsMap = new Map();
masterListDetails.forEach(d => {
  if (d.id) detailsMap.set(d.id, d);
});

// Verwendung
const masterList = detailsMap.get(projectList.masterListId);
const listName = projectList.name || masterList?.name || 'Unbenannt';
```

**Performance:**
- ⚠️ Lädt Listen sequentiell (könnte parallelisiert werden)
- ⚡ ~50ms pro Liste
- Für 5 Listen: ~250ms

---

## Code-Beispiele

### Vollständiger CRUD-Flow

```typescript
import { projectListsService } from '@/lib/firebase/project-lists-service';
import { toastService } from '@/lib/utils/toast';

async function demonstrateCRUD() {
  const projectId = 'project-123';
  const userId = 'user-789';
  const organizationId = 'org-001';

  // 1. CREATE: Verknüpfte Liste
  try {
    const linkedId = await projectListsService.linkMasterList(
      projectId,
      'master-list-456',
      userId,
      organizationId
    );
    console.log('Verknüpfte Liste:', linkedId);
  } catch (error) {
    console.error('Fehler:', error.message);
  }

  // 2. CREATE: Custom statische Liste
  const staticId = await projectListsService.createProjectList(
    projectId,
    {
      name: 'Ausgewählte Kontakte',
      category: 'press',
      type: 'static',
      contactIds: ['c1', 'c2', 'c3']
    },
    userId,
    organizationId
  );
  console.log('Statische Liste:', staticId);

  // 3. CREATE: Custom dynamische Liste
  const dynamicId = await projectListsService.createProjectList(
    projectId,
    {
      name: 'Tech-Journalisten',
      category: 'press',
      type: 'dynamic',
      filters: {
        tagIds: ['tag-tech'],
        hasEmail: true
      }
    },
    userId,
    organizationId
  );
  console.log('Dynamische Liste:', dynamicId);

  // 4. READ: Alle Listen
  const allLists = await projectListsService.getProjectLists(projectId);
  console.log(`Gesamt: ${allLists.length} Listen`);

  // 5. READ: Kontakte einer Liste
  const contacts = await projectListsService.getProjectListContacts(staticId);
  console.log(`${contacts.length} Kontakte`);

  // 6. UPDATE: Liste bearbeiten
  await projectListsService.updateProjectList(staticId, {
    name: 'Aktualisierter Name',
    description: 'Neue Beschreibung'
  });
  console.log('Liste aktualisiert');

  // 7. DELETE: Liste löschen
  await projectListsService.unlinkList(projectId, staticId);
  console.log('Liste gelöscht');
}
```

### Kombination von Listen

```typescript
async function createCombinedPresslist() {
  // Sammle IDs von mehreren Presse-Listen
  const presslists = await listsService.getAll(organizationId);
  const presslistIds = presslists
    .filter(l => l.category === 'press')
    .map(l => l.id!)
    .filter(Boolean);

  // Füge spezielle Kontakte hinzu
  const specialJournalists = ['contact-special-1', 'contact-special-2'];

  // Erstelle kombinierte Liste
  const combinedId = await projectListsService.createCombinedList(
    projectId,
    presslistIds,
    specialJournalists,
    'Alle Presse-Kontakte',
    'Kombination aller Presse-Listen + Spezialisten',
    userId,
    organizationId
  );

  console.log('Kombinierte Liste erstellt:', combinedId);

  // Kontakte abrufen (nutzt Cache)
  const contacts = await projectListsService.getProjectListContacts(combinedId);
  console.log(`${contacts.length} deduplizierte Kontakte`);
}
```

### Batch-Update mehrerer Listen

```typescript
async function updateAllCustomLists(projectId: string, newCategory: string) {
  const lists = await projectListsService.getProjectLists(projectId);
  const customLists = lists.filter(l => l.type === 'custom');

  for (const list of customLists) {
    if (!list.id) continue;
    await projectListsService.updateProjectList(list.id, {
      category: newCategory
    });
  }

  console.log(`${customLists.length} Listen aktualisiert`);
}
```

---

## Error-Handling

### Typen von Errors

#### 1. Validierungs-Errors
```typescript
try {
  await projectListsService.linkMasterList(/* ... */);
} catch (error) {
  if (error.message === 'Diese Liste ist bereits mit dem Projekt verknüpft') {
    // Behandlung
  }
}
```

#### 2. Firestore-Errors
```typescript
try {
  await projectListsService.getProjectLists(projectId);
} catch (error) {
  if (error.code === 'permission-denied') {
    // Security Rules verweigern Zugriff
  }
}
```

#### 3. Not-Found-Errors
```typescript
try {
  const contacts = await projectListsService.getProjectListContacts('invalid-id');
} catch (error) {
  if (error.message === 'Projekt-Liste nicht gefunden') {
    // Liste existiert nicht
  }
}
```

### Best Practice

```typescript
async function safeOperation() {
  try {
    const result = await projectListsService.someMethod(/* ... */);
    toastService.success('Erfolgreich');
    return result;
  } catch (error) {
    console.error('Operation fehlgeschlagen:', error);

    // Spezifische Fehlerbehandlung
    if (error.message.includes('bereits verknüpft')) {
      toastService.warning('Liste bereits vorhanden');
    } else if (error.message.includes('nicht gefunden')) {
      toastService.error('Liste nicht gefunden');
    } else {
      toastService.error('Ein Fehler ist aufgetreten');
    }

    return null;
  }
}
```

---

## Performance-Hinweise

### 1. Batch-Operationen bevorzugen

**❌ Schlecht:**
```typescript
for (const list of projectLists) {
  const masterList = await listsService.getById(list.masterListId);
  // ...
}
```

**✅ Gut:**
```typescript
const masterListIds = projectLists.map(l => l.masterListId).filter(Boolean);
const masterLists = await projectListsService.getMasterListsWithDetails(masterListIds);
```

### 2. Cache nutzen

**Combined Lists** nutzen `cachedContactsSnapshot` für schnellen Zugriff:
```typescript
// Beim Abrufen wird Cache verwendet falls vorhanden
const contacts = await projectListsService.getProjectListContacts(combinedListId);
// → ~50-150ms statt ~500-1000ms
```

### 3. Kontaktzahl aus Cache lesen

```typescript
// ❌ Langsam
const contacts = await projectListsService.getProjectListContacts(listId);
const count = contacts.length; // ~200ms

// ✅ Schnell
const list = lists.find(l => l.id === listId);
const count = list.cachedContactCount; // Instant
```

### 4. Firestore Index beachten

**Erforderlicher Index:**
```
Collection: project_distribution_lists
Fields: projectId ASC, addedAt DESC
```

**Deployment:**
```bash
firebase deploy --only firestore:indexes
```

---

## Siehe auch

- [API-Übersicht](./README.md)
- [lists-service Dokumentation](../../contacts/lists/lists-service.md)
- [Hauptdokumentation](../README.md)
- [Testing Guide](../../../testing/README.md)

---

**Version:** 2.0.0
**Maintainer:** CeleroPress Team
