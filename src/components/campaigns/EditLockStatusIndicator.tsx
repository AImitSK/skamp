// src/components/campaigns/EditLockStatusIndicator.tsx - 🆕 Kompakter Edit-Lock Status Indicator
'use client';

import React from 'react';
import clsx from 'clsx';
import { 
  ClockIcon, 
  UserGroupIcon, 
  CheckCircleIcon, 
  CogIcon, 
  LockClosedIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { 
  PRCampaign, 
  EDIT_LOCK_CONFIG 
} from '@/types/pr';

// Icon-Mapping für dynamische Icon-Anzeige
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  ClockIcon,
  UserGroupIcon, 
  CheckCircleIcon,
  CogIcon,
  LockClosedIcon
};

interface EditLockStatusIndicatorProps {
  campaign: PRCampaign;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  className?: string;
  variant?: 'default' | 'minimal' | 'badge';
}

/**
 * 🆕 ENHANCED EditLockStatusIndicator - Flexibler Status-Indikator
 * Features:
 * - Verschiedene Größen (sm, md, lg)
 * - Multiple Display-Varianten
 * - Performance-optimiert
 * - Vollständige Accessibility
 * - Responsive Design
 */
export function EditLockStatusIndicator({
  campaign,
  size = 'md',
  showLabel = true,
  showIcon = true,
  className = "",
  variant = 'default'
}: EditLockStatusIndicatorProps) {
  
  // Bestimme Lock-Status und Config
  const isLocked = campaign.editLocked === true;
  const lockReason = campaign.editLockedReason;
  
  if (!isLocked && variant === 'minimal') {
    return null; // Minimal-Variante zeigt nur Locks an
  }
  
  const config = lockReason ? EDIT_LOCK_CONFIG[lockReason] : null;
  
  // Size-Classes für verschiedene Größen
  const sizeClasses = {
    sm: {
      icon: "h-3 w-3",
      text: "text-xs",
      badge: "text-xs px-1.5 py-0.5",
      spacing: "gap-1"
    },
    md: {
      icon: "h-4 w-4",
      text: "text-sm",
      badge: "text-xs px-2 py-1",
      spacing: "gap-1.5"
    },
    lg: {
      icon: "h-5 w-5",
      text: "text-base",
      badge: "text-sm px-2.5 py-1.5",
      spacing: "gap-2"
    }
  };
  
  const currentSizeClasses = sizeClasses[size];

  // Badge-Variante
  if (variant === 'badge') {
    if (!isLocked || !config) {
      return (
        <Badge 
          color="green" 
          className={clsx(currentSizeClasses.badge, className)}
          data-testid="edit-lock-badge"
        >
          <PencilIcon className={clsx(currentSizeClasses.icon, "mr-1")} />
          Bearbeitbar
        </Badge>
      );
    }

    return (
      <Badge 
        color={config.color} 
        className={clsx(currentSizeClasses.badge, className)}
        data-testid="edit-lock-badge"
      >
        {showIcon && (
          <LockClosedIcon className={clsx(currentSizeClasses.icon, "mr-1")} />
        )}
        {config.label}
      </Badge>
    );
  }

  // Default & Minimal-Varianten
  if (!isLocked || !config) {
    // Unlocked State
    if (variant === 'minimal') return null;
    
    return (
      <div 
        className={clsx(
          "inline-flex items-center", 
          currentSizeClasses.spacing, 
          className
        )}
        data-testid="edit-lock-status"
        title="Kampagne ist bearbeitbar"
      >
        {showIcon && (
          <PencilIcon className={clsx(
            currentSizeClasses.icon,
            "text-green-500"
          )} />
        )}
        
        {showLabel && (
          <span className={clsx(
            currentSizeClasses.text,
            "font-medium text-green-700"
          )}>
            Bearbeitbar
          </span>
        )}
      </div>
    );
  }

  // Locked State
  const IconComponent = ICON_MAP[config.icon] || LockClosedIcon;

  return (
    <div 
      className={clsx(
        "inline-flex items-center", 
        currentSizeClasses.spacing, 
        className
      )}
      data-testid="edit-lock-status"
      title={`${config.label}: ${config.description}`}
      role="status"
      aria-label={`Kampagne Status: ${config.label}`}
    >
      {showIcon && (
        <IconComponent className={clsx(
          currentSizeClasses.icon,
          config.color === 'red' && "text-red-500",
          config.color === 'yellow' && "text-yellow-500",
          config.color === 'blue' && "text-blue-500",
          config.color === 'green' && "text-green-500",
          config.color === 'gray' && "text-gray-500"
        )} />
      )}
      
      {showLabel && (
        <span className={clsx(
          currentSizeClasses.text,
          "font-medium",
          config.color === 'red' && "text-red-700",
          config.color === 'yellow' && "text-yellow-700",
          config.color === 'blue' && "text-blue-700",
          config.color === 'green' && "text-green-700",
          config.color === 'gray' && "text-gray-700"
        )}>
          {config.label}
        </span>
      )}

      {/* 🆕 Severity-Indikator für kritische Locks */}
      {config.severity === 'critical' && size !== 'sm' && (
        <div className={clsx(
          "w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1",
          size === 'lg' && "w-3 h-3"
        )} 
        aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * 🆕 UTILITY-KOMPONENTE: Schnelle Lock-Status Anzeige für Listen
 */
export function QuickLockStatus({ campaign }: { campaign: PRCampaign }) {
  if (!campaign.editLocked) return null;
  
  return (
    <EditLockStatusIndicator
      campaign={campaign}
      size="sm"
      showLabel={false}
      variant="minimal"
      className="ml-2"
    />
  );
}

/**
 * 🆕 UTILITY-KOMPONENTE: Detaillierte Status-Card für Dashboard
 */
export function DetailedLockStatus({ campaign }: { campaign: PRCampaign }) {
  const isLocked = campaign.editLocked === true;
  const config = campaign.editLockedReason ? EDIT_LOCK_CONFIG[campaign.editLockedReason] : null;
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <EditLockStatusIndicator
        campaign={campaign}
        size="md"
        showLabel={true}
        showIcon={true}
        variant="default"
      />
      
      <div className="text-xs text-gray-500">
        {isLocked && config && (
          <span>Severity: {config.severity}</span>
        )}
        {!isLocked && (
          <span>Bearbeitungen erlaubt</span>
        )}
      </div>
    </div>
  );
}

export default EditLockStatusIndicator;