# 🎯 Erweiterte Freigabe-System Implementierung
**Status:** Bereit zur Umsetzung | **Komplexität:** Hoch | **Aufwand:** ~3-4 Arbeitstage

## 📋 ZUSAMMENFASSUNG
Erweiterung des bestehenden einfachen Freigabe-Systems zu einem mehrstufigen Team- und Kundenfreigabe-Workflow mit Switch-UI, Kontaktauswahl und internen/externen Freigabe-Seiten.

## 🎯 ZIELE & ANFORDERUNGEN

### 🔄 Aktuelle Situation
- Einfache Checkbox "Freigabe vom Kunden erforderlich"
- Ein-Schritt Kundenfreigabe über öffentlichen Link
- Keine Team-interne Freigabe

### 🚀 Ziel-Zustand
- **Box-Optik** für Freigabe-Sektion
- **Switch-UI** statt Checkboxen (wie Notification Settings)
- **Zwei-Stufen-Freigabe:** Team → Kunde
- **Kontaktauswahl:** Team-Mitglieder & Kunden-Kontakte
- **Freie Nachrichten** für Freigabe-Anfragen
- **Interne Freigabe-Seite** für Team-Mitglieder
- **Mehrstufiger Workflow** mit visueller Übersicht

## 📁 DATEIEN & KOMPONENTEN

### 🆕 Neue Dateien
```
src/components/campaigns/
├── ApprovalSettings.tsx           # Neue Freigabe-Einstellungen (ersetzt Checkbox)
├── TeamMemberSelector.tsx         # Mehrfach-Auswahl Team-Mitglieder
└── CustomerContactSelector.tsx    # Einzel-Auswahl Kunden-Kontakte

src/app/freigabe-intern/[shareId]/
└── page.tsx                       # Neue interne Freigabe-Seite

src/types/
├── approvals-enhanced.ts          # Erweiterte Freigabe-Typen
└── team-approval.ts               # Team-spezifische Typen

src/lib/firebase/
├── team-approval-service.ts       # Service für Team-Freigaben
└── approval-workflow-service.ts   # Workflow-Management

src/components/approvals/
├── TeamApprovalCard.tsx          # Avatar-Grid für Team-Status
├── WorkflowVisualization.tsx     # Fortschritts-Anzeige
└── ApprovalMessage.tsx           # Nachrichtenkomponente
```

### 🔄 Geänderte Dateien
```
src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx    # Neue ApprovalSettings
src/app/dashboard/pr-tools/campaigns/campaigns/edit/[id]/page.tsx
src/app/dashboard/pr-tools/approvals/page.tsx                 # Erweiterte Tabelle
src/app/freigabe/[shareId]/page.tsx                          # Workflow-Integration
src/types/pr.ts                                             # Erweiterte ApprovalData
src/lib/firebase/pr-service.ts                              # Workflow-Unterstützung
```

## 🏗️ IMPLEMENTIERUNG - SCHRITT FÜR SCHRITT

### Phase 1: UI & Datenstrukturen (Tag 1)

#### 1.1 Erweiterte Typen definieren
```typescript
// src/types/approvals-enhanced.ts
export interface EnhancedApprovalData {
  // Team-Freigabe
  teamApprovalRequired: boolean;
  teamApprovers: Array<{
    userId: string;
    displayName: string;
    email: string;
    photoUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: Timestamp;
    message?: string;
  }>;
  teamApprovalMessage?: string;
  
  // Kunden-Freigabe
  customerApprovalRequired: boolean;
  customerContact?: {
    contactId: string;
    name: string;
    email: string;
    companyName: string;
  };
  customerApprovalMessage?: string;
  
  // Workflow-Status
  currentStage: 'team' | 'customer' | 'completed';
  workflowStartedAt: Timestamp;
  
  // Legacy Kompatibilität
  shareId: string;
  status: 'pending' | 'viewed' | 'commented' | 'approved';
  feedbackHistory: ApprovalFeedbackEntry[];
}

export interface ApprovalWorkflowStage {
  stage: 'team' | 'customer';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requiredApprovals: number;
  receivedApprovals: number;
  completedAt?: Timestamp;
}
```

