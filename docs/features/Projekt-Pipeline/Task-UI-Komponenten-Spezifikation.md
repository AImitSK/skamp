# Task-UI-Komponenten Spezifikation

## Übersicht
Detaillierte Spezifikation der benötigten UI-Komponenten für die Integration des Task-Systems in die Projekt-Pipeline, basierend auf dem bestehenden CeleroPress Design System v2.0.

## 1. BESTEHENDE KOMPONENTEN (ANALYSE & WIEDERVERWENDUNG)

### 1.1 OverdueTasksWidget (bereits implementiert)
```typescript
// src/components/calendar/OverdueTasksWidget.tsx
// BEWERTUNG: ✅ Gut strukturiert, wiederverwendbar
// VERWENDUNG: Basis für neue Projekt-Task-Komponenten

// Bestehende Features:
- Expandable/Collapsible Widget
- Task-Prioritäts-Badges
- Completion-Button mit CheckCircleIcon
- Kunde-Verknüpfung Anzeige
- Überfällige-Tage Berechnung
- Refresh-Funktionalität
- Hover-Effekte und Transitions
- Max-Height mit Scroll für längere Listen

// Wiederverwendbare Patterns:
const TaskItemLayout = () => (
  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <TaskIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <TaskContent />
        </div>
      </div>
      <TaskActions />
    </div>
  </div>
);
```

### 1.2 Design System v2.0 Komponenten
```typescript
// BEREITS VERFÜGBAR - CeleroPress Design System
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProgressBar } from '@/components/ui/progress-bar';

// Heroicons - NUR /24/outline verwenden (Design Pattern)
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  UserGroupIcon,
  CalendarIcon,
  FlagIcon,
  ListBulletIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
```

## 2. NEUE PROJEKT-TASK KOMPONENTEN

### 2.1 ProjectTaskPanel (Haupt-Komponente)
```typescript
// src/components/projects/tasks/ProjectTaskPanel.tsx
interface ProjectTaskPanelProps {
  projectId: string;
  currentStage: PipelineStage;
  tasks: Task[];
  loading?: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskCreate: (taskData: Omit<Task, 'id'>) => Promise<void>;
  onStageCompleteCheck: () => Promise<StageCompletionCheck>;
  className?: string;
}

export function ProjectTaskPanel({
  projectId,
  currentStage,
  tasks,
  loading,
  onTaskUpdate,
  onTaskCreate,
  onStageCompleteCheck,
  className
}: ProjectTaskPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['critical', 'current']));
  const [completionStatus, setCompletionStatus] = useState<StageCompletionCheck>();
  
  // Gruppierung der Tasks
  const taskGroups = useMemo(() => {
    const critical = tasks.filter(t => t.requiredForStageCompletion && t.status !== 'completed');
    const current = tasks.filter(t => t.pipelineStage === currentStage && t.status !== 'completed' && !t.requiredForStageCompletion);
    const upcoming = tasks.filter(t => getStageOrder(t.pipelineStage!) > getStageOrder(currentStage));
    const completed = tasks.filter(t => t.status === 'completed');
    
    return { critical, current, upcoming, completed };
  }, [tasks, currentStage]);

  return (
    <div className={cn("bg-white rounded-lg border", className)}>
      {/* Header mit Stage-Completion Status */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListBulletIcon className="h-5 w-5 text-gray-600" />
            <Text className="font-semibold">Projekt-Aufgaben</Text>
            <TaskCompletionBadge tasks={tasks} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              plain
              onClick={() => onStageCompleteCheck()}
              className="text-sm"
            >
              Status prüfen
            </Button>
            <TaskCreateButton onTaskCreate={onTaskCreate} />
          </div>
        </div>
        
        {/* Stage-Completion Indicator */}
        <StageCompletionIndicator
          projectId={projectId}
          stage={currentStage}
          completionStatus={completionStatus}
          className="mt-3"
        />
      </div>

      {/* Task-Gruppen */}
      <div className="divide-y divide-gray-200">
        {/* Kritische Tasks (immer sichtbar) */}
        {taskGroups.critical.length > 0 && (
          <TaskSection
            title="Kritische Aufgaben"
            subtitle="Erforderlich für Phase-Abschluss"
            count={taskGroups.critical.length}
            tasks={taskGroups.critical}
            expanded={expandedSections.has('critical')}
            onToggle={() => toggleSection('critical')}
            onTaskUpdate={onTaskUpdate}
            variant="critical"
          />
        )}

        {/* Aktuelle Stage Tasks */}
        <TaskSection
          title="Aktuelle Aufgaben"
          subtitle={`${getStageName(currentStage)} Phase`}
          count={taskGroups.current.length}
          tasks={taskGroups.current}
          expanded={expandedSections.has('current')}
          onToggle={() => toggleSection('current')}
          onTaskUpdate={onTaskUpdate}
          variant="current"
        />

        {/* Zukünftige Tasks (collapsed by default) */}
        {taskGroups.upcoming.length > 0 && (
          <TaskSection
            title="Kommende Aufgaben"
            subtitle="Nächste Phasen"
            count={taskGroups.upcoming.length}
            tasks={taskGroups.upcoming}
            expanded={expandedSections.has('upcoming')}
            onToggle={() => toggleSection('upcoming')}
            onTaskUpdate={onTaskUpdate}
            variant="upcoming"
            disabled
          />
        )}

        {/* Erledigte Tasks (collapsed by default) */}
        {taskGroups.completed.length > 0 && (
          <TaskSection
            title="Erledigte Aufgaben"
            subtitle={`${taskGroups.completed.length} abgeschlossen`}
            count={taskGroups.completed.length}
            tasks={taskGroups.completed}
            expanded={expandedSections.has('completed')}
            onToggle={() => toggleSection('completed')}
            onTaskUpdate={onTaskUpdate}
            variant="completed"
          />
        )}
      </div>
    </div>
  );
}
```

