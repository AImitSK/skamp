// src/lib/workflow-definitions/stage-workflows.ts - PLAN 8/9: STAGE-WORKFLOW-DEFINITIONEN
import { PipelineStage } from '@/types/project';

export interface StageTransitionWorkflow {
  currentStage: PipelineStage;
  nextStage: PipelineStage;
  requiredTasks: string[];
  validationChecks: ValidationCheck[];
  onTransition: TransitionAction[];
}

export interface TransitionAction {
  action: string;
  data: any;
  rollbackAction?: string;
}

export interface ValidationCheck {
  check: string;
  rule: string;
  message: string;
}

// Pre-definierte Workflows für alle Übergänge
export const STAGE_WORKFLOWS: Record<string, StageTransitionWorkflow> = {
  'ideas_planning_to_creation': {
    currentStage: 'ideas_planning',
    nextStage: 'creation',
    requiredTasks: [
      'Projekt-Briefing erstellen',
      'Strategie-Dokument verfassen'
    ],
    validationChecks: [
      {
        check: 'strategy_document_exists',
        rule: 'project.linkedElements.strategyDocument !== null',
        message: 'Strategie-Dokument muss erstellt werden'
      },
      {
        check: 'project_briefing_approved',
        rule: 'project.briefingApproved === true',
        message: 'Projekt-Briefing muss genehmigt sein'
      }
    ],
    onTransition: [
      {
        action: 'auto_complete_tasks',
        data: { 
          filter: { autoCompleteOnStageChange: true, stage: 'ideas_planning' } 
        },
        rollbackAction: 'restore_task_status'
      },
      {
        action: 'create_stage_tasks',
        data: { 
          templates: ['content_outline', 'text_creation', 'media_selection'] 
        },
        rollbackAction: 'delete_created_tasks'
      },
      {
        action: 'transfer_context',
        data: {
          mappings: [
            { source: 'strategy_document', target: 'content_outline.description' }
          ]
        }
      },
      {
        action: 'schedule_deadlines',
        data: {
          stageDeadline: 14, // 14 Tage für Creation-Phase
          criticalTasksFirst: true
        }
      }
    ]
  },

  'creation_to_internal_approval': {
    currentStage: 'creation',
    nextStage: 'internal_approval',
    requiredTasks: [
      'Content-Outline erstellt',
      'Texte verfasst',
      'Medien ausgewählt'
    ],
    validationChecks: [
      {
        check: 'content_completeness',
        rule: 'project.linkedElements.campaignId !== null',
        message: 'Kampagne muss erstellt und verknüpft sein'
      },
      {
        check: 'media_assets_ready',
        rule: 'project.assetSummary.totalAssets >= 1',
        message: 'Mindestens ein Media-Asset muss vorhanden sein'
      },
      {
        check: 'text_content_complete',
        rule: 'campaign.textContent.length > 0',
        message: 'Text-Content muss erstellt werden'
      }
    ],
    onTransition: [
      {
        action: 'generate_pdf',
        data: {
          type: 'internal_review',
          includeAssets: true,
          includeCampaignDetails: true
        },
        rollbackAction: 'delete_generated_pdf'
      },
      {
        action: 'assign_tasks',
        data: {
          rules: [
            { 
              category: 'internal_review', 
              assignTo: 'project_lead',
              dueInDays: 3
            },
            {
              category: 'quality_check',
              assignTo: 'team_member',
              role: 'content_reviewer',
              dueInDays: 2
            }
          ]
        }
      },
      {
        action: 'notify_stakeholders',
        data: {
          template: 'internal_review_ready',
          recipients: ['project_lead', 'content_team']
        }
      }
    ]
  },

  'internal_approval_to_customer_approval': {
    currentStage: 'internal_approval',
    nextStage: 'customer_approval',
    requiredTasks: [
      'Interne Review abgeschlossen',
      'Quality Check bestanden',
      'Korrekturen umgesetzt'
    ],
    validationChecks: [
      {
        check: 'internal_approval_complete',
        rule: 'allInternalReviewTasksCompleted === true',
        message: 'Alle internen Review-Tasks müssen abgeschlossen sein'
      },
      {
        check: 'no_blocking_issues',
        rule: 'project.workflowState.integrityIssues.length === 0',
        message: 'Keine blockierenden Probleme vorhanden'
      }
    ],
    onTransition: [
      {
        action: 'create_customer_approval_request',
        data: {
          includeInternalNotes: false,
          generateCustomerPDF: true,
          deadlineInDays: 5
        }
      },
      {
        action: 'create_stage_tasks',
        data: {
          templates: ['customer_presentation', 'feedback_collection', 'revision_planning']
        }
      },
      {
        action: 'notify_customer',
        data: {
          template: 'customer_review_ready',
          attachments: ['customer_pdf', 'asset_preview']
        }
      }
    ]
  },

  'customer_approval_to_distribution': {
    currentStage: 'customer_approval',
    nextStage: 'distribution',
    requiredTasks: [
      'Kunden-Feedback erhalten',
      'Finale Korrekturen umgesetzt',
      'Kunde hat Freigabe erteilt'
    ],
    validationChecks: [
      {
        check: 'customer_approved',
        rule: 'approval.status === "approved"',
        message: 'Kunden-Freigabe ist erforderlich'
      },
      {
        check: 'final_assets_ready',
        rule: 'project.assetSummary.validAssets === project.assetSummary.totalAssets',
        message: 'Alle Assets müssen finalisiert und validiert sein'
      },
      {
        check: 'distribution_channels_defined',
        rule: 'campaign.distributionChannels.length > 0',
        message: 'Verteilungskanäle müssen definiert sein'
      }
    ],
    onTransition: [
      {
        action: 'finalize_all_assets',
        data: {
          createHighResVersions: true,
          generateDistributionFormats: true
        }
      },
      {
        action: 'create_distribution_plan',
        data: {
          basedOnChannels: true,
          includeScheduling: true
        }
      },
      {
        action: 'create_stage_tasks',
        data: {
          templates: ['channel_distribution', 'performance_setup', 'launch_preparation']
        }
      },
      {
        action: 'notify_distribution_team',
        data: {
          template: 'distribution_ready',
          urgency: 'high'
        }
      }
    ]
  },

  'distribution_to_monitoring': {
    currentStage: 'distribution',
    nextStage: 'monitoring',
    requiredTasks: [
      'Content in allen Kanälen verteilt',
      'Performance-Tracking eingerichtet',
      'Launch erfolgreich'
    ],
    validationChecks: [
      {
        check: 'distribution_complete',
        rule: 'allDistributionChannelsActive === true',
        message: 'Alle geplanten Verteilungskanäle müssen aktiv sein'
      },
      {
        check: 'monitoring_setup_complete',
        rule: 'project.monitoringConfig.isEnabled === true',
        message: 'Monitoring-Setup muss aktiviert sein'
      }
    ],
    onTransition: [
      {
        action: 'activate_monitoring',
        data: {
          providers: ['landau', 'pmg'],
          alertThresholds: 'default',
          reportSchedule: 'weekly'
        }
      },
      {
        action: 'create_monitoring_dashboard',
        data: {
          kpis: ['reach', 'sentiment', 'mentions', 'mediaValue'],
          updateFrequency: 'daily'
        }
      },
      {
        action: 'schedule_reports',
        data: {
          weekly: ['project_team', 'client'],
          daily: ['project_lead'],
          alerts: ['urgent_issues']
        }
      }
    ]
  },

  'monitoring_to_completed': {
    currentStage: 'monitoring',
    nextStage: 'completed',
    requiredTasks: [
      'Monitoring-Periode abgeschlossen',
      'Finale Auswertung erstellt',
      'Abschlussbericht gesendet'
    ],
    validationChecks: [
      {
        check: 'monitoring_period_complete',
        rule: 'monitoringEndDate <= currentDate',
        message: 'Monitoring-Periode muss abgeschlossen sein'
      },
      {
        check: 'final_report_generated',
        rule: 'project.finalReport.exists === true',
        message: 'Abschlussbericht muss erstellt werden'
      }
    ],
    onTransition: [
      {
        action: 'generate_final_report',
        data: {
          includeAnalytics: true,
          includeRecommendations: true,
          format: ['pdf', 'presentation']
        }
      },
      {
        action: 'archive_project_data',
        data: {
          retentionPeriod: '2_years',
          includeAssets: true,
          createBackup: true
        }
      },
      {
        action: 'send_completion_notifications',
        data: {
          template: 'project_completed',
          recipients: ['client', 'team', 'management']
        }
      },
      {
        action: 'update_success_metrics',
        data: {
          trackKPIs: true,
          updateClientSatisfaction: true
        }
      }
    ]
  }
};

