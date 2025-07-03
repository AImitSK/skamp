// src/lib/firebase/task-service.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client-init';
import { Task } from '@/types/tasks';

export const taskService = {
  /**
   * Erstellt eine neue Aufgabe
   */
  async create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Holt eine Aufgabe anhand der ID
   */
  async getById(taskId: string): Promise<Task | null> {
    const docRef = doc(db, 'tasks', taskId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Task;
    }
    return null;
  },

  /**
   * Holt alle Aufgaben eines Benutzers
   */
  async getAll(userId: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        orderBy('dueDate', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
    } catch (error: any) {
      // Fallback ohne orderBy falls Index fehlt
      if (error.code === 'failed-precondition') {
        console.warn('Firestore Index fehlt für tasks, verwende Fallback ohne orderBy');
        const q = query(
          collection(db, 'tasks'),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Task));
        
        // Client-seitige Sortierung
        return tasks.sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0;
          return a.dueDate.toMillis() - b.dueDate.toMillis();
        });
      }
      throw error;
    }
  },

  /**
   * Holt alle Aufgaben für einen bestimmten Zeitraum
   */
  async getByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Task[]> {
    console.log('🔍 taskService.getByDateRange aufgerufen mit:', {
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const tasks = await this.getAll(userId);
    console.log('📋 Alle Tasks des Users:', tasks.length);
    
    const filteredTasks = tasks.filter(task => {
      if (!task.dueDate) {
        console.log(`Task ${task.id} hat kein dueDate`);
        return false;
      }
      const taskDate = task.dueDate.toDate();
      const inRange = taskDate >= startDate && taskDate <= endDate;
      console.log(`Task ${task.id} (${task.title}): ${taskDate.toISOString()} - Im Zeitraum: ${inRange}`);
      return inRange;
    });
    
    console.log(`📊 Gefilterte Tasks: ${filteredTasks.length} von ${tasks.length}`);
    return filteredTasks;
  },

  /**
   * Holt alle Aufgaben für einen bestimmten Kunden
   */
  async getByClientId(userId: string, clientId: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('linkedClientId', '==', clientId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  },

  /**
   * Holt alle Aufgaben für eine bestimmte Kampagne
   */
  async getByCampaignId(userId: string, campaignId: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      where('linkedCampaignId', '==', campaignId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  },

  /**
   * Aktualisiert eine Aufgabe
   */
  async update(taskId: string, data: Partial<Omit<Task, 'id' | 'userId'>>): Promise<void> {
    const docRef = doc(db, 'tasks', taskId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Markiert eine Aufgabe als erledigt
   */
  async markAsCompleted(taskId: string): Promise<void> {
    await this.update(taskId, {
      status: 'completed',
      completedAt: Timestamp.now()
    });
  },

  /**
   * Löscht eine Aufgabe
   */
  async delete(taskId: string): Promise<void> {
    await deleteDoc(doc(db, 'tasks', taskId));
  },

  /**
   * Holt Statistiken zu Aufgaben
   */
  async getStats(userId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  }> {
    const tasks = await this.getAll(userId);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    return tasks.reduce((acc, task) => {
      acc.total++;
      
      if (task.status === 'completed') {
        acc.completed++;
      } else {
        acc.pending++;
        
        if (task.dueDate) {
          const dueDate = task.dueDate.toDate();
          
          if (dueDate < today) {
            acc.overdue++;
          } else if (dueDate.toDateString() === today.toDateString()) {
            acc.dueToday++;
          } else if (dueDate <= weekEnd) {
            acc.dueThisWeek++;
          }
        }
      }
      
      return acc;
    }, {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
      dueToday: 0,
      dueThisWeek: 0
    });
  }
};