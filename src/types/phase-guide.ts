// src/types/phase-guide.ts
import { Timestamp } from 'firebase/firestore';
import type { PipelineStage } from './project';

export interface PhaseGuide {
  phase: PipelineStage;
  title: string;
  description: string;
  tasks: GuideTask[];
  progress: GuideProgress;
}

export interface GuideTask {
  id: string;
  title: string;
  description: string;
  actionType: GuideActionType;
  actionTarget: string;
  completed: boolean;
  required: boolean;
  estimatedTime: string;
  helpText: string;
}

export type GuideActionType =
  | 'navigate_tab'          // Zu anderem Tab wechseln (tasks, daten)
  | 'navigate_external'     // Zu anderer Seite navigieren
  | 'create_campaign'       // Kampagne erstellen
  | 'advance_phase';        // Zur nächsten Phase

export interface GuideProgress {
  completed: number;
  total: number;
  required: number;
}

export interface ProjectGuideState {
  projectId: string;
  currentPhase: PipelineStage;
  completedTasks: string[];
  lastUpdated: Timestamp;
  userId: string;
  organizationId: string;
}