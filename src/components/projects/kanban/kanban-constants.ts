// src/components/projects/kanban/kanban-constants.ts - Kanban Design Constants für Plan 10/9
import { PipelineStage } from '@/types/project';

// ========================================
// STAGE-SPEZIFISCHE FARBEN
// ========================================

export const STAGE_COLORS: Record<PipelineStage, {
  bg: string;
  border: string;
  text: string;
  accent: string;
  header: string;
  count: string;
}> = {
  'ideas_planning': {
    bg: 'bg-primary-25',
    border: 'border-primary-100',
    text: 'text-primary-700',
    accent: 'bg-primary-50',
    header: 'bg-primary-50',
    count: 'bg-primary-100 text-primary-800'
  },
  'creation': {
    bg: 'bg-primary-25',
    border: 'border-primary-100',
    text: 'text-primary-700',
    accent: 'bg-primary-50',
    header: 'bg-primary-50',
    count: 'bg-primary-100 text-primary-800'
  },
  'approval': {
    bg: 'bg-primary-25',
    border: 'border-primary-100',
    text: 'text-primary-700',
    accent: 'bg-primary-50',
    header: 'bg-primary-50',
    count: 'bg-primary-100 text-primary-800'
  },
  'distribution': {
    bg: 'bg-primary-25',
    border: 'border-primary-100',
    text: 'text-primary-700',
    accent: 'bg-primary-50',
    header: 'bg-primary-50',
    count: 'bg-primary-100 text-primary-800'
  },
  'monitoring': {
    bg: 'bg-primary-25',
    border: 'border-primary-100',
    text: 'text-primary-700',
    accent: 'bg-primary-50',
    header: 'bg-primary-50',
    count: 'bg-primary-100 text-primary-800'
  },
  'completed': {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    accent: 'bg-gray-100',
    header: 'bg-gray-100',
    count: 'bg-gray-200 text-gray-800'
  }
};

// ========================================
// RESPONSIVE LAYOUT CONSTANTS
// ========================================

export const RESPONSIVE_CONFIG = {
  mobile: {
    breakpoint: 768, // < 768px
    layout: 'accordion',
    columns: 1,
    cardWidth: '100%',
    padding: 'p-2',
    gap: 'gap-2'
  },
  tablet: {
    breakpoint: 1200, // 768px - 1199px
    layout: 'compact',
    columns: 3,
    cardWidth: '320px',
    padding: 'p-4',
    gap: 'gap-4'
  },
  desktop: {
    breakpoint: Infinity, // ≥ 1200px
    layout: 'full',
    columns: 6,
    cardWidth: 'flex-1 min-w-[240px]',
    padding: 'p-0',
    gap: 'gap-4'
  }
};

// ========================================
// STAGE-NAMEN UND ICONS
// ========================================

export const STAGE_CONFIG: Record<PipelineStage, {
  name: string;
  shortName: string;
  icon: string;
  order: number;
}> = {
  'ideas_planning': {
    name: 'Ideen & Planung',
    shortName: 'Planung',
    icon: 'LightBulbIcon',
    order: 1
  },
  'creation': {
    name: 'Content und Materialien',
    shortName: 'Erstellung',
    icon: 'PencilIcon',
    order: 2
  },
  'approval': {
    name: 'Freigabe',
    shortName: 'Freigabe',
    icon: 'CheckCircleIcon',
    order: 3
  },
  'distribution': {
    name: 'Verteilung',
    shortName: 'Verteilung',
    icon: 'PaperAirplaneIcon',
    order: 4
  },
  'monitoring': {
    name: 'Monitoring',
    shortName: 'Monitoring',
    icon: 'ChartBarIcon',
    order: 5
  },
  'completed': {
    name: 'Abgeschlossen',
    shortName: 'Fertig',
    icon: 'CheckBadgeIcon',
    order: 6
  }
};

// ========================================
// DRAG & DROP CONSTANTS
// ========================================

export const DRAG_CONFIG = {
  dragItemType: 'PROJECT_CARD',
  dragOpacity: 0.5,
  dropZoneHeight: '100%',
  dragDelay: 200,
  lockDuration: 30000, // 30 Sekunden
  feedbackDelay: 100
};

// ========================================
// PERFORMANCE CONSTANTS
// ========================================

export const PERFORMANCE_CONFIG = {
  virtualScrolling: {
    itemHeight: 120,
    overscan: 5,
    threshold: 20 // Ab 20 Items virtualisieren
  },
  search: {
    debounceDelay: 300
  },
  filters: {
    debounceDelay: 300
  },
  autoRefresh: {
    interval: 30000 // 30 Sekunden
  }
};

// ========================================
// HELPER FUNCTIONS
// ========================================

export const getStageColor = (stage: PipelineStage) => STAGE_COLORS[stage];

export const getStageConfig = (stage: PipelineStage) => STAGE_CONFIG[stage];

export const getResponsiveConfig = (width: number) => {
  if (width < RESPONSIVE_CONFIG.mobile.breakpoint) {
    return RESPONSIVE_CONFIG.mobile;
  } else if (width < RESPONSIVE_CONFIG.tablet.breakpoint) {
    return RESPONSIVE_CONFIG.tablet;
  }
  return RESPONSIVE_CONFIG.desktop;
};

export const getAllStages = (): PipelineStage[] => {
  return Object.keys(STAGE_CONFIG)
    .map(key => key as PipelineStage)
    .sort((a, b) => STAGE_CONFIG[a].order - STAGE_CONFIG[b].order);
};