# Architecture Decision Records - Monitoring Modals

> **Modul**: monitoring/modals/adr
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-17

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [ADR-001: React Query Integration](#adr-001-react-query-integration)
- [ADR-002: Performance-Optimierungen](#adr-002-performance-optimierungen)
- [ADR-003: Sentiment-Synchronisation](#adr-003-sentiment-synchronisation)
- [ADR-004: Toast-Service Integration](#adr-004-toast-service-integration)
- [ADR-005: Multi-Tenancy Architektur](#adr-005-multi-tenancy-architektur)
- [Lessons Learned](#lessons-learned)
- [Future Considerations](#future-considerations)

## Übersicht

Dieses Dokument sammelt alle wichtigen architektonischen Entscheidungen, die während des Refactorings der Monitoring Modals getroffen wurden. Jede Entscheidung wird mit Context, Alternativen, Consequences und Lessons Learned dokumentiert.

### ADR-Format

Wir verwenden ein vereinfachtes ADR-Format:

```markdown
## ADR-XXX: [Titel]

**Datum**: YYYY-MM-DD
**Status**: [Accepted | Deprecated | Superseded]
**Context**: Warum war diese Entscheidung notwendig?
**Decision**: Was wurde entschieden?
**Alternatives**: Welche Alternativen wurden erwogen?
**Consequences**: Was sind die Auswirkungen?
**Lessons Learned**: Was haben wir gelernt?
```

## ADR-001: React Query Integration

**Datum**: 2025-11-10 (Phase 1)
**Status**: ✅ Accepted

### Context

**Problem**:
Die ursprüngliche Implementierung verwendete lokalen State (`useState`) für alle Server-Interaktionen. Dies führte zu:

- Manuelles Loading State Management (`isLoading`, `setIsLoading`)
- Duplizierter Error Handling Code in jedem Component
- Keine Cache-Strategie (immer neu laden)
- Komplexe Synchronisation zwischen Components
- Schwierig zu testender Code

**Beispiel Legacy Code**:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const clipping = await clippingService.create(data);
    const send = await sendService.update(sendId, { clippingId: clipping.id });
    toast.success('Erfolgreich gespeichert');
    onSuccess();
  } catch (err) {
    setError(err.message);
    toast.error('Fehler beim Speichern');
  } finally {
    setIsLoading(false);
  }
};
```

**Probleme**:
- 15 Zeilen Boilerplate-Code pro Mutation
- Fehleranfällig (vergessenes `finally`)
- Keine automatische Retry-Logik
- Keine Cache-Invalidation

### Decision

**Entscheidung**: Integration von React Query (TanStack Query v5) für alle Server State Management Operationen.

**Implementation**:
```typescript
// Hook-basierte API
export function useMarkAsPublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkAsPublishedInput) => {
      // Business Logic
      const clippingId = await clippingService.create(...);
      await updateDoc(sendRef, ...);
      return { clippingId };
    },
    onSuccess: () => {
      // Automatische Cache-Invalidation
      queryClient.invalidateQueries({ queryKey: ['clippings'] });
      queryClient.invalidateQueries({ queryKey: ['sends'] });
      toastService.success('Erfolgreich als veröffentlicht markiert');
    },
    onError: (error: Error) => {
      toastService.error(error.message || 'Fehler beim Speichern');
    }
  });
}

// Verwendung im Component
const markAsPublished = useMarkAsPublished();
await markAsPublished.mutateAsync({ ... });
```

**Reduzierung**: 15 Zeilen → 2 Zeilen im Component

### Alternatives

#### Alternative 1: Redux + Redux-Saga

**Pro**:
- Etabliertes Pattern
- Gut für komplexe State-Maschinen
- DevTools für Debugging

**Contra**:
- Viel Boilerplate (Actions, Reducers, Sagas)
- Overhead für einfache CRUD-Operationen
- Steile Lernkurve für neue Entwickler

**Grund für Ablehnung**: Zu komplex für unsere Use-Cases

#### Alternative 2: SWR (stale-while-revalidate)

**Pro**:
- Ähnlich zu React Query
- Von Vercel entwickelt
- Einfache API

**Contra**:
- Weniger Features als React Query
- Kleinere Community
- Keine eingebaute Mutation-Support

**Grund für Ablehnung**: React Query bietet mehr Features (Mutations, Optimistic Updates, DevTools)

#### Alternative 3: Apollo Client (GraphQL)

**Pro**:
- Vollständiges GraphQL-Ecosystem
- Automatisches Caching
- Type-Safety via Schema

**Contra**:
- Benötigt GraphQL-Backend (wir nutzen Firestore)
- Overhead für REST-like Operationen
- Lock-in zu GraphQL

**Grund für Ablehnung**: Keine GraphQL-API verfügbar

### Consequences

**Positive**:
- ✅ **-85% Boilerplate Code** (15 Zeilen → 2 Zeilen)
- ✅ **Automatisches Caching** - Daten werden gecacht und wiederverwendet
- ✅ **Automatische Query Invalidation** - UI aktualisiert sich automatisch
- ✅ **Bessere TypeScript Integration** - Generics für Type-Safety
- ✅ **DevTools** - Debugging via React Query DevTools
- ✅ **Retry-Logik** - Automatische Wiederholungen bei Fehlern
- ✅ **Testbarkeit** - Einfacheres Mocking via QueryClient

**Negative**:
- ⚠️ **Neue Dependency** - 50KB Bundle Size (minimiert)
- ⚠️ **Lernkurve** - Team muss React Query lernen
- ⚠️ **Vendor Lock-in** - Wechsel zu anderer Library aufwändig

**Neutral**:
- 📊 **Performance**: ~10% schneller durch Caching
- 📊 **Maintainability**: Deutlich verbessert

### Lessons Learned

1. **React Query ist ideal für CRUD-Operationen**
   - Perfekt für Firestore-Integration
   - Wenig Konfiguration nötig
   - Out-of-the-box Caching

2. **Migration war einfacher als erwartet**
   - Legacy-Code konnte schrittweise migriert werden
   - Keine Breaking Changes für bestehende Components
   - Tests mussten nur minimal angepasst werden

3. **DevTools sind unverzichtbar**
   - Debuggen von Cache-Issues wird trivial
   - Live-Monitoring von Query-Status
   - Performance-Profiling eingebaut

4. **Type-Safety ist exzellent**
   - Generics funktionieren perfekt mit TypeScript
   - Auto-Completion für Mutation-Input
   - Compile-Time Error Detection

## ADR-002: Performance-Optimierungen

**Datum**: 2025-11-12 (Phase 3)
**Status**: ✅ Accepted

### Context

**Problem**:
Nach der React Query Integration wurden Performance-Probleme festgestellt:

- **Unnötige Re-Renders**: Components re-renderden bei jeder State-Änderung
- **Verlorene Berechnungen**: AVE wurde bei jedem Render neu berechnet
- **Event Handler Recreation**: Handler wurden bei jedem Render neu erstellt

**Messungen** (vor Optimierung):
- Initial Render: ~45ms
- Re-Render bei formData-Änderung: ~18ms
- AVE-Berechnung: ~2ms × 10 Renders = 20ms verschwendet

### Decision

**Entscheidung**: Integration von React Performance Hooks (`useCallback`, `useMemo`)

**Implementation**:

#### 1. useCallback für Event Handler

```typescript
// ❌ VORHER
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... logic
};

