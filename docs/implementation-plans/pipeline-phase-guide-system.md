# 📋 Implementierungsplan: Pipeline-Phase-Guide System

**Erstellt:** 21. September 2025
**Status:** In Planung
**Priorität:** Hoch (Verbesserung der User Experience)

## 🎯 Übersicht

Dieses Feature implementiert ein dynamisches Pipeline-Guide System, das je nach aktueller Projekt-Phase kontextuelle Hilfe und Aufgaben anzeigt. Anstatt der statischen "Pressemeldung Box" wird eine interaktive Projekt-Führung implementiert, die Benutzer durch die jeweilige Phase leitet.

## 🔍 Phase 1: Problem-Analyse & Konzept

### 1.1 Aktuelle Situation

**Bestehende Implementierung:**
```typescript
// In src/app/dashboard/projects/[projectId]/page.tsx Zeile 1135+
{linkedCampaigns.length > 0 && (
  <div className="bg-white rounded-lg border border-gray-200 p-6">
    {/* Pressemeldung Box - nur wenn Kampagne vorhanden */}
  </div>
)}
```

**Problem:**
- Statische Box nur für Phase 3+ (wenn Kampagne existiert)
- Keine Unterstützung für frühe Phasen (Ideen & Planung, Erstellung)
- Benutzer haben keine Führung bei Projekt-Setup

### 1.2 Ziel-Design

**Dynamisches Pipeline-Guide System:**
```typescript
// Ersetzt Pressemeldung Box mit phasen-spezifischem Guide
{project && (
  <PhaseGuideBox
    currentPhase={project.currentStage}
    projectId={project.id}
    organizationId={currentOrganization.id}
    onTaskComplete={handleGuideTaskComplete}
    onPhaseAdvance={handlePhaseAdvance}
  />
)}
```

---

## 📊 Phase 2: Pipeline-Guide Struktur

### 2.1 Phase-spezifische Guide-Definitionen

#### **Phase 1: Ideen & Planung**
```typescript
const ideasPlanningGuide: PhaseGuide = {
  phase: 'ideas_planning',
  title: 'Projekt Setup Guide',
  description: 'Legen Sie das Fundament für Ihr PR-Projekt',
  tasks: [
    {
      id: 'create_task_list',
      title: 'Task Liste erstellen',
      description: 'Erstellen Sie die ersten Projektaufgaben',
      actionType: 'navigate_tab',
      actionTarget: 'tasks',
      completed: false,
      required: true,
      estimatedTime: '10 Min.',
      helpText: 'Beginnen Sie mit grundlegenden Aufgaben wie "Zielgruppe definieren", "Kernbotschaft entwickeln"'
    },
    {
      id: 'define_target_audience',
      title: 'Zielgruppe beschreiben',
      description: 'Definieren Sie Ihre Zielgruppe im Strategiedokument',
      actionType: 'modal_form',
      actionTarget: 'target_audience_form',
      completed: false,
      required: true,
      estimatedTime: '15 Min.',
      helpText: 'Wer soll erreicht werden? Journalisten, Endkunden, Investoren?'
    },
    {
      id: 'formulate_pr_message',
      title: 'PR-Botschaft formulieren',
      description: 'Entwickeln Sie die Kernbotschaft Ihres Projekts',
      actionType: 'modal_form',
      actionTarget: 'pr_message_form',
      completed: false,
      required: true,
      estimatedTime: '20 Min.',
      helpText: 'Was ist die zentrale Nachricht? Was macht Ihr Projekt einzigartig?'
    },
    {
      id: 'upload_initial_assets',
      title: 'Erste Media Assets hochladen',
      description: 'Sammeln Sie initial verfügbare Bilder und Dokumente',
      actionType: 'navigate_tab',
      actionTarget: 'daten',
      completed: false,
      required: false,
      estimatedTime: '10 Min.',
      helpText: 'Logos, Produktbilder, erste Entwürfe - alles was bereits vorhanden ist'
    },
    {
      id: 'team_discussion',
      title: 'Mit dem Team besprechen',
      description: 'Diskutieren Sie das Projekt-Setup mit Ihrem Team',
      actionType: 'open_chat',
      actionTarget: 'team_chat',
      completed: false,
      required: false,
      estimatedTime: '15 Min.',
      helpText: 'Nutzen Sie den Team-Chat für Feedback und Abstimmung'
    },
    {
      id: 'advance_to_creation',
      title: 'Zur Erstellungsphase wechseln',
      description: 'Wenn die Planung abgeschlossen ist',
      actionType: 'advance_phase',
      actionTarget: 'creation',
      completed: false,
      required: false,
      estimatedTime: '1 Min.',
      helpText: 'Wechseln Sie zur nächsten Phase wenn Sie bereit sind'
    }
  ],
  progress: {
    completed: 0,
    total: 6,
    required: 3
  }
};
```

