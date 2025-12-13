// src/components/projects/guides/ProjectGuideBox.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SparklesIcon,
  DocumentTextIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';
import { Text } from '@/components/ui/text';
import { Subheading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/app/dashboard/projects/[projectId]/context/ProjectContext';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  tab?: string;
  action?: string;
  completed?: boolean;
}

interface GuidePhase {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  steps: GuideStep[];
}

interface ProjectGuideBoxProps {
  completedSteps?: string[];
  onStepToggle?: (stepId: string) => void;
  className?: string;
}

// Helper to build guide phases with translations
function useGuidePhases() {
  const t = useTranslations('projects.guides');

  return [
    {
      id: 'ideas_planning',
      title: t('phases.ideasPlanning.title'),
      icon: SparklesIcon,
      color: 'text-gray-700 bg-gray-50',
      steps: [
        {
          id: 'create_tasks',
          title: t('phases.ideasPlanning.steps.createTasks.title'),
          description: t('phases.ideasPlanning.steps.createTasks.description'),
          tab: 'tasks'
        },
        {
          id: 'create_strategy',
          title: t('phases.ideasPlanning.steps.createStrategy.title'),
          description: t('phases.ideasPlanning.steps.createStrategy.description'),
          tab: 'strategie'
        }
      ]
    },
    {
      id: 'creation',
      title: t('phases.creation.title'),
      icon: DocumentTextIcon,
      color: 'text-gray-700 bg-gray-50',
      steps: [
        {
          id: 'upload_media',
          title: t('phases.creation.steps.uploadMedia.title'),
          description: t('phases.creation.steps.uploadMedia.description'),
          tab: 'daten'
        },
        {
          id: 'create_draft',
          title: t('phases.creation.steps.createDraft.title'),
          description: t('phases.creation.steps.createDraft.description'),
          tab: 'pressemeldung'
        }
      ]
    },
    {
      id: 'internal_approval',
      title: t('phases.internalApproval.title'),
      icon: ChatBubbleLeftRightIcon,
      color: 'text-gray-700 bg-gray-50',
      steps: [
        {
          id: 'team_feedback',
          title: t('phases.internalApproval.steps.teamFeedback.title'),
          description: t('phases.internalApproval.steps.teamFeedback.description'),
          action: 'chat'
        }
      ]
    },
    {
      id: 'customer_approval',
      title: t('phases.customerApproval.title'),
      icon: ShieldCheckIcon,
      color: 'text-gray-700 bg-gray-50',
      steps: [
        {
          id: 'customer_approval',
          title: t('phases.customerApproval.steps.customerApproval.title'),
          description: t('phases.customerApproval.steps.customerApproval.description'),
          tab: 'overview'
        }
      ]
    },
    {
      id: 'distribution',
      title: t('phases.distribution.title'),
      icon: PaperAirplaneIcon,
      color: 'text-gray-700 bg-gray-50',
      steps: [
        {
          id: 'create_list',
          title: t('phases.distribution.steps.createList.title'),
          description: t('phases.distribution.steps.createList.description'),
          tab: 'verteiler'
        },
        {
          id: 'create_letter',
          title: t('phases.distribution.steps.createLetter.title'),
          description: t('phases.distribution.steps.createLetter.description'),
          tab: 'verteiler'
        },
        {
          id: 'test_send',
          title: t('phases.distribution.steps.testSend.title'),
          description: t('phases.distribution.steps.testSend.description'),
          tab: 'verteiler'
        },
        {
          id: 'send_campaign',
          title: t('phases.distribution.steps.sendCampaign.title'),
          description: t('phases.distribution.steps.sendCampaign.description'),
          tab: 'verteiler'
        }
      ]
    },
    {
      id: 'monitoring',
      title: t('phases.monitoring.title'),
      icon: ChartBarIcon,
      color: 'text-gray-700 bg-gray-50',
      steps: [
        {
          id: 'manage_inbox',
          title: t('phases.monitoring.steps.manageInbox.title'),
          description: t('phases.monitoring.steps.manageInbox.description'),
          action: 'inbox'
        },
        {
          id: 'track_publications',
          title: t('phases.monitoring.steps.trackPublications.title'),
          description: t('phases.monitoring.steps.trackPublications.description'),
          tab: 'monitoring'
        },
        {
          id: 'analyze_success',
          title: t('phases.monitoring.steps.analyzeSuccess.title'),
          description: t('phases.monitoring.steps.analyzeSuccess.description'),
          tab: 'monitoring'
        }
      ]
    }
  ];
}

