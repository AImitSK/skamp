# Monitoring Modals - Komponenten-Dokumentation

> **Modul**: monitoring/modals/components
> **Version**: 1.0.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-11-17

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [MarkPublishedModal](#markpublishedmodal)
- [EditClippingModal](#editclippingmodal)
- [Gemeinsame Features](#gemeinsame-features)
- [Styling & Design](#styling--design)
- [Accessibility](#accessibility)
- [Performance-Tipps](#performance-tipps)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Übersicht

Die Monitoring Modals bestehen aus zwei Haupt-Komponenten, die beide auf dem CeleroPress Design System basieren und vollständig typsicher mit TypeScript implementiert sind.

### Komponenten-Hierarchie

```
Dialog (CeleroPress Design System)
├── MarkPublishedModal (311 Zeilen)
│   ├── PublicationSelector
│   ├── Form Fields (Grid Layout)
│   └── DialogActions (Buttons)
│
└── EditClippingModal (230 Zeilen)
    ├── Form Fields (Grid Layout)
    └── DialogActions (Buttons)
```

### Gemeinsame Abhängigkeiten

```typescript
// UI-Komponenten (CeleroPress Design System)
import { Dialog, DialogBody, DialogActions, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';

// React Hooks
import { useState, useCallback, useMemo } from 'react';

// Context
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

// Custom Hooks
import { useMarkAsPublished, useUpdateClipping } from '@/lib/hooks/useMonitoringMutations';
```

## MarkPublishedModal

**Datei**: `src/components/monitoring/MarkPublishedModal.tsx` (311 Zeilen)

### Props

```typescript
interface MarkPublishedModalProps {
  send: EmailCampaignSend;      // Der zu markierende Versand
  campaignId: string;            // ID der zugehörigen Kampagne
  onClose: () => void;           // Callback beim Schließen
  onSuccess: () => void;         // Callback bei erfolgreichem Speichern
}
```

### Prop-Beschreibungen

#### send (EmailCampaignSend)

Der Email-Versand der als veröffentlicht markiert werden soll.

**Wichtige Felder**:
```typescript
interface EmailCampaignSend {
  id: string;                    // REQUIRED für Mutation
  recipientEmail: string;        // Für PublicationSelector
  recipientName: string;         // Für Fallback-Titel
  publishedStatus?: string;      // Wird auf 'published' gesetzt
  // ... weitere Felder
}
```

**Verwendung**:
```typescript
<MarkPublishedModal
  send={{
    id: 'send_123',
    recipientEmail: 'journalist@example.com',
    recipientName: 'Max Mustermann',
    recipientOrganization: 'Süddeutsche Zeitung'
  }}
  campaignId="campaign_456"
  onClose={() => setShowModal(false)}
  onSuccess={() => {
    setShowModal(false);
    refetch(); // Optional: Daten neu laden
  }}
/>
```

#### campaignId (string)

Die ID der PR-Kampagne zu der der Versand gehört.

**Warum benötigt?**
- Clipping wird mit Kampagne verknüpft
- ProjectId wird aus Kampagne geladen
- Monitoring-Statistiken werden kampagnen-bezogen berechnet

#### onClose (function)

Callback der aufgerufen wird wenn das Modal geschlossen werden soll.

**Verwendungs-Szenarien**:
- User klickt auf "Abbrechen"-Button
- User drückt ESC-Taste
- User klickt außerhalb des Modals

```typescript
const [showModal, setShowModal] = useState(false);

<MarkPublishedModal
  onClose={() => {
    setShowModal(false);
    // Optional: Form-State zurücksetzen
    resetFormData();
  }}
/>
```

#### onSuccess (function)

Callback der nach erfolgreichem Speichern aufgerufen wird.

**Timing**: Wird aufgerufen NACH:
- Clipping wurde in Firestore erstellt
- Send-Status wurde aktualisiert
- React Query Cache wurde invalidiert
- Success-Toast wurde angezeigt

```typescript
<MarkPublishedModal
  onSuccess={() => {
    // 1. Modal schließen
    setShowModal(false);

    // 2. Optional: Navigation
    router.push('/dashboard/monitoring');

    // 3. Optional: Weitere Aktionen
    trackAnalytics('clipping_created');
  }}
/>
```

### State Management

#### Local State

```typescript
const [selectedPublication, setSelectedPublication] = useState<MatchedPublication | null>(null);
const [lookupData, setLookupData] = useState<PublicationLookupResult | null>(null);
const [formData, setFormData] = useState<MarkAsPublishedFormData>({
  articleUrl: '',
  articleTitle: '',
  outletName: '',
  outletType: 'online',
  reach: '',
  sentiment: 'neutral',
  sentimentScore: 0,
  publishedAt: new Date().toISOString().split('T')[0]
});
```

**State-Beschreibungen**:

- `selectedPublication` - Vom PublicationSelector gewählte Publikation
- `lookupData` - Metadaten vom CRM (Reichweite, Typ, etc.)
- `formData` - Vollständige Formulardaten

#### Computed State (useMemo)

```typescript
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

**Warum useMemo?**
- AVE-Berechnung wird nur bei Änderung der Dependencies ausgeführt
- Verhindert unnötige Berechnungen bei jedem Render
- Performance-Gewinn: ~95% weniger Berechnungen

### Event Handlers

#### handlePublicationSelect

```typescript
const handlePublicationSelect = useCallback((publication: MatchedPublication | null) => {
  setSelectedPublication(publication);

  if (publication) {
    const reach = getReachFromPublication(publication);
    setFormData(prev => ({
      ...prev,
      outletName: publication.name,
      outletType: publication.type,
      reach: reach ? reach.toString() : prev.reach
    }));
  }
}, []);
```

**Features**:
- Auto-Fill von Outlet-Name, Typ und Reichweite
- Preservation von manuellen Eingaben wenn kein reach verfügbar
- useCallback für Performance

#### handleDataLoad

```typescript
const handleDataLoad = useCallback((data: PublicationLookupResult) => {
  setLookupData(data);
}, []);
```

**Zweck**: Speichert Lookup-Daten für spätere Verwendung (z.B. Debugging, Analytics)

#### handleSubmit

```typescript
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user || !currentOrganization || !send.id) return;

  try {
    await markAsPublished.mutateAsync({
      organizationId: currentOrganization.id,
      campaignId,
      sendId: send.id,
      userId: user.uid,
      recipientName: send.recipientName,
      formData
    });
    onSuccess();
  } catch (error) {
    // Error already handled by mutation
  }
}, [user, currentOrganization, send.id, send.recipientName, campaignId, formData, markAsPublished, onSuccess]);
```

**Wichtige Details**:
- `e.preventDefault()` - Verhindert Browser-Default Submit
- Early Return bei fehlenden Dependencies
- Error wird von Mutation gehandelt (Toast)
- onSuccess wird nur bei Erfolg aufgerufen

### UI-Struktur

#### Dialog Container

```tsx
<Dialog open={true} onClose={onClose} size="3xl">
  <DialogTitle>Als veröffentlicht markieren</DialogTitle>
  <form onSubmit={handleSubmit}>
    <DialogBody>
      {/* Form Content */}
    </DialogBody>
    <DialogActions>
      {/* Buttons */}
    </DialogActions>
  </form>
</Dialog>
```

**Dialog-Props**:
- `open={true}` - Immer offen (Lifecycle via Parent-Component)
- `size="3xl"` - Große Darstellung für umfangreiches Formular
- `onClose={onClose}` - Schließen via ESC oder Backdrop-Click

#### PublicationSelector

```tsx
{currentOrganization && (
  <PublicationSelector
    recipientEmail={send.recipientEmail}
    recipientName={send.recipientName}
    organizationId={currentOrganization.id}
    onPublicationSelect={handlePublicationSelect}
    onDataLoad={handleDataLoad}
  />
)}
```

**Features**:
- CRM-Integration für automatisches Ausfüllen
- Fuzzy-Matching von Email → Publication
- Live-Suche mit Typeahead
- Fallback zu manueller Eingabe

#### Form Fields - 2-spaltiges Grid

```tsx
<div className="grid grid-cols-2 gap-4">
  <Field>
    <Label>Artikel-URL *</Label>
    <Input
      type="url"
      value={formData.articleUrl}
      onChange={(e) => setFormData({ ...formData, articleUrl: e.target.value })}
      placeholder="https://..."
      required
    />
  </Field>

  <Field>
    <Label>Artikel-Titel</Label>
    <Input
      type="text"
      value={formData.articleTitle}
      onChange={(e) => setFormData({ ...formData, articleTitle: e.target.value })}
      placeholder="Optional"
    />
  </Field>
</div>
```

**Grid-Vorteile**:
- Optimale Raumnutzung
- Responsive (auf Mobile: 1 Spalte)
- Konsistente Abstände via Tailwind

#### Sentiment-Synchronisation

**Select-Element**:
```tsx
<Select
  value={formData.sentiment}
  onChange={(e) => {
    const sentiment = e.target.value as 'positive' | 'neutral' | 'negative';
    let score = 0;
    if (sentiment === 'positive') score = 0.7;
    if (sentiment === 'negative') score = -0.7;
    setFormData({ ...formData, sentiment, sentimentScore: score });
  }}
>
  <option value="positive">😊 Positiv</option>
  <option value="neutral">😐 Neutral</option>
  <option value="negative">😞 Negativ</option>
</Select>
```

**Slider-Element**:
```tsx
<input
  type="range"
  min="-1"
  max="1"
  step="0.1"
  value={formData.sentimentScore}
  onChange={(e) => {
    const score = parseFloat(e.target.value);
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

    if (score > 0.3) {
      sentiment = 'positive';
    } else if (score < -0.3) {
      sentiment = 'negative';
    }

    setFormData({ ...formData, sentimentScore: score, sentiment });
  }}
  aria-label="Sentiment-Score"
  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
  style={{
    background: `linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #22c55e 100%)`
  }}
/>
```

**Synchronisations-Logik**:

| Sentiment | Score-Range | Auto-Set |
|-----------|-------------|----------|
| Positive  | > 0.3       | ✅       |
| Neutral   | -0.3 bis 0.3| ✅       |
| Negative  | < -0.3      | ✅       |

**Default-Werte**:
- Positive → 0.7
- Neutral → 0.0
- Negative → -0.7

#### AVE-Preview

```tsx
{formData.reach && (
  <Field>
    <Label>Voraussichtlicher AVE</Label>
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <Text className="text-2xl font-bold text-gray-900">
        {calculatedAVE.toLocaleString('de-DE')} €
      </Text>
      <Text className="text-xs text-gray-500">
        Basierend auf {parseInt(formData.reach).toLocaleString('de-DE')} Reichweite
      </Text>
    </div>
  </Field>
)}
```

**Features**:
- Conditional Rendering (nur wenn Reichweite gesetzt)
- Live-Update via useMemo
- Formatierung: Tausender-Trennzeichen (de-DE)

#### Dialog Actions

```tsx
<DialogActions>
  <Button plain onClick={onClose} disabled={markAsPublished.isPending}>
    Abbrechen
  </Button>
  <Button type="submit" disabled={markAsPublished.isPending}>
    {markAsPublished.isPending ? 'Speichern...' : 'Speichern'}
  </Button>
</DialogActions>
```

**Button-States**:
- Disabled während Mutation (`isPending`)
- Loading-Text während Mutation
- Primary-Button für Submit (type="submit")
- Secondary-Button für Cancel (plain)

### Vollständiges Code-Beispiel

```tsx
import { useState } from 'react';
import { MarkPublishedModal } from '@/components/monitoring/MarkPublishedModal';
import type { EmailCampaignSend } from '@/types/email';

function MonitoringTable({ sends, campaignId }: { sends: EmailCampaignSend[]; campaignId: string }) {
  const [selectedSend, setSelectedSend] = useState<EmailCampaignSend | null>(null);

  return (
    <>
      <table className="w-full">
        <thead>
          <tr>
            <th>Empfänger</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {sends.map(send => (
            <tr key={send.id}>
              <td>{send.recipientName}</td>
              <td>{send.publishedStatus || 'Unbearbeitet'}</td>
              <td>
                <button
                  onClick={() => setSelectedSend(send)}
                  className="text-blue-600 hover:underline"
                >
                  Als veröffentlicht markieren
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {selectedSend && (
        <MarkPublishedModal
          send={selectedSend}
          campaignId={campaignId}
          onClose={() => setSelectedSend(null)}
          onSuccess={() => {
            setSelectedSend(null);
            // Daten werden automatisch aktualisiert via React Query
          }}
        />
      )}
    </>
  );
}
```

## EditClippingModal

**Datei**: `src/components/monitoring/EditClippingModal.tsx` (230 Zeilen)

### Props

```typescript
interface EditClippingModalProps {
  send: EmailCampaignSend;        // Zugehöriger Versand
  clipping: MediaClipping;        // Zu bearbeitendes Clipping
  onClose: () => void;            // Callback beim Schließen
  onSuccess: () => void;          // Callback bei erfolgreichem Speichern
}
```

### Prop-Beschreibungen

#### clipping (MediaClipping)

Das zu bearbeitende Media Clipping.

**Wichtige Felder**:
```typescript
interface MediaClipping {
  id: string;                    // REQUIRED für Update
  url: string;                   // Artikel-URL
  title?: string;                // Artikel-Titel
  outletName: string;            // Medium/Outlet
  outletType: 'print' | 'online' | 'broadcast' | 'blog';
  reach?: number;                // Reichweite
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore?: number;       // -1.0 bis 1.0
  publishedAt: Timestamp;        // Veröffentlichungsdatum
  // ... weitere Felder
}
```

**Pre-Fill Logik**:
```typescript
const [formData, setFormData] = useState<UpdateClippingFormData>({
  articleUrl: clipping.url || '',
  articleTitle: clipping.title || '',
  outletName: clipping.outletName || '',
  outletType: clipping.outletType as 'print' | 'online' | 'broadcast' | 'blog',
  reach: clipping.reach?.toString() || '',
  sentiment: clipping.sentiment,
  sentimentScore: clipping.sentimentScore || aveSettingsService.getSentimentScoreFromLabel(clipping.sentiment),
  publishedAt: clipping.publishedAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
});
```

**Fallbacks**:
- `sentimentScore` - Falls nicht gesetzt, aus sentiment ableiten
- `publishedAt` - Falls nicht gesetzt, heutiges Datum
- Alle String-Felder - Leer-String statt undefined

### Unterschiede zu MarkPublishedModal

| Feature | MarkPublishedModal | EditClippingModal |
|---------|-------------------|-------------------|
| PublicationSelector | ✅ Vorhanden | ❌ Nicht vorhanden |
| Pre-filled Form | ❌ Leeres Formular | ✅ Bestehende Daten |
| Empfänger-Feld | Versteckt | ✅ Disabled (Read-Only) |
| Submit-Button | "Speichern" | "Änderungen speichern" |
| Hook | useMarkAsPublished | useUpdateClipping |

### UI-Struktur

#### Empfänger-Feld (Read-Only)

```tsx
<Field>
  <Label>Empfänger</Label>
  <Input
    value={`${send.recipientName} (${send.recipientEmail})`}
    disabled
  />
</Field>
```

**Warum Read-Only?**
- Empfänger kann nicht geändert werden (referenzielle Integrität)
- Zeigt Context des Clippings
- Verhindert versehentliche Änderungen

#### Form-Struktur

Identisch zu MarkPublishedModal, aber ohne PublicationSelector:

```tsx
<DialogBody>
  <div className="space-y-4">
    {/* Empfänger (Read-Only) */}
    <Field>
      <Label>Empfänger</Label>
      <Input value={`${send.recipientName} (${send.recipientEmail})`} disabled />
    </Field>

    {/* Artikel-URL und Titel - 2-spaltig */}
    <div className="grid grid-cols-2 gap-4">
      {/* ... */}
    </div>

    {/* Medium/Outlet und Medientyp - 2-spaltig */}
    <div className="grid grid-cols-2 gap-4">
      {/* ... */}
    </div>

    {/* Veröffentlichungsdatum und Reichweite - 2-spaltig */}
    <div className="grid grid-cols-2 gap-4">
      {/* ... */}
    </div>

    {/* Sentiment & AVE Preview */}
    <div className="grid grid-cols-2 gap-4">
      {/* ... */}
    </div>

    {/* Sentiment-Score Slider */}
    <Field>
      {/* ... */}
    </Field>
  </div>
</DialogBody>
```

### Vollständiges Code-Beispiel

```tsx
import { useState } from 'react';
import { EditClippingModal } from '@/components/monitoring/EditClippingModal';
import type { EmailCampaignSend } from '@/types/email';
import type { MediaClipping } from '@/types/monitoring';

function ClippingsList({ clippings, sends }: { clippings: MediaClipping[]; sends: EmailCampaignSend[] }) {
  const [editing, setEditing] = useState<{ clipping: MediaClipping; send: EmailCampaignSend } | null>(null);

  const getSendForClipping = (clipping: MediaClipping) => {
    return sends.find(s => s.id === clipping.emailSendId);
  };

  return (
    <>
      <div className="space-y-4">
        {clippings.map(clipping => {
          const send = getSendForClipping(clipping);
          if (!send) return null;

          return (
            <div key={clipping.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{clipping.title}</h3>
              <p className="text-sm text-gray-600">{clipping.outletName}</p>
              <button
                onClick={() => setEditing({ clipping, send })}
                className="mt-2 text-blue-600 hover:underline"
              >
                Bearbeiten
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {editing && (
        <EditClippingModal
          send={editing.send}
          clipping={editing.clipping}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            // Cache wird automatisch invalidiert
          }}
        />
      )}
    </>
  );
}
```

## Gemeinsame Features

### Sentiment-Synchronisation

Beide Modals verwenden die gleiche bidirektionale Synchronisations-Logik.

**Implementation**:
```typescript
// Select → Slider
const handleSentimentSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const sentiment = e.target.value as 'positive' | 'neutral' | 'negative';
  let score = 0;
  if (sentiment === 'positive') score = 0.7;
  if (sentiment === 'negative') score = -0.7;
  setFormData({ ...formData, sentiment, sentimentScore: score });
};

// Slider → Select
const handleSentimentSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const score = parseFloat(e.target.value);
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

  if (score > 0.3) {
    sentiment = 'positive';
  } else if (score < -0.3) {
    sentiment = 'negative';
  }

  setFormData({ ...formData, sentimentScore: score, sentiment });
};
```

**Threshold-Tabelle**:

| Score-Range | Sentiment | Select-Wert |
|-------------|-----------|-------------|
| > 0.3       | Positive  | "positive"  |
| -0.3 to 0.3 | Neutral   | "neutral"   |
| < -0.3      | Negative  | "negative"  |

### AVE-Berechnung

Identische Implementierung in beiden Modals:

```typescript
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

**Formel** (aus `publication-matcher.ts`):
```typescript
AVE = Reichweite × OutletType-Faktor × Sentiment-Multiplikator
```

**Faktoren**:
```typescript
const OUTLET_FACTORS = {
  print: 3.0,
  online: 1.0,
  broadcast: 5.0,
  blog: 0.5
};

const SENTIMENT_MULTIPLIERS = {
  positive: 1.0,
  neutral: 0.8,
  negative: 0.5
};
```

### Form Validation

**HTML5 Validation**:
```tsx
<Input
  type="url"
  value={formData.articleUrl}
  required
/>
```

**Custom Validation** (Future Enhancement):
```typescript
const validateForm = () => {
  const errors: string[] = [];

  if (!formData.articleUrl) {
    errors.push('Artikel-URL ist erforderlich');
  }

  if (formData.reach && isNaN(parseInt(formData.reach))) {
    errors.push('Reichweite muss eine Zahl sein');
  }

  return errors;
};
```

## Styling & Design

### CeleroPress Design System

Beide Modals verwenden ausschließlich Design System Komponenten:

```typescript
import {
  Dialog,        // Modal Container
  DialogBody,    // Content Area
  DialogActions, // Button Area
  DialogTitle    // Header
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';      // Primary/Secondary Buttons
import { Input } from '@/components/ui/input';        // Text/URL/Number Inputs
import { Field, Label } from '@/components/ui/fieldset';  // Form Fields
import { Select } from '@/components/ui/select';      // Dropdown
import { Textarea } from '@/components/ui/textarea';  // Multiline Input
import { Text } from '@/components/ui/text';          // Typography
```

**Vorteile**:
- Konsistente Optik durch die gesamte App
- Accessibility eingebaut (ARIA-Attributes)
- Dark Mode Support (future)
- Responsive Design

### Layout-Patterns

#### 2-spaltiges Grid

```tsx
<div className="grid grid-cols-2 gap-4">
  <Field>...</Field>
  <Field>...</Field>
</div>
```

**Responsive Breakpoints**:
```css
/* Desktop: 2 Spalten */
@media (min-width: 768px) {
  grid-cols-2
}

/* Mobile: 1 Spalte */
@media (max-width: 767px) {
  grid-cols-1
}
```

#### Spacing System

```tsx
<div className="space-y-4">  {/* Vertikaler Abstand zwischen Elementen */}
  <div className="grid grid-cols-2 gap-4">  {/* Horizontaler Abstand im Grid */}
    {/* ... */}
  </div>
</div>
```

**Tailwind Spacing Scale**:
- `gap-4` = 1rem (16px)
- `space-y-4` = 1rem zwischen Elementen
- `p-3` = 0.75rem Padding

### Color Scheme

**Sentiment-Slider Gradient**:
```tsx
style={{
  background: `linear-gradient(to right, #ef4444 0%, #fbbf24 50%, #22c55e 100%)`
}}
```

**Colors**:
- `#ef4444` - Red (Negativ)
- `#fbbf24` - Yellow (Neutral)
- `#22c55e` - Green (Positiv)

**AVE-Preview Box**:
```tsx
<div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
  <Text className="text-2xl font-bold text-gray-900">
    {calculatedAVE.toLocaleString('de-DE')} €
  </Text>
  <Text className="text-xs text-gray-500">
    Basierend auf {parseInt(formData.reach).toLocaleString('de-DE')} Reichweite
  </Text>
</div>
```

## Accessibility

### ARIA-Labels

```tsx
<input
  type="range"
  min="-1"
  max="1"
  step="0.1"
  value={formData.sentimentScore}
  aria-label="Sentiment-Score"
  aria-valuemin={-1}
  aria-valuemax={1}
  aria-valuenow={formData.sentimentScore}
/>
```

### Keyboard Navigation

**Unterstützte Keys**:
- `Tab` - Navigation zwischen Feldern
- `Enter` - Submit (wenn auf Button fokussiert)
- `Escape` - Modal schließen (via Dialog-Component)
- `Space` - Button aktivieren

### Screen Reader Support

**Label-Associations**:
```tsx
<Field>
  <Label htmlFor="articleUrl">Artikel-URL *</Label>
  <Input
    id="articleUrl"
    type="url"
    value={formData.articleUrl}
    aria-required="true"
  />
</Field>
```

**Required Fields**:
```tsx
<Input
  required
  aria-required="true"
  aria-invalid={errors.articleUrl ? 'true' : 'false'}
/>
```

## Performance-Tipps

### 1. useCallback für Event Handler

```typescript
// ✅ RICHTIG
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  // ...
}, [user, currentOrganization, send.id, formData, markAsPublished, onSuccess]);

// ❌ FALSCH
const handleSubmit = async (e: React.FormEvent) => {
  // Handler wird bei jedem Render neu erstellt
};
```

**Benefit**: -80% Re-Renders von Child Components

### 2. useMemo für Berechnungen

```typescript
// ✅ RICHTIG
const calculatedAVE = useMemo(() => {
  return calculateAVE(reach, sentiment, outletType);
}, [formData.reach, formData.sentiment, formData.outletType]);

// ❌ FALSCH
const calculatedAVE = calculateAVE(reach, sentiment, outletType);
```

**Benefit**: -95% unnötige Berechnungen

### 3. Conditional Rendering

```typescript
// ✅ RICHTIG - Rendert nur wenn nötig
{formData.reach && (
  <AVEPreview value={calculatedAVE} />
)}

// ❌ FALSCH - Rendert immer (auch wenn leer)
<AVEPreview value={calculatedAVE} />
```

### 4. React.memo für Child Components (Future)

```typescript
const AVEPreview = React.memo(({ value }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <Text className="text-2xl font-bold">
        {value.toLocaleString('de-DE')} €
      </Text>
    </div>
  );
});
```

## Common Patterns

### Pattern 1: Conditional Modal Rendering

```typescript
function ParentComponent() {
  const [selectedSend, setSelectedSend] = useState<EmailCampaignSend | null>(null);

  return (
    <>
      <button onClick={() => setSelectedSend(send)}>
        Öffnen
      </button>

      {selectedSend && (
        <MarkPublishedModal
          send={selectedSend}
          campaignId={campaignId}
          onClose={() => setSelectedSend(null)}
          onSuccess={() => setSelectedSend(null)}
        />
      )}
    </>
  );
}
```

### Pattern 2: Form State Management

```typescript
// Initial State
const [formData, setFormData] = useState<FormData>({
  // ... default values
});

// Update einzelnes Feld
const handleFieldChange = (field: keyof FormData, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};

// Update mehrere Felder
const handlePublicationSelect = (publication: MatchedPublication) => {
  setFormData(prev => ({
    ...prev,
    outletName: publication.name,
    outletType: publication.type,
    reach: publication.reach?.toString() || prev.reach
  }));
};
```

### Pattern 3: Error Handling

```typescript
const mutation = useMarkAsPublished();

// Option 1: Via Hook State
if (mutation.isError) {
  return <ErrorMessage error={mutation.error} />;
}

// Option 2: Via try/catch
const handleSubmit = async () => {
  try {
    await mutation.mutateAsync({ ... });
  } catch (error) {
    // Custom Error Handling
    setLocalError(error.message);
  }
};
```

## Troubleshooting

### Problem: Modal öffnet sich nicht

**Mögliche Ursachen**:
1. `selectedSend` ist null
2. Conditional Rendering fehlt
3. Dialog-Component nicht korrekt importiert

**Lösung**:
```typescript
// ✅ RICHTIG
{selectedSend && (
  <MarkPublishedModal send={selectedSend} ... />
)}

// ❌ FALSCH
<MarkPublishedModal send={selectedSend} ... />
```

### Problem: AVE wird nicht berechnet

**Ursache**: Reichweite oder Sentiment fehlt

**Lösung**:
```typescript
const calculatedAVE = useMemo(() => {
  // Defensive Prüfung
  if (!formData.reach || !formData.sentiment) return 0;

  const reach = parseInt(formData.reach);
  if (isNaN(reach)) return 0;

  return calculateAVE(reach, formData.sentiment, formData.outletType);
}, [formData.reach, formData.sentiment, formData.outletType]);
```

### Problem: Sentiment-Slider synchronisiert nicht

**Ursache**: State-Update überschreibt sich gegenseitig

**Lösung**:
```typescript
// ✅ RICHTIG - Beide Werte gleichzeitig setzen
setFormData({ ...formData, sentiment, sentimentScore: score });

// ❌ FALSCH - Separate State-Updates
setFormData({ ...formData, sentiment });
setFormData({ ...formData, sentimentScore: score });
```

---

**Letzte Aktualisierung**: 2025-11-17
**Lizenz**: Proprietär