#### 1.2 ApprovalSettings Component
```typescript
// src/components/campaigns/ApprovalSettings.tsx
interface ApprovalSettingsProps {
  value: EnhancedApprovalData;
  onChange: (data: EnhancedApprovalData) => void;
  organizationId: string;
  clientId?: string;
  clientName?: string;
}

export function ApprovalSettings({...}) {
  // Box-Design mit Switches
  // Team-/Kunden-Freigabe Toggle
  // Kontakt-Selektor (conditional)
  // Nachrichten-Felder
}
```

#### 1.3 Kontakt-Selektoren
```typescript
// src/components/campaigns/TeamMemberSelector.tsx
export function TeamMemberSelector({
  selectedMembers: string[];
  onSelectionChange: (memberIds: string[]) => void;
  organizationId: string;
}) {
  // Lädt Team-Mitglieder via teamMemberService
  // Multi-Select mit Avatar + Name
  // Search/Filter Funktionalität
}

// src/components/campaigns/CustomerContactSelector.tsx
export function CustomerContactSelector({
  selectedContact?: string;
  onContactChange: (contactId?: string) => void;
  clientId: string;
}) {
  // Lädt Kunden-Kontakte via CRM
  // Single-Select Dropdown
  // Zeigt Name + E-Mail + Rolle
}
```

### Phase 2: Workflow-Services (Tag 2)

#### 2.1 Team-Approval Service
```typescript
// src/lib/firebase/team-approval-service.ts
export const teamApprovalService = {
  async createTeamApproval(campaignId: string, approvers: TeamMember[], message?: string): Promise<string>,
  async submitTeamDecision(approvalId: string, userId: string, decision: 'approved' | 'rejected', comment?: string): Promise<void>,
  async getTeamApprovalStatus(approvalId: string): Promise<TeamApprovalStatus>,
  async checkAllTeamApprovalsComplete(approvalId: string): Promise<boolean>,
  async notifyTeamMembers(approvalId: string, members: TeamMember[]): Promise<void>
}
```

#### 2.2 Workflow-Management Service
```typescript
// src/lib/firebase/approval-workflow-service.ts
export const approvalWorkflowService = {
  async createWorkflow(campaignId: string, settings: EnhancedApprovalData): Promise<string>,
  async processStageCompletion(workflowId: string, stage: 'team' | 'customer'): Promise<void>,
  async moveToNextStage(workflowId: string): Promise<void>,
  async getWorkflowStatus(workflowId: string): Promise<ApprovalWorkflowStage[]>,
  async sendStageNotifications(workflowId: string, stage: 'team' | 'customer'): Promise<void>
}
```

### Phase 3: Interne Freigabe-Seite (Tag 2-3)

#### 3.1 Route & Page Setup
```typescript
// src/app/freigabe-intern/[shareId]/page.tsx
export default function InternalApprovalPage() {
  // Authentifizierung erforderlich
  // Team-Mitglied Berechtigung prüfen
  // Multi-Approval UI
  // Ähnlich wie öffentliche Seite, aber team-fokussiert
}
```

#### 3.2 Team-spezifische Komponenten
```typescript
// src/components/approvals/TeamApprovalCard.tsx
export function TeamApprovalCard({
  approvers: TeamApprover[];
  currentUserId: string;
  onSubmitDecision: (decision, comment) => void;
}) {
  // Avatar-Grid aller Approver
  // Status-Anzeige pro Person
  // Eigene Entscheidung (wenn berechtigt)
  // Kommentar-Bereich
}

// src/components/approvals/WorkflowVisualization.tsx
export function WorkflowVisualization({
  stages: ApprovalWorkflowStage[];
  currentStage: string;
}) {
  // Fortschritts-Balken
  // Stufen-Anzeige (Team → Kunde)
  // Status-Icons und -Labels
}
```

### Phase 4: Integration & UI-Updates (Tag 3)

#### 4.1 Campaign Editor Integration
```typescript
// In src/app/dashboard/pr-tools/campaigns/campaigns/new/page.tsx

// Ersetze bestehende Freigabe-Checkbox mit:
<div className="mt-8">
  <div className="bg-white rounded-lg border p-6"> {/* Box-Optik */}
    <ApprovalSettings
      value={approvalData}
      onChange={setApprovalData}
      organizationId={currentOrganization!.id}
      clientId={selectedCompanyId}
      clientName={selectedCompanyName}
    />
  </div>
</div>
```

