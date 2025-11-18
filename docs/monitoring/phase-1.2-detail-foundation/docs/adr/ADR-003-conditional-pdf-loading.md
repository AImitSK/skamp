# ADR-003: Conditional PDF Loading

> **Status**: ✅ Accepted
> **Datum**: 17. November 2025
> **Autoren**: CeleroPress Team
> **Kontext**: Phase 1.2 - Monitoring Detail Foundation

---

## Kontext

### Problem

Die Monitoring Detail Page hat 5 Tabs:
1. Analytics (Dashboard) - zeigt PDF-Liste
2. E-Mail Performance - zeigt keine PDFs
3. Empfänger & Veröffentlichungen - zeigt keine PDFs
4. Clipping-Archiv - zeigt keine PDFs
5. Auto-Funde - zeigt keine PDFs

**Vorher: Immer alle PDFs laden**

```typescript
export default function MonitoringDetailPage() {
  const [analysisPDFs, setAnalysisPDFs] = useState<any[]>([]);

  useEffect(() => {
    loadAnalysisPDFs(); // Lädt IMMER, egal welcher Tab
  }, [campaign?.projectId]);

  const loadAnalysisPDFs = async () => {
    try {
      // 1. Lade Projekt-Folder-Struktur (Firestore Read)
      const folderStructure = await projectService.getProjectFolderStructure(
        campaign.projectId,
        { organizationId }
      );

      // 2. Finde Analysen-Ordner
      const analysenFolder = folderStructure.subfolders?.find(
        (f: any) => f.name === 'Analysen'
      );

      // 3. Lade Media Assets (Firestore Read)
      const assets = await mediaService.getMediaAssets(
        organizationId,
        analysenFolder.id
      );

      // 4. Filter PDFs
      const pdfs = assets.filter(a => a.fileType === 'application/pdf');

      setAnalysisPDFs(pdfs);
    } catch (error) {
      console.error('Fehler beim Laden der Analyse-PDFs:', error);
    }
  };
}
```

**Probleme:**

1. **Verschwendete API-Calls**: PDFs werden geladen, auch wenn nicht angezeigt
   - User landet auf Performance Tab → PDFs geladen, aber nicht genutzt
   - User landet auf Recipients Tab → PDFs geladen, aber nicht genutzt
   - Nur 1 von 5 Tabs zeigt PDFs!

2. **Performance-Impact**
   ```
   loadAnalysisPDFs():
   - 1× Firestore Read (Folder-Struktur) ~150ms
   - 1× Firestore Read (Media Assets) ~200ms
   = ~350ms zusätzliche Initial Page Load Zeit
   ```

3. **Firestore-Kosten**
   ```
   Annahme: 100 Pageviews/Tag
   - 100× Folder-Struktur Read
   - 100× Media Assets Read
   = 200 Reads/Tag

   Aber: Nur 20 Pageviews (20%) zeigen Analytics Tab
   → 160 Reads/Tag verschwendet (80%)
   ```

4. **Daten oft nicht benötigt**
   - User checkt nur E-Mail Performance → PDFs geladen, aber nicht gezeigt
   - User checkt nur Auto-Funde → PDFs geladen, aber nicht gezeigt

### Anforderungen

**Funktional:**
- PDFs sollen NUR geladen werden, wenn Analytics Tab aktiv ist
- Beim Wechsel zu Analytics Tab → PDFs nachladen
- Beim Wechsel weg von Analytics Tab → PDFs im Cache behalten (für Zurück-Navigation)

**Nicht-Funktional:**
- Performance: Reduziere Initial Page Load Zeit
- Kosten: Reduziere Firestore-Reads
- UX: Kein spürbarer Delay beim Tab-Wechsel zu Analytics

---

## Entscheidung

**Conditional Loading der PDF-Liste mit React Query `enabled` Flag.**

### Implementation

**1. useAnalysisPDFs Hook mit enabled Flag**