### 2.2 TaskSection (Gruppierungs-Komponente)
```typescript
// src/components/projects/tasks/TaskSection.tsx
interface TaskSectionProps {
  title: string;
  subtitle?: string;
  count: number;
  tasks: Task[];
  expanded: boolean;
  onToggle: () => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  variant: 'critical' | 'current' | 'upcoming' | 'completed';
  disabled?: boolean;
}

export function TaskSection({
  title,
  subtitle,
  count,
  tasks,
  expanded,
  onToggle,
  onTaskUpdate,
  variant,
  disabled = false
}: TaskSectionProps) {
  const variantStyles = {
    critical: {
      header: "bg-red-50 border-red-200",
      icon: "text-red-600",
      badge: "bg-red-100 text-red-800"
    },
    current: {
      header: "bg-blue-50 border-blue-200",
      icon: "text-blue-600",
      badge: "bg-blue-100 text-blue-800"
    },
    upcoming: {
      header: "bg-gray-50 border-gray-200",
      icon: "text-gray-400",
      badge: "bg-gray-100 text-gray-600"
    },
    completed: {
      header: "bg-green-50 border-green-200",
      icon: "text-green-600",
      badge: "bg-green-100 text-green-800"
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className="task-section">
      {/* Section Header */}
      <div 
        className={cn(
          "px-4 py-3 cursor-pointer transition-colors hover:opacity-80",
          styles.header
        )}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TaskSectionIcon variant={variant} className={styles.icon} />
            <div>
              <Text className="font-medium text-gray-900">{title}</Text>
              {subtitle && (
                <Text className="text-xs text-gray-600 mt-0.5">{subtitle}</Text>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={styles.badge}>
              {count}
            </Badge>
            {expanded ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Task-Liste */}
      {expanded && (
        <div className={cn(
          "divide-y divide-gray-200",
          disabled && "opacity-60 pointer-events-none"
        )}>
          {tasks.map(task => (
            <ProjectTaskItem
              key={task.id}
              task={task}
              onUpdate={(updates) => onTaskUpdate(task.id!, updates)}
              variant={variant}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper-Komponente für Section-Icons
function TaskSectionIcon({ variant, className }: { variant: string; className?: string }) {
  const iconMap = {
    critical: ExclamationTriangleIcon,
    current: ClockIcon,
    upcoming: CalendarIcon,
    completed: CheckCircleIcon
  };
  
  const IconComponent = iconMap[variant as keyof typeof iconMap] || ClockIcon;
  return <IconComponent className={cn("h-5 w-5", className)} />;
}
```

