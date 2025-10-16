# Boilerplate Service API-Dokumentation

**Datei:** `src/lib/firebase/boilerplate-service.ts`
**Version:** 1.0
**Letzte Aktualisierung:** 16. Oktober 2025

---

## 📋 Übersicht

Der Boilerplate Service ist die zentrale Schnittstelle für alle Firestore-Operationen im Boilerplates-Modul. Er bietet eine typisierte, sichere API für CRUD-Operationen sowie erweiterte Funktionen wie Suche, Gruppierung, Statistiken und Migration.

### Hauptfunktionen

- **CRUD-Operationen:** Create, Read, Update, Delete
- **Favoriten-Management:** Toggle Favorit-Status
- **Suche & Filterung:** Textsuche, Kategoriefilter
- **Gruppierung:** Nach Kategorie gruppieren
- **Usage-Tracking:** Verwendungsstatistiken
- **Batch-Operationen:** Mehrere Updates gleichzeitig
- **Migration:** Legacy userId → organizationId
- **Statistics:** Umfassende Nutzungsstatistiken

---

## 🔧 API-Referenz

### Collection & Typen

```typescript
const COLLECTION_NAME = 'boilerplates';

// TypeScript-Typen
import { Boilerplate, BoilerplateCreateData } from '@/types/crm-enhanced';
```

---

## 📖 Methoden

### 1. getAll()

Lädt alle Boilerplates einer Organisation (nicht archiviert).

**Signatur:**
```typescript
async getAll(organizationId: string): Promise<Boilerplate[]>
```

**Parameter:**
- `organizationId` (string): Die ID der Organisation

**Rückgabewert:**
- `Promise<Boilerplate[]>`: Array aller Boilerplates

**Sortierung:**
1. Nach Archiv-Status (nicht archiviert zuerst)
2. Nach Kategorie (alphabetisch)
3. Nach Sort-Order
4. Nach Name (alphabetisch)

**Legacy-Support:**
Falls keine Ergebnisse mit `organizationId`, wird automatisch `userId` als Fallback verwendet.

**Beispiel:**
```typescript
import { boilerplatesService } from '@/lib/firebase/boilerplate-service';

const boilerplates = await boilerplatesService.getAll('org-123');
console.log('Anzahl:', boilerplates.length);
```

**Query Details:**
```typescript
query(
  collection(db, 'boilerplates'),
  where('organizationId', '==', organizationId),
  where('isArchived', '!=', true),
  orderBy('isArchived'),
  orderBy('category'),
  orderBy('sortOrder'),
  orderBy('name')
)
```

---

### 2. getForClient()

Lädt Boilerplates für einen spezifischen Kunden (globale + kundenspezifische).

**Signatur:**
```typescript
async getForClient(organizationId: string, clientId: string): Promise<Boilerplate[]>
```

**Parameter:**
- `organizationId` (string): Die ID der Organisation
- `clientId` (string): Die ID des Kunden

**Rückgabewert:**
- `Promise<Boilerplate[]>`: Array aller relevanten Boilerplates

**Logik:**
1. Lädt globale Boilerplates (`isGlobal: true`)
2. Lädt kundenspezifische Boilerplates (`clientId: clientId`)
3. Kombiniert und sortiert beide Listen

**Beispiel:**
```typescript
const clientBoilerplates = await boilerplatesService.getForClient(
  'org-123',
  'client-456'
);

// Enthält:
// - Alle globalen Boilerplates (isGlobal: true)
// - Alle für client-456 spezifischen Boilerplates
```

---

### 3. getGroupedByCategory()

Gruppiert Boilerplates nach Kategorie.

**Signatur:**
```typescript
async getGroupedByCategory(
  organizationId: string,
  clientId?: string
): Promise<Record<string, Boilerplate[]>>
```

**Parameter:**
- `organizationId` (string): Die ID der Organisation
- `clientId` (string, optional): Die ID des Kunden

**Rückgabewert:**
- `Promise<Record<string, Boilerplate[]>>`: Objekt mit Kategorien als Keys

**Kategorien:**
- `company` - Unternehmensbeschreibung
- `contact` - Kontaktinformationen
- `legal` - Rechtliche Hinweise
- `product` - Produktbeschreibung
- `custom` - Sonstige

