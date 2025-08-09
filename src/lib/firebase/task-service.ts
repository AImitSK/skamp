// src/lib/firebase/task-service.ts - UPDATED WITH NOTIFICATION INTEGRATION
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
import { notificationsService } from './notifications-service';

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
    
    // ========== NOTIFICATION INTEGRATION: Task mit Fälligkeitsdatum ==========
    // Wenn die Task ein Fälligkeitsdatum in der Zukunft hat, könnten wir hier
    // eine Erinnerung planen (optional für später)
    
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
  async getAll(organizationId: string, userId?: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, 'tasks'),
        where('organizationId', '==', organizationId),
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
        // Firestore Index missing for tasks, using fallback without orderBy
        const q = query(
          collection(db, 'tasks'),
          where('organizationId', '==', organizationId)
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
  async getByDateRange(organizationId: string, startDate: Date, endDate: Date, userId?: string): Promise<Task[]> {
    
    const tasks = await this.getAll(organizationId, userId);
    
    const filteredTasks = tasks.filter(task => {
      if (!task.dueDate) {
        return false;
      }
      const taskDate = task.dueDate.toDate();
      const inRange = taskDate >= startDate && taskDate <= endDate;
      return inRange;
    });
    
    return filteredTasks;
  },

  /**
   * Holt alle Aufgaben für einen bestimmten Kunden
   */
  async getByClientId(organizationId: string, clientId: string, userId?: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
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
  async getByCampaignId(organizationId: string, campaignId: string, userId?: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('organizationId', '==', organizationId),
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
    
    // ========== NOTIFICATION INTEGRATION: Check for overdue status ==========
    // Hole die aktuelle Task um zu prüfen ob sie überfällig wird
    const currentTask = await this.getById(taskId);
    if (currentTask && data.dueDate && data.status !== 'completed') {
      const newDueDate = data.dueDate instanceof Timestamp ? data.dueDate.toDate() : data.dueDate;
      const now = new Date();
      
      // Wenn das neue Fälligkeitsdatum in der Vergangenheit liegt und die Task nicht erledigt ist
      if (newDueDate < now && currentTask.status !== 'completed') {
        try {
          await notificationsService.create({
            userId: currentTask.userId,
            type: 'TASK_OVERDUE',
            title: 'Task ist überfällig',
            message: `Die Task "${currentTask.title}" ist jetzt überfällig.`,
            linkUrl: `/dashboard/tasks/${taskId}`,
            linkType: 'task',
            linkId: taskId,
            isRead: false,
            metadata: {
              taskName: currentTask.title
            }
          });
          // Notification sent: Task is overdue
        } catch (notificationError) {
          // Error sending overdue notification
        }
      }
    }
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Markiert eine Aufgabe als erledigt
   */
  async markAsCompleted(taskId: string): Promise<void> {
    // ========== NOTIFICATION INTEGRATION: Optional - Task completed ==========
    // Hier könntest du eine Benachrichtigung für erledigte Tasks hinzufügen
    // wenn das gewünscht ist
    
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
  async getStats(organizationId: string, userId?: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  }> {
    const tasks = await this.getAll(organizationId, userId);
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
  },

  /**
   * Prüft überfällige Tasks und sendet Benachrichtigungen
   * Diese Methode wird vom Cron-Job aufgerufen
   */
  async checkAndNotifyOverdueTasks(organizationId: string, userId?: string): Promise<void> {
    try {
      if (!userId) {
        // No userId provided for overdue task check
        return;
      }
      
      // Checking for overdue tasks for user
      
      // Hole die Benachrichtigungseinstellungen
      const settings = await notificationsService.getSettings(userId);
      if (!settings.taskOverdue) {
        // Task overdue notifications disabled for user
        return;
      }
      
      // Hole alle nicht-erledigten Tasks
      const tasks = await this.getAll(organizationId, userId);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Filtere überfällige Tasks
      const overdueTasks = tasks.filter(task => {
        if (task.status === 'completed' || !task.dueDate) {
          return false;
        }
        
        const dueDate = task.dueDate.toDate();
        // Task ist überfällig wenn Fälligkeitsdatum vor heute liegt
        return dueDate < todayStart;
      });
      
      // Found overdue tasks
      
      // Erstelle Benachrichtigungen für überfällige Tasks
      for (const task of overdueTasks) {
        // Prüfe ob wir heute schon eine Benachrichtigung für diese Task gesendet haben
        const existingNotifications = await getDocs(
          query(
            collection(db, 'notifications'),
            where('organizationId', '==', organizationId),
            where('type', '==', 'TASK_OVERDUE'),
            where('linkId', '==', task.id),
            where('createdAt', '>=', Timestamp.fromDate(todayStart))
          )
        );
        
        if (existingNotifications.empty) {
          // Keine Benachrichtigung heute, also senden
          await notificationsService.create({
            userId: userId,
            type: 'TASK_OVERDUE',
            title: 'Überfälliger Task',
            message: `Dein Task "${task.title}" ist überfällig.`,
            linkUrl: `/dashboard/tasks/${task.id}`,
            linkType: 'task',
            linkId: task.id!,
            isRead: false,
            metadata: {
              taskName: task.title
            }
          });
          
          // Notification sent for overdue task
        } else {
          // Notification for task already sent today
        }
      }
      
    } catch (error) {
      // Error checking overdue tasks
      throw error;
    }
  }
};