### 2.3 ProjectTaskItem (Einzelne Task-Darstellung)
```typescript
// src/components/projects/tasks/ProjectTaskItem.tsx
interface ProjectTaskItemProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  variant: 'critical' | 'current' | 'upcoming' | 'completed';
  showProject?: boolean; // Für Task-Listen außerhalb von Projekten
}

export function ProjectTaskItem({
  task,
  onUpdate,
  variant,
  showProject = false
}: ProjectTaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleComplete = async () => {
    setUpdating(true);
    try {
      await onUpdate({
        status: 'completed',
        completedAt: Timestamp.now()
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    onUpdate({ priority });
  };

  const handleAssignmentChange = (assignedTo: string[]) => {
    onUpdate({ assignedTo });
  };

  const isCompleted = task.status === 'completed';
  const isOverdue = task.dueDate && task.dueDate.toDate() < new Date() && !isCompleted;
  const isUpcoming = variant === 'upcoming';

  return (
    <div className={cn(
      "p-4 transition-colors",
      !isCompleted && "hover:bg-gray-50",
      isCompleted && "bg-gray-25 opacity-75"
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {/* Status Icon/Checkbox */}
            <div className="flex-shrink-0 mt-0.5">
              {isCompleted ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : (
                <Checkbox
                  checked={false}
                  onChange={handleComplete}
                  disabled={updating || isUpcoming}
                  className={cn(
                    variant === 'critical' && "border-red-300 focus:ring-red-500"
                  )}
                />
              )}
            </div>

            {/* Task Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Text 
                    className={cn(
                      "text-sm font-medium",
                      isCompleted ? "line-through text-gray-500" : "text-gray-900",
                      !isCompleted && "hover:text-[#005fab] cursor-pointer"
                    )}
                    onClick={() => !isCompleted && setExpanded(!expanded)}
                  >
                    {task.title}
                    {task.requiredForStageCompletion && (
                      <span className="ml-2 text-red-600">*</span>
                    )}
                  </Text>
                  
                  {task.description && !expanded && (
                    <Text className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {task.description}
                    </Text>
                  )}
                </div>

                {/* Quick Actions */}
                {!isCompleted && !isUpcoming && (
                  <TaskQuickActions
                    task={task}
                    onPriorityChange={handlePriorityChange}
                    onAssignmentChange={handleAssignmentChange}
                  />
                )}
              </div>

              {/* Task Meta */}
              <div className="flex items-center gap-4 mt-2">
                {/* Priority Badge */}
                <TaskPriorityBadge 
                  priority={task.priority} 
                  variant={variant === 'critical' ? 'critical' : 'default'}
                />

                {/* Due Date */}
                {task.dueDate && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-600 font-medium" : "text-gray-500"
                  )}>
                    <CalendarIcon className="h-3 w-3" />
                    {isOverdue ? (
                      `${getDaysOverdue(task.dueDate)} Tage überfällig`
                    ) : (
                      formatDueDate(task.dueDate)
                    )}
                  </div>
                )}

                {/* Assignment */}
                {task.assignedTo && task.assignedTo.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <UserGroupIcon className="h-3 w-3" />
                    {task.assignedTo.length === 1 ? 'Zugewiesen' : `${task.assignedTo.length} Personen`}
                  </div>
                )}

                {/* Category */}
                {task.templateCategory && (
                  <TaskCategoryBadge category={task.templateCategory} />
                )}

                {/* Project Link */}
                {showProject && task.linkedProjectId && (
                  <Text className="text-xs text-gray-500">
                    Projekt verknüpft
                  </Text>
                )}
              </div>

              {/* Expanded Content */}
              {expanded && (
                <TaskExpandedContent
                  task={task}
                  onUpdate={onUpdate}
                  className="mt-4"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.4 Task Quick Actions
```typescript
// src/components/projects/tasks/TaskQuickActions.tsx
interface TaskQuickActionsProps {
  task: Task;
  onPriorityChange: (priority: TaskPriority) => void;
  onAssignmentChange: (assignedTo: string[]) => void;
}

