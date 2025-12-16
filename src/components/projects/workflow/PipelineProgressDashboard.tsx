'use client';

import React, { useCallback, useMemo } from 'react';
import { PipelineStage, PIPELINE_STAGE_PROGRESS } from '@/types/project';
import { toastService } from '@/lib/utils/toast';
import { useProjectTasks } from '@/lib/hooks/useProjectTasks';
import { getProgressColor } from '@/lib/utils/progress-helpers';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useProject } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';
import { useTranslations } from 'next-intl';

interface PipelineProgressDashboardProps {}

function PipelineProgressDashboard({}: PipelineProgressDashboardProps) {
  const t = useTranslations('projects.workflow.pipeline');
  const tToast = useTranslations('toasts');

  // Context verwenden statt Props
  const { project, projectId, organizationId, setActiveTab } = useProject();
  const currentStage = project?.currentStage || 'creation';

  // React Query Hook für Tasks und Progress
  const { tasks, progress, isLoading, error } = useProjectTasks(projectId, organizationId);

  // Error Handling
  if (error) {
    toastService.error(tToast('loadError'));
  }

  // Pipeline-Fortschritt aus zentraler Konstante
  const pipelinePercent = PIPELINE_STAGE_PROGRESS[currentStage] || 0;

  // useMemo für konstante Objekte (verhindert Re-Creation bei jedem Render)
  const stageLabels = useMemo<Record<PipelineStage, string>>(() => ({
    'ideas_planning': t('stages.ideasPlanning'),
    'creation': t('stages.creation'),
    'approval': t('stages.approval'),
    'distribution': t('stages.distribution'),
    'monitoring': t('stages.monitoring'),
    'completed': t('stages.completed')
  }), [t]);

  const stageOrder = useMemo<PipelineStage[]>(() => [
    'ideas_planning',
    'creation',
    'approval',
    'distribution',
    'monitoring',
    'completed'
  ], []);

  // useCallback für Handler (stabile Referenz, verhindert Re-Renders von Child-Komponenten)
  const handleNavigateToTasks = useCallback(() => {
    setActiveTab('tasks');
  }, [setActiveTab]);

  const getStageStatus = (stage: PipelineStage): 'completed' | 'current' | 'upcoming' => {
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getMilestoneIcon = (achieved: boolean) => {
    return achieved ? (
      <TrophyIcon className="w-5 h-5 text-yellow-500" />
    ) : (
      <TrophyIcon className="w-5 h-5 text-gray-300" />
    );
  };

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-primary rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-blue-400 rounded w-48 animate-pulse"></div>
            <div className="h-6 w-6 bg-blue-400 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Skeleton für 3 Spalten */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-blue-400 rounded w-32 animate-pulse"></div>
                <div className="flex items-center space-x-3">
                  <div className="h-8 bg-blue-400 rounded w-16 animate-pulse"></div>
                  <div className="flex-1 bg-blue-400 rounded-full h-3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-3 bg-blue-400 rounded w-48 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gesamt-Progress Header */}
      <div className="bg-primary rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            {t('title')}
          </h3>
          <ChartBarIcon className="w-6 h-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gesamt-Fortschritt */}
          <div>
            <p className="text-blue-100 text-sm mb-2">{t('overallProgress')}</p>
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-bold">
                {Math.round(pipelinePercent)}%
              </div>
              <div className="flex-1 bg-blue-500 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${pipelinePercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Task-Completion */}
          <div>
            <p className="text-blue-100 text-sm mb-2">{t('taskCompletion')}</p>
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
                onClick={handleNavigateToTasks}
                className="text-xs text-blue-100 hover:text-white mt-1 underline"
              >
                {t('createTasks')}
              </button>
            )}
          </div>

          {/* Kritische Tasks */}
          <div>
            <p className="text-blue-100 text-sm mb-2">{t('criticalTasks')}</p>
            <div className="flex items-center space-x-2">
              {progress.criticalTasksRemaining > 0 ? (
                <>
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-300" />
                  <span className="text-xl font-bold">
                    {t('open', { count: progress.criticalTasksRemaining })}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-green-300" />
                  <span className="text-xl font-bold">
                    {t('allCompleted')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-blue-100">
          {t('lastUpdate')}: {new Date().toLocaleString('de-DE')}
        </div>
      </div>



      {/* Critical Task Warnings */}
      {progress.criticalTasksRemaining > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-amber-800">
              {t('warning.title')}
            </h4>
          </div>
          <p className="mt-2 text-sm text-amber-700">
            {t('warning.message', { count: progress.criticalTasksRemaining })}
          </p>
        </div>
      )}
    </div>
  );
}

// React.memo verhindert Re-Renders wenn Props gleich bleiben
export default React.memo(PipelineProgressDashboard);