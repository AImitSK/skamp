// src/components/agentic-chat/toolbox/types.ts
// Frontend Type-Definitionen für Toolbox-Komponenten

import type { ToolCall, TodoItem, ConfirmSummaryItem } from '@/lib/ai/agentic/types';

// ============================================================================
// TOOLBOX STATE
// ============================================================================

/**
 * Aggregierter State aus allen Tool-Calls
 * Wird vom ToolboxRenderer verwaltet
 */
export interface ToolboxState {
  // Roadmap
  roadmap: {
    phases: string[];
    currentPhaseIndex: number;
    completedPhases: number[];
  } | null;

  // Todos
  todos: TodoItem[];

  // Suggestions
  suggestions: string[];

  // Confirm Box
  confirmBox: {
    title: string;
    summaryItems: ConfirmSummaryItem[];
    isVisible: boolean;
  } | null;

  // Sidebar/Document
  document: {
    content: string;
    status: 'draft' | 'completed';
  } | null;
}

/**
 * Initialer leerer State
 */
export const INITIAL_TOOLBOX_STATE: ToolboxState = {
  roadmap: null,
  todos: [],
  suggestions: [],
  confirmBox: null,
  document: null,
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface RoadmapBoxProps {
  phases: string[];
  currentPhaseIndex: number;
  completedPhases: number[];
}

export interface TodoListProps {
  items: TodoItem[];
}

export interface SuggestionBubblesProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export interface ConfirmBoxProps {
  title: string;
  summaryItems: ConfirmSummaryItem[];
  onConfirm: () => void;
  onAdjust: () => void;
  isLoading?: boolean;
}

export interface DocumentSidebarProps {
  content: string;
  status: 'draft' | 'completed';
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

// ============================================================================
// TOOLBOX REDUCER
// ============================================================================

export type ToolboxAction =
  | { type: 'PROCESS_TOOL_CALLS'; toolCalls: ToolCall[] }
  | { type: 'RESET' }
  | { type: 'DISMISS_CONFIRM' }
  | { type: 'SET_SUGGESTIONS'; suggestions: string[] };

/**
 * Reducer für Toolbox State
 */
export function toolboxReducer(state: ToolboxState, action: ToolboxAction): ToolboxState {
  switch (action.type) {
    case 'PROCESS_TOOL_CALLS':
      return processToolCalls(state, action.toolCalls);

    case 'RESET':
      return INITIAL_TOOLBOX_STATE;

    case 'DISMISS_CONFIRM':
      return {
        ...state,
        confirmBox: state.confirmBox ? { ...state.confirmBox, isVisible: false } : null,
      };

    case 'SET_SUGGESTIONS':
      return {
        ...state,
        suggestions: action.suggestions,
      };

    default:
      return state;
  }
}

/**
 * Verarbeitet Tool-Calls und aktualisiert den State
 */
function processToolCalls(state: ToolboxState, toolCalls: ToolCall[]): ToolboxState {
  let newState = { ...state };

  for (const call of toolCalls) {
    switch (call.name) {
      case 'skill_roadmap': {
        const args = call.args as { action: string; phases?: string[]; currentPhaseIndex?: number; phaseIndex?: number };

        if (args.action === 'showRoadmap' && args.phases) {
          newState.roadmap = {
            phases: args.phases,
            currentPhaseIndex: args.currentPhaseIndex ?? 0,
            completedPhases: [],
          };
        } else if (args.action === 'completePhase' && args.phaseIndex !== undefined && newState.roadmap) {
          newState.roadmap = {
            ...newState.roadmap,
            completedPhases: [...newState.roadmap.completedPhases, args.phaseIndex],
            currentPhaseIndex: args.phaseIndex + 1,
          };
        }
        break;
      }

      case 'skill_todos': {
        const args = call.args as { items: TodoItem[] };
        newState.todos = args.items;
        break;
      }

      case 'skill_suggestions': {
        const args = call.args as { prompts: string[] };
        newState.suggestions = args.prompts;
        break;
      }

      case 'skill_confirm': {
        const args = call.args as { title: string; summaryItems: ConfirmSummaryItem[] };
        newState.confirmBox = {
          title: args.title,
          summaryItems: args.summaryItems,
          isVisible: true,
        };
        break;
      }

      case 'skill_sidebar': {
        const args = call.args as { action: string; content: string };
        const result = call.result as { status?: 'draft' | 'completed' } | undefined;

        newState.document = {
          content: args.content,
          status: result?.status ?? (args.action === 'finalizeDocument' ? 'completed' : 'draft'),
        };
        break;
      }

      // skill_url_crawler und skill_dna_lookup haben keine UI-Komponenten
      // Sie werden nur im Backend verarbeitet
    }
  }

  return newState;
}
