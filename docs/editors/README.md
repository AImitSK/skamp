# Editors (Premium-Datenbank) Dokumentation

**Version:** 1.0
**Status:** ✅ Production-Ready
**Letzte Aktualisierung:** Januar 2025

---

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Features](#features)
- [Multi-Entity Reference-System](#multi-entity-reference-system)
- [Architektur](#architektur)
- [Technologie-Stack](#technologie-stack)
- [API-Dokumentation](#api-dokumentation)
- [Komponenten](#komponenten)
- [Testing](#testing)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Referenzen](#referenzen)

---

## Übersicht

Die Premium-Datenbank (Editors) ist eine kuratierte Journalisten-Datenbank mit Multi-Entity Reference-System.

**Kernfunktionen:**
- Globale Journalisten-Datenbank (SuperAdmin-gepflegt)
- Multi-Entity Reference-Import (Company + Publications + Journalist)
- Live-Suche & Filterung
- Quality-Score-basiertes Ranking
- Subscription-basierter Zugriff

**Konzeptioneller Hintergrund:**
Das System basiert auf einem Verweis-Modell (Reference-System), bei dem keine Daten dupliziert werden. SuperAdmin-Organisationen pflegen globale Journalisten, die andere Organisationen als Verweise importieren können.

---

## Features

### ✅ Für SuperAdmin

- **Journalisten im CRM pflegen** → werden automatisch global
- **Publikationen in der Bibliothek pflegen**
- **Alle Daten werden zentral verwaltet**
- **Änderungen sofort bei allen Organisationen sichtbar**

### ✅ Für normale Organisationen

- **Globale Journalisten durchsuchen**
  - Live-Suche nach Namen, Companies, Themen
  - Filter nach Themen, Medientypen, Quality-Score
  - Pagination (25 Journalisten pro Seite)

- **Multi-Entity References importieren:**
  - Company-Reference (Medienhaus)
  - Publication-References (alle Publikationen)
  - Journalist-Reference (Kontakt)

- **Lokale Verwaltung:**
  - Lokale Notizen hinzufügen
  - Mit Tags versehen
  - Für Verteilerlisten nutzen
  - In Kampagnen verwenden

### 🔒 Subscription-Features

**Free Plan:**
- Globale Journalisten durchsuchen ✅
- Filter nutzen ✅
- Import: ❌ Nicht verfügbar

**Premium Plan:**
- Alle Free-Features ✅
- Multi-Entity Reference-Import ✅
- Unbegrenzte Verweise ✅
- Erweiterte Filter ✅

---

## Multi-Entity Reference-System

### Konzept

**Kein Kopieren, nur Verweisen:**
- Kunden importieren keine Daten-Kopien
- System erstellt nur Verweise (References)
- Änderungen des SuperAdmin erscheinen sofort bei allen

### Ablauf

1. **Kunde klickt Stern-Icon** bei globalem Journalist

2. **System erstellt automatisch:**
   ```
   Multi-Entity Reference Creation:
   ├── Company-Reference (Medienhaus)
   │   └── local-ref-company-{companyId}
   ├── Publication-References (alle Publikationen des Journalisten)
   │   ├── local-ref-pub-{pubId1}
   │   ├── local-ref-pub-{pubId2}
   │   └── ...
   └── Journalist-Reference (Kontakt mit lokalen Notizen)
       └── Reference mit _globalJournalistId + localNotes
   ```

3. **UI kombiniert:**
   - **Globale Daten** (read-only) - vom SuperAdmin gepflegt
   - **Lokale Notizen** (editierbar) - organisation-spezifisch

### Datenstruktur

```typescript
// SuperAdmin-Org: Globaler Journalist
/contacts_enhanced/journalist_123
{
  id: "journalist_123",
  isGlobal: true,
  displayName: "Max Mustermann",
  companyId: "company_456",
  mediaProfile: {
    isJournalist: true,
    beats: ["Technologie", "Innovation"],
    publicationIds: ["pub_789", "pub_790"]
  }
}

// Kunde-Org: Reference
/organizations/kundeId/journalist_references/reference_abc
{
  _globalJournalistId: "journalist_123",  ← VERWEIS!
  localNotes: "Wichtig für Tech-PR",
  localTags: ["technik", "wichtig"],
  createdAt: Timestamp,
  createdBy: "user_xyz"
}
```

### Vorteile

- ✅ **Keine Duplikate** - Ein Journalist, eine Wahrheit
- ✅ **Immer aktuelle Daten** - Änderungen sofort bei allen
- ✅ **Spart Speicher** - Keine Datenverdopplung
- ✅ **Qualität gesichert** - Nur SuperAdmin kann ändern
- ✅ **Konsistente Datenqualität** - Zentrale Pflege

---

## Architektur

### Übersicht

```
Editors-Modul (Production-Ready nach Refactoring)
├── React Query State Management
│   └── Custom Hooks für alle Daten-Operationen
├── Multi-Entity Reference-System
│   └── Atomische Multi-Entity-Operationen
├── Modular Components (< 300 Zeilen)
│   ├── Shared Components (Alert, EmptyState)
│   └── Page Components (< 300 Zeilen)
├── Performance-optimiert
│   ├── useCallback für Event Handler
│   ├── useMemo für Computed Values
│   └── 300ms Debouncing für Search
└── Comprehensive Test Suite
    ├── 11 Hook-Tests
    └── 12 Component-Tests
```

### Ordnerstruktur

```
src/app/dashboard/library/editors/
├── page.tsx                          # Main Component (<300 Zeilen)
├── components/
│   └── shared/
│       ├── Alert.tsx                 # Wiederverwendbare Alert-Komponente
│       ├── EmptyState.tsx            # Wiederverwendbare EmptyState-Komponente
│       └── __tests__/
│           ├── Alert.test.tsx        # 8 Tests
│           └── EmptyState.test.tsx   # 4 Tests

src/lib/hooks/
├── useEditorsData.ts                 # React Query Hooks
└── __tests__/
    └── useEditorsData.test.tsx       # 11 Tests

docs/editors/
├── README.md                         # Diese Datei
├── api/
│   ├── README.md                     # API-Übersicht
│   └── multi-entity-reference-service.md
├── components/
│   └── README.md                     # Komponenten-Dokumentation
└── adr/
    └── README.md                     # Architecture Decision Records
```

### Datenfluss

```
User Interaction
    ↓
Event Handler (useCallback)
    ↓
React Query Mutation
    ↓
Firebase Service (multiEntityService)
    ↓
Firestore Update
    ↓
Query Invalidation
    ↓
Automatic Re-fetch
    ↓
UI Update
```

---

## Technologie-Stack

### Frontend
- **React 18** - UI Framework mit Hooks
- **Next.js 15** - App Router, Server Components
- **TypeScript** - Type Safety & IntelliSense

### State Management
- **React Query v5** - Server State Management
  - Automatisches Caching
  - Background Updates
  - Query Invalidation
  - Optimistic Updates

### Backend
- **Firebase Firestore** - NoSQL Database
- **Multi-Entity Reference-Service** - Reference-System
- **Firebase Storage** - File Storage (für Medien)

### Styling
- **Tailwind CSS** - Utility-First CSS
- **Headless UI** - Accessible Components
- **Heroicons** - Icon Library (nur /24/outline)

### Testing
- **Jest** - Test Runner
- **React Testing Library** - Component Testing
- **@testing-library/react-hooks** - Hook Testing

---

## API-Dokumentation

Siehe: [API-Dokumentation](./api/README.md)

**Wichtige Services:**
- [Multi-Entity Reference-Service](./api/multi-entity-reference-service.md)
- Contacts Enhanced Service
- Companies Enhanced Service
- Publication Service

**Custom Hooks:**
- `useGlobalJournalists()` - Lädt alle globalen Journalisten
- `useImportedJournalists(orgId)` - Lädt Reference-IDs der Organisation
- `useCreateJournalistReference()` - Erstellt Multi-Entity Reference
- `useRemoveJournalistReference()` - Entfernt Reference
- `useCompanies(orgId)` - Lädt lokale + globale Companies
- `usePublications(orgId)` - Lädt lokale + referenced Publications

---

## Komponenten

Siehe: [Komponenten-Dokumentation](./components/README.md)

**Shared Components:**
- **Alert** - Wiederverwendbare Alert-Komponente (Info, Success, Warning, Error)
- **EmptyState** - Wiederverwendbare EmptyState-Komponente mit Icon

**Page Components:**
- **EditorsPage** - Main Component mit Search, Filter, Table, Pagination

---

## Testing

### Test-Ausführung

```bash
# Alle Tests
npm test

# Nur Editors-Tests
npm test -- useEditorsData
npm test -- editors/components/shared

# Coverage
npm run test:coverage
```

### Test-Suite

**Hook-Tests (11 Tests):**
- `useGlobalJournalists` - Fetching + Filtering
- `useImportedJournalists` - Fetching + Enabled-Guard
- `useCreateJournalistReference` - Create + Cache Invalidation
- `useRemoveJournalistReference` - Remove + Cache Invalidation
- `useCompanies` - Local + Global Fetching, Deduplication
- `usePublications` - Fetching + Enabled-Guard

**Component-Tests (12 Tests):**
- **Alert (8 Tests):**
  - Info, Success, Warning, Error Types
  - With/Without Message
  - Action Button + Click Handler
  - Styling per Type

- **EmptyState (4 Tests):**
  - Title + Description Rendering
  - Default Icon (UserIcon)
  - Custom Icon
  - Styling Classes

### Test-Coverage

```
Statements   : 85%
Branches     : 82%
Functions    : 88%
Lines        : 86%
```

**Coverage-Report:**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## Performance

### Optimierungen (Phase 3)

**React Query Caching:**
- Journalists: 5min staleTime (ändern sich häufiger)
- Companies/Publications: 10min staleTime (selten ändernd)
- Automatic Background Refetch
- Query Invalidation bei Mutations

**Debouncing:**
- Search Input: 300ms Debounce
- Filter-Operationen nur nach Pause ausgeführt
- Verhindert unnötige Re-Renders

**useCallback für Event Handler:**
```typescript
const handleImportReference = useCallback(async (journalist) => {
  // ... Implementation
}, [isSuperAdmin, subscription, currentOrganization, user, createReference, showAlert]);

const handleTopicToggle = useCallback((topic, checked) => {
  // ... Implementation
}, []);
```

**useMemo für Computed Values:**
```typescript
const filteredJournalists = useMemo(() => {
  return convertedJournalists.filter(/* ... */);
}, [convertedJournalists, debouncedSearchTerm, selectedTopics, selectedMediaTypes, minQualityScore]);

const activeFiltersCount = useMemo(() =>
  selectedTopics.length + selectedMediaTypes.length + (minQualityScore > 0 ? 1 : 0),
  [selectedTopics.length, selectedMediaTypes.length, minQualityScore]
);
```

### Performance-Metriken

**Vor Refactoring:**
- Initial Load: ~2-3s
- Filter Change: ~500ms
- Search Input: ~300ms pro Keystroke
- Re-renders: Häufig unnötig

**Nach Refactoring:**
- Initial Load: ~1-1.5s (React Query Caching)
- Filter Change: ~100-200ms (useMemo)
- Search Input: 300ms Debounce → nur 1x berechnet
- Re-renders: Minimiert durch useCallback/useMemo

---

## Troubleshooting

### Häufige Probleme

#### Problem: "Journalist kann nicht importiert werden"

**Symptom:** Import-Button funktioniert nicht oder ist deaktiviert

**Lösungen:**
1. **Subscription prüfen:**
   ```typescript
   // Premium-Feature prüfen
   if (!subscription?.features.importEnabled) {
     // Upgrade-Dialog anzeigen
   }
   ```

2. **SuperAdmin-Check:**
   ```typescript
   // SuperAdmin kann sich nicht selbst referenzieren
   if (currentOrganization?.id === "superadmin-org") {
     // Info-Alert anzeigen
   }
   ```

3. **Import-Limit prüfen:**
   - Free Plan: 0 Imports erlaubt
   - Premium Plan: Unbegrenzte Imports

#### Problem: "Globale Journalisten werden nicht angezeigt"

**Symptom:** Leere Liste oder "Keine Journalisten gefunden"

**Lösungen:**
1. **isGlobal-Flag prüfen:**
   ```sql
   -- Firestore Query
   contacts_enhanced
   WHERE isGlobal == true
   AND mediaProfile.isJournalist == true
   ```

2. **CRM-Daten prüfen:**
   - Journalist im SuperAdmin-CRM vorhanden?
   - `isGlobal: true` gesetzt?
   - `mediaProfile.isJournalist: true` gesetzt?

3. **Firestore-Permissions prüfen:**
   - Kann Organisation globale Daten lesen?

#### Problem: "Company oder Publikation fehlt im Detail"

**Symptom:** Journalist wird angezeigt, aber Company/Publikation leer

**Lösungen:**
1. **Company-ID prüfen:**
   ```typescript
   // Company sollte existieren
   const company = companies.find(c => c.id === journalist.companyId);
   ```

2. **Publication-IDs prüfen:**
   ```typescript
   // Publikationen sollten existieren
   const pubs = publications.filter(p =>
     journalist.mediaProfile?.publicationIds?.includes(p.id)
   );
   ```

3. **Fallback-Logic vorhanden:**
   - System erstellt Fallback-Company aus companyName
   - System erstellt Fallback-Publication wenn nötig

#### Problem: "Reference wird nicht entfernt"

**Symptom:** Nach Klick auf "Verweis entfernen" bleibt Journalist markiert

**Lösungen:**
1. **Cache Invalidation prüfen:**
   ```typescript
   onSuccess: (_, variables) => {
     queryClient.invalidateQueries({
       queryKey: ['editors', 'imported', variables.organizationId]
     });
   }
   ```

2. **Firestore-Deletion prüfen:**
   - Reference-Dokument wirklich gelöscht?
   - `journalist_references` Collection prüfen

---

## Referenzen

### Interne Dokumentation
- [Multi-Entity Reference-Service](./api/multi-entity-reference-service.md)
- [Komponenten-Dokumentation](./components/README.md)
- [ADRs](./adr/README.md)
- [Konzept-Klarstellung](../../docs_old/Journalisten Datenbank/KONZEPT-KLARSTELLUNG.md)
- [Multi-Entity Reference-System](../../docs_old/Journalisten Datenbank/MULTI-ENTITY-REFERENCE-SYSTEM.md)
- [Reference-System Architektur](../../docs_old/Journalisten Datenbank/REFERENCE-SYSTEM-ARCHITEKTUR.md)

### Externe Ressourcen
- [React Query Dokumentation](https://tanstack.com/query/latest)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Code-Repositories
- **Source Code:** `/src/app/dashboard/library/editors/`
- **Hooks:** `/src/lib/hooks/useEditorsData.ts`
- **Services:** `/src/lib/firebase/multi-entity-reference-service.ts`
- **Tests:** `/src/lib/hooks/__tests__/` und `/src/app/dashboard/library/editors/components/shared/__tests__/`

---

**Maintainer:** CeleroPress Development Team
**Support:** Siehe Team README oder Slack-Channel #editors-support
**Version:** 1.0 (Post-Refactoring)
**Letzte Aktualisierung:** Januar 2025
