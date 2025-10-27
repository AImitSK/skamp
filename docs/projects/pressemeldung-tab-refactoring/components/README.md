# Pressemeldung Tab - Komponenten-Dokumentation

> **Modul**: Pressemeldung Tab Komponenten
> **Version**: 0.1.0
> **Status**: ✅ Produktiv
> **Letzte Aktualisierung**: 2025-10-27

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Hauptkomponenten](#hauptkomponenten)
  - [ProjectPressemeldungenTab](#projectpressemeldungentab)
  - [PressemeldungCampaignTable](#pressemeldungcampaigntable)
  - [PressemeldungApprovalTable](#pressemeldungapprovaltable)
  - [PressemeldungToggleSection](#pressemeldungtogglesection)
- [Sub-Komponenten](#sub-komponenten)
  - [CampaignTableRow](#campaigntablerow)
  - [ApprovalTableRow](#approvaltablerow)
  - [EmptyState](#emptystate)
  - [ToggleDataHelpers](#toggledatahelpers)
- [Styling Guidelines](#styling-guidelines)
- [Accessibility](#accessibility)
- [Performance-Tipps](#performance-tipps)
- [Common Patterns](#common-patterns)
- [Siehe auch](#siehe-auch)

---

## Übersicht

Das Pressemeldung Tab Modul besteht aus **4 Hauptkomponenten** und **4 Sub-Komponenten**, die zusammen eine vollständige Verwaltungsoberfläche für PR-Kampagnen und Freigaben bieten.

### Komponenten-Hierarchie

```
ProjectPressemeldungenTab (Main)
├── PressemeldungCampaignTable
│   ├── CampaignTableRow (x N)
│   │   ├── Dialog (Delete Confirmation)
│   │   └── Dropdown (Actions)
│   ├── EmptyState
│   └── EmailSendModal
│
├── PressemeldungApprovalTable
│   ├── ApprovalTableRow (x N)
│   │   └── Dropdown (Actions)
│   └── EmptyState
│
└── PressemeldungToggleSection
    ├── MediaToggleBox (Dynamic Import)
    ├── PDFHistoryToggleBox (Dynamic Import)
    ├── CommunicationToggleBox (Dynamic Import)
    └── EmptyState
```

### Komponenten-Statistik

| Komponente | Zeilen | Props | Tests | Memoized |
|------------|--------|-------|-------|----------|
| ProjectPressemeldungenTab | 206 | 2 | 22 | ❌ |
| PressemeldungCampaignTable | 116 | 3 | 14 | ❌ |
| PressemeldungApprovalTable | 60 | 2 | 12 | ❌ |
| PressemeldungToggleSection | 281 | 3 | 14 | ❌ |
| CampaignTableRow | 238 | 4 | 23 | ✅ |
| ApprovalTableRow | 148 | 2 | 40 | ✅ |
| EmptyState | 45 | 4 | 23 | ✅ |
| ToggleDataHelpers | 97 | - | - | - |

---

## Hauptkomponenten

## ProjectPressemeldungenTab

**Hauptkomponente** des Pressemeldung Tab Moduls. Orchestriert alle Sub-Komponenten und verwaltet den globalen State.

### Props

```typescript
interface Props {
  projectId: string;         // ID des Projekts
  organizationId: string;    // ID der Organisation (Multi-Tenancy)
}
```

### State

```typescript
const [showConfirmDialog, setShowConfirmDialog] = useState(false);  // Bestätigungsdialog
const [isCreating, setIsCreating] = useState(false);                // Erstell-Status
```

### Hooks

```typescript
const { campaigns, approvals, isLoading, refetch } = useProjectPressData(
  projectId,
  organizationId
);

const router = useRouter();  // Next.js Navigation
```

### Funktionen

#### handleCreateCampaign

Erstellt eine neue Pressemeldung via `projectService.initializeProjectResources()`.

```typescript
const handleCreateCampaign = useCallback(async () => {
  setIsCreating(true);
  try {
    // 1. Lade Projekt-Daten für Titel
    const project = await projectService.getById(projectId, { organizationId });
    if (!project) {
      throw new Error('Projekt nicht gefunden');
    }

    // 2. Erstelle Kampagne (gleiche Funktion wie im Wizard)
    const result = await projectService.initializeProjectResources(
      projectId,
      {
        createCampaign: true,
        campaignTitle: `${project.title} - PR-Kampagne`,
        attachAssets: [],
        linkDistributionLists: [],
        createTasks: false,
        notifyTeam: false
      },
      organizationId
    );

    // 3. Weiterleitung zur Edit-Seite
    if (result.campaignCreated && result.campaignId) {
      toastService.success('Pressemeldung erfolgreich erstellt');
      setShowConfirmDialog(false);
      router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${result.campaignId}`);
    }
  } catch (error) {
    console.error('Fehler beim Erstellen der Pressemeldung:', error);
    toastService.error('Fehler beim Erstellen der Pressemeldung');
  } finally {
    setIsCreating(false);
  }
}, [projectId, organizationId, router]);
```

**Warum `useCallback`?**
- Verhindert Re-Renders des Dialog-Components
- Stabile Referenz für Event-Handler

### Berechnete Werte

```typescript
const hasLinkedCampaign = useMemo(() => campaigns.length > 0, [campaigns.length]);
```

**Zweck:**
- Deaktiviert "Meldung Erstellen" Button wenn bereits Kampagne existiert
- Nur neu berechnen wenn `campaigns.length` sich ändert

### Verwendungsbeispiel

```tsx
import ProjectPressemeldungenTab from '@/components/projects/pressemeldungen/ProjectPressemeldungenTab';

function ProjectDetailPage({ params }) {
  const { user } = useAuth();

  return (
    <div>
      <ProjectPressemeldungenTab
        projectId={params.projectId}
        organizationId={user.organizationId}
      />
    </div>
  );
}
```

### Render-Struktur

```tsx
<div className="space-y-6">
  {/* Header mit Create-Button */}
  <div className="flex justify-between items-center">
    <Heading level={3}>Pressemeldung</Heading>
    <div className="flex items-center gap-2">
      <Button
        onClick={() => setShowConfirmDialog(true)}
        disabled={hasLinkedCampaign}
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Meldung Erstellen
      </Button>

      {/* Actions Menu (Boilerplate, PDF Template) */}
      <Popover>
        {/* ... */}
      </Popover>
    </div>
  </div>

  {/* Kampagnen-Tabelle */}
  <PressemeldungCampaignTable
    campaigns={campaigns}
    organizationId={organizationId}
    onRefresh={refetch}
  />

  {/* Freigabe-Tabelle */}
  <div className="space-y-4">
    <Heading level={3}>Freigabe</Heading>
    <PressemeldungApprovalTable
      approvals={approvals}
      onRefresh={refetch}
    />
  </div>

  {/* Toggle-Bereiche (nur wenn Freigaben vorhanden) */}
  {approvals.length > 0 && (
    <div className="space-y-4">
      <Heading level={3}>Freigabe-Details</Heading>
      <PressemeldungToggleSection
        projectId={projectId}
        campaignId={campaigns[0]?.id}
        organizationId={organizationId}
      />
    </div>
  )}

  {/* Bestätigungs-Dialog */}
  <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
    {/* ... */}
  </Dialog>
</div>
```

### Loading State

```tsx
if (isLoading) {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}
```

**Design:**
- Skeleton Loader mit Pulsier-Animation
- Grobe Form der finalen UI
- Gleiche Spacing wie echte UI

### Best Practices

1. **Immer organizationId übergeben** (Multi-Tenancy)
2. **useCallback für Event-Handler** (Performance)
3. **useMemo für berechnete Werte** (Performance)
4. **Dialog statt window.confirm** (bessere UX)
5. **Toast Notifications** für Feedback

---

## PressemeldungCampaignTable

Tabellenansicht für alle Kampagnen eines Projekts.

### Props

```typescript
interface Props {
  campaigns: PRCampaign[];      // Array der Kampagnen
  organizationId: string;       // ID der Organisation
  onRefresh: () => void;        // Callback für Daten-Refresh
}
```

### State

```typescript
const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
const [loading, setLoading] = useState(true);
const [showSendModal, setShowSendModal] = useState<PRCampaign | null>(null);
```

### Funktionen

#### loadTeamMembers

Lädt Team-Mitglieder für Avatar-Anzeige.

```typescript
useEffect(() => {
  const loadTeamMembers = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      const members = await teamMemberService.getByOrganization(organizationId);
      setTeamMembers(members);
    } catch (error) {
      console.log('Fehler beim Laden der TeamMembers:', error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  loadTeamMembers();
}, [organizationId]);
```

### Callbacks

```typescript
const handleCloseModal = useCallback(() => {
  setShowSendModal(null);
}, []);

const handleSentSuccess = useCallback(() => {
  setShowSendModal(null);
  onRefresh();
}, [onRefresh]);
```

### Verwendungsbeispiel

```tsx
<PressemeldungCampaignTable
  campaigns={campaigns}
  organizationId={organizationId}
  onRefresh={refetch}
/>
```

### Tabellen-Struktur

```tsx
<div className="bg-white rounded-lg shadow-sm overflow-hidden">
  {/* Header */}
  <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
    <div className="flex items-center">
      <div className="w-[35%]">Kampagne</div>
      <div className="w-[15%]">Status</div>
      <div className="w-[12%]">Admin</div>
      <div className="w-[15%]">Erstellt am</div>
      <div className="flex-1">Versenden</div>
    </div>
  </div>

  {/* Body */}
  <div className="divide-y divide-gray-200">
    {campaigns.map((campaign) => (
      <CampaignTableRow
        key={campaign.id}
        campaign={campaign}
        teamMembers={teamMembers}
        onRefresh={onRefresh}
        onSend={setShowSendModal}
      />
    ))}
  </div>
</div>
```

### Empty State

```tsx
if (campaigns.length === 0) {
  return (
    <EmptyState
      icon={DocumentTextIcon}
      title="Keine Pressemeldungen"
      description="Noch keine Pressemeldungen mit diesem Projekt verknüpft"
    />
  );
}
```

---

## PressemeldungApprovalTable

Tabellenansicht für alle Freigaben eines Projekts.

### Props

```typescript
interface Props {
  approvals: ApprovalEnhanced[];   // Array der Freigaben
  onRefresh: () => void;           // Callback für Refresh
}
```

### Verwendungsbeispiel

```tsx
<PressemeldungApprovalTable
  approvals={approvals}
  onRefresh={refetch}
/>
```

### Tabellen-Struktur

```tsx
<div className="bg-white rounded-lg shadow-sm overflow-hidden">
  {/* Header */}
  <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
    <div className="flex items-center">
      <div className="w-[35%]">Kampagne</div>
      <div className="w-[15%]">Status</div>
      <div className="w-[27%]">Kunde & Kontakt</div>
      <div className="flex-1">Letzte Aktivität</div>
    </div>
  </div>

  {/* Body */}
  <div className="divide-y divide-gray-200">
    {approvals.map((approval) => (
      <ApprovalTableRow
        key={approval.id}
        approval={approval}
        onRefresh={onRefresh}
      />
    ))}
  </div>
</div>
```

### Empty State

```tsx
if (approvals.length === 0) {
  return (
    <EmptyState
      icon={CheckCircleIcon}
      title="Keine Freigaben"
      description="Keine Freigaben für dieses Projekt gefunden"
    />
  );
}
```

**Einfacher als CampaignTable:**
- Keine TeamMembers nötig
- Kein SendModal
- Reine Anzeige-Komponente

---

## PressemeldungToggleSection

Zeigt Freigabe-Details in 3 aufklappbaren Bereichen (Media, PDF-Historie, Kommunikation).

### Props

```typescript
interface Props {
  projectId: string;         // ID des Projekts
  campaignId?: string;       // ID der Kampagne (optional)
  organizationId: string;    // ID der Organisation
}
```

### State

```typescript
const [mediaItems, setMediaItems] = useState<CampaignAssetAttachment[]>([]);
const [pdfVersions, setPdfVersions] = useState<PDFVersion[]>([]);
const [communicationCount, setCommunicationCount] = useState(0);
const [lastMessageDate, setLastMessageDate] = useState<Date | null>(null);
const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [expandedToggles, setExpandedToggles] = useState<Record<string, boolean>>({});
```

### Funktionen

#### handleToggle

```typescript
const handleToggle = useCallback((id: string) => {
  setExpandedToggles(prev => ({
    ...prev,
    [id]: !prev[id]
  }));
}, []);
```

#### loadMediaItems

```typescript
const loadMediaItems = async (): Promise<CampaignAssetAttachment[]> => {
  try {
    if (!campaignId) return [];

    const { prService } = await import('@/lib/firebase/pr-service');
    const campaign = await prService.getById(campaignId);

    if (campaign?.attachedAssets) {
      return campaign.attachedAssets;
    }

    return [];
  } catch (error) {
    console.error('Fehler beim Laden der Medien:', error);
    return [];
  }
};
```

#### loadPDFVersions

```typescript
const loadPDFVersions = async (): Promise<PDFVersion[]> => {
  try {
    if (!campaignId) return [];

    const versions = await pdfVersionsService.getVersionHistory(campaignId);

    return versions.map(v => ({
      id: v.id || '',
      version: v.version.toString(),
      pdfUrl: v.downloadUrl || '',
      createdAt: v.createdAt instanceof Date
        ? v.createdAt
        : v.createdAt?.toDate
          ? v.createdAt.toDate()
          : new Date(),
      createdBy: {
        id: v.createdBy || '',
        name: v.createdBy || 'Unbekannt',
        email: ''
      },
      fileSize: v.fileSize || 0,
      comment: undefined,
      isCurrent: false,
      campaignId: campaignId,
      organizationId: organizationId,
      status: v.status as 'draft' | 'pending_customer' | 'approved' | 'rejected'
    }));
  } catch (error) {
    console.error('Fehler beim Laden der PDF-Versionen:', error);
    return [];
  }
};
```

#### loadCommunicationData

```typescript
const loadCommunicationData = async () => {
  try {
    if (!campaignId) return;

    const { approvalServiceExtended } = await import('@/lib/firebase/approval-service');

    const approvals = await approvalServiceExtended.getApprovalsByProject(
      projectId,
      organizationId
    );

    // Finde Approval für diese campaignId
    const approval = approvals.find(a => a.campaignId === campaignId);

    // Transformiere history zu feedbackHistory
    const historyData = approval?.history?.filter(h => h.details?.comment) || [];

    const feedbackHistoryData = historyData.map(h => ({
      author: h.actorName || 'Teammitglied',
      comment: h.details?.comment || '',
      requestedAt: h.timestamp,
      action: h.action
    }));

    setFeedbackHistory(feedbackHistoryData);
    setCommunicationCount(feedbackHistoryData.length);

    // Letzte Nachricht ermitteln
    if (feedbackHistoryData.length > 0) {
      const sortedFeedback = feedbackHistoryData.sort((a, b) => {
        const aTime = a.requestedAt instanceof Date ? a.requestedAt.getTime() : 0;
        const bTime = b.requestedAt instanceof Date ? b.requestedAt.getTime() : 0;
        return bTime - aTime;
      });

      const latestFeedback = sortedFeedback[0];
      setLastMessageDate(
        latestFeedback.requestedAt instanceof Date
          ? latestFeedback.requestedAt
          : new Date(latestFeedback.requestedAt)
      );
    }
  } catch (error) {
    console.error('Fehler beim Laden der Kommunikationsdaten:', error);
    setCommunicationCount(0);
    setLastMessageDate(null);
  }
};
```

### Memoized Values

```typescript
const transformedMediaItems = useMemo(
  () => transformMediaItems(mediaItems),
  [mediaItems]
);

const transformedCommunications = useMemo(
  () => transformCommunicationItems(feedbackHistory),
  [feedbackHistory]
);
```

### Dynamic Imports

```typescript
const MediaToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.MediaToggleBox })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

const PDFHistoryToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.PDFHistoryToggleBox })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

const CommunicationToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.CommunicationToggleBox })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);
```

**Vorteile:**
- Code-Splitting (kleinere Bundle-Size)
- Lazy Loading (nur laden wenn benötigt)
- Loading States (Skeleton während Import)
- SSR deaktiviert (Client-Only Components)

### Verwendungsbeispiel

```tsx
<PressemeldungToggleSection
  projectId={projectId}
  campaignId={campaigns[0]?.id}
  organizationId={organizationId}
/>
```

### Render-Struktur

```tsx
<div className="space-y-4">
  <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded-lg h-64"></div>}>
    {/* Angehängte Medien */}
    <MediaToggleBox
      id="media"
      title="Angehängte Medien"
      count={mediaItems.length}
      isExpanded={expandedToggles['media'] || false}
      onToggle={handleToggle}
      mediaItems={transformedMediaItems}
      onMediaSelect={handleMediaSelect}
      organizationId={organizationId}
    />

    {/* PDF-Historie */}
    <PDFHistoryToggleBox
      id="pdf-history"
      title="PDF-Historie"
      count={pdfVersions.length}
      isExpanded={expandedToggles['pdf-history'] || false}
      onToggle={handleToggle}
      pdfVersions={pdfVersions}
      onVersionSelect={handleVersionSelect}
      showDownloadButtons={true}
      organizationId={organizationId}
    />

    {/* Kommunikation */}
    <CommunicationToggleBox
      id="communication"
      title="Kommunikation"
      count={communicationCount}
      isExpanded={expandedToggles['communication'] || false}
      onToggle={handleToggle}
      communications={transformedCommunications}
      onNewMessage={handleNewMessage}
      allowNewMessages={true}
      organizationId={organizationId}
    />
  </Suspense>
</div>
```

---

## Sub-Komponenten

## CampaignTableRow

Einzelne Zeile in der Kampagnen-Tabelle.

### Props

```typescript
interface CampaignTableRowProps {
  campaign: PRCampaign;           // Kampagnen-Objekt
  teamMembers: TeamMember[];      // Team-Mitglieder für Avatar
  onRefresh: () => void;          // Callback für Refresh
  onSend: (campaign: PRCampaign) => void;  // Callback für Versenden-Dialog
}
```

### State

```typescript
const [isDeleting, setIsDeleting] = useState(false);
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
```

### Hooks

```typescript
const router = useRouter();
const { user } = useAuth();
```

### Funktionen

#### getStatusColor

```typescript
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return 'zinc';
    case 'in_review': return 'amber';
    case 'approved': return 'green';
    case 'sent': return 'blue';
    case 'rejected': return 'red';
    case 'changes_requested': return 'orange';
    default: return 'zinc';
  }
};
```

#### getStatusLabel

```typescript
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'draft': return 'Entwurf';
    case 'in_review': return 'In Prüfung';
    case 'approved': return 'Freigegeben';
    case 'sent': return 'Versendet';
    case 'rejected': return 'Abgelehnt';
    case 'changes_requested': return 'Änderungen Angefordert';
    default: return status;
  }
};
```

#### formatDate

```typescript
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unbekannt';

  // Handle Firestore Timestamp
  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return 'Unbekannt';
  }

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
```

#### handleEdit

```typescript
const handleEdit = () => {
  router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`);
};
```

#### handleDeleteConfirm

```typescript
const handleDeleteConfirm = async () => {
  setShowDeleteDialog(false);
  setIsDeleting(true);
  try {
    await prService.delete(campaign.id!);
    toastService.success('Kampagne erfolgreich gelöscht');
    onRefresh();
  } catch (error) {
    console.error('Fehler beim Löschen der Kampagne:', error);
    toastService.error('Fehler beim Löschen der Kampagne');
  } finally {
    setIsDeleting(false);
  }
};
```

### Verwendungsbeispiel

```tsx
<CampaignTableRow
  key={campaign.id}
  campaign={campaign}
  teamMembers={teamMembers}
  onRefresh={refetch}
  onSend={setShowSendModal}
/>
```

### Performance

```typescript
export default React.memo(CampaignTableRow);
```

**Warum React.memo?**
- Rendert nur neu wenn Props sich ändern
- ~75% weniger Re-Renders
- Bessere Performance bei großen Tabellen

---

## ApprovalTableRow

Einzelne Zeile in der Freigabe-Tabelle.

### Props

```typescript
interface ApprovalTableRowProps {
  approval: ApprovalEnhanced;    // Approval-Objekt
  onRefresh: () => void;         // Callback für Refresh
}
```

### Helper Functions

```typescript
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'amber';
    case 'in_review': return 'amber';
    case 'approved': return 'green';
    case 'rejected': return 'red';
    case 'changes_requested': return 'orange';
    case 'expired': return 'zinc';
    default: return 'zinc';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Ausstehend';
    case 'in_review': return 'In Prüfung';
    case 'approved': return 'Freigegeben';
    case 'rejected': return 'Abgelehnt';
    case 'changes_requested': return 'Änderungen Angefordert';
    case 'expired': return 'Abgelaufen';
    default: return status;
  }
};

export const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeSinceLastActivity = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';

  const now = new Date();
  const activityDate = timestamp.toDate();
  const diffInMs = now.getTime() - activityDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    return diffInHours === 0 ? 'Vor wenigen Minuten' : `Vor ${diffInHours}h`;
  }

  return `Vor ${diffInDays} Tag${diffInDays === 1 ? '' : 'en'}`;
};
```

### Verwendungsbeispiel

```tsx
<ApprovalTableRow
  key={approval.id}
  approval={approval}
  onRefresh={refetch}
/>
```

### Performance

```typescript
export default React.memo(ApprovalTableRow);
```

---

## EmptyState

Wiederverwendbare "Keine Daten"-Komponente.

### Props

```typescript
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;  // Heroicon
  title: string;                                       // Überschrift
  description: string;                                 // Beschreibung
  action?: {                                           // Optionale Action
    label: string;
    onClick: () => void;
  };
}
```

### Verwendungsbeispiele

```tsx
// Ohne Action
<EmptyState
  icon={DocumentTextIcon}
  title="Keine Pressemeldungen"
  description="Noch keine Pressemeldungen mit diesem Projekt verknüpft"
/>

// Mit Action
<EmptyState
  icon={CheckCircleIcon}
  title="Keine Freigaben"
  description="Erstellen Sie eine Pressemeldung, um Freigaben zu erhalten"
  action={{
    label: "Meldung erstellen",
    onClick: handleCreate
  }}
/>
```

### Performance

```typescript
const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <Heading level={3} className="mt-2">{title}</Heading>
      <Text className="mt-1 text-gray-500">{description}</Text>
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
});
```

**Warum memo?**
- Props ändern sich selten
- Verhindert unnötige Re-Renders
- Konsistente Performance

---

## ToggleDataHelpers

Helper-Funktionen zur Daten-Transformation für Toggle-Boxen.

### transformMediaItems

Transformiert `CampaignAssetAttachment` zu `MediaItem` Format.

```typescript
export function transformMediaItems(mediaItems: CampaignAssetAttachment[]) {
  return mediaItems.map(item => ({
    id: item.id,
    filename: item.metadata?.fileName || `Asset-${item.id}`,
    name: item.metadata?.fileName || `Asset-${item.id}`,
    mimeType: item.metadata?.fileType || 'image/jpeg',
    size: 0,
    url: item.metadata?.thumbnailUrl || '',
    thumbnailUrl: item.metadata?.thumbnailUrl || '',
    uploadedAt: new Date(),
    uploadedBy: { id: '', name: '', email: '' },
    organizationId: '',
    metadata: {}
  }));
}
```

### transformCommunicationItems

Transformiert `feedbackHistory` zu `CommunicationItem` Format.

```typescript
export function transformCommunicationItems(feedbackHistory: any[]) {
  return feedbackHistory
    .sort((a, b) => {
      // Sortiere nach timestamp - älteste zuerst
      const aTime = a.requestedAt instanceof Date ? a.requestedAt.getTime() : 0;
      const bTime = b.requestedAt instanceof Date ? b.requestedAt.getTime() : 0;
      return aTime - bTime;
    })
    .map((feedback, index) => {
      // Erkenne Kunde vs. Team basierend auf action
      const isCustomer = feedback.action === 'changes_requested';

      let senderName, senderAvatar;
      if (isCustomer) {
        // Kunde: Grüner Avatar
        senderName = feedback.author || 'Kunde';
        senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`;
      } else {
        // Team: Blauer Avatar
        senderName = feedback.author || 'Teammitglied';
        senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
      }

      return {
        id: `feedback-${index}`,
        type: 'feedback' as const,
        content: feedback.comment || '',
        message: feedback.comment || '',
        sender: {
          id: 'unknown',
          name: senderName,
          email: '',
          role: isCustomer ? 'customer' as const : 'agency' as const
        },
        senderName: senderName,
        senderAvatar: senderAvatar,
        createdAt: feedback.requestedAt instanceof Date
          ? feedback.requestedAt
          : new Date(feedback.requestedAt),
        isRead: true,
        campaignId: '',
        organizationId: ''
      };
    });
}
```

### formatLastMessageText

Formatiert letzte Nachricht für Anzeige.

```typescript
export function formatLastMessageText(lastMessageDate: Date | null): string {
  if (!lastMessageDate) return 'Keine Nachrichten';

  const now = new Date();
  const diffInMs = now.getTime() - lastMessageDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    return diffInHours === 0
      ? 'Letzte Nachricht: vor wenigen Minuten'
      : `Letzte Nachricht: vor ${diffInHours}h`;
  }

  return `Letzte Nachricht: vor ${diffInDays} Tag${diffInDays === 1 ? '' : 'en'}`;
}
```

---

## Styling Guidelines

### Tailwind CSS Classes

**Spacing:**
```css
space-y-4      /* Vertikaler Abstand zwischen Elementen */
space-y-6      /* Größerer vertikaler Abstand */
gap-2          /* Flex/Grid Gap */
px-6 py-4      /* Padding horizontal/vertikal */
```

**Colors:**
```css
bg-white       /* Hintergrund Weiß */
bg-gray-50     /* Hintergrund Grau (Hell) */
bg-gray-100    /* Hintergrund Grau (Mittel) */
text-gray-700  /* Text Grau (Dunkel) */
text-gray-500  /* Text Grau (Mittel) */
border-gray-200 /* Border Grau */
```

**Layout:**
```css
flex           /* Flexbox */
flex-1         /* Flex Grow */
items-center   /* Align Items Center */
justify-between /* Justify Space Between */
w-[35%]        /* Width 35% */
min-w-0        /* Min-Width 0 (für Truncate) */
truncate       /* Text abschneiden */
```

**Interaktivity:**
```css
hover:bg-gray-50      /* Hover State */
hover:text-[#005fab]  /* Hover Text Color */
cursor-pointer        /* Pointer Cursor */
transition-colors     /* Smooth Transitions */
disabled:opacity-50   /* Disabled State */
```

### Color Palette

| Color | Hex | Use Case |
|-------|-----|----------|
| Primary Blue | `#005fab` | Buttons, Links, Icons |
| Dark Blue | `#004a8c` | Hover States |
| Zinc | `zinc-*` | Entwurf Status |
| Amber | `amber-*` | In Prüfung Status |
| Green | `green-*` | Freigegeben Status |
| Blue | `blue-*` | Versendet Status |
| Red | `red-*` | Abgelehnt Status, Löschen |
| Orange | `orange-*` | Änderungen Status |

---

## Accessibility

### Keyboard Navigation

Alle interaktiven Elemente sind via Tastatur erreichbar:

```tsx
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  tabIndex={0}
>
  Action
</button>
```

### ARIA Labels

```tsx
<button aria-label="Kampagne löschen">
  <TrashIcon className="h-4 w-4" />
</button>
```

### Screen Reader Support

```tsx
<a
  href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}
  aria-label={`Kampagne ${campaign.title} bearbeiten`}
>
  {campaign.title}
</a>
```

### Focus States

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
  Action
</button>
```

---

## Performance-Tipps

### 1. React.memo für Sub-Komponenten

```typescript
export default React.memo(CampaignTableRow);
```

**Wann verwenden?**
- Pure Components (gleiche Props → gleicher Output)
- Häufig gerenderte Listen-Items
- Komponenten mit teuren Berechnungen

### 2. useCallback für Event-Handler

```typescript
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);
```

**Warum?**
- Verhindert Re-Renders von Child-Komponenten
- Stabile Referenzen für Props

### 3. useMemo für berechnete Werte

```typescript
const transformedData = useMemo(
  () => transformData(data),
  [data]
);
```

**Wann verwenden?**
- Teure Berechnungen
- Daten-Transformationen
- Filter/Sort Operations

### 4. Dynamic Imports

```typescript
const Component = dynamic(() => import('./Component'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

**Vorteile:**
- Kleinere Bundle-Size
- Lazy Loading
- Bessere Initial Load Performance

### 5. Virtualisierung für große Listen

Für >100 Items:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: campaigns.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
});
```

---

## Common Patterns

### Pattern 1: Empty State Handling

```tsx
{data.length === 0 ? (
  <EmptyState
    icon={Icon}
    title="Keine Daten"
    description="Beschreibung"
  />
) : (
  <DataTable data={data} />
)}
```

### Pattern 2: Loading State

```tsx
if (isLoading) {
  return <Skeleton />;
}

