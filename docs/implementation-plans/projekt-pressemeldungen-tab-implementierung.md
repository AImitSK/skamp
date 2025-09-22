# Projekt Pressemeldungen-Tab Implementierung

## Überblick
Implementierung eines vollständigen Pressemeldungen-Management-Tabs innerhalb der Projekt-Detailseite mit Integration bestehender PR-Tools Services und Komponenten.

## Anforderungen

### Header-Bereich
- **Titel**: "Pressemeldung"
- **Primär-Button**: "Meldung Erstellen"
  - Öffnet Campaign-Modal direkt aus dem Tab
  - **Aktiv**: wenn noch keine Pressemeldung verknüpft
  - **Ausgegraut**: wenn bereits Pressemeldung vorhanden

### Hauptinhalt (3 Bereiche)

#### 1. Pressemeldung-Tabelle
**Datenquelle**: PR-Campaigns Service (`/lib/firebase/pr-service.ts`)

| Spalte | Datenfeld | Komponente |
|--------|-----------|------------|
| Kampagne | `campaign.title` | Text + Link |
| Status | `campaign.status` | Badge |
| Admin | `campaign.userId` | Avatar + Name |
| Erstellt am | `campaign.createdAt` | Formatiertes Datum |
| Kampagne Versenden | `campaign.status === 'approved'` | Button (bedingt) |
| Aktionen | - | Dropdown |

**Aktionen-Dropdown**:
- Bearbeiten → `/dashboard/pr-tools/campaigns/campaigns/edit/[campaignId]`
- Löschen → Service-Call + Bestätigung

#### 2. Freigabe-Tabelle
**Datenquelle**: Approval Service (`/lib/firebase/approval-service.ts`)

| Spalte | Datenfeld | Komponente |
|--------|-----------|------------|
| Kampagne | `approval.campaignTitle` | Text + Link |
| Status | `approval.status` | Badge |
| Kunde & Kontakt | `approval.customerContact` | Text |
| Letzte Aktivität | `approval.lastActivity` | Zeitstempel |
| Aktionen | - | Dropdown |

**Aktionen-Dropdown**:
- Freigabe-Link öffnen → `/freigabe/[shareId]`
- Link kopieren → Clipboard API
- Agentur Freigabe erteilen → Service-Call

#### 3. Toggle-Bereiche
**Inspiration**: `src/app/freigabe/[shareId]/page.tsx` - Toggle-Komponenten

- **Angehängte Medien**
  - Komponente: `MediaToggleBox` (existiert)
  - Badge mit Anzahl
  - Text: "Diese werden nach Ihrer Freigabe mit der Mitteilung versendet"

- **PDF-Historie**
  - Komponente: `PDFHistoryToggleBox` (existiert)
  - Badge mit Anzahl
  - Text: "Alle Versionen der Pressemitteilung"

- **Kommunikation**
  - Komponente: `CommunicationToggleBox` (existiert)
  - Badge mit Anzahl
  - Text: "Letzte Nachricht: vor X Tag(en)"

### Footer-Aktionen
- **Button**: "Boilerplate erstellen" → `/dashboard/pr-tools/boilerplates`
- **Button**: "PDF Template erstellen" → `/dashboard/settings/templates`

## Technische Implementierung

### 1. Komponenten-Struktur

```
src/components/projects/pressemeldungen/
├── ProjectPressemeldungenTab.tsx          // Haupt-Komponente
├── PressemeldungCampaignTable.tsx         // Kampagnen-Tabelle
├── PressemeldungApprovalTable.tsx         // Freigabe-Tabelle
├── PressemeldungToggleSection.tsx         // Toggle-Bereiche
└── CampaignCreateModal.tsx                // Modal für neue Kampagne
```

### 2. Services Integration

#### Bestehende Services nutzen:
- `prService` - Kampagnen-Daten laden
- `approvalService` - Freigabe-Daten laden
- `mediaService` - Medien-Anhänge
- `pdfVersionsService` - PDF-Historie
- `notificationsService` - Kommunikation

#### Neue Service-Methoden:
```typescript
// In pr-service.ts erweitern
export const prService = {
  // Bestehende Methoden...

  async getCampaignsByProject(projectId: string, organizationId: string): Promise<PRCampaign[]> {
    // Kampagnen für spezifisches Projekt laden
  },

  async linkCampaignToProject(campaignId: string, projectId: string): Promise<void> {
    // Kampagne mit Projekt verknüpfen
  }
}

// In approval-service.ts erweitern
export const approvalService = {
  // Bestehende Methoden...

  async getApprovalsByProject(projectId: string, organizationId: string): Promise<ApprovalEnhanced[]> {
    // Freigaben für spezifisches Projekt laden
  }
}
```

### 3. Datenstrukturen

#### Project-Campaign-Link
```typescript
interface ProjectCampaignLink {
  id: string;
  projectId: string;
  campaignId: string;
  organizationId: string;
  linkedAt: Timestamp;
  linkedBy: string;
}
```

#### Campaign Enhancement
```typescript
// PRCampaign erweitern um:
interface PRCampaign {
  // Bestehende Felder...
  projectId?: string;        // Verknüpfung zu Projekt
  projectTitle?: string;     // Cached project title
}
```

### 4. Haupt-Komponente

