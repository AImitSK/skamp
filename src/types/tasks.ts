// src/types/tasks.ts
import { Timestamp } from 'firebase/firestore';
import type { PipelineStage } from './project';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
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
  linkedProjectId?: string;
  
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

// ========================================
// PLAN 8/9: PIPELINE-TASK-INTEGRATION
// ========================================

// Pipeline-erweiterte Task Interface
export interface PipelineAwareTask extends Task {
  // NEU: Pipeline-spezifische Felder
  pipelineStage?: PipelineStage;
  requiredForStageCompletion?: boolean; // Kritische Tasks für Stage-Übergang
  stageTransitionTrigger?: boolean;     // Task löst Stage-Übergang aus
  templateCategory?: string;            // Template-Kategorie für automatische Erstellung
  
  // ERWEITERT: Abhängigkeiten
  dependsOnTaskIds?: string[];          // Task-IDs von denen diese Task abhängt
  dependsOnStageCompletion?: PipelineStage[]; // Stages die abgeschlossen sein müssen
  blocksStageTransition?: boolean;      // Verhindert Stage-Übergang wenn nicht erledigt
  
  // NEU: Automatisierung
  autoCompleteOnStageChange?: boolean;  // Auto-complete bei Stage-Wechsel
  autoCreateOnStageEntry?: boolean;     // Auto-create bei Stage-Eintritt
  
  // NEU: Stage-Kontext
  stageContext?: {
    createdOnStageEntry: boolean;       // Automatisch bei Stage-Eintritt erstellt
    inheritedFromTemplate: string;      // Template-ID falls auto-generiert
    stageProgressWeight: number;        // Gewichtung für Stage-Progress (1-5)
    criticalPath: boolean;              // Liegt auf kritischem Pfad
  };
  
  // ERWEITERT: Deadline-Management
  deadlineRules?: {
    relativeToPipelineStage: boolean;   // Deadline relativ zu Stage-Start
    daysAfterStageEntry: number;        // Tage nach Stage-Beginn
    cascadeDelay: boolean;              // Verzögerung weiterleiten
  };
}