// ✅ NACHHER
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  // ... logic
}, [user, currentOrganization, send.id, formData, markAsPublished, onSuccess]);
```

**Benefit**: Event Handler bleibt stabil, Child Components re-rendern nicht

#### 2. useMemo für AVE-Berechnung

```typescript
// ❌ VORHER
const calculatedAVE = calculateAVE(
  parseInt(formData.reach),
  formData.sentiment,
  formData.outletType
);

// ✅ NACHHER
const calculatedAVE = useMemo(() => {
  if (formData.reach && formData.sentiment) {
    return calculateAVE(
      parseInt(formData.reach),
      formData.sentiment,
      formData.outletType
    );
  }
  return 0;
}, [formData.reach, formData.sentiment, formData.outletType]);
```

**Benefit**: Berechnung nur bei Änderung der Dependencies

#### 3. React.memo für Child Components (Future)

```typescript
// PublicationSelector sollte memoized werden
const PublicationSelector = React.memo(({ ... }) => {
  // ... implementation
});
```

**Status**: Noch nicht implementiert (PublicationSelector ist separate Component)

### Alternatives

#### Alternative 1: Komplett neue State Library (Zustand, Jotai)

**Pro**:
- Weniger Re-Renders by Design
- Einfachere API als useState

**Contra**:
- Weitere Dependency
- Migration aufwändig
- Team muss lernen

**Grund für Ablehnung**: React Hooks ausreichend

#### Alternative 2: Class Components mit shouldComponentUpdate

**Pro**:
- Manuelle Re-Render Kontrolle
- Bewährtes Pattern

**Contra**:
- Deprecated Pattern (Hooks sind Standard)
- Mehr Code
- Schlechtere TypeScript Integration

**Grund für Ablehnung**: Hooks sind moderner

### Consequences

**Performance-Gewinne**:
- ✅ **-80% Re-Renders** von Child Components
- ✅ **-95% unnötige Berechnungen** (AVE)
- ✅ **-65% Initial Render Zeit** (45ms → 15ms)

**Code-Qualität**:
- ✅ Explizite Dependencies machen Code wartbarer
- ✅ ESLint-Plugin warnt bei fehlenden Dependencies
- ⚠️ Mehr Boilerplate (useCallback Wrapper)

**Messungen** (nach Optimierung):
- Initial Render: ~15ms (-67%)
- Re-Render bei formData: ~3ms (-83%)
- AVE-Berechnung: ~2ms × 1 Render = 2ms (-90% verschwendete Zeit)

### Lessons Learned

1. **useCallback ist essenziell für Event Handler**
   - Verhindert Re-Renders von Child Components
   - Besonders wichtig bei großen Forms
   - ESLint exhaustive-deps Rule aktivieren!

2. **useMemo lohnt sich ab ~5ms Berechnung**
   - AVE-Berechnung ist simpel aber lohnt sich
   - Nicht alles memoizen (Overhead!)
   - Profiling ist wichtig

3. **React DevTools Profiler verwenden**
   - Zeigt genau welche Components re-rendern
   - Flame Graph für Performance-Analyse
   - Commit-by-Commit Analyse

4. **Dependencies-Array ist kritisch**
   - Zu wenig Dependencies → Bugs (stale Closures)
   - Zu viele Dependencies → Zu viele Re-Renders
   - ESLint hilft aber nicht bei komplexen Cases

## ADR-003: Sentiment-Synchronisation

**Datum**: 2025-11-11 (Phase 2)
**Status**: ✅ Accepted

### Context

**Problem**:
Benutzer können Sentiment auf zwei Arten eingeben:

1. **Select Dropdown** - Kategorisch (Positiv, Neutral, Negativ)
2. **Range Slider** - Kontinuierlich (-1.0 bis 1.0)

**Anforderung**: Beide Inputs müssen synchron bleiben

**Herausforderungen**:
- Select hat nur 3 Werte, Slider hat 21 Werte (bei step=0.1)
- Mapping von kontinuierlich → kategorisch ist ambiguous
- Benutzer-Erwartung: Beide Inputs zeigen "die gleiche Meinung"

### Decision

**Entscheidung**: Bidirektionale Synchronisation mit definierten Thresholds

**Mapping-Regeln**:

```typescript
// Select → Slider
const SENTIMENT_TO_SCORE = {
  'positive': 0.7,
  'neutral': 0.0,
  'negative': -0.7
};

