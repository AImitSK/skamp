// src/components/calendar/EventHoverCard.tsx
import { CalendarEvent, EVENT_COLORS, EVENT_ICONS } from '@/types/calendar';
import { 
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface EventHoverCardProps {
  event: CalendarEvent;
  isVisible: boolean;
  position: { x: number; y: number };
}

export function EventHoverCard({ event, isVisible, position }: EventHoverCardProps) {
  if (!isVisible) return null;

  const getStatusText = () => {
    switch (event.type) {
      case 'campaign_scheduled':
        return 'Geplanter Versand';
      case 'campaign_sent':
        return 'Erfolgreich versendet';
      case 'approval_pending':
        return 'Warte auf Freigabe';
      case 'approval_overdue':
        return `${event.metadata?.daysOverdue || 0} Tage überfällig`;
      default:
        return event.status || '';
    }
  };

  const getPriorityColor = () => {
    if (event.priority === 'urgent' || event.type === 'approval_overdue') {
      return 'border-red-500 shadow-red-100';
    }
    if (event.priority === 'high') {
      return 'border-orange-500 shadow-orange-100';
    }
    return 'border-gray-200 shadow-gray-100';
  };

  return (
    <div 
      className={clsx(
        "absolute z-50 bg-white rounded-lg shadow-lg border-2 p-4 w-80",
        "transition-all duration-200 ease-out",
        "pointer-events-none",
        getPriorityColor()
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)'
      }}
    >
      {/* Arrow pointing down */}
      <div 
        className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-4 h-4 bg-white border-r-2 border-b-2 border-gray-200 rotate-45"
      />
      
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: EVENT_COLORS[event.type] + '20' }}
        >
          <span className="text-xl">{EVENT_ICONS[event.type]}</span>
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">
            {event.title}
          </h4>
          <p className="text-xs mt-1" style={{ color: EVENT_COLORS[event.type] }}>
            {getStatusText()}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs">
        {/* Datum & Zeit */}
        <div className="flex items-center gap-2 text-gray-600">
          <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            {event.date.toLocaleDateString('de-DE', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
            {event.allDay ? ' (Ganztägig)' : ` um ${event.date.toLocaleTimeString('de-DE', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}`}
          </span>
        </div>

        {/* Kunde */}
        {event.metadata?.clientName && (
          <div className="flex items-center gap-2 text-gray-600">
            <BuildingOfficeIcon className="h-4 w-4 flex-shrink-0" />
            <span>{event.metadata.clientName}</span>
          </div>
        )}

        {/* Empfänger */}
        {event.metadata?.recipientCount && event.metadata.recipientCount > 0 && (
          <div className="flex items-center gap-2 text-gray-600">
            <UserGroupIcon className="h-4 w-4 flex-shrink-0" />
            <span>{event.metadata.recipientCount} Empfänger</span>
          </div>
        )}

        {/* Überfällig-Warnung */}
        {event.metadata?.daysOverdue && event.metadata.daysOverdue > 0 && (
          <div className="flex items-center gap-2 text-red-600 font-medium">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
            <span>Aktion erforderlich!</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Klicken für Details →
        </p>
      </div>
    </div>
  );
}