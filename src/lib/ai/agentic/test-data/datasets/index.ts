// src/lib/ai/agentic/test-data/datasets/index.ts
// Zentrale Export-Datei für alle Test-Datasets

import { briefingSpecialistDatasets } from './briefing-specialist.dataset';
import { swotSpecialistDatasets } from './swot-specialist.dataset';
import { audienceSpecialistDatasets } from './audience-specialist.dataset';
import { positioningSpecialistDatasets } from './positioning-specialist.dataset';
import { goalsSpecialistDatasets } from './goals-specialist.dataset';
import { messagesSpecialistDatasets } from './messages-specialist.dataset';
import { projectWizardDatasets } from './project-wizard.dataset';
import type { AgenticTestScenario } from '../agentic-test-types';

// Einzelne Exports
export { briefingSpecialistDatasets } from './briefing-specialist.dataset';
export { swotSpecialistDatasets } from './swot-specialist.dataset';
export { audienceSpecialistDatasets } from './audience-specialist.dataset';
export { positioningSpecialistDatasets } from './positioning-specialist.dataset';
export { goalsSpecialistDatasets } from './goals-specialist.dataset';
export { messagesSpecialistDatasets } from './messages-specialist.dataset';
export { projectWizardDatasets } from './project-wizard.dataset';

/**
 * Alle Test-Datasets für alle 7 Spezialisten
 */
export const ALL_AGENTIC_TEST_DATASETS: AgenticTestScenario[] = [
  ...briefingSpecialistDatasets,
  ...swotSpecialistDatasets,
  ...audienceSpecialistDatasets,
  ...positioningSpecialistDatasets,
  ...goalsSpecialistDatasets,
  ...messagesSpecialistDatasets,
  ...projectWizardDatasets,
];

/**
 * Haupt-Szenarien (jeweils das erste/vollständige Szenario pro Spezialist)
 */
export const MAIN_AGENTIC_TEST_DATASETS: AgenticTestScenario[] = [
  briefingSpecialistDatasets[0],
  swotSpecialistDatasets[0],
  audienceSpecialistDatasets[0],
  positioningSpecialistDatasets[0],
  goalsSpecialistDatasets[0],
  messagesSpecialistDatasets[0],
  projectWizardDatasets[0],
];

/**
 * Helper: Dataset nach Spezialist-Typ filtern
 */
export function getDatasetsBySpecialist(specialistType: string): AgenticTestScenario[] {
  return ALL_AGENTIC_TEST_DATASETS.filter(
    dataset => dataset.specialistType === specialistType
  );
}

/**
 * Helper: Dataset nach ID finden
 */
export function getDatasetById(id: string): AgenticTestScenario | undefined {
  return ALL_AGENTIC_TEST_DATASETS.find(dataset => dataset.id === id);
}
