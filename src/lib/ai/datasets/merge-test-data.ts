import { defineDataset } from 'genkit';
import { type MergeVariantsInput, type MergedContact } from '../schemas/merge-schemas';

/**
 * Dataset: Enthält handverlesene Testfälle für den mergeVariants Flow.
 * Hierbei handelt es sich um das "Golden Set" zur Messung der LLM-Qualität.
 */
// ✅ Hier definieren wir die Dataset ID:
export const MERGE_VARIANTS_DATASET_ID = 'merge-variants-golden-v1';

// Importieren Sie die tatsächlichen Testdaten
// (In einer echten Anwendung würden Sie diese in einer separaten JSON-Datei speichern
// oder per Skript generieren, aber für den Test reicht der Inline-Export.)

const ingolfInput: MergeVariantsInput = {
    variants: [
        // Fügen Sie hier den kompletten JSON-Input mit den 7 Varianten ein
        { 
            organizationId: "5CwugYyTesPNJMoC4Vte", 
            contactData: { 
                publications: ["Computer Bild"], 
                companyName: "Computer Bild", 
                emails: [{ type: "business", isPrimary: true, email: "i.leschke@computerbild.de" }], 
                companyId: "comp-d-010-5CwugYyTesPNJMoC4Vte", 
                position: "Redakteur", 
                mediaTypes: ["print", "online"], 
                hasMediaProfile: true, 
                displayName: "Ingolf Leschke", 
                name: { firstName: "Ingolf", lastName: "Leschke" } 
            }, 
            contactId: "cont-d-037-5CwugYyTesPNJMoC4Vte", 
            organizationName: "Sports Marketing Agency" 
        },
        // ... (Fügen Sie hier die restlichen 6 Varianten ein, um den Input komplett zu machen)
        // WICHTIG: Die 6 weiteren Varianten wurden hier aus Platzgründen weggelassen,
        // aber sie müssen HIER sein, um das Dataset komplett zu machen.
    ]
};

// Dies ist der ERWARTETE OUTPUT (Golden Answer)
// Er basiert auf dem LLM-Output, aber mit der KRITISCHEN Korrektur (companyId: null)
const ingolfExpectedOutput: MergedContact = {
    name: { firstName: "Ingolf", lastName: "Leschke", title: null, suffix: null },
    displayName: "Ingolf Leschke",
    emails: [{ email: "i.leschke@computerbild.de", type: "business", isPrimary: true }],
    phones: [],
    position: "Redakteur", // ✅ Gelöst durch LLM
    department: null,
    companyName: "Computer Bild",
    companyId: null, // ✅ KRITISCH: Erzwingung durch Post-Processing
    hasMediaProfile: true,
    beats: [],
    mediaTypes: ["print", "online"],
    publications: ["Computer Bild"],
    socialProfiles: [],
    photoUrl: null,
    website: null
};


export const mergeVariantsDataset = defineDataset(
  {
    name: MERGE_VARIANTS_DATASET_ID,
    inputSchema: ingolfInput.variants[0], // Verwenden Sie das Schema des ersten Elements des Input Arrays
    outputSchema: ingolfExpectedOutput, // Oder das Schema von MergedContact
  },
  [
    {
        input: ingolfInput,
        expectedOutput: ingolfExpectedOutput,
        // Optional: Kurzbeschreibung des Testfalls
        // Testfall: Position-Konflikt und ID-Ausschluss (Must-Pass)
        name: 'Ingolf Leschke - Hardened Merge Test',
    }
  ]
);
