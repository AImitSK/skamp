// src/lib/ai/evaluators/merge-quality-evaluators.ts
// Custom Evaluators für Merge-Qualität

import { ai } from '../genkit-config';
import type { MergedContact, Variant } from '../schemas/merge-schemas';

/**
 * Evaluator: Alle E-Mails vorhanden
 *
 * Prüft, ob alle E-Mails aus allen Varianten im gemergten Kontakt vorhanden sind.
 */
export const allEmailsPresentEvaluator = ai.defineEvaluator(
  {
    name: 'merge/allEmailsPresent',
    displayName: 'All Emails Present',
    definition: 'Checks if all emails from all variants are present in merged contact (deduplicated)',
  },
  async (datapoint) => {
    try {
      const input = datapoint.input as { variants: Variant[] };
      const output = datapoint.output as MergedContact;

      // Sammle alle einzigartigen E-Mails aus Varianten
      const expectedEmails = new Set<string>();
      for (const variant of input.variants) {
        for (const email of variant.contactData.emails) {
          expectedEmails.add(email.email.toLowerCase());
        }
      }

      // Prüfe, ob alle E-Mails im Output sind
      const outputEmails = new Set(
        output.emails?.map(e => e.email.toLowerCase()) || []
      );

      const missingEmails = Array.from(expectedEmails).filter(
        email => !outputEmails.has(email)
      );

      const score = missingEmails.length === 0 ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score,
          details: {
            reason: missingEmails.length === 0
              ? 'All emails present'
              : `Missing emails: ${missingEmails.join(', ')}`,
            expectedCount: expectedEmails.size,
            actualCount: outputEmails.size,
            missing: missingEmails,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: { error: error.message },
        },
      };
    }
  }
);

/**
 * Evaluator: Alle Beats vorhanden
 *
 * Prüft, ob alle Beats aus allen Varianten im gemergten Kontakt vorhanden sind.
 */
export const allBeatsPresentEvaluator = ai.defineEvaluator(
  {
    name: 'merge/allBeatsPresent',
    displayName: 'All Beats Present',
    definition: 'Checks if all beats from all variants are present in merged contact',
  },
  async (datapoint) => {
    try {
      const input = datapoint.input as { variants: Variant[] };
      const output = datapoint.output as MergedContact;

      // Sammle alle einzigartigen Beats aus Varianten
      const expectedBeats = new Set<string>();
      for (const variant of input.variants) {
        for (const beat of variant.contactData.beats || []) {
          expectedBeats.add(beat.toLowerCase());
        }
      }

      // Prüfe, ob alle Beats im Output sind
      const outputBeats = new Set(
        output.beats?.map(b => b.toLowerCase()) || []
      );

      const missingBeats = Array.from(expectedBeats).filter(
        beat => !outputBeats.has(beat)
      );

      const score = missingBeats.length === 0 ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score,
          details: {
            reason: missingBeats.length === 0
              ? 'All beats present'
              : `Missing beats: ${missingBeats.join(', ')}`,
            expectedCount: expectedBeats.size,
            actualCount: outputBeats.size,
            missing: missingBeats,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: { error: error.message },
        },
      };
    }
  }
);

/**
 * Evaluator: Alle Publications vorhanden
 *
 * Prüft, ob alle Publications aus allen Varianten im gemergten Kontakt vorhanden sind.
 */
export const allPublicationsPresentEvaluator = ai.defineEvaluator(
  {
    name: 'merge/allPublicationsPresent',
    displayName: 'All Publications Present',
    definition: 'Checks if all publications from all variants are present in merged contact',
  },
  async (datapoint) => {
    try {
      const input = datapoint.input as { variants: Variant[] };
      const output = datapoint.output as MergedContact;

      // Sammle alle einzigartigen Publications aus Varianten
      const expectedPublications = new Set<string>();
      for (const variant of input.variants) {
        for (const pub of variant.contactData.publications || []) {
          expectedPublications.add(pub.toLowerCase());
        }
      }

      // Prüfe, ob alle Publications im Output sind
      const outputPublications = new Set(
        output.publications?.map(p => p.toLowerCase()) || []
      );

      const missingPublications = Array.from(expectedPublications).filter(
        pub => !outputPublications.has(pub)
      );

      const score = missingPublications.length === 0 ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score,
          details: {
            reason: missingPublications.length === 0
              ? 'All publications present'
              : `Missing publications: ${missingPublications.join(', ')}`,
            expectedCount: expectedPublications.size,
            actualCount: outputPublications.size,
            missing: missingPublications,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: { error: error.message },
        },
      };
    }
  }
);

