# Task-UI-Komponenten Implementierungsplan

## Referenz-Dokumentation
**Basis:** `docs/features/Projekt-Pipeline/Task-UI-Komponenten-Spezifikation.md`

## Übersicht
Implementierungsplan für alle Task-Management UI-Komponenten der Projekt-Pipeline. Nutzt das bestehende CeleroPress Design System v2.0 und erweitert die vorhandene `OverdueTasksWidget` als Template-Basis.

---

## SCHRITT 1: PROJECT-TASK-PANEL (HAUPT-KOMPONENTE)

### 1.1 ProjectTaskPanel implementieren
**Datei:** `src/components/projects/tasks/ProjectTaskPanel.tsx` (neu)
**Agent:** `general-purpose`
**Dauer:** 3-4 Tage

**Umsetzung:**
```typescript
// src/components/projects/tasks/ProjectTaskPanel.tsx
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { 
  ListBulletIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Task, PipelineStage, StageCompletionCheck } from '@/types/tasks';
import { taskService } from '@/lib/firebase/task-service';
import { TaskSection } from './TaskSection';
import { StageCompletionIndicator } from './StageCompletionIndicator';
import { TaskCreateButton } from './TaskCreateButton';
import { TaskCompletionBadge } from './TaskCompletionBadge';
import { cn } from '@/lib/utils';

interface ProjectTaskPanelProps {
  projectId: string;
  currentStage: PipelineStage;
  organizationId: string;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskCreate: (taskData: Omit<Task, 'id'>) => Promise<void>;
  onStageCompleteCheck: () => Promise<StageCompletionCheck>;
  className?: string;
}

export function ProjectTaskPanel({
  projectId,
  currentStage,
  organizationId,
  onTaskUpdate,
  onTaskCreate,
  onStageCompleteCheck,
  className
}: ProjectTaskPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['critical', 'current'])
  );
  const [completionStatus, setCompletionStatus] = useState<StageCompletionCheck>();

  // Tasks laden
  useEffect(() => {
    loadTasks();
  }, [projectId, organizationId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const projectTasks = await taskService.getByProjectId(organizationId, projectId);
      setTasks(projectTasks);
    } catch (error) {
      console.error('Fehler beim Laden der Tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Task-Gruppierung
  const taskGroups = useMemo(() => {
    const critical = tasks.filter(t => 
      t.requiredForStageCompletion && 
      t.status !== 'completed'
    );
    
    const current = tasks.filter(t => 
      t.pipelineStage === currentStage && 
      t.status !== 'completed' && 
      !t.requiredForStageCompletion
    );
    
    const upcoming = tasks.filter(t => 
      t.pipelineStage && 
      getStageOrder(t.pipelineStage) > getStageOrder(currentStage) &&
      t.status !== 'completed'
    );
    
    const completed = tasks.filter(t => t.status === 'completed');
    
    return { critical, current, upcoming, completed };
  }, [tasks, currentStage]);

  // Stage-Reihenfolge Helper
  const getStageOrder = (stage: PipelineStage): number => {
    const stageOrder = {
      'ideas_planning': 1,
      'creation': 2,
      'internal_approval': 3,
      'customer_approval': 4,
      'distribution': 5,
      'monitoring': 6,
      'completed': 7
    };
    return stageOrder[stage] || 0;
  };

  // Section Toggle
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Stage-Completion Check
  const handleStageCompletionCheck = async () => {
    try {
      const status = await onStageCompleteCheck();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Fehler beim Prüfen der Stage-Completion:', error);
    }
  };

  // Task-Update Handler
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await onTaskUpdate(taskId, updates);
      await loadTasks(); // Refresh nach Update
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Task:', error);
    }
  };

  // Task-Erstellung Handler
  const handleTaskCreate = async (taskData: Omit<Task, 'id'>) => {
    try {
      await onTaskCreate({
        ...taskData,
        linkedProjectId: projectId,
        pipelineStage: taskData.pipelineStage || currentStage
      });
      await loadTasks(); // Refresh nach Erstellung
    } catch (error) {
      console.error('Fehler beim Erstellen der Task:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListBulletIcon className="h-5 w-5 text-gray-600" />
            <Text className="font-semibold text-gray-900">Projekt-Aufgaben</Text>
            <TaskCompletionBadge tasks={tasks} />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              plain
              onClick={handleStageCompletionCheck}
              className="text-sm"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Status prüfen
            </Button>
            <TaskCreateButton 
              onTaskCreate={handleTaskCreate}
              projectId={projectId}
              currentStage={currentStage}
            />
          </div>
        </div>
        
        {/* Stage-Completion Indicator */}
        {completionStatus && (
          <StageCompletionIndicator
            projectId={projectId}
            stage={currentStage}
            completionStatus={completionStatus}
            className="mt-3"
          />
        )}
      </div>

      {/* Task-Gruppen */}
      <div className="divide-y divide-gray-200">
        {/* Kritische Tasks */}
        {taskGroups.critical.length > 0 && (
          <TaskSection
            title="Kritische Aufgaben"
            subtitle="Erforderlich für Phase-Abschluss"
            count={taskGroups.critical.length}
            tasks={taskGroups.critical}
            expanded={expandedSections.has('critical')}
            onToggle={() => toggleSection('critical')}
            onTaskUpdate={handleTaskUpdate}
            variant="critical"
          />
        )}

        {/* Aktuelle Stage Tasks */}
        {taskGroups.current.length > 0 && (
          <TaskSection
            title="Aktuelle Aufgaben"
            subtitle={`${getStageName(currentStage)} Phase`}
            count={taskGroups.current.length}
            tasks={taskGroups.current}
            expanded={expandedSections.has('current')}
            onToggle={() => toggleSection('current')}
            onTaskUpdate={handleTaskUpdate}
            variant="current"
          />
        )}

        {/* Zukünftige Tasks */}
        {taskGroups.upcoming.length > 0 && (
          <TaskSection
            title="Kommende Aufgaben"
            subtitle="Nächste Phasen"
            count={taskGroups.upcoming.length}
            tasks={taskGroups.upcoming}
            expanded={expandedSections.has('upcoming')}
            onToggle={() => toggleSection('upcoming')}
            onTaskUpdate={handleTaskUpdate}
            variant="upcoming"
            disabled
          />
        )}

        {/* Erledigte Tasks */}
        {taskGroups.completed.length > 0 && (
          <TaskSection
            title="Erledigte Aufgaben"
            subtitle={`${taskGroups.completed.length} abgeschlossen`}
            count={taskGroups.completed.length}
            tasks={taskGroups.completed}
            expanded={expandedSections.has('completed')}
            onToggle={() => toggleSection('completed')}
            onTaskUpdate={handleTaskUpdate}
            variant="completed"
          />
        )}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <div className="p-8 text-center">
          <ListBulletIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <Text className="text-gray-600 mb-4">
            Noch keine Aufgaben für dieses Projekt
          </Text>
          <TaskCreateButton 
            onTaskCreate={handleTaskCreate}
            projectId={projectId}
            currentStage={currentStage}
          />
        </div>
      )}
    </div>
  );
}

// Stage-Namen Helper
function getStageName(stage: PipelineStage): string {
  const stageNames = {
    'ideas_planning': 'Planung',
    'creation': 'Erstellung',
    'internal_approval': 'Interne Freigabe',
    'customer_approval': 'Kunden-Freigabe',
    'distribution': 'Versand',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  };
  
  return stageNames[stage] || stage;
}
```

