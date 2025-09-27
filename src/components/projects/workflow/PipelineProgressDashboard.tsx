'use client';

import { useState, useEffect } from 'react';
import { PipelineStage } from '@/types/project';
import { taskService } from '@/lib/firebase/task-service';
import { ProjectTask } from '@/types/tasks';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface PipelineProgressDashboardProps {
  projectId: string;
  organizationId: string;
  currentStage: PipelineStage;
  onNavigateToTasks?: () => void;
}

export default function PipelineProgressDashboard({
  projectId,
  organizationId,
  currentStage,
  onNavigateToTasks
}: PipelineProgressDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({
    overallPercent: 0,
    taskCompletion: 0,
    criticalTasksRemaining: 0,
    lastUpdated: new Date()
  });

  // Lade Tasks und berechne Fortschritt
  useEffect(() => {
    const loadTasksAndCalculateProgress = async () => {
      if (!projectId || !organizationId) return;

      try {
        setLoading(true);
        const projectTasks = await taskService.getByProject(projectId, organizationId);
        setTasks(projectTasks);

        // Berechne Fortschritt
        const totalTasks = projectTasks.length;
        const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
        const criticalTasks = projectTasks.filter(task =>
          (task.priority === 'urgent' || task.priority === 'high') &&
          task.status !== 'completed'
        ).length;

        // Wenn keine Tasks vorhanden, setze Fortschritt auf 100%
        const taskCompletionPercent = totalTasks === 0 ? 100 : Math.round((completedTasks / totalTasks) * 100);

        // Feste Pipeline-Fortschritt-Werte basierend auf aktueller Phase
        const fixedProgressMap = {
          'ideas_planning': 0,    // 0% Ideen & Planung
          'creation': 20,         // 20% Content und Materialien
          'approval': 40,         // 40% Freigabe
          'distribution': 60,     // 60% Verteilung
          'monitoring': 80,       // 80% Monitoring
          'completed': 100        // 100% Abgeschlossen
        };

        const pipelinePercent = (fixedProgressMap as any)[currentStage] || 0;

        setProgress({
          overallPercent: pipelinePercent,
          taskCompletion: taskCompletionPercent,
          criticalTasksRemaining: criticalTasks,
          lastUpdated: new Date()
        });
      } catch (error) {
        console.error('Fehler beim Laden der Tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasksAndCalculateProgress();
  }, [projectId, organizationId, currentStage]);

  const stageLabels: Record<PipelineStage, string> = {
    'ideas_planning': 'Ideen & Planung',
    'creation': 'Content und Materialien',
    'approval': 'Freigabe',
    'distribution': 'Verteilung',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  } as any;

  const stageOrder: PipelineStage[] = [
    'ideas_planning',
    'creation',
    'approval',
    'distribution',
    'monitoring',
    'completed'
  ];

  const getStageStatus = (stage: PipelineStage): 'completed' | 'current' | 'upcoming' => {
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMilestoneIcon = (achieved: boolean) => {
    return achieved ? (
      <TrophyIcon className="w-5 h-5 text-yellow-500" />
    ) : (
      <TrophyIcon className="w-5 h-5 text-gray-300" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Gesamt-Progress Header */}
      <div className="bg-primary rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Pipeline-Fortschritt
          </h3>
          <ChartBarIcon className="w-6 h-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gesamt-Fortschritt */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Gesamt-Fortschritt</p>
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-bold">
                {Math.round(progress.overallPercent)}%
              </div>
              <div className="flex-1 bg-blue-500 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${progress.overallPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Task-Completion */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Task-Completion</p>
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-bold">
                {Math.round(progress.taskCompletion)}%
              </div>
              <div className="flex-1 bg-blue-500 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${progress.taskCompletion}%` }}
                ></div>
              </div>
            </div>
            {tasks.length === 0 && (
              <button
                onClick={onNavigateToTasks}
                className="text-xs text-blue-100 hover:text-white mt-1 underline"
              >
                Tasks erstellen
              </button>
            )}
          </div>

          {/* Kritische Tasks */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Kritische Tasks</p>
            <div className="flex items-center space-x-2">
              {progress.criticalTasksRemaining > 0 ? (
                <>
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-300" />
                  <span className="text-xl font-bold">
                    {progress.criticalTasksRemaining} offen
                  </span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-green-300" />
                  <span className="text-xl font-bold">
                    Alle erledigt
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-blue-100">
          Letztes Update: {progress.lastUpdated.toLocaleString('de-DE')}
          {loading && <span className="ml-2">(Wird geladen...)</span>}
        </div>
      </div>



      {/* Critical Task Warnings */}
      {progress.criticalTasksRemaining > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-amber-800">
              Warnung: Kritische Tasks ausstehend
            </h4>
          </div>
          <p className="mt-2 text-sm text-amber-700">
            Es sind noch {progress.criticalTasksRemaining} kritische Tasks offen,
            die für den nächsten Stage-Übergang erforderlich sind.
          </p>
        </div>
      )}
    </div>
  );
}