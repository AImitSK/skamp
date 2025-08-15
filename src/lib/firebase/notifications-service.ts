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
  deleteDoc,
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
import { NotificationCreatePayload, NotificationBulkActionPayload } from '@/types/communication-notifications-enhanced';

const NOTIFICATIONS_COLLECTION = 'notifications';
const NOTIFICATION_SETTINGS_COLLECTION = 'notification_settings';

interface ServiceContext {
  userId: string;
  organizationId?: string;
}

class NotificationsService {
  // ========== CRUD Operations ==========
  
  /**
   * Create a new notification (with validation)
   * This is the ONLY way notifications should be created
   */
  async create(notification: CreateNotificationInput): Promise<string> {
    try {
      // Additional validation before creating
      if (!notification.userId || !notification.type || !notification.title || !notification.message) {
        throw new Error('Missing required fields');
      }

      // Validate notification context
      if (!this.validateNotificationContext(notification.type, notification.metadata)) {
        throw new Error(`Invalid context for notification type: ${notification.type}`);
      }

      const docRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
      const notificationData: Notification = {
        ...notification,
        id: docRef.id,
        isRead: false,
        createdAt: serverTimestamp() as Timestamp,
      };
      
      await setDoc(docRef, notificationData);
      
      // Log for monitoring
      
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all notifications for a user with organization support
   */
  async getAll(userId: string, limitCount: number = 50, organizationId?: string): Promise<Notification[]> {
    try {
      console.log('🔥 DEBUG - getAll with userId:', userId);
      console.log('🔥 DEBUG - getAll with organizationId:', organizationId);
      
      // DEBUG: Let's see what notifications exist in the collection
      const allNotificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      try {
        const allSnapshot = await getDocs(allNotificationsQuery);
        console.log('🔥 DEBUG - Sample notifications in collection:');
        allSnapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`🔥 DEBUG - Sample ${index + 1}:`, {
            id: doc.id,
            userId: data.userId,
            organizationId: data.organizationId,
            title: data.title,
            createdAt: data.createdAt?.toDate?.() || data.createdAt
          });
        });
      } catch (debugError) {
        console.log('🔥 DEBUG - Could not fetch sample notifications:', debugError);
      }
      
      if (organizationId) {
        // First get organization-specific notifications
        const orgQuery = query(
          collection(db, NOTIFICATIONS_COLLECTION),
          where('userId', '==', userId),
          where('organizationId', '==', organizationId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        
        const orgSnapshot = await getDocs(orgQuery);
        let notifications = orgSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        
        console.log('🔥 DEBUG - Found', notifications.length, 'organization-specific notifications');
        
        // If we have fewer than 10 notifications, also include legacy notifications
        if (notifications.length < 10) {
          console.log('🔥 DEBUG - Adding legacy notifications as fallback');
          
          const legacyQuery = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
          
          const legacySnapshot = await getDocs(legacyQuery);
          const legacyNotifications = legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
          
          // Filter out notifications that already have organizationId to avoid duplicates
          const filteredLegacy = legacyNotifications.filter(n => !n.organizationId);
          
          console.log('🔥 DEBUG - Found', filteredLegacy.length, 'legacy notifications');
          
          // Combine and sort by creation date
          notifications = [...notifications, ...filteredLegacy]
            .sort((a, b) => {
              const aTime = a.createdAt ? (a.createdAt as any).toDate?.() || new Date(a.createdAt) : new Date(0);
              const bTime = b.createdAt ? (b.createdAt as any).toDate?.() || new Date(b.createdAt) : new Date(0);
              return bTime.getTime() - aTime.getTime();
            })
            .slice(0, limitCount);
            
          console.log('🔥 DEBUG - Total notifications after merge:', notifications.length);
        }
        
        return notifications;
      } else {
        // Fallback to userId-only query when no organizationId
        const q = query(
          collection(db, NOTIFICATIONS_COLLECTION),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        console.log('🔥 DEBUG - Fallback: Found', notifications.length, 'userId-only notifications');
        return notifications;
      }
    } catch (error) {
      console.log('🔥 DEBUG - getAll error, falling back to userId-only');
      // Fallback to userId-only query for legacy compatibility
      if (organizationId) {
        return this.getAll(userId, limitCount);
      }
      throw error;
    }
  }

  /**
   * Get unread notification count for a user with organization support
   */
  async getUnreadCount(userId: string, organizationId?: string): Promise<number> {
    try {
      let q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      // Add organization filter if provided
      if (organizationId) {
        q = query(
          collection(db, NOTIFICATIONS_COLLECTION),
          where('userId', '==', userId),
          where('organizationId', '==', organizationId),
          where('isRead', '==', false)
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      // Fallback to userId-only query for legacy compatibility
      if (organizationId) {
        return this.getUnreadCount(userId);
      }
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
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  }
  async markAllAsRead(userId: string, organizationId?: string): Promise<void> {
    try {
      let q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      // Add organization filter if provided
      if (organizationId) {
        q = query(
          collection(db, NOTIFICATIONS_COLLECTION),
          where('userId', '==', userId),
          where('organizationId', '==', organizationId),
          where('isRead', '==', false)
        );
      }
      
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
      // Fallback for legacy compatibility
      if (organizationId) {
        return this.markAllAsRead(userId);
      }
      throw error;
    }
  }

  /**
   * Bulk mark notifications as read
   */
  async bulkMarkAsRead(notificationIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      notificationIds.forEach(id => {
        const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
        batch.update(docRef, {
          isRead: true,
          readAt: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk delete notifications
   */
  async bulkDelete(notificationIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      notificationIds.forEach(id => {
        const docRef = doc(db, NOTIFICATIONS_COLLECTION, id);
        batch.delete(docRef);
      });
      
      await batch.commit();
    } catch (error) {
      throw error;
    }
  }

  // ========== Settings Operations ==========
  
  /**
   * Get notification settings for a user with organization support
   */
  async getSettings(userId: string, organizationId?: string): Promise<NotificationSettings> {
    try {
      // Try organization-specific settings first
      if (organizationId) {
        const orgDocRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, `${organizationId}_${userId}`);
        const orgDocSnap = await getDoc(orgDocRef);
        
        if (orgDocSnap.exists()) {
          return { id: orgDocSnap.id, ...orgDocSnap.data() } as NotificationSettings;
        }
      }

      // Fallback to user-specific settings
      const docRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as NotificationSettings;
      } else {
        // Create default settings
        const defaultSettings: NotificationSettings = {
          id: organizationId ? `${organizationId}_${userId}` : userId,
          userId,
          ...(organizationId && { organizationId }),  // Nur hinzufügen wenn nicht undefined
          ...DEFAULT_NOTIFICATION_SETTINGS,
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp
        };
        
        const targetRef = organizationId ? 
          doc(db, NOTIFICATION_SETTINGS_COLLECTION, `${organizationId}_${userId}`) :
          docRef;
        
        await setDoc(targetRef, defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update notification settings for a user with organization support
   */
  async updateSettings(userId: string, settings: Partial<NotificationSettings>, organizationId?: string): Promise<void> {
    try {
      const settingsId = organizationId ? `${organizationId}_${userId}` : userId;
      const docRef = doc(db, NOTIFICATION_SETTINGS_COLLECTION, settingsId);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  }

  // ========== Trigger Methods ==========
  
  // Private method to validate notification creation context
  private validateNotificationContext(type: NotificationType, metadata: any): boolean {
    switch (type) {
      case 'APPROVAL_GRANTED':
      case 'CHANGES_REQUESTED':
        return metadata?.campaignId && metadata?.senderName;
      
      case 'EMAIL_SENT_SUCCESS':
      case 'EMAIL_BOUNCED':
        return metadata?.campaignId;
        
      case 'MEDIA_FIRST_ACCESS':
      case 'MEDIA_DOWNLOADED':
        return metadata?.mediaAssetName;
        
      case 'OVERDUE_APPROVAL':
      case 'TASK_OVERDUE':
      case 'MEDIA_LINK_EXPIRED':
        // System-generated, always valid in service context
        return true;
        
      default:
        return false;
    }
  }
  private async isNotificationEnabled(userId: string, type: NotificationType, organizationId?: string): Promise<boolean> {
    const settings = await this.getSettings(userId, organizationId);
    
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
    userId: string,
    organizationId?: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'APPROVAL_GRANTED', organizationId)) return;
    
    const notification: CreateNotificationInput = {
      userId,
      organizationId,
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
    userId: string,
    organizationId?: string
  ): Promise<void> {
    if (!await this.isNotificationEnabled(userId, 'MEDIA_DOWNLOADED', organizationId)) return;
    
    const notification: CreateNotificationInput = {
      userId,
      organizationId,
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
    callback: (notifications: Notification[]) => void,
    organizationId?: string
  ): Unsubscribe {
    console.log('🔥 DEBUG - subscribeToNotifications with organizationId:', organizationId);
    
    // Smart fallback strategy for legacy compatibility
    if (organizationId) {
      // First try organization-specific notifications
      const orgQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      return onSnapshot(orgQuery, async (orgSnapshot) => {
        let notifications = orgSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notification));
        
        console.log('🔥 DEBUG - Found', notifications.length, 'organization-specific notifications');
        
        // If we have fewer than 10 notifications, also include legacy notifications
        if (notifications.length < 10) {
          console.log('🔥 DEBUG - Adding legacy notifications as fallback');
          
          const legacyQuery = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(50 - notifications.length)
          );
          
          try {
            const legacySnapshot = await getDocs(legacyQuery);
            const legacyNotifications = legacySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Notification));
            
            // Filter out notifications that already have organizationId to avoid duplicates
            const filteredLegacy = legacyNotifications.filter(n => !n.organizationId);
            
            console.log('🔥 DEBUG - Found', filteredLegacy.length, 'legacy notifications');
            
            // Combine and sort by creation date
            notifications = [...notifications, ...filteredLegacy]
              .sort((a, b) => {
                const aTime = a.createdAt ? (a.createdAt as any).toDate?.() || new Date(a.createdAt) : new Date(0);
                const bTime = b.createdAt ? (b.createdAt as any).toDate?.() || new Date(b.createdAt) : new Date(0);
                return bTime.getTime() - aTime.getTime();
              })
              .slice(0, 50);
              
            console.log('🔥 DEBUG - Total notifications after merge:', notifications.length);
          } catch (error) {
            console.log('🔥 DEBUG - Legacy query failed, using only org notifications');
          }
        }
        
        callback(notifications);
      });
    } else {
      // Fallback to userId-only query when no organizationId
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
        console.log('🔥 DEBUG - Fallback: Found', notifications.length, 'userId-only notifications');
        callback(notifications);
      });
    }
    
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
    callback: (count: number) => void,
    organizationId?: string
  ): Unsubscribe {
    console.log('🔥 DEBUG - subscribeToUnreadCount with organizationId:', organizationId);
    
    if (organizationId) {
      // Count organization-specific unread notifications
      const orgQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('organizationId', '==', organizationId),
        where('isRead', '==', false)
      );
      
      return onSnapshot(orgQuery, async (orgSnapshot) => {
        let totalCount = orgSnapshot.size;
        console.log('🔥 DEBUG - Organization unread count:', totalCount);
        
        // Also count legacy unread notifications without organizationId
        try {
          const legacyQuery = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            where('isRead', '==', false)
          );
          
          const legacySnapshot = await getDocs(legacyQuery);
          // Filter out those that already have organizationId to avoid double counting
          const legacyCount = legacySnapshot.docs.filter(doc => !doc.data().organizationId).length;
          console.log('🔥 DEBUG - Legacy unread count:', legacyCount);
          
          totalCount += legacyCount;
          console.log('🔥 DEBUG - Total unread count:', totalCount);
        } catch (error) {
          console.log('🔥 DEBUG - Legacy unread count query failed');
        }
        
        callback(totalCount);
      });
    } else {
      // Fallback to userId-only query when no organizationId
      const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );
      
      return onSnapshot(q, (snapshot) => {
        console.log('🔥 DEBUG - Fallback unread count:', snapshot.size);
        callback(snapshot.size);
      });
    }
    
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  }
}

// Export singleton instance
export const notificationsService = new NotificationsService();