export function TaskQuickActions({
  task,
  onPriorityChange,
  onAssignmentChange
}: TaskQuickActionsProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative flex items-center gap-1">
      {/* Priority Quick Toggle */}
      <TaskPriorityQuickToggle
        currentPriority={task.priority}
        onChange={onPriorityChange}
      />

      {/* More Actions Menu */}
      <Button
        plain
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <EllipsisHorizontalIcon className="h-4 w-4 text-gray-500" />
      </Button>

      {showMenu && (
        <TaskActionDropdown
          task={task}
          onClose={() => setShowMenu(false)}
          onPriorityChange={onPriorityChange}
          onAssignmentChange={onAssignmentChange}
        />
      )}
    </div>
  );
}

// Priority Quick-Toggle
function TaskPriorityQuickToggle({
  currentPriority,
  onChange
}: {
  currentPriority: TaskPriority;
  onChange: (priority: TaskPriority) => void;
}) {
  const priorityConfig = {
    low: { color: 'text-gray-500', nextPriority: 'medium' as TaskPriority },
    medium: { color: 'text-yellow-600', nextPriority: 'high' as TaskPriority },
    high: { color: 'text-orange-600', nextPriority: 'urgent' as TaskPriority },
    urgent: { color: 'text-red-600', nextPriority: 'low' as TaskPriority }
  };

  const config = priorityConfig[currentPriority];

  return (
    <Button
      plain
      onClick={() => onChange(config.nextPriority)}
      className="p-1 hover:bg-gray-100 rounded"
      title={`Priorität: ${currentPriority} → ${config.nextPriority}`}
    >
      <FlagIcon className={cn("h-4 w-4", config.color)} />
    </Button>
  );
}
```

### 2.5 Stage Completion Indicator
```typescript
// src/components/projects/tasks/StageCompletionIndicator.tsx
interface StageCompletionIndicatorProps {
  projectId: string;
  stage: PipelineStage;
  completionStatus?: StageCompletionCheck;
  className?: string;
}

