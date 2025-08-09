// src/lib/email/notification-service-enhanced.ts
"use client";

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';
import { EmailThread, EmailMessage } from '@/types/inbox-enhanced';
import { TeamMember } from '@/types/international';

export interface NotificationData {
  id?: string;
  type: 'assignment' | 'mention' | 'status_change' | 'new_message' | 'sla_alert' | 'escalation';
  title: string;
  message: string;
  threadId: string;
  emailId?: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  organizationId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: Timestamp;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  organizationId: string;
  emailNotifications: boolean;
  browserNotifications: boolean;
  slackNotifications: boolean;
  assignmentAlerts: boolean;
  mentionAlerts: boolean;
  slaAlerts: boolean;
  escalationAlerts: boolean;
  digestFrequency: 'none' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
  };
}

class NotificationServiceEnhanced {
  private unsubscribe: (() => void) | null = null;
  private currentUserId: string | null = null;
  private notificationPermission: NotificationPermission = 'default';

  constructor() {
    this.checkBrowserNotificationPermission();
  }

  /**
   * Initialize notification service for user
   */
  async initialize(userId: string, organizationId: string): Promise<void> {
    this.currentUserId = userId;
    
    // Request browser notification permission if needed
    await this.requestBrowserNotificationPermission();
    
    // Set up real-time notification listener
    this.setupRealtimeListener(userId, organizationId);
  }

  /**
   * Send assignment notification
   */
  async sendAssignmentNotification(
    thread: EmailThread,
    assignedToUserId: string,
    assignedByUserId: string,
    assignedByUserName: string,
    organizationId: string
  ): Promise<void> {
    const notification: Omit<NotificationData, 'id'> = {
      type: 'assignment',
      title: 'Thread zugewiesen',
      message: `${assignedByUserName} hat Ihnen einen Thread zugewiesen: "${thread.subject}"`,
      threadId: thread.id!,
      fromUserId: assignedByUserId,
      fromUserName: assignedByUserName,
      toUserId: assignedToUserId,
      organizationId,
      priority: (thread as any).priority || 'normal',
      isRead: false,
      createdAt: serverTimestamp() as Timestamp,
      metadata: {
        threadSubject: thread.subject,
        assignedBy: assignedByUserName
      }
    };

    await this.createNotification(notification);
    
    // Send browser notification if enabled
    if (assignedToUserId === this.currentUserId) {
      await this.showBrowserNotification(
        notification.title,
        notification.message,
        'assignment'
      );
    }
  }