**Beispiel:**
```typescript
const grouped = await boilerplatesService.getGroupedByCategory('org-123');

// Ausgabe:
// {
//   company: [Boilerplate, Boilerplate, ...],
//   contact: [Boilerplate, ...],
//   legal: [...],
//   product: [...],
//   custom: [...]
// }

// Zugriff auf bestimmte Kategorie
const companyBoilerplates = grouped.company || [];
```

---

### 4. getForCampaignEditor()

Spezialisierte Methode für Campaign Editor - gruppiert nach global/client und liefert Favoriten.

**Signatur:**
```typescript
async getForCampaignEditor(
  organizationId: string,
  clientId?: string
): Promise<{
  global: Record<string, Boilerplate[]>;
  client: Record<string, Boilerplate[]>;
  favorites: Boilerplate[];
}>
```

**Parameter:**
- `organizationId` (string): Die ID der Organisation
- `clientId` (string, optional): Die ID des Kunden

**Rückgabewert:**
- `global`: Nach Kategorie gruppierte globale Boilerplates
- `client`: Nach Kategorie gruppierte kundenspezifische Boilerplates
- `favorites`: Array aller favorisierten Boilerplates

**Beispiel:**
```typescript
const editorData = await boilerplatesService.getForCampaignEditor(
  'org-123',
  'client-456'
);

// Global
console.log('Globale Unternehmensbeschreibungen:', editorData.global.company);

// Client-spezifisch
console.log('Client-spezifische Produktbeschreibungen:', editorData.client.product);

// Favoriten
console.log('Favoriten:', editorData.favorites);
```

---

### 5. getById()

Lädt einen einzelnen Boilerplate anhand seiner ID.

**Signatur:**
```typescript
async getById(id: string): Promise<Boilerplate | null>
```

**Parameter:**
- `id` (string): Die ID des Boilerplates

**Rückgabewert:**
- `Promise<Boilerplate | null>`: Boilerplate oder null wenn nicht gefunden

**Beispiel:**
```typescript
const boilerplate = await boilerplatesService.getById('bp-123');

if (boilerplate) {
  console.log('Name:', boilerplate.name);
  console.log('Kategorie:', boilerplate.category);
} else {
  console.log('Boilerplate nicht gefunden');
}
```

---

### 6. getByIds()

Lädt mehrere Boilerplates anhand ihrer IDs.

**Signatur:**
```typescript
async getByIds(ids: string[]): Promise<Boilerplate[]>
```

**Parameter:**
- `ids` (string[]): Array von IDs

**Rückgabewert:**
- `Promise<Boilerplate[]>`: Array gefundener Boilerplates (null-Werte werden gefiltert)

**Beispiel:**
```typescript
const boilerplates = await boilerplatesService.getByIds([
  'bp-123',
  'bp-456',
  'bp-789',
  'nicht-existent' // wird gefiltert
]);

console.log('Gefunden:', boilerplates.length); // 3
```

---

### 7. create()

Erstellt einen neuen Boilerplate.

**Signatur:**
```typescript
async create(
  data: BoilerplateCreateData,
  context: { organizationId: string; userId: string }
): Promise<string>
```

**Parameter:**
- `data` (BoilerplateCreateData): Die Daten des neuen Boilerplates
- `context`: Kontext mit organizationId und userId

**BoilerplateCreateData:**
```typescript
interface BoilerplateCreateData {
  name: string;                 // Erforderlich
  content: string;              // Erforderlich
  category: string;             // Erforderlich
  description?: string;         // Optional
  isGlobal?: boolean;           // Optional (Standard: true)
  clientId?: string;            // Optional
  clientName?: string;          // Optional
  tags?: string[];              // Optional
  defaultPosition?: string;     // Optional
  sortOrder?: number;           // Optional (Standard: 999)
}
```

**Rückgabewert:**
- `Promise<string>`: Die ID des erstellten Boilerplates

**Automatisch gesetzte Felder:**
- `createdAt`: serverTimestamp()
- `updatedAt`: serverTimestamp()
- `createdBy`: context.userId
- `updatedBy`: context.userId
- `isArchived`: false
- `isFavorite`: false
- `usageCount`: 0

**Beispiel:**
```typescript
const newId = await boilerplatesService.create(
  {
    name: 'Unternehmensprofil kurz',
    content: '<p>ACME Corp ist ein führendes Unternehmen...</p>',
    category: 'company',
    description: 'Kurze Unternehmensbeschreibung für Pressemitteilungen',
    isGlobal: true,
    tags: ['unternehmen', 'profil']
  },
  {
    organizationId: 'org-123',
    userId: 'user-456'
  }
);

console.log('Neuer Boilerplate erstellt:', newId);
```

