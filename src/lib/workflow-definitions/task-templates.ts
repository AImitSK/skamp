// src/lib/workflow-definitions/task-templates.ts - PLAN 8/9: TASK-TEMPLATE-DEFINITIONEN
import { PipelineStage } from '@/types/project';
import { TaskPriority } from '@/types/tasks';

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  category: string;
  stage: PipelineStage;
  priority: TaskPriority;
  requiredForStageCompletion: boolean;
  daysAfterStageEntry: number;
  estimatedDuration?: number; // in Stunden
  assignmentRules?: {
    assignTo: 'project_lead' | 'team_member' | 'role_based';
    role?: string;
  };
  dependencyTemplates?: string[]; // IDs anderer Templates von denen abhängig
  checklist?: Array<{
    id: string;
    text: string;
    required: boolean;
  }>;
  tags?: string[];
}

// Automatische Task-Erstellung basierend auf Templates
export const TASK_TEMPLATES: Record<PipelineStage, TaskTemplate[]> = {
  'ideas_planning': [
    {
      id: 'project_briefing',
      title: 'Projekt-Briefing erstellen',
      description: 'Detailliertes Briefing mit Zielen, Zielgruppe und Anforderungen',
      category: 'documentation',
      stage: 'ideas_planning',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1,
      estimatedDuration: 3,
      assignmentRules: {
        assignTo: 'project_lead'
      },
      checklist: [
        {
          id: 'brief_objectives',
          text: 'Projektziele definiert',
          required: true
        },
        {
          id: 'brief_target_audience',
          text: 'Zielgruppe analysiert',
          required: true
        },
        {
          id: 'brief_timeline',
          text: 'Zeitplan erstellt',
          required: true
        },
        {
          id: 'brief_budget',
          text: 'Budget festgelegt',
          required: true
        }
      ],
      tags: ['briefing', 'planning', 'documentation']
    },
    {
      id: 'strategy_document',
      title: 'Strategie-Dokument verfassen',
      description: 'Strategische Ausrichtung und Kernbotschaften definieren',
      category: 'content_creation',
      stage: 'ideas_planning',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 2,
      estimatedDuration: 4,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'strategist'
      },
      dependencyTemplates: ['project_briefing'],
      checklist: [
        {
          id: 'strategy_key_messages',
          text: 'Kernbotschaften definiert',
          required: true
        },
        {
          id: 'strategy_channels',
          text: 'Kommunikationskanäle festgelegt',
          required: true
        },
        {
          id: 'strategy_success_metrics',
          text: 'Erfolgskennzahlen definiert',
          required: true
        }
      ],
      tags: ['strategy', 'messaging', 'planning']
    },
    {
      id: 'stakeholder_alignment',
      title: 'Stakeholder-Alignment durchführen',
      description: 'Abstimmung mit allen relevanten Stakeholdern',
      category: 'communication',
      stage: 'ideas_planning',
      priority: 'medium',
      requiredForStageCompletion: false,
      daysAfterStageEntry: 3,
      estimatedDuration: 2,
      assignmentRules: {
        assignTo: 'project_lead'
      },
      dependencyTemplates: ['strategy_document'],
      tags: ['stakeholders', 'alignment', 'communication']
    }
  ],

  'creation': [
    {
      id: 'content_outline',
      title: 'Content-Outline erstellen',
      description: 'Detaillierte Struktur für alle Inhalte',
      category: 'content_creation',
      stage: 'creation',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 2,
      estimatedDuration: 3,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'content_lead'
      },
      checklist: [
        {
          id: 'outline_structure',
          text: 'Content-Struktur definiert',
          required: true
        },
        {
          id: 'outline_key_messages',
          text: 'Key Messages eingearbeitet',
          required: true
        },
        {
          id: 'outline_tone_style',
          text: 'Tonality und Stil festgelegt',
          required: true
        }
      ],
      tags: ['content', 'outline', 'structure']
    },
    {
      id: 'text_creation',
      title: 'Texte verfassen',
      description: 'Alle textlichen Inhalte erstellen',
      category: 'content_creation',
      stage: 'creation',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 5,
      estimatedDuration: 8,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'copywriter'
      },
      dependencyTemplates: ['content_outline'],
      checklist: [
        {
          id: 'text_headline',
          text: 'Headlines erstellt',
          required: true
        },
        {
          id: 'text_body',
          text: 'Body-Texte verfasst',
          required: true
        },
        {
          id: 'text_cta',
          text: 'Call-to-Action formuliert',
          required: true
        },
        {
          id: 'text_proofread',
          text: 'Texte korrekturgelesen',
          required: true
        }
      ],
      tags: ['copywriting', 'text', 'content']
    },
    {
      id: 'media_selection',
      title: 'Medien auswählen und erstellen',
      description: 'Bilder, Videos und andere Medien-Assets erstellen oder auswählen',
      category: 'creative',
      stage: 'creation',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 4,
      estimatedDuration: 6,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'creative_designer'
      },
      checklist: [
        {
          id: 'media_concept',
          text: 'Visuelles Konzept entwickelt',
          required: true
        },
        {
          id: 'media_assets',
          text: 'Media-Assets erstellt/ausgewählt',
          required: true
        },
        {
          id: 'media_formats',
          text: 'Verschiedene Formate erstellt',
          required: true
        },
        {
          id: 'media_rights',
          text: 'Bildrechte geklärt',
          required: true
        }
      ],
      tags: ['media', 'creative', 'assets']
    },
    {
      id: 'campaign_setup',
      title: 'Kampagne technisch einrichten',
      description: 'Kampagne im System anlegen und konfigurieren',
      category: 'technical',
      stage: 'creation',
      priority: 'medium',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 7,
      estimatedDuration: 2,
      assignmentRules: {
        assignTo: 'team_member'
      },
      dependencyTemplates: ['text_creation', 'media_selection'],
      tags: ['setup', 'technical', 'campaign']
    }
  ],

  'internal_approval': [
    {
      id: 'internal_review',
      title: 'Interne Review durchführen',
      description: 'Umfassende interne Qualitätsprüfung',
      category: 'review',
      stage: 'internal_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1,
      estimatedDuration: 3,
      assignmentRules: {
        assignTo: 'project_lead'
      },
      checklist: [
        {
          id: 'review_content_quality',
          text: 'Content-Qualität geprüft',
          required: true
        },
        {
          id: 'review_brand_guidelines',
          text: 'Brand Guidelines eingehalten',
          required: true
        },
        {
          id: 'review_legal_compliance',
          text: 'Rechtliche Compliance geprüft',
          required: true
        },
        {
          id: 'review_technical_setup',
          text: 'Technisches Setup validiert',
          required: true
        }
      ],
      tags: ['review', 'quality', 'approval']
    },
    {
      id: 'quality_check',
      title: 'Quality Check durchführen',
      description: 'Detaillierte Qualitätsprüfung aller Materialien',
      category: 'review',
      stage: 'internal_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 2,
      estimatedDuration: 2,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'quality_manager'
      },
      checklist: [
        {
          id: 'quality_spelling',
          text: 'Rechtschreibung und Grammatik',
          required: true
        },
        {
          id: 'quality_formatting',
          text: 'Formatierung und Layout',
          required: true
        },
        {
          id: 'quality_assets',
          text: 'Asset-Qualität und -Auflösung',
          required: true
        }
      ],
      tags: ['quality', 'check', 'validation']
    },
    {
      id: 'corrections_implementation',
      title: 'Korrekturen umsetzen',
      description: 'Feedback aus interner Review einarbeiten',
      category: 'content_creation',
      stage: 'internal_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 4,
      estimatedDuration: 4,
      assignmentRules: {
        assignTo: 'team_member'
      },
      dependencyTemplates: ['internal_review', 'quality_check'],
      tags: ['corrections', 'feedback', 'implementation']
    }
  ],

  'customer_approval': [
    {
      id: 'customer_presentation',
      title: 'Kunden-Präsentation vorbereiten',
      description: 'Präsentation für Kunden-Review erstellen',
      category: 'communication',
      stage: 'customer_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1,
      estimatedDuration: 3,
      assignmentRules: {
        assignTo: 'project_lead'
      },
      checklist: [
        {
          id: 'presentation_slides',
          text: 'Präsentations-Slides erstellt',
          required: true
        },
        {
          id: 'presentation_rationale',
          text: 'Rationale und Begründungen',
          required: true
        },
        {
          id: 'presentation_alternatives',
          text: 'Alternative Optionen aufgezeigt',
          required: false
        }
      ],
      tags: ['presentation', 'customer', 'communication']
    },
    {
      id: 'feedback_collection',
      title: 'Kunden-Feedback sammeln',
      description: 'Strukturierte Sammlung des Kunden-Feedbacks',
      category: 'communication',
      stage: 'customer_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 3,
      estimatedDuration: 2,
      assignmentRules: {
        assignTo: 'project_lead'
      },
      dependencyTemplates: ['customer_presentation'],
      checklist: [
        {
          id: 'feedback_documented',
          text: 'Feedback dokumentiert',
          required: true
        },
        {
          id: 'feedback_prioritized',
          text: 'Feedback priorisiert',
          required: true
        },
        {
          id: 'feedback_timeline',
          text: 'Umsetzungszeiten abgestimmt',
          required: true
        }
      ],
      tags: ['feedback', 'customer', 'documentation']
    },
    {
      id: 'customer_revisions',
      title: 'Kunden-Revisionen umsetzen',
      description: 'Änderungswünsche des Kunden einarbeiten',
      category: 'content_creation',
      stage: 'customer_approval',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 5,
      estimatedDuration: 6,
      assignmentRules: {
        assignTo: 'team_member'
      },
      dependencyTemplates: ['feedback_collection'],
      tags: ['revisions', 'customer', 'implementation']
    }
  ],

  'distribution': [
    {
      id: 'channel_distribution',
      title: 'Verteilung in alle Kanäle',
      description: 'Content in allen definierten Kanälen veröffentlichen',
      category: 'technical',
      stage: 'distribution',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1,
      estimatedDuration: 4,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'distribution_manager'
      },
      checklist: [
        {
          id: 'dist_social_media',
          text: 'Social Media Kanäle',
          required: true
        },
        {
          id: 'dist_website',
          text: 'Website/Blog',
          required: true
        },
        {
          id: 'dist_email',
          text: 'E-Mail-Kampagnen',
          required: false
        },
        {
          id: 'dist_press',
          text: 'Presseverteiler',
          required: false
        }
      ],
      tags: ['distribution', 'channels', 'publication']
    },
    {
      id: 'performance_setup',
      title: 'Performance-Tracking einrichten',
      description: 'Tracking und Monitoring für alle Kanäle konfigurieren',
      category: 'technical',
      stage: 'distribution',
      priority: 'medium',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 2,
      estimatedDuration: 2,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'analytics_specialist'
      },
      checklist: [
        {
          id: 'tracking_setup',
          text: 'Tracking-Codes implementiert',
          required: true
        },
        {
          id: 'analytics_goals',
          text: 'Analytics-Ziele definiert',
          required: true
        },
        {
          id: 'dashboard_configured',
          text: 'Dashboard konfiguriert',
          required: true
        }
      ],
      tags: ['analytics', 'tracking', 'performance']
    },
    {
      id: 'launch_coordination',
      title: 'Launch koordinieren',
      description: 'Koordinierte Veröffentlichung über alle Kanäle',
      category: 'administrative',
      stage: 'distribution',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 3,
      estimatedDuration: 3,
      assignmentRules: {
        assignTo: 'project_lead'
      },
      dependencyTemplates: ['channel_distribution', 'performance_setup'],
      tags: ['launch', 'coordination', 'timing']
    }
  ],

  'monitoring': [
    {
      id: 'monitoring_setup',
      title: 'Monitoring-Tools konfigurieren',
      description: 'Alle Monitoring-Tools einrichten und testen',
      category: 'technical',
      stage: 'monitoring',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1,
      estimatedDuration: 2,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'monitoring_specialist'
      },
      checklist: [
        {
          id: 'monitoring_tools',
          text: 'Monitoring-Tools aktiviert',
          required: true
        },
        {
          id: 'monitoring_alerts',
          text: 'Alerts konfiguriert',
          required: true
        },
        {
          id: 'monitoring_reports',
          text: 'Report-Schedule eingestellt',
          required: true
        }
      ],
      tags: ['monitoring', 'setup', 'configuration']
    },
    {
      id: 'performance_analysis',
      title: 'Performance-Analyse durchführen',
      description: 'Regelmäßige Analyse der Kampagnen-Performance',
      category: 'administrative',
      stage: 'monitoring',
      priority: 'medium',
      requiredForStageCompletion: false,
      daysAfterStageEntry: 7,
      estimatedDuration: 3,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'analyst'
      },
      dependencyTemplates: ['monitoring_setup'],
      tags: ['analysis', 'performance', 'reporting']
    },
    {
      id: 'optimization_recommendations',
      title: 'Optimierungsempfehlungen erstellen',
      description: 'Basierend auf Performance-Daten Verbesserungen vorschlagen',
      category: 'administrative',
      stage: 'monitoring',
      priority: 'low',
      requiredForStageCompletion: false,
      daysAfterStageEntry: 14,
      estimatedDuration: 2,
      assignmentRules: {
        assignTo: 'role_based',
        role: 'strategist'
      },
      dependencyTemplates: ['performance_analysis'],
      tags: ['optimization', 'recommendations', 'strategy']
    }
  ],

  'completed': [
    {
      id: 'final_report',
      title: 'Abschlussbericht erstellen',
      description: 'Umfassender Projektabschlussbericht mit allen Ergebnissen',
      category: 'documentation',
      stage: 'completed',
      priority: 'high',
      requiredForStageCompletion: true,
      daysAfterStageEntry: 1,
      estimatedDuration: 4,
      assignmentRules: {
        assignTo: 'project_lead'
      },
      checklist: [
        {
          id: 'report_executive_summary',
          text: 'Executive Summary',
          required: true
        },
        {
          id: 'report_kpi_analysis',
          text: 'KPI-Analyse',
          required: true
        },
        {
          id: 'report_lessons_learned',
          text: 'Lessons Learned',
          required: true
        },
        {
          id: 'report_recommendations',
          text: 'Empfehlungen für zukünftige Projekte',
          required: false
        }
      ],
      tags: ['report', 'completion', 'analysis']
    },
    {
      id: 'project_archiving',
      title: 'Projekt archivieren',
      description: 'Alle Projektdaten strukturiert archivieren',
      category: 'administrative',
      stage: 'completed',
      priority: 'medium',
      requiredForStageCompletion: false,
      daysAfterStageEntry: 3,
      estimatedDuration: 1,
      assignmentRules: {
        assignTo: 'team_member'
      },
      tags: ['archiving', 'documentation', 'cleanup']
    }
  ]
};

