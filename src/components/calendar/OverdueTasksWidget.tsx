// src/components/calendar/OverdueTasksWidget.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { taskService } from '@/lib/firebase/task-service';
import { Task } from '@/types/tasks';
import clsx from 'clsx';

interface OverdueTasksWidgetProps {
  userId: string;
  onTaskClick?: (task: Task) => void;
  onRefresh?: () => void;
}

export function OverdueTasksWidget({ userId, onTaskClick, onRefresh }: OverdueTasksWidgetProps) {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadOverdueTasks();
  }, [userId]);

  const loadOverdueTasks = async () => {
    setLoading(true);
    try {
      const tasks = await taskService.getAll(userId);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const overdue = tasks.filter(task => {
        if (task.status === 'completed') return false;
        if (!task.dueDate) return false;
        
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      }).sort((a, b) => {
        // Sortiere nach Überfälligkeitsdauer (älteste zuerst)
        return a.dueDate!.toMillis() - b.dueDate!.toMillis();
      });
      
      setOverdueTasks(overdue);
    } catch (error) {
      console.error('Fehler beim Laden überfälliger Tasks:', error);
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

  const handleCompleteTask = async (taskId: string) => {
    try {
      await taskService.markAsCompleted(taskId);
      await loadOverdueTasks();
      onRefresh?.();
      alert('Aufgabe als erledigt markiert!');
    } catch (error) {
      console.error('Fehler beim Abschließen der Task:', error);
      alert('Fehler beim Abschließen der Aufgabe');
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

  // Keine überfälligen Tasks
  if (overdueTasks.length === 0) {
    return null; // Widget nicht anzeigen wenn keine überfälligen Tasks
  }

  // Kompakte Ansicht
  if (!expanded) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-900">
                {overdueTasks.length} überfällige {overdueTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Bitte kümmern Sie sich um diese ausstehenden Aufgaben
              </p>
            </div>
          </div>
          <Button 
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => setExpanded(true)}
          >
            Anzeigen
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Erweiterte Ansicht
  return (
    <div className="bg-white rounded-lg border border-red-200 overflow-hidden mb-6">
      <div className="bg-red-50 px-4 py-3 border-b border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">
              Überfällige Aufgaben ({overdueTasks.length})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button plain onClick={loadOverdueTasks}>
              <span className="text-xs">Aktualisieren</span>
            </Button>
            <Button plain onClick={() => setExpanded(false)}>
              <span className="text-xs">Minimieren</span>
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
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    <ClockIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                        onClick={() => onTaskClick?.(task)}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-red-600 font-medium">
                          {daysOverdue} {daysOverdue === 1 ? 'Tag' : 'Tage'} überfällig
                        </span>
                        {task.linkedClientId && (
                          <span className="text-xs text-gray-500">
                            Kunde verknüpft
                          </span>
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
                    onClick={() => handleCompleteTask(task.id!)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {overdueTasks.length > 5 && (
        <div className="px-4 py-3 bg-gray-50 border-t text-center">
          <p className="text-sm text-gray-600">
            Scrollen Sie für weitere überfällige Aufgaben
          </p>
        </div>
      )}
    </div>
  );
}