```typescript
// src/lib/hooks/useAnalysisPDFs.ts
export function useAnalysisPDFs(
  campaignId: string | undefined,
  organizationId: string | undefined,
  projectId: string | undefined,
  enabled: boolean = true // 👈 Conditional Loading Flag
) {
  return useQuery({
    queryKey: ['analysisPDFs', campaignId, organizationId, projectId],
    queryFn: async () => {
      if (!campaignId || !organizationId || !projectId) {
        return { pdfs: [], folderLink: null };
      }

      try {
        // Lade Folder-Struktur
        const folderStructure = await projectService.getProjectFolderStructure(
          projectId,
          { organizationId }
        );

        if (!folderStructure?.subfolders) {
          return { pdfs: [], folderLink: null };
        }

        // Finde Analysen-Ordner
        const analysenFolder = folderStructure.subfolders.find(
          (f: any) => f.name === 'Analysen'
        );

        if (!analysenFolder) {
          return { pdfs: [], folderLink: null };
        }

        // Lade Media Assets
        const assets = await mediaService.getMediaAssets(
          organizationId,
          analysenFolder.id
        );

        // Filter: Nur PDFs
        const campaignPDFs = assets.filter(
          (asset) => asset.fileType === 'application/pdf'
        );

        // Folder-Link generieren
        const folderLink = `/dashboard/projects/${projectId}?tab=daten&folder=${analysenFolder.id}`;

        return {
          pdfs: campaignPDFs,
          folderLink,
        };
      } catch (error) {
        console.error('Fehler beim Laden der Analyse-PDFs:', error);
        return { pdfs: [], folderLink: null };
      }
    },
    enabled: enabled && !!campaignId && !!organizationId && !!projectId, // 👈 Conditional Loading
    staleTime: 2 * 60 * 1000, // 2 Minuten
    gcTime: 5 * 60 * 1000,    // 5 Minuten
  });
}
```

**2. MonitoringProvider mit activeTab**

```typescript
// src/app/dashboard/analytics/monitoring/[campaignId]/context/MonitoringContext.tsx
export function MonitoringProvider({
  children,
  campaignId,
  organizationId,
  activeTab // 👈 activeTab als Prop
}: Props) {
  const { data } = useCampaignMonitoringData(campaignId, organizationId);

  // PDF-Liste: NUR laden wenn Analytics Tab aktiv
  const {
    data: pdfData,
    isLoading: isLoadingPDFs
  } = useAnalysisPDFs(
    campaignId,
    organizationId,
    data?.campaign?.projectId,
    activeTab === 'dashboard' // 👈 enabled = true nur wenn dashboard
  );

  // ...
}
```

**3. page.tsx mit activeTab Prop**

```typescript
// src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx
export default function MonitoringDetailPage() {
  const params = useParams();
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();

  const campaignId = params.campaignId as string;
  const activeTab = searchParams.get('tab') || 'dashboard'; // 👈 activeTab aus URL

  return (
    <MonitoringProvider
      campaignId={campaignId}
      organizationId={currentOrganization?.id || ''}
      activeTab={activeTab} // 👈 activeTab als Prop
    >
      <MonitoringContent />
    </MonitoringProvider>
  );
}
```

### Verhalten

**Szenario 1: User landet auf Analytics Tab (dashboard)**

```
URL: /monitoring/campaign-123?tab=dashboard

1. MonitoringProvider rendert
2. activeTab = 'dashboard'
3. useCampaignMonitoringData lädt (campaign, sends, clippings, suggestions)
4. useAnalysisPDFs lädt (enabled = true)
   → Folder-Struktur Request
   → Media Assets Request
5. PDFs werden angezeigt

Total Load Zeit: ~950ms (600ms campaign data + 350ms PDFs)
```

**Szenario 2: User landet auf Performance Tab**

```
URL: /monitoring/campaign-123?tab=performance

1. MonitoringProvider rendert
2. activeTab = 'performance'
3. useCampaignMonitoringData lädt (campaign, sends, clippings, suggestions)
4. useAnalysisPDFs lädt NICHT (enabled = false)
   → Keine API-Calls
5. PDFs werden nicht geladen (nicht benötigt)

Total Load Zeit: ~600ms (nur campaign data)
Einsparung: 350ms (-37%)
```

**Szenario 3: User wechselt von Performance zu Analytics Tab**

```
1. User klickt auf Analytics Tab
2. activeTab wird 'dashboard'
3. MonitoringProvider re-rendert
4. useAnalysisPDFs wird enabled (enabled = false → true)
5. React Query startet PDF-Fetch
6. PDFs werden geladen und angezeigt

Tab-Switch Zeit: ~350ms (PDF-Fetch)
```

**Szenario 4: User wechselt von Analytics zurück zu Performance**

