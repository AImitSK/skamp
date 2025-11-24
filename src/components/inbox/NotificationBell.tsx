// src/components/inbox/NotificationBell.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { notificationService, NotificationData } from '@/lib/email/notification-service-enhanced';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import clsx from 'clsx';
import {
  BellIcon,
  UserIcon,
  AtSymbolIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FireIcon,
  EnvelopeIcon,
  ClockIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import format from 'date-fns/format';
import { de } from 'date-fns/locale/de';

interface NotificationBellProps {
  onNotificationClick?: (notification: NotificationData) => void;
}

export function NotificationBell({ onNotificationClick }: NotificationBellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && currentOrganization) {
      initializeNotifications();
    }
  }, [user, currentOrganization]);

  const initializeNotifications = async () => {
    if (!user || !currentOrganization) return;

    try {
      // Initialize notification service
      await notificationService.initialize(user.uid, currentOrganization.id);
      
      // Get initial unread count
      const count = await notificationService.getUnreadCount(user.uid, currentOrganization.id);
      setUnreadCount(count);
      
      // Listen for new notifications
      const handleNewNotification = (event: CustomEvent) => {
        const notification = event.detail as NotificationData;
        setNotifications(prev => [notification, ...prev.slice(0, 19)]); // Keep last 20
        setUnreadCount(prev => prev + 1);
      };

      window.addEventListener('newNotification', handleNewNotification as EventListener);
      
      setLoading(false);
      
      return () => {
        window.removeEventListener('newNotification', handleNewNotification as EventListener);
      };
    } catch (error) {      
      console.error('Error initializing notifications:', error);
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'assignment':
        return UserIcon;
      case 'mention':
        return AtSymbolIcon;
      case 'status_change':
        return CheckCircleIcon;
      case 'new_message':
        return EnvelopeIcon;
      case 'sla_alert':
        return ClockIcon;
      case 'escalation':
        return ArrowTrendingUpIcon;
      default:
        return BellIcon;
    }
  };

  const getNotificationColor = (type: NotificationData['type'], priority: NotificationData['priority']) => {
    if (priority === 'urgent') return 'text-red-600';
    if (priority === 'high') return 'text-orange-600';
    
    switch (type) {
      case 'assignment':
        return 'text-blue-600';
      case 'mention':
        return 'text-purple-600';
      case 'status_change':
        return 'text-green-600';
      case 'new_message':
        return 'text-gray-600';
      case 'sla_alert':
        return 'text-red-600';
      case 'escalation':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleNotificationClick = async (notification: NotificationData) => {
    // Mark as read
    if (!notification.isRead && notification.id) {
      await notificationService.markAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );
    }

    // Navigate to inbox for mention notifications
    if (notification.type === 'TEAM_CHAT_MENTION' && notification.metadata?.threadId) {
      console.log('📧 Navigating to inbox with threadId:', notification.metadata.threadId);

      const targetUrl = `/dashboard/communication/inbox?threadId=${notification.metadata.threadId}&openNotes=true`;

      // Wenn wir schon auf der Inbox-Seite sind, force refresh
      if (window.location.pathname === '/dashboard/communication/inbox') {
        console.log('📧 Already on inbox, using window.location to force refresh');
        window.location.href = targetUrl;
      } else {
        // Öffne Inbox mit richtigem Thread und Notizen-Panel geöffnet
        router.push(targetUrl);
      }
      return;
    }

    // Call parent handler for other notifications
    onNotificationClick?.(notification);
  };

  const handleMarkAllAsRead = async () => {
    if (!user || !currentOrganization) return;

    try {
      await notificationService.markAllAsRead(user.uid, currentOrganization.id);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const formatNotificationTime = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      
      if (diffMins < 1) return 'gerade eben';
      if (diffMins < 60) return `vor ${diffMins}m`;
      if (diffHours < 24) return `vor ${diffHours}h`;
      
      return format(date, 'dd.MM. HH:mm');
    } catch (error) {
      return '';
    }
  };

  if (loading) {
    return (
      <Button plain className="p-2">
        <BellIcon className="h-5 w-5 text-gray-400" />
      </Button>
    );
  }

  return (
    <Dropdown>
      <DropdownButton plain className="relative p-2">
        <BellIcon className={clsx(
          "h-5 w-5",
          unreadCount > 0 ? "text-[#005fab]" : "text-gray-400"
        )} />
        {unreadCount > 0 && (
          <Badge 
            color="red" 
            className="absolute -top-1 -right-1 text-xs min-w-[1.25rem] h-5 flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </DropdownButton>
      
      <DropdownMenu anchor="bottom end" className="w-96">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              Benachrichtigungen
            </h3>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#005fab] hover:text-[#004a8c]"
                plain
              >
                Alle als gelesen markieren
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <BellIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Keine Benachrichtigungen
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                const colorClass = getNotificationColor(notification.type, notification.priority);
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={clsx(
                      "px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors",
                      !notification.isRead && "bg-blue-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        notification.priority === 'urgent' ? "bg-red-100" :
                        notification.priority === 'high' ? "bg-orange-100" :
                        "bg-gray-100"
                      )}>
                        <Icon className={clsx("h-4 w-4", colorClass)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={clsx(
                            "text-sm font-medium truncate",
                            !notification.isRead ? "text-gray-900" : "text-gray-600"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                          
                          {notification.priority === 'urgent' && (
                            <Badge color="red" className="text-xs">
                              <FireIcon className="h-3 w-3 mr-1" />
                              Dringend
                            </Badge>
                          )}
                          
                          {notification.priority === 'high' && (
                            <Badge color="orange" className="text-xs">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              Hoch
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200">
            <Button
              className="w-full text-center text-sm text-[#005fab] hover:text-[#004a8c]"
              plain
            >
              Alle Benachrichtigungen anzeigen
            </Button>
          </div>
        )}
      </DropdownMenu>
    </Dropdown>
  );
}