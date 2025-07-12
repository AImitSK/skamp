// src/hooks/use-notifications.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { Notification, NotificationSettings } from '@/types/notifications';
import { Unsubscribe } from 'firebase/firestore';

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

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
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