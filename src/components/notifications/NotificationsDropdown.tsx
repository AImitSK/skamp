// src/components/notifications/NotificationsDropdown.tsx
"use client";

import { useState, useMemo } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { 
  Dropdown, 
  DropdownButton, 
  DropdownMenu, 
  DropdownItem,
  DropdownDivider,
  DropdownSection,
  DropdownHeading
} from '@/components/ui/dropdown';
import { NavbarItem } from '@/components/navbar';
import { 
  BellIcon, 
  CheckIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Notification } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale';

interface NotificationsDropdownProps {
  className?: string;
}

export function NotificationsDropdown({ className }: NotificationsDropdownProps) {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead,
    deleteNotification 
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  // Zeige nur die letzten 8 Benachrichtigungen im Dropdown
  const recentNotifications = useMemo(() => {
    return notifications.slice(0, 8);
  }, [notifications]);

  const formatNotificationTime = (notification: Notification) => {
    try {
      const date = notification.createdAt.toDate();
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: de 
      });
    } catch {
      return 'Kürzlich';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'APPROVAL_GRANTED':
        return '✅';
      case 'CHANGES_REQUESTED':
        return '📝';
      case 'OVERDUE_APPROVAL':
        return '⏰';
      case 'EMAIL_SENT_SUCCESS':
        return '📧';
      case 'EMAIL_BOUNCED':
        return '⚠️';
      case 'TASK_OVERDUE':
        return '🔔';
      case 'MEDIA_FIRST_ACCESS':
      case 'MEDIA_DOWNLOADED':
        return '📸';
      case 'MEDIA_LINK_EXPIRED':
        return '🔗';
      default:
        return '🔔';
    }
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    // No navigation - dropdown is for quick actions only
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDeleteNotification = async (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteNotification(notification.id);
  };

  return (
    <Dropdown>
      <DropdownButton 
        as={NavbarItem} 
        aria-label="Benachrichtigungen" 
        className={`relative !border-transparent ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <BellIcon className="size-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white min-w-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownButton>
      
      <DropdownMenu anchor="bottom end" className="w-80 max-h-96 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Benachrichtigungen
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#005fab] hover:text-[#004a8c] font-medium flex items-center gap-1"
              >
                <CheckIcon className="h-3 w-3" />
                Alle als gelesen
              </button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {unreadCount} neue Benachrichtigung{unreadCount !== 1 ? 'en' : ''}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005fab] mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Laden...</p>
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <BellIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Keine Benachrichtigungen</p>
            </div>
          ) : (
            <div className="py-1">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 ${
                    notification.isRead 
                      ? 'border-transparent bg-white' 
                      : 'border-[#005fab] bg-blue-50'
                  }`}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Icon & Content */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          notification.isRead ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </p>
                        <p className={`text-xs mt-1 line-clamp-2 ${
                          notification.isRead ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <ClockIcon className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatNotificationTime(notification)}
                          </span>
                          {!notification.isRead && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Neu
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-[#005fab] transition-colors"
                          title="Als gelesen markieren"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(notification, e)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Löschen"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {recentNotifications.length > 0 && (
          <>
            <DropdownDivider />
            <div className="px-4 py-3 bg-gray-50">
              <a
                href="/dashboard/communication/notifications"
                className="block w-full text-center text-sm text-[#005fab] hover:text-[#004a8c] font-medium"
              >
                Alle Benachrichtigungen anzeigen
                {notifications.length > 8 && (
                  <span className="ml-1 text-gray-500">
                    ({notifications.length - 8} weitere)
                  </span>
                )}
              </a>
            </div>
          </>
        )}
      </DropdownMenu>
    </Dropdown>
  );
}