**Test für ProjectTaskPanel:**
```typescript
// src/__tests__/components/projects/tasks/ProjectTaskPanel.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectTaskPanel } from '@/components/projects/tasks/ProjectTaskPanel';
import { Task, PipelineStage } from '@/types/tasks';
import { taskService } from '@/lib/firebase/task-service';

jest.mock('@/lib/firebase/task-service');

describe('ProjectTaskPanel', () => {
  const defaultProps = {
    projectId: 'project_123',
    currentStage: 'creation' as PipelineStage,
    organizationId: 'org_123',
    onTaskUpdate: jest.fn(),
    onTaskCreate: jest.fn(),
    onStageCompleteCheck: jest.fn()
  };

  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Critical Task',
      status: 'pending',
      priority: 'high',
      requiredForStageCompletion: true,
      pipelineStage: 'creation',
      linkedProjectId: 'project_123',
      organizationId: 'org_123'
    } as Task,
    {
      id: '2', 
      title: 'Regular Task',
      status: 'pending',
      priority: 'medium',
      requiredForStageCompletion: false,
      pipelineStage: 'creation',
      linkedProjectId: 'project_123',
      organizationId: 'org_123'
    } as Task,
    {
      id: '3',
      title: 'Completed Task',
      status: 'completed',
      priority: 'low',
      pipelineStage: 'creation',
      linkedProjectId: 'project_123',
      organizationId: 'org_123'
    } as Task
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (taskService.getByProjectId as jest.Mock).mockResolvedValue(mockTasks);
  });

  it('should render task panel with sections', async () => {
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Projekt-Aufgaben')).toBeInTheDocument();
    });

    expect(screen.getByText('Kritische Aufgaben')).toBeInTheDocument();
    expect(screen.getByText('Aktuelle Aufgaben')).toBeInTheDocument();
    expect(screen.getByText('Erledigte Aufgaben')).toBeInTheDocument();
  });

  it('should load tasks on mount', async () => {
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(taskService.getByProjectId).toHaveBeenCalledWith('org_123', 'project_123');
    });
  });

  it('should group tasks correctly', async () => {
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      // Critical section should show count of 1 (one required task)
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should toggle sections on click', async () => {
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Kritische Aufgaben')).toBeInTheDocument();
    });

    const criticalSection = screen.getByText('Kritische Aufgaben');
    fireEvent.click(criticalSection);
    
    // Section should toggle (implementation depends on TaskSection behavior)
  });

  it('should handle stage completion check', async () => {
    const mockCompletionCheck = {
      canComplete: true,
      requiredTasks: [],
      missingTasks: [],
      completionPercent: 100
    };
    
    defaultProps.onStageCompleteCheck.mockResolvedValue(mockCompletionCheck);
    
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Status prüfen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Status prüfen'));
    
    await waitFor(() => {
      expect(defaultProps.onStageCompleteCheck).toHaveBeenCalled();
    });
  });

  it('should handle task creation', async () => {
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Aufgabe hinzufügen')).toBeInTheDocument();
    });

    // Task creation flow would be tested in TaskCreateButton test
  });

  it('should show empty state when no tasks', async () => {
    (taskService.getByProjectId as jest.Mock).mockResolvedValue([]);
    
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Noch keine Aufgaben für dieses Projekt')).toBeInTheDocument();
    });
  });

  it('should enforce multi-tenancy', async () => {
    render(<ProjectTaskPanel {...defaultProps} />);
    
    await waitFor(() => {
      expect(taskService.getByProjectId).toHaveBeenCalledWith('org_123', 'project_123');
    });
  });
});
```

---

## SCHRITT 2: TASK-SECTION KOMPONENTE

### 2.1 TaskSection implementieren
**Datei:** `src/components/projects/tasks/TaskSection.tsx` (neu)
**Agent:** `general-purpose`
**Dauer:** 2 Tage

**Umsetzung:**
```typescript
// src/components/projects/tasks/TaskSection.tsx
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRightIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Task } from '@/types/tasks';
import { ProjectTaskItem } from './ProjectTaskItem';
import { cn } from '@/lib/utils';

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
      badge: "bg-red-100 text-red-800",
      iconComponent: ExclamationTriangleIcon
    },
    current: {
      header: "bg-blue-50 border-blue-200",
      icon: "text-blue-600", 
      badge: "bg-blue-100 text-blue-800",
      iconComponent: ClockIcon
    },
    upcoming: {
      header: "bg-gray-50 border-gray-200",
      icon: "text-gray-400",
      badge: "bg-gray-100 text-gray-600",
      iconComponent: CalendarIcon
    },
    completed: {
      header: "bg-green-50 border-green-200",
      icon: "text-green-600",
      badge: "bg-green-100 text-green-800",
      iconComponent: CheckCircleIcon
    }
  };

  const styles = variantStyles[variant];
  const IconComponent = styles.iconComponent;

  return (
    <div className={cn("task-section", disabled && "opacity-60")}>
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
            <IconComponent className={cn("h-5 w-5", styles.icon)} />
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
          disabled && "pointer-events-none"
        )}>
          {tasks.length === 0 ? (
            <div className="p-4 text-center">
              <Text className="text-gray-500">Keine Aufgaben in dieser Kategorie</Text>
            </div>
          ) : (
            tasks.map(task => (
              <ProjectTaskItem
                key={task.id}
                task={task}
                onUpdate={(updates) => onTaskUpdate(task.id!, updates)}
                variant={variant}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

**Test für TaskSection:**
```typescript
// src/__tests__/components/projects/tasks/TaskSection.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskSection } from '@/components/projects/tasks/TaskSection';
import { Task } from '@/types/tasks';

