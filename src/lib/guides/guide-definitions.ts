// src/lib/guides/guide-definitions.ts
import type { PhaseGuide, PipelineStage } from '@/types/phase-guide';

const PHASE_GUIDES: Record<PipelineStage, PhaseGuide | null> = {
  'ideas_planning': {
    phase: 'ideas_planning',
    title: 'Projekt Setup',
    description: 'Legen Sie das Fundament für Ihr PR-Projekt',
    tasks: [
      {
        id: 'create_task_list',
        title: 'Task Liste erstellen',
        description: 'Erstellen Sie die ersten Projektaufgaben',
        actionType: 'navigate_tab',
        actionTarget: 'tasks',
        completed: false,
        required: true,
        estimatedTime: '10 Min.',
        helpText: 'Beginnen Sie mit grundlegenden Aufgaben wie "Zielgruppe definieren", "Kernbotschaft entwickeln"'
      },
      {
        id: 'upload_initial_assets',
        title: 'Erste Media Assets hochladen',
        description: 'Sammeln Sie verfügbare Bilder und Dokumente',
        actionType: 'navigate_tab',
        actionTarget: 'daten',
        completed: false,
        required: false,
        estimatedTime: '10 Min.',
        helpText: 'Logos, Produktbilder, erste Entwürfe - alles was bereits vorhanden ist'
      },
      {
        id: 'advance_to_creation',
        title: 'Zur Erstellungsphase wechseln',
        description: 'Wenn die Planung abgeschlossen ist',
        actionType: 'advance_phase',
        actionTarget: 'creation',
        completed: false,
        required: false,
        estimatedTime: '1 Min.',
        helpText: 'Wechseln Sie zur nächsten Phase wenn Sie bereit sind'
      }
    ],
    progress: {
      completed: 0,
      total: 3,
      required: 1
    }
  },

  'creation': {
    phase: 'creation',
    title: 'Content Erstellung',
    description: 'Erstellen Sie die finalen Inhalte für Ihr PR-Projekt',
    tasks: [
      {
        id: 'create_press_release',
        title: 'Pressemeldung schreiben',
        description: 'Verfassen Sie Ihre Pressemitteilung',
        actionType: 'create_campaign',
        actionTarget: 'new_campaign',
        completed: false,
        required: true,
        estimatedTime: '30 Min.',
        helpText: 'Nutzen Sie unsere KI-Unterstützung für eine professionelle Pressemeldung'
      },
      {
        id: 'finalize_media_assets',
        title: 'Finale Media Assets erstellen',
        description: 'Vervollständigen Sie Ihre Media-Sammlung',
        actionType: 'navigate_tab',
        actionTarget: 'daten',
        completed: false,
        required: true,
        estimatedTime: '20 Min.',
        helpText: 'High-Resolution Bilder, Logos, Grafiken - alles produktionsreif'
      },
      {
        id: 'advance_to_internal_approval',
        title: 'Zur internen Freigabe',
        description: 'Inhalte sind fertig für interne Prüfung',
        actionType: 'advance_phase',
        actionTarget: 'internal_approval',
        completed: false,
        required: false,
        estimatedTime: '1 Min.',
        helpText: 'Bereit für die interne Qualitätssicherung'
      }
    ],
    progress: {
      completed: 0,
      total: 3,
      required: 2
    }
  },

  // Für späte Phasen wird die bestehende Pressemeldung Box verwendet
  'approval': null,
  'distribution': null,
  'monitoring': null,
  'completed': null
};

export const getGuideForPhase = (phase: PipelineStage): PhaseGuide | null => {
  return PHASE_GUIDES[phase] || null;
};

export const getAllGuides = (): PhaseGuide[] => {
  return Object.values(PHASE_GUIDES).filter(Boolean) as PhaseGuide[];
};