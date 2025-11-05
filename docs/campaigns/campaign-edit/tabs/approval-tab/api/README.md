# ApprovalTab - API & Context Dokumentation

> **Modul**: ApprovalTab API & CampaignContext Integration
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 5. Januar 2025

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [CampaignContext API](#campaigncontext-api)
- [ApprovalData Struktur](#approvaldata-struktur)
- [Context Hooks](#context-hooks)
- [Update-Mechanismen](#update-mechanismen)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)
- [Code-Beispiele](#code-beispiele)
- [Best Practices](#best-practices)

---

## Übersicht

Der **ApprovalTab** verwendet **KEIN React Query** für Daten-Fetching. Stattdessen nutzt er ausschließlich den **CampaignContext** für State Management.

### Architektur-Prinzipien

✅ **Zentrale State-Verwaltung** - Alle Campaign-Daten in einem Context
✅ **Optimistic Updates** - Sofortige UI-Updates ohne API-Calls
✅ **Toast-Integration** - Feedback über CampaignContext
✅ **Keine Redundanz** - Ein Source of Truth (Context)

### Warum kein React Query?

```typescript
// ❌ FALSCH: React Query würde zu Redundanz führen
const { data: campaign } = useQuery(['campaign', campaignId], fetchCampaign);
const { mutate } = useMutation(updateApprovalData);

// ✅ RICHTIG: Context als Single Source of Truth
const { approvalData, updateApprovalData } = useCampaign();
```

**Vorteile**:
- Keine doppelte State-Verwaltung
- Synchrone Updates über alle Tabs
- Einfacheres Error Handling
- Weniger Code

---

## CampaignContext API

**Pfad**: `src/app/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]/context/CampaignContext.tsx`

### Context Provider

```typescript
interface CampaignProviderProps {
  children: React.ReactNode;
  campaignId: string;
  organizationId: string;
}

export function CampaignProvider({
  children,
  campaignId,
  organizationId
}: CampaignProviderProps) {
  // Interner State und Logik
  // ...

  return (
    <CampaignContext.Provider value={contextValue}>
      {children}
    </CampaignContext.Provider>
  );
}
```

### Context Value Interface

```typescript
interface CampaignContextValue {
  // Core Campaign State
  campaign: PRCampaign | null;
  loading: boolean;
  saving: boolean;

  // Navigation
  activeTab: 1 | 2 | 3 | 4;
  setActiveTab: (tab: 1 | 2 | 3 | 4) => void;

  // Campaign Actions
  setCampaign: (campaign: PRCampaign | null) => void;
  updateField: (field: keyof PRCampaign, value: any) => void;
  saveCampaign: () => Promise<void>;
  reloadCampaign: () => Promise<void>;

  // Content States
  campaignTitle: string;
  editorContent: string;
  pressReleaseContent: string;
  updateTitle: (title: string) => void;
  updateEditorContent: (content: string) => void;
  updatePressReleaseContent: (content: string) => void;

  // SEO States
  keywords: string[];
  updateKeywords: (keywords: string[]) => void;
  seoScore: any;
  updateSeoScore: (scoreData: any) => void;

  // Visual States
  keyVisual: KeyVisualData | undefined;
  updateKeyVisual: (visual: KeyVisualData | undefined) => void;

  // Boilerplates States
  boilerplateSections: BoilerplateSection[];
  updateBoilerplateSections: (sections: BoilerplateSection[]) => void;

  // Assets States
  attachedAssets: CampaignAssetAttachment[];
  updateAttachedAssets: (assets: CampaignAssetAttachment[]) => void;
  removeAsset: (assetId: string) => void;

  // Company & Project States
  selectedCompanyId: string;
  selectedCompanyName: string;
  selectedProjectId: string;
  selectedProjectName: string | undefined;
  selectedProject: Project | null;
  dokumenteFolderId: string | undefined;
  updateCompany: (companyId: string, companyName: string) => void;
  updateProject: (projectId: string, projectName?: string, project?: Project | null) => void;
  updateDokumenteFolderId: (folderId: string | undefined) => void;

  // Approval States (relevant für ApprovalTab)
  approvalData: any;
  updateApprovalData: (data: any) => void;
  previousFeedback: any[];

  // Template States
  selectedTemplateId: string | undefined;
  updateSelectedTemplate: (templateId: string, templateName?: string) => void;

  // PDF Generation
  generatingPdf: boolean;
  currentPdfVersion: PDFVersion | null;
  generatePdf: (forApproval?: boolean) => Promise<void>;

  // Edit Lock
  editLockStatus: EditLockData;
  loadingEditLock: boolean;

  // Approval Workflow
  approvalLoading: boolean;
  submitForApproval: () => Promise<void>;
  approveCampaign: (approved: boolean, note?: string) => Promise<void>;
}
```

### Für ApprovalTab relevante Properties

```typescript
// Aus CampaignContext
{
  // Approval-spezifisch
  approvalData: ApprovalData | undefined;
  updateApprovalData: (data: ApprovalData) => void;
  previousFeedback: FeedbackItem[];

  // Company/Client Info
  selectedCompanyId: string;
  selectedCompanyName: string;

  // Saving State
  saving: boolean;

  // Toast-Integration (implizit)
  // saveCampaign() triggert toastService.success/error
}
```

---

## ApprovalData Struktur

### TypeScript Interface

```typescript
interface ApprovalData {
  // Haupt-Toggle
  customerApprovalRequired: boolean;

  // Kontakt-Informationen
  customerContact?: {
    contactId: string;    // ID des Kontakts
    name: string;         // Display-Name
    email: string;        // E-Mail-Adresse
  };

  // Optionale Nachricht
  customerApprovalMessage?: string;

  // Feedback-Historie
  feedbackHistory?: Array<{
    comment: string;
    requestedAt: Date;
    author: string;
    authorName?: string;
  }>;
}
```

### Default-Werte

```typescript
const defaultApprovalData: ApprovalData = {
  customerApprovalRequired: false,
  customerContact: undefined,
  customerApprovalMessage: '',
  feedbackHistory: []
};
```

### Beispiel-Daten

```typescript
// Freigabe aktiviert mit Kontakt
const approvalDataWithContact: ApprovalData = {
  customerApprovalRequired: true,
  customerContact: {
    contactId: 'contact-abc123',
    name: 'Max Mustermann',
    email: 'max.mustermann@example.com'
  },
  customerApprovalMessage: 'Bitte prüfen Sie die Kampagne und geben Sie Feedback.',
  feedbackHistory: [
    {
      comment: 'Bitte das Datum anpassen.',
      requestedAt: new Date('2025-01-03T10:30:00'),
      author: 'user-xyz',
      authorName: 'Sarah Schmidt'
    }
  ]
};

// Freigabe deaktiviert
const approvalDataDisabled: ApprovalData = {
  customerApprovalRequired: false,
  customerContact: undefined,
  customerApprovalMessage: undefined,
  feedbackHistory: []
};
```

---

## Context Hooks

### useCampaign Hook

**Import**:
```typescript
import { useCampaign } from '../context/CampaignContext';
```

**Verwendung im ApprovalTab**:

```typescript
export default React.memo(function ApprovalTab({ organizationId }) {
  // 1. Destructure relevante Properties
  const {
    selectedCompanyId: clientId,
    selectedCompanyName: clientName,
    approvalData,
    updateApprovalData,
    previousFeedback
  } = useCampaign();

  // 2. Nutze Daten in Render
  return (
    <ApprovalSettings
      value={approvalData}
      onChange={updateApprovalData}
      clientId={clientId}
      clientName={clientName}
      previousFeedback={previousFeedback}
    />
  );
});
```

### Error Handling

```typescript
export function useCampaign() {
  const context = useContext(CampaignContext);

  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }

  return context;
}
```

**Fehlermeldung bei falschem Setup**:
```
Error: useCampaign must be used within a CampaignProvider
```

---

## Update-Mechanismen

### updateApprovalData Funktion

**Interne Implementierung im Context**:

```typescript
const updateApprovalData = useCallback((data: any) => {
  // 1. Update lokalen State
  setApprovalData(data);

  // 2. Update Campaign-Objekt
  setCampaign(prev => prev ? {
    ...prev,
    approvalData: data
  } : null);

  // 3. hasUnsavedChanges Flag setzen
  setHasUnsavedChanges(true);
}, []);
```

**Aufruf aus ApprovalTab**:

```typescript
// 1. User ändert Einstellung
<ApprovalSettings
  value={approvalData}
  onChange={(newData) => {
    // 2. Update Context
    updateApprovalData(newData);
  }}
/>
```

### Optimistic Updates

Updates sind **synchron** und **sofort** sichtbar:

```typescript
// ✅ Sofortige UI-Aktualisierung
updateApprovalData({ customerApprovalRequired: true });

// UI updated SOFORT (kein API-Call)
// Speichern erfolgt später via saveCampaign()
```

### Save-Flow

```typescript
// 1. User klickt "Speichern" (außerhalb ApprovalTab)
<Button onClick={saveCampaign}>Speichern</Button>

// 2. Context sammelt alle Changes
const saveCampaign = async () => {
  setSaving(true);

  try {
    // 3. API-Call mit allen Daten
    await prService.update(campaignId, {
      ...campaign,
      approvalData, // ← Enthält Updates aus ApprovalTab
      updatedAt: new Date()
    });

    // 4. Toast-Feedback
    toastService.success('Kampagne erfolgreich gespeichert');
    setHasUnsavedChanges(false);
  } catch (error) {
    toastService.error('Fehler beim Speichern');
  } finally {
    setSaving(false);
  }
};
```

---

## Type Definitions

### PRCampaign Interface (relevant für Approval)

```typescript
interface PRCampaign {
  id: string;
  organizationId: string;
  clientId: string;
  clientName: string;
  projectId: string;

  // Content
  title: string;
  mainContent: string;
  contentHtml: string;
  keywords: string[];

  // Approval-Daten
  approvalData?: ApprovalData;

  // Status
  status: 'draft' | 'scheduled' | 'sent' | 'archived';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### CustomerContact Interface

```typescript
interface CustomerContact {
  contactId: string;   // Eindeutige ID
  name: string;        // Vollständiger Name
  email: string;       // E-Mail-Adresse
  phone?: string;      // Optional: Telefonnummer
}
```

### FeedbackItem Interface

```typescript
interface FeedbackItem {
  comment: string;        // Feedback-Text
  requestedAt: Date;      // Zeitpunkt
  author: string;         // User-ID
  authorName?: string;    // Display-Name
  resolved?: boolean;     // Optional: Erledigt-Status
}
```

---

## Error Handling

### Context-Fehler

**Problem**: Context außerhalb Provider verwendet

```typescript
// ❌ FALSCH
function SomeComponent() {
  const { approvalData } = useCampaign(); // Error!
}
```

**Lösung**: Component in CampaignProvider wrappen

```typescript
// ✅ RICHTIG
<CampaignProvider campaignId="..." organizationId="...">
  <SomeComponent />
</CampaignProvider>
```

### Null-Check für approvalData

```typescript
// ❌ FALSCH: Kann zu TypeError führen
const enabled = approvalData.customerApprovalRequired;

// ✅ RICHTIG: Optional Chaining
const enabled = approvalData?.customerApprovalRequired || false;
```

### Update-Fehler abfangen

```typescript
const handleApprovalToggle = async (enabled: boolean) => {
  try {
    updateApprovalData({
      ...approvalData,
      customerApprovalRequired: enabled
    });
  } catch (error) {
    console.error('Fehler beim Update:', error);
    toastService.error('Aktualisierung fehlgeschlagen');
  }
};
```

---

## Code-Beispiele

### Beispiel 1: Basic Usage

```typescript
import { useCampaign } from '../context/CampaignContext';

export default function ApprovalTab({ organizationId }) {
  // Hole Daten aus Context
  const {
    approvalData,
    updateApprovalData,
    selectedCompanyId,
    selectedCompanyName,
    previousFeedback
  } = useCampaign();

  return (
    <div>
      <h3>Freigabe für: {selectedCompanyName}</h3>
      <ApprovalSettings
        value={approvalData}
        onChange={updateApprovalData}
        organizationId={organizationId}
        clientId={selectedCompanyId}
      />
    </div>
  );
}
```

### Beispiel 2: Conditional Rendering basierend auf approvalData

```typescript
const { approvalData } = useCampaign();

// Check if approval is required
if (approvalData?.customerApprovalRequired) {
  return <PDFWorkflowPreview enabled={true} />;
}

// Show different UI when disabled
return (
  <div className="text-gray-500">
    Kundenfreigabe ist deaktiviert
  </div>
);
```

### Beispiel 3: Custom Update-Handler

```typescript
const { approvalData, updateApprovalData } = useCampaign();

const handleContactSelect = (contact: CustomerContact) => {
  updateApprovalData({
    ...approvalData,
    customerContact: contact,
    // Auto-enable wenn Kontakt ausgewählt
    customerApprovalRequired: true
  });
};

const handleMessageChange = (message: string) => {
  updateApprovalData({
    ...approvalData,
    customerApprovalMessage: message
  });
};
```

### Beispiel 4: Testing mit Mock-Context

```typescript
import { CampaignContext } from '../context/CampaignContext';

const mockContextValue = {
  approvalData: {
    customerApprovalRequired: true,
    customerContact: {
      contactId: 'test-contact',
      name: 'Test User',
      email: 'test@example.com'
    }
  },
  updateApprovalData: jest.fn(),
  selectedCompanyId: 'test-company',
  selectedCompanyName: 'Test Company GmbH',
  previousFeedback: []
};

test('renders with mock context', () => {
  render(
    <CampaignContext.Provider value={mockContextValue}>
      <ApprovalTab organizationId="test-org" />
    </CampaignContext.Provider>
  );

  expect(screen.getByText('Test Company GmbH')).toBeInTheDocument();
});
```

### Beispiel 5: Feedback-Historie anzeigen

```typescript
const { previousFeedback } = useCampaign();

return (
  <div>
    <h4>Bisheriges Feedback ({previousFeedback.length})</h4>
    {previousFeedback.map((item, index) => (
      <div key={index} className="border-l-2 border-blue-500 pl-4 my-2">
        <p className="text-sm text-gray-700">{item.comment}</p>
        <p className="text-xs text-gray-500">
          {item.authorName} - {new Date(item.requestedAt).toLocaleDateString()}
        </p>
      </div>
    ))}
  </div>
);
```

---

## Best Practices

### 1. Immer Safe Navigation verwenden

```typescript
// ✅ DO
const enabled = approvalData?.customerApprovalRequired || false;
const contactName = approvalData?.customerContact?.name || 'Kein Kontakt';

// ❌ DON'T
const enabled = approvalData.customerApprovalRequired; // TypeError wenn undefined
```

### 2. Partielle Updates bevorzugen

```typescript
// ✅ DO: Spread existing data
updateApprovalData({
  ...approvalData,
  customerApprovalRequired: true
});

// ❌ DON'T: Replace entire object
updateApprovalData({
  customerApprovalRequired: true
  // customerContact geht verloren!
});
```

### 3. Type-Safety nutzen

```typescript
// ✅ DO: Explizite Typen
const handleUpdate = (data: ApprovalData) => {
  updateApprovalData(data);
};

// ❌ DON'T: Any-Type
const handleUpdate = (data: any) => {
  updateApprovalData(data);
};
```

### 4. Context nur in Top-Level-Component destructuren

```typescript
// ✅ DO
function ApprovalTab() {
  const { approvalData, updateApprovalData } = useCampaign();

  return <ApprovalSettings value={approvalData} onChange={updateApprovalData} />;
}

// ❌ DON'T: Mehrfach in Sub-Components
function SubComponent() {
  const { approvalData } = useCampaign(); // Redundant
}
```

### 5. Optimistic UI Updates

```typescript
// ✅ DO: Sofortige UI-Änderung
const handleToggle = (enabled: boolean) => {
  updateApprovalData({ ...approvalData, customerApprovalRequired: enabled });
  // UI updated sofort, Save passiert später
};

// ❌ DON'T: Auf Save warten
const handleToggle = async (enabled: boolean) => {
  await saveCampaign(); // Slow UX
  updateApprovalData({ ...approvalData, customerApprovalRequired: enabled });
};
```

### 6. Toast-Feedback zentral im Context

```typescript
// ✅ DO: saveCampaign() handled Toast
<Button onClick={saveCampaign}>Speichern</Button>

// ❌ DON'T: Eigene Toasts in ApprovalTab
const handleSave = async () => {
  await saveCampaign();
  toastService.success('Gespeichert'); // Redundant
};
```

---

**Letzte Aktualisierung**: 5. Januar 2025
**Dokumentiert von**: Claude Code
