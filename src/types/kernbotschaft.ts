import { Timestamp } from 'firebase/firestore';
import { ChatMessage } from './marken-dna';

/**
 * Kernbotschaft - Projekt-spezifische strategische Kernbotschaft
 * Firestore: projects/{projectId}/kernbotschaft
 *
 * Die Kernbotschaft ist kurzfristig und dynamisch (pro Projekt neu).
 * Sie definiert Anlass, Ziel und Teilbotschaften für ein konkretes Projekt.
 */
export interface Kernbotschaft {
  id: string;
  projectId: string;
  companyId: string;          // Referenz auf Company (type: 'customer')
  organizationId: string;

  // Inhalt
  occasion: string;           // Anlass
  goal: string;               // Ziel
  keyMessage: string;         // Teilbotschaft
  content: string;            // Generiertes Dokument (HTML)
  plainText: string;          // Fuer KI

  // Status
  status: 'draft' | 'completed';

  // Chat-Verlauf (fuer Weiterbearbeitung)
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

/**
 * Daten zum Erstellen einer neuen Kernbotschaft
 */
export interface KernbotschaftCreateData {
  projectId: string;
  companyId: string;          // Referenz auf Company (type: 'customer')
  occasion: string;
  goal: string;
  keyMessage: string;
  content: string;
  plainText?: string;
  status?: 'draft' | 'completed';
  chatHistory?: ChatMessage[];
}

/**
 * Daten zum Aktualisieren einer Kernbotschaft
 */
export interface KernbotschaftUpdateData {
  occasion?: string;
  goal?: string;
  keyMessage?: string;
  content?: string;
  plainText?: string;
  status?: 'draft' | 'completed';
  chatHistory?: ChatMessage[];
}
