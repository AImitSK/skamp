// src/components/inbox/StatusManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { EmailThread } from '@/types/inbox-enhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { threadMatcherService } from '@/lib/email/thread-matcher-service';
import clsx from 'clsx';
import { 
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArchiveBoxIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface StatusManagerProps {
  thread: EmailThread;
  onStatusChange?: (threadId: string, status: ThreadStatus, priority?: ThreadPriority) => void;
  compact?: boolean;
  showSLA?: boolean;
  showTimers?: boolean;
}

type ThreadStatus = 'active' | 'waiting' | 'resolved' | 'archived';
type ThreadPriority = 'low' | 'normal' | 'high' | 'urgent';

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

interface PriorityConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  bgClass: string;
  textClass: string;
  description: string;
}

const STATUS_CONFIG: Record<ThreadStatus, StatusConfig> = {
  active: {
    label: 'Aktiv',
    icon: ExclamationCircleIcon,
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    description: 'Thread wird aktiv bearbeitet'
  },
  waiting: {
    label: 'Wartet',
    icon: ClockIcon,
    color: 'yellow',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-200',
    description: 'Warten auf Kundenantwort oder externe Aktion'
  },
  resolved: {
    label: 'Erledigt',
    icon: CheckCircleIcon,
    color: 'green',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    description: 'Thread ist abgeschlossen'
  },
  archived: {
    label: 'Archiviert',
    icon: ArchiveBoxIcon,
    color: 'gray',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200',
    description: 'Thread ist archiviert und nicht mehr aktiv'
  }
};

const PRIORITY_CONFIG: Record<ThreadPriority, PriorityConfig> = {
  low: {
    label: 'Niedrig',
    icon: ChartBarIcon,
    color: 'gray',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-600',
    description: 'Niedrige Priorität, kann später bearbeitet werden'
  },
  normal: {
    label: 'Normal',
    icon: ChartBarIcon,
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
    description: 'Normale Priorität'
  },
  high: {
    label: 'Hoch',
    icon: ExclamationTriangleIcon,
    color: 'orange',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-600',
    description: 'Hohe Priorität, zeitnah bearbeiten'
  },
  urgent: {
    label: 'Dringend',
    icon: FireIcon,
    color: 'red',
    bgClass: 'bg-red-50',
    textClass: 'text-red-600',
    description: 'Dringend! Sofort bearbeiten'
  }
};

