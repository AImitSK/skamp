# Implementierungsplan: Sentiment beim Bestätigen von Auto-Funden

## Übersicht

**Problem:** Beim Bestätigen von automatisch gefundenen Artikeln (Auto-Funde/Suggestions) wird das Sentiment automatisch auf "neutral" gesetzt. Der User muss nachträglich jedes Clipping öffnen und das Sentiment manuell ändern.

**Lösung:** Erweiterung des Bestätigungs-Workflows um eine Sentiment-Auswahl direkt beim Bestätigen.

## Betroffene Stellen

### 1. Projekt Monitoring Tab
- **Pfad:** `/dashboard/projects/[projectId]` → Monitoring Tab
- **Komponente:** `src/components/projects/ProjectMonitoringTab.tsx`
- **Anzeige:** "Pending Auto-Funde (X)" Bereich

### 2. Campaign Monitoring Detail
- **Pfad:** `/dashboard/analytics/monitoring/[campaignId]?tab=suggestions`
- **Komponente:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`
- **Anzeige:** `MonitoringSuggestionsTable` Komponente

---

## Implementierung

### Phase 1: Service-Erweiterung

**Datei:** `src/lib/firebase/monitoring-suggestion-service.ts`

Erweitere `confirmSuggestion()` um optionalen Sentiment-Parameter:

```typescript
async confirmSuggestion(
  suggestionId: string,
  context: {
    userId: string;
    organizationId: string;
    sentiment?: 'positive' | 'neutral' | 'negative';  // NEU
  }
): Promise<string>
```

**Änderungen:**
- Zeile 105: `sentiment: context.sentiment || 'neutral' as const,`

---

### Phase 2: MonitoringSuggestionsTable erweitern

**Datei:** `src/components/monitoring/MonitoringSuggestionsTable.tsx`

#### 2.1 Interface anpassen

```typescript
interface Props {
  suggestions: MonitoringSuggestion[];
  onConfirm: (suggestion: MonitoringSuggestion, sentiment: 'positive' | 'neutral' | 'negative') => Promise<void>;  // GEÄNDERT
  onMarkSpam: (suggestion: MonitoringSuggestion) => Promise<void>;
  loading: boolean;
}
```

#### 2.2 Bestätigungs-Dialog mit Sentiment-Auswahl

Ersetze den direkten "Übernehmen" Button durch einen Dialog:

```tsx
// State für Dialog
const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
const [selectedSuggestion, setSelectedSuggestion] = useState<MonitoringSuggestion | null>(null);
const [selectedSentiment, setSelectedSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');

// Button öffnet Dialog statt direkte Bestätigung
<Button
  color="green"
  onClick={() => {
    setSelectedSuggestion(suggestion);
    setSelectedSentiment('neutral');
    setConfirmDialogOpen(true);
  }}
>
  <CheckCircleIcon className="size-4" />
  Übernehmen
</Button>

// Dialog Component
<Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
  <DialogTitle>Clipping übernehmen</DialogTitle>
  <DialogBody>
    <div className="space-y-4">
      <div>
        <Text className="font-medium">{selectedSuggestion?.articleTitle}</Text>
        <Text className="text-sm text-gray-500">{selectedSuggestion?.sources[0]?.sourceName}</Text>
      </div>

      <Field>
        <Label>Sentiment</Label>
        <div className="flex gap-3 mt-2">
          <SentimentButton
            sentiment="positive"
            selected={selectedSentiment === 'positive'}
            onClick={() => setSelectedSentiment('positive')}
            label="Positiv"
            color="green"
          />
          <SentimentButton
            sentiment="neutral"
            selected={selectedSentiment === 'neutral'}
            onClick={() => setSelectedSentiment('neutral')}
            label="Neutral"
            color="gray"
          />
          <SentimentButton
            sentiment="negative"
            selected={selectedSentiment === 'negative'}
            onClick={() => setSelectedSentiment('negative')}
            label="Negativ"
            color="red"
          />
        </div>
      </Field>
    </div>
  </DialogBody>
  <DialogActions>
    <Button plain onClick={() => setConfirmDialogOpen(false)}>
      Abbrechen
    </Button>
    <Button
      color="green"
      onClick={() => handleConfirmWithSentiment()}
      disabled={processingId !== null}
    >
      Clipping erstellen
    </Button>
  </DialogActions>
</Dialog>
```

#### 2.3 Sentiment-Button Komponente (inline oder separat)

```tsx
function SentimentButton({
  sentiment,
  selected,
  onClick,
  label,
  color
}: {
  sentiment: 'positive' | 'neutral' | 'negative';
  selected: boolean;
  onClick: () => void;
  label: string;
  color: 'green' | 'gray' | 'red';
}) {
  const colors = {
    green: selected ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50',
    gray: selected ? 'bg-gray-100 border-gray-500 text-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
    red: selected ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50'
  };

  const icons = {
    positive: '👍',
    neutral: '😐',
    negative: '👎'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors ${colors[color]}`}
    >
      <span>{icons[sentiment]}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
```

---

### Phase 3: Handler in Parent-Komponenten anpassen

#### 3.1 Campaign Monitoring Page

**Datei:** `src/app/dashboard/analytics/monitoring/[campaignId]/page.tsx`

```typescript
const handleConfirmSuggestion = useCallback(async (
  suggestion: MonitoringSuggestion,
  sentiment: 'positive' | 'neutral' | 'negative'  // NEU
) => {
  if (!user?.uid || !currentOrganization?.id) return;

  try {
    await monitoringSuggestionService.confirmSuggestion(
      suggestion.id!,
      {
        userId: user.uid,
        organizationId: currentOrganization.id,
        sentiment  // NEU
      }
    );

    toastService.success('Vorschlag erfolgreich als Clipping gespeichert');
    await reloadData();
  } catch (error) {
    console.error('Fehler beim Bestätigen:', error);
    toastService.error('Fehler beim Übernehmen des Vorschlags');
  }
}, [user?.uid, currentOrganization?.id, reloadData]);
```

#### 3.2 ProjectMonitoringTab

**Datei:** `src/components/projects/ProjectMonitoringTab.tsx`

Erweitere `handleConfirmSuggestion` und den React Query Hook entsprechend.

#### 3.3 useMonitoringData Hook

**Datei:** `src/lib/hooks/useMonitoringData.ts`

Erweitere `useConfirmSuggestion` Mutation:

```typescript
export function useConfirmSuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestionId,
      userId,
      organizationId,
      sentiment  // NEU
    }: {
      suggestionId: string;
      userId: string;
      organizationId: string;
      sentiment?: 'positive' | 'neutral' | 'negative';  // NEU
    }) => {
      return monitoringSuggestionService.confirmSuggestion(
        suggestionId,
        { userId, organizationId, sentiment }
      );
    },
    // ... onSuccess etc.
  });
}
```

---

### Phase 4: ProjectMonitoringOverview anpassen

**Datei:** `src/components/projects/monitoring/ProjectMonitoringOverview.tsx`

Falls hier auch ein "Pending Auto-Funde" Bereich mit Bestätigungs-Buttons existiert, muss auch dieser angepasst werden.

Prüfen welche Komponente die "Pending Auto-Funde (2)" Anzeige rendert und dort ebenfalls den Dialog integrieren.

---

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `monitoring-suggestion-service.ts` | `confirmSuggestion()` um `sentiment` Parameter erweitern |
| `MonitoringSuggestionsTable.tsx` | Dialog mit Sentiment-Auswahl hinzufügen |
| `[campaignId]/page.tsx` | Handler um sentiment Parameter erweitern |
| `ProjectMonitoringTab.tsx` | Handler um sentiment Parameter erweitern |
| `useMonitoringData.ts` | `useConfirmSuggestion` Mutation erweitern |
| `ProjectMonitoringOverview.tsx` | Falls Confirm-Button vorhanden, anpassen |

---

## Visuelles Design

Der Sentiment-Dialog sollte:
- Übersichtlich den Artikel-Titel anzeigen
- 3 große, klickbare Buttons für Sentiment (👍 Positiv, 😐 Neutral, 👎 Negativ)
- Standardmäßig "Neutral" vorausgewählt haben
- Klare Bestätigungs- und Abbrechen-Buttons haben

```
┌─────────────────────────────────────────────────┐
│ Clipping übernehmen                         [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│ "TechVision stellt neue KI-Lösung vor"         │
│ Quelle: Handelsblatt Online                     │
│                                                 │
│ Sentiment:                                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 👍       │ │ 😐       │ │ 👎       │        │
│ │ Positiv  │ │ Neutral  │ │ Negativ  │        │
│ └──────────┘ └──────────┘ └──────────┘        │
│     [ ]          [●]           [ ]             │
│                                                 │
├─────────────────────────────────────────────────┤
│              [Abbrechen]  [Clipping erstellen] │
└─────────────────────────────────────────────────┘
```

---

## Geschätzter Aufwand

- Phase 1 (Service): 10 min
- Phase 2 (Table + Dialog): 30 min
- Phase 3 (Handler): 20 min
- Phase 4 (Overview): 15 min
- Testing: 15 min

**Gesamt: ~90 min**