#### **Phase 2: Erstellung**
```typescript
const creationGuide: PhaseGuide = {
  phase: 'creation',
  title: 'Content Erstellung Guide',
  description: 'Erstellen Sie die finalen Inhalte für Ihr PR-Projekt',
  tasks: [
    {
      id: 'create_press_release',
      title: 'Pressemeldung schreiben',
      description: 'Verfassen Sie Ihre Pressemitteilung',
      actionType: 'create_campaign',
      actionTarget: 'new_campaign',
      completed: false,
      required: true,
      estimatedTime: '30 Min.',
      helpText: 'Nutzen Sie unsere KI-Unterstützung für eine professionelle Pressemeldung'
    },
    {
      id: 'finalize_media_assets',
      title: 'Finale Media Assets erstellen',
      description: 'Vervollständigen Sie Ihre Media-Sammlung',
      actionType: 'navigate_tab',
      actionTarget: 'daten',
      completed: false,
      required: true,
      estimatedTime: '20 Min.',
      helpText: 'High-Resolution Bilder, Logos, Grafiken - alles produktionsreif'
    },
    {
      id: 'build_media_list',
      title: 'Zielmedien-Liste aufbauen',
      description: 'Identifizieren Sie relevante Medien und Journalisten',
      actionType: 'navigate_external',
      actionTarget: '/dashboard/contacts/crm',
      completed: false,
      required: true,
      estimatedTime: '25 Min.',
      helpText: 'Welche Medien erreichen Ihre Zielgruppe am besten?'
    },
    {
      id: 'advance_to_internal_approval',
      title: 'Zur internen Freigabe',
      description: 'Inhalte sind fertig für interne Prüfung',
      actionType: 'advance_phase',
      actionTarget: 'internal_approval',
      completed: false,
      required: false,
      estimatedTime: '1 Min.',
      helpText: 'Bereit für die interne Qualitätssicherung'
    }
  ],
  progress: {
    completed: 0,
    total: 4,
    required: 3
  }
};
```

#### **Phase 3+: Bestehende Pressemeldung Box**
```typescript
// Phase 3+ behält die bestehende Pressemeldung Box
// Für: internal_approval, customer_approval, distribution, monitoring, completed
```

### 2.2 Datenmodell-Definition

```typescript
// src/types/phase-guide.ts
export interface PhaseGuide {
  phase: PipelineStage;
  title: string;
  description: string;
  tasks: GuideTask[];
  progress: GuideProgress;
}

export interface GuideTask {
  id: string;
  title: string;
  description: string;
  actionType: GuideActionType;
  actionTarget: string;
  completed: boolean;
  required: boolean;
  estimatedTime: string;
  helpText: string;
  dependencies?: string[]; // Andere Task IDs die erst erledigt sein müssen
}

export type GuideActionType =
  | 'navigate_tab'          // Zu anderem Tab in Projekt wechseln
  | 'navigate_external'     // Zu anderer Seite navigieren
  | 'modal_form'           // Modal mit Formular öffnen
  | 'create_campaign'      // Kampagne erstellen
  | 'open_chat'            // Team Chat öffnen
  | 'advance_phase'        // Zur nächsten Pipeline-Phase
  | 'custom_action';       // Custom JavaScript Handler

export interface GuideProgress {
  completed: number;
  total: number;
  required: number; // Mindestens erforderlich für Phase-Wechsel
}

export interface ProjectGuideState {
  projectId: string;
  currentPhase: PipelineStage;
  completedTasks: string[];
  lastUpdated: Timestamp;
  userId: string;
  organizationId: string;
}
```

