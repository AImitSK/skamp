// src/hooks/use-notifications.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { usePathname } from 'next/navigation';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { Notification, NotificationSettings } from '@/types/notifications';
import { UseNotificationsReturn, UseNotificationSettingsReturn } from '@/types/communication-notifications-enhanced';
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

// Removed - now imported from enhanced types

// Helper function für überfällige Checks
async function checkForOverdueItems(userId: string, settings: NotificationSettings | null, organizationId?: string) {
  if (!settings) return;
  
  const checks = [];
  
  // Nur prüfen wenn aktiviert
  if (settings.overdueApprovals) {
    checks.push(checkOverdueApprovals(userId, settings.overdueApprovalDays || 3, organizationId));
  }
  
  if (settings.taskOverdue) {
    checks.push(checkOverdueTasks(userId, organizationId));
  }
  
  if (checks.length > 0) {
    await Promise.all(checks);
  }
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const pathname = usePathname();
  const lastCheckRef = useRef<number>(0);
  const settingsRef = useRef<NotificationSettings | null>(null);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);
      const data = await notificationsService.getAll(user.uid, 50, currentOrganization?.id);
      setNotifications(data);
      setTotalCount(data.length);
      setHasMore(data.length === 50);
    } catch (err) {
      setError('Fehler beim Laden der Benachrichtigungen');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, currentOrganization?.id]);

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
      setError('Fehler beim Markieren der Benachrichtigung');
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await notificationsService.markAllAsRead(user.uid, currentOrganization?.id);
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError('Fehler beim Markieren aller Benachrichtigungen');
    }
  }, [user?.uid, currentOrganization?.id]);

  // Bulk mark as read
  const bulkMarkAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationsService.bulkMarkAsRead(notificationIds);
      
      // Optimistic update
      setNotifications(prev => 
        prev.map(n => 
          notificationIds.includes(n.id) 
            ? { ...n, isRead: true } 
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
    } catch (err) {
      setError('Fehler beim Markieren der Benachrichtigungen');
    }
  }, []);

  // Bulk delete
  const bulkDelete = useCallback(async (notificationIds: string[]) => {
    try {
      await notificationsService.bulkDelete(notificationIds);
      
      // Optimistic update
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      
      // Update counts
      const unreadDeletedCount = notifications.filter(n => 
        notificationIds.includes(n.id) && !n.isRead
      ).length;
      setUnreadCount(prev => Math.max(0, prev - unreadDeletedCount));
      setTotalCount(prev => prev - notificationIds.length);
    } catch (err) {
      setError('Fehler beim Löschen der Benachrichtigungen');
    }
  }, [notifications]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!user?.uid || !hasMore) return;

    try {
      const additionalData = await notificationsService.getAll(
        user.uid, 
        50, 
        currentOrganization?.id
      );
      
      if (additionalData.length > 0) {
        setNotifications(prev => [...prev, ...additionalData]);
        setHasMore(additionalData.length === 50);
        setTotalCount(prev => prev + additionalData.length);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError('Fehler beim Laden weiterer Benachrichtigungen');
    }
  }, [user?.uid, currentOrganization?.id, hasMore]);

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
      setError('Fehler beim Löschen der Benachrichtigung');
    }
  }, [notifications]);

  // Lade Settings einmalig
  useEffect(() => {
    if (!user?.uid) return;
    
    notificationsService.getSettings(user.uid).then(settings => {
      settingsRef.current = settings;
    }).catch(err => {
      // Settings load error - silent fail
    });
  }, [user?.uid]);

  // Check bei Route-Änderung
  useEffect(() => {
    if (!user?.uid) return;
    
    // Verhindere zu häufige Checks (max alle 5 Minuten)
    const now = Date.now();
    if (now - lastCheckRef.current < 5 * 60 * 1000) return;
    
    lastCheckRef.current = now;
    checkForOverdueItems(user.uid, settingsRef.current, currentOrganization?.id).catch(err => {
      // Overdue check error - silent fail
    });
  }, [pathname, user?.uid, currentOrganization?.id]);

  // Check wenn Tab aktiv wird
  useEffect(() => {
    if (!user?.uid) return;
    
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastCheckRef.current < 5 * 60 * 1000) return;
      
      lastCheckRef.current = now;
      checkForOverdueItems(user.uid, settingsRef.current, currentOrganization?.id).catch(err => {
        // Overdue check on focus error - silent fail
      });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.uid, currentOrganization?.id]);

  useEffect(() => {
    if (!user?.uid) return;

    let unsubscribeNotifications: Unsubscribe | null = null;
    let unsubscribeCount: Unsubscribe | null = null;

    // Subscribe to notifications with organizationId for multi-tenancy
    console.log('🔥 DEBUG - Subscribing to notifications with organizationId:', currentOrganization?.id);
    unsubscribeNotifications = notificationsService.subscribeToNotifications(
      user.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      },
      currentOrganization?.id
    );

    // Subscribe to unread count with organizationId for multi-tenancy
    unsubscribeCount = notificationsService.subscribeToUnreadCount(
      user.uid,
      (count) => {
        setUnreadCount(count);
      },
      currentOrganization?.id
    );

    // Initial load
    loadNotifications();

    // Cleanup
    return () => {
      if (unsubscribeNotifications) unsubscribeNotifications();
      if (unsubscribeCount) unsubscribeCount();
    };
  }, [user?.uid, currentOrganization?.id, loadNotifications]);

  return {
    notifications,
    unreadCount,
    totalCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
    loadMore,
    bulkMarkAsRead,
    bulkDelete,
    filterByType: () => {}, // TODO: Implement filtering
    filterByRead: () => {}, // TODO: Implement filtering  
    currentFilter: { type: null, read: null, dateFrom: null, dateTo: null, searchTerm: '' }
  };
}

