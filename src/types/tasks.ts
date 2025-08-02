// src/types/tasks.ts
import { Timestamp } from 'firebase/firestore';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id?: string;
  userId: string;
  organizationId: string;
  
  // Basis-Informationen
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  
  // Zeitdaten
  dueDate?: Timestamp;
  startTime?: string; // Format: "HH:MM" z.B. "14:30"
  endTime?: string;   // Format: "HH:MM" z.B. "15:30"
  isAllDay?: boolean; // Explizit markieren ob ganztägig
  duration?: number;  // Dauer in Minuten (alternativ zu endTime)
  
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