---

### 8. update()

Aktualisiert einen bestehenden Boilerplate.

**Signatur:**
```typescript
async update(
  id: string,
  data: Partial<Boilerplate>,
  context: { organizationId: string; userId: string }
): Promise<void>
```

**Parameter:**
- `id` (string): Die ID des Boilerplates
- `data` (Partial<Boilerplate>): Die zu aktualisierenden Felder
- `context`: Kontext mit organizationId und userId

**Automatisch gesetzte Felder:**
- `updatedAt`: serverTimestamp()
- `updatedBy`: context.userId

**Hinweis:** Undefined-Werte werden automatisch entfernt.

**Beispiel:**
```typescript
await boilerplatesService.update(
  'bp-123',
  {
    name: 'Unternehmensprofil kurz (aktualisiert)',
    content: '<p>ACME Corp ist DAS führende Unternehmen...</p>',
    description: 'Aktualisierte Version'
  },
  {
    organizationId: 'org-123',
    userId: 'user-456'
  }
);
```

---

### 9. delete()

Löscht einen Boilerplate permanent.

**Signatur:**
```typescript
async delete(id: string): Promise<void>
```

**Parameter:**
- `id` (string): Die ID des Boilerplates

**Wichtig:** Diese Aktion ist NICHT rückgängig zu machen. Für "soft delete" verwenden Sie `archive()`.

**Beispiel:**
```typescript
await boilerplatesService.delete('bp-123');
```

---

### 10. archive()

Archiviert einen Boilerplate (Soft Delete).

**Signatur:**
```typescript
async archive(
  id: string,
  context: { organizationId: string; userId: string }
): Promise<void>
```

**Parameter:**
- `id` (string): Die ID des Boilerplates
- `context`: Kontext mit organizationId und userId

**Vorteil:** Kann wiederhergestellt werden (durch Update von `isArchived: false`)

**Beispiel:**
```typescript
await boilerplatesService.archive(
  'bp-123',
  {
    organizationId: 'org-123',
    userId: 'user-456'
  }
);

// Wiederherstellen
await boilerplatesService.update(
  'bp-123',
  { isArchived: false },
  { organizationId: 'org-123', userId: 'user-456' }
);
```

---

### 11. toggleFavorite()

Toggled den Favorit-Status eines Boilerplates.

**Signatur:**
```typescript
async toggleFavorite(
  id: string,
  context: { organizationId: string; userId: string }
): Promise<void>
```

**Parameter:**
- `id` (string): Die ID des Boilerplates
- `context`: Kontext mit organizationId und userId

**Beispiel:**
```typescript
// Favorit hinzufügen/entfernen
await boilerplatesService.toggleFavorite(
  'bp-123',
  {
    organizationId: 'org-123',
    userId: 'user-456'
  }
);
```

---

### 12. incrementUsage()

Inkrementiert die Usage-Count eines Boilerplates (für Statistiken).

**Signatur:**
```typescript
async incrementUsage(id: string): Promise<void>
```

**Parameter:**
- `id` (string): Die ID des Boilerplates

**Setzt:**
- `usageCount`: +1
- `lastUsedAt`: serverTimestamp()

**Beispiel:**
```typescript
// Nach Verwendung in einem Campaign-Editor
await boilerplatesService.incrementUsage('bp-123');
```

---

### 13. incrementUsageMultiple()

Batch-Inkrement für mehrere Boilerplates (effizient).

**Signatur:**
```typescript
async incrementUsageMultiple(ids: string[]): Promise<void>
```

**Parameter:**
- `ids` (string[]): Array von IDs

**Vorteil:** Nutzt Firestore Batch-Write für bessere Performance.

**Beispiel:**
```typescript
// Nach Verwendung mehrerer Bausteine in einem Dokument
await boilerplatesService.incrementUsageMultiple([
  'bp-123',
  'bp-456',
  'bp-789'
]);
```

---

### 14. search()

Durchsucht Boilerplates nach Suchbegriff.

**Signatur:**
```typescript
async search(
  organizationId: string,
  searchTerm: string,
  clientId?: string
): Promise<Boilerplate[]>
```

