// src/components/calendar/OverdueTasksWidget.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { taskService } from '@/lib/firebase/task-service';
import { Task } from '@/types/tasks';

interface OverdueTasksWidgetProps {
  organizationId: string;
  userId?: string;
  onTaskClick?: (task: Task) => void;
  onRefresh?: () => void;
}

export function OverdueTasksWidget({ organizationId, userId, onTaskClick, onRefresh }: OverdueTasksWidgetProps) {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadOverdueTasks();
  }, [organizationId, userId]);

  const loadOverdueTasks = async () => {
    setLoading(true);
    try {
      const tasks = await taskService.getAll(organizationId, userId);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const overdue = tasks.filter(task => {
        if (task.status === 'completed') return false;
        if (!task.dueDate) return false;
        
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      }).sort((a, b) => {
        return a.dueDate!.toMillis() - b.dueDate!.toMillis();
      });
      
      setOverdueTasks(overdue);
    } catch (error) {
      // Task loading failed silently
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (task: Task): number => {
    if (!task.dueDate) return 0;
    const now = new Date();
    const dueDate = task.dueDate.toDate();
    const diffTime = Math.abs(now.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCompleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await taskService.markAsCompleted(taskId);
      await loadOverdueTasks();
      onRefresh?.();
    } catch (error) {
      // Task completion failed silently
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (overdueTasks.length === 0) {
    return null;
  }

  if (!expanded) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <Text className="text-sm font-semibold text-red-900">
                {overdueTasks.length} überfällige {overdueTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
              </Text>
              <Text className="text-sm text-red-700 mt-1">
                Bitte kümmern Sie sich um diese ausstehenden Aufgaben
              </Text>
            </div>
          </div>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
            onClick={() => setExpanded(true)}
          >
            Anzeigen
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-red-200 overflow-hidden mb-6">
      <div className="bg-red-50 px-4 py-3 border-b border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <Text className="font-semibold text-red-900">
              Überfällige Aufgaben ({overdueTasks.length})
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button plain onClick={loadOverdueTasks} className="whitespace-nowrap">
              <ArrowPathIcon />
              Aktualisieren
            </Button>
            <Button plain onClick={() => setExpanded(false)} className="whitespace-nowrap">
              <ChevronDownIcon />
              Minimieren
            </Button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {overdueTasks.map(task => {
          const daysOverdue = getDaysOverdue(task);
          
          return (
            <div 
              key={task.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onTaskClick?.(task)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <ClockIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <Text className="text-sm font-medium text-gray-900 hover:text-[#005fab]">
                        {task.title}
                      </Text>
                      {task.description && (
                        <Text className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </Text>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <Text className="text-xs text-red-600 font-medium">
                          {daysOverdue} {daysOverdue === 1 ? 'Tag' : 'Tage'} überfällig
                        </Text>
                        {task.linkedClientId && (
                          <Text className="text-xs text-gray-500">
                            Kunde verknüpft
                          </Text>
                        )}
                        <Badge 
                          color={
                            task.priority === 'urgent' ? 'red' :
                            task.priority === 'high' ? 'orange' :
                            task.priority === 'medium' ? 'yellow' : 'zinc'
                          }
                        >
                          {task.priority === 'urgent' ? 'Dringend' :
                           task.priority === 'high' ? 'Hoch' :
                           task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button 
                    plain
                    onClick={(e: React.MouseEvent) => handleCompleteTask(task.id!, e)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircleIcon />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {overdueTasks.length > 5 && (
        <div className="px-4 py-3 bg-gray-50 border-t text-center">
          <Text className="text-sm text-gray-600">
            Scrollen Sie für weitere überfällige Aufgaben
          </Text>
        </div>
      )}
    </div>
  );
}