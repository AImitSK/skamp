// src/components/notifications/NotificationItem.tsx

import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { 
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  ClockIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Notification, NOTIFICATION_COLORS } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const iconMap = {
  APPROVAL_GRANTED: CheckCircleIcon,
  CHANGES_REQUESTED: ExclamationCircleIcon,
  FIRST_VIEW: EyeIcon,
  OVERDUE_APPROVAL: ClockIcon,
  EMAIL_SENT_SUCCESS: EnvelopeIcon,
  EMAIL_BOUNCED: ExclamationTriangleIcon,
  TASK_OVERDUE: CalendarDaysIcon,
  MEDIA_FIRST_ACCESS: EyeIcon,
  MEDIA_DOWNLOADED: ArrowDownTrayIcon,
  MEDIA_LINK_EXPIRED: LinkIcon
};

// Helper function to format relative time in German
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  const intervals = [
    { label: 'Jahr', seconds: 31536000 },
    { label: 'Monat', seconds: 2592000 },
    { label: 'Woche', seconds: 604800 },
    { label: 'Tag', seconds: 86400 },
    { label: 'Stunde', seconds: 3600 },
    { label: 'Minute', seconds: 60 },
    { label: 'Sekunde', seconds: 1 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count > 0) {
      const plural = count === 1 ? '' : (interval.label === 'Monat' ? 'en' : 'n');
      return `vor ${count} ${interval.label}${plural}`;
    }
  }
  
  return 'gerade eben';
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const router = useRouter();
  const Icon = iconMap[notification.type];
  const colorClasses = NOTIFICATION_COLORS[notification.type];
  
  // Format timestamp
  const timeAgo = formatRelativeTime(notification.createdAt.toDate());

  const handleClick = async (e: React.MouseEvent) => {
    // Verhindere Navigation wenn Delete-Button geklickt wurde
    if ((e.target as HTMLElement).closest('.delete-button')) {
      return;
    }

    // Mark as read if not already
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    // Navigate to linked content if available
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'relative flex gap-x-4 px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer',
        'border-b border-gray-100 last:border-b-0',
        !notification.isRead && 'bg-blue-50/30'
      )}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-600" />
      )}

      {/* Icon */}
      <div className={clsx(
        'relative mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full',
        colorClasses
      )}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-x-4">
          <div className="min-w-0 flex-1">
            <p className={clsx(
              'text-sm font-medium text-gray-900',
              !notification.isRead && 'font-semibold'
            )}>
              {notification.title}
            </p>
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {notification.message}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <time className="flex-none text-xs text-gray-500 whitespace-nowrap">
              {timeAgo}
            </time>
            <button
              onClick={handleDelete}
              className="delete-button p-1 rounded hover:bg-gray-100 transition-colors group"
              aria-label="Benachrichtigung löschen"
            >
              <TrashIcon className="h-4 w-4 text-gray-400 group-hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Additional metadata */}
        {notification.metadata && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
            {notification.metadata.clientName && (
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-600">
                {notification.metadata.clientName}
              </span>
            )}
            {notification.metadata.recipientCount && (
              <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 font-medium text-blue-700">
                {notification.metadata.recipientCount} Empfänger
              </span>
            )}
            {notification.metadata.daysOverdue && (
              <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 font-medium text-red-700">
                {notification.metadata.daysOverdue} Tage überfällig
              </span>
            )}
          </div>
        )}
      </div>

      {/* Link indicator */}
      {notification.linkUrl && (
        <div className="flex-none self-center">
          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}