```
1. User klickt auf Performance Tab
2. activeTab wird 'performance'
3. MonitoringProvider re-rendert
4. useAnalysisPDFs wird disabled (enabled = true → false)
5. React Query pausiert Query (behält Cache!)
6. PDFs bleiben im Cache

Beim Zurück-Wechsel zu Analytics:
→ PDFs aus Cache (instant, kein Fetch)
```

---

## Konsequenzen

### Positiv

**1. Performance-Verbesserung: 37%**

```
Initial Page Load (nicht-Analytics Tabs):
Vorher: 950ms (600ms campaign + 350ms PDFs)
Nachher: 600ms (nur campaign)
Verbesserung: -350ms (-37%)
```

**2. Firestore-Reads reduziert: 80%**

```
Annahme: 100 Pageviews/Tag
- 20% landen auf Analytics Tab → 20× PDF-Reads
- 80% landen auf anderen Tabs → 0× PDF-Reads (statt 80×)

Vorher: 100× PDF-Reads (2× Firestore Reads) = 200 Reads/Tag
Nachher: 20× PDF-Reads (2× Firestore Reads) = 40 Reads/Tag
Einsparung: 160 Reads/Tag (-80%)
```

**Kosten-Einsparung:**
```
Firestore Pricing: $0.06 per 100k Reads
160 Reads/Tag × 30 Tage = 4,800 Reads/Monat
4,800 Reads/Monat gespart

Bei größerem Traffic (1000 Pageviews/Tag):
→ 48,000 Reads/Monat gespart (~$0.03/Monat)
```

**Klein, aber:** Summiert sich bei vielen Modulen!

**3. Bessere UX**

```
User auf Performance Tab:
- Schnellerer Page Load (600ms statt 950ms)
- Weniger Loading Spinner
- Gefühlte Performance besser
```

**4. Cache-Strategie funktioniert**

```
User: Performance Tab → Analytics Tab → Performance Tab → Analytics Tab
      600ms          → 350ms (fetch) → instant     → instant (cache)
```

React Query Cache behält PDFs auch wenn Query disabled!

**5. Network-Traffic reduziert**

```
Vorher: Jeder Pageview
- 1× Folder-Struktur Request (~5KB)
- 1× Media Assets Request (~20KB PDF-Metadaten)
= 25KB/Pageview

Nachher: Nur Analytics Tab
- 80% weniger Requests
= 5KB durchschnittlich/Pageview

Bei 1000 Pageviews/Tag:
→ 20MB/Tag gespart (600MB/Monat)
```

### Negativ

**1. Tab-Switch Delay: 350ms**

```
User wechselt zu Analytics Tab:
→ 350ms Loading (PDF-Fetch)
→ Loading Spinner wird kurz angezeigt
```

**Mitigation:**
- React Query Cache (second time instant)
- 350ms ist akzeptabel (< 500ms Threshold)
- Loading State während Fetch

**2. Komplexität erhöht**

```typescript
// activeTab muss als Prop durch Provider
<MonitoringProvider activeTab={activeTab}>
  {children}
</MonitoringProvider>

// activeTab muss aus URL gelesen werden
const activeTab = searchParams.get('tab') || 'dashboard';
```

**Mitigation:**
- Nur 2 Zeilen Code
- Standard-Pattern in React

**3. Cache kann veraltet sein**

```
User auf Analytics Tab:
1. PDFs geladen (3 PDFs)
2. User wechselt zu Performance Tab
3. Neues PDF wird extern generiert (4 PDFs)
4. User wechselt zurück zu Analytics Tab
   → Cache zeigt noch 3 PDFs (statt 4)

Nach 2 Minuten (staleTime):
→ Background Refetch
→ 4 PDFs werden angezeigt
```

**Mitigation:**
- staleTime: 2 Minuten (akzeptabel)
- Background Refetch on Focus
- Manueller Reload-Button vorhanden

### Risiken & Mitigation

**Risiko 1: User bemerkt Tab-Switch Delay**

**Mitigation:**
```typescript
// Loading State während PDF-Fetch
{isLoadingPDFs && <LoadingSpinner />}

// Alternative: Skeleton UI
{isLoadingPDFs ? <PDFListSkeleton /> : <PDFList pdfs={pdfs} />}
```

**Risiko 2: activeTab nicht synchronisiert**

**Mitigation:**
```typescript
// activeTab immer aus URL lesen (single source of truth)
const activeTab = searchParams.get('tab') || 'dashboard';

// Bei Tab-Wechsel: URL updaten
const handleTabChange = (tab: string) => {
  router.push(`?tab=${tab}`, { scroll: false });
};
```

