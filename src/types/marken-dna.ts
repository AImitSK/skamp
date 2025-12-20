import { Timestamp } from 'firebase/firestore';

// Dokument-Typen
export type MarkenDNADocumentType =
  | 'briefing'
  | 'swot'
  | 'audience'
  | 'positioning'
  | 'goals'
  | 'messages';

// Chat-Nachricht
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
}

// Haupt-Interface
// Firestore: companies/{companyId}/markenDNA/{documentType}
// Hinweis: Kunden sind Companies mit type: 'customer'
export interface MarkenDNADocument {
  id: string;
  companyId: string;          // Referenz auf Company (type: 'customer')
  companyName: string;
  organizationId: string;

  // Typ
  type: MarkenDNADocumentType;
  title: string;              // z.B. "Briefing-Check"

  // Inhalt
  content: string;            // HTML fuer Editor
  plainText: string;          // Plain-Text fuer KI
  structuredData?: Record<string, unknown>;

  // Status
  // missing: Dokument noch nicht erstellt
  // draft: Dokument in Bearbeitung (Chat laeuft noch)
  // completed: Dokument fertig und vom User bestaetigt
  status: 'missing' | 'draft' | 'completed';
  completeness: number;       // 0-100

  // Chat-Verlauf (fuer Weiterbearbeitung)
  chatHistory?: ChatMessage[];

  // Audit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}

// Create-Daten
export interface MarkenDNACreateData {
  companyId: string;          // Referenz auf Company (type: 'customer')
  companyName: string;
  type: MarkenDNADocumentType;
  content: string;
  plainText?: string;
  structuredData?: Record<string, unknown>;
  status?: 'missing' | 'draft' | 'completed';
  completeness?: number;
  chatHistory?: ChatMessage[];
}

// Update-Daten
export interface MarkenDNAUpdateData {
  content?: string;
  plainText?: string;
  structuredData?: Record<string, unknown>;
  status?: 'missing' | 'draft' | 'completed';
  completeness?: number;
  chatHistory?: ChatMessage[];
}

// Kunden-Status (fuer Uebersichtstabelle)
// Hinweis: Kunden sind Companies mit type: 'customer'
export interface CompanyMarkenDNAStatus {
  companyId: string;          // Referenz auf Company (type: 'customer')
  companyName: string;
  documents: {
    briefing: 'missing' | 'draft' | 'completed';
    swot: 'missing' | 'draft' | 'completed';
    audience: 'missing' | 'draft' | 'completed';
    positioning: 'missing' | 'draft' | 'completed';
    goals: 'missing' | 'draft' | 'completed';
    messages: 'missing' | 'draft' | 'completed';
  };
  completeness: number;       // Gesamtfortschritt 0-100
  isComplete: boolean;        // Alle 6 Dokumente vorhanden
  lastUpdated?: Timestamp;
}

// Dokument-Metadaten
export const MARKEN_DNA_DOCUMENTS: Record<MarkenDNADocumentType, {
  title: string;
  description: string;
  order: number;
}> = {
  briefing: {
    title: 'Briefing-Check',
    description: 'Die Faktenbasis - Wer sind wir?',
    order: 1,
  },
  swot: {
    title: 'SWOT-Analyse',
    description: 'Die Bewertung - Staerken, Schwaechen, Chancen, Risiken',
    order: 2,
  },
  audience: {
    title: 'Zielgruppen-Radar',
    description: 'Die Adressaten - Empfaenger, Mittler, Absender',
    order: 3,
  },
  positioning: {
    title: 'Positionierungs-Designer',
    description: 'Das Herzstueck - USP und Soll-Image',
    order: 4,
  },
  goals: {
    title: 'Ziele-Setzer',
    description: 'Die Messlatte - Kopf, Herz, Hand',
    order: 5,
  },
  messages: {
    title: 'Botschaften-Baukasten',
    description: 'Die Argumentation - Kern, Beweis, Nutzen',
    order: 6,
  },
};