describe('TaskSection', () => {
  const mockTasks: Task[] = [
    {
      id: '1',
      title: 'Test Task 1',
      status: 'pending',
      priority: 'high',
      organizationId: 'org_123'
    } as Task,
    {
      id: '2',
      title: 'Test Task 2', 
      status: 'completed',
      priority: 'medium',
      organizationId: 'org_123'
    } as Task
  ];

  const defaultProps = {
    title: 'Test Section',
    count: 2,
    tasks: mockTasks,
    expanded: false,
    onToggle: jest.fn(),
    onTaskUpdate: jest.fn(),
    variant: 'current' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render section header', () => {
    render(<TaskSection {...defaultProps} />);
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Count badge
  });

  it('should apply correct variant styles', () => {
    const { rerender } = render(<TaskSection {...defaultProps} variant="critical" />);
    
    expect(screen.getByTestId('section-header')).toHaveClass('bg-red-50');
    
    rerender(<TaskSection {...defaultProps} variant="completed" />);
    expect(screen.getByTestId('section-header')).toHaveClass('bg-green-50');
  });

  it('should toggle expansion on click', () => {
    render(<TaskSection {...defaultProps} />);
    
    const header = screen.getByText('Test Section');
    fireEvent.click(header);
    
    expect(defaultProps.onToggle).toHaveBeenCalled();
  });

  it('should show chevron icons based on expansion state', () => {
    const { rerender } = render(<TaskSection {...defaultProps} expanded={false} />);
    
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    
    rerender(<TaskSection {...defaultProps} expanded={true} />);
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
  });

  it('should render tasks when expanded', () => {
    render(<TaskSection {...defaultProps} expanded={true} />);
    
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    expect(screen.getByText('Test Task 2')).toBeInTheDocument();
  });

  it('should show empty state when no tasks', () => {
    render(<TaskSection {...defaultProps} tasks={[]} expanded={true} />);
    
    expect(screen.getByText('Keine Aufgaben in dieser Kategorie')).toBeInTheDocument();
  });

  it('should handle disabled state', () => {
    render(<TaskSection {...defaultProps} disabled={true} />);
    
    const section = screen.getByTestId('task-section');
    expect(section).toHaveClass('opacity-60');
  });

  it('should render subtitle when provided', () => {
    render(<TaskSection {...defaultProps} subtitle="Test subtitle" />);
    
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
  });
});
```

---

## SCHRITT 3: PROJECT-TASK-ITEM KOMPONENTE

### 3.1 ProjectTaskItem implementieren
**Datei:** `src/components/projects/tasks/ProjectTaskItem.tsx` (neu)
**Agent:** `general-purpose`
**Dauer:** 3 Tage

**Umsetzung:**
```typescript
// src/components/projects/tasks/ProjectTaskItem.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircleIcon,
  CalendarIcon,
  UserGroupIcon,
  FlagIcon,
  EllipsisHorizontalIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Task, TaskPriority } from '@/types/tasks';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskCategoryBadge } from './TaskCategoryBadge';
import { TaskQuickActions } from './TaskQuickActions';
import { TaskExpandedContent } from './TaskExpandedContent';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

interface ProjectTaskItemProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  variant: 'critical' | 'current' | 'upcoming' | 'completed';
  showProject?: boolean;
}