**Risiko 3: enabled Flag falsch → PDFs werden nicht geladen**

**Mitigation:**
```typescript
// Test: enabled Flag funktioniert
test('PDFs werden nur auf Analytics Tab geladen', () => {
  const { rerender } = render(
    <MonitoringProvider activeTab="performance">
      <TestComponent />
    </MonitoringProvider>
  );

  expect(mockUseAnalysisPDFs).toHaveBeenCalledWith(
    campaignId,
    organizationId,
    projectId,
    false // enabled = false
  );

  rerender(
    <MonitoringProvider activeTab="dashboard">
      <TestComponent />
    </MonitoringProvider>
  );

  expect(mockUseAnalysisPDFs).toHaveBeenCalledWith(
    campaignId,
    organizationId,
    projectId,
    true // enabled = true
  );
});
```

---

## Alternativen

### Alternative 1: Immer alle PDFs laden (Status Quo)

**Vorteile:**
- Einfach
- Keine Conditional Logic
- PDFs immer verfügbar (auch wenn nicht angezeigt)

**Nachteile:**
- 80% verschwendete Requests
- 37% langsamerer Page Load
- Höhere Firestore-Kosten
- **→ Abgelehnt**

### Alternative 2: PDFs nur beim ersten Besuch des Analytics Tabs laden

**Implementation:**
```typescript
const [pdfsLoaded, setPdfsLoaded] = useState(false);

useEffect(() => {
  if (activeTab === 'dashboard' && !pdfsLoaded) {
    loadPDFs();
    setPdfsLoaded(true);
  }
}, [activeTab]);
```

**Vorteile:**
- PDFs werden nur einmal geladen
- Kein erneuter Fetch beim Zurück-Navigieren

**Nachteile:**
- Manuelles State Management
- Kein Auto-Refetch (veraltete Daten)
- Kein Caching über Page Reloads
- **→ Abgelehnt** (React Query besser)

### Alternative 3: Lazy Load mit Suspense

**Implementation:**
```typescript
const PDFList = lazy(() => import('./components/PDFList'));

{activeTab === 'dashboard' && (
  <Suspense fallback={<LoadingSkeleton />}>
    <PDFList />
  </Suspense>
)}
```

**Vorteile:**
- Code-Splitting
- Lazy Loading

**Nachteile:**
- Löst nicht das Problem (PDFs werden trotzdem geladen)
- Nur Component Code wird lazy geladen
- **→ Nicht passend** für diesen Use-Case

### Alternative 4: React Query enabled Flag (GEWÄHLT)

**Vorteile:**
- Einfach zu implementieren
- React Query managed Cache
- Auto-Refetch funktioniert
- Kein manuelles State Management

**Nachteile:**
- activeTab als Prop nötig (akzeptabel)

**→ Gewählt!**

---

## Lessons Learned

### Was funktioniert gut

**1. React Query enabled Flag**

```typescript
enabled: activeTab === 'dashboard'
```

**Sehr elegant:**
- 1 Zeile Code
- React Query managed alles
- Cache funktioniert automatisch

**2. Cache-Strategie**

```typescript
staleTime: 2 * 60 * 1000, // 2 Minuten
gcTime: 5 * 60 * 1000,    // 5 Minuten
```

**Perfekt für diesen Use-Case:**
- PDFs ändern sich selten
- 2 Minuten ist akzeptabel
- Garbage Collection nach 5 Minuten (User ist weg)

**3. Error Handling mit Fallback**

```typescript
try {
  // Lade PDFs
} catch (error) {
  console.error('Fehler:', error);
  return { pdfs: [], folderLink: null }; // Fallback: leere Liste
}
```

**Robustheit:**
- Kein Error-Throw
- UI bricht nicht
- Zeigt leere Liste (statt Error)

### Was verbessert werden könnte

**1. Loading State während Tab-Switch**

**Aktuell:**
```typescript
{isLoadingPDFs && <div>Lädt...</div>}
```

**Besser: Skeleton UI**
```typescript
{isLoadingPDFs ? (
  <PDFListSkeleton count={3} />
) : (
  <PDFList pdfs={pdfs} />
)}
```

**2. Prefetching**

**Idee:**
```typescript
// Wenn User über Analytics Tab hovert
<TabButton
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['analysisPDFs', ...],
      queryFn: loadPDFs,
    });
  }}
>
  Analytics
</TabButton>
```

