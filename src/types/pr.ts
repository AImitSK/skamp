// src/types/pr.ts
import { Timestamp } from 'firebase/firestore';

// Definiert den Zustand einer Kampagne
export type PRCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'archived';

// Die Hauptdatenstruktur für eine PR-Kampagne
export interface PRCampaign {
  id?: string;
  userId: string;
  
  // Inhaltliche Daten
  title: string;          // Titel der Kampagne / Betreffzeile
  contentHtml: string;    // Der Inhalt aus dem Rich-Text-Editor
  
  // Status und Planung
  status: PRCampaignStatus;
  
  // Empfänger-Informationen (denormalisiert für einfachen Zugriff)
  distributionListId: string;
  distributionListName: string;
  recipientCount: number;
  
  // Zeitstempel
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  scheduledAt?: Timestamp | null; // Für geplanten Versand
  sentAt?: Timestamp | null;      // Wann wurde sie tatsächlich versendet
}