export function StageCompletionIndicator({
  projectId,
  stage,
  completionStatus,
  className
}: StageCompletionIndicatorProps) {
  if (!completionStatus) {
    return null;
  }

  const { canComplete, completionPercent, requiredTasks, missingTasks } = completionStatus;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Text className="text-sm text-gray-600">
            Phase-Fortschritt
          </Text>
          <Text className="text-sm font-medium text-gray-900">
            {Math.round(completionPercent)}%
          </Text>
        </div>
        <ProgressBar
          value={completionPercent}
          className={cn(
            "h-2",
            canComplete 
              ? "bg-green-100 [&>div]:bg-green-600" 
              : "bg-amber-100 [&>div]:bg-amber-600"
          )}
        />
      </div>

      {/* Status Message */}
      {canComplete ? (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
          <Text className="text-sm">
            Phase kann abgeschlossen werden
          </Text>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <Text className="text-sm">
              Noch {missingTasks.length} kritische Aufgabe{missingTasks.length !== 1 ? 'n' : ''} offen
            </Text>
            {missingTasks.length > 0 && (
              <div className="mt-2 space-y-1">
                {missingTasks.slice(0, 3).map(task => (
                  <Text key={task.id} className="text-xs text-amber-600">
                    • {task.title}
                  </Text>
                ))}
                {missingTasks.length > 3 && (
                  <Text className="text-xs text-amber-600">
                    ... und {missingTasks.length - 3} weitere
                  </Text>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2.6 Task Creation Components
```typescript
// src/components/projects/tasks/TaskCreateButton.tsx
interface TaskCreateButtonProps {
  onTaskCreate: (taskData: Omit<Task, 'id'>) => Promise<void>;
  projectId?: string;
  currentStage?: PipelineStage;
}

export function TaskCreateButton({
  onTaskCreate,
  projectId,
  currentStage
}: TaskCreateButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2 text-sm"
      >
        <PlusIcon className="h-4 w-4" />
        Aufgabe hinzufügen
      </Button>

      {showDialog && (
        <TaskCreateDialog
          projectId={projectId}
          currentStage={currentStage}
          onClose={() => setShowDialog(false)}
          onSubmit={async (taskData) => {
            await onTaskCreate(taskData);
            setShowDialog(false);
          }}
        />
      )}
    </>
  );
}

// Task Creation Dialog
function TaskCreateDialog({
  projectId,
  currentStage,
  onClose,
  onSubmit
}: {
  projectId?: string;
  currentStage?: PipelineStage;
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, 'id'>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    pipelineStage: currentStage || 'ideas_planning',
    requiredForStageCompletion: false,
    dueDate: null as Date | null
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        linkedProjectId: projectId,
        status: 'pending',
        organizationId: '', // Wird vom Service gesetzt
        userId: '', // Wird vom Service gesetzt
        dueDate: formData.dueDate ? Timestamp.fromDate(formData.dueDate) : undefined
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <Dialog.Panel>
        <Dialog.Title>Neue Aufgabe erstellen</Dialog.Title>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <Field>
            <Field.Label>Titel *</Field.Label>
            <Field.Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Was muss erledigt werden?"
              required
            />
          </Field>

          <Field>
            <Field.Label>Beschreibung</Field.Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Weitere Details zur Aufgabe..."
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <Field.Label>Priorität</Field.Label>
              <Select
                value={formData.priority}
                onChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
              >
                <Select.Option value="low">Niedrig</Select.Option>
                <Select.Option value="medium">Mittel</Select.Option>
                <Select.Option value="high">Hoch</Select.Option>
                <Select.Option value="urgent">Dringend</Select.Option>
              </Select>
            </Field>

            <Field>
              <Field.Label>Fälligkeitsdatum</Field.Label>
              <Field.Input
                type="date"
                value={formData.dueDate ? formData.dueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  dueDate: e.target.value ? new Date(e.target.value) : null 
                })}
              />
            </Field>
          </div>

          <div className="flex items-center">
            <Checkbox
              checked={formData.requiredForStageCompletion}
              onChange={(checked) => setFormData({ ...formData, requiredForStageCompletion: checked })}
            />
            <Text className="ml-2 text-sm">
              Kritische Aufgabe (erforderlich für Phasen-Abschluss)
            </Text>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button plain onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || submitting}>
              {submitting ? 'Erstelle...' : 'Aufgabe erstellen'}
            </Button>
          </div>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
}
```

## 3. TASK-BADGE KOMPONENTEN

### 3.1 TaskPriorityBadge
```typescript
// src/components/projects/tasks/TaskPriorityBadge.tsx
interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  variant?: 'default' | 'critical';
  size?: 'sm' | 'md';
}

export function TaskPriorityBadge({ 
  priority, 
  variant = 'default',
  size = 'sm' 
}: TaskPriorityBadgeProps) {
  const priorityConfig = {
    low: { 
      color: variant === 'critical' ? 'zinc' : 'zinc', 
      label: 'Niedrig' 
    },
    medium: { 
      color: variant === 'critical' ? 'yellow' : 'yellow', 
      label: 'Mittel' 
    },
    high: { 
      color: variant === 'critical' ? 'orange' : 'orange', 
      label: 'Hoch' 
    },
    urgent: { 
      color: variant === 'critical' ? 'red' : 'red', 
      label: 'Dringend' 
    }
  };

  const config = priorityConfig[priority];

  return (
    <Badge 
      color={config.color}
      className={size === 'sm' ? 'text-xs' : 'text-sm'}
    >
      {config.label}
    </Badge>
  );
}
```

### 3.2 TaskCategoryBadge
```typescript
// src/components/projects/tasks/TaskCategoryBadge.tsx
interface TaskCategoryBadgeProps {
  category: TaskTemplateCategory;
}

export function TaskCategoryBadge({ category }: TaskCategoryBadgeProps) {
  const categoryConfig = {
    project_setup: { label: 'Setup', color: 'purple' },
    content_planning: { label: 'Planung', color: 'blue' },
    content_creation: { label: 'Erstellung', color: 'green' },
    media_selection: { label: 'Medien', color: 'pink' },
    internal_review: { label: 'Review', color: 'orange' },
    customer_approval: { label: 'Freigabe', color: 'red' },
    distribution_prep: { label: 'Vorbereitung', color: 'yellow' },
    campaign_launch: { label: 'Launch', color: 'green' },
    performance_monitoring: { label: 'Monitoring', color: 'blue' },
    project_closure: { label: 'Abschluss', color: 'gray' }
  };

  const config = categoryConfig[category] || { label: category, color: 'gray' };

  return (
    <Badge color={config.color} className="text-xs">
      {config.label}
    </Badge>
  );
}
```

### 3.3 TaskCompletionBadge
```typescript
// src/components/projects/tasks/TaskCompletionBadge.tsx
interface TaskCompletionBadgeProps {
  tasks: Task[];
}

export function TaskCompletionBadge({ tasks }: TaskCompletionBadgeProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const critical = tasks.filter(t => t.requiredForStageCompletion && t.status !== 'completed').length;
    const overdue = tasks.filter(t => 
      t.dueDate && 
      t.dueDate.toDate() < new Date() && 
      t.status !== 'completed'
    ).length;

    return { total, completed, critical, overdue, percent: total > 0 ? (completed / total) * 100 : 0 };
  }, [tasks]);

  const getBadgeColor = () => {
    if (stats.critical > 0) return 'red';
    if (stats.overdue > 0) return 'orange';
    if (stats.percent === 100) return 'green';
    if (stats.percent >= 50) return 'blue';
    return 'gray';
  };

  return (
    <Badge color={getBadgeColor()}>
      {stats.completed}/{stats.total}
      {stats.critical > 0 && ` • ${stats.critical} kritisch`}
      {stats.overdue > 0 && ` • ${stats.overdue} überfällig`}
    </Badge>
  );
}
```

## 4. PROJEKT-KARTE INTEGRATION

### 4.1 ProjectCard Task-Summary Erweiterung
```typescript
// src/components/projects/ProjectCard.tsx - ERWEITERUNG
interface ProjectCardProps {
  // ... bestehende Props
  showTaskSummary?: boolean;
  onTaskQuickComplete?: (taskId: string) => void;
}

export function ProjectCard({
  project,
  showTaskSummary = true,
  onTaskQuickComplete,
  // ... andere Props
}: ProjectCardProps) {
  const [taskSummary, setTaskSummary] = useState<ProjectTaskSummary>();

  // Task-Summary laden
  useEffect(() => {
    if (showTaskSummary) {
      loadTaskSummary();
    }
  }, [project.id, showTaskSummary]);

  return (
    <div className="project-card">
      {/* ... bestehender Card-Inhalt */}
      
      {/* Task-Summary Sektion */}
      {showTaskSummary && taskSummary && (
        <div className="px-4 py-3 bg-gray-50 border-t">
          <ProjectCardTaskSummary
            summary={taskSummary}
            onQuickComplete={onTaskQuickComplete}
            onViewAll={() => openProjectTasks(project.id)}
          />
        </div>
      )}
    </div>
  );
}

// Task-Summary für Projekt-Karten
function ProjectCardTaskSummary({
  summary,
  onQuickComplete,
  onViewAll
}: {
  summary: ProjectTaskSummary;
  onQuickComplete?: (taskId: string) => void;
  onViewAll: () => void;
}) {
  return (
    <div className="space-y-2">
      {/* Progress Bar */}
      <div className="flex items-center justify-between">
        <Text className="text-xs text-gray-600">Aufgaben</Text>
        <Text className="text-xs font-medium">
          {summary.completedTasks}/{summary.totalTasks}
        </Text>
      </div>
      
      <ProgressBar
        value={summary.completionPercent}
        className={cn(
          "h-1.5",
          summary.criticalTasks > 0 
            ? "bg-red-100 [&>div]:bg-red-600" 
            : summary.overdueTasks > 0
            ? "bg-amber-100 [&>div]:bg-amber-600"
            : "bg-gray-200 [&>div]:bg-blue-600"
        )}
      />

      {/* Status Indicators */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {summary.criticalTasks > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <ExclamationTriangleIcon className="h-3 w-3" />
              <Text className="text-xs">{summary.criticalTasks} kritisch</Text>
            </div>
          )}
          {summary.overdueTasks > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <ClockIcon className="h-3 w-3" />
              <Text className="text-xs">{summary.overdueTasks} überfällig</Text>
            </div>
          )}
        </div>

        <Button
          plain
          onClick={onViewAll}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Alle anzeigen
        </Button>
      </div>

      {/* Next Task Quick Action */}
      {summary.nextTask && onQuickComplete && (
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <Text className="text-xs text-gray-600 truncate flex-1">
              Nächste: {summary.nextTask.title}
            </Text>
            <Button
              plain
              onClick={() => onQuickComplete(summary.nextTask!.id!)}
              className="ml-2 p-1 text-green-600 hover:text-green-700"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 5. MOBILE OPTIMIERUNGEN

### 5.1 ResponsiveTaskPanel
```typescript
// src/components/projects/tasks/ResponsiveTaskPanel.tsx
export function ResponsiveTaskPanel(props: ProjectTaskPanelProps) {
  const [isMobile] = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <MobileTaskPanel {...props} />;
  }

  return <ProjectTaskPanel {...props} />;
}

// Mobile-optimierte Version
function MobileTaskPanel({
  projectId,
  currentStage,
  tasks,
  onTaskUpdate,
  onTaskCreate
}: ProjectTaskPanelProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');

  return (
    <div className="bg-white rounded-lg border">
      {/* Mobile Tab-Navigation */}
      <div className="flex border-b">
        <button
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium text-center border-b-2",
            activeTab === 'current'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500"
          )}
          onClick={() => setActiveTab('current')}
        >
          Aktuell ({tasks.filter(t => t.pipelineStage === currentStage && t.status !== 'completed').length})
        </button>
        <button
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium text-center border-b-2",
            activeTab === 'all'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500"
          )}
          onClick={() => setActiveTab('all')}
        >
          Alle ({tasks.length})
        </button>
      </div>

      {/* Mobile Task-Liste */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {(activeTab === 'current' 
          ? tasks.filter(t => t.pipelineStage === currentStage && t.status !== 'completed')
          : tasks
        ).map(task => (
          <MobileTaskItem
            key={task.id}
            task={task}
            onUpdate={(updates) => onTaskUpdate(task.id!, updates)}
          />
        ))}
      </div>

      {/* Mobile Create Button */}
      <div className="p-4 border-t">
        <TaskCreateButton onTaskCreate={onTaskCreate} />
      </div>
    </div>
  );
}
```

## 6. ACCESSIBILITY & UX

### 6.1 Keyboard Navigation
```typescript
// Keyboard-Support für Task-Listen
export function useTaskKeyboardNavigation(tasks: Task[]) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, tasks.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        if (focusedIndex >= 0) {
          // Toggle task completion
          const task = tasks[focusedIndex];
          // onTaskUpdate implementation
        }
        break;
    }
  }, [tasks, focusedIndex]);

  return { focusedIndex, handleKeyDown };
}
```

### 6.2 Screen Reader Support
```typescript
// ARIA-Labels und Screen Reader Texte
const screenReaderTexts = {
  taskCompleted: (title: string) => `Aufgabe "${title}" als erledigt markiert`,
  taskPending: (title: string) => `Aufgabe "${title}" noch offen`,
  criticalTask: (title: string) => `Kritische Aufgabe "${title}" - erforderlich für Phasen-Abschluss`,
  overdueTask: (title: string, days: number) => `Aufgabe "${title}" ist ${days} Tage überfällig`,
  stageProgress: (percent: number) => `Phasen-Fortschritt: ${percent} Prozent abgeschlossen`,
  taskCreated: (title: string) => `Neue Aufgabe "${title}" erstellt`,
  priorityChanged: (title: string, priority: string) => `Priorität von Aufgabe "${title}" auf ${priority} geändert`
};

