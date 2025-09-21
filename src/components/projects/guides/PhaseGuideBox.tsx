// src/components/projects/guides/PhaseGuideBox.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

import { getGuideForPhase } from '@/lib/guides/guide-definitions';
import { guideStateService } from '@/lib/firebase/guide-state-service';
import type { PhaseGuide, GuideTask, ProjectGuideState, PipelineStage } from '@/types/phase-guide';

interface PhaseGuideBoxProps {
  currentPhase: PipelineStage;
  projectId: string;
  organizationId: string;
  userId: string;
  onTaskComplete: (taskId: string) => void;
  onPhaseAdvance: (newPhase: PipelineStage) => void;
  setActiveTab: (tab: string) => void;
}

export default function PhaseGuideBox({
  currentPhase,
  projectId,
  organizationId,
  userId,
  onTaskComplete,
  onPhaseAdvance,
  setActiveTab
}: PhaseGuideBoxProps) {
  const router = useRouter();
  const [guideState, setGuideState] = useState<ProjectGuideState | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const currentGuide = getGuideForPhase(currentPhase);

  useEffect(() => {
    loadGuideState();
  }, [projectId, userId]);

  const loadGuideState = async () => {
    try {
      const state = await guideStateService.getProjectGuideState(
        projectId,
        organizationId,
        userId
      );
      setGuideState(state);

      // Auto-expand first incomplete task
      if (state && currentGuide) {
        const firstIncomplete = currentGuide.tasks.find(
          task => !state.completedTasks.includes(task.id)
        );
        if (firstIncomplete) {
          setExpandedTask(firstIncomplete.id);
        }
      }
    } catch (error) {
      console.error('Error loading guide state:', error);
    }
  };

  const handleTaskAction = (task: GuideTask) => {
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
      case 'advance_phase':
        if (confirm(`Möchten Sie zur nächsten Phase wechseln?`)) {
          onPhaseAdvance(task.actionTarget as PipelineStage);
        }
        break;
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    if (!guideState) return;

    const isCompleted = guideState.completedTasks.includes(taskId);
    try {
      await guideStateService.toggleTaskCompletion(
        projectId,
        userId,
        taskId,
        !isCompleted
      );
      onTaskComplete(taskId);
      await loadGuideState();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const getActionButtonText = (actionType: string): string => {
    switch (actionType) {
      case 'navigate_tab': return 'Tab öffnen';
      case 'create_campaign': return 'Kampagne erstellen';
      case 'advance_phase': return 'Phase wechseln';
      default: return 'Aktion';
    }
  };

  if (!currentGuide || !guideState) {
    return null;
  }

  const completedCount = guideState.completedTasks.length;
  const progressPercentage = Math.round((completedCount / currentGuide.tasks.length) * 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <DocumentTextIcon className="h-5 w-5 text-primary mr-2" />
          <Subheading>{currentGuide.title}</Subheading>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {progressPercentage}% abgeschlossen
          </div>
          <div className="text-xs text-gray-500">
            {completedCount}/{currentGuide.tasks.length} Tasks
          </div>
        </div>
      </div>

      <Text className="text-sm text-gray-600 mb-4">
        {currentGuide.description}
      </Text>

      <div className="space-y-2">
        {currentGuide.tasks.map((task) => {
          const isCompleted = guideState.completedTasks.includes(task.id);
          const isExpanded = expandedTask === task.id;

          return (
            <div
              key={task.id}
              className={`border rounded-lg transition-all ${
                isExpanded ? 'border-primary' : 'border-gray-200'
              }`}
            >
              {/* Task Header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedTask(isExpanded ? null : task.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <Text className={`text-sm font-medium ${
                    isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                  }`}>
                    {task.title}
                  </Text>
                </div>
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                )}
              </div>

              {/* Task Details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-100">
                  <div className="pt-3 space-y-3">
                    <Text className="text-sm text-gray-600">
                      {task.description}
                    </Text>

                    <div className="text-xs text-gray-500">
                      ⏱️ {task.estimatedTime}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <Text className="text-xs text-blue-800">
                        💡 {task.helpText}
                      </Text>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {!isCompleted && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleTaskAction(task)}
                            className="flex-1"
                          >
                            {getActionButtonText(task.actionType)}
                          </Button>
                          <Button
                            size="sm"
                            plain
                            onClick={() => handleTaskComplete(task.id)}
                            className="px-3"
                            title="Als erledigt markieren"
                          >
                            ✓
                          </Button>
                        </>
                      )}

                      {isCompleted && (
                        <Button
                          size="sm"
                          plain
                          onClick={() => handleTaskComplete(task.id)}
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
        })}
      </div>
    </div>
  );
}