return <Content />;
```

### Pattern 3: Error Handling

```tsx
if (isError) {
  return (
    <ErrorState
      error={error}
      onRetry={refetch}
    />
  );
}
```

### Pattern 4: Confirmation Dialog

```tsx
const [showDialog, setShowDialog] = useState(false);

<Button onClick={() => setShowDialog(true)}>
  Löschen
</Button>

<Dialog open={showDialog} onClose={() => setShowDialog(false)}>
  <DialogTitle>Bestätigung</DialogTitle>
  <DialogBody>Wirklich löschen?</DialogBody>
  <DialogActions>
    <Button onClick={() => setShowDialog(false)}>Abbrechen</Button>
    <Button onClick={handleConfirm}>Löschen</Button>
  </DialogActions>
</Dialog>
```

### Pattern 5: Optimistic Updates

```tsx
const { mutate } = useMutation({
  onMutate: async (newData) => {
    // Cancel queries
    await queryClient.cancelQueries(['data']);

    // Snapshot
    const previous = queryClient.getQueryData(['data']);

    // Optimistic update
    queryClient.setQueryData(['data'], newData);

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback
    queryClient.setQueryData(['data'], context.previous);
  },
});
```

---

## Siehe auch

- [Hauptdokumentation](../README.md) - Modul-Übersicht
- [API-Dokumentation](../api/README.md) - Hooks und Services
- [Campaign Hooks Referenz](../api/campaign-hooks.md) - Detaillierte Hook-Docs
- [Architecture Decision Records](../adr/README.md) - Design-Entscheidungen

---

**Letzte Aktualisierung**: 2025-10-27
**Version**: 0.1.0