**Parameter:**
- `organizationId` (string): Die ID der Organisation
- `searchTerm` (string): Der Suchbegriff
- `clientId` (string, optional): Optional für Client-spezifische Suche

**Durchsucht:**
- `name`
- `content`
- `description`
- `tags`

**Hinweis:** Case-insensitive Suche. Lädt erst alle Boilerplates, dann filtert.

**Beispiel:**
```typescript
const results = await boilerplatesService.search(
  'org-123',
  'unternehmen'
);

console.log('Gefundene Boilerplates:', results.length);
```

---

### 15. updateSortOrder()

Aktualisiert die Sortierreihenfolge mehrerer Boilerplates (Batch).

**Signatur:**
```typescript
async updateSortOrder(
  updates: Array<{id: string, sortOrder: number}>,
  context: { organizationId: string; userId: string }
): Promise<void>
```

**Parameter:**
- `updates`: Array von Updates (id + sortOrder)
- `context`: Kontext mit organizationId und userId

**Beispiel:**
```typescript
// Nach Drag & Drop Neuordnung
await boilerplatesService.updateSortOrder(
  [
    { id: 'bp-123', sortOrder: 1 },
    { id: 'bp-456', sortOrder: 2 },
    { id: 'bp-789', sortOrder: 3 }
  ],
  {
    organizationId: 'org-123',
    userId: 'user-456'
  }
);
```

---

### 16. duplicate()

Dupliziert einen Boilerplate.

**Signatur:**
```typescript
async duplicate(
  id: string,
  newName: string,
  context: { organizationId: string; userId: string },
  newClientId?: string
): Promise<string>
```

**Parameter:**
- `id` (string): Die ID des zu duplizierenden Boilerplates
- `newName` (string): Der Name der Kopie
- `context`: Kontext mit organizationId und userId
- `newClientId` (string, optional): Optional andere Client-Zuordnung

**Rückgabewert:**
- `Promise<string>`: Die ID des duplizierten Boilerplates

**Beispiel:**
```typescript
const duplicateId = await boilerplatesService.duplicate(
  'bp-123',
  'Unternehmensprofil kurz (Kopie)',
  {
    organizationId: 'org-123',
    userId: 'user-456'
  }
);

console.log('Dupliziert als:', duplicateId);
```

---

### 17. getStats()

Liefert umfassende Statistiken über Boilerplates.

**Signatur:**
```typescript
async getStats(organizationId: string): Promise<{
  total: number;
  byCategory: Record<string, number>;
  global: number;
  clientSpecific: number;
  favorites: number;
  mostUsed: Boilerplate[];
}>
```

**Parameter:**
- `organizationId` (string): Die ID der Organisation

**Rückgabewert:**
- `total`: Gesamtanzahl Boilerplates
- `byCategory`: Anzahl pro Kategorie
- `global`: Anzahl globale Boilerplates
- `clientSpecific`: Anzahl kundenspezifische
- `favorites`: Anzahl Favoriten
- `mostUsed`: Top 5 meistverwendete Boilerplates

**Beispiel:**
```typescript
const stats = await boilerplatesService.getStats('org-123');

console.log('Gesamt:', stats.total);
console.log('Global:', stats.global);
console.log('Kundenspezifisch:', stats.clientSpecific);
console.log('Favoriten:', stats.favorites);

// Anzahl pro Kategorie
console.log('Unternehmen:', stats.byCategory.company || 0);
console.log('Produkt:', stats.byCategory.product || 0);

// Top 5 meistverwendet
stats.mostUsed.forEach((bp, index) => {
  console.log(`${index + 1}. ${bp.name} (${bp.usageCount} Verwendungen)`);
});
```

---

### 18. migrateFromUserToOrg()

Migration von Legacy userId zu organizationId (einmalige Operation).

**Signatur:**
```typescript
async migrateFromUserToOrg(
  userId: string,
  organizationId: string
): Promise<void>
```

**Parameter:**
- `userId` (string): Die alte User-ID
- `organizationId` (string): Die neue Organization-ID

**Hinweis:** Batch-Update aller Boilerplates mit `userId` → setzt `organizationId`.

**Beispiel:**
```typescript
// Einmalige Migration
await boilerplatesService.migrateFromUserToOrg(
  'old-user-123',
  'new-org-456'
);
```

---

## 🔐 Error Handling

