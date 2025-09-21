// src/lib/firebase/guide-state-service.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import type { ProjectGuideState, PipelineStage } from '@/types/phase-guide';

export class GuideStateService {

  async getProjectGuideState(
    projectId: string,
    organizationId: string,
    userId: string
  ): Promise<ProjectGuideState | null> {
    try {
      const docRef = doc(db, 'project_guide_states', `${projectId}_${userId}`);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return await this.createInitialGuideState(projectId, organizationId, userId);
      }

      return {
        ...docSnap.data()
      } as ProjectGuideState;
    } catch (error) {
      console.error('Error getting guide state:', error);
      return null;
    }
  }

  async toggleTaskCompletion(
    projectId: string,
    userId: string,
    taskId: string,
    completed: boolean
  ): Promise<void> {
    try {
      const docRef = doc(db, 'project_guide_states', `${projectId}_${userId}`);

      if (completed) {
        await updateDoc(docRef, {
          completedTasks: arrayUnion(taskId),
          lastUpdated: serverTimestamp()
        });
      } else {
        await updateDoc(docRef, {
          completedTasks: arrayRemove(taskId),
          lastUpdated: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  }

  async updatePhase(
    projectId: string,
    userId: string,
    newPhase: PipelineStage
  ): Promise<void> {
    try {
      const docRef = doc(db, 'project_guide_states', `${projectId}_${userId}`);

      await updateDoc(docRef, {
        currentPhase: newPhase,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating phase:', error);
      throw error;
    }
  }

  private async createInitialGuideState(
    projectId: string,
    organizationId: string,
    userId: string
  ): Promise<ProjectGuideState> {
    const initialState: ProjectGuideState = {
      projectId,
      currentPhase: 'ideas_planning',
      completedTasks: [],
      lastUpdated: serverTimestamp() as Timestamp,
      userId,
      organizationId
    };

    const docRef = doc(db, 'project_guide_states', `${projectId}_${userId}`);
    await setDoc(docRef, initialState);

    return initialState;
  }
}

export const guideStateService = new GuideStateService();