**Vorteil:** Instant PDF-Load beim Tab-Wechsel

**Trade-off:** Mehr Requests (prefetch auch wenn User nicht klickt)

**3. Granulare enabled Flags**

**Idee:**
```typescript
// Verschiedene Daten verschiedene Tabs
useClippings(campaignId, organizationId, activeTab === 'clippings');
useSuggestions(campaignId, organizationId, activeTab === 'suggestions');
```

**Vorteil:** Noch mehr Performance-Optimierung

**Trade-off:** Mehr Komplexität

---

## Metriken

### Performance

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|--------------|
| Initial Load (Analytics Tab) | 950ms | 950ms | 0% (kein Unterschied) |
| Initial Load (Performance Tab) | 950ms | 600ms | -37% ✅ |
| Initial Load (Recipients Tab) | 950ms | 600ms | -37% ✅ |
| Initial Load (Clippings Tab) | 950ms | 600ms | -37% ✅ |
| Initial Load (Suggestions Tab) | 950ms | 600ms | -37% ✅ |
| Tab-Switch zu Analytics | - | 350ms | Neu (akzeptabel) |
| Tab-Switch weg von Analytics | - | instant | ✅ |

**Durchschnittliche Verbesserung:**
```
Annahme: 20% Analytics, 80% andere Tabs
(950ms × 0.2) + (600ms × 0.8) = 670ms durchschnittlich
Vorher: 950ms
Nachher: 670ms
Verbesserung: -29% ✅
```

### Kosten

| Metrik | Vorher | Nachher | Einsparung |
|--------|--------|---------|-----------|
| Firestore Reads/Pageview | 2 (Folder + Assets) | 0.4 (20% Analytics) | -80% ✅ |
| Firestore Reads/Tag (100 PV) | 200 | 40 | 160 (-80%) ✅ |
| Firestore Reads/Monat (3k PV) | 6,000 | 1,200 | 4,800 (-80%) ✅ |

**Kosten-Einsparung:**
```
Bei 3,000 Pageviews/Monat:
4,800 Reads gespart
= ~$0.003/Monat

Bei 100,000 Pageviews/Monat:
160,000 Reads gespart
= ~$0.10/Monat
```

**Klein, aber:** Summiert sich bei 20+ Modulen!

### Network Traffic

| Metrik | Vorher | Nachher | Einsparung |
|--------|--------|---------|-----------|
| Requests/Pageview | 2 (Folder + Assets) | 0.4 (20% Analytics) | -80% ✅ |
| KB/Pageview | 25KB | 5KB | -20KB (-80%) ✅ |
| KB/Tag (100 PV) | 2.5MB | 500KB | -2MB (-80%) ✅ |

---

## Zukunft

### Planned Enhancements

**1. Prefetching on Hover**

```typescript
<TabButton
  onMouseEnter={() => prefetchPDFs()}
>
  Analytics
</TabButton>
```

**2. Skeleton UI**

```typescript
{isLoadingPDFs ? <PDFListSkeleton /> : <PDFList pdfs={pdfs} />}
```

**3. Granulare Conditional Loading**

```typescript
// Jeder Tab lädt nur seine Daten
useClippings(campaignId, organizationId, activeTab === 'clippings');
useSuggestions(campaignId, organizationId, activeTab === 'suggestions');
```

### Wiederverwendung

Pattern kann wiederverwendet werden:

**Projekt-Detail:**
```typescript
// Lade Team-Members nur wenn Team Tab aktiv
useTeamMembers(projectId, organizationId, activeTab === 'team');
```

**Kontakt-Detail:**
```typescript
// Lade Historie nur wenn History Tab aktiv
useContactHistory(contactId, organizationId, activeTab === 'history');
```

---

## Referenzen

### Interne Dokumentation

- [README.md](../README.md) - Hauptdokumentation
- [API.md](./API.md) - useAnalysisPDFs Hook
- [ADR-002: React Query](./ADR-002-react-query.md) - React Query Pattern

### Externe Ressourcen

- [React Query enabled Option](https://tanstack.com/query/latest/docs/react/guides/disabling-queries)
- [Conditional Fetching](https://tkdodo.eu/blog/react-query-fa-qs#how-can-i-use-the-enabled-option-to-defer-a-query)
- [Query Keys Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)

---

**Status:** ✅ Accepted
**Datum:** 17. November 2025
**Implementiert in:** Phase 1.2 - Monitoring Detail Foundation