// Template-Helper-Funktionen
export const getTemplatesForStage = (stage: PipelineStage): TaskTemplate[] => {
  return TASK_TEMPLATES[stage] || [];
};

export const getTemplateById = (templateId: string): TaskTemplate | null => {
  for (const stageTemplates of Object.values(TASK_TEMPLATES)) {
    const template = stageTemplates.find(t => t.id === templateId);
    if (template) return template;
  }
  return null;
};

export const getTemplatesByCategory = (category: string): TaskTemplate[] => {
  const allTemplates: TaskTemplate[] = [];
  for (const stageTemplates of Object.values(TASK_TEMPLATES)) {
    allTemplates.push(...stageTemplates.filter(t => t.category === category));
  }
  return allTemplates;
};

export const getCriticalTemplatesForStage = (stage: PipelineStage): TaskTemplate[] => {
  return getTemplatesForStage(stage).filter(t => t.requiredForStageCompletion);
};

export const getTemplatesByRole = (role: string): TaskTemplate[] => {
  const allTemplates: TaskTemplate[] = [];
  for (const stageTemplates of Object.values(TASK_TEMPLATES)) {
    allTemplates.push(...stageTemplates.filter(t => 
      t.assignmentRules?.assignTo === 'role_based' && 
      t.assignmentRules.role === role
    ));
  }
  return allTemplates;
};

export const getAllCategories = (): string[] => {
  const categories = new Set<string>();
  for (const stageTemplates of Object.values(TASK_TEMPLATES)) {
    stageTemplates.forEach(t => categories.add(t.category));
  }
  return Array.from(categories).sort();
};

export const getAllRoles = (): string[] => {
  const roles = new Set<string>();
  for (const stageTemplates of Object.values(TASK_TEMPLATES)) {
    stageTemplates.forEach(t => {
      if (t.assignmentRules?.role) {
        roles.add(t.assignmentRules.role);
      }
    });
  }
  return Array.from(roles).sort();
};

// Template-Dependency-Resolution
export const resolveTemplateDependencies = (templateIds: string[]): TaskTemplate[] => {
  const resolved: TaskTemplate[] = [];
  const visited = new Set<string>();

  const resolve = (templateId: string) => {
    if (visited.has(templateId)) return;
    visited.add(templateId);

    const template = getTemplateById(templateId);
    if (!template) return;

    // Erst Dependencies resolven
    if (template.dependencyTemplates) {
      template.dependencyTemplates.forEach(depId => resolve(depId));
    }

    // Dann Template selbst hinzufügen
    resolved.push(template);
  };

  templateIds.forEach(id => resolve(id));
  return resolved;
};