/**
 * Evaluator: Titel korrekt übernommen
 *
 * Prüft, ob ein vorhandener Titel (Dr., Prof., etc.) korrekt übernommen wurde.
 */
export const titlePreservedEvaluator = ai.defineEvaluator(
  {
    name: 'merge/titlePreserved',
    displayName: 'Title Preserved',
    definition: 'Checks if title (Dr., Prof., etc.) is preserved in merged contact when present in variants',
  },
  async (datapoint) => {
    try {
      const input = datapoint.input as { variants: Variant[] };
      const output = datapoint.output as MergedContact;

      // Finde den ersten Titel in den Varianten
      let expectedTitle: string | null = null;
      for (const variant of input.variants) {
        if (variant.contactData.name.title) {
          expectedTitle = variant.contactData.name.title;
          break;
        }
      }

      // Wenn kein Titel erwartet wird, ist der Test erfolgreich
      if (!expectedTitle) {
        return {
          testCaseId: datapoint.testCaseId,
          evaluation: {
            score: 1,
            details: {
              reason: 'No title in variants, test passes',
            },
          },
        };
      }

      // Prüfe, ob Titel im Output vorhanden ist
      const titleMatch = output.name?.title === expectedTitle;
      const score = titleMatch ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score,
          details: {
            reason: titleMatch
              ? `Title '${expectedTitle}' correctly preserved`
              : `Expected title '${expectedTitle}', got '${output.name?.title || 'none'}'`,
            expected: expectedTitle,
            actual: output.name?.title || null,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: { error: error.message },
        },
      };
    }
  }
);

/**
 * Evaluator: Keine E-Mail-Duplikate
 *
 * Prüft, ob keine doppelten E-Mails im gemergten Kontakt vorhanden sind.
 */
export const noDuplicateEmailsEvaluator = ai.defineEvaluator(
  {
    name: 'merge/noDuplicateEmails',
    displayName: 'No Duplicate Emails',
    definition: 'Checks if merged contact has no duplicate email addresses',
  },
  async (datapoint) => {
    try {
      const output = datapoint.output as MergedContact;

      const emails = output.emails?.map(e => e.email.toLowerCase()) || [];
      const uniqueEmails = new Set(emails);

      const hasDuplicates = emails.length !== uniqueEmails.size;
      const score = hasDuplicates ? 0 : 1;

      const duplicates = emails.filter(
        (email, index) => emails.indexOf(email) !== index
      );

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score,
          details: {
            reason: hasDuplicates
              ? `Found duplicate emails: ${duplicates.join(', ')}`
              : 'No duplicate emails',
            totalEmails: emails.length,
            uniqueEmails: uniqueEmails.size,
            duplicates: hasDuplicates ? duplicates : [],
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: { error: error.message },
        },
      };
    }
  }
);

/**
 * Evaluator: Primary Flag gesetzt
 *
 * Prüft, ob mindestens eine E-Mail und Telefon als Primary markiert sind.
 */
export const primaryFlagsSetEvaluator = ai.defineEvaluator(
  {
    name: 'merge/primaryFlagsSet',
    displayName: 'Primary Flags Set',
    definition: 'Checks if at least one email and phone have isPrimary=true',
  },
  async (datapoint) => {
    try {
      const output = datapoint.output as MergedContact;

      const hasPrimaryEmail = output.emails?.some(e => e.isPrimary) || false;
      const hasPrimaryPhone = output.phones?.some(p => p.isPrimary) || false;

      // Wenn keine Telefone vorhanden sind, nur E-Mail prüfen
      const phonesExist = (output.phones?.length || 0) > 0;
      const score = hasPrimaryEmail && (hasPrimaryPhone || !phonesExist) ? 1 : 0;

      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score,
          details: {
            reason: score === 1
              ? 'Primary flags correctly set'
              : 'Missing primary flags',
            hasPrimaryEmail,
            hasPrimaryPhone,
            phonesExist,
          },
        },
      };
    } catch (error: any) {
      return {
        testCaseId: datapoint.testCaseId,
        evaluation: {
          score: 0,
          details: { error: error.message },
        },
      };
    }
  }
);
