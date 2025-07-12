// src/lib/firebase/notifications-service.ts

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import {
  Notification,
  NotificationSettings,
  NotificationType,
  CreateNotificationInput,
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_TEMPLATES
} from '@/types/notifications';

const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATION_SETTINGS_COLLECTION = 'notification_settings';

class NotificationsService {
  // ========== CRUD Operations ==========
  
  /**
   * Create a new notification
   */
  async create(notification: CreateNotificationInput): Promise<string> {
    try {
      const docRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
      const notificationData: Notification = {
        ...notification,
        id: docRef.id,
        isRead: false,
        createdAt: serverTimestamp() as Timestamp,
      };
      
      await setDoc(docRef, notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getAll(userId: string, limitCount: number = 50): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(docRef, {
        isRead: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isRead: true,
          readAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // ========== Settings Operations ==========
  
  /**
   * Get notification settings for a user
   */
  async getSettings(userId: string): Promise<NotificationSettings> {
    try {
      const docRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as NotificationSettings;
      } else {
        // Create default settings if they don't exist
        const defaultSettings: NotificationSettings = {
          id: userId,
          userId,
          ...DEFAULT_NOTIFICATION_SETTINGS,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp
        };
        
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      throw error;
    }
  }

  /**
   * Update notification settings for a user
   */
  async updateSettings(userId: string, settings: Partial<NotificationSettings>): Promise<void> {
    try {
      const docRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, userId);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }

  // ========== Trigger Methods ==========
  
  /**
   * Check if a notification type is enabled for a user
   */
  private async isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const settings = await this.getSettings(userId);
    
    switch (type) {
      case 'APPROVAL_GRANTED':
        return settings.approvalGranted;
      case 'CHANGES_REQUESTED':
        return settings.changesRequested;
      case 'OVERDUE_APPROVAL':
        return settings.overdueApprovals;
      case 'EMAIL_SENT_SUCCESS':
        return settings.emailSentSuccess;
      case 'EMAIL_BOUNCED':
        return settings.emailBounced;
      case 'TASK_OVERDUE':
        return settings.taskOverdue;
      case 'MEDIA_FIRST_ACCESS':
        return settings.mediaFirstAccess;
      case 'MEDIA_DOWNLOADED':
        return settings.mediaDownloaded;
      case 'MEDIA_LINK_EXPIRED':
        return settings.mediaLinkExpired;
      default:
        return true;
    }
  }

  /**
   * Format notification message with template
   */
  private formatMessage(type: NotificationType, metadata: any): string {
    const template = NOTIFICATION_TEMPLATES[type];
    let message = template as string;
    
    // Replace placeholders with actual values
    Object.keys(metadata).forEach(key => {
      const placeholder = `{${key}}`;
      if (message.includes(placeholder)) {
        message = message.replace(placeholder, metadata[key]);
      }
    });
    
    return message;
  }

  /**
   * Notify when approval is granted
   */
  async notifyApprovalGranted(
    campaign: any,
    approverName: string,
    userId: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'APPROVAL_GRANTED')) return;
    
    const notification: CreateNotificationInput = {
      userId,
      type: 'APPROVAL_GRANTED',
      title: 'Freigabe erteilt',
      message: this.formatMessage('APPROVAL_GRANTED', {
        senderName: approverName,
        campaignTitle: campaign.title || campaign.name
      }),
      linkUrl: `/dashboard/pr-kampagnen/${campaign.id}`,
      linkType: 'campaign',
      linkId: campaign.id,
      isRead: false,
      metadata: {
        campaignId: campaign.id,
        campaignTitle: campaign.title || campaign.name,
        senderName: approverName
      }
    };
    
    await this.create(notification);
  }

  /**
   * Notify when changes are requested
   */
  async notifyChangesRequested(
    campaign: any,
    reviewerName: string,
    userId: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'CHANGES_REQUESTED')) return;
    
    const notification: CreateNotificationInput = {
      userId,
      type: 'CHANGES_REQUESTED',
      title: 'Änderungen erbeten',
      message: this.formatMessage('CHANGES_REQUESTED', {
        senderName: reviewerName,
        campaignTitle: campaign.title || campaign.name
      }),
      linkUrl: `/dashboard/pr-kampagnen/${campaign.id}`,
      linkType: 'campaign',
      linkId: campaign.id,
      isRead: false,
      metadata: {
        campaignId: campaign.id,
        campaignTitle: campaign.title || campaign.name,
        senderName: reviewerName
      }
    };
    
    await this.create(notification);
  }

