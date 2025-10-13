# Tags Enhanced Service API

**Service:** `tagsEnhancedService`
**Collection:** `tags`
**Type:** `TagEnhanced` / `Tag` (Legacy)

---

## Übersicht

Der `tagsEnhancedService` ist der zentrale Firebase Service für die Verwaltung von Tags im CRM-System. Tags werden zur Kategorisierung von Firmen und Kontakten verwendet. Der Service bietet sowohl ein modernes `TagEnhanced`-Format als auch Kompatibilität mit dem Legacy-`Tag`-Format.

## Import

```typescript
import { tagsEnhancedService } from '@/lib/firebase/crm-service-enhanced';
```

---

## Methoden

### `getAll(organizationId: string, options?: QueryOptions): Promise<TagEnhanced[]>`

Lädt alle Tags für eine Organization im Enhanced-Format.

**Parameter:**
- `organizationId` (string) - ID der Organization
- `options` (`QueryOptions`, optional) - Query-Optionen

**Returns:** `Promise<TagEnhanced[]>`

**Beispiel:**
```typescript
const tags = await tagsEnhancedService.getAll(currentOrganization.id);

tags.forEach(tag => {
  console.log(tag.name, tag.color);
});
```

**Features:**
- ✅ Erweiterte BaseEntity-Felder (createdAt, updatedAt, createdBy, updatedBy)
- ✅ Multi-Tenancy-Filterung
- ✅ Optionale Verwendungs-Statistiken (contactCount, companyCount)

---

### `getAllAsLegacyTags(organizationId: string, options?: QueryOptions): Promise<Tag[]>`

Lädt alle Tags im Legacy-Format für Kompatibilität mit älteren Components.

**Parameter:**
- `organizationId` (string) - ID der Organization
- `options` (`QueryOptions`, optional) - Query-Optionen

**Returns:** `Promise<Tag[]>`

**Beispiel:**
```typescript
// Für Legacy-Komponenten die Tag-Type erwarten
const legacyTags = await tagsEnhancedService.getAllAsLegacyTags(currentOrganization.id);

// Kompatibel mit alten Interfaces
interface OldComponent {
  tags: Tag[]; // Legacy-Type
}
```

**Konvertierung:**
- `TagEnhanced.id` → `Tag.id`
- `TagEnhanced.name` → `Tag.name`
- `TagEnhanced.color` → `Tag.color`
- `TagEnhanced.createdBy` → `Tag.userId`
- Behält Verwendungs-Statistiken (contactCount, companyCount)

---

### `getWithUsageCount(organizationId: string): Promise<Tag[]>`

Lädt alle Tags mit Verwendungs-Zählung (wie oft der Tag bei Companies/Contacts verwendet wird).

**Parameter:**
- `organizationId` (string) - ID der Organization

**Returns:** `Promise<Tag[]>` - Tags mit `contactCount` und `companyCount`

**Beispiel:**
```typescript
const tagsWithUsage = await tagsEnhancedService.getWithUsageCount(currentOrganization.id);

tagsWithUsage.forEach(tag => {
  console.log(`${tag.name}: ${tag.companyCount} Firmen, ${tag.contactCount} Kontakte`);
});

// Sortiere nach Verwendung
const mostUsedTags = tagsWithUsage
  .sort((a, b) =>
    (b.companyCount || 0) + (b.contactCount || 0) -
    (a.companyCount || 0) + (a.contactCount || 0)
  )
  .slice(0, 10);
```

**Features:**
- ✅ Zählt Tag-Verwendungen in Companies
- ✅ Zählt Tag-Verwendungen in Contacts
- ✅ Ignoriert gelöschte Entities (deletedAt != null)
- ✅ Performance-optimiert mit parallel Queries

**Use Cases:**
- Tag-Management-UI (zeige ungenutzte Tags)
- Tag-Analytics (beliebteste Tags)
- Tag-Cleanup (lösche ungenutzte Tags)

---

### `mergeTags(sourceTagId, targetTagId, context): Promise<void>`

Merged zwei Tags: Alle Verwendungen von `sourceTag` werden zu `targetTag` verschoben, dann wird `sourceTag` gelöscht.

**Parameter:**
- `sourceTagId` (string) - ID des zu löschenden Tags
- `targetTagId` (string) - ID des Ziel-Tags
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
// Merge "VIP Kunde" → "Premium"
await tagsEnhancedService.mergeTags(
  'tag_vip_kunde',
  'tag_premium',
  {
    organizationId: currentOrganization.id,
    userId: currentUser.uid
  }
);

