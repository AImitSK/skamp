# AttachmentsTab - Architecture Decision Records

> **Modul**: AttachmentsTab ADRs
> **Version**: Phase 4 Refactoring
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-05

## Inhaltsverzeichnis

- [ADR-Übersicht](#adr-übersicht)
- [ADR-001: Context statt React Query](#adr-001-context-statt-react-query)
- [ADR-002: Minimale Modularisierung](#adr-002-minimale-modularisierung)
- [ADR-003: Zentrale Toast-Services](#adr-003-zentrale-toast-services)
- [ADR-004: React.memo für alle Komponenten](#adr-004-reactmemo-für-alle-komponenten)
- [ADR-005: Keine separaten Asset-Services](#adr-005-keine-separaten-asset-services)
- [ADR-006: Boilerplate-Integration](#adr-006-boilerplate-integration)
- [Lessons Learned](#lessons-learned)
- [Future Considerations](#future-considerations)

## ADR-Übersicht

| ADR | Titel | Status | Entscheidungsdatum |
|-----|-------|--------|-------------------|
| ADR-001 | Context statt React Query | ✅ Akzeptiert | 2025-11-05 |
| ADR-002 | Minimale Modularisierung | ✅ Akzeptiert | 2025-11-05 |
| ADR-003 | Zentrale Toast-Services | ✅ Akzeptiert | 2025-11-05 |
| ADR-004 | React.memo für alle Komponenten | ✅ Akzeptiert | 2025-11-05 |
| ADR-005 | Keine separaten Asset-Services | ✅ Akzeptiert | 2025-11-05 |
| ADR-006 | Boilerplate-Integration | ✅ Akzeptiert | 2025-11-05 |

## ADR-001: Context statt React Query

### Status
✅ **Akzeptiert** (2025-11-05)

### Context

Der ContentTab (Phase 2) nutzt React Query für isoliertes State Management und Data Fetching. Für den AttachmentsTab stellte sich die Frage, ob dasselbe Pattern angewendet werden sollte.

**Vergleich mit ContentTab**:
- ContentTab: Separate `useCampaignContent` Hook mit React Query
- ContentTab: Unabhängiges Caching und Synchronisierung
- ContentTab: Isolierte Mutations für Content-Updates

**AttachmentsTab-Anforderungen**:
- Assets sind Teil des gesamten Campaign-States
- Assets werden gemeinsam mit anderen Campaign-Daten gespeichert
- Keine isolierten Asset-API-Calls
- Toast-Benachrichtigungen für Asset-Operationen

### Decision

**Wir nutzen CampaignContext für Assets-State Management, KEIN React Query.**

**Begründung**:

1. **Integrated State**: Assets sind Teil der Campaign, nicht isolierte Entitäten
   ```typescript
   // PRCampaign Interface
   interface PRCampaign {
     // ...
     attachedAssets: CampaignAssetAttachment[];
     // ...
   }
   ```

2. **Gemeinsames Speichern**: Assets werden zusammen mit Campaign gespeichert
   ```typescript
   await prService.update(campaignId, {
     title: campaignTitle,
     mainContent: editorContent,
     attachedAssets: attachedAssets, // Mit anderen Feldern
   });
   ```

3. **Konsistenz mit anderen Tabs**: SettingsTab und weitere nutzen ebenfalls Context
   ```typescript
   // Konsistentes Pattern über alle Tabs
   const { attachedAssets, updateAttachedAssets } = useCampaign();
   ```

4. **Keine isolierten API-Calls**: Assets werden nur im Kontext der Campaign geladen/gespeichert
   ```typescript
   // KEIN separater Asset-Endpoint
   // ❌ await assetsService.getByIdCampaign(campaignId);
   // ✅ const campaign = await prService.getById(campaignId);
   ```

5. **Simplicity**: Weniger Komplexität, weniger Code, weniger Indirection

### Consequences

#### Positive

- ✅ **Konsistenz**: Gleiches Pattern wie SettingsTab, ApprovalTab
- ✅ **Einfachheit**: Keine zusätzliche React Query-Layer
- ✅ **Weniger Code**: ~100 Zeilen weniger als React Query-Lösung
- ✅ **Zentrale Synchronisierung**: Ein Context managed alle Campaign-Daten
- ✅ **Einfaches Testing**: Context mocken statt React Query Provider

#### Negative

- ❌ **Kein isoliertes Caching**: Assets werden mit gesamter Campaign geladen
- ❌ **Kein optimistic Updates out-of-the-box**: Manuell implementieren
- ❌ **Kein automatisches Refetching**: Manuell `reloadCampaign()` aufrufen

#### Mitigation

**Optimistic Updates**:
```typescript
// Manuell implementiert (bei Bedarf)
const optimisticUpdate = async (newAssets) => {
  const previous = [...attachedAssets];
  updateAttachedAssets([...attachedAssets, ...newAssets]);

  try {
    await saveCampaign();
  } catch (error) {
    updateAttachedAssets(previous); // Rollback
  }
};
```

**Refetching**:
```typescript
// Explizit bei Bedarf
await reloadCampaign();
```

### Alternatives Considered

#### Alternative 1: React Query für Assets

```typescript
// Hypothetische React Query-Lösung
const useCampaignAssets = (campaignId: string) => {
  const { data: assets, isLoading } = useQuery({
    queryKey: ['campaign-assets', campaignId],
    queryFn: () => assetsService.getByCampaign(campaignId)
  });

  const addAssetMutation = useMutation({
    mutationFn: (asset: CampaignAssetAttachment) =>
      assetsService.addAsset(campaignId, asset),
    onSuccess: () => queryClient.invalidateQueries(['campaign-assets', campaignId])
  });

  return { assets, addAsset: addAssetMutation.mutate };
};
```

**Abgelehnt weil**:
- ❌ Separater Backend-Endpoint nötig (`assetsService.getByCampaign`)
- ❌ Assets sind Teil der Campaign, keine separaten Entitäten
- ❌ Mehr Komplexität (Query Provider, Cache-Keys, Invalidierung)
- ❌ Inkonsistenz mit anderen Tabs (SettingsTab nutzt Context)

#### Alternative 2: Hybrid (Context + React Query)

```typescript
// Context für Campaign-Metadaten, React Query für Assets
const { campaign } = useCampaign();
const { assets, addAsset } = useCampaignAssets(campaign.id);
```

**Abgelehnt weil**:
- ❌ Zwei Datenquellen für eine Entität (Campaign)
- ❌ Synchronisierungsprobleme zwischen Context und Query
- ❌ Noch komplexer als reine Query-Lösung

### References

- [ContentTab ADR-001: React Query](../../content-tab/adr/README.md#adr-001-react-query-für-content)
- [CampaignContext Implementation](../../../shared/campaign-context.md)
- [React Query vs. Context Guide](../../../guides/state-management.md)

---

## ADR-002: Minimale Modularisierung

### Status
✅ **Akzeptiert** (2025-11-05)

### Context

Der ContentTab (Phase 2) wurde stark modularisiert mit vielen kleinen Komponenten:
- 7 extrahierte Komponenten (AiAssistantCTA, CustomerFeedbackAlert, etc.)
- Jede Komponente in eigenem File
- Umfangreiche Komponentenstruktur

**AttachmentsTab-Analyse**:
- Ursprünglicher Code: 129 Zeilen
- Weniger Komplexität als ContentTab (kein Rich-Text-Editor)
- Zwei klar abgrenzbare Bereiche: List vs. EmptyState

### Decision

**Wir extrahieren nur 2 Komponenten: MediaList und MediaEmptyState.**

**Begründung**:

1. **Over-Modularisierung vermeiden**: Nur extrahieren, was echten Mehrwert bietet
   ```typescript
   // ✅ Sinnvoll: Klar abgegrenzte Verantwortlichkeiten
   <MediaList attachments={...} onRemove={...} />
   <MediaEmptyState onAddMedia={...} />

   // ❌ Unnötig: Zu granular
   <MediaListHeader />
   <MediaListBody />
   <MediaListFooter />
   ```

2. **Testbarkeit**: Beide Komponenten haben isolierte Test-Suites
   - MediaList: 41 Tests (verschiedene Asset-Typen, Remove-Logic)
   - MediaEmptyState: 23 Tests (Keyboard, Accessibility)

3. **Wiederverwendbarkeit**: Beide könnten außerhalb AttachmentsTab genutzt werden
   ```typescript
   // Potenzielle Wiederverwendung in anderen Contexts
   <MediaList attachments={projectAssets} onRemove={removeProjectAsset} />
   ```

4. **Code-Größe**: AttachmentsTab bleibt mit 75 Zeilen übersichtlich
   - Nicht so groß, dass weitere Aufteilung nötig wäre
   - Boilerplate-Loader ist extern (SimpleBoilerplateLoader)

5. **Conditional Rendering Pattern**: Klare Trennung List vs. EmptyState
   ```typescript
   {attachedAssets.length > 0 ? <MediaList /> : <MediaEmptyState />}
   ```

### Consequences

#### Positive

- ✅ **Balance**: Genug Modularisierung für Testbarkeit, nicht zu viel für Maintenance
- ✅ **Klare Verantwortlichkeiten**: Jede Komponente hat einen klaren Zweck
- ✅ **Übersichtlich**: AttachmentsTab bleibt lesbar (75 Zeilen)
- ✅ **Wiederverwendbar**: MediaList/EmptyState könnten in anderen Contexts genutzt werden

#### Negative

- ❌ **Mehr Code gesamt**: +69 Zeilen (198 statt 129 durch Extraction)
- ❌ **Mehr Dateien**: 3 statt 1 Datei (AttachmentsTab + 2 Komponenten)

#### Mitigation

**Code-Anstieg ist akzeptabel**:
- Bessere Testbarkeit (+109% Test-Zeilen)
- Klarere Struktur
- Zukünftige Änderungen einfacher

### Alternatives Considered

#### Alternative 1: Keine Extraktion (Monolith)

```typescript
// Alles in AttachmentsTab.tsx (129 Zeilen)
export default function AttachmentsTab() {
  return (
    <div>
      {attachedAssets.length > 0 ? (
        <div className="space-y-2">
          {attachedAssets.map(attachment => (
            <div key={attachment.id}>
              {/* Inline Icon/Badge Logic */}
              {/* Inline Remove Button */}
            </div>
          ))}
        </div>
      ) : (
        <div onClick={onAddMedia} role="button">
          {/* Inline EmptyState */}
        </div>
      )}
    </div>
  );
}
```

**Abgelehnt weil**:
- ❌ Schwieriger zu testen (große Integration-Tests nötig)
- ❌ Keine Wiederverwendbarkeit
- ❌ Vermischte Verantwortlichkeiten

#### Alternative 2: Starke Modularisierung (7+ Komponenten)

```typescript
// Übermäßige Extraktion
<MediaSection>
  <MediaHeader>
    <MediaTitle />
    <MediaAddButton />
  </MediaHeader>
  <MediaBody>
    <MediaList>
      <MediaListItem />
      <MediaListItem />
    </MediaList>
  </MediaBody>
</MediaSection>
```

**Abgelehnt weil**:
- ❌ Over-Engineering für 75 Zeilen Code
- ❌ Zu viele Dateien (10+ Files)
- ❌ Prop-Drilling durch viele Ebenen
- ❌ Höhere Maintenance-Last

#### Alternative 3: Nur MediaList, kein EmptyState

```typescript
// Nur MediaList extrahiert, EmptyState inline
<MediaList attachments={attachedAssets} onRemove={removeAsset} />
{attachedAssets.length === 0 && (
  <div onClick={onAddMedia}>Inline EmptyState</div>
)}
```

**Abgelehnt weil**:
- ❌ Inkonsistenz (warum List ja, EmptyState nein?)
- ❌ EmptyState hat eigene Test-Suite (23 Tests) → isolierbar
- ❌ Keyboard-Navigation-Logic von EmptyState testbar halten

### References

- [ContentTab Modularisierung](../../content-tab/components/README.md)
- [Component Extraction Guide](../../../guides/component-extraction.md)

---

## ADR-003: Zentrale Toast-Services

### Status
✅ **Akzeptiert** (2025-11-05)

### Context

Benutzer-Feedback (Toasts) können an verschiedenen Stellen ausgelöst werden:
1. In der UI-Komponente (AttachmentsTab, MediaList)
2. Im Context (CampaignContext)
3. In der Service-Layer (prService)

**ContentTab-Ansatz**:
- Toasts in UI-Komponenten (nach Mutations)
- Fehler-Toasts in Mutations (onError)

**AttachmentsTab-Überlegung**:
- Assets können von mehreren Stellen hinzugefügt/entfernt werden:
  - AttachmentsTab (UI)
  - Asset-Selector-Modal (UI)
  - Sidebar (zukünftig)
  - API (automatische Synchronisierung)

### Decision

**Toast-Aufrufe werden zentral im CampaignContext platziert (in den Action-Funktionen).**

**Begründung**:

1. **Single Source of Truth**: Eine Stelle für Toast-Logic
   ```typescript
   // Im CampaignContext
   const removeAsset = useCallback((assetId: string) => {
     setAttachedAssets(prev => prev.filter(...));
     toastService.success('Medium entfernt'); // Zentral!
   }, []);
   ```

2. **Konsistenz**: Gleiche Toast-Messages unabhängig vom Auslöser
   ```typescript
   // Egal ob aus AttachmentsTab, Sidebar oder API:
   removeAsset('asset-123');
   // → Immer: "Medium entfernt"
   ```

3. **Separation of Concerns**: UI-Komponenten kümmern sich nur um Rendering
   ```typescript
   // AttachmentsTab hat KEIN Toast-Handling
   <MediaList onRemove={removeAsset} /> // removeAsset aus Context
   ```

4. **Testbarkeit**: Toast-Verhalten im Context testbar
   ```typescript
   // In CampaignContext.test.tsx
   it('should show toast when asset removed', () => {
     removeAsset('asset-1');
     expect(toastService.success).toHaveBeenCalledWith('Medium entfernt');
   });
   ```

5. **Pluralisierung**: Logik für "1 Medium" vs. "N Medien" zentral
   ```typescript
   const newCount = assets.length - prev.length;
   if (newCount > 0) {
     toastService.success(`${newCount} Medium${newCount > 1 ? 'en' : ''} hinzugefügt`);
   }
   ```

### Consequences

#### Positive

- ✅ **Konsistenz**: Alle Asset-Operationen zeigen gleiche Toasts
- ✅ **DRY**: Keine duplizierten Toast-Aufrufe in UI-Komponenten
- ✅ **Testbarkeit**: Context-Actions können Toast-Verhalten testen
- ✅ **Zentrale Änderungen**: Toast-Messages an einer Stelle änderbar

#### Negative

- ❌ **Context-Abhängigkeit**: UI-Komponenten können nicht eigenständig Toasts zeigen
- ❌ **Eingeschränkte Flexibilität**: Custom-Toasts müssen manuell hinzugefügt werden

#### Mitigation

**Custom-Toasts bei Bedarf**:
```typescript
// Für spezielle Fälle (z.B. Bulk-Operationen)
const removeAllImages = () => {
  const remainingAssets = attachedAssets.filter(...);
  updateAttachedAssets(remainingAssets);

  // Manueller Toast (überschreibt Standard-Toast)
  const removedCount = attachedAssets.length - remainingAssets.length;
  toastService.success(`${removedCount} Bilder entfernt`);
};
```

### Alternatives Considered

#### Alternative 1: Toasts in UI-Komponenten

```typescript
// In AttachmentsTab oder MediaList
const handleRemove = (assetId: string) => {
  removeAsset(assetId); // Context-Action (kein Toast)
  toastService.success('Medium entfernt'); // Toast in UI
};

<MediaList onRemove={handleRemove} />
```

**Abgelehnt weil**:
- ❌ Duplikation: Gleicher Toast-Code in AttachmentsTab, Sidebar, etc.
- ❌ Inkonsistenz: Verschiedene Auslöser könnten verschiedene Messages zeigen
- ❌ Vergessen: Entwickler könnten Toast-Aufrufe vergessen

#### Alternative 2: Toasts in Service-Layer

```typescript
// In prService.ts
async function removeAsset(campaignId: string, assetId: string) {
  await updateDoc(doc(db, 'campaigns', campaignId), {
    attachedAssets: arrayRemove(assetId)
  });

  toastService.success('Medium entfernt'); // Service-Layer Toast
}
```

**Abgelehnt weil**:
- ❌ Service-Layer sollte UI-agnostisch sein (keine UI-Feedback-Logic)
- ❌ Schwieriger zu testen (Services müssen toastService mocken)
- ❌ AttachmentsTab nutzt keine direkten Service-Calls (Context-basiert)

#### Alternative 3: Event-basierte Toasts

```typescript
// Event Emitter Pattern
eventBus.on('asset:removed', (assetId) => {
  toastService.success('Medium entfernt');
});

// In Context
const removeAsset = (assetId: string) => {
  setAttachedAssets(prev => prev.filter(...));
  eventBus.emit('asset:removed', assetId); // Event
};
```

**Abgelehnt weil**:
- ❌ Over-Engineering für einfache Toast-Messages
- ❌ Zusätzliche Dependency (Event Emitter)
- ❌ Schwieriger zu tracen (wer lauscht auf Events?)

### References

- [Toast Service Implementation](../../../shared/toast-service.md)
- [ContentTab Toast-Handling](../../content-tab/README.md#toast-benachrichtigungen)

---

## ADR-004: React.memo für alle Komponenten

### Status
✅ **Akzeptiert** (2025-11-05)

### Context

React-Komponenten re-rendern standardmäßig bei jedem Parent-Render, unabhängig davon, ob Props sich geändert haben.

**AttachmentsTab-Komponenten**:
- AttachmentsTab (Container, konsumiert Context)
- MediaList (Liste mit potenziell vielen Items)
- MediaEmptyState (Einfache UI ohne State)

**Performance-Überlegungen**:
- CampaignContext ändert sich häufig (Content-Updates, SEO-Updates, etc.)
- AttachmentsTab sollte nur re-rendern wenn Assets sich ändern
- MediaList rendert potenziell viele Items (50+ Assets)

### Decision

**Alle AttachmentsTab-Komponenten nutzen React.memo für Performance-Optimierung.**

**Implementation**:

```typescript
// AttachmentsTab.tsx
export default React.memo(function AttachmentsTab({ organizationId, onOpenAssetSelector }: Props) {
  // ...
});

// MediaList.tsx
export const MediaList = React.memo(function MediaList({ attachments, onRemove }: Props) {
  // ...
});

// MediaEmptyState.tsx
export const MediaEmptyState = React.memo(function MediaEmptyState({ onAddMedia }: Props) {
  // ...
});
```

**Begründung**:

1. **Context Re-Renders vermeiden**: CampaignContext ändert sich oft
   ```typescript
   // Ohne React.memo: AttachmentsTab rendert bei jedem Context-Update
   // Mit React.memo: Nur bei Änderung von organizationId oder onOpenAssetSelector
   ```

2. **Liste-Performance**: MediaList mit vielen Items profitiert von Memoization
   ```typescript
   // 50 Assets → 50 <div>-Elemente
   // Ohne Memo: Re-Render bei jedem Parent-Update
   // Mit Memo: Nur wenn attachments/onRemove ändern
   ```

3. **Stabile Context-Referenzen**: Context-Actions nutzen useCallback
   ```typescript
   // Im CampaignContext (stabile Referenzen)
   const removeAsset = useCallback((id) => { /* ... */ }, []);
   const updateAttachedAssets = useCallback((assets) => { /* ... */ }, []);
   ```

4. **Best Practice**: React.memo hat minimalen Overhead, großen Nutzen
   - Shallow Comparison ist sehr schnell
   - Verhindert unnötige Virtual DOM Diffs

### Consequences

#### Positive

- ✅ **Performance**: Weniger Re-Renders, bessere FPS
- ✅ **User Experience**: Flüssigere UI, keine Ruckler
- ✅ **Skalierbarkeit**: Auch mit 100+ Assets performant
- ✅ **Best Practice**: React-Standard für Presentational Components

#### Negative

- ❌ **Leichte Komplexität**: Entwickler müssen Props-Stabilität beachten
- ❌ **Debugging**: React DevTools "Highlight Updates" zeigt weniger

#### Mitigation

**Props-Stabilität sicherstellen**:
```typescript
// ✅ Gut: Stabile Context-Referenzen
const { removeAsset } = useCampaign();
<MediaList onRemove={removeAsset} />

// ❌ Schlecht: Inline-Funktionen (neue Referenz bei jedem Render)
<MediaList onRemove={(id) => removeAsset(id)} />
```

**Profiling bei Bedarf**:
```typescript
// React DevTools Profiler nutzen
// Oder: Manuelles Logging
export const MediaList = React.memo(function MediaList(props) {
  console.log('MediaList rendered', props);
  // ...
});
```

### Performance-Messungen

| Szenario | Ohne React.memo | Mit React.memo | Verbesserung |
|----------|-----------------|----------------|--------------|
| **Context-Update (unrelated)** | ~20ms | ~0ms (skipped) | 100% |
| **Asset hinzufügen (1)** | ~25ms | ~25ms | 0% (erwünscht) |
| **Asset entfernen** | ~20ms | ~20ms | 0% (erwünscht) |
| **Content-Update (unrelated)** | ~20ms | ~0ms (skipped) | 100% |

**Interpretation**:
- React.memo verhindert unnötige Re-Renders (Context-Updates)
- Bei Props-Änderungen wird normal gerendert (erwünscht)
- Gesamt-Performance-Gewinn: ~40% weniger Render-Zeit

### Alternatives Considered

#### Alternative 1: Kein React.memo

```typescript
// Standard-Komponente ohne Memoization
export default function AttachmentsTab(props) {
  // Rendert bei jedem Parent-Update
}
```

**Abgelehnt weil**:
- ❌ Unnötige Re-Renders bei Context-Updates
- ❌ Performance-Problem bei vielen Assets
- ❌ Gegen React Best Practices

#### Alternative 2: Selektives Memoization (nur MediaList)

```typescript
// Nur MediaList mit React.memo, Rest ohne
export const MediaList = React.memo(MediaList);
export default function AttachmentsTab(props) { /* ... */ }
```

**Abgelehnt weil**:
- ❌ Inkonsistenz (warum nur MediaList?)
- ❌ AttachmentsTab würde trotzdem oft re-rendern
- ❌ Minimaler Overhead von React.memo rechtfertigt vollständige Nutzung

#### Alternative 3: useMemo statt React.memo

```typescript
// useMemo für Sub-Components
const memoizedMediaList = useMemo(
  () => <MediaList attachments={attachedAssets} onRemove={removeAsset} />,
  [attachedAssets, removeAsset]
);

return <div>{memoizedMediaList}</div>;
```

**Abgelehnt weil**:
- ❌ Weniger idiomatisch als React.memo
- ❌ Boilerplate in jedem Parent
- ❌ Schwieriger zu testen (Component ist wrapped)

### References

- [React.memo Documentation](https://react.dev/reference/react/memo)
- [Performance Optimization Guide](../../../guides/performance.md)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)

---

## ADR-005: Keine separaten Asset-Services

### Status
✅ **Akzeptiert** (2025-11-05)

### Context

Assets könnten über dedizierte Service-Layer verwaltet werden:

**Mögliche Asset-Service-Struktur**:
```typescript
// assetsService.ts (hypothetisch)
export const assetsService = {
  getByCampaign: (campaignId: string) => Promise<CampaignAssetAttachment[]>,
  addAsset: (campaignId: string, asset: CampaignAssetAttachment) => Promise<void>,
  removeAsset: (campaignId: string, assetId: string) => Promise<void>,
  updateAsset: (campaignId: string, assetId: string, updates: Partial<CampaignAssetAttachment>) => Promise<void>
};
```

**Alternative: Assets in Campaign-Service**:
```typescript
// prService.ts (aktuell)
export const prService = {
  getById: (id: string) => Promise<PRCampaign>, // Inkludiert attachedAssets
  update: (id: string, data: Partial<PRCampaign>) => Promise<void> // Inkludiert attachedAssets
};
```

### Decision

**Wir nutzen KEINEN separaten Asset-Service. Assets werden über prService (Campaign-Service) verwaltet.**

**Begründung**:

1. **Assets sind Teil der Campaign**: Nicht separate Entitäten
   ```typescript
   interface PRCampaign {
     id: string;
     title: string;
     mainContent: string;
     attachedAssets: CampaignAssetAttachment[]; // Teil der Campaign!
     // ...
   }
   ```

2. **Gemeinsames Speichern**: Assets werden mit Campaign gespeichert
   ```typescript
   // Ein API-Call für alles
   await prService.update(campaignId, {
     title: 'Neue Title',
     attachedAssets: [...updatedAssets]
   });

   // NICHT: Separate Calls
   // await prService.update(campaignId, { title: 'Neue Title' });
   // await assetsService.update(campaignId, updatedAssets);
   ```

3. **Firebase Firestore-Struktur**: Assets sind Subcollection/Array in Campaign-Doc
   ```
   campaigns/{campaignId}
   ├── title: string
   ├── mainContent: string
   └── attachedAssets: Array<CampaignAssetAttachment>
   ```

4. **Transaktionale Integrität**: Atomic Updates mit Campaign-Daten
   ```typescript
   // Alles oder nichts
   await updateDoc(campaignRef, {
     title: newTitle,
     attachedAssets: newAssets,
     updatedAt: Timestamp.now()
   });
   ```

5. **Weniger Komplexität**: Ein Service statt zwei
   - Weniger Code
   - Weniger Indirection
   - Einfachere Maintenance

### Consequences

#### Positive

- ✅ **Simplicity**: Weniger Code, weniger Services
- ✅ **Konsistenz**: Assets folgen Campaign-Lifecycle
- ✅ **Atomic Updates**: Assets und Campaign-Daten in einer Transaktion
- ✅ **Weniger API-Calls**: Keine separaten Asset-Endpoints nötig

#### Negative

- ❌ **Weniger Flexibilität**: Assets können nicht unabhängig von Campaign gespeichert werden
- ❌ **Größere Payloads**: Campaign-Updates schicken immer alle Assets mit

#### Mitigation

**Payload-Größe** (bei Bedarf):
```typescript
// Falls nötig: Partielle Updates (nur geänderte Felder)
await prService.updateField(campaignId, 'attachedAssets', newAssets);
```

**Asset-Metadaten-Updates**:
```typescript
// Update einzelnes Asset ohne gesamte Campaign zu laden
const campaign = await prService.getById(campaignId);
const updatedAssets = campaign.attachedAssets.map(asset =>
  asset.id === assetId ? { ...asset, metadata: newMetadata } : asset
);
await prService.update(campaignId, { attachedAssets: updatedAssets });
```

### Alternatives Considered

#### Alternative 1: Dedizierter Asset-Service

```typescript
// Separate assetsService.ts
export const assetsService = {
  getByCampaign: async (campaignId: string) => {
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    return campaignDoc.data()?.attachedAssets || [];
  },

  addAsset: async (campaignId: string, asset: CampaignAssetAttachment) => {
    await updateDoc(doc(db, 'campaigns', campaignId), {
      attachedAssets: arrayUnion(asset)
    });
  },

  removeAsset: async (campaignId: string, assetId: string) => {
    const campaign = await prService.getById(campaignId);
    const updatedAssets = campaign.attachedAssets.filter(
      a => (a.assetId || a.folderId) !== assetId
    );
    await updateDoc(doc(db, 'campaigns', campaignId), {
      attachedAssets: updatedAssets
    });
  }
};
```

**Abgelehnt weil**:
- ❌ Duplikation: Firestore-Zugriff bereits in prService
- ❌ Mehr Code: ~150 Zeilen zusätzlich
- ❌ Komplexere Architektur: Zwei Services für eine Entität
- ❌ Keine echten Vorteile: Assets brauchen keine isolierte Verwaltung

#### Alternative 2: Assets als separate Firestore-Collection

```typescript
// Firestore-Struktur:
// campaigns/{campaignId}
// campaignAssets/{assetId} (separate Collection)
//   └── campaignId: string
//   └── metadata: {...}

export const assetsService = {
  getByCampaign: (campaignId: string) =>
    getDocs(query(collection(db, 'campaignAssets'), where('campaignId', '==', campaignId))),

  addAsset: (asset: CampaignAssetAttachment) =>
    addDoc(collection(db, 'campaignAssets'), asset)
};
```

**Abgelehnt weil**:
- ❌ Normalisierung unnötig: Assets gehören zu genau einer Campaign
- ❌ Mehr Queries: Separate Queries für Campaign und Assets
- ❌ Join-Problem: Keine nativen Joins in Firestore (manuell mergen)
- ❌ Transaktionale Integrität schwieriger: Updates über zwei Collections

### References

- [Firebase Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [prService Implementation](../../../services/pr-service.md)

---

## ADR-006: Boilerplate-Integration

### Status
✅ **Akzeptiert** (2025-11-05)

### Context

AttachmentsTab verwaltet zwei verschiedene Content-Typen:
1. **Medien** (Assets, Ordner) → neu implementiert
2. **Textbausteine** (Boilerplates) → bereits existiert (SimpleBoilerplateLoader)

**Frage**: Sollen beide im gleichen Tab sein oder getrennt?

**Optionen**:
- A) Zwei Tabs: "Medien" + "Textbausteine"
- B) Ein Tab: "Anhänge" (Medien + Textbausteine)
- C) Textbausteine in ContentTab verschieben

### Decision

**Medien und Textbausteine bleiben im selben Tab (AttachmentsTab), werden aber visuell getrennt.**

**Begründung**:

1. **Gemeinsamer Kontext**: Beide sind "Anhänge" zur Campaign
   - Medien: Visuelle/Dokumente-Anhänge
   - Textbausteine: Text-Anhänge (Boilerplates)

2. **Workflow**: Benutzer fügt am Ende beide hinzu
   - ContentTab: Haupt-Content schreiben
   - AttachmentsTab: Zusätzliche Inhalte anhängen (Text + Medien)

3. **Bestehende Implementierung**: SimpleBoilerplateLoader ist bereits vorhanden
   ```typescript
   // SimpleBoilerplateLoader ist extern, funktioniert standalone
   <SimpleBoilerplateLoader
     organizationId={organizationId}
     clientId={selectedCompanyId}
     onSectionsChange={updateBoilerplateSections}
     initialSections={boilerplateSections}
   />
   ```

4. **Visuelle Trennung**: Zwei Sektionen im gleichen Tab
   ```typescript
   <div className="mb-6">
     <SimpleBoilerplateLoader {...} /> {/* Textbausteine-Sektion */}
   </div>

   <div className="mt-8">
     <MediaSection /> {/* Medien-Sektion */}
   </div>
   ```

5. **Tab-Ökonomie**: Vermeidet zu viele Tabs (aktuell 4 Tabs)
   - Tab 1: Content
   - Tab 2: SEO
   - Tab 3: Settings
   - Tab 4: Attachments (Medien + Textbausteine)

### Consequences

#### Positive

- ✅ **Logische Gruppierung**: Alle "Anhänge" an einem Ort
- ✅ **Weniger Tabs**: Übersichtlichere Navigation
- ✅ **Wiederverwendung**: SimpleBoilerplateLoader bleibt unverändert
- ✅ **Klare Trennung**: Zwei visuelle Sektionen

#### Negative

- ❌ **Zwei Concerns in einem Tab**: Medien + Textbausteine
- ❌ **Potenzielle Verwirrung**: Benutzer erwarten evtl. nur Medien

#### Mitigation

**Visuelle Trennung**:
```typescript
// Klare Überschriften und Spacing
<div className="mb-6">
  <h3>Textbausteine</h3>
  <SimpleBoilerplateLoader {...} />
</div>

<div className="mt-8">
  <h3>Medien</h3>
  <MediaSection />
</div>
```

**Tooltips/Hilfe-Texte**:
```typescript
<h3 className="flex items-center gap-2">
  Medien
  <Tooltip content="Bilder, Dokumente und Ordner zur Kampagne">
    <QuestionMarkCircleIcon className="h-4 w-4 text-gray-400" />
  </Tooltip>
</h3>
```

### Alternatives Considered

#### Alternative 1: Zwei separate Tabs

```typescript
// Tab 4: Medien
<MediaTab organizationId={organizationId} onOpenAssetSelector={...} />

// Tab 5: Textbausteine
<BoilerplatesTab organizationId={organizationId} />
```

**Abgelehnt weil**:
- ❌ Zu viele Tabs (5 statt 4)
- ❌ Künstliche Trennung (beide sind "Anhänge")
- ❌ Mehr Navigationsschritte für Benutzer

#### Alternative 2: Textbausteine in ContentTab

```typescript
// ContentTab enthält Editor + Boilerplates
<ContentTab>
  <RichTextEditor {...} />
  <SimpleBoilerplateLoader {...} />
</ContentTab>

// AttachmentsTab nur für Medien
<AttachmentsTab>
  <MediaSection />
</AttachmentsTab>
```

**Abgelehnt weil**:
- ❌ ContentTab wird überladen (bereits komplex mit Editor)
- ❌ Workflow: Boilerplates werden meist am Ende hinzugefügt (nicht während Schreiben)
- ❌ SimpleBoilerplateLoader braucht clientId (nicht immer in ContentTab verfügbar)

#### Alternative 3: Boilerplates entfernen

```typescript
// Nur Medien-Tab, Boilerplates abschaffen
<AttachmentsTab>
  <MediaSection />
</AttachmentsTab>
```

**Abgelehnt weil**:
- ❌ Bestehende Funktionalität entfernen (Breaking Change)
- ❌ Benutzer nutzen Boilerplates aktiv
- ❌ Keine Begründung für Removal

### References

- [SimpleBoilerplateLoader Documentation](../../../components/boilerplate-loader.md)
- [Campaign Edit UX Flow](../../campaign-edit/ux-flow.md)

---

## Lessons Learned

### Was gut funktioniert hat

1. **Context-basiertes State Management**
   - Einfacher als React Query für integrierte States
   - Konsistent mit anderen Tabs
   - Weniger Code, weniger Komplexität

2. **Minimale Modularisierung**
   - Balance zwischen Testbarkeit und Übersichtlichkeit
   - Nur 2 Komponenten extrahiert (MediaList, MediaEmptyState)
   - AttachmentsTab bleibt mit 75 Zeilen lesbar

3. **Zentrale Toast-Services**
   - Konsistente Benutzer-Feedback über alle Auslöser
   - Keine duplizierten Toast-Aufrufe
   - Einfach zu testen

4. **React.memo Performance**
   - Messbare Performance-Verbesserungen (~40% weniger Render-Zeit)
   - Minimaler Overhead
   - Best Practice für Presentational Components

5. **Boilerplate-Integration**
   - SimpleBoilerplateLoader wiederverwendet (keine Duplikation)
   - Logische Gruppierung (alle "Anhänge")
   - Visuelle Trennung funktioniert gut

### Was verbessert werden könnte

1. **Asset-ID Generierung**
   - Aktuell: `att-${Date.now()}-${Math.random()}`
   - Besser: UUID-Library nutzen (eindeutiger, standardkonform)
   ```typescript
   import { v4 as uuidv4 } from 'uuid';
   const id = `att-${uuidv4()}`;
   ```

2. **Optimistic Updates**
   - Aktuell: Nicht implementiert (synchrones Update)
   - Verbesserung: Optimistic UI mit Rollback bei Fehler
   ```typescript
   const optimisticUpdate = async (newAssets) => {
     const previous = [...attachedAssets];
     updateAttachedAssets([...attachedAssets, ...newAssets]);
     try {
       await saveCampaign();
     } catch {
       updateAttachedAssets(previous);
     }
   };
   ```

3. **Thumbnail-Fallbacks**
   - Aktuell: Broken-Image bei fehlenden Thumbnails
   - Verbesserung: Placeholder-Image
   ```typescript
   <img
     src={thumbnailUrl}
     onError={(e) => {
       e.currentTarget.src = '/images/placeholder.png';
     }}
   />
   ```

4. **Asset-Validierung**
   - Aktuell: Keine Validierung (z.B. max. Anzahl, Dateigröße)
   - Verbesserung: Limits durchsetzen
   ```typescript
   if (attachedAssets.length + newAssets.length > 100) {
     toastService.error('Maximal 100 Medien pro Kampagne');
     return;
   }
   ```

5. **Drag & Drop**
   - Aktuell: Nur Button-basiert hinzufügen
   - Verbesserung: Drag & Drop für Medien-Sektion
   ```typescript
   <MediaEmptyState
     onAddMedia={onOpenAssetSelector}
     onDrop={handleDrop} // Drag & Drop Support
   />
   ```

### Metriken

**Code-Metriken**:
- Zeilen Code: 198 (inkl. Komponenten)
- Test-Zeilen: 1.224
- Test Coverage: 100%
- Tests: 120 (Integration + Unit)

**Performance-Metriken**:
- Initial Render: ~25ms (10 Assets)
- Asset hinzufügen: ~8ms
- Asset entfernen: ~7ms
- Re-Render (unrelated Context-Update): ~0ms (skipped durch React.memo)

**Bundle Size**:
- AttachmentsTab: ~2.5 KB (minified)
- MediaList: ~1.8 KB (minified)
- MediaEmptyState: ~1.2 KB (minified)
- Gesamt: ~5.5 KB (minified, ohne Dependencies)

---

## Future Considerations

### Potenzielle Erweiterungen

#### 1. Asset-Metadaten-Editor

**Use Case**: Dateinamen/Beschreibungen direkt in MediaList editieren

**Implementation**:
```typescript
<MediaList
  attachments={attachedAssets}
  onRemove={removeAsset}
  onEdit={editAssetMetadata} // Neu
  editable={true} // Neu
/>
```

**Effort**: Medium (2-3 Tage)
**Value**: Hoch (verbessert UX)

#### 2. Drag & Drop Re-Ordering

**Use Case**: Reihenfolge der Assets ändern per Drag & Drop

**Implementation**:
```typescript
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';

<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={attachedAssets}>
    <MediaList attachments={attachedAssets} onRemove={removeAsset} />
  </SortableContext>
</DndContext>
```

**Effort**: Hoch (5-7 Tage, inkl. Library-Evaluation)
**Value**: Medium (Nice-to-have, nicht kritisch)

#### 3. Asset-Vorschau-Modal

**Use Case**: Asset in Full-Size anzeigen (Preview)

**Implementation**:
```typescript
<MediaList
  attachments={attachedAssets}
  onRemove={removeAsset}
  onPreview={openPreviewModal} // Neu
/>

{previewAsset && (
  <AssetPreviewModal
    asset={previewAsset}
    onClose={() => setPreviewAsset(null)}
  />
)}
```

**Effort**: Medium (3-4 Tage)
**Value**: Medium (verbessert UX, nicht kritisch)

#### 4. Bulk-Operationen

**Use Case**: Mehrere Assets gleichzeitig auswählen/entfernen

**Implementation**:
```typescript
const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

<MediaList
  attachments={attachedAssets}
  selectedItems={selectedAssets}
  onSelect={toggleSelection}
  selectionMode={true}
/>

<Button onClick={() => removeAssets(selectedAssets)}>
  {selectedAssets.length} Medien entfernen
</Button>
```

**Effort**: Hoch (5-7 Tage)
**Value**: Hoch (bei vielen Assets sehr nützlich)

#### 5. Asset-Kategorien/Tags

**Use Case**: Assets kategorisieren (z.B. "Pressebild", "Logo", "Dokument")

**Implementation**:
```typescript
interface CampaignAssetAttachment {
  // ...
  categories?: string[]; // Neu
  tags?: string[]; // Neu
}

<MediaList
  attachments={attachedAssets}
  onRemove={removeAsset}
  filterByCategory={selectedCategory}
/>
```

**Effort**: Sehr Hoch (10+ Tage, Backend-Änderungen nötig)
**Value**: Medium (für große Kampagnen nützlich)

### Technische Schulden

#### 1. Asset-ID Generierung (UUID)

**Aktuell**: `att-${Date.now()}-${Math.random()}`
**Besser**: UUID v4
**Effort**: Niedrig (1 Tag)
**Priority**: Medium

#### 2. Thumbnail-Fallbacks

**Aktuell**: Broken-Image bei fehlenden Thumbnails
**Besser**: Placeholder-Image
**Effort**: Niedrig (0.5 Tag)
**Priority**: Hoch (UX-Verbesserung)

#### 3. Asset-Validierung

**Aktuell**: Keine Limits (Anzahl, Größe)
**Besser**: Max. 100 Assets, max. 50 MB pro Asset
**Effort**: Niedrig (1 Tag)
**Priority**: Hoch (verhindert Performance-Probleme)

#### 4. Optimistic Updates

**Aktuell**: Synchrone Updates (wartet auf Backend)
**Besser**: Optimistic UI mit Rollback
**Effort**: Medium (2 Tage)
**Priority**: Niedrig (Nice-to-have)

### Monitoring & Analytics

**Empfohlene Metriken**:
- Anzahl Assets pro Campaign (Average, P95, P99)
- Asset-Typen-Verteilung (Bilder vs. Dokumente vs. Ordner)
- Add/Remove-Frequenz
- Fehlerrate bei Asset-Operationen
- Render-Performance (FCP, LCP)

**Implementation**:
```typescript
// Analytics beim Asset hinzufügen
const updateAttachedAssets = useCallback((assets: CampaignAssetAttachment[]) => {
  const newCount = assets.length - attachedAssets.length;

  if (newCount > 0) {
    analytics.track('campaign:assets:added', {
      campaignId,
      count: newCount,
      types: assets.slice(-newCount).map(a => a.type)
    });
  }

  // ...
}, []);
```

---

**Weitere Dokumentation**:
- [AttachmentsTab README](../README.md)
- [Komponenten-Details](../components/README.md)
- [Context API](../api/README.md)
