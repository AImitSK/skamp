// src/lib/ai/agentic/test-data/index.ts
// Zentrale Export-Datei für Agentic Chat Tests

// Types
export * from './agentic-test-types';

// Test Runner Flows
export {
  runAgenticTestScenarioFlow,
  evaluateAgenticTestResultFlow,
} from './agentic-test-runner';

// Protokoll-Export
export {
  saveTestProtocol,
  loadTestProtocol,
  listProtocols,
  getLatestProtocol,
  generateMarkdownReport,
  saveMarkdownReport,
  type TestProtocol,
} from './save-protocol';

// Datasets
export {
  ALL_AGENTIC_TEST_DATASETS,
  MAIN_AGENTIC_TEST_DATASETS,
  getDatasetsBySpecialist,
  getDatasetById,
  briefingSpecialistDatasets,
  swotSpecialistDatasets,
  audienceSpecialistDatasets,
  positioningSpecialistDatasets,
  goalsSpecialistDatasets,
  messagesSpecialistDatasets,
  projectWizardDatasets,
} from './datasets';