#### 4.2 Freigaben-Übersicht Erweitert
```typescript
// In src/app/dashboard/pr-tools/approvals/page.tsx

// Neue Tabellen-Spalten:
// - Workflow-Stufe (Team/Kunde/Abgeschlossen)
// - Approver-Avatars (Team-Mitglieder)
// - Fortschritt (3/5 genehmigt)
// - Nächste Aktion

// Beispiel:
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex items-center">
    <WorkflowVisualization 
      stages={approval.workflowStages} 
      currentStage={approval.currentStage} 
    />
  </div>
</td>

<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex -space-x-2">
    {approval.teamApprovers.slice(0, 3).map(approver => (
      <img 
        key={approver.userId}
        src={approver.photoUrl || '/default-avatar.png'}
        className={`inline-block h-8 w-8 rounded-full ring-2 ${
          approver.status === 'approved' ? 'ring-green-500' : 
          approver.status === 'rejected' ? 'ring-red-500' : 'ring-gray-300'
        }`}
      />
    ))}
    {approval.teamApprovers.length > 3 && (
      <span className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-xs">
        +{approval.teamApprovers.length - 3}
      </span>
    )}
  </div>
</td>
```

### Phase 5: E-Mail & Benachrichtigungen (Tag 4)

#### 5.1 Notification Service Erweiterung
```typescript
// src/lib/firebase/notification-service.ts erweitern

export const notificationService = {
  // Bestehende Methoden...
  
  async notifyTeamApprovalRequired(
    approvalId: string, 
    campaignTitle: string, 
    teamMembers: TeamMember[],
    message?: string
  ): Promise<void>,
  
  async notifyTeamMemberDecision(
    approvalId: string,
    decidedBy: TeamMember,
    decision: 'approved' | 'rejected',
    remainingApprovers: TeamMember[]
  ): Promise<void>,
  
  async notifyAllTeamApprovalsComplete(
    approvalId: string,
    campaignTitle: string,
    customerContact?: CustomerContact
  ): Promise<void>,
}
```

#### 5.2 E-Mail Templates
```html
<!-- Team-Freigabe E-Mail -->
<h2>Team-Freigabe erforderlich: {{campaignTitle}}</h2>
<p>{{message}}</p>
<p>Weitere Approver: {{teamMemberList}}</p>
<a href="{{internalApprovalLink}}">Freigabe prüfen</a>

<!-- Team-Freigabe abgeschlossen E-Mail -->
<h2>Team-Freigabe abgeschlossen: {{campaignTitle}}</h2>
<p>Alle Team-Mitglieder haben freigegeben.</p>
<p>Die Kampagne wird nun zur Kundenfreigabe weitergeleitet.</p>
<a href="{{customerApprovalLink}}">Kundenfreigabe senden</a>
```

## 🔧 TECHNISCHE DETAILS

### Datenbank-Schema
```typescript
// Firestore Collections Erweiterung

// campaigns/[campaignId]
{
  // Bestehende Felder...
  approvalData: EnhancedApprovalData;
  workflowId?: string; // Referenz zur Workflow-Instanz
}

// approval_workflows/[workflowId]
{
  campaignId: string;
  organizationId: string;
  stages: ApprovalWorkflowStage[];
  currentStage: 'team' | 'customer' | 'completed';
  createdAt: Timestamp;
  completedAt?: Timestamp;
  
  // Team-Stufe
  teamSettings: {
    required: boolean;
    approvers: TeamApprover[];
    message?: string;
    allApproved: boolean;
    completedAt?: Timestamp;
  };
  
  // Kunden-Stufe  
  customerSettings: {
    required: boolean;
    contact?: CustomerContact;
    message?: string;
    shareId: string;
    status: 'pending' | 'approved' | 'rejected';
    completedAt?: Timestamp;
  };
}

// team_approvals/[approvalId] (Subcollection von workflows)
{
  userId: string;
  workflowId: string;
  campaignId: string;
  status: 'pending' | 'approved' | 'rejected';
  decision?: {
    choice: 'approved' | 'rejected';
    comment?: string;
    submittedAt: Timestamp;
  };
  notifiedAt: Timestamp;
}
```

