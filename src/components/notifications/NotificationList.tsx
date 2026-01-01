// src/components/notifications/NotificationList.tsx
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '@/hooks/use-notifications';
import {
  BellSlashIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export function NotificationList() {
  const t = useTranslations('dashboard.notifications');
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount
  } = useNotifications();

  const [markingAll, setMarkingAll] = useState(false);
  const [showMarkAllSuccess, setShowMarkAllSuccess] = useState(false);

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setShowMarkAllSuccess(true);
      setTimeout(() => setShowMarkAllSuccess(false), 3000);
    } catch (err) {
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center">
            <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-2 text-gray-500">{t('list.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 m-4">
        <div className="flex">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {t('list.errorTitle')}
            </h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <BellSlashIcon className="h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {t('list.emptyTitle')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('list.emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with mark all as read button */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-600">
            {t('list.unreadCount', { count: unreadCount })}
          </span>
          <div className="flex items-center gap-2">
            {showMarkAllSuccess && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckIcon className="h-4 w-4" />
                {t('list.markAllSuccess')}
              </span>
            )}
            <Button
              plain
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
              className="text-sm whitespace-nowrap"
            >
              {markingAll ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('list.marking')}
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {t('list.markAllAsRead')}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      </div>

      {/* Load more button (for future pagination) */}
      {notifications.length >= 50 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Button
            plain
            className="w-full text-sm"
            onClick={() => {
              // TODO: Implement pagination
            }}
          >
            {t('list.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}