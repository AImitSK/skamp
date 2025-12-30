// src/lib/ai/context-builder.ts
/**
 * WICHTIG: Dieser Code läuft in API Routes (Server-Kontext)!
 * Daher MUSS der Firebase Admin SDK verwendet werden, nicht der Client SDK.
 *
 * Die Services (dnaSyntheseService, kernbotschaftService) verwenden den Client SDK,
 * der in Server-Kontext nicht funktioniert. Deshalb laden wir hier direkt mit adminDb.
 */
import { adminDb } from '@/lib/firebase/admin-init';
import { Kernbotschaft } from '@/types/kernbotschaft';
import { DNASynthese } from '@/types/dna-synthese';

/**
 * AI Context Interface
 *
 * Definiert den Kontext, der an KI-Assistenten uebergeben wird.
 * Im 'expert' Modus werden automatisch DNA Synthese und Kernbotschaft geladen.
 */
export interface AIContext {
  /** Modus: 'standard' oder 'expert' */
  mode: 'standard' | 'expert';

  /** DNA Synthese (KI-optimierte Kurzform der Marken-DNA, ~500 Tokens) */
  dnaSynthese?: string;

  /** Kernbotschaft (projekt-spezifische strategische Botschaft) */
  kernbotschaft?: Kernbotschaft;

  /** User-Prompt (Anfrage des Benutzers) */
  userPrompt: string;

  /** Ausgewaehlte Optionen (fuer Standard-Modus) */
  selectedOptions?: string[];

  /** Template (fuer Standard-Modus) */
  template?: string;
}

/**
 * Optionen fuer buildAIContext
 */
export interface BuildAIContextOptions {
  /** Ausgewaehlte Optionen (fuer Standard-Modus) */
  selectedOptions?: string[];

  /** Template (fuer Standard-Modus) */
  template?: string;
}

/**
 * Baut den vollstaendigen KI-Kontext auf
 *
 * Diese Funktion laedt automatisch die relevanten Daten basierend auf dem Modus:
 * - **Standard-Modus**: Nutzt nur userPrompt, selectedOptions und template
 * - **Experten-Modus**: Laedt zusaetzlich DNA Synthese und Kernbotschaft
 *
 * @param projectId - ID des Projekts (fuer Kernbotschaft)
 * @param companyId - ID des Unternehmens (fuer DNA Synthese)
 * @param mode - Modus ('standard' oder 'expert')
 * @param userPrompt - Anfrage des Benutzers
 * @param options - Zusaetzliche Optionen (selectedOptions, template)
 * @returns Vollstaendiger AI Context
 *
 * @example
 * ```typescript
 * // Standard-Modus
 * const context = await buildAIContext(
 *   projectId,
 *   companyId,
 *   'standard',
 *   'Schreibe eine Pressemeldung ueber...',
 *   { selectedOptions: ['seo', 'formal'], template: 'press-release' }
 * );
 *
 * // Experten-Modus (laedt automatisch DNA Synthese + Kernbotschaft)
 * const expertContext = await buildAIContext(
 *   projectId,
 *   companyId,
 *   'expert',
 *   'Schreibe eine Pressemeldung ueber...'
 * );
 * ```
 */
export async function buildAIContext(
  projectId: string,
  companyId: string | undefined,
  mode: 'standard' | 'expert',
  userPrompt: string,
  options?: BuildAIContextOptions
): Promise<AIContext> {
  const context: AIContext = {
    mode,
    userPrompt,
    ...options,
  };

  // Im Experten-Modus: DNA Synthese und Kernbotschaft automatisch laden
  // WICHTIG: Verwendet Firebase Admin SDK (adminDb), da dieser Code in API Routes läuft!
  if (mode === 'expert') {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 buildAIContext: Lade Experten-Kontext (Admin SDK)');
    console.log('   projectId:', projectId);
    console.log('   companyId:', companyId);
    console.log('═══════════════════════════════════════════════════════════════');

    try {
      // 1. DNA Synthese laden (bereits verdichtet auf ~500 Tokens)
      // WICHTIG: DNA Synthese gehoert zum Unternehmen (companyId), nicht zum Projekt!
      // Firestore-Pfad: companies/{companyId}/markenDNA/synthesis
      if (companyId) {
        console.log('📥 Lade DNA Synthese fuer companyId:', companyId);
        const syntheseRef = adminDb
          .collection('companies')
          .doc(companyId)
          .collection('markenDNA')
          .doc('synthesis');
        const syntheseSnap = await syntheseRef.get();

        if (syntheseSnap.exists) {
          const dnaSynthese = { id: syntheseSnap.id, ...syntheseSnap.data() } as DNASynthese;
          context.dnaSynthese = dnaSynthese.plainText;
          console.log('✅ DNA Synthese geladen!');
          console.log('   - ID:', dnaSynthese.id);
          console.log('   - Laenge:', dnaSynthese.plainText?.length || 0, 'Zeichen');
          console.log('   - Preview:', dnaSynthese.plainText?.substring(0, 200) + '...');
        } else {
          console.warn('⚠️ KEINE DNA Synthese gefunden!');
          console.warn('   Firestore-Pfad: companies/' + companyId + '/markenDNA/synthesis');
        }
      } else {
        console.warn('⚠️ KEINE companyId uebergeben - DNA Synthese wird nicht geladen!');
      }

      // 2. Kernbotschaft laden
      // Firestore-Pfad: projects/{projectId}/kernbotschaft/{id}
      console.log('📥 Lade Kernbotschaft fuer projectId:', projectId);
      const kernbotschaftRef = adminDb
        .collection('projects')
        .doc(projectId)
        .collection('kernbotschaft');
      const kernbotschaftSnap = await kernbotschaftRef.get();

      if (!kernbotschaftSnap.empty) {
        const firstDoc = kernbotschaftSnap.docs[0];
        const kernbotschaft = { id: firstDoc.id, ...firstDoc.data() } as Kernbotschaft;
        context.kernbotschaft = kernbotschaft;
        console.log('✅ Kernbotschaft geladen!');
        console.log('   - ID:', kernbotschaft.id);
        console.log('   - Anlass:', kernbotschaft.occasion || '(nicht gesetzt)');
        console.log('   - Ziel:', kernbotschaft.goal || '(nicht gesetzt)');
        console.log('   - PlainText Laenge:', kernbotschaft.plainText?.length || 0, 'Zeichen');
        console.log('   - Preview:', kernbotschaft.plainText?.substring(0, 200) + '...');
      } else {
        console.warn('⚠️ KEINE Kernbotschaft gefunden!');
        console.warn('   Firestore-Pfad: projects/' + projectId + '/kernbotschaft/...');
      }

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📊 ZUSAMMENFASSUNG buildAIContext:');
      console.log('   - DNA Synthese vorhanden:', !!context.dnaSynthese);
      console.log('   - Kernbotschaft vorhanden:', !!context.kernbotschaft);
      console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
      console.error('❌ FEHLER beim Laden des Experten-Kontexts:', error);
      // Context wird trotz Fehler zurueckgegeben (Graceful Degradation)
    }
  }

  return context;
}