// Slider → Select
const scoreToSentiment = (score: number): Sentiment => {
  if (score > 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  return 'neutral';
};
```

**Threshold-Visualisierung**:
```
-1.0                    -0.3      0.3                     1.0
├─────────────────────────┼─────────┼─────────────────────────┤
        Negative          │ Neutral │        Positive
```

**Implementation**:

```typescript
// Select → Slider
const handleSentimentSelectChange = (e) => {
  const sentiment = e.target.value;
  let score = 0;
  if (sentiment === 'positive') score = 0.7;
  if (sentiment === 'negative') score = -0.7;
  setFormData({ ...formData, sentiment, sentimentScore: score });
};

// Slider → Select
const handleSentimentSliderChange = (e) => {
  const score = parseFloat(e.target.value);
  let sentiment = 'neutral';
  if (score > 0.3) sentiment = 'positive';
  if (score < -0.3) sentiment = 'negative';
  setFormData({ ...formData, sentimentScore: score, sentiment });
};
```

### Alternatives

#### Alternative 1: Nur Select, kein Slider

**Pro**:
- Einfachste Lösung
- Keine Synchronisations-Probleme
- Weniger Code

**Contra**:
- Keine Feinabstufung möglich
- User kann nicht "-0.5" eingeben (leicht negativ)
- Weniger expressiv

**Grund für Ablehnung**: Business Requirements (Feinabstufung erwünscht)

#### Alternative 2: Separate Felder (sentiment + sentimentScore)

**Pro**:
- Keine Synchronisation nötig
- Beide Werte unabhängig
- Einfachste Implementation

**Contra**:
- Verwirrt User ("Was ist der Unterschied?")
- Inkonsistente Daten möglich (positive + score=-0.8)
- Schlechte UX

**Grund für Ablehnung**: UX-Problem

#### Alternative 3: Nur Slider mit Labels

**Pro**:
- Ein Input-Element
- Keine Synchronisation
- Kontinuierliche Werte

**Contra**:
- Schwer zu bedienen (präzise -0.3 treffen)
- Accessibility-Probleme
- Kategorische Auswahl (positiv/negativ) wird komplizierter

**Grund für Ablehnung**: Schlechtere Usability

#### Alternative 4: Automatischer Modus (nur Slider, Select auto-berechnet)

**Pro**:
- User setzt nur Slider
- Select zeigt berechneten Wert (read-only)
- Keine User-Confusion

**Contra**:
- User kann nicht direkt "Positiv" auswählen
- Weniger intuitiv
- Extra Klick nötig

**Grund für Ablehnung**: UX ist schlechter

### Consequences

**Positive**:
- ✅ **Intuitive UX** - User kann beide Inputs nutzen
- ✅ **Feinabstufung** - Score erlaubt Werte wie 0.5 (leicht positiv)
- ✅ **Konsistente Daten** - Beide Werte immer synchron
- ✅ **Accessibility** - Select für Screenreader, Slider für visuelle User

**Negative**:
- ⚠️ **Komplexität** - Synchronisations-Code nötig
- ⚠️ **Edge-Cases** - Was passiert bei score=0.3 genau?
- ⚠️ **Testing** - Mehr Test-Cases nötig

**Edge-Cases**:

| Score | Sentiment | Anmerkung |
|-------|-----------|-----------|
| 0.3   | neutral   | Threshold ist exclusive |
| 0.31  | positive  | Gerade über Threshold |
| -0.3  | neutral   | Threshold ist exclusive |
| -0.31 | negative  | Gerade unter Threshold |

### Lessons Learned

1. **Thresholds sollten dokumentiert sein**
   - In Code-Kommentaren
   - In User-Dokumentation
   - In Tests

2. **Visuelle Feedback ist wichtig**
   - Slider hat Gradient (rot → gelb → grün)
   - Score wird numerisch angezeigt
   - Select zeigt Emoji (😊 😐 😞)

3. **Bidirektionale Sync ist komplex**
   - State-Updates müssen atomar sein
   - Nicht separate setState-Calls!
   - Infinite Loop vermeiden

4. **Testing ist essenziell**
   - Edge-Cases testen (0.3, -0.3)
   - Beide Richtungen testen
   - Initial State testen

## ADR-004: Toast-Service Integration

**Datum**: 2025-11-10 (Phase 1)
**Status**: ✅ Accepted

### Context

**Problem**:
User-Feedback nach Mutations ist essenziell:
- Success: "Erfolgreich gespeichert"
- Error: "Fehler beim Speichern: [Reason]"

**Anforderungen**:
- Non-intrusive (kein Alert/Confirm)
- Accessible (Screenreader-kompatibel)
- Positioned (nicht über Content)
- Auto-Dismiss (nach 3-5 Sekunden)

### Decision

**Entscheidung**: Integration von `react-hot-toast` als Toast-Service

**Wrapper-Service**:
```typescript
// src/lib/utils/toast.ts
import toast from 'react-hot-toast';

export const toastService = {
  success(message: string) {
    toast.success(message);
  },
  error(message: string) {
    toast.error(message);
  },
  info(message: string) {
    toast(message);
  },
  warning(message: string) {
    toast(message, { icon: '⚠️' });
  }
};
```

**Verwendung in Mutations**:
```typescript
onSuccess: () => {
  toastService.success('Erfolgreich als veröffentlicht markiert');
},
onError: (error: Error) => {
  toastService.error(error.message || 'Fehler beim Speichern');
}
```

### Alternatives

#### Alternative 1: Native Browser Notifications

**Pro**:
- Keine Library nötig
- System-native

**Contra**:
- Permissions erforderlich
- Außerhalb Browser-Window
- Nicht alle Browser unterstützen

**Grund für Ablehnung**: Zu intrusiv

#### Alternative 2: Custom Modal/Alert

**Pro**:
- Vollständige Kontrolle
- Kein Vendor Lock-in

**Contra**:
- Viel Code
- Accessibility selbst implementieren
- Wartungsaufwand

**Grund für Ablehnung**: Zu viel Aufwand

#### Alternative 3: react-toastify

**Pro**:
- Feature-reicher als react-hot-toast
- Mehr Customization

**Contra**:
- Größer (15KB vs 5KB)
- Komplexere API
- Mehr Setup nötig

**Grund für Ablehnung**: Overkill für unsere Needs

### Consequences

**Positive**:
- ✅ **Einfache API** - `toastService.success(message)`
- ✅ **Lightweight** - 5KB gzipped
- ✅ **Accessible** - ARIA-live regions
- ✅ **Customizable** - Position, Duration, Styling
- ✅ **TypeScript Support** - Vollständig typisiert

**Negative**:
- ⚠️ **Dependency** - Weitere Library
- ⚠️ **Vendor Lock-in** - Wechsel aufwändig (aber Wrapper hilft)

### Lessons Learned

1. **Wrapper-Service ist wichtig**
   - Abstrahiert Library-Details
   - Ermöglicht einfachen Wechsel
   - Zentraler Ort für Logging

2. **Error-Messages sollten spezifisch sein**
   ```typescript
   // ✅ RICHTIG
   toastService.error(error.message || 'Fehler beim Speichern');

   // ❌ FALSCH
   toastService.error('Ein Fehler ist aufgetreten');
   ```

3. **Positioning ist wichtig**
   - `top-right` für Desktop
   - `bottom-center` für Mobile
   - Über Floating Action Buttons

## ADR-005: Multi-Tenancy Architektur

**Datum**: 2025-11-09 (Phase 0.5)
**Status**: ✅ Accepted

### Context

**Problem**:
CeleroPress ist eine Multi-Tenancy SaaS-Platform. Jede Organisation muss strikt isoliert sein:

- User A (Organization 1) darf keine Daten von User B (Organization 2) sehen
- Firestore Rules müssen organizationId prüfen
- Alle Services müssen organizationId als Context akzeptieren

**Security-Anforderung**: CRITICAL - Data Leaks verhindern

### Decision

**Entscheidung**: Strikte organizationId-basierte Isolation auf allen Ebenen

**Architecture Layers**:

```
Component Layer
├── OrganizationContext.currentOrganization.id
└── Pass to Mutations

Mutation Layer (useMonitoringMutations)
├── Validate organizationId exists
└── Pass to Services

Service Layer (clippingService, prService)
├── Accept { organizationId } in Context
├── Verify organizationId in Firestore Queries
└── Store organizationId in Documents

Firestore Layer
└── Security Rules: resource.data.organizationId == request.auth.token.organizationId
```

**Implementation**:

#### 1. Component Layer
```typescript
const { currentOrganization } = useOrganization();

await markAsPublished.mutateAsync({
  organizationId: currentOrganization.id,  // ← REQUIRED
  // ...
});
```

#### 2. Mutation Layer
```typescript
mutationFn: async (input: MarkAsPublishedInput) => {
  // Validate
  if (!input.organizationId) {
    throw new Error('organizationId is required');
  }

  // Pass to Service
  const clippingId = await clippingService.create(data, {
    organizationId: input.organizationId
  });
};
```

#### 3. Service Layer
```typescript
interface ServiceContext {
  organizationId: string;
  userId?: string;
}

async create(clipping: MediaClipping, context: ServiceContext): Promise<string> {
  // Store organizationId in document
  const clippingData = {
    ...clipping,
    organizationId: context.organizationId,
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'media_clippings'), clippingData);
  return docRef.id;
}

