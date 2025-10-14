# listsService API Reference

**Service:** `listsService`
**Pfad:** `@/lib/firebase/lists-service.ts`
**Version:** 1.0

---

## Übersicht

Der `listsService` ist der Hauptservice für alle Verteilerlisten-Operationen. Er bietet vollständige CRUD-Funktionalität, erweiterte Filter-Optionen, Publikations-Integration und Analytics.

**Import:**

```typescript
import { listsService } from '@/lib/firebase/lists-service';
```

---

## CRUD Operations

### `getAll(organizationId, legacyUserId?)`

Lädt alle Verteilerlisten einer Organisation.

**Parameter:**
- `organizationId` (string, required) - Organization ID
- `legacyUserId` (string, optional) - Fallback für Legacy-Daten

**Rückgabe:** `Promise<DistributionList[]>`

**Beispiel:**

```typescript
const lists = await listsService.getAll(organizationId);
console.log(`${lists.length} Listen gefunden`);
```

**Verhalten:**
1. Versucht zuerst `organizationId` (neues Schema)
2. Fallback auf `legacyUserId` (Legacy-Support)
3. Fallback auf `organizationId` als `userId`
4. Gibt leeres Array bei Fehler zurück

**Error Handling:**

```typescript
const lists = await listsService.getAll(organizationId);
if (lists.length === 0) {
  console.log('Keine Listen gefunden oder Fehler aufgetreten');
}
```

---

### `getById(id)`

Lädt eine einzelne Verteilerliste anhand der ID.

**Parameter:**
- `id` (string, required) - Liste ID

**Rückgabe:** `Promise<DistributionList | null>`

**Beispiel:**

```typescript
const list = await listsService.getById(listId);
if (list) {
  console.log(`Liste: ${list.name}`);
} else {
  console.error('Liste nicht gefunden');
}
```

**Validierung:**
- Prüft auf leere/ungültige IDs
- Loggt Warning bei ungültiger ID
- Gibt `null` zurück bei Fehler oder wenn Liste nicht existiert

---

### `create(listData)`

Erstellt eine neue Verteilerliste.

**Parameter:**
- `listData` (Omit<DistributionList, 'id' | 'contactCount' | 'createdAt' | 'updatedAt'>, required)

**Rückgabe:** `Promise<string>` - ID der erstellten Liste

**Beispiel:**

```typescript
const newList = {
  name: 'Journalisten Wirtschaft',
  description: 'Alle Wirtschaftsjournalisten',
  type: 'dynamic',
  category: 'press',
  userId: user.uid,
  organizationId: org.id,
  filters: {
    beats: ['economy', 'business'],
    companyTypes: ['media_house']
  },
  contactIds: []
};

const listId = await listsService.create(newList);
console.log(`Liste erstellt mit ID: ${listId}`);
```

**Automatische Berechnungen:**
- `contactCount` wird automatisch berechnet
- `createdAt`, `updatedAt`, `lastUpdated` werden gesetzt
- `color` default: 'blue'
- `category` default: 'custom'
- `description` default: ''

**Validierung:**
- Entfernt `undefined` Werte
- Nur `filters` bei `type: 'dynamic'`
- Nur `contactIds` bei `type: 'static'`

---

### `update(id, updates)`

Aktualisiert eine bestehende Liste.

**Parameter:**
- `id` (string, required) - Liste ID
- `updates` (Partial<DistributionList>, required) - Zu aktualisierende Felder

**Rückgabe:** `Promise<void>`

**Beispiel:**

```typescript
await listsService.update(listId, {
  name: 'Neuer Name',
  filters: {
    beats: ['economy', 'business', 'tech']
  }
});
```

**Automatische Berechnungen:**
- Bei Filter-Änderungen wird `contactCount` neu berechnet
- Bei `contactIds`-Änderungen wird `contactCount` neu berechnet
- `updatedAt` und `lastUpdated` werden automatisch gesetzt

**Validierung:**
- Entfernt `undefined` Werte
- Nur definierte Felder werden aktualisiert

---

### `delete(id)`

Löscht eine Verteilerliste.

**Parameter:**
- `id` (string, required) - Liste ID

**Rückgabe:** `Promise<void>`

**Beispiel:**

```typescript
await listsService.delete(listId);
console.log('Liste gelöscht');
```

**Hinweis:**
- Löscht nur die Liste, nicht die Kontakte
- Keine Bestätigung oder Soft-Delete
- Unwiderruflich

---

## List Logic

### `getContacts(list)`

Gibt alle Kontakte einer Liste zurück.

**Parameter:**
- `list` (DistributionList, required) - Liste-Objekt

**Rückgabe:** `Promise<ContactEnhanced[]>`

**Beispiel:**

```typescript
const list = await listsService.getById(listId);
if (list) {
  const contacts = await listsService.getContacts(list);
  console.log(`${contacts.length} Kontakte in Liste`);
}
```