```typescript
// ProjectPressemeldungenTab.tsx
export default function ProjectPressemeldungenTab({
  projectId,
  organizationId
}: Props) {
  const [campaigns, setCampaigns] = useState<PRCampaign[]>([]);
  const [approvals, setApprovals] = useState<ApprovalEnhanced[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Daten laden
  useEffect(() => {
    loadProjectPressData();
  }, [projectId, organizationId]);

  const loadProjectPressData = async () => {
    try {
      const [campaignData, approvalData] = await Promise.all([
        prService.getCampaignsByProject(projectId, organizationId),
        approvalService.getApprovalsByProject(projectId, organizationId)
      ]);
      setCampaigns(campaignData);
      setApprovals(approvalData);
    } catch (error) {
      console.error('Fehler beim Laden der Pressemeldungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasLinkedCampaign = campaigns.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Heading level={3}>Pressemeldung</Heading>
        <Button
          onClick={() => setShowCreateModal(true)}
          className={hasLinkedCampaign
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-[#005fab] hover:bg-[#004a8c] text-white"
          }
          disabled={hasLinkedCampaign}
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Meldung Erstellen
        </Button>
      </div>

      {/* Kampagnen-Tabelle */}
      <PressemeldungCampaignTable
        campaigns={campaigns}
        onRefresh={loadProjectPressData}
      />

      {/* Freigabe-Tabelle */}
      <PressemeldungApprovalTable
        approvals={approvals}
        onRefresh={loadProjectPressData}
      />

      {/* Toggle-Bereiche */}
      <PressemeldungToggleSection
        projectId={projectId}
        campaignId={campaigns[0]?.id}
      />

      {/* Footer-Aktionen */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <Button color="secondary" href="/dashboard/pr-tools/boilerplates">
          Boilerplate erstellen
        </Button>
        <Button color="secondary" href="/dashboard/settings/templates">
          PDF Template erstellen
        </Button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CampaignCreateModal
          projectId={projectId}
          organizationId={organizationId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(campaignId) => {
            setShowCreateModal(false);
            loadProjectPressData();
          }}
        />
      )}
    </div>
  );
}
```

### 5. Tabellen-Komponenten

#### Kampagnen-Tabelle
```typescript
// PressemeldungCampaignTable.tsx
export default function PressemeldungCampaignTable({
  campaigns,
  onRefresh
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="w-[30%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Kampagne
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Admin
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Erstellt am
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Versenden
          </div>
          <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
            Aktionen
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {campaigns.map((campaign) => (
          <CampaignTableRow
            key={campaign.id}
            campaign={campaign}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}
```

### 6. Integration in Projekt-Page

```typescript
// In src/app/dashboard/projects/[projectId]/page.tsx
import ProjectPressemeldungenTab from '@/components/projects/pressemeldungen/ProjectPressemeldungenTab';

// Tab-Content erweitern:
{activeTab === 'pressemeldung' && (
  <div className="space-y-6">
    {project && currentOrganization && (
      <ProjectPressemeldungenTab
        projectId={project.id!}
        organizationId={currentOrganization.id}
      />
    )}
  </div>
)}
```

## Implementierungs-Reihenfolge

### Phase 1: Grundstruktur
1. ✅ Tab bereits hinzugefügt
2. Service-Erweiterungen implementieren
3. Haupt-Komponente erstellen
4. Basis-Layout und Header

### Phase 2: Tabellen
1. Kampagnen-Tabelle implementieren
2. Freigabe-Tabelle implementieren
3. Dropdown-Aktionen implementieren
4. Modal für Kampagnen-Erstellung

### Phase 3: Toggle-Bereiche
1. Bestehende Toggle-Komponenten integrieren
2. Medien-Anzeige implementieren
3. PDF-Historie integrieren
4. Kommunikations-Feed einbinden

### Phase 4: Footer & Links
1. Footer-Buttons implementieren
2. Navigation zu anderen Bereichen
3. Testing und Refinements

## Bestehende Komponenten Wiederverwenden

### UI-Komponenten
- `Table`, `Button`, `Badge`, `Dropdown` (Design System)
- `Avatar`, `Text`, `Heading` (Standard UI)
- `Dialog`, `Modal` (Für Aktionen)

### Business-Komponenten
- `MediaToggleBox` - Aus freigabe/[shareId]/page.tsx
- `PDFHistoryToggleBox` - Aus freigabe/[shareId]/page.tsx
- `CommunicationToggleBox` - Aus freigabe/[shareId]/page.tsx
- `CampaignContentComposer` - Für neue Kampagnen
- `ApprovalSettings` - Für Freigabe-Konfiguration

### Services
- `prService` - Kampagnen-Management
- `approvalService` - Freigabe-Workflow
- `mediaService` - Asset-Management
- `pdfVersionsService` - PDF-Versioning
- `notificationsService` - Kommunikation

## Testing

### Unit Tests
- Service-Methoden für Projekt-Kampagnen-Verknüpfung
- Komponenten-Rendering mit Mock-Daten
- State-Management und Updates

### Integration Tests
- Vollständiger Workflow: Kampagne erstellen → Freigabe → Versand
- Modal-Funktionalität
- Navigation zwischen Bereichen

### E2E Tests
- Projekt → Pressemeldung Tab → Kampagne erstellen
- Freigabe-Workflow von Projekt aus
- Toggle-Bereiche Interaktion

## Designkonsistenz

### CeleroPress Design System v2.0
- Heroicons /24/outline verwenden
- Bestehende Farb- und Spacing-Patterns
- Konsistente Tabellen-Layouts (wie Distribution Lists)
- Standard Button-Stile (Primär für "Meldung Erstellen")

### Responsive Design
- Mobile-optimierte Tabellen
- Kollabierbare Toggle-Bereiche
- Touch-friendly Dropdown-Menüs

---

**Status**: Bereit für Implementierung
**Geschätzte Entwicklungszeit**: 3-4 Arbeitstage
**Abhängigkeiten**: Bestehende PR-Tools Services und Komponenten