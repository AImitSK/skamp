'use client';

import ReactMarkdown from 'react-markdown';
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ResultBox } from './ResultBox';
import {
  RoadmapBox,
  parseRoadmapContent,
  PhaseStatusBox,
  parsePhaseAttributes,
  parsePhaseStatusContent,
  ResultConfirmBox,
  parseResultContent,
} from '../toolbox';
import {
  RoadmapBox as AgenticRoadmapBox,
  TodoList,
  SuggestionBubbles,
  ConfirmBox,
} from '@/components/agentic-chat/toolbox';
import type { ToolCall, TodoItem, ConfirmSummaryItem } from '@/lib/ai/agentic/types';

interface AIMessageProps {
  content: string;
  toolCalls?: ToolCall[];
  onRegenerate?: () => void;
  onCopy?: () => void;
  onConfirmResult?: (phase: number, content: string) => void;
  onAdjustResult?: (phase: number) => void;
  onSuggestionSelect?: (prompt: string) => void;
  onConfirmAction?: () => void;
  onAdjustAction?: () => void;
}

/**
 * AI-Nachricht Komponente (Claude-Style)
 *
 * Features:
 * - Markdown-Rendering für Haupt-Content
 * - Toolbox-Boxen für strukturierte Ausgaben:
 *   - [ROADMAP] → RoadmapBox
 *   - [PHASE_STATUS] → PhaseStatusBox
 *   - [RESULT] → ResultConfirmBox
 *   - [FINAL] → FinalSummaryBox (TODO)
 * - Rückwärtskompatibel: [DOCUMENT] → ResultBox
 * - Icon-Buttons rechts unten (nur Icons mit Tooltip)
 *
 * Design-Referenz: docs/planning/marken-dna/CHAT-TOOLBOX-KONZEPT.md
 */
