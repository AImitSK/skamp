// src/types/document-content.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Interne Dokument-Typen für Tiptap-basierte Editoren
 */
export type InternalDocumentType = 'celero-doc' | 'celero-sheet' | 'imported-doc';

/**
 * Dokument-Content in Firestore gespeichert
 */
export interface DocumentContent {
  id?: string;
  content: string; // HTML from Tiptap
  plainText?: string; // Für Suche und Preview
  organizationId: string;
  projectId: string;
  folderId: string;
  
  // Versionierung
  version: number;
  versionHistory?: DocumentVersion[];
  
  // Kollaboration & Tracking
  currentEditor?: string | null;
  lastEditedBy: string;
  lastEditedAt: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  
  // Lock für gleichzeitige Bearbeitung
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: Timestamp;
}

/**
 * Versions-Historie für Dokumente
 */
export interface DocumentVersion {
  version: number;
  content: string;
  updatedBy: string;
  updatedAt: Timestamp;
  versionNotes?: string;
}

/**
 * Metadaten für interne Dokumente (in Media Assets gespeichert)
 */
export interface InternalDocument {
  id?: string;
  fileName: string;
  fileType: InternalDocumentType;
  folderId: string;
  organizationId: string;
  projectId: string;
  
  // Referenz zum Firestore-Dokument mit dem Content
  contentRef: string; // documentContent/{id}
  
  // Metadaten
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  fileSize?: number; // Berechnet aus Content-Länge
  
  // Optional für importierte Dateien
  originalFormat?: 'docx' | 'xlsx' | 'pdf';
  originalUrl?: string; // Falls Original behalten wird
  
  // UI-Anzeige
  icon?: 'document' | 'spreadsheet';
  color?: string;
}

/**
 * Spreadsheet-spezifische Daten
 */
export interface SpreadsheetContent extends Omit<DocumentContent, 'content'> {
  content: string; // JSON stringified SpreadsheetData
  data: SpreadsheetData;
}

export interface SpreadsheetData {
  cells: (string | number | null)[][];
  formulas?: Record<string, string>;
  styles?: Record<string, any>;
  mergedCells?: Array<{
    row: number;
    col: number;
    rowspan: number;
    colspan: number;
  }>;
  columnWidths?: number[];
  rowHeights?: number[];
}

/**
 * Template für neue Dokumente
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  type: 'document' | 'spreadsheet';
  content: string;
  description?: string;
  category?: string;
  isDefault?: boolean;
}