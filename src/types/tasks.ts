// src/types/tasks.ts
import { Timestamp } from 'firebase/firestore';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id?: string;
  userId: string;
  
  // Basis-Informationen
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  
  // Zeitdaten
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  reminder?: Timestamp;
  
  // Verknüpfungen
  linkedCampaignId?: string;
  linkedClientId?: string;
  linkedContactId?: string;
  
  // Checkliste
  checklist?: ChecklistItem[];
  
  // Metadaten
  tags?: string[];
  assignedTo?: string[];
  
  // Timestamps
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Timestamp;
}