export function AIMessage({
  content,
  toolCalls,
  onRegenerate,
  onCopy,
  onConfirmResult,
  onAdjustResult,
  onSuggestionSelect,
  onConfirmAction,
  onAdjustAction,
}: AIMessageProps) {
  // ============================================================================
  // TOOLBOX-TAGS PARSEN
  // ============================================================================

  // [ROADMAP]...[/ROADMAP]
  const roadmapMatch = content.match(/\[ROADMAP\]([\s\S]*?)\[\/ROADMAP\]/);
  const roadmapContent = roadmapMatch ? roadmapMatch[1].trim() : null;

  // [PHASE_STATUS phase="X" title="..."]...[/PHASE_STATUS]
  const phaseStatusMatch = content.match(/\[PHASE_STATUS([^\]]*)\]([\s\S]*?)\[\/PHASE_STATUS\]/);
  const phaseStatusAttrs = phaseStatusMatch ? parsePhaseAttributes(phaseStatusMatch[1]) : null;
  const phaseStatusContent = phaseStatusMatch ? phaseStatusMatch[2].trim() : null;

  // [RESULT phase="X" title="..."]...[/RESULT]
  const resultMatch = content.match(/\[RESULT([^\]]*)\]([\s\S]*?)\[\/RESULT\]/);
  const resultAttrs = resultMatch ? parsePhaseAttributes(resultMatch[1]) : null;
  const resultContent = resultMatch ? resultMatch[2].trim() : null;

  // [FINAL]...[/FINAL] (TODO: FinalSummaryBox)
  const finalMatch = content.match(/\[FINAL\]([\s\S]*?)\[\/FINAL\]/);
  const finalContent = finalMatch ? finalMatch[1].trim() : null;

  // ============================================================================
  // LEGACY: [DOCUMENT] für Rückwärtskompatibilität
  // ============================================================================
  const documentMatch = content.match(/\[DOCUMENT\]([\s\S]*?)\[\/DOCUMENT\]/);
  const documentContent = documentMatch ? documentMatch[1].trim() : null;

  // ============================================================================
  // CONTENT BEREINIGEN (alle Tags entfernen)
  // ============================================================================
  const cleanContent = content
    // Neue Toolbox-Tags
    .replace(/\[ROADMAP\][\s\S]*?\[\/ROADMAP\]/g, '')
    .replace(/\[PHASE_STATUS[^\]]*\][\s\S]*?\[\/PHASE_STATUS\]/g, '')
    .replace(/\[RESULT[^\]]*\][\s\S]*?\[\/RESULT\]/g, '')
    .replace(/\[FINAL\][\s\S]*?\[\/FINAL\]/g, '')
    // Legacy-Tags
    .replace(/\[DOCUMENT\][\s\S]*?\[\/DOCUMENT\]/g, '')
    .replace(/\[PROGRESS:\d+\]/g, '')
    .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '')
    .replace(/\[\/?SUGGESTIONS\]/g, '')
    .replace(/\[STATUS:[^\]]+\]/g, '')
    .replace(/\[\/?DOCUMENT\]/g, '')
    .replace(/\[\/?ROADMAP\]/g, '')
    .replace(/\[\/?PHASE_STATUS[^\]]*\]/g, '')
    .replace(/\[\/?RESULT[^\]]*\]/g, '')
    .replace(/\[\/?FINAL\]/g, '')
    .trim();

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="mb-6 max-w-3xl">
      {/* Hauptinhalt: Markdown (nur wenn vorhanden) */}
      {cleanContent && (
        <div className="prose prose-sm max-w-none prose-zinc
                        prose-headings:font-semibold prose-headings:text-zinc-900
                        prose-p:text-zinc-700 prose-p:leading-relaxed
                        prose-strong:text-zinc-900 prose-strong:font-semibold
                        prose-ul:my-2 prose-li:my-0.5 prose-li:text-zinc-700
                        prose-li:marker:text-zinc-400">
          <ReactMarkdown>{cleanContent}</ReactMarkdown>
        </div>
      )}

      {/* Toolbox: RoadmapBox */}
      {roadmapContent && (
        <div className="mt-3">
          <RoadmapBox phases={parseRoadmapContent(roadmapContent)} />
        </div>
      )}

      {/* Toolbox: PhaseStatusBox */}
      {phaseStatusContent && phaseStatusAttrs && (
        <div className="mt-3">
          <PhaseStatusBox
            phase={phaseStatusAttrs.phase}
            title={phaseStatusAttrs.title}
            items={parsePhaseStatusContent(phaseStatusContent)}
          />
        </div>
      )}

      {/* Toolbox: ResultConfirmBox */}
      {resultContent && resultAttrs && (
        <div className="mt-3">
          <ResultConfirmBox
            phase={resultAttrs.phase}
            title={resultAttrs.title}
            items={parseResultContent(resultContent)}
            onConfirm={onConfirmResult ? () => onConfirmResult(resultAttrs.phase, resultContent) : undefined}
            onAdjust={onAdjustResult ? () => onAdjustResult(resultAttrs.phase) : undefined}
          />
        </div>
      )}

      {/* Toolbox: FinalSummaryBox (TODO) */}
      {finalContent && (
        <div className="mt-3">
          {/* TODO: FinalSummaryBox implementieren */}
          <ResultBox
            title="Zusammenfassung"
            content={finalContent}
            icon="document"
          />
        </div>
      )}

      {/* Legacy: ResultBox für [DOCUMENT] (Rückwärtskompatibilität) */}
      {documentContent && !roadmapContent && !phaseStatusContent && !resultContent && (
        <div className="mt-3">
          <ResultBox
            title="Phasen-Ergebnis"
            content={documentContent}
            icon="document"
          />
        </div>
      )}

      {/* ================================================================== */}
      {/* AGENTIC TOOL-CALLS - Inline Rendering */}
      {/* ================================================================== */}
      {toolCalls && toolCalls.length > 0 && (
        <div className="mt-3 space-y-3">
          {toolCalls.map((call, idx) => {
            // skill_roadmap → AgenticRoadmapBox
            if (call.name === 'skill_roadmap') {
              const args = call.args as { action: string; phases?: string[]; currentPhaseIndex?: number };
              if (args.action === 'showRoadmap' && args.phases) {
                return (
                  <AgenticRoadmapBox
                    key={`roadmap-${idx}`}
                    phases={args.phases}
                    currentPhaseIndex={args.currentPhaseIndex ?? 0}
                    completedPhases={[]}
                  />
                );
              }
            }

            // skill_todos → TodoList
            if (call.name === 'skill_todos') {
              const args = call.args as { items: TodoItem[] };
              if (args.items && args.items.length > 0) {
                return <TodoList key={`todos-${idx}`} items={args.items} />;
              }
            }

            // skill_suggestions → SuggestionBubbles
            if (call.name === 'skill_suggestions') {
              const args = call.args as { prompts: string[] };
              if (args.prompts && args.prompts.length > 0 && onSuggestionSelect) {
                return (
                  <SuggestionBubbles
                    key={`suggestions-${idx}`}
                    prompts={args.prompts}
                    onSelect={onSuggestionSelect}
                  />
                );
              }
            }

            // skill_confirm → ConfirmBox
            if (call.name === 'skill_confirm') {
              const args = call.args as { title: string; summaryItems: ConfirmSummaryItem[] };
              if (args.title && onConfirmAction && onAdjustAction) {
                return (
                  <ConfirmBox
                    key={`confirm-${idx}`}
                    title={args.title}
                    summaryItems={args.summaryItems || []}
                    onConfirm={onConfirmAction}
                    onAdjust={onAdjustAction}
                  />
                );
              }
            }

            // skill_sidebar → DocumentBox (einfache Anzeige)
            if (call.name === 'skill_sidebar') {
              const args = call.args as { action: string; content?: string };
              if (args.content) {
                return (
                  <ResultBox
                    key={`sidebar-${idx}`}
                    title={args.action === 'finalizeDocument' ? 'Finales Dokument' : 'Dokument-Entwurf'}
                    content={args.content}
                    icon="document"
                  />
                );
              }
            }

            return null;
          })}
        </div>
      )}

      {/* Icon-Buttons: Rechts unten */}
      <div className="flex justify-end gap-1 mt-2">
        {onCopy && (
          <button
            onClick={onCopy}
            className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Kopieren"
            type="button"
            aria-label="Kopieren"
          >
            <ClipboardDocumentIcon className="h-4 w-4 text-zinc-700" />
          </button>
        )}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="p-1.5 hover:bg-zinc-100 rounded-md transition-colors
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Neu generieren"
            type="button"
            aria-label="Neu generieren"
          >
            <ArrowPathIcon className="h-4 w-4 text-zinc-700" />
          </button>
        )}
      </div>
    </div>
  );
}