export default function ProjectGuideBox({
  completedSteps = [],
  onStepToggle,
  className = ''
}: ProjectGuideBoxProps) {
  const t = useTranslations('projects.guides');
  const GUIDE_PHASES = useGuidePhases();

  // Context verwenden statt Props
  const { project, setActiveTab } = useProject();
  const currentPhase = project?.currentStage || 'ideas_planning';
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Berechne Gesamtfortschritt
    const totalSteps = GUIDE_PHASES.reduce((sum, phase) => sum + phase.steps.length, 0);
    const completed = completedSteps.length;
    setProgress(Math.round((completed / totalSteps) * 100));

    // Aktuelle Phase automatisch aufklappen
    setExpandedPhases(new Set([currentPhase]));
  }, [currentPhase, completedSteps]);

  const togglePhase = (phaseId: string) => {
    // Nur eine Phase gleichzeitig offen
    if (expandedPhases.has(phaseId)) {
      setExpandedPhases(new Set()); // Schließen wenn bereits offen
    } else {
      setExpandedPhases(new Set([phaseId])); // Nur diese Phase öffnen
    }
  };

  const toggleStepComplete = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Verhindere Phase-Toggle
    if (onStepToggle) {
      onStepToggle(stepId);
    }
  };

  const handleStepClick = (step: GuideStep) => {
    if (step.tab) {
      setActiveTab(step.tab as any);
    } else if (step.action === 'chat') {
      // Trigger Chat öffnen
      const event = new CustomEvent('openProjectChat');
      window.dispatchEvent(event);
    } else if (step.action === 'inbox') {
      // Zur Inbox navigieren
      window.location.href = '/dashboard/communication/inbox';
    }
  };

  const getPhaseStatus = (phase: GuidePhase) => {
    const phaseSteps = phase.steps.map(s => s.id);
    const completedInPhase = phaseSteps.filter(id => completedSteps.includes(id)).length;

    if (completedInPhase === phase.steps.length) return 'completed';
    if (phase.id === currentPhase) return 'current';
    if (completedInPhase > 0) return 'in-progress';
    return 'pending';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-5 w-5 text-primary mr-2" />
            <Subheading>{t('title')}</Subheading>
          </div>
          <Badge color="blue" className="font-medium">
            {t('progressCompleted', { progress })}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Phases */}
      <div className="divide-y divide-gray-200">
        {GUIDE_PHASES.map((phase) => {
          const status = getPhaseStatus(phase);
          const isExpanded = expandedPhases.has(phase.id);
          const Icon = phase.icon;

          return (
            <div key={phase.id} className={
              status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
              status === 'current' ? 'bg-blue-100' : ''
            }>
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Icon basierend auf Status */}
                  {status === 'completed' && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {status === 'current' && (
                    <ClockIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                  {status === 'pending' && (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex-shrink-0"></div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{phase.title}</span>
                    <Text className="text-xs text-gray-500">
                      {t('phaseProgress', {
                        completed: phase.steps.filter(s => completedSteps.includes(s.id)).length,
                        total: phase.steps.length
                      })}
                    </Text>
                    {status === 'current' && (
                      <Badge color="blue" className="text-xs py-0">{t('currentBadge')}</Badge>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* Phase Steps */}
              {isExpanded && (
                <div className="px-6 pb-4 space-y-2">
                  {phase.steps.map((step) => {
                    const isCompleted = completedSteps.includes(step.id);

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                          isCompleted
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <button
                          onClick={(e) => toggleStepComplete(step.id, e)}
                          className="flex-shrink-0 mt-0.5"
                        >
                          {isCompleted ? (
                            <CheckCircleIconSolid className="w-5 h-5 text-green-600" />
                          ) : (
                            <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStepClick(step)}
                          className="flex-1 text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-medium ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                                {step.title}
                              </span>
                              <ArrowRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </div>
                            <Text className={`text-sm mt-0.5 ${isCompleted ? 'text-green-700' : 'text-gray-600'}`}>
                              {step.description}
                            </Text>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}