// Nach dem Merge:
// - Alle Firmen/Kontakte mit "VIP Kunde" haben jetzt "Premium"
// - "VIP Kunde" Tag ist gelöscht
// - Keine Duplikate (Set-basiert)
```

**Ablauf:**
1. Validiert beide Tags (müssen existieren)
2. Findet alle Companies mit `sourceTagId` in `tagIds`
3. Ersetzt `sourceTagId` durch `targetTagId` (ohne Duplikate)
4. Findet alle Contacts mit `sourceTagId` in `tagIds`
5. Ersetzt `sourceTagId` durch `targetTagId` (ohne Duplikate)
6. Löscht `sourceTag` aus Tags-Collection
7. Committed alle Updates in einer Batch-Transaction

**Wichtig:**
- ⚠️ Nicht umkehrbar (Hard Delete von Source Tag)
- ✅ Atomic Operation (Batch-Transaction)
- ✅ Duplikat-frei (Array.from(new Set(...)))

---

### `create(data, context): Promise<string>`

Erstellt einen neuen Tag.

**Parameter:**
- `data` (`Omit<TagEnhanced, 'id' | 'createdAt' | ...>`) - Tag-Daten
  - `name` (string, required) - Tag-Name
  - `color` (string, required) - Farbe (Tailwind-Color oder Hex)
  - `description` (string, optional) - Beschreibung
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<string>` - ID des erstellten Tags

**Beispiel:**
```typescript
const tagId = await tagsEnhancedService.create({
  name: 'Premium Kunde',
  color: 'blue',
  description: 'Kunden mit Premium-Vertrag'
}, {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
});
```

**Validierung:**
- ❌ Fehler wenn `name` fehlt oder leer
- ❌ Fehler wenn `color` fehlt

---

### `update(id: string, data, context): Promise<void>`

Aktualisiert einen bestehenden Tag.

