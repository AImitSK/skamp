import { evaluate } from 'genkit'; // Import von 'evaluate' aus dem Hauptpaket
import { mergeVariantsFlow } from '../src/lib/ai/flows/merge-variants';
import { mergeVariantsDataset, MERGE_VARIANTS_DATASET_ID } from '../src/lib/ai/datasets/merge-test-data';

// WICHTIG: Genkit lädt Evaluatoren automatisch, wenn sie in der genkit.config.ts registriert sind.
// Wir definieren den Evaluator HIER nur für die Typisierung und den Aufruf.
import { exactMatch } from '@genkit-ai/evaluator';

/**
 * Registriert die Evaluation bei Genkit, damit sie über die CLI gestartet werden kann.
 */
export default evaluate({
    flow: mergeVariantsFlow,
    dataset: mergeVariantsDataset,
    // Definieren der Metriken, die geprüft werden sollen.
    evaluators: [
      exactMatch({ name: 'Is_Perfect_Match', expectedField: 'expectedOutput' })
    ],
    // Optional: Judge Modell für LLM-basierte Checks (aktuell nicht benötigt)
    // judge: googleAI.model('gemini-2.5-flash'),
  });

// Wir entfernen die asynchrone runEvaluation Funktion und exportieren die Definition,
// damit Genkit CLI sie erkennt.
