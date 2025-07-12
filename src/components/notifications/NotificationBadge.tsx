// src/components/notifications/NotificationBadge.tsx

import { useNotifications } from '@/hooks/use-notifications';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface NotificationBadgeProps {
  className?: string;
  iconOnly?: boolean;
  onClick?: () => void;
}

export function NotificationBadge({ 
  className, 
  iconOnly = false,
  onClick 
}: NotificationBadgeProps) {
  const { unreadCount } = useNotifications();
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative inline-flex items-center gap-2 rounded-lg px-3 py-2',
        'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
        'transition-colors duration-150 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2',
        className
      )}
      aria-label={`Benachrichtigungen ${hasUnread ? `(${unreadCount} ungelesen)` : ''}`}
    >
      <div className="relative">
        {hasUnread ? (
          <BellIconSolid className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </div>
      
      {!iconOnly && (
        <span className="hidden sm:inline-block font-medium">
          Benachrichtigungen
        </span>
      )}
    </button>
  );
}