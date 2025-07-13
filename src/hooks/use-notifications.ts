// src/hooks/use-notifications.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { Notification, NotificationSettings } from '@/types/notifications';
import { Unsubscribe } from 'firebase/firestore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// Helper function für überfällige Checks
async function checkForOverdueItems(userId: string, settings: NotificationSettings | null) {
  if (!settings) return;
  
  const checks = [];
  
  // Nur prüfen wenn aktiviert
  if (settings.overdueApprovals) {
    checks.push(checkOverdueApprovals(userId, settings.overdueApprovalDays || 3));
  }
  
  if (settings.taskOverdue) {
    checks.push(checkOverdueTasks(userId));
  }
  
  if (checks.length > 0) {
    await Promise.all(checks);
  }
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const pathname = usePathname();
  const lastCheckRef = useRef<number>(0);
  const settingsRef = useRef<NotificationSettings | null>(null);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.getAll(user.uid);
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Fehler beim Laden der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: true } 
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Fehler beim Markieren der Benachrichtigung');
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await notificationsService.markAllAsRead(user.uid);
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Fehler beim Markieren aller Benachrichtigungen');
    }
  }, [user?.uid]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.delete(notificationId);
      
      // Optimistic update
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if the notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError('Fehler beim Löschen der Benachrichtigung');
    }
  }, [notifications]);

  // Lade Settings einmalig
  useEffect(() => {
    if (!user?.uid) return;
    
    notificationsService.getSettings(user.uid).then(settings => {
      settingsRef.current = settings;
    }).catch(err => {
      console.error('Error loading notification settings for checks:', err);
    });
  }, [user?.uid]);

  // Check bei Route-Änderung
  useEffect(() => {
    if (!user?.uid) return;
    
    // Verhindere zu häufige Checks (max alle 5 Minuten)
    const now = Date.now();
    if (now - lastCheckRef.current < 5 * 60 * 1000) return;
    
    lastCheckRef.current = now;
    checkForOverdueItems(user.uid, settingsRef.current).catch(err => {
      console.error('Error checking for overdue items:', err);
    });
  }, [pathname, user?.uid]);

  // Check wenn Tab aktiv wird
  useEffect(() => {
    if (!user?.uid) return;
    
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastCheckRef.current < 5 * 60 * 1000) return;
      
      lastCheckRef.current = now;
      checkForOverdueItems(user.uid, settingsRef.current).catch(err => {
        console.error('Error checking for overdue items on focus:', err);
      });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribeNotifications: Unsubscribe | null = null;
    let unsubscribeCount: Unsubscribe | null = null;

    // Subscribe to notifications
    unsubscribeNotifications = notificationsService.subscribeToNotifications(
      user.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      }
    );

    // Subscribe to unread count
    unsubscribeCount = notificationsService.subscribeToUnreadCount(
      user.uid,
      (count) => {
        setUnreadCount(count);
      }
    );

    // Initial load
    loadNotifications();

    // Cleanup
    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeCount) unsubscribeCount();
    };
  }, [user?.uid, loadNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications
  };
}

// Hook for notification settings
interface UseNotificationSettingsReturn {
  settings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<NotificationSettings>) => Promise<void>;
}

export function useNotificationSettings(): UseNotificationSettingsReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings
  useEffect(() => {
    if (!user?.uid) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await notificationsService.getSettings(user.uid);
        setSettings(data);
      } catch (err) {
        console.error('Error loading notification settings:', err);
        setError('Fehler beim Laden der Einstellungen');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.uid]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    if (!user?.uid) return;

    try {
      setError(null);
      await notificationsService.updateSettings(user.uid, updates);
      
      // Optimistic update
      setSettings(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating notification settings:', err);
      setError('Fehler beim Speichern der Einstellungen');
      throw err;
    }
  }, [user?.uid]);

  return {
    settings,
    loading,
    error,
    updateSettings
  };
}

// Helper functions für überfällige Checks
async function checkOverdueApprovals(userId: string, overdueDays: number) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - overdueDays);

  const campaignsQuery = query(
    collection(db, 'pr_campaigns'),
    where('userId', '==', userId),
    where('status', '==', 'in_review'),
    where('updatedAt', '<=', Timestamp.fromDate(thresholdDate))
  );

  const snapshot = await getDocs(campaignsQuery);
  
  for (const doc of snapshot.docs) {
    const campaign = doc.data();
    
    // Check if notification already exists today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const existingQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('type', '==', 'OVERDUE_APPROVAL'),
      where('metadata.campaignId', '==', doc.id),
      where('createdAt', '>=', Timestamp.fromDate(todayStart)),
      limit(1)
    );
    
    const existingNotifications = await getDocs(existingQuery);
    
    if (existingNotifications.empty) {
      const daysOverdue = Math.floor(
        (Date.now() - campaign.updatedAt.toDate().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      await notificationsService.create({
        userId: userId,
        type: 'OVERDUE_APPROVAL',
        title: 'Überfällige Freigabe-Anfrage',
        message: `Die Freigabe-Anfrage für "${campaign.title}" ist seit ${daysOverdue} Tagen überfällig.`,
        linkUrl: `/dashboard/pr-kampagnen/${doc.id}`,
        linkType: 'campaign',
        linkId: doc.id,
        isRead: false,
        metadata: {
          campaignId: doc.id,
          campaignTitle: campaign.title,
          daysOverdue: daysOverdue
        }
      });
    }
  }
}

async function checkOverdueTasks(userId: string) {
  const now = Timestamp.now();
  
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    where('status', '!=', 'completed'),
    where('dueDate', '<=', now)
  );

  const snapshot = await getDocs(tasksQuery);
  
  for (const doc of snapshot.docs) {
    const task = doc.data();
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const existingQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('type', '==', 'TASK_OVERDUE'),
      where('linkId', '==', doc.id),
      where('createdAt', '>=', Timestamp.fromDate(todayStart)),
      limit(1)
    );
    
    const existingNotifications = await getDocs(existingQuery);
    
    if (existingNotifications.empty) {
      await notificationsService.create({
        userId: userId,
        type: 'TASK_OVERDUE',
        title: 'Überfälliger Task',
        message: `Dein Task "${task.title}" ist überfällig.`,
        linkUrl: `/dashboard/tasks/${doc.id}`,
        linkType: 'task',
        linkId: doc.id,
        isRead: false,
        metadata: {
          taskName: task.title
        }
      });
    }
  }
}