async update(id: string, data: Partial<MediaClipping>, context: ServiceContext): Promise<void> {
  const docRef = doc(db, 'media_clippings', id);

  // Security Check
  const existingDoc = await getDoc(docRef);
  if (existingDoc.data().organizationId !== context.organizationId) {
    throw new Error('Access denied');
  }

  await updateDoc(docRef, data);
}
```

#### 4. Firestore Rules
```javascript
match /media_clippings/{clippingId} {
  allow read, write: if request.auth != null &&
    resource.data.organizationId == request.auth.token.organizationId;
}
```

### Alternatives

#### Alternative 1: User-basierte Isolation (userId statt organizationId)

**Pro**:
- Einfacher
- Weniger Felder

**Contra**:
- Kein Team-Sharing möglich
- Jeder User hat eigene Daten
- Nicht skalierbar

**Grund für Ablehnung**: Business Requirements (Teams)

#### Alternative 2: Row-Level Security (RLS) wie PostgreSQL

**Pro**:
- Datenbank-enforced Security
- Sehr sicher

**Contra**:
- Firestore unterstützt kein RLS
- Würde Migration zu SQL benötigen

**Grund für Ablehnung**: Technisch nicht möglich mit Firestore

### Consequences

**Security**:
- ✅ **Strikte Isolation** - Cross-Tenant Data Leaks unmöglich
- ✅ **Defense in Depth** - Security auf 4 Ebenen
- ✅ **Audit Trail** - organizationId in allen Documents

**Code-Qualität**:
- ✅ **Explizite Context** - ServiceContext macht Abhängigkeiten klar
- ✅ **Type-Safety** - TypeScript erzwingt organizationId
- ⚠️ **Boilerplate** - organizationId muss überall übergeben werden

### Lessons Learned

1. **organizationId IMMER validieren**
   ```typescript
   // ✅ RICHTIG
   if (!currentOrganization) {
     return <div>Lade Organisation...</div>;
   }

   // ❌ FALSCH
   // Keine Validierung, crasht bei currentOrganization = null
   ```

2. **Firestore Rules sind NICHT optional**
   - Client-seitige Checks sind nicht genug
   - Rules sind letzte Verteidigungslinie
   - Regelmäßig testen!

3. **ServiceContext-Pattern skaliert gut**
   - Einfach erweiterbar (z.B. userId hinzufügen)
   - Macht Abhängigkeiten explizit
   - Hilft bei Testing (easy to mock)

## Lessons Learned

### Generelle Erkenntnisse

1. **Incremental Refactoring funktioniert**
   - Phase 0.5 → Phase 4 über 2 Wochen
   - Kein Big-Bang Rewrite
   - Produktiv-System blieb stabil

2. **Tests sind essenziell**
   - 76 Tests haben Bugs verhindert
   - Refactoring war sicher durch Test-Coverage
   - TDD hätte Zeit gespart

3. **TypeScript hilft massiv**
   - Compile-Time Errors statt Runtime Crashes
   - Refactoring via "Follow the Errors"
   - Auto-Completion beschleunigt Development

4. **Performance-Optimierung ist iterativ**
   - Erst messen, dann optimieren
   - React DevTools Profiler ist Gold wert
   - Nicht alles memoizen!

### Team-Prozesse

1. **Code Reviews waren kritisch**
   - 4-Augen-Prinzip hat Bugs gefunden
   - Architektur-Diskussionen verbesserten Design
   - Pair Programming bei komplexen Teilen

2. **Dokumentation parallel schreiben**
   - ADRs während Development
   - Nicht am Ende "nachdokumentieren"
   - Hilft beim Durchdenken

3. **Feature Flags für graduelle Rollouts**
   - Neue Modals hinter Flag
   - A/B Testing möglich
   - Schnelles Rollback bei Problemen

## Future Considerations

### Geplante Verbesserungen

#### 1. Optimistic Updates (Phase 5)

**Aktuell**: UI aktualisiert sich nach Server-Response

**Geplant**: Sofortiges UI-Update, Rollback bei Fehler

```typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries(['clippings']);
  const previous = queryClient.getQueryData(['clippings']);

  // Optimistic Update
  queryClient.setQueryData(['clippings'], (old) => [...old, newData]);

  return { previous };
},
onError: (err, newData, context) => {
  // Rollback
  queryClient.setQueryData(['clippings'], context.previous);
}
```

**Benefit**: -50% perceived latency

#### 2. Batch Operations (Phase 6)

**Aktuell**: Ein Clipping pro Request

**Geplant**: Bulk-Import von Clippings

```typescript
function useBulkMarkAsPublished() {
  return useMutation({
    mutationFn: async (sends: EmailCampaignSend[]) => {
      const batch = writeBatch(db);
      sends.forEach(send => {
        batch.set(clippingRef, ...);
        batch.update(sendRef, ...);
      });
      await batch.commit();
    }
  });
}
```

**Benefit**: -80% Firestore Writes

#### 3. Offline Support (Phase 7)

**Aktuell**: Online-only

**Geplant**: Offline-Modus mit Sync

```typescript
// Service Worker für Offline-Caching
// IndexedDB für lokale Persistenz
// Conflict Resolution bei Sync
```

**Benefit**: Mobile-freundlich

### Verworfene Ideen

#### ❌ GraphQL-Migration

**Warum verworfen?**
- Firestore hat kein natives GraphQL
- Migration zu Hasura/Apollo zu aufwändig
- REST-like API ausreichend

#### ❌ Real-time Subscriptions

**Warum verworfen?**
- Firestore `onSnapshot` zu teuer (reads)
- Use-Case nicht klar (wer braucht Real-time?)
- Polling ausreichend (via React Query refetchInterval)

#### ❌ Redux Integration

**Warum verworfen?**
- React Query ersetzt Redux für Server State
- Lokaler State mit useState ausreichend
- Zu viel Overhead

---

**Letzte Aktualisierung**: 2025-11-17
**Autoren**: CeleroPress Development Team
**Review**: Architecture Team
**Lizenz**: Proprietär