**Parameter:**
- `id` (string) - Tag ID
- `data` (`Partial<TagEnhanced>`) - Zu aktualisierende Felder
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await tagsEnhancedService.update('tag_123', {
  name: 'VIP Premium',
  description: 'Erweiterte Beschreibung'
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

Löscht einen Tag (Soft Delete).

**Parameter:**
- `id` (string) - Tag ID
- `context` (`{ organizationId: string; userId: string }`) - Kontext

**Returns:** `Promise<void>`

**Beispiel:**
```typescript
await tagsEnhancedService.delete('tag_123', {
  organizationId: currentOrganization.id,
  userId: currentUser.uid
});
```

**Soft Delete:**
- Tag wird nicht aus Firestore gelöscht
- `deletedAt` und `deletedBy` werden gesetzt
- Nicht mehr in `getAll()` sichtbar
- Tag-Zuordnungen bei Companies/Contacts bleiben erhalten

**Hinweis:**
- Verwende `mergeTags()` wenn du Tags zusammenführen willst
- Verwende `delete()` nur für Tags die komplett entfernt werden sollen

---

## Typen

### `TagEnhanced`

Erweitertes Tag-Format mit BaseEntity-Feldern:
```typescript
interface TagEnhanced extends BaseEntity {
  id?: string;
  name: string;                        // Tag-Name (z.B. "VIP", "Premium")
  color: string;                       // Farbe (Tailwind oder Hex)
  description?: string;                // Optionale Beschreibung

  // Verwendungs-Statistiken (optional)
  contactCount?: number;               // Anzahl Kontakte mit diesem Tag
  companyCount?: number;               // Anzahl Firmen mit diesem Tag

  // BaseEntity-Felder (automatisch)
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  deletedAt?: Timestamp | null;
  deletedBy?: string;

  // Legacy-Kompatibilität
  userId?: string;                     // Mapped zu createdBy
}
```

### `Tag` (Legacy)

Kompatibilitäts-Type für ältere Components:
```typescript
interface Tag {
  id?: string;
  name: string;
  color: string;
  description?: string;
  userId: string;                      // Mapped von createdBy
  createdAt: Timestamp;
  updatedAt: Timestamp;
  contactCount?: number;
  companyCount?: number;
}
```

---

## Best Practices

### 1. Tag-Naming Conventions

```typescript
// ✅ Gut: Klare, beschreibende Namen
await tagsEnhancedService.create({
  name: 'Premium Kunde',
  color: 'blue',
  description: 'Kunde mit Premium-Vertrag'
}, context);

// ❌ Schlecht: Kryptische Namen
await tagsEnhancedService.create({
  name: 'PK',
  color: 'blue'
}, context);
```

### 2. Verwendungs-Tracking

```typescript
// ✅ Gut: Verwende getWithUsageCount() für Tag-Management
const tags = await tagsEnhancedService.getWithUsageCount(orgId);

// Finde ungenutzte Tags
const unusedTags = tags.filter(t =>
  (t.companyCount || 0) === 0 &&
  (t.contactCount || 0) === 0
);

console.log(`${unusedTags.length} ungenutzte Tags gefunden`);

// ❌ Schlecht: Manuell alle Companies/Contacts laden
const allCompanies = await companiesEnhancedService.getAll(orgId);
const allContacts = await contactsEnhancedService.getAll(orgId);
// ... manuelle Zählung
```

### 3. Tag-Merging statt Löschen

```typescript
// ✅ Gut: Merge Tags wenn Duplikate
const tags = await tagsEnhancedService.getAll(orgId);
const duplicates = tags.filter(t =>
  t.name.toLowerCase() === 'vip kunde'
);

if (duplicates.length > 1) {
  // Merge alle in den ersten
  for (let i = 1; i < duplicates.length; i++) {
    await tagsEnhancedService.mergeTags(
      duplicates[i].id!,
      duplicates[0].id!,
      context
    );
  }
}

// ❌ Schlecht: Einfach löschen (verliert Zuordnungen)
for (const duplicate of duplicates.slice(1)) {
  await tagsEnhancedService.delete(duplicate.id!, context);
}
```

### 4. Color-Konsistenz

```typescript
// ✅ Gut: Verwende Tailwind-Farben oder definierte Palette
const TAG_COLORS = [
  'blue', 'red', 'green', 'yellow', 'purple',
  'pink', 'indigo', 'gray', 'orange'
];

await tagsEnhancedService.create({
  name: 'Important',
  color: TAG_COLORS[0], // 'blue'
  description: 'Wichtige Kontakte'
}, context);

// ❌ Schlecht: Random Hex-Werte ohne Konsistenz
await tagsEnhancedService.create({
  name: 'Important',
  color: '#3b82f6' // Schwer zu lesen, inkonsistent
}, context);
```

### 5. Batch-Updates bei Merge

```typescript
// ✅ Gut: mergeTags() nutzt automatisch Batch-Updates
await tagsEnhancedService.mergeTags(sourceId, targetId, context);
// → Atomic, schnell, sicher

// ❌ Schlecht: Manuelle Updates (nicht atomic)
const companies = await companiesEnhancedService.searchEnhanced(orgId, {
  tagIds: [sourceId]
});

for (const company of companies) {
  const newTagIds = company.tagIds!.map(id =>
    id === sourceId ? targetId : id
  );
  await companiesEnhancedService.update(company.id!, { tagIds: newTagIds }, context);
}
// → Langsam, fehleranfällig, nicht atomic
```

---

## Use Cases

### Tag-Management Dashboard

```typescript
// Lade Tags mit Statistiken
const tags = await tagsEnhancedService.getWithUsageCount(organizationId);

// Gruppiere nach Verwendung
const activeTag = tags.filter(t => (t.companyCount || 0) + (t.contactCount || 0) > 0);
const unusedTags = tags.filter(t => (t.companyCount || 0) + (t.contactCount || 0) === 0);

console.log('Tags Dashboard:');
console.log(`  Aktive Tags: ${activeTags.length}`);
console.log(`  Ungenutzte Tags: ${unusedTags.length}`);
console.log(`  Total: ${tags.length}`);
```

### Tag-Cleanup

```typescript
// Lösche alle ungenutzten Tags älter als 30 Tage
const tags = await tagsEnhancedService.getWithUsageCount(organizationId);
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 30);

for (const tag of tags) {
  const isUnused = (tag.companyCount || 0) === 0 && (tag.contactCount || 0) === 0;
  const isOld = tag.createdAt.toDate() < cutoffDate;

  if (isUnused && isOld && tag.id) {
    await tagsEnhancedService.delete(tag.id, context);
    console.log(`Deleted unused tag: ${tag.name}`);
  }
}
```

### Tag-Migration

```typescript
// Merge ähnliche Tags
const tags = await tagsEnhancedService.getAll(organizationId);

// Finde Duplikate (case-insensitive)
const tagMap = new Map<string, string[]>();
tags.forEach(tag => {
  const normalized = tag.name.toLowerCase().trim();
  const existing = tagMap.get(normalized) || [];
  existing.push(tag.id!);
  tagMap.set(normalized, existing);
});

// Merge Duplikate
for (const [name, ids] of tagMap.entries()) {
  if (ids.length > 1) {
    console.log(`Merging ${ids.length} tags for "${name}"`);

    // Behalte den ersten, merge alle anderen
    for (let i = 1; i < ids.length; i++) {
      await tagsEnhancedService.mergeTags(ids[i], ids[0], context);
    }
  }
}
```

---

## Siehe auch

- [Companies API](./companies.md) - Company-Service mit Tag-Verwendung
- [Contacts API](./contacts.md) - Contact-Service mit Tag-Verwendung
- [TypeScript Types](../../src/types/crm-enhanced.ts) - TagEnhanced Type-Definition
- [TypeScript Types](../../src/types/crm.ts) - Legacy Tag Type-Definition

---

**Letzte Aktualisierung:** 2025-10-13
**Maintainer:** SKAMP Development Team