**Verhalten:**
- Bei `type: 'static'` → ruft `getContactsByIds()` auf
- Bei `type: 'dynamic'` → ruft `getContactsByFilters()` auf
- Gibt leeres Array zurück wenn keine Kontakte gefunden

---

### `getContactsPreview(list, maxCount?)`

Gibt eine Vorschau der ersten N Kontakte zurück (Performance-optimiert).

**Parameter:**
- `list` (DistributionList, required) - Liste-Objekt
- `maxCount` (number, optional, default: 10) - Maximale Anzahl Kontakte

**Rückgabe:** `Promise<ContactEnhanced[]>`

**Beispiel:**

```typescript
// Zeige erste 10 Kontakte als Preview
const preview = await listsService.getContactsPreview(list, 10);
```

**Use Case:**
- Live-Vorschau im ListModal
- Performance-optimiert für große Listen
- Vermeidet laden aller Kontakte

---

### `calculateContactCount(list)`

Berechnet die Anzahl Kontakte einer Liste ohne sie zu laden.

**Parameter:**
- `list` (Partial<DistributionList>, required) - Liste oder Teildaten

**Rückgabe:** `Promise<number>`

**Beispiel:**

```typescript
const count = await listsService.calculateContactCount({
  type: 'dynamic',
  filters: { beats: ['economy'] },
  organizationId: org.id
});
console.log(`${count} Kontakte matchen die Filter`);
```

**Verhalten:**
- Bei `type: 'static'` → zählt `contactIds.length`
- Bei `type: 'dynamic'` → lädt und zählt gefilterte Kontakte
- Gibt 0 zurück bei Fehler oder fehlenden Daten

---

## Filter Operations

### `getContactsByFilters(filters, organizationId)`

Filtert Kontakte nach verschiedenen Kriterien.

**Parameter:**
- `filters` (ListFilters, required) - Filter-Objekt
- `organizationId` (string, required) - Organization ID

**Rückgabe:** `Promise<ContactEnhanced[]>`

**Beispiel:**

```typescript
const contacts = await listsService.getContactsByFilters({
  companyTypes: ['media_house', 'publisher'],
  beats: ['economy', 'business'],
  hasEmail: true,
  publications: {
    types: ['newspaper'],
    minPrintCirculation: 50000
  }
}, organizationId);
```

**Filter-Optionen:**

#### Firmen-Filter

```typescript
{
  companyTypes?: string[];      // ['media_house', 'publisher', 'agency']
  industries?: string[];         // Branchen
  countries?: string[];          // Ländercodes (DE, AT, CH)
  tagIds?: string[];            // Tag IDs
}
```

#### Personen-Filter

```typescript
{
  hasEmail?: boolean;           // Nur Kontakte mit E-Mail
  hasPhone?: boolean;           // Nur Kontakte mit Telefon
  positions?: string[];         // Positionen (Redakteur, Chefredakteur, etc.)
}
```

#### Journalisten-Filter

```typescript
{
  beats?: string[];             // Ressorts (economy, politics, sports, etc.)
}
```

#### Publikations-Filter

```typescript
{
  publications?: {
    publicationIds?: string[];          // Spezifische Publikationen
    publisherIds?: string[];            // Verlage
    types?: string[];                   // newspaper, magazine, online, radio, tv
    formats?: string[];                 // print, digital, both
    frequencies?: string[];             // daily, weekly, monthly
    languages?: string[];               // de, en, fr
    countries?: string[];               // Länder
    geographicScopes?: string[];       // local, regional, national, international
    focusAreas?: string[];             // Themenbereiche
    targetIndustries?: string[];       // Zielgruppen-Branchen
    status?: string[];                 // active, inactive
    minPrintCirculation?: number;      // Mindest-Auflage
    maxPrintCirculation?: number;      // Maximal-Auflage
    minOnlineVisitors?: number;        // Mindest-Besucher
    maxOnlineVisitors?: number;        // Maximal-Besucher
    onlyVerified?: boolean;            // Nur verifizierte Publikationen
  }
}
```

#### Datum-Filter

```typescript
{
  createdAfter?: Date;          // Kontakte nach Datum
  createdBefore?: Date;         // Kontakte vor Datum
}
```

**Filter-Logik:**
- Alle Filter werden mit AND verknüpft
- Arrays innerhalb eines Filters werden mit OR verknüpft
- Publikations-Filter unterstützen komplexe Kombinationen

**Performance:**
- Lädt alle Kontakte der Organization
- Lädt Companies/Publications nur bei Bedarf
- Client-seitige Filterung (kein Firestore Query)

---

### `getContactsByIds(contactIds, organizationId?)`

Lädt Kontakte anhand ihrer IDs.

