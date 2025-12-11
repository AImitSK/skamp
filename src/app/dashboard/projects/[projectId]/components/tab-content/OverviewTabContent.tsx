'use client';

import React, { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import {
  Squares2X2Icon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import PipelineProgressDashboard from '@/components/projects/workflow/PipelineProgressDashboard';
import ProjectGuideBox from '@/components/projects/guides/ProjectGuideBox';
import { Project } from '@/types/project';
import { ProjectTask } from '@/types/tasks';

interface OverviewTabContentProps {
  project: Project;
  currentOrganization: any;
  todayTasks: ProjectTask[];
  loadingTodayTasks: boolean;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  completedGuideSteps: string[];
  onStepToggle: (stepId: string) => Promise<void>;
  onNavigateToTasks: () => void;
}

function OverviewTabContentComponent({
  project,
  currentOrganization,
  todayTasks,
  loadingTodayTasks,
  user,
  completedGuideSteps,
  onStepToggle,
  onNavigateToTasks
}: OverviewTabContentProps) {
  const t = useTranslations('projects.detail.tabs.overviewContent');

  return (
    <div className="space-y-6">
      {/* Pipeline-Fortschritt */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Squares2X2Icon className="h-5 w-5 text-primary mr-2" />
          <Subheading>{t('pipelineTitle')}</Subheading>
        </div>
        {project && currentOrganization && (
          <PipelineProgressDashboard />
        )}
      </div>

      {/* Heute fällige Tasks Box */}
      {todayTasks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-5 w-5 text-primary mr-2" />
              <Subheading>{t('myDueTasks')}</Subheading>
            </div>
            {user && (
              <div className="flex items-center">
                <Avatar
                  className="size-8"
                  src={user.photoURL}
                  initials={user.displayName
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || user.email?.charAt(0).toUpperCase() || '?'}
                  title={user.displayName || user.email || t('currentUser')}
                />
              </div>
            )}
          </div>

          {/* Task Liste */}
          <div className="space-y-3">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {task.status === 'completed' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : task.isOverdue ? (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-orange-500" />
                    )}
                  </div>

                  {/* Task Titel */}
                  <div className="min-w-0 flex-1">
                    <Text className="text-sm font-medium text-gray-900 truncate" title={task.title}>
                      {task.title}
                    </Text>
                  </div>
                </div>

                {/* Fortschritt */}
                <div className="flex items-center gap-3 ml-4">
                  {(() => {
                    const progress = task.progress || 0;

                    const getProgressColor = (percent: number) => {
                      if (percent >= 90) return 'bg-green-500';
                      if (percent >= 70) return 'bg-blue-500';
                      if (percent >= 50) return 'bg-yellow-500';
                      return 'bg-red-500';
                    };

                    const progressColor = getProgressColor(progress);
                    const isInProgress = task.status === 'in_progress';

                    return (
                      <>
                        <div className="relative">
                          <div className="w-20 bg-gray-200 rounded-full h-3">
                            <div
                              className={`${progressColor} rounded-full h-3 transition-all duration-500`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>

                          {isInProgress && (
                            <div className="absolute inset-0 bg-primary opacity-30 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        <Text className="text-xs text-gray-500 w-8">
                          {Math.round(progress)}%
                        </Text>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>

          {/* Footer mit Link zum Tasks Tab */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onNavigateToTasks}
              className="text-sm text-primary hover:text-primary-hover font-medium"
            >
              {t('showAllTasks')}
            </button>
          </div>
        </div>
      )}

      {/* Projekt-Leitfaden Guide Box */}
      {project && (
        <ProjectGuideBox
          completedSteps={completedGuideSteps}
          onStepToggle={onStepToggle}
        />
      )}
    </div>
  );
}

// React.memo verhindert Re-Renders wenn Props gleich bleiben (wichtig: 8 Props!)
export const OverviewTabContent = memo(OverviewTabContentComponent);