// Hook for notification settings  
export function useNotificationSettings(): UseNotificationSettingsReturn {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings
  useEffect(() => {
    if (!user?.uid) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await notificationsService.getSettings(user.uid, currentOrganization?.id);
        setSettings(data);
      } catch (err) {
        setError('Fehler beim Laden der Einstellungen');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.uid, currentOrganization?.id]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
    if (!user?.uid) return;

    try {
      setIsSaving(true);
      setError(null);
      await notificationsService.updateSettings(user.uid, updates, currentOrganization?.id);
      
      // Optimistic update
      setSettings(prev => prev ? { ...prev, ...updates } : null);
      setHasChanges(false);
    } catch (err) {
      setError('Fehler beim Speichern der Einstellungen');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [user?.uid, currentOrganization?.id]);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    if (!user?.uid) return;
    
    // TODO: Implement reset to defaults
  }, [user?.uid]);

  // Validate settings
  const validateSettings = useCallback((settings: Partial<NotificationSettings>) => {
    // TODO: Implement validation
    return { isValid: true, errors: [], warnings: [] };
  }, []);

  // Preview notification  
  const previewNotification = useCallback((type: any) => {
    // TODO: Implement preview
    return {
      type,
      title: 'Beispiel',
      message: 'Dies ist eine Beispiel-Benachrichtigung',
      icon: () => null,
      color: 'blue',
      sampleData: {}
    };
  }, []);

  return {
    settings,
    loading,
    error,
    isSaving,
    hasChanges,
    updateSettings,
    resetToDefaults,
    validateSettings,
    previewNotification
  };
}

// Helper functions für überfällige Checks
async function checkOverdueApprovals(userId: string, overdueDays: number, organizationId?: string) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - overdueDays);

  // Use organizationId for multi-tenancy if available
  const whereField = organizationId ? 'organizationId' : 'userId';
  const whereValue = organizationId || userId;
  console.log('🔥 DEBUG - checkOverdueApprovals using', whereField, ':', whereValue);

  const campaignsQuery = query(
    collection(db, 'pr_campaigns'),
    where(whereField, '==', whereValue),
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
        organizationId: organizationId,
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

async function checkOverdueTasks(userId: string, organizationId?: string) {
  const now = Timestamp.now();
  
  // Use organizationId for multi-tenancy if available
  const whereField = organizationId ? 'organizationId' : 'userId';
  const whereValue = organizationId || userId;
  console.log('🔥 DEBUG - checkOverdueTasks using', whereField, ':', whereValue);
  
  const tasksQuery = query(
    collection(db, 'tasks'),
    where(whereField, '==', whereValue),
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
        organizationId: organizationId,
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