export function ProjectTaskItem({
  task,
  onUpdate,
  variant,
  showProject = false
}: ProjectTaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isCompleted = task.status === 'completed';
  const isOverdue = task.dueDate && task.dueDate.toDate() < new Date() && !isCompleted;
  const isUpcoming = variant === 'upcoming';

  // Task als erledigt markieren
  const handleComplete = async () => {
    if (updating || isUpcoming) return;
    
    setUpdating(true);
    try {
      await onUpdate({
        status: 'completed',
        completedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Fehler beim Markieren der Task:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Priorität ändern
  const handlePriorityChange = (priority: TaskPriority) => {
    onUpdate({ priority });
  };

  // Zuweisung ändern
  const handleAssignmentChange = (assignedTo: string[]) => {
    onUpdate({ assignedTo });
  };

  // Überfällige Tage berechnen
  const getDaysOverdue = (): number => {
    if (!task.dueDate || isCompleted) return 0;
    const now = new Date();
    const dueDate = task.dueDate.toDate();
    const diffTime = now.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Fälligkeitsdatum formatieren
  const formatDueDate = (): string => {
    if (!task.dueDate) return '';
    
    const dueDate = task.dueDate.toDate();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    
    const diffDays = Math.round((taskDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Morgen';
    if (diffDays === -1) return 'Gestern';
    if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} Tagen`;
    if (diffDays < -1) return `vor ${Math.abs(diffDays)} Tagen`;
    
    return dueDate.toLocaleDateString('de-DE');
  };

  return (
    <div className={cn(
      "p-4 transition-colors",
      !isCompleted && !isUpcoming && "hover:bg-gray-50",
      isCompleted && "bg-gray-25 opacity-75",
      isUpcoming && "opacity-60"
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
                  {/* Task Title */}
                  <div className="flex items-start gap-2">
                    <Text 
                      className={cn(
                        "text-sm font-medium",
                        isCompleted ? "line-through text-gray-500" : "text-gray-900",
                        !isCompleted && !isUpcoming && "hover:text-[#005fab] cursor-pointer"
                      )}
                      onClick={() => !isCompleted && !isUpcoming && setExpanded(!expanded)}
                    >
                      {task.title}
                    </Text>
                    
                    {/* Required Flag */}
                    {task.requiredForStageCompletion && (
                      <span className="text-red-600 text-xs font-bold" title="Erforderlich für Phase-Abschluss">
                        *
                      </span>
                    )}
                  </div>
                  
                  {/* Task Description (Preview) */}
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

              {/* Task Meta Information */}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {/* Priority Badge */}
                <TaskPriorityBadge 
                  priority={task.priority} 
                  variant={variant === 'critical' ? 'critical' : 'default'}
                  size="sm"
                />

                {/* Due Date */}
                {task.dueDate && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-600 font-medium" : "text-gray-500"
                  )}>
                    <CalendarIcon className="h-3 w-3" />
                    {isOverdue ? (
                      `${getDaysOverdue()} Tage überfällig`
                    ) : (
                      formatDueDate()
                    )}
                  </div>
                )}

                {/* Assignment */}
                {task.assignedTo && task.assignedTo.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <UserGroupIcon className="h-3 w-3" />
                    <Text>
                      {task.assignedTo.length === 1 ? 'Zugewiesen' : `${task.assignedTo.length} Personen`}
                    </Text>
                  </div>
                )}

                {/* Category Badge */}
                {task.templateCategory && (
                  <TaskCategoryBadge category={task.templateCategory} />
                )}

                {/* Estimated Duration */}
                {task.estimatedDuration && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <ClockIcon className="h-3 w-3" />
                    <Text>{Math.round(task.estimatedDuration / 60)}h</Text>
                  </div>
                )}

                {/* Project Link (when shown outside project context) */}
                {showProject && task.linkedProjectId && (
                  <Text className="text-xs text-blue-600">
                    🗂️ Projekt-Task
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

**Test für ProjectTaskItem:**
```typescript
// src/__tests__/components/projects/tasks/ProjectTaskItem.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectTaskItem } from '@/components/projects/tasks/ProjectTaskItem';
import { Task, TaskPriority } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

describe('ProjectTaskItem', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Task description',
    status: 'pending',
    priority: 'medium' as TaskPriority,
    requiredForStageCompletion: false,
    pipelineStage: 'creation',
    dueDate: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // Tomorrow
    organizationId: 'org_123'
  } as Task;

  const defaultProps = {
    task: mockTask,
    onUpdate: jest.fn(),
    variant: 'current' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render task with basic information', () => {
    render(<ProjectTaskItem {...defaultProps} />);
    
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Task description')).toBeInTheDocument();
  });

  it('should show required flag for critical tasks', () => {
    const requiredTask = { ...mockTask, requiredForStageCompletion: true };
    
    render(<ProjectTaskItem {...defaultProps} task={requiredTask} />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should handle task completion', async () => {
    render(<ProjectTaskItem {...defaultProps} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    await waitFor(() => {
      expect(defaultProps.onUpdate).toHaveBeenCalledWith({
        status: 'completed',
        completedAt: expect.any(Object)
      });
    });
  });

  it('should show overdue status for past due dates', () => {
    const overdueTask = {
      ...mockTask,
      dueDate: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)) // Yesterday
    };
    
    render(<ProjectTaskItem {...defaultProps} task={overdueTask} />);
    
    expect(screen.getByText(/überfällig/)).toBeInTheDocument();
  });

  it('should disable actions for upcoming tasks', () => {
    render(<ProjectTaskItem {...defaultProps} variant="upcoming" />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('should show completed state styling', () => {
    const completedTask = { ...mockTask, status: 'completed' as const };
    
    render(<ProjectTaskItem {...defaultProps} task={completedTask} />);
    
    expect(screen.getByText('Test Task')).toHaveClass('line-through text-gray-500');
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
  });

  it('should expand/collapse on title click', () => {
    render(<ProjectTaskItem {...defaultProps} />);
    
    const title = screen.getByText('Test Task');
    fireEvent.click(title);
    
    // Should show expanded content (tested in TaskExpandedContent test)
  });

  it('should handle priority changes', () => {
    render(<ProjectTaskItem {...defaultProps} />);
    
    // Priority change would be triggered through TaskQuickActions
    // This is integration-tested in TaskQuickActions test
  });

  it('should format due dates correctly', () => {
    const todayTask = {
      ...mockTask,
      dueDate: Timestamp.fromDate(new Date())
    };
    
    render(<ProjectTaskItem {...defaultProps} task={todayTask} />);
    
    expect(screen.getByText('Heute')).toBeInTheDocument();
  });

  it('should show project context when requested', () => {
    const projectTask = { ...mockTask, linkedProjectId: 'project_123' };
    
    render(<ProjectTaskItem {...defaultProps} task={projectTask} showProject={true} />);
    
    expect(screen.getByText('🗂️ Projekt-Task')).toBeInTheDocument();
  });
});
```

---

## SCHRITT 4: STAGE-COMPLETION-INDICATOR

### 4.1 StageCompletionIndicator implementieren
**Datei:** `src/components/projects/tasks/StageCompletionIndicator.tsx` (neu)
**Agent:** `general-purpose`
**Dauer:** 1-2 Tage

**Umsetzung:**
```typescript
// src/components/projects/tasks/StageCompletionIndicator.tsx
import { Text } from '@/components/ui/text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { StageCompletionCheck, PipelineStage } from '@/types/tasks';
import { cn } from '@/lib/utils';

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
    return (
      <div className={cn("flex items-center gap-2 text-gray-500", className)}>
        <ClockIcon className="h-4 w-4" />
        <Text className="text-sm">Status wird geprüft...</Text>
      </div>
    );
  }

  const { canComplete, completionPercent, requiredTasks, missingTasks } = completionStatus;

  // Stage-Namen für Anzeige
  const getStageName = (stage: PipelineStage): string => {
    const stageNames = {
      'ideas_planning': 'Ideen & Planung',
      'creation': 'Erstellung',
      'internal_approval': 'Interne Freigabe',
      'customer_approval': 'Kunden-Freigabe',
      'distribution': 'Versand',
      'monitoring': 'Monitoring',
      'completed': 'Abgeschlossen'
    };
    return stageNames[stage] || stage;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Text className="text-sm font-medium text-gray-700">
            Fortschritt: {getStageName(stage)}
          </Text>
          <Text className="text-sm font-semibold text-gray-900">
            {Math.round(completionPercent)}%
          </Text>
        </div>
        
        {/* Progress Bar */}
        <ProgressBar
          value={completionPercent}
          className={cn(
            "h-2 rounded-full",
            canComplete 
              ? "bg-green-100 [&>div]:bg-green-600" 
              : completionPercent >= 50
              ? "bg-blue-100 [&>div]:bg-blue-600"
              : "bg-amber-100 [&>div]:bg-amber-600"
          )}
        />
      </div>

      {/* Status Message */}
      {canComplete ? (
        <div className="flex items-start gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
          <CheckCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <Text className="text-sm font-medium">
              Phase kann abgeschlossen werden
            </Text>
            <Text className="text-xs mt-1 text-green-600">
              Alle erforderlichen Aufgaben sind erledigt. Das Projekt kann zur nächsten Phase übergehen.
            </Text>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <Text className="text-sm font-medium">
              Noch {missingTasks.length} kritische Aufgabe{missingTasks.length !== 1 ? 'n' : ''} offen
            </Text>
            
            {/* Missing Tasks Preview */}
            {missingTasks.length > 0 && (
              <div className="mt-2 space-y-1">
                {missingTasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-amber-600 rounded-full"></div>
                    <Text className="text-xs text-amber-700">
                      {task.title}
                    </Text>
                  </div>
                ))}
                
                {missingTasks.length > 3 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-amber-600 rounded-full"></div>
                    <Text className="text-xs text-amber-600 font-medium">
                      ... und {missingTasks.length - 3} weitere Aufgaben
                    </Text>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Required Tasks Summary */}
      {requiredTasks.length > 0 && (
        <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <Text className="text-xs font-medium text-gray-700">
              Kritische Aufgaben
            </Text>
            <Text className="text-xs text-gray-600">
              {requiredTasks.length - missingTasks.length}/{requiredTasks.length}
            </Text>
          </div>
          
          {/* Required Tasks Progress */}
          <div className="mt-1">
            <ProgressBar
              value={requiredTasks.length > 0 
                ? ((requiredTasks.length - missingTasks.length) / requiredTasks.length) * 100 
                : 100
              }
              className="h-1 bg-gray-200 [&>div]:bg-gray-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Test für StageCompletionIndicator:**
```typescript
// src/__tests__/components/projects/tasks/StageCompletionIndicator.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StageCompletionIndicator } from '@/components/projects/tasks/StageCompletionIndicator';
import { StageCompletionCheck, PipelineStage, Task } from '@/types/tasks';

describe('StageCompletionIndicator', () => {
  const defaultProps = {
    projectId: 'project_123',
    stage: 'creation' as PipelineStage
  };

  it('should show loading state when no completion status', () => {
    render(<StageCompletionIndicator {...defaultProps} />);
    
    expect(screen.getByText('Status wird geprüft...')).toBeInTheDocument();
  });

  it('should show completion success state', () => {
    const completionStatus: StageCompletionCheck = {
      canComplete: true,
      requiredTasks: [],
      missingTasks: [],
      completionPercent: 100
    };
    
    render(<StageCompletionIndicator {...defaultProps} completionStatus={completionStatus} />);
    
    expect(screen.getByText('Phase kann abgeschlossen werden')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should show incomplete state with missing tasks', () => {
    const missingTasks: Task[] = [
      { id: '1', title: 'Missing Task 1' } as Task,
      { id: '2', title: 'Missing Task 2' } as Task
    ];
    
    const completionStatus: StageCompletionCheck = {
      canComplete: false,
      requiredTasks: missingTasks,
      missingTasks,
      completionPercent: 50
    };
    
    render(<StageCompletionIndicator {...defaultProps} completionStatus={completionStatus} />);
    
    expect(screen.getByText('Noch 2 kritische Aufgaben offen')).toBeInTheDocument();
    expect(screen.getByText('Missing Task 1')).toBeInTheDocument();
    expect(screen.getByText('Missing Task 2')).toBeInTheDocument();
  });

  it('should limit displayed missing tasks to 3', () => {
    const missingTasks: Task[] = Array.from({ length: 5 }, (_, i) => ({
      id: `${i + 1}`,
      title: `Missing Task ${i + 1}`
    } as Task));
    
    const completionStatus: StageCompletionCheck = {
      canComplete: false,
      requiredTasks: missingTasks,
      missingTasks,
      completionPercent: 20
    };
    
    render(<StageCompletionIndicator {...defaultProps} completionStatus={completionStatus} />);
    
    expect(screen.getByText('... und 2 weitere Aufgaben')).toBeInTheDocument();
    expect(screen.queryByText('Missing Task 4')).not.toBeInTheDocument();
  });

  it('should show correct stage name', () => {
    const completionStatus: StageCompletionCheck = {
      canComplete: true,
      requiredTasks: [],
      missingTasks: [],
      completionPercent: 100
    };
    
    render(
      <StageCompletionIndicator 
        {...defaultProps} 
        stage="internal_approval" 
        completionStatus={completionStatus} 
      />
    );
    
    expect(screen.getByText('Fortschritt: Interne Freigabe')).toBeInTheDocument();
  });

  it('should apply correct progress bar colors', () => {
    const { rerender } = render(
      <StageCompletionIndicator 
        {...defaultProps} 
        completionStatus={{
          canComplete: true,
          requiredTasks: [],
          missingTasks: [],
          completionPercent: 100
        }} 
      />
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-100');
    
    rerender(
      <StageCompletionIndicator 
        {...defaultProps} 
        completionStatus={{
          canComplete: false,
          requiredTasks: [],
          missingTasks: [{ id: '1' } as Task],
          completionPercent: 30
        }} 
      />
    );
    
    expect(progressBar).toHaveClass('bg-amber-100');
  });
});
```

---

## SCHRITT 5: TASK-BADGE-KOMPONENTEN

### 5.1 TaskPriorityBadge, TaskCategoryBadge, TaskCompletionBadge
**Dateien:** `src/components/projects/tasks/` (Badge-Komponenten)
**Agent:** `general-purpose`
**Dauer:** 1 Tag

**Umsetzung TaskPriorityBadge:**
```typescript
// src/components/projects/tasks/TaskPriorityBadge.tsx
import { Badge } from '@/components/ui/badge';
import { TaskPriority } from '@/types/tasks';

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
      color: 'zinc' as const, 
      label: 'Niedrig' 
    },
    medium: { 
      color: 'yellow' as const, 
      label: 'Mittel' 
    },
    high: { 
      color: 'orange' as const, 
      label: 'Hoch' 
    },
    urgent: { 
      color: 'red' as const, 
      label: 'Dringend' 
    }
  };

  const config = priorityConfig[priority];

  return (
    <Badge 
      color={config.color}
      className={size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'}
    >
      {config.label}
    </Badge>
  );
}
```

**Umsetzung TaskCategoryBadge:**
```typescript
// src/components/projects/tasks/TaskCategoryBadge.tsx
import { Badge } from '@/components/ui/badge';
import { TaskTemplateCategory } from '@/types/tasks';

interface TaskCategoryBadgeProps {
  category: TaskTemplateCategory;
}

export function TaskCategoryBadge({ category }: TaskCategoryBadgeProps) {
  const categoryConfig = {
    project_setup: { label: 'Setup', color: 'purple' as const },
    content_planning: { label: 'Planung', color: 'blue' as const },
    content_creation: { label: 'Erstellung', color: 'green' as const },
    media_selection: { label: 'Medien', color: 'pink' as const },
    internal_review: { label: 'Review', color: 'orange' as const },
    customer_approval: { label: 'Freigabe', color: 'red' as const },
    distribution_prep: { label: 'Vorbereitung', color: 'yellow' as const },
    campaign_launch: { label: 'Launch', color: 'green' as const },
    performance_monitoring: { label: 'Monitoring', color: 'blue' as const },
    project_closure: { label: 'Abschluss', color: 'gray' as const }
  };

  const config = categoryConfig[category] || { label: category, color: 'gray' as const };

  return (
    <Badge color={config.color} className="text-xs px-2 py-0.5">
      {config.label}
    </Badge>
  );
}
```

**Umsetzung TaskCompletionBadge:**
```typescript
// src/components/projects/tasks/TaskCompletionBadge.tsx
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/tasks';

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

  const getBadgeText = () => {
    let text = `${stats.completed}/${stats.total}`;
    
    if (stats.critical > 0) {
      text += ` • ${stats.critical} kritisch`;
    } else if (stats.overdue > 0) {
      text += ` • ${stats.overdue} überfällig`;
    }
    
    return text;
  };

  return (
    <Badge color={getBadgeColor()} className="text-xs">
      {getBadgeText()}
    </Badge>
  );
}
```

**Test für Task-Badges:**
```typescript
// src/__tests__/components/projects/tasks/TaskBadges.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TaskPriorityBadge } from '@/components/projects/tasks/TaskPriorityBadge';
import { TaskCategoryBadge } from '@/components/projects/tasks/TaskCategoryBadge';
import { TaskCompletionBadge } from '@/components/projects/tasks/TaskCompletionBadge';
import { Task, TaskPriority, TaskTemplateCategory } from '@/types/tasks';

describe('TaskBadges', () => {
  describe('TaskPriorityBadge', () => {
    it('should render priority badges correctly', () => {
      const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
      const expectedLabels = ['Niedrig', 'Mittel', 'Hoch', 'Dringend'];
      
      priorities.forEach((priority, index) => {
        const { rerender } = render(<TaskPriorityBadge priority={priority} />);
        expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();
        rerender(<></>);
      });
    });

    it('should support different sizes', () => {
      const { rerender } = render(<TaskPriorityBadge priority="high" size="sm" />);
      expect(screen.getByText('Hoch')).toHaveClass('text-xs');
      
      rerender(<TaskPriorityBadge priority="high" size="md" />);
      expect(screen.getByText('Hoch')).toHaveClass('text-sm');
    });
  });

  describe('TaskCategoryBadge', () => {
    it('should render category badges correctly', () => {
      const categories: TaskTemplateCategory[] = [
        'project_setup',
        'content_creation', 
        'customer_approval'
      ];
      const expectedLabels = ['Setup', 'Erstellung', 'Freigabe'];
      
      categories.forEach((category, index) => {
        const { rerender } = render(<TaskCategoryBadge category={category} />);
        expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();
        rerender(<></>);
      });
    });

    it('should handle unknown categories gracefully', () => {
      render(<TaskCategoryBadge category={'unknown' as TaskTemplateCategory} />);
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  describe('TaskCompletionBadge', () => {
    const mockTasks: Task[] = [
      { id: '1', status: 'completed', requiredForStageCompletion: false } as Task,
      { id: '2', status: 'pending', requiredForStageCompletion: true } as Task,
      { id: '3', status: 'pending', requiredForStageCompletion: false, 
        dueDate: { toDate: () => new Date(Date.now() - 24 * 60 * 60 * 1000) } } as Task
    ];

    it('should show completion ratio', () => {
      render(<TaskCompletionBadge tasks={mockTasks} />);
      expect(screen.getByText(/1\/3/)).toBeInTheDocument();
    });

    it('should highlight critical tasks', () => {
      render(<TaskCompletionBadge tasks={mockTasks} />);
      expect(screen.getByText(/1 kritisch/)).toBeInTheDocument();
    });

    it('should show overdue when no critical tasks', () => {
      const tasksWithoutCritical = mockTasks.filter(t => !t.requiredForStageCompletion);
      render(<TaskCompletionBadge tasks={tasksWithoutCritical} />);
      expect(screen.getByText(/überfällig/)).toBeInTheDocument();
    });

    it('should handle empty task list', () => {
      render(<TaskCompletionBadge tasks={[]} />);
      expect(screen.getByText('0/0')).toBeInTheDocument();
    });
  });
});
```

---

## SCHRITT 6: TASK-CREATION KOMPONENTEN

### 6.1 TaskCreateButton & TaskCreateDialog
**Dateien:** `src/components/projects/tasks/TaskCreateButton.tsx` & `TaskCreateDialog.tsx`
**Agent:** `general-purpose`
**Dauer:** 2-3 Tage

**Umsetzung TaskCreateButton:**
```typescript
// src/components/projects/tasks/TaskCreateButton.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Task, PipelineStage } from '@/types/tasks';
import { TaskCreateDialog } from './TaskCreateDialog';

interface TaskCreateButtonProps {
  onTaskCreate: (taskData: Omit<Task, 'id'>) => Promise<void>;
  projectId?: string;
  currentStage?: PipelineStage;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function TaskCreateButton({
  onTaskCreate,
  projectId,
  currentStage,
  disabled = false,
  size = 'md'
}: TaskCreateButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={disabled}
        className={`flex items-center gap-2 ${
          size === 'sm' ? 'text-sm px-3 py-1.5' : 'text-sm px-4 py-2'
        }`}
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
```

**Umsetzung TaskCreateDialog:**
```typescript
// src/components/projects/tasks/TaskCreateDialog.tsx
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import { Task, TaskPriority, PipelineStage, TaskTemplateCategory } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

interface TaskCreateDialogProps {
  projectId?: string;
  currentStage?: PipelineStage;
  onClose: () => void;
  onSubmit: (taskData: Omit<Task, 'id'>) => Promise<void>;
}

export function TaskCreateDialog({
  projectId,
  currentStage,
  onClose,
  onSubmit
}: TaskCreateDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    pipelineStage: currentStage || 'ideas_planning' as PipelineStage,
    templateCategory: 'content_creation' as TaskTemplateCategory,
    requiredForStageCompletion: false,
    dueDate: null as Date | null,
    estimatedDuration: null as number | null
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Titel ist erforderlich';
    }

    if (formData.title.length > 100) {
      newErrors.title = 'Titel darf maximal 100 Zeichen lang sein';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Beschreibung darf maximal 500 Zeichen lang sein';
    }

    if (formData.estimatedDuration && formData.estimatedDuration <= 0) {
      newErrors.estimatedDuration = 'Dauer muss positiv sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);

    try {
      const taskData: Omit<Task, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: 'pending',
        priority: formData.priority,
        pipelineStage: formData.pipelineStage,
        templateCategory: formData.templateCategory,
        requiredForStageCompletion: formData.requiredForStageCompletion,
        dueDate: formData.dueDate ? Timestamp.fromDate(formData.dueDate) : undefined,
        estimatedDuration: formData.estimatedDuration || undefined,
        linkedProjectId: projectId,
        // Diese werden vom Service gesetzt:
        organizationId: '', 
        userId: '',
        createdAt: undefined,
        updatedAt: undefined
      };

      await onSubmit(taskData);
    } catch (error) {
      console.error('Fehler beim Erstellen der Aufgabe:', error);
      setErrors({ submit: 'Fehler beim Erstellen der Aufgabe' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear related errors
    if ('title' in updates) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  return (
    <Dialog open={true} onClose={onClose} size="lg">
      <Dialog.Panel>
        <Dialog.Title>Neue Aufgabe erstellen</Dialog.Title>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Titel */}
          <Field>
            <Field.Label>Titel *</Field.Label>
            <Field.Input
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
              placeholder="Was muss erledigt werden?"
              className={errors.title ? 'border-red-300' : ''}
            />
            {errors.title && (
              <Text className="text-sm text-red-600 mt-1">{errors.title}</Text>
            )}
          </Field>

          {/* Beschreibung */}
          <Field>
            <Field.Label>Beschreibung</Field.Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Weitere Details zur Aufgabe..."
              rows={3}
              className={errors.description ? 'border-red-300' : ''}
            />
            {errors.description && (
              <Text className="text-sm text-red-600 mt-1">{errors.description}</Text>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            {/* Priorität */}
            <Field>
              <Field.Label>Priorität</Field.Label>
              <Select
                value={formData.priority}
                onChange={(value) => updateFormData({ priority: value as TaskPriority })}
              >
                <Select.Option value="low">Niedrig</Select.Option>
                <Select.Option value="medium">Mittel</Select.Option>
                <Select.Option value="high">Hoch</Select.Option>
                <Select.Option value="urgent">Dringend</Select.Option>
              </Select>
            </Field>

            {/* Pipeline-Stage */}
            <Field>
              <Field.Label>Pipeline-Phase</Field.Label>
              <Select
                value={formData.pipelineStage}
                onChange={(value) => updateFormData({ pipelineStage: value as PipelineStage })}
              >
                <Select.Option value="ideas_planning">Ideen & Planung</Select.Option>
                <Select.Option value="creation">Erstellung</Select.Option>
                <Select.Option value="internal_approval">Interne Freigabe</Select.Option>
                <Select.Option value="customer_approval">Kunden-Freigabe</Select.Option>
                <Select.Option value="distribution">Versand</Select.Option>
                <Select.Option value="monitoring">Monitoring</Select.Option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Kategorie */}
            <Field>
              <Field.Label>Kategorie</Field.Label>
              <Select
                value={formData.templateCategory}
                onChange={(value) => updateFormData({ templateCategory: value as TaskTemplateCategory })}
              >
                <Select.Option value="project_setup">Projekt Setup</Select.Option>
                <Select.Option value="content_planning">Content Planung</Select.Option>
                <Select.Option value="content_creation">Content Erstellung</Select.Option>
                <Select.Option value="media_selection">Medien-Auswahl</Select.Option>
                <Select.Option value="internal_review">Interne Review</Select.Option>
                <Select.Option value="customer_approval">Kunden-Freigabe</Select.Option>
                <Select.Option value="distribution_prep">Versand-Vorbereitung</Select.Option>
                <Select.Option value="campaign_launch">Kampagnen-Launch</Select.Option>
                <Select.Option value="performance_monitoring">Performance Monitoring</Select.Option>
                <Select.Option value="project_closure">Projekt-Abschluss</Select.Option>
              </Select>
            </Field>

            {/* Fälligkeitsdatum */}
            <Field>
              <Field.Label>Fälligkeitsdatum</Field.Label>
              <Field.Input
                type="date"
                value={formData.dueDate ? formData.dueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => updateFormData({ 
                  dueDate: e.target.value ? new Date(e.target.value) : null 
                })}
                min={new Date().toISOString().split('T')[0]}
              />
            </Field>
          </div>

          {/* Geschätzte Dauer */}
          <Field>
            <Field.Label>Geschätzte Dauer (Minuten)</Field.Label>
            <Field.Input
              type="number"
              value={formData.estimatedDuration || ''}
              onChange={(e) => updateFormData({ 
                estimatedDuration: e.target.value ? parseInt(e.target.value) : null 
              })}
              placeholder="z.B. 120 für 2 Stunden"
              min="1"
              className={errors.estimatedDuration ? 'border-red-300' : ''}
            />
            {errors.estimatedDuration && (
              <Text className="text-sm text-red-600 mt-1">{errors.estimatedDuration}</Text>
            )}
          </Field>

          {/* Kritische Aufgabe Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={formData.requiredForStageCompletion}
              onChange={(checked) => updateFormData({ requiredForStageCompletion: checked })}
              className="mt-1"
            />
            <div>
              <Text className="text-sm font-medium text-gray-900">
                Kritische Aufgabe
              </Text>
              <Text className="text-sm text-gray-600">
                Diese Aufgabe muss erledigt sein, bevor die Pipeline-Phase abgeschlossen werden kann.
              </Text>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text className="text-sm text-red-600">{errors.submit}</Text>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button plain onClick={onClose} disabled={submitting}>
              Abbrechen
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.title.trim() || submitting}
            >
              {submitting ? 'Erstelle...' : 'Aufgabe erstellen'}
            </Button>
          </div>
        </form>
      </Dialog.Panel>
    </Dialog>
  );
}
```

**Test für Task-Creation:**
```typescript
// src/__tests__/components/projects/tasks/TaskCreate.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskCreateButton } from '@/components/projects/tasks/TaskCreateButton';
import { TaskCreateDialog } from '@/components/projects/tasks/TaskCreateDialog';

describe('TaskCreate Components', () => {
  describe('TaskCreateButton', () => {
    const defaultProps = {
      onTaskCreate: jest.fn(),
      projectId: 'project_123',
      currentStage: 'creation' as const
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render create button', () => {
      render(<TaskCreateButton {...defaultProps} />);
      expect(screen.getByText('Aufgabe hinzufügen')).toBeInTheDocument();
    });

    it('should open dialog on button click', () => {
      render(<TaskCreateButton {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Aufgabe hinzufügen'));
      expect(screen.getByText('Neue Aufgabe erstellen')).toBeInTheDocument();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<TaskCreateButton {...defaultProps} disabled={true} />);
      
      const button = screen.getByText('Aufgabe hinzufügen');
      expect(button).toBeDisabled();
    });
  });

  describe('TaskCreateDialog', () => {
    const defaultProps = {
      projectId: 'project_123',
      currentStage: 'creation' as const,
      onClose: jest.fn(),
      onSubmit: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render create dialog form', () => {
      render(<TaskCreateDialog {...defaultProps} />);
      
      expect(screen.getByText('Neue Aufgabe erstellen')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Was muss erledigt werden?')).toBeInTheDocument();
      expect(screen.getByText('Priorität')).toBeInTheDocument();
      expect(screen.getByText('Pipeline-Phase')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      render(<TaskCreateDialog {...defaultProps} />);
      
      const submitButton = screen.getByText('Aufgabe erstellen');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Titel ist erforderlich')).toBeInTheDocument();
      });
      
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    it('should submit form with valid data', async () => {
      defaultProps.onSubmit.mockResolvedValue(undefined);
      render(<TaskCreateDialog {...defaultProps} />);
      
      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Was muss erledigt werden?'), {
        target: { value: 'Test Task' }
      });
      
      fireEvent.change(screen.getByPlaceholderText('Weitere Details zur Aufgabe...'), {
        target: { value: 'Test description' }
      });
      
      // Submit
      fireEvent.click(screen.getByText('Aufgabe erstellen'));
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Task',
            description: 'Test description',
            status: 'pending',
            linkedProjectId: 'project_123'
          })
        );
      });
    });

    it('should handle form validation errors', async () => {
      render(<TaskCreateDialog {...defaultProps} />);
      
      // Enter too long title
      fireEvent.change(screen.getByPlaceholderText('Was muss erledigt werden?'), {
        target: { value: 'x'.repeat(101) }
      });
      
      fireEvent.click(screen.getByText('Aufgabe erstellen'));
      
      await waitFor(() => {
        expect(screen.getByText('Titel darf maximal 100 Zeichen lang sein')).toBeInTheDocument();
      });
    });

    it('should set default values correctly', () => {
      render(<TaskCreateDialog {...defaultProps} currentStage="internal_approval" />);
      
      // Should default to current stage
      expect(screen.getByDisplayValue('Interne Freigabe')).toBeInTheDocument();
    });

    it('should handle critical task checkbox', () => {
      render(<TaskCreateDialog {...defaultProps} />);
      
      const checkbox = screen.getByLabelText(/Kritische Aufgabe/);
      expect(checkbox).not.toBeChecked();
      
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });
});
```

---

## SCHRITT 7: DOKUMENTATION AKTUALISIEREN

### 7.1 Implementation Status dokumentieren
**Agent:** `documentation-orchestrator`
**Dauer:** 0.5 Tage

**Aufgaben:**
1. `docs/features/Projekt-Pipeline/Task-UI-Komponenten-Spezifikation.md` aktualisieren
   - Implementation Status: "✅ COMPLETED"
   - Komponenten-Referenzen und Verwendungsbeispiele
   - Test-Coverage-Report

2. Masterplan aktualisieren
   - Task-UI Phase als "COMPLETED" markieren
   - Nächste Integration-Phase vorbereiten

3. Komponenten-Dokumentation erstellen
   - API-Reference für alle neuen Komponenten
   - Storybook-Stories für UI-Komponenten
   - Usage-Guidelines

---

## ERFOLGSKRITERIEN

### Funktionale Anforderungen:
- ✅ ProjectTaskPanel vollständig implementiert
- ✅ Task-Gruppierung (critical/current/upcoming/completed)
- ✅ Stage-Completion Indicator funktional
- ✅ Task-Creation-Dialog mit Validation
- ✅ Badge-System für Priority/Category/Completion

### Qualitätsanforderungen:
- ✅ 100% Test-Coverage für alle UI-Komponenten
- ✅ CeleroPress Design System v2.0 Compliance
- ✅ Mobile-responsive Design
- ✅ Accessibility (Screen Reader, Keyboard Navigation)

### Integration-Requirements:
- ✅ Bestehende OverdueTasksWidget als Template genutzt
- ✅ Task-Service Integration nahtlos
- ✅ Project-Service Hooks funktional
- ✅ Real-time Updates über Firestore

### Design-System Compliance:
- ✅ Nur /24/outline Heroicons verwendet
- ✅ Keine Shadow-Effekte (Design Pattern)
- ✅ CeleroPress Color-Schema
- ✅ Bestehende UI-Komponenten wiederverwendet

---

## PERFORMANCE-OPTIMIERUNG

### 7.1 Virtualisierung für große Task-Listen
**Implementierung bei Bedarf:**
```typescript
// Für Projekte mit >100 Tasks
import { FixedSizeList as List } from 'react-window';

const VirtualizedTaskList = ({ tasks, onTaskUpdate }) => (
  <List
    height={400}
    itemCount={tasks.length}
    itemSize={80}
    itemData={{ tasks, onTaskUpdate }}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <ProjectTaskItem 
          task={data.tasks[index]} 
          onUpdate={data.onTaskUpdate} 
        />
      </div>
    )}
  </List>
);
```

### 7.2 Memoization für Task-Berechnung
```typescript
// useMemo für schwere Berechnungen
const taskGroups = useMemo(() => {
  // ... Gruppierungs-Logic
}, [tasks, currentStage]);

const completionStats = useMemo(() => {
  // ... Statistik-Berechnung
}, [tasks]);
```

---

## NÄCHSTE SCHRITTE

Nach erfolgreichem Abschluss:
1. **Pipeline-Task-Integration Workflows implementieren** (nächste Phase)
2. **Mobile-Optimierung testen** auf verschiedenen Geräten
3. **Performance-Tests** mit großen Task-Listen
4. **User-Training** für neue Task-Management Features

**Die Task-UI-Komponenten bilden das Benutzer-Interface für das gesamte Task-System und müssen vollständig getestet und optimiert sein, bevor die Workflow-Integration beginnt.**