  /**
   * Send mention notification
   */
  async sendMentionNotification(
    threadId: string,
    emailId: string | undefined,
    mentionedUserIds: string[],
    mentionedByUserId: string,
    mentionedByUserName: string,
    organizationId: string,
    content: string
  ): Promise<void> {
    for (const userId of mentionedUserIds) {
      const notification: Omit<NotificationData, 'id'> = {
        type: 'mention',
        title: 'Sie wurden erwähnt',
        message: `${mentionedByUserName} hat Sie in einer Notiz erwähnt`,
        threadId,
        emailId,
        fromUserId: mentionedByUserId,
        fromUserName: mentionedByUserName,
        toUserId: userId,
        organizationId,
        priority: 'normal',
        isRead: false,
        createdAt: serverTimestamp() as Timestamp,
        metadata: {
          content: content.substring(0, 200),
          mentionedBy: mentionedByUserName
        }
      };

      await this.createNotification(notification);
      
      // Send browser notification if this is the current user
      if (userId === this.currentUserId) {
        await this.showBrowserNotification(
          notification.title,
          notification.message,
          'mention'
        );
      }
    }
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(
    thread: EmailThread,
    newStatus: string,
    changedByUserId: string,
    changedByUserName: string,
    organizationId: string
  ): Promise<void> {
    // Notify assigned user if different from changer
    const assignedTo = (thread as any).assignedTo;
    if (assignedTo && assignedTo !== changedByUserId) {
      const statusLabels: Record<string, string> = {
        'active': 'Aktiv',
        'waiting': 'Wartet',
        'resolved': 'Erledigt',
        'archived': 'Archiviert'
      };

      const notification: Omit<NotificationData, 'id'> = {
        type: 'status_change',
        title: 'Thread-Status geändert',
        message: `${changedByUserName} hat den Status auf "${statusLabels[newStatus] || newStatus}" geändert: "${thread.subject}"`,
        threadId: thread.id!,
        fromUserId: changedByUserId,
        fromUserName: changedByUserName,
        toUserId: assignedTo,
        organizationId,
        priority: 'normal',
        isRead: false,
        createdAt: serverTimestamp() as Timestamp,
        metadata: {
          oldStatus: thread.status,
          newStatus,
          threadSubject: thread.subject
        }
      };

      await this.createNotification(notification);
    }
  }

  /**
   * Send new message notification
   */
  async sendNewMessageNotification(
    thread: EmailThread,
    message: EmailMessage,
    organizationId: string,
    teamMembers: TeamMember[]
  ): Promise<void> {
    // Notify assigned user and team members
    const assignedTo = (thread as any).assignedTo;
    const notifyUsers = new Set<string>();
    
    if (assignedTo) {
      notifyUsers.add(assignedTo);
    }
    
    // Also notify recent participants
    teamMembers.forEach(member => {
      if (member.userId !== message.userId) {
        notifyUsers.add(member.userId);
      }
    });

    for (const userId of notifyUsers) {
      const notification: Omit<NotificationData, 'id'> = {
        type: 'new_message',
        title: 'Neue E-Mail',
        message: `Neue Nachricht von ${message.from.name || message.from.email}: "${thread.subject}"`,
        threadId: thread.id!,
        emailId: message.id,
        fromUserId: message.userId || 'system',
        fromUserName: message.from.name || message.from.email,
        toUserId: userId,
        organizationId,
        priority: (thread as any).priority || 'normal',
        isRead: false,
        createdAt: serverTimestamp() as Timestamp,
        metadata: {
          senderEmail: message.from.email,
          threadSubject: thread.subject,
          snippet: message.snippet || message.textContent?.substring(0, 100)
        }
      };

      await this.createNotification(notification);
    }
  }

  /**
   * Send SLA alert notification
   */
  async sendSLAAlert(
    thread: EmailThread,
    alertType: 'response_overdue' | 'resolution_overdue',
    organizationId: string
  ): Promise<void> {
    const assignedTo = (thread as any).assignedTo;
    if (!assignedTo) return;

    const alertMessages = {
      'response_overdue': 'Antwortzeit überschritten',
      'resolution_overdue': 'Lösungszeit überschritten'
    };

    const notification: Omit<NotificationData, 'id'> = {
      type: 'sla_alert',
      title: 'SLA-Warnung',
      message: `${alertMessages[alertType]}: "${thread.subject}"`,
      threadId: thread.id!,
      fromUserId: 'system',
      fromUserName: 'System',
      toUserId: assignedTo,
      organizationId,
      priority: 'urgent',
      isRead: false,
      createdAt: serverTimestamp() as Timestamp,
      metadata: {
        alertType,
        threadSubject: thread.subject
      }
    };

    await this.createNotification(notification);
    
    // Always show browser notification for SLA alerts
    if (assignedTo === this.currentUserId) {
      await this.showBrowserNotification(
        notification.title,
        notification.message,
        'urgent'
      );
    }
  }

  /**
   * Send escalation notification
   */
  async sendEscalationNotification(
    thread: EmailThread,
    escalatedToUserId: string,
    escalatedByUserId: string,
    escalatedByUserName: string,
    organizationId: string,
    reason: string
  ): Promise<void> {
    const notification: Omit<NotificationData, 'id'> = {
      type: 'escalation',
      title: 'Thread eskaliert',
      message: `${escalatedByUserName} hat einen Thread an Sie eskaliert: "${thread.subject}"`,
      threadId: thread.id!,
      fromUserId: escalatedByUserId,
      fromUserName: escalatedByUserName,
      toUserId: escalatedToUserId,
      organizationId,
      priority: 'high',
      isRead: false,
      createdAt: serverTimestamp() as Timestamp,
      metadata: {
        reason,
        threadSubject: thread.subject,
        escalatedBy: escalatedByUserName
      }
    };

    await this.createNotification(notification);
  }

  /**
   * Create notification in database
   */
  private async createNotification(notification: Omit<NotificationData, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), notification);
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string, organizationId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('toUserId', '==', userId),
        where('organizationId', '==', organizationId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const promises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          isRead: true,
          readAt: serverTimestamp()
        })
      );
      
      await Promise.all(promises);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, organizationId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('toUserId', '==', userId),
        where('organizationId', '==', organizationId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Set up real-time listener for notifications
   */
  private setupRealtimeListener(userId: string, organizationId: string): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('organizationId', '==', organizationId),
      where('isRead', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as NotificationData;
          this.handleNewNotification(notification);
        }
      });
    });
  }

  /**
   * Handle new notification
   */
  private handleNewNotification(notification: NotificationData): void {
    // Show browser notification if permission granted
    if (this.notificationPermission === 'granted') {
      this.showBrowserNotification(
        notification.title,
        notification.message,
        notification.type
      );
    }

    // Emit custom event for UI components
    window.dispatchEvent(new CustomEvent('newNotification', {
      detail: notification
    }));
  }

  /**
   * Request browser notification permission
   */
  private async requestBrowserNotificationPermission(): Promise<void> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
    }
  }

  /**
   * Check current browser notification permission
   */
  private checkBrowserNotificationPermission(): void {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(
    title: string,
    body: string,
    type: string
  ): Promise<void> {
    if (this.notificationPermission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `inbox-${type}`,
        requireInteraction: type === 'urgent' || type === 'escalation'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds (unless requireInteraction is true)
      if (!notification.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

// Singleton export
export const notificationService = new NotificationServiceEnhanced();