### Fehlerbehandlung

```typescript
try {
  const boilerplate = await boilerplatesService.getById('bp-123');
} catch (error) {
  console.error('Fehler beim Laden:', error);

  if (error instanceof Error) {
    // Spezifische Fehlerbehandlung
    if (error.message.includes('permission')) {
      console.error('Keine Berechtigung');
    } else if (error.message.includes('network')) {
      console.error('Netzwerkfehler');
    }
  }
}
```

### Häufige Fehler

**1. Permission Denied**
- **Ursache:** Firestore Security Rules verbieten Zugriff
- **Lösung:** Prüfen Sie Security Rules und organizationId

**2. Document Not Found**
- **Ursache:** Boilerplate existiert nicht
- **Lösung:** Prüfen Sie ID oder verwenden Sie getAll()

**3. Invalid Data**
- **Ursache:** Fehlende Pflichtfelder (name, content, category)
- **Lösung:** Validieren Sie Daten vor create/update

---

## ⚡ Performance

### Best Practices

**1. Caching mit React Query**
```typescript
// Gut: React Query Hook (automatisches Caching)
const { data } = useBoilerplates(organizationId);

// Schlecht: Direkter Service-Call bei jedem Render
const [boilerplates, setBoilerplates] = useState([]);
useEffect(() => {
  boilerplatesService.getAll(organizationId).then(setBoilerplates);
}, [organizationId]); // Re-fetches bei jedem Render!
```

**2. Batch-Operationen**
```typescript
// Gut: Batch-Inkrement
await boilerplatesService.incrementUsageMultiple(['bp-1', 'bp-2', 'bp-3']);

// Schlecht: Einzelne Calls
await boilerplatesService.incrementUsage('bp-1');
await boilerplatesService.incrementUsage('bp-2');
await boilerplatesService.incrementUsage('bp-3');
```

**3. Client-Side Filtering**
```typescript
// Gut: Client-Side Filtering (nutze bereits geladene Daten)
const { data: allBoilerplates } = useBoilerplates(organizationId);
const filtered = useMemo(() =>
  allBoilerplates.filter(bp => bp.category === 'company'),
  [allBoilerplates]
);

// Schlecht: Separate Query pro Filter
const companyBoilerplates = await boilerplatesService.search(
  organizationId,
  'company'
);
```

---

## 📊 TypeScript-Typen

### Boilerplate

```typescript
interface Boilerplate {
  id?: string;
  name: string;
  content: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  description?: string;
  isGlobal: boolean;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  defaultPosition?: string;
  sortOrder?: number;

  // Metadata
  organizationId: string;
  userId?: string; // Legacy
  isArchived: boolean;
  isFavorite: boolean;
  usageCount?: number;
  lastUsedAt?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

### BoilerplateCreateData

```typescript
interface BoilerplateCreateData {
  name: string;
  content: string;
  category: 'company' | 'contact' | 'legal' | 'product' | 'custom';
  description?: string;
  isGlobal?: boolean;
  clientId?: string;
  clientName?: string;
  tags?: string[];
  defaultPosition?: string;
  sortOrder?: number;
}
```

---

## 🧪 Testing

### Service Tests

Der Service ist umfassend getestet:

```typescript
// src/__tests__/features/boilerplates.test.tsx
describe('boilerplatesService', () => {
  test('sollte Boilerplates laden', async () => {
    const boilerplates = await boilerplatesService.getAll('org-123');
    expect(boilerplates).toBeDefined();
  });

  test('sollte Boilerplate erstellen', async () => {
    const id = await boilerplatesService.create(mockData, mockContext);
    expect(id).toBeDefined();
  });

  // ... 21 Tests insgesamt
});
```

### Mock für Tests

```typescript
jest.mock('@/lib/firebase/boilerplate-service', () => ({
  boilerplatesService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleFavorite: jest.fn(),
  },
}));

// In Tests
(boilerplatesService.getAll as jest.Mock).mockResolvedValue([mockBoilerplate]);
```

---

## 📖 Weitere Dokumentation

- [API-Übersicht](./README.md)
- [Komponenten-Dokumentation](../components/README.md)
- [Haupt-Dokumentation](../README.md)

---

**Maintainer:** CeleroPress Development Team
**Erstellt:** 16. Oktober 2025
**Letzte Aktualisierung:** 16. Oktober 2025
