// src/components/campaigns/EditLockBanner.tsx - 🆕 Enhanced Edit-Lock Banner Komponente
'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { 
  ClockIcon, 
  UserGroupIcon, 
  CheckCircleIcon, 
  CogIcon, 
  LockClosedIcon,
  KeyIcon,
  ArrowPathIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { 
  PRCampaign, 
  EditLockReason, 
  EDIT_LOCK_CONFIG, 
  UnlockRequest 
} from '@/types/pr';

// Icon-Mapping für dynamische Icon-Anzeige
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  ClockIcon,
  UserGroupIcon, 
  CheckCircleIcon,
  CogIcon,
  LockClosedIcon
};

interface EditLockBannerProps {
  campaign: PRCampaign;
  onRequestUnlock?: (reason: string) => Promise<void>;
  onRetry?: () => Promise<void>;
  className?: string;
  showDetails?: boolean;
}

/**
 * 🆕 ENHANCED EditLockBanner - Vollständig integrierte Lock-Status Anzeige
 * Features:
 * - Intelligente Status-basierte Anzeige
 * - Unlock-Request System mit Modal
 * - Performance-optimierte Rendering
 * - Vollständige Accessibility-Unterstützung
 */
export function EditLockBanner({ 
  campaign, 
  onRequestUnlock, 
  onRetry,
  className = "",
  showDetails = true
}: EditLockBannerProps) {
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Früher Return wenn kein Edit-Lock aktiv
  if (!campaign.editLocked || !campaign.editLockedReason) {
    return null;
  }
  
  const config = EDIT_LOCK_CONFIG[campaign.editLockedReason];
  const IconComponent = ICON_MAP[config.icon] || LockClosedIcon;
  
  const handleUnlockRequest = async () => {
    if (!unlockReason.trim() || !onRequestUnlock) return;
    
    setIsSubmitting(true);
    try {
      await onRequestUnlock(unlockReason.trim());
      setShowUnlockModal(false);
      setUnlockReason('');
    } catch (error) {
      console.error('Fehler beim Unlock-Request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unbekannt';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('de-DE');
  };

  const getPendingUnlockRequest = (): UnlockRequest | undefined => {
    return campaign.unlockRequests?.find(req => req.status === 'pending');
  };

  const pendingRequest = getPendingUnlockRequest();

  return (
    <>
      <div 
        className={clsx(
          "rounded-lg border p-4 mb-6 transition-all duration-200",
          config.color === 'red' && "bg-red-50 border-red-200",
          config.color === 'yellow' && "bg-yellow-50 border-yellow-200", 
          config.color === 'blue' && "bg-blue-50 border-blue-200",
          config.color === 'green' && "bg-green-50 border-green-200",
          config.color === 'zinc' && "bg-gray-50 border-gray-200",
          className
        )}
        data-testid="edit-lock-banner"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <IconComponent className={clsx(
              "h-5 w-5 mt-0.5 flex-shrink-0",
              config.color === 'red' && "text-red-600",
              config.color === 'yellow' && "text-yellow-600",
              config.color === 'blue' && "text-blue-600", 
              config.color === 'green' && "text-green-600",
              config.color === 'zinc' && "text-gray-600"
            )} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className={clsx(
                  "font-medium text-sm",
                  config.color === 'red' && "text-red-900",
                  config.color === 'yellow' && "text-yellow-900",
                  config.color === 'blue' && "text-blue-900",
                  config.color === 'green' && "text-green-900", 
                  config.color === 'zinc' && "text-gray-900"
                )}>
                  Bearbeitung gesperrt - {config.label}
                </h4>
                
                <Badge 
                  color={config.color} 
                  className="text-xs uppercase font-bold"
                >
                  {config.severity}
                </Badge>
              </div>
              
              <p className={clsx(
                "text-sm mb-3",
                config.color === 'red' && "text-red-700",
                config.color === 'yellow' && "text-yellow-700",
                config.color === 'blue' && "text-blue-700",
                config.color === 'green' && "text-green-700",
                config.color === 'zinc' && "text-gray-700"
              )}>
                {config.description}
              </p>
              
              {/* 🆕 Lock-Details (optional anzeigbar) */}
              {showDetails && campaign.lockedBy && (
                <div className="text-xs space-y-1 mb-3 p-3 bg-white/50 rounded border border-dashed">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      Gesperrt von: <strong>{campaign.lockedBy.displayName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      Aktion: <strong>{campaign.lockedBy.action}</strong>
                    </span>
                  </div>
                  {campaign.lockedAt && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        Gesperrt am: <strong>{formatDate(campaign.lockedAt)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* 🆕 Pending Unlock Request Display */}
              {pendingRequest && (
                <div className="mt-3 p-3 bg-white rounded border border-dashed border-orange-300">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <Text className="font-medium text-sm text-orange-900">
                      Unlock-Anfrage eingereicht
                    </Text>
                  </div>
                  <Text className="text-xs text-orange-700 mb-1">
                    &ldquo;{pendingRequest.reason}&rdquo;
                  </Text>
                  <Text className="text-xs text-orange-600">
                    Eingereicht am {formatDate(pendingRequest.requestedAt)}
                  </Text>
                </div>
              )}
            </div>
          </div>
          
          {/* 🆕 Actions */}
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {onRetry && config.severity === 'low' && (
              <Button
                plain
                onClick={onRetry}
                className="whitespace-nowrap text-sm"
                aria-label="Status erneut prüfen"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Status prüfen
              </Button>
            )}
            
            {config.canRequestUnlock && !pendingRequest && onRequestUnlock && (
              <Button
                onClick={() => setShowUnlockModal(true)}
                className={clsx(
                  "whitespace-nowrap transition-colors text-sm",
                  config.color === 'red' && "bg-red-600 hover:bg-red-700 text-white",
                  config.color === 'yellow' && "bg-yellow-600 hover:bg-yellow-700 text-white",
                  config.color === 'blue' && "bg-blue-600 hover:bg-blue-700 text-white",
                  config.color === 'green' && "bg-green-600 hover:bg-green-700 text-white",
                  config.color === 'zinc' && "bg-gray-600 hover:bg-gray-700 text-white"
                )}
                data-testid="request-unlock-button"
                aria-label="Entsperrung anfragen"
              >
                <KeyIcon className="h-4 w-4 mr-1" />
                Entsperrung anfragen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 Unlock Request Modal */}
      <Dialog 
        open={showUnlockModal} 
        onClose={() => !isSubmitting && setShowUnlockModal(false)}
        className="relative z-50"
      >
        <DialogTitle>Entsperrung anfragen</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <Text className="text-sm text-gray-600">
              Bitte begründen Sie, warum diese Kampagne entsperrt werden soll:
            </Text>
            
            <Textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={4}
              placeholder="Grund für die Entsperrung..."
              className="w-full"
              autoFocus
              disabled={isSubmitting}
              data-testid="unlock-reason-input"
              aria-label="Grund für Entsperrung"
            />
            
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <Text className="text-sm text-amber-800 font-medium mb-1">
                    Hinweis
                  </Text>
                  <Text className="text-xs text-amber-700">
                    Ihre Anfrage wird an die zuständigen Administratoren weitergeleitet. 
                    Sie erhalten eine Benachrichtigung sobald über Ihre Anfrage entschieden wurde.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button 
            plain 
            onClick={() => setShowUnlockModal(false)}
            disabled={isSubmitting}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleUnlockRequest}
            disabled={!unlockReason.trim() || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="submit-unlock-request"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Wird gesendet...
              </>
            ) : (
              'Anfrage senden'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default EditLockBanner;