// Screen Reader Announcements
export function useScreenReaderAnnouncements() {
  const announce = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
}
```

## ZUSAMMENFASSUNG

### 🎯 NEUE UI-KOMPONENTEN ÜBERSICHT

#### **Haupt-Komponenten:**
1. `ProjectTaskPanel` - Zentrale Task-Verwaltung für Projekte
2. `TaskSection` - Gruppierung nach kritisch/aktuell/kommend/erledigt
3. `ProjectTaskItem` - Einzelne Task mit allen Funktionen
4. `StageCompletionIndicator` - Fortschritts-Anzeige mit Requirements
5. `TaskCreateButton` + Dialog - Task-Erstellung

#### **Support-Komponenten:**
6. `TaskPriorityBadge` - Prioritäts-Anzeige
7. `TaskCategoryBadge` - Kategorie-Labels
8. `TaskCompletionBadge` - Fortschritts-Zusammenfassung
9. `TaskQuickActions` - Schnelle Aktionen (Priorität, Menü)
10. `ResponsiveTaskPanel` - Mobile-optimierte Version

### 🔧 INTEGRATION POINTS

#### **Bestehende Komponenten erweitern:**
- `ProjectCard` → Task-Summary hinzufügen
- `OverdueTasksWidget` → Als Template für neue Komponenten

#### **Design System Compliance:**
- ✅ Nur /24/outline Heroicons
- ✅ Keine Shadow-Effekte  
- ✅ CeleroPress Color-Scheme
- ✅ Existing Badge/Button/Text Komponenten

#### **Performance-Optimierungen:**
- Virtualisierung für große Task-Listen
- Lazy-Loading von Task-Details
- Optimistic Updates für Quick Actions
- Mobile-First responsive Design

### 📱 MOBILE-FIRST APPROACH

#### **Mobile Optimierungen:**
- Tab-Navigation statt Accordions
- Touch-optimierte Buttons
- Swipe-Gesten für Quick Actions
- Simplified View für kleine Screens

### ♿ ACCESSIBILITY FEATURES

#### **Screen Reader Support:**
- Comprehensive ARIA-Labels
- Live Announcements für Updates
- Keyboard Navigation Support
- Focus Management

Die UI-Komponenten bauen vollständig auf dem bestehenden CeleroPress Design System auf und nutzen die bereits implementierte Task-Infrastruktur optimal aus.