export function StatusManager({ 
  thread, 
  onStatusChange,
  compact = false,
  showSLA = true,
  showTimers = true
}: StatusManagerProps) {
  const [updating, setUpdating] = useState(false);
  const [slaInfo, setSlaInfo] = useState<{
    responseTime?: number;
    targetResponseTime: number;
    isOverdue: boolean;
    resolutionTime?: number;
    targetResolutionTime: number;
  } | null>(null);

  useEffect(() => {
    if (showSLA) {
      calculateSLA();
    }
  }, [thread, showSLA]);

  const calculateSLA = () => {
    const now = new Date();
    const createdAt = thread.createdAt?.toDate?.() || new Date();
    const lastMessageAt = thread.lastMessageAt?.toDate?.() || createdAt;
    
    // Calculate response time (hours since last message)
    const responseTime = Math.floor((now.getTime() - lastMessageAt.getTime()) / (1000 * 60 * 60));
    
    // SLA targets (could be configurable per customer/priority)
    const priority = (thread as any).priority || 'normal';
    const targetResponseTime = priority === 'urgent' ? 1 : priority === 'high' ? 4 : priority === 'normal' ? 24 : 48;
    const targetResolutionTime = priority === 'urgent' ? 4 : priority === 'high' ? 24 : priority === 'normal' ? 72 : 168;
    
    const isOverdue = responseTime > targetResponseTime && thread.status !== 'resolved' && thread.status !== 'archived';
    
    // Calculate resolution time if resolved
    let resolutionTime;
    if (thread.status === 'resolved') {
      // Use current time as resolved time since resolvedAt doesn't exist in type
      const resolvedAt = new Date();
      resolutionTime = Math.floor((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
    }
    
    setSlaInfo({
      responseTime,
      targetResponseTime,
      isOverdue,
      resolutionTime,
      targetResolutionTime
    });
  };

  const handleStatusChange = async (status: ThreadStatus) => {
    if (updating) return;
    
    try {
      setUpdating(true);
      
      await threadMatcherService.updateThreadStatus(thread.id!, status);
      onStatusChange?.(thread.id!, status);
      
      console.log('✅ Thread status updated successfully');
    } catch (error) {
      console.error('Error updating thread status:', error);
      alert('Fehler beim Ändern des Status');
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (priority: ThreadPriority) => {
    if (updating) return;
    
    try {
      setUpdating(true);
      
      await threadMatcherService.updateThreadPriority(thread.id!, priority);
      onStatusChange?.(thread.id!, thread.status as ThreadStatus, priority);
      
      console.log('✅ Thread priority updated successfully');
    } catch (error) {
      console.error('Error updating thread priority:', error);
      alert('Fehler beim Ändern der Priorität');
    } finally {
      setUpdating(false);
    }
  };

  const currentStatus = (thread.status as ThreadStatus) || 'active';
  const currentPriority = ((thread as any).priority as ThreadPriority) || 'normal';
  const statusInfo = STATUS_CONFIG[currentStatus];
  const priorityInfo = PRIORITY_CONFIG[currentPriority];

  // Compact view for EmailList
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Badge 
          color={statusInfo.color as any}
          className={clsx(
            'flex items-center gap-1 text-xs',
            statusInfo.bgClass,
            statusInfo.textClass
          )}
        >
          <statusInfo.icon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
        
        {currentPriority !== 'normal' && (
          <Badge 
            color={priorityInfo.color as any}
            className={clsx(
              'flex items-center gap-1 text-xs',
              priorityInfo.bgClass,
              priorityInfo.textClass
            )}
          >
            <priorityInfo.icon className="h-3 w-3" />
          </Badge>
        )}
        
        {slaInfo && (
          <Badge 
            color={slaInfo.isOverdue ? "red" : "green"} 
            className={clsx("text-xs", slaInfo.isOverdue && "animate-pulse")}
          >
            {slaInfo.isOverdue ? "Überfällig" : `${slaInfo.responseTime}h/${slaInfo.targetResponseTime}h`}
          </Badge>
        )}
      </div>
    );
  }

  // Full view for EmailViewer
  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <ChartBarIcon className="h-4 w-4" />
          Status & Priorität
        </h4>
        {updating && (
          <ArrowPathIcon className="h-4 w-4 animate-spin text-blue-600" />
        )}
      </div>

      {/* Current Status & Priority */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
          <Dropdown>
            <DropdownButton 
              className={clsx(
                'w-full justify-between border',
                statusInfo.bgClass,
                statusInfo.textClass,
                statusInfo.borderClass
              )}
              disabled={updating}
            >
              <div className="flex items-center gap-2">
                <statusInfo.icon className="h-4 w-4" />
                {statusInfo.label}
              </div>
            </DropdownButton>
            <DropdownMenu>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const Icon = config.icon;
                const isActive = currentStatus === status;
                
                return (
                  <DropdownItem 
                    key={status}
                    onClick={() => handleStatusChange(status as ThreadStatus)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <span className="block text-sm">{config.label}</span>
                          <span className="block text-xs text-gray-500">
                            {config.description}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </Dropdown>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Priorität</label>
          <Dropdown>
            <DropdownButton 
              className={clsx(
                'w-full justify-between border',
                priorityInfo.bgClass,
                priorityInfo.textClass
              )}
              disabled={updating}
            >
              <div className="flex items-center gap-2">
                <priorityInfo.icon className="h-4 w-4" />
                {priorityInfo.label}
              </div>
            </DropdownButton>
            <DropdownMenu>
              {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => {
                const Icon = config.icon;
                const isActive = currentPriority === priority;
                
                return (
                  <DropdownItem 
                    key={priority}
                    onClick={() => handlePriorityChange(priority as ThreadPriority)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <span className="block text-sm">{config.label}</span>
                          <span className="block text-xs text-gray-500">
                            {config.description}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* SLA Information */}
      {showSLA && slaInfo && (
        <div className="bg-white border rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">SLA-Status</span>
            {slaInfo.isOverdue && (
              <Badge color="red" className="text-xs animate-pulse">
                Überfällig
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block text-gray-500">Antwortzeit</span>
              <span className={clsx(
                "block font-medium",
                slaInfo.isOverdue ? "text-red-600" : "text-gray-900"
              )}>
                {slaInfo.responseTime}h / {slaInfo.targetResponseTime}h
              </span>
            </div>
            
            {slaInfo.resolutionTime && (
              <div>
                <span className="block text-gray-500">Lösungszeit</span>
                <span className={clsx(
                  "block font-medium",
                  slaInfo.resolutionTime > slaInfo.targetResolutionTime ? "text-red-600" : "text-green-600"
                )}>
                  {slaInfo.resolutionTime}h / {slaInfo.targetResolutionTime}h
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        {currentStatus === 'active' && (
          <Button
            onClick={() => handleStatusChange('waiting')}
            disabled={updating}
            className="flex-1 bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200"
          >
            <PauseIcon className="h-4 w-4 mr-1" />
            Warten
          </Button>
        )}
        
        {(currentStatus === 'active' || currentStatus === 'waiting') && (
          <Button
            onClick={() => handleStatusChange('resolved')}
            disabled={updating}
            className="flex-1 bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
          >
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Erledigen
          </Button>
        )}
        
        {currentStatus === 'waiting' && (
          <Button
            onClick={() => handleStatusChange('active')}
            disabled={updating}
            className="flex-1 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
          >
            <PlayIcon className="h-4 w-4 mr-1" />
            Fortsetzen
          </Button>
        )}
      </div>
    </div>
  );
}