---

## 🛠️ Phase 3: Komponenten-Architektur

### 3.1 PhaseGuideBox Haupt-Komponente

**Neue Datei:** `src/components/projects/guides/PhaseGuideBox.tsx`
```typescript
interface PhaseGuideBoxProps {
  currentPhase: PipelineStage;
  projectId: string;
  organizationId: string;
  onTaskComplete: (taskId: string) => void;
  onPhaseAdvance: (newPhase: PipelineStage) => void;
}

export default function PhaseGuideBox({
  currentPhase,
  projectId,
  organizationId,
  onTaskComplete,
  onPhaseAdvance
}: PhaseGuideBoxProps) {
  const [guideState, setGuideState] = useState<ProjectGuideState | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Lade Phase-spezifischen Guide
  const currentGuide = getGuideForPhase(currentPhase);

  // Akkordeon-Design mit ausklappbaren Tasks
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <DocumentTextIcon className="h-5 w-5 text-primary mr-2" />
          <Subheading>{currentGuide.title}</Subheading>
        </div>
        <GuideProgressIndicator progress={currentGuide.progress} />
      </div>

      <Text className="text-sm text-gray-600 mb-4">
        {currentGuide.description}
      </Text>

      <div className="space-y-2">
        {currentGuide.tasks.map((task) => (
          <GuideTaskItem
            key={task.id}
            task={task}
            isExpanded={expandedTask === task.id}
            onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
            onComplete={() => onTaskComplete(task.id)}
            onAction={() => handleTaskAction(task)}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3.2 GuideTaskItem Akkordeon-Element

**Neue Datei:** `src/components/projects/guides/GuideTaskItem.tsx`
```typescript
interface GuideTaskItemProps {
  task: GuideTask;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
  onAction: () => void;
}

