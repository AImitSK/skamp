/**
 * OPTIMIERTER Export-Index für das Customer-Freigabe-Toggle-System
 * 
 * Zentrale Exports für alle Toggle-Komponenten und Hooks mit Code-Splitting-Optimierung.
 * Ermöglicht einfache Imports: import { MediaToggleBox } from '@/components/customer-review/toggle'
 * 
 * PERFORMANCE-OPTIMIERUNGEN:
 * - React.memo für alle Komponenten
 * - Memoized Berechnungen
 * - Optimierte Re-render-Vermeidung
 */

// Base Toggle-Komponente - Immer verfügbar
export { ToggleBox } from './ToggleBox';

// OPTIMIERTE Toggle-Komponenten mit React.memo
export { MediaToggleBox } from './MediaToggleBox';
export { PDFHistoryToggleBox } from './PDFHistoryToggleBox';
export { CommunicationToggleBox } from './CommunicationToggleBox';
export { DecisionToggleBox } from './DecisionToggleBox';

// Default-Exports für Dynamic Imports
export { default as ToggleBoxDefault } from './ToggleBox';
export { default as MediaToggleBoxDefault } from './MediaToggleBox';
export { default as PDFHistoryToggleBoxDefault } from './PDFHistoryToggleBox';
export { default as CommunicationToggleBoxDefault } from './CommunicationToggleBox';
export { default as DecisionToggleBoxDefault } from './DecisionToggleBox';

// Container-Komponente
export { default as CustomerReviewToggleContainer } from './CustomerReviewToggleContainer';

// Hooks
export { default as useCustomerReviewToggle } from './useCustomerReviewToggle';
export { default as useToggleState } from './useToggleState';
export { default as useTogglePersistence } from './useTogglePersistence';

// Utilities
export { default as toggleUtils } from './toggleUtils';
export { default as toggleAnimations } from './toggleAnimations';

// Typen werden aus dem types-Modul re-exportiert
export type {
  ToggleBoxProps,
  MediaToggleBoxProps,
  PDFHistoryToggleBoxProps,
  CommunicationToggleBoxProps,
  DecisionToggleBoxProps,
  ToggleState,
  ToggleActions,
  CustomerReviewToggleContext,
  UseCustomerReviewToggleReturn,
  ToggleEventHandlers,
  ToggleSystemConfig,
  MediaItem,
  PDFVersion,
  CommunicationItem,
  CustomerDecision,
  DecisionType,
  ChangeRequest
} from '@/types/customer-review';

// Konstanten für das Toggle-System
export const TOGGLE_IDS = {
  MEDIA: 'media-toggle',
  PDF_HISTORY: 'pdf-history-toggle', 
  COMMUNICATION: 'communication-toggle',
  DECISION: 'decision-toggle'
} as const;

export const DEFAULT_CONFIG: Required<import('@/types/customer-review').ToggleSystemConfig> = {
  defaultExpanded: [TOGGLE_IDS.DECISION], // Entscheidungs-Toggle standardmäßig geöffnet
  enableAnimations: true,
  maxExpandedBoxes: 2, // Maximal 2 gleichzeitig geöffnet für bessere UX
  autoCollapseAfter: 0, // Kein Auto-Collapse
  persistToggleState: true, // Status in localStorage speichern
  enableKeyboardNavigation: true
};

export const ANIMATION_DURATIONS = {
  EXPAND: 200,
  COLLAPSE: 150,
  FADE: 100
} as const;

export const CSS_CLASSES = {
  CONTAINER: 'customer-review-toggle-container',
  TOGGLE_BOX: 'toggle-box',
  TOGGLE_HEADER: 'toggle-header',
  TOGGLE_CONTENT: 'toggle-content',
  TOGGLE_EXPANDED: 'toggle-expanded',
  TOGGLE_COLLAPSED: 'toggle-collapsed',
  TOGGLE_DISABLED: 'toggle-disabled'
} as const;