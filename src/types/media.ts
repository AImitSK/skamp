// src/types/media.ts
import { Timestamp } from 'firebase/firestore';

export interface MediaAsset {
  id?: string;
  userId: string;
  fileName: string;
  fileType: string; // z.B. 'image/jpeg', 'video/mp4'
  storagePath: string; // Pfad in Firebase Storage
  downloadUrl: string; // Öffentliche URL der Datei
  description?: string;
  tags?: string[];
  folderId?: string; // NEU: Ordner-Zuordnung
  clientId?: string; // NEU: Kunden-Zuordnung
  createdAt?: Timestamp;
}

export interface MediaFolder {
  id?: string;
  userId: string;
  name: string;
  parentFolderId?: string; // Für Unterordner
  clientId?: string; // Optional: Kunde zugeordnet
  color?: string; // Ordner-Farbe für visuelle Unterscheidung
  description?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// NEU: Share-Link System
export interface ShareLink {
  id?: string;
  userId: string; // Wer hat den Link erstellt
  shareId: string; // Öffentliche UUID für URL
  type: 'folder' | 'file'; // Was wird geteilt
  targetId: string; // ID des Ordners oder der Datei
  title: string; // Titel für die Share-Seite
  description?: string; // Beschreibung für die Share-Seite
  isActive: boolean; // Link an/aus
  accessCount: number; // Wie oft aufgerufen
  settings: {
    passwordRequired?: string; // Optional: Passwort
    expiresAt?: Timestamp; // Optional: Ablaufdatum
    downloadAllowed: boolean; // Download erlauben
    showFileList?: boolean; // Bei Ordnern: Dateiliste anzeigen
  };
  createdAt?: Timestamp;
  lastAccessedAt?: Timestamp;
}

// Breadcrumb für Navigation
export interface FolderBreadcrumb {
  id: string;
  name: string;
  parentFolderId?: string;
}

// Filter für erweiterte Suche
export interface MediaFilter {
  fileType?: string;
  folderId?: string;
  clientId?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}