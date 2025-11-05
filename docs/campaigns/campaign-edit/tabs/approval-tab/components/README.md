# ApprovalTab - Komponenten-Dokumentation

> **Modul**: ApprovalTab Components
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 5. Januar 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [ApprovalTab (Haupt-Komponente)](#approvaltab-haupt-komponente)
- [PDFWorkflowPreview](#pdfworkflowpreview)
- [ApprovalSettings (Shared)](#approvalsettings-shared)
- [Props-Referenz](#props-referenz)
- [State Management](#state-management)
- [Styling & Design](#styling--design)
- [Accessibility](#accessibility)
- [Code-Beispiele](#code-beispiele)
- [Common Patterns](#common-patterns)
- [Performance-Tipps](#performance-tipps)

---

## Übersicht

Das ApprovalTab-Modul besteht aus **3 Hauptkomponenten**:

1. **ApprovalTab** - Container-Komponente (70 Zeilen)
2. **PDFWorkflowPreview** - Workflow-Vorschau (56 Zeilen)
3. **ApprovalSettings** - Shared Component für Freigabe-Logik

### Komponenten-Hierarchie

```
ApprovalTab (React.memo)
├── FieldGroup
│   ├── div (Freigabe-Einstellungen)
│   │   ├── h3 (Heading)
│   │   ├── p (Description)
│   │   └── ApprovalSettings
│   │       ├── SimpleSwitch
│   │       ├── CustomerContactSelector
│   │       ├── Textarea
│   │       └── FeedbackChatView
│   │
│   └── PDFWorkflowPreview (React.memo)
│       ├── CheckCircleIcon
│       ├── h4 (Heading)
│       ├── Text (Description)
│       ├── div (Steps)
│       │   └── ArrowRightIcon + Text (per Step)
│       └── Text (Tipp)
```

---

## ApprovalTab (Haupt-Komponente)

**Pfad**: `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/ApprovalTab.tsx`

### Props Interface

```typescript
interface ApprovalTabProps {
  // Organization (Infrastructure)
  organizationId: string;  // Required: Multi-Tenancy-ID
}
```

### Vollständiger Code

```typescript
"use client";

import React, { useMemo } from 'react';
import { FieldGroup } from '@/components/ui/fieldset';
import ApprovalSettings from '@/components/campaigns/ApprovalSettings';
import { useCampaign } from '../context/CampaignContext';
import { PDFWorkflowPreview } from './components/PDFWorkflowPreview';

interface ApprovalTabProps {
  organizationId: string;
}

export default React.memo(function ApprovalTab({
  organizationId
}: ApprovalTabProps) {
  // Phase 3: Get all state from Context
  const {
    selectedCompanyId: clientId,
    selectedCompanyName: clientName,
    approvalData,
    updateApprovalData,
    previousFeedback
  } = useCampaign();

  // Computed: PDF Workflow Preview Data
  const pdfWorkflowData = useMemo(() => {
    const enabled = approvalData?.customerApprovalRequired || false;
    const estimatedSteps: string[] = [];

    if (enabled) {
      estimatedSteps.push('1. PDF wird automatisch generiert');
      estimatedSteps.push('2. Freigabe-Link wird an Kunde versendet');
      estimatedSteps.push('3. Kunde kann PDF prüfen und freigeben');
    }

    return { enabled, estimatedSteps };
  }, [approvalData]);

  return (
    <div className="bg-white rounded-lg border p-6">
      <FieldGroup>
        {/* Freigabe-Einstellungen */}
        <div className="mb-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Freigabe-Einstellungen
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Legen Sie fest, wer die Kampagne vor dem Versand freigeben muss.
            </p>
          </div>
          <ApprovalSettings
            value={approvalData}
            onChange={updateApprovalData}
            organizationId={organizationId}
            clientId={clientId}
            clientName={clientName}
            previousFeedback={previousFeedback}
          />
        </div>

        {/* PDF-Workflow Preview */}
        <PDFWorkflowPreview
          enabled={pdfWorkflowData.enabled}
          estimatedSteps={pdfWorkflowData.estimatedSteps}
        />
      </FieldGroup>
    </div>
  );
});
```

### Context Hooks

```typescript
const {
  selectedCompanyId: clientId,      // string - Kunde-ID
  selectedCompanyName: clientName,  // string - Kunde-Name
  approvalData,                     // ApprovalData | undefined
  updateApprovalData,               // (data: ApprovalData) => void
  previousFeedback                  // FeedbackItem[]
} = useCampaign();
```

### useMemo Optimization

**Zweck**: Verhindert unnötige Re-Berechnungen der Workflow-Steps.

```typescript
const pdfWorkflowData = useMemo(() => {
  // 1. Check if workflow is enabled
  const enabled = approvalData?.customerApprovalRequired || false;

  // 2. Build steps array (only if enabled)
  const estimatedSteps: string[] = [];
  if (enabled) {
    estimatedSteps.push('1. PDF wird automatisch generiert');
    estimatedSteps.push('2. Freigabe-Link wird an Kunde versendet');
    estimatedSteps.push('3. Kunde kann PDF prüfen und freigeben');
  }

  // 3. Return stable object
  return { enabled, estimatedSteps };
}, [approvalData]); // ⚡ Dependency: Nur bei approvalData-Änderung
```

**Performance-Gewinn**:
- Reduziert Re-Renders von PDFWorkflowPreview
- Stabilisiert Props-Referenzen
- Vermeidet Array-Konstruktion in jedem Render

### React.memo Wrapping

```typescript
export default React.memo(function ApprovalTab({ organizationId }) {
  // Component wird nur re-rendert wenn organizationId sich ändert
});
```

**Warum React.memo?**
- CampaignContext updated häufig (andere Tabs, Content-Änderungen)
- ApprovalTab sollte nur bei eigenen Props oder State re-rendern
- Reduziert CPU-Last bei aktiven Edit-Sessions

---

## PDFWorkflowPreview

**Pfad**: `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/tabs/components/PDFWorkflowPreview.tsx`

### Props Interface

```typescript
interface PDFWorkflowPreviewProps {
  enabled: boolean;         // Ist PDF-Workflow aktiviert?
  estimatedSteps: string[]; // Array von Workflow-Schritten
}
```

### Vollständiger Code

```typescript
"use client";

import React from 'react';
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';

interface PDFWorkflowPreviewProps {
  enabled: boolean;
  estimatedSteps: string[];
}

/**
 * PDFWorkflowPreview Komponente
 *
 * Zeigt eine Vorschau des PDF-Freigabe-Workflows an, wenn Kundenfreigabe aktiviert ist.
 * Informiert den User über die automatischen Schritte, die beim Speichern ausgeführt werden.
 *
 * @param enabled - Ob der PDF-Workflow aktiviert ist (customerApprovalRequired)
 * @param estimatedSteps - Array von Workflow-Schritten, die angezeigt werden
 */
export const PDFWorkflowPreview = React.memo(function PDFWorkflowPreview({
  enabled,
  estimatedSteps
}: PDFWorkflowPreviewProps) {
  // Early return: Nichts rendern wenn deaktiviert
  if (!enabled) return null;

  return (
    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
      <div className="flex items-start">
        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            ✅ PDF-Workflow bereit
          </h4>
          <Text className="text-sm text-green-700 mb-3">
            Beim Speichern wird automatisch ein vollständiger Freigabe-Workflow aktiviert:
          </Text>

          <div className="space-y-2">
            {estimatedSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                <ArrowRightIcon className="h-4 w-4" />
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-green-300">
            <Text className="text-xs text-green-600">
              💡 Tipp: Nach dem Speichern finden Sie alle Freigabe-Links und den aktuellen
              Status in Step 4 "Vorschau".
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
});
```

### Conditional Rendering

**Early Return Pattern**:
```typescript
if (!enabled) return null;
```

**Vorteile**:
- Kein DOM-Overhead wenn deaktiviert
- Schnellere Render-Performance
- Klarer Code-Flow

### Design-Breakdown

#### Container

```typescript
<div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
```

- `mt-6`: Top-Margin (Abstand zu ApprovalSettings)
- `p-4`: Padding für Innenabstand
- `bg-gradient-to-r from-green-50 to-blue-50`: Gradient-Hintergrund (visueller Appeal)
- `border border-green-200`: Subtile Border
- `rounded-lg`: Abgerundete Ecken

#### Icon-Layout

```typescript
<div className="flex items-start">
  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
  <div className="flex-1">...</div>
</div>
```

- `flex items-start`: Icon oben aligned
- `flex-shrink-0`: Icon behält Größe
- `mt-0.5`: Micro-adjustment für optische Alignment

#### Steps-Liste

```typescript
<div className="space-y-2">
  {estimatedSteps.map((step, index) => (
    <div key={index} className="flex items-center gap-2 text-sm text-green-700">
      <ArrowRightIcon className="h-4 w-4" />
      <span>{step}</span>
    </div>
  ))}
</div>
```

- `space-y-2`: Vertikaler Abstand zwischen Steps
- `gap-2`: Horizontaler Abstand Icon-Text
- `h-4 w-4`: Kleinere Icons für Steps

### Color Scheme

```typescript
// Semantic Green für "Bereit" Status
bg: 'from-green-50 to-blue-50'   // Gradient
border: 'border-green-200'        // Border
icon: 'text-green-500'            // Check Icon
heading: 'text-green-900'         // Heading
text: 'text-green-700'            // Body Text
separator: 'border-green-300'     // Separator Line
tip: 'text-green-600'             // Tip Text
```

---

## ApprovalSettings (Shared)

**Pfad**: `src/components/campaigns/ApprovalSettings.tsx`

### Props Interface

```typescript
interface ApprovalSettingsProps {
  value: SimplifiedApprovalData;
  onChange: (data: SimplifiedApprovalData) => void;
  organizationId: string;
  clientId?: string;
  clientName?: string;
  previousFeedback?: any[];
  currentApproval?: any;
}

interface SimplifiedApprovalData {
  customerApprovalRequired: boolean;
  customerContact?: {
    contactId: string;
    name: string;
    email: string;
  };
  customerApprovalMessage?: string;
}
```

### Verwendung

```typescript
<ApprovalSettings
  value={approvalData}
  onChange={updateApprovalData}
  organizationId="org-123"
  clientId="client-456"
  clientName="Mustermann GmbH"
  previousFeedback={[...]}
/>
```

### Sub-Komponenten

#### SimpleSwitch

Toggle für `customerApprovalRequired`:

```typescript
<SimpleSwitch
  enabled={localData.customerApprovalRequired}
  onChange={handleCustomerApprovalToggle}
  label="Kundenfreigabe erforderlich"
/>
```

#### CustomerContactSelector

Dropdown für Kontaktauswahl:

```typescript
<CustomerContactSelector
  organizationId={organizationId}
  clientId={clientId}
  value={localData.customerContact}
  onChange={(contact) => handleDataChange({ customerContact: contact })}
/>
```

#### Textarea (Optional Message)

```typescript
<Textarea
  value={localData.customerApprovalMessage || ''}
  onChange={(e) => handleDataChange({ customerApprovalMessage: e.target.value })}
  placeholder="Optionale Nachricht an den Kunden..."
  rows={3}
/>
```

#### FeedbackChatView (Historie)

```typescript
<FeedbackChatView
  feedback={previousFeedback}
  teamMembers={teamMembers}
/>
```

---

## Props-Referenz

### ApprovalTab Props

| Prop | Typ | Required | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| `organizationId` | `string` | ✅ | - | Multi-Tenancy-ID für Organization |

### PDFWorkflowPreview Props

| Prop | Typ | Required | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| `enabled` | `boolean` | ✅ | - | Ob PDF-Workflow aktiviert ist |
| `estimatedSteps` | `string[]` | ✅ | - | Array von Workflow-Schritten |

### ApprovalSettings Props

| Prop | Typ | Required | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| `value` | `SimplifiedApprovalData` | ✅ | - | Aktuelle Freigabe-Daten |
| `onChange` | `(data) => void` | ✅ | - | Callback bei Änderungen |
| `organizationId` | `string` | ✅ | - | Organization-ID |
| `clientId` | `string` | ❌ | `undefined` | Client-ID (optional) |
| `clientName` | `string` | ❌ | `undefined` | Client-Name (optional) |
| `previousFeedback` | `any[]` | ❌ | `[]` | Feedback-Historie |
| `currentApproval` | `any` | ❌ | `undefined` | Aktuelle Freigabe |

---

## State Management

### Lokaler State (ApprovalSettings)

```typescript
const [localData, setLocalData] = useState<SimplifiedApprovalData>(value);
const [showHistoryModal, setShowHistoryModal] = useState(false);
const [teamMembers, setTeamMembers] = useState<any[]>([]);
```

**Warum lokaler State?**
- Controlled Component Pattern
- Sync mit Props über `useEffect`
- Ermöglicht optimistic UI updates

### State-Synchronisation

```typescript
// Sync local state with props
useEffect(() => {
  setLocalData(value);
}, [value]);
```

### Update-Handler

```typescript
const handleDataChange = (updates: Partial<SimplifiedApprovalData>) => {
  const newData = { ...localData, ...updates };
  setLocalData(newData);      // 1. Update lokal
  onChange(newData);          // 2. Notify parent
};
```

---

## Styling & Design

### Design System Klassen

#### Container

```css
/* ApprovalTab Container */
.bg-white          /* Weißer Hintergrund */
.rounded-lg        /* Abgerundete Ecken (8px) */
.border            /* Subtile Border (zinc-300) */
.p-6               /* Padding 24px */
```

#### Typography

```css
/* Heading */
.text-lg           /* 18px */
.font-semibold     /* 600 */
.text-gray-900     /* Heading-Farbe (zinc-900) */

/* Description */
.text-sm           /* 14px */
.text-gray-600     /* Secondary-Text (zinc-600) */
.mt-1              /* Margin-Top 4px */
```

#### Gradient Background (PDFWorkflowPreview)

```css
.bg-gradient-to-r from-green-50 to-blue-50
```

**Warum Gradient?**
- Visueller Appeal ohne Ablenkung
- Hebt wichtige Info hervor (Workflow bereit)
- Sanfter Übergang Green → Blue

### Spacing-System

```typescript
// Tailwind Spacing
mt-1  = 4px    // Text-Spacing
mt-3  = 12px   // Section-Spacing
mt-6  = 24px   // Component-Spacing
mb-2  = 8px    // Heading-Bottom
mb-4  = 16px   // Section-Bottom
mb-6  = 24px   // Large-Section-Bottom
p-4   = 16px   // Padding
p-6   = 24px   // Large-Padding
```

### Icon-System (Heroicons)

```typescript
import {
  CheckCircleIcon,      // ✅ Success/Bereit
  ArrowRightIcon,       // → Step-Indicator
  InformationCircleIcon // ℹ️ Info
} from '@heroicons/react/24/outline';
```

**Best Practices**:
- Nur `/24/outline` verwenden (konsistent)
- Icon-Größen: `h-5 w-5` (Standard), `h-4 w-4` (klein)
- Semantic Colors: `text-green-500`, `text-blue-500`

---

## Accessibility

### Heading-Hierarchie

```typescript
<h3>Freigabe-Einstellungen</h3>      // Main Section
  <h4>✅ PDF-Workflow bereit</h4>     // Sub-Section
```

**Korrekte Hierarchie**:
- Tab-Titel: `h2` (außerhalb ApprovalTab)
- Section-Titel: `h3`
- Sub-Section: `h4`

### Beschreibender Text

```typescript
<p className="text-sm text-gray-600 mt-1">
  Legen Sie fest, wer die Kampagne vor dem Versand freigeben muss.
</p>
```

**Best Practices**:
- Klare Erklärung des Zwecks
- Unter Heading platziert
- Visually separated (mt-1, lighter color)

### Keyboard Navigation

- **SimpleSwitch**: Fokussierbar mit Tab
- **CustomerContactSelector**: Dropdown mit Keyboard-Support
- **Textarea**: Standard-Fokus und Input
- **Buttons**: Tab-Navigation und Enter/Space

### Screen Reader Support

```typescript
// Icon mit visual-only purpose
<CheckCircleIcon className="..." aria-hidden="true" />

// Text ist ausreichend
<span>✅ PDF-Workflow bereit</span>
```

---

## Code-Beispiele

### Beispiel 1: Basic Integration

```typescript
import ApprovalTab from './tabs/ApprovalTab';
import { CampaignProvider } from './context/CampaignContext';

export default function CampaignEditPage({ params }) {
  return (
    <CampaignProvider
      campaignId={params.campaignId}
      organizationId={params.organizationId}
    >
      <div className="max-w-7xl mx-auto">
        <ApprovalTab organizationId={params.organizationId} />
      </div>
    </CampaignProvider>
  );
}
```

### Beispiel 2: Custom Workflow Steps

```typescript
const pdfWorkflowData = useMemo(() => {
  const enabled = approvalData?.customerApprovalRequired || false;
  const estimatedSteps: string[] = [];

  if (enabled) {
    // Standard Steps
    estimatedSteps.push('1. PDF wird automatisch generiert');
    estimatedSteps.push('2. Freigabe-Link wird an Kunde versendet');
    estimatedSteps.push('3. Kunde kann PDF prüfen und freigeben');

    // Custom: Additional Info
    if (approvalData?.customerContact) {
      estimatedSteps.push(
        `4. Benachrichtigung an ${approvalData.customerContact.name}`
      );
    }

    if (approvalData?.customerApprovalMessage) {
      estimatedSteps.push('5. Persönliche Nachricht wird angehängt');
    }
  }

  return { enabled, estimatedSteps };
}, [approvalData]);
```

### Beispiel 3: Conditional Preview mit Custom Styling

```typescript
<PDFWorkflowPreview
  enabled={pdfWorkflowData.enabled}
  estimatedSteps={pdfWorkflowData.estimatedSteps}
  // Optional: Custom className (wenn erweitert)
/>

// Oder: Wrapper mit eigener Logik
{pdfWorkflowData.enabled && approvalData?.customerContact && (
  <PDFWorkflowPreview
    enabled={true}
    estimatedSteps={pdfWorkflowData.estimatedSteps}
  />
)}
```

### Beispiel 4: Testing mit Mock-Data

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApprovalTab from './ApprovalTab';
import { CampaignProvider } from '../context/CampaignContext';

// Mock-Setup
jest.mock('@/lib/firebase/pr-service', () => ({
  prService: {
    getById: jest.fn().mockResolvedValue({
      id: 'test-campaign',
      approvalData: {
        customerApprovalRequired: true,
        customerContact: {
          contactId: 'contact-1',
          name: 'Max Mustermann',
          email: 'max@example.com'
        }
      }
    })
  }
}));

test('shows workflow preview when approval enabled', async () => {
  render(
    <CampaignProvider campaignId="test-campaign" organizationId="test-org">
      <ApprovalTab organizationId="test-org" />
    </CampaignProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('✅ PDF-Workflow bereit')).toBeInTheDocument();
    expect(screen.getByText('1. PDF wird automatisch generiert')).toBeInTheDocument();
  });
});
```

---

## Common Patterns

### Pattern 1: Context-basierte Komponente

```typescript
export default React.memo(function ApprovalTab({ organizationId }) {
  // ✅ Hole alle Daten aus Context
  const { approvalData, updateApprovalData, ... } = useCampaign();

  // ✅ Berechne abgeleitete Daten mit useMemo
  const computedData = useMemo(() => {
    // ...
  }, [approvalData]);

  // ✅ Render mit Context-Daten
  return <div>...</div>;
});
```

### Pattern 2: Controlled Sub-Component

```typescript
<ApprovalSettings
  value={approvalData}           // ✅ Controlled value
  onChange={updateApprovalData}  // ✅ Parent handles changes
  organizationId={organizationId}
/>
```

### Pattern 3: Conditional Rendering mit Early Return

```typescript
export function PDFWorkflowPreview({ enabled, estimatedSteps }) {
  if (!enabled) return null; // ✅ Early return

  return <div>...</div>;
}
```

### Pattern 4: useMemo für Computed Props

```typescript
const pdfWorkflowData = useMemo(() => {
  // ✅ Komplexe Berechnung nur bei Dependency-Change
  return { enabled, estimatedSteps };
}, [approvalData]);

<PDFWorkflowPreview
  enabled={pdfWorkflowData.enabled}
  estimatedSteps={pdfWorkflowData.estimatedSteps}
/>
```

---

## Performance-Tipps

### 1. React.memo für Container-Komponenten

```typescript
// ✅ DO
export default React.memo(function ApprovalTab({ organizationId }) {
  // ...
});

// ❌ DON'T
export default function ApprovalTab({ organizationId }) {
  // Rendert bei jedem Context-Update (auch wenn irrelevant)
}
```

### 2. useMemo für berechnete Daten

```typescript
// ✅ DO
const pdfWorkflowData = useMemo(() => {
  return { enabled, estimatedSteps };
}, [approvalData]);

// ❌ DON'T
const pdfWorkflowData = {
  enabled: approvalData?.customerApprovalRequired || false,
  estimatedSteps: [...]
}; // Neue Referenz in jedem Render
```

### 3. Early Return in Conditional Components

```typescript
// ✅ DO
if (!enabled) return null;

// ❌ DON'T
return enabled ? <div>...</div> : null; // Komplexe JSX wird immer geparst
```

### 4. Stable Callback References

```typescript
// ✅ DO (im Context)
const updateApprovalData = useCallback((data) => {
  // ...
}, []);

// ❌ DON'T
const updateApprovalData = (data) => {
  // Neue Funktion in jedem Render
};
```

### 5. Vermeiden von Inline-Objekten als Props

```typescript
// ✅ DO
const pdfWorkflowData = useMemo(() => ({ ... }), [deps]);
<PDFWorkflowPreview {...pdfWorkflowData} />

// ❌ DON'T
<PDFWorkflowPreview
  data={{ enabled: true, steps: [...] }} // Neue Referenz
/>
```

---

**Letzte Aktualisierung**: 5. Januar 2025
**Dokumentiert von**: Claude Code