**Parameter:**
- `contactIds` (string[], required) - Array von Kontakt-IDs
- `organizationId` (string, optional) - Organization ID für enhanced Service

**Rückgabe:** `Promise<ContactEnhanced[]>`

**Beispiel:**

```typescript
const contacts = await listsService.getContactsByIds(
  ['contact1', 'contact2', 'contact3'],
  organizationId
);
```

**Verhalten:**
- Nutzt `contactsEnhancedService.getById()` wenn `organizationId` vorhanden
- Fallback auf direkten Firestore-Zugriff
- Legacy-Support für alte `contacts` Collection
- Unterstützt automatisch References (`local-ref-journalist-*`)
- Gibt leeres Array für leeres `contactIds` Array zurück

**Error Handling:**
- Loggt Fehler für einzelne Kontakte
- Gibt alle erfolgreich geladenen Kontakte zurück
- Überspringt fehlende/fehlerhafte IDs

---

## List Maintenance

### `refreshDynamicList(listId)`

Aktualisiert die Kontaktanzahl einer dynamischen Liste.

**Parameter:**
- `listId` (string, required) - Liste ID

**Rückgabe:** `Promise<void>`

**Beispiel:**

```typescript
// Aktualisiere Liste nach Kontakt-Änderungen
await listsService.refreshDynamicList(listId);
```

**Verhalten:**
- Nur für `type: 'dynamic'` Listen
- Berechnet neue Kontaktanzahl
- Aktualisiert `contactCount` und `lastUpdated`
- Ignoriert statische Listen

**Use Case:**
- Nach Import von neuen Kontakten
- Nach Änderung von Kontakt-Daten
- Manueller Refresh durch User

---

### `refreshAllDynamicLists(userId)`

Aktualisiert alle dynamischen Listen eines Users.

**Parameter:**
- `userId` (string, required) - User/Organization ID

**Rückgabe:** `Promise<void>`

**Beispiel:**

```typescript
// Aktualisiere alle Listen nach großem Import
await listsService.refreshAllDynamicLists(organizationId);
```

**Performance:**
- Lädt alle Listen
- Filtert nur dynamische Listen
- Aktualisiert sequenziell (nicht parallel)
- Kann bei vielen Listen länger dauern

**Use Case:**
- Nach CSV-Import von Kontakten
- Maintenance-Jobs
- Admin-Tools

---

## Usage Tracking

### `recordUsage(usage)`

Trackt die Verwendung einer Liste.

**Parameter:**
- `usage` (Omit<ListUsage, 'id' | 'usedAt'>, required)

**Rückgabe:** `Promise<string>` - ID des Usage-Records

**Beispiel:**

```typescript
await listsService.recordUsage({
  listId: 'list123',
  userId: user.uid,
  action: 'export',
  recipientCount: 150,
  campaignId: 'campaign456'
});
```

**Usage-Objekt:**

```typescript
interface ListUsage {
  id?: string;
  listId: string;
  userId: string;
  action: 'export' | 'email' | 'view' | 'other';
  recipientCount?: number;
  campaignId?: string;
  usedAt: Timestamp;
}
```

---

### `getUsageHistory(listId, limitCount?)`

Gibt die Verwendungshistorie einer Liste zurück.

**Parameter:**
- `listId` (string, required) - Liste ID
- `limitCount` (number, optional, default: 10) - Anzahl Einträge

**Rückgabe:** `Promise<ListUsage[]>`

**Beispiel:**

```typescript
const history = await listsService.getUsageHistory(listId, 20);
console.log(`${history.length} Verwendungen in den letzten Monaten`);
```

**Sortierung:**
- Neueste zuerst (DESC)
- Limitiert auf `limitCount` Einträge

---

## Analytics & Metrics

### `getListMetrics(listId)`

Lädt Analytics-Metriken einer Liste.

**Parameter:**
- `listId` (string, required) - Liste ID

**Rückgabe:** `Promise<ListMetrics | null>`

**Beispiel:**

```typescript
const metrics = await listsService.getListMetrics(listId);
if (metrics) {
  console.log(`Total Campaigns: ${metrics.totalCampaigns}`);
  console.log(`Last 30 Days: ${metrics.last30DaysCampaigns}`);
}
```

**Metriken-Objekt:**

```typescript
interface ListMetrics {
  id: string;
  listId: string;
  totalCampaigns: number;
  last30DaysCampaigns: number;
  activeContacts: number;
  lastCalculated: Timestamp;
  userId: string;
}
```

---

### `calculateAndSaveMetrics(listId, userId)`

Berechnet und speichert Metriken einer Liste.

**Parameter:**
- `listId` (string, required) - Liste ID
- `userId` (string, required) - User ID

**Rückgabe:** `Promise<void>`

**Beispiel:**

```typescript
// Update Metriken nach Kampagne
await listsService.calculateAndSaveMetrics(listId, user.uid);
```

