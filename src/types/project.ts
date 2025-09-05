// src/types/project.ts - Basis-Projekt-Types für Pipeline-Integration
import { Timestamp } from 'firebase/firestore';
import type { ProjectMilestone } from './pr';

// ✅ Pipeline-Stage direkt hier definieren für bessere Type-Sicherheit
export type PipelineStage = 
  | 'creation'     // Erstellung-Phase
  | 'review'       // Review-Phase
  | 'approval'     // Freigabe-Phase
  | 'distribution' // Verteilung-Phase
  | 'completed';   // Abgeschlossen

export interface Project {
  id?: string;
  userId: string;
  organizationId: string;
  
  // Projekt-Details
  title: string;
  description?: string;
  status: ProjectStatus;
  currentStage: PipelineStage;
  
  // Kunde/Auftraggeber
  customer?: {
    id: string;
    name: string;
  };
  
  // Budget
  budget?: number;
  currency?: string;
  
  // Verknüpfte Kampagnen
  linkedCampaigns?: string[];
  
  // Meilensteine
  milestones?: ProjectMilestone[];
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  
  // Team
  assignedTo?: string[];
}

export type ProjectStatus = 
  | 'active'
  | 'on_hold' 
  | 'completed'
  | 'cancelled';

export interface ProjectFilters {
  status?: ProjectStatus;
  currentStage?: PipelineStage;
  customerId?: string;
}