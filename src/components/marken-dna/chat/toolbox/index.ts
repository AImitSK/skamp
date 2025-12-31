/**
 * Chat Toolbox - Visuelle Komponenten für phasenbasierten KI-Chat
 *
 * Diese Komponenten implementieren das Toolbox-Konzept aus:
 * docs/planning/marken-dna/CHAT-TOOLBOX-KONZEPT.md
 *
 * Verwendung:
 * ```tsx
 * import {
 *   ProgressCircle,
 *   ProgressLine,
 *   RoadmapBox,
 *   PhaseStatusBox,
 *   ResultConfirmBox,
 * } from '@/components/marken-dna/chat/toolbox';
 * ```
 */

// Basis-Komponenten
export { ProgressCircle } from './ProgressCircle';
export type { ProgressStatus } from './ProgressCircle';

export { ProgressLine } from './ProgressLine';

// Box-Komponenten
export { RoadmapBox, parseRoadmapContent } from './RoadmapBox';
export type { RoadmapPhase } from './RoadmapBox';

export { PhaseStatusBox, parsePhaseAttributes, parsePhaseStatusContent } from './PhaseStatusBox';
export type { PhaseItem } from './PhaseStatusBox';

export { ResultConfirmBox, parseResultContent } from './ResultConfirmBox';
export type { ResultItem } from './ResultConfirmBox';