export default function GuideTaskItem({
  task,
  isExpanded,
  onToggle,
  onComplete,
  onAction
}: GuideTaskItemProps) {
  return (
    <div className={`border rounded-lg transition-all ${
      isExpanded ? 'border-primary' : 'border-gray-200'
    }`}>
      {/* Task Header - immer sichtbar */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {task.completed ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : task.required ? (
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
            ) : (
              <ClockIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>

          {/* Task Title */}
          <div className="flex-1">
            <Text className={`text-sm font-medium ${
              task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}>
              {task.title}
            </Text>
            {task.required && !task.completed && (
              <Badge size="sm" color="red" className="ml-2">Erforderlich</Badge>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${
          isExpanded ? 'rotate-180' : ''
        }`} />
      </div>

      {/* Task Details - nur wenn expanded */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <div className="pt-3 space-y-3">
            <Text className="text-sm text-gray-600">
              {task.description}
            </Text>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>⏱️ {task.estimatedTime}</span>
              {task.dependencies && (
                <span>📋 {task.dependencies.length} Abhängigkeiten</span>
              )}
            </div>

            {task.helpText && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <Text className="text-xs text-blue-800">
                  💡 {task.helpText}
                </Text>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {!task.completed && (
                <>
                  <Button
                    size="sm"
                    onClick={onAction}
                    className="flex-1"
                  >
                    {getActionButtonText(task.actionType)}
                  </Button>
                  <Button
                    size="sm"
                    plain
                    onClick={onComplete}
                    className="px-3"
                    title="Als erledigt markieren"
                  >
                    <CheckIcon className="h-4 w-4" />
                  </Button>
                </>
              )}

              {task.completed && (
                <Button
                  size="sm"
                  plain
                  onClick={() => onComplete()} // Toggle completed state
                  className="flex-1"
                >
                  Als unerledigt markieren
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3.3 Guide-Aktionen Handler

**Neue Datei:** `src/components/projects/guides/guide-actions.ts`
```typescript
export const handleTaskAction = (
  task: GuideTask,
  context: {
    setActiveTab: (tab: string) => void;
    router: NextRouter;
    projectId: string;
    organizationId: string;
    onPhaseAdvance: (phase: PipelineStage) => void;
  }
) => {
  const { setActiveTab, router, projectId, organizationId, onPhaseAdvance } = context;

  switch (task.actionType) {
    case 'navigate_tab':
      setActiveTab(task.actionTarget);
      break;

    case 'navigate_external':
      router.push(task.actionTarget);
      break;

    case 'create_campaign':
      router.push(`/dashboard/pr-tools/campaigns/campaigns/new?projectId=${projectId}`);
      break;

    case 'open_chat':
      // Trigger Team Chat öffnen
      // Implementation je nach Chat-System
      break;

    case 'advance_phase':
      // Zeige Bestätigungs-Dialog und wechsle Phase
      if (confirm(`Möchten Sie zur Phase "${task.actionTarget}" wechseln?`)) {
        onPhaseAdvance(task.actionTarget as PipelineStage);
      }
      break;

    case 'modal_form':
      // Öffne spezifisches Modal basierend auf actionTarget
      handleModalAction(task.actionTarget, projectId, organizationId);
      break;

    default:
      console.warn(`Unbekannte Action: ${task.actionType}`);
  }
};

const handleModalAction = (actionTarget: string, projectId: string, organizationId: string) => {
  switch (actionTarget) {
    case 'target_audience_form':
      // Öffne Zielgruppen-Definition Modal
      break;
    case 'pr_message_form':
      // Öffne PR-Botschaft Formular
      break;
    // Weitere Modal-Aktionen...
  }
};

export const getActionButtonText = (actionType: GuideActionType): string => {
  switch (actionType) {
    case 'navigate_tab': return 'Tab öffnen';
    case 'navigate_external': return 'Seite öffnen';
    case 'create_campaign': return 'Kampagne erstellen';
    case 'open_chat': return 'Chat öffnen';
    case 'advance_phase': return 'Phase wechseln';
    case 'modal_form': return 'Formular öffnen';
    default: return 'Aktion ausführen';
  }
};
```

---

## 🗄️ Phase 4: Backend-Services

### 4.1 Guide-State Service

**Neue Datei:** `src/lib/firebase/guide-state-service.ts`
```typescript
export class GuideStateService {

  /**
   * Lade Guide-Status für Projekt
   */
  async getProjectGuideState(
    projectId: string,
    organizationId: string,
    userId: string
  ): Promise<ProjectGuideState | null> {
    const doc = await getDoc(doc(db, 'project_guide_states', `${projectId}_${userId}`));

    if (!doc.exists()) {
      // Erstelle initialen Guide-State
      return await this.createInitialGuideState(projectId, organizationId, userId);
    }

    return {
      id: doc.id,
      ...doc.data()
    } as ProjectGuideState;
  }

  /**
   * Markiere Task als erledigt/unerledigt
   */
  async toggleTaskCompletion(
    projectId: string,
    userId: string,
    taskId: string,
    completed: boolean
  ): Promise<void> {
    const docRef = doc(db, 'project_guide_states', `${projectId}_${userId}`);

    if (completed) {
      await updateDoc(docRef, {
        completedTasks: arrayUnion(taskId),
        lastUpdated: serverTimestamp()
      });
    } else {
      await updateDoc(docRef, {
        completedTasks: arrayRemove(taskId),
        lastUpdated: serverTimestamp()
      });
    }
  }

  /**
   * Aktualisiere Phase im Guide-State
   */
  async updatePhase(
    projectId: string,
    userId: string,
    newPhase: PipelineStage
  ): Promise<void> {
    const docRef = doc(db, 'project_guide_states', `${projectId}_${userId}`);

    await updateDoc(docRef, {
      currentPhase: newPhase,
      lastUpdated: serverTimestamp()
    });
  }

  /**
   * Erstelle initialen Guide-State
   */
  private async createInitialGuideState(
    projectId: string,
    organizationId: string,
    userId: string
  ): Promise<ProjectGuideState> {
    // Lade aktuelle Phase aus Projekt
    const project = await projectService.getById(projectId, organizationId);

    const initialState: ProjectGuideState = {
      projectId,
      currentPhase: project?.currentStage || 'ideas_planning',
      completedTasks: [],
      lastUpdated: serverTimestamp() as Timestamp,
      userId,
      organizationId
    };

    await setDoc(
      doc(db, 'project_guide_states', `${projectId}_${userId}`),
      initialState
    );

    return initialState;
  }
}

export const guideStateService = new GuideStateService();
```

### 4.2 Guide-Definitionen Service

**Neue Datei:** `src/lib/guides/guide-definitions.ts`
```typescript
import type { PhaseGuide, PipelineStage } from '@/types';

const PHASE_GUIDES: Record<PipelineStage, PhaseGuide> = {
  'ideas_planning': {
    // ... ideasPlanningGuide von oben
  },
  'creation': {
    // ... creationGuide von oben
  },
  'internal_approval': {
    phase: 'internal_approval',
    title: 'Interne Freigabe Guide',
    description: 'Interne Qualitätssicherung und Freigabe-Prozess',
    tasks: [
      {
        id: 'quality_checklist',
        title: 'Qualitäts-Checkliste abarbeiten',
        description: 'Prüfen Sie alle Inhalte auf Qualität und Korrektheit',
        actionType: 'modal_form',
        actionTarget: 'quality_checklist',
        completed: false,
        required: true,
        estimatedTime: '15 Min.',
        helpText: 'Rechtschreibung, Fakten, Corporate Design, Vollständigkeit'
      },
      {
        id: 'management_review',
        title: 'Management Review',
        description: 'Lassen Sie die Inhalte vom Management freigeben',
        actionType: 'modal_form',
        actionTarget: 'management_approval',
        completed: false,
        required: true,
        estimatedTime: '20 Min.',
        helpText: 'Strategische Ausrichtung und Botschaft prüfen lassen'
      }
      // ... weitere Tasks
    ],
    progress: { completed: 0, total: 3, required: 2 }
  },
  // Für die späteren Phasen wird die bestehende Pressemeldung Box verwendet
  'customer_approval': null, // Verwendet bestehende Pressemeldung Box
  'distribution': null,
  'monitoring': null,
  'completed': null
};

export const getGuideForPhase = (phase: PipelineStage): PhaseGuide | null => {
  return PHASE_GUIDES[phase] || null;
};

export const getAllGuides = (): PhaseGuide[] => {
  return Object.values(PHASE_GUIDES).filter(Boolean) as PhaseGuide[];
};
```

---

## 🔧 Phase 5: Integration in bestehende Projekt-Seite

### 5.1 Projektdetail-Seite Anpassung

**Modifikation:** `src/app/dashboard/projects/[projectId]/page.tsx`
```typescript
// Import hinzufügen
import PhaseGuideBox from '@/components/projects/guides/PhaseGuideBox';
import { guideStateService } from '@/lib/firebase/guide-state-service';

// State erweitern
const [guideState, setGuideState] = useState<ProjectGuideState | null>(null);

// Guide State laden
useEffect(() => {
  if (project && user && currentOrganization) {
    loadGuideState();
  }
}, [project, user, currentOrganization]);

const loadGuideState = async () => {
  if (!project || !user || !currentOrganization) return;

  try {
    const state = await guideStateService.getProjectGuideState(
      project.id!,
      currentOrganization.id,
      user.uid
    );
    setGuideState(state);
  } catch (error) {
    console.error('Error loading guide state:', error);
  }
};

// Handler für Guide-Aktionen
const handleGuideTaskComplete = async (taskId: string) => {
  if (!project || !user || !guideState) return;

  try {
    const isCurrentlyCompleted = guideState.completedTasks.includes(taskId);
    await guideStateService.toggleTaskCompletion(
      project.id!,
      user.uid,
      taskId,
      !isCurrentlyCompleted
    );

    // Reload guide state
    await loadGuideState();
  } catch (error) {
    console.error('Error toggling task completion:', error);
  }
};

const handlePhaseAdvance = async (newPhase: PipelineStage) => {
  if (!project || !user || !currentOrganization) return;

  try {
    // Update project phase
    await projectService.updateStage(project.id!, newPhase, currentOrganization.id);

    // Update guide state
    await guideStateService.updatePhase(project.id!, user.uid, newPhase);

    // Reload project and guide state
    await loadProject();
    await loadGuideState();
  } catch (error) {
    console.error('Error advancing phase:', error);
  }
};

// Template erweitern - in der unteren Reihe:
{/* Untere Reihe: Fortschritt nach Phase + Guide/Pressemeldung (responsive) */}
<div className={`grid gap-6 ${shouldShowGuideBox ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
  {/* Fortschritt nach Phase Box */}
  {project && currentOrganization && (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* ... bestehende Phase Box */}
    </div>
  )}

  {/* Guide Box ODER Pressemeldung Box */}
  {shouldShowGuideBox ? (
    <PhaseGuideBox
      currentPhase={project.currentStage}
      projectId={project.id!}
      organizationId={currentOrganization!.id}
      onTaskComplete={handleGuideTaskComplete}
      onPhaseAdvance={handlePhaseAdvance}
    />
  ) : (
    /* Bestehende Pressemeldung Box für späte Phasen */
    linkedCampaigns.length > 0 && (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* ... bestehende Pressemeldung Box */}
      </div>
    )
  )}
</div>

// Helper function
const shouldShowGuideBox = useMemo(() => {
  if (!project) return false;

  // Zeige Guide für frühe Phasen, Pressemeldung für späte Phasen
  const earlyPhases: PipelineStage[] = ['ideas_planning', 'creation', 'internal_approval'];
  return earlyPhases.includes(project.currentStage);
}, [project?.currentStage]);
```

### 5.2 Firestore Collection Schema

**Neue Collection:** `project_guide_states`
```typescript
// Document ID: `${projectId}_${userId}`
{
  projectId: string;
  currentPhase: PipelineStage;
  completedTasks: string[];  // Array of completed task IDs
  lastUpdated: Timestamp;
  userId: string;
  organizationId: string;
}

// Firestore Security Rules
match /project_guide_states/{docId} {
  allow read, write: if request.auth != null
    && resource.data.organizationId == request.auth.token.organizationId
    && resource.data.userId == request.auth.uid;
}
```

---

## 🎨 Phase 6: Erweiterte UI-Features

### 6.1 Fortschritts-Indikator

**Neue Komponente:** `src/components/projects/guides/GuideProgressIndicator.tsx`
```typescript
interface GuideProgressIndicatorProps {
  progress: GuideProgress;
}

export default function GuideProgressIndicator({ progress }: GuideProgressIndicatorProps) {
  const completionPercentage = (progress.completed / progress.total) * 100;
  const requiredMet = progress.completed >= progress.required;

  return (
    <div className="flex items-center gap-3">
      {/* Progress Ring */}
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
          {/* Background Circle */}
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          {/* Progress Circle */}
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={requiredMet ? "#10b981" : "#3b82f6"}
            strokeWidth="2"
            strokeDasharray={`${completionPercentage}, 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600">
            {progress.completed}/{progress.total}
          </span>
        </div>
      </div>

      {/* Status Text */}
      <div className="text-right">
        <div className="text-sm font-medium text-gray-900">
          {Math.round(completionPercentage)}% abgeschlossen
        </div>
        <div className="text-xs text-gray-500">
          {requiredMet ? (
            <span className="text-green-600">✓ Bereit für nächste Phase</span>
          ) : (
            <span>{progress.required - progress.completed} erforderlich</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 6.2 Smart Task Dependencies

```typescript
// In GuideTaskItem.tsx erweitern
const canCompleteTask = (task: GuideTask, completedTasks: string[]): boolean => {
  if (!task.dependencies || task.dependencies.length === 0) {
    return true;
  }

  return task.dependencies.every(depId => completedTasks.includes(depId));
};

// Disable task wenn Dependencies nicht erfüllt
<Button
  size="sm"
  onClick={onAction}
  className="flex-1"
  disabled={!canCompleteTask(task, guideState.completedTasks)}
>
  {getActionButtonText(task.actionType)}
</Button>
```

### 6.3 Personalisierte Hilfe-Texte

```typescript
// Erweitere GuideTask interface
interface GuideTask {
  // ... bestehende Felder
  helpText: string;
  helpLinks?: HelpLink[];  // NEU
  videoUrl?: string;       // NEU
  templateId?: string;     // NEU
}

interface HelpLink {
  title: string;
  url: string;
  type: 'documentation' | 'video' | 'template' | 'example';
}

// Zeige erweiterte Hilfe im Task-Detail
{task.helpLinks && task.helpLinks.length > 0 && (
  <div className="mt-3 space-y-2">
    <Text className="text-xs font-medium text-gray-700">Hilfreiche Links:</Text>
    {task.helpLinks.map((link, index) => (
      <a
        key={index}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:text-blue-800 block"
      >
        {getLinkIcon(link.type)} {link.title}
      </a>
    ))}
  </div>
)}
```

---

## 📋 Phase 7: Implementation Priority

### Reihenfolge der Umsetzung:

1. **🏗️ FOUNDATION: Basis-Struktur aufbauen**
   - TypeScript Types definieren (`phase-guide.ts`)
   - Guide-Definitionen erstellen (`guide-definitions.ts`)
   - Firebase Service implementieren (`guide-state-service.ts`)

2. **🎨 UI-KOMPONENTEN: Core Components entwickeln**
   - PhaseGuideBox Haupt-Komponente
   - GuideTaskItem Akkordeon-Element
   - GuideProgressIndicator
   - Guide-Actions Handler

3. **🔗 INTEGRATION: In Projekt-Seite integrieren**
   - Projektdetail-Seite erweitern
   - State Management hinzufügen
   - Event Handler implementieren
   - Conditional Rendering (Guide vs. Pressemeldung Box)

4. **📊 DATA & SYNC: Backend-Integration**
   - Firestore Collection und Security Rules
   - Guide-State CRUD Operationen
   - Projekt-Phase Synchronisation
   - Error Handling und Loading States

5. **✨ ENHANCEMENT: Erweiterte Features**
   - Task Dependencies Logic
   - Smart Help-Texte und Links
   - Advanced Progress Tracking
   - Animation und UX-Verbesserungen

6. **✅ TESTING & OPTIMIZATION**
   - Unit Tests für Komponenten
   - Integration Tests für Guide-Flow
   - Performance Optimierung
   - User Experience Testing

---

## 📁 Betroffene Dateien Checkliste

### Neu zu erstellen:
- [ ] `src/types/phase-guide.ts`
- [ ] `src/lib/firebase/guide-state-service.ts`
- [ ] `src/lib/guides/guide-definitions.ts`
- [ ] `src/components/projects/guides/PhaseGuideBox.tsx`
- [ ] `src/components/projects/guides/GuideTaskItem.tsx`
- [ ] `src/components/projects/guides/GuideProgressIndicator.tsx`
- [ ] `src/components/projects/guides/guide-actions.ts`

### Zu modifizieren:
- [ ] `src/app/dashboard/projects/[projectId]/page.tsx` (Integration)
- [ ] `src/types/project.ts` (erweitern falls nötig)

### Zu prüfen:
- [ ] `src/lib/firebase/project-service.ts` (updateStage method)
- [ ] Firestore Security Rules (neue Collection)

---

## ⚠️ Kritische Anforderungen

### Guide-System:
1. **Benutzerfreundlich** - Intuitive Navigation und klare Anweisungen
2. **Flexibel** - Tasks können übersprungen oder manuell als erledigt markiert werden
3. **Kontextuell** - Passen zu der jeweiligen Pipeline-Phase
4. **Persistent** - Guide-Fortschritt wird pro User gespeichert
5. **Multi-Tenancy sicher** - organizationId filtering überall

### Integration:
1. **Nahtlos** - Ersetzt Pressemeldung Box nur in frühen Phasen
2. **Rückwärtskompatibel** - Bestehende Pressemeldung-Funktionalität bleibt erhalten
3. **Performance optimiert** - Keine zusätzlichen unnötigen API-Calls
4. **Mobile responsive** - Funktioniert auf allen Bildschirmgrößen

### Datenintegrität:
1. **Sync mit Projekt-Phase** - Guide passt immer zur aktuellen Pipeline-Phase
2. **User-spezifisch** - Jeder User hat eigenen Guide-Fortschritt
3. **Konsistent** - Task-Status stimmt mit tatsächlichen Projekt-Daten überein

---

## 🎯 Erfolgskriterien

### Phase 1-4 (Foundation & Core Components):
- [ ] PhaseGuideBox rendert korrekt für frühe Phasen
- [ ] Task-Akkordeon funktioniert (expand/collapse)
- [ ] Task-Completion kann getoggled werden
- [ ] Progress-Indikator zeigt korrekten Status
- [ ] Guide-State wird in Firestore gespeichert

### Phase 5-6 (Integration & Enhancement):
- [ ] Guide Box ersetzt Pressemeldung Box in Phasen 1-3
- [ ] Navigation zu anderen Tabs funktioniert
- [ ] Phase-Advance Dialog und Funktion
- [ ] Dependencies zwischen Tasks funktionieren
- [ ] Responsive Design auf Mobile

### Phase 7 (Testing & Polish):
- [ ] End-to-End Workflow: Neue Projekt → Guide durchlaufen → Phase wechseln
- [ ] Performance unter 2s für Guide-Loading
- [ ] Keine TypeScript oder Console Errors
- [ ] User-Testing erfolgreich

### Gesamt:
- [ ] Neue Benutzer können sich intuitiv durch frühe Projekt-Phasen führen lassen
- [ ] Guide-System verbessert User Onboarding und Projekt-Setup messbar
- [ ] Bestehende Funktionalität (Pressemeldung Box) bleibt vollständig erhalten
- [ ] Code Quality: Gut dokumentiert, getestet, wartbar

---

## 🚀 Langfristige Erweiterungsmöglichkeiten

### Adaptive Guides:
- **Branchen-spezifische Tasks** - Je nach Kunde/Industrie angepasste Guides
- **Rolle-basierte Guides** - Verschiedene Guides für Manager vs. Ausführende
- **KI-basierte Empfehlungen** - Machine Learning für personalisierte Task-Vorschläge

### Integration mit bestehenden Features:
- **Template-Integration** - Automatische Template-Vorschläge basierend auf Guide-Phase
- **KI-Content-Generation** - Guide löst automatisch Content-Erstellung aus
- **Team-Synchronisation** - Guide-Fortschritt wird mit Team geteilt

### Analytics und Optimierung:
- **Guide-Analytics** - Welche Tasks werden oft übersprungen?
- **A/B-Testing** - Verschiedene Guide-Varianten testen
- **Completion-Rates** - Erfolg des Guide-Systems messen

Diese Erweiterungen können nach erfolgreicher Implementierung der Basis-Version evaluiert und umgesetzt werden.