**Berechnete Metriken:**
- `totalCampaigns` - Gesamtanzahl Verwendungen
- `last30DaysCampaigns` - Verwendungen letzte 30 Tage
- `activeContacts` - Geschätzte aktive Kontakte (80% von total)

**Use Case:**
- Scheduled Job (täglich/wöchentlich)
- Nach Kampagnen-Versand
- Analytics-Dashboard

---

## Utilities

### `duplicateList(listId, newName)`

Dupliziert eine bestehende Liste mit neuem Namen.

**Parameter:**
- `listId` (string, required) - ID der zu duplizierenden Liste
- `newName` (string, required) - Name für die neue Liste

**Rückgabe:** `Promise<string>` - ID der duplizierten Liste

**Beispiel:**

```typescript
const newListId = await listsService.duplicateList(
  originalListId,
  'Kopie von Original Liste'
);
```

**Verhalten:**
- Kopiert alle Eigenschaften außer `id`, `createdAt`, `updatedAt`
- Setzt neue Timestamps
- Berechnet neue Kontaktanzahl (bei dynamischen Listen)

**Use Case:**
- Template-Listen duplizieren
- Varianten einer Liste erstellen
- A/B-Testing von Listen

---

### `exportContacts(listId)`

Exportiert alle Kontakte einer Liste.

**Parameter:**
- `listId` (string, required) - Liste ID

**Rückgabe:** `Promise<ContactEnhanced[]>`

**Beispiel:**

```typescript
const contacts = await listsService.exportContacts(listId);

// CSV-Export
const csv = convertToCSV(contacts);
downloadFile(csv, 'contacts.csv');
```

**Error Handling:**

```typescript
try {
  const contacts = await listsService.exportContacts(listId);
} catch (error) {
  if (error.message === 'Liste nicht gefunden') {
    console.error('Liste existiert nicht');
  }
}
```

**Use Case:**
- CSV-Export
- Excel-Export
- Email-Kampagnen
- Externe Tools

---

## Best Practices

### 1. Verwende React Query

```typescript
// ✅ GUT: Caching + Auto-Updates
import { useLists } from '@/lib/hooks/useListsData';
const { data: lists } = useLists(organizationId);

// ❌ SCHLECHT: Direkte Calls ohne Caching
const lists = await listsService.getAll(organizationId);
```

### 2. Preview statt vollständige Listen

```typescript
// ✅ GUT: Nur Preview laden
const preview = await listsService.getContactsPreview(list, 10);

// ❌ SCHLECHT: Alle laden für Preview
const all = await listsService.getContacts(list);
```

### 3. Error Handling

```typescript
// ✅ GUT: Vollständiges Error Handling
try {
  const list = await listsService.getById(listId);
  if (!list) {
    showError('Liste nicht gefunden');
    return;
  }
  // ... weiterer Code
} catch (error) {
  console.error('[Lists] Error:', error);
  showError('Fehler beim Laden');
}
```

### 4. Debouncing für Filter-Updates

```typescript
// ✅ GUT: Debounced Updates
useEffect(() => {
  const timer = setTimeout(async () => {
    const contacts = await listsService.getContactsByFilters(
      filters,
      organizationId
    );
    setPreview(contacts.slice(0, 10));
  }, 500);

  return () => clearTimeout(timer);
}, [filters]);
```

### 5. Validierung vor API-Calls

```typescript
// ✅ GUT: Validierung
if (!organizationId) {
  console.error('Organization ID fehlt');
  return;
}

const lists = await listsService.getAll(organizationId);
```

---

## Performance-Überlegungen

### Filter-Performance

**Optimiert:**
- Lädt Companies/Publications nur wenn benötigt
- Client-seitige Filterung (kein komplexes Firestore Query)
- Debouncing für Live-Vorschau (500ms)

**Limitierungen:**
- Bei sehr vielen Kontakten (>10.000) kann Filterung langsam werden
- Publikations-Filter benötigen zusätzliche Firestore-Queries

**Empfehlung:**
- Verwende `getContactsPreview()` für UI
- Vollständige Listen nur für Export
- Caching mit React Query

### Cache-Strategie

```typescript
// React Query Cache-Konfiguration
const { data: lists } = useLists(organizationId, {
  staleTime: 5 * 60 * 1000,  // 5 Minuten
});
```

---

## Changelog

**v1.0 (2025-10-14)**
- Initial Release
- CRUD Operations
- Filter Operations mit Publikations-Support
- Usage Tracking
- Analytics & Metrics
- Export Functions

---

## Support

**Entwickler:** CeleroPress Development Team
**Dokumentation:** v1.0
**Letzte Aktualisierung:** 2025-10-14

Bei Fragen siehe: [API README](./README.md) | [Project README](../../../README.md)