  /**
   * Notify when email campaign is sent successfully
   */
  async notifyEmailSent(
    campaign: any,
    recipientCount: number,
    userId: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'EMAIL_SENT_SUCCESS')) return;
    
    const notification: CreateNotificationInput = {
      userId,
      type: 'EMAIL_SENT_SUCCESS',
      title: 'Kampagne versendet',
      message: this.formatMessage('EMAIL_SENT_SUCCESS', {
        campaignTitle: campaign.title || campaign.name,
        recipientCount
      }),
      linkUrl: `/dashboard/schedule-mails/${campaign.id}`,
      linkType: 'campaign',
      linkId: campaign.id,
      isRead: false,
      metadata: {
        campaignId: campaign.id,
        campaignTitle: campaign.title || campaign.name,
        recipientCount
      }
    };
    
    await this.create(notification);
  }

  /**
   * Notify when email bounces
   */
  async notifyEmailBounced(
    campaign: any,
    bouncedEmail: string,
    userId: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'EMAIL_BOUNCED')) return;
    
    const notification: CreateNotificationInput = {
      userId,
      type: 'EMAIL_BOUNCED',
      title: 'E-Mail Bounce',
      message: this.formatMessage('EMAIL_BOUNCED', {
        campaignTitle: campaign.title || campaign.name,
        bouncedEmail
      }),
      linkUrl: `/dashboard/schedule-mails/${campaign.id}`,
      linkType: 'campaign',
      linkId: campaign.id,
      isRead: false,
      metadata: {
        campaignId: campaign.id,
        campaignTitle: campaign.title || campaign.name,
        bouncedEmail
      }
    };
    
    await this.create(notification);
  }

  /**
   * Notify when shared media is accessed for the first time
   */
  async notifyMediaAccessed(
    shareLink: any,
    userId: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'MEDIA_FIRST_ACCESS')) return;
    
    const notification: CreateNotificationInput = {
      userId,
      type: 'MEDIA_FIRST_ACCESS',
      title: 'Link aufgerufen',
      message: this.formatMessage('MEDIA_FIRST_ACCESS', {
        mediaAssetName: shareLink.assetName || 'Unbekannte Datei'
      }),
      linkUrl: `/dashboard/mediencenter/shares/${shareLink.id}`,
      linkType: 'media',
      linkId: shareLink.id,
      isRead: false,
      metadata: {
        mediaAssetName: shareLink.assetName
      }
    };
    
    await this.create(notification);
  }

  /**
   * Notify when shared media is downloaded
   */
  async notifyMediaDownloaded(
    shareLink: any,
    assetName: string,
    userId: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'MEDIA_DOWNLOADED')) return;
    
    const notification: CreateNotificationInput = {
      userId,
      type: 'MEDIA_DOWNLOADED',
      title: 'Datei heruntergeladen',
      message: this.formatMessage('MEDIA_DOWNLOADED', {
        mediaAssetName: assetName
      }),
      linkUrl: `/dashboard/mediencenter/shares/${shareLink.id}`,
      linkType: 'media',
      linkId: shareLink.id,
      isRead: false,
      metadata: {
        mediaAssetName: assetName
      }
    };
    
    await this.create(notification);
  }

  // ========== Real-time Subscriptions ==========
  
  /**
   * Subscribe to real-time notification updates
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    });
  }

  /**
   * Subscribe to unread count updates
   */
  subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
  ): Unsubscribe {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();