// Workflow-Helper-Funktionen
export const getWorkflowForTransition = (fromStage: PipelineStage, toStage: PipelineStage): StageTransitionWorkflow | null => {
  const workflowKey = `${fromStage}_to_${toStage}`;
  return STAGE_WORKFLOWS[workflowKey] || null;
};

export const getAllWorkflowsForStage = (stage: PipelineStage): StageTransitionWorkflow[] => {
  return Object.values(STAGE_WORKFLOWS).filter(workflow => workflow.currentStage === stage);
};

export const getNextStageOptions = (currentStage: PipelineStage): PipelineStage[] => {
  const workflows = getAllWorkflowsForStage(currentStage);
  return workflows.map(workflow => workflow.nextStage);
};

export const validateWorkflowTransition = (
  fromStage: PipelineStage, 
  toStage: PipelineStage
): { isValid: boolean; workflow?: StageTransitionWorkflow; error?: string } => {
  const workflow = getWorkflowForTransition(fromStage, toStage);
  
  if (!workflow) {
    return {
      isValid: false,
      error: `Kein Workflow definiert für Übergang von ${fromStage} zu ${toStage}`
    };
  }

  // Zusätzliche Validierungen können hier implementiert werden
  const stageOrder: PipelineStage[] = [
    'ideas_planning', 'creation', 'internal_approval', 
    'customer_approval', 'distribution', 'monitoring', 'completed'
  ];

  const fromIndex = stageOrder.indexOf(fromStage);
  const toIndex = stageOrder.indexOf(toStage);

  // Verhindere Rückwärts-Übergänge (außer zu completed)
  if (toIndex < fromIndex && toStage !== 'completed') {
    return {
      isValid: false,
      error: 'Rückwärts-Übergänge sind nicht erlaubt'
    };
  }

  // Verhindere das Überspringen von Stages (außer zu completed)
  if (toIndex > fromIndex + 1 && toStage !== 'completed') {
    return {
      isValid: false,
      error: 'Stages können nicht übersprungen werden'
    };
  }

  return {
    isValid: true,
    workflow
  };
};