### UI-Komponenten Hierarchie
```
ApprovalSettings (Haupt-Container mit Box-Design)
├── TeamApprovalSection
│   ├── SimpleSwitch (Team-Freigabe an/aus)
│   ├── TeamMemberSelector (Mehrfach-Auswahl)
│   └── MessageInput (Team-Nachricht)
├── CustomerApprovalSection  
│   ├── SimpleSwitch (Kunden-Freigabe an/aus)
│   ├── CustomerContactSelector (Einzel-Auswahl)
│   └── MessageInput (Kunden-Nachricht)
└── WorkflowPreview (Vorschau der Stufen)

InternalApprovalPage
├── AuthGuard (Team-Mitglied Prüfung)
├── WorkflowVisualization (Fortschritt)
├── TeamApprovalCard (Multi-Approval Interface)
├── CampaignPreview (Gleich wie öffentliche Seite)
└── ActionButtons (Genehmigen/Ablehnen)
```

## 🚀 MIGRATION & KOMPATIBILITÄT

### Bestehende Daten Migration
```typescript
// Migration für bestehende Kampagnen
export async function migrateExistingApprovals() {
  // Alle Kampagnen mit approvalRequired: true
  // Konvertiere zu neuer EnhancedApprovalData Struktur
  // Setze customerApprovalRequired: true
  // Behalte bestehende shareId und feedbackHistory
}
```

### Rückwärts-Kompatibilität
- Bestehende öffentliche Freigabe-Links funktionieren weiter
- Einfache Kunden-Freigabe ohne Team-Stufe bleibt möglich
- Legacy `approvalRequired` Boolean wird automatisch migriert

## ⚠️ HERAUSFORDERUNGEN & LÖSUNGEN

### 1. Komplexer State Management
**Problem:** Verschachtelte Approval-Daten mit Team + Kunde
**Lösung:** Separate Services für Team/Customer, zentrale Workflow-Koordination

### 2. Benachrichtigungs-Timing
**Problem:** Wann genau E-Mails senden bei mehrstufigem Workflow?
**Lösung:** Event-basierte Trigger bei Stage-Übergängen

### 3. UI-Konsistenz 
**Problem:** Interne vs. externe Freigabe-Seiten
**Lösung:** Geteilte Komponenten, unterschiedliche Layouts

### 4. Performance bei vielen Approvern
**Problem:** N+1 Queries beim Laden von Team-Daten
**Lösung:** Batch-Loading, Caching von Team-Mitglied Daten

## 📋 AKZEPTANZ-KRITERIEN

### ✅ UI/UX
- [ ] Box-Design für Freigabe-Sektion implementiert
- [ ] SimpleSwitch statt Checkboxen verwendet
- [ ] Team-Mitglieder Mehrfach-Auswahl funktional
- [ ] Kunden-Kontakt Einzel-Auswahl funktional  
- [ ] Freie Nachrichten-Eingabe für beide Stufen
- [ ] Avatar-Grid für Team-Status visualisiert

### ✅ Funktionalität
- [ ] Zweistufiger Workflow (Team → Kunde) implementiert
- [ ] Interne Freigabe-Seite für Team-Mitglieder
- [ ] Workflow-Fortschritt in Freigaben-Übersicht
- [ ] E-Mail-Benachrichtigungen für alle Stufen
- [ ] Status-Updates in Echtzeit
- [ ] Migration bestehender Freigaben

### ✅ Technisch
- [ ] Services für Team-Approval und Workflow
- [ ] Erweiterte Datenstrukturen implementiert
- [ ] Rückwärts-Kompatibilität gewährleistet
- [ ] Performance optimiert (Batch-Loading)
- [ ] Error-Handling für komplexe Workflows

## 🎯 NÄCHSTE SCHRITTE
1. **Bestätigung des Plans** - Review und Anpassungen
2. **Phase 1 Start** - Typen und UI-Komponenten
3. **Iteration & Testing** - Schrittweise Implementierung  
4. **Integration** - Campaign Editor Updates
5. **Deployment** - Migration und Go-Live

---
**Erstellt:** 2025-08-17  
**Aufwand:** ~3-4 Arbeitstage  
**Risiko:** Mittel (Komplexe Workflows, aber klare Struktur)  
**ROI:** Hoch (Deutlich verbesserter Freigabe-Prozess)