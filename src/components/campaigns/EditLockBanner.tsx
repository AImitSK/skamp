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
import { useTranslations } from 'next-intl';
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
  onGrantApproval?: (reason: string) => Promise<void>;
  onRequestChanges?: (reason: string) => Promise<void>;
  onRequestUnlock?: (reason: string) => Promise<void>;
  onRetry?: () => Promise<void>;
  className?: string;
  showDetails?: boolean;
}

/**
 * 🆕 ENHANCED EditLockBanner - Vollständig integrierte Lock-Status Anzeige
 * Features:
 * - Intelligente Status-basierte Anzeige
 * - Manuelle Freigabe-Erteilung mit Begründung
 * - Performance-optimierte Rendering
 * - Vollständige Accessibility-Unterstützung
 */
export function EditLockBanner({
  campaign,
  onGrantApproval,
  onRequestChanges,
  onRequestUnlock,
  onRetry,
  className = "",
  showDetails = true
}: EditLockBannerProps) {
  const t = useTranslations('campaigns.editLock');
  const tCommon = useTranslations('common');

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [changesReason, setChangesReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Früher Return wenn kein Edit-Lock aktiv
  if (!campaign.editLocked || !campaign.editLockedReason) {
    return null;
  }

  const config = EDIT_LOCK_CONFIG[campaign.editLockedReason];
  const IconComponent = ICON_MAP[config.icon] || LockClosedIcon;

  const handleGrantApproval = async () => {
    if (!approvalReason.trim() || !onGrantApproval) return;

    setIsSubmitting(true);
    try {
      await onGrantApproval(approvalReason.trim());
      setShowApprovalModal(false);
      setApprovalReason('');
    } catch (error) {
      console.error(t('error.approvalGrantError'), error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changesReason.trim() || !onRequestChanges) return;

    setIsSubmitting(true);
    try {
      await onRequestChanges(changesReason.trim());
      setShowChangesModal(false);
      setChangesReason('');
    } catch (error) {
      console.error(t('error.changesRequestError'), error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return tCommon('unknown');
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('de-DE');
  };

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
                  {t('banner.title', { label: config.label })}
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
                      {t.rich('banner.lockedBy', {
                        name: campaign.lockedBy.displayName,
                        strong: (chunks) => <strong>{chunks}</strong>
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {t.rich('banner.action', {
                        action: campaign.lockedBy.action,
                        strong: (chunks) => <strong>{chunks}</strong>
                      })}
                    </span>
                  </div>
                  {campaign.lockedAt && (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {t.rich('banner.lockedAt', {
                          date: formatDate(campaign.lockedAt),
                          strong: (chunks) => <strong>{chunks}</strong>
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 🆕 Actions */}
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {onRequestChanges && (
              <Button
                onClick={() => setShowChangesModal(true)}
                className="whitespace-nowrap transition-colors text-sm bg-yellow-600 hover:bg-yellow-700 text-white"
                data-testid="request-changes-button"
                aria-label={t('actions.requestChanges')}
              >
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                {t('actions.requestChanges')}
              </Button>
            )}
            {onGrantApproval && (
              <Button
                onClick={() => setShowApprovalModal(true)}
                className="whitespace-nowrap transition-colors text-sm bg-yellow-600 hover:bg-yellow-700 text-white"
                data-testid="grant-approval-button"
                aria-label={t('actions.grantApproval')}
              >
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                {t('actions.grantApproval')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 🆕 Request Changes Modal */}
      <Dialog
        open={showChangesModal}
        onClose={() => !isSubmitting && setShowChangesModal(false)}
        className="relative z-50"
      >
        <DialogTitle>{t('modal.changes.title')}</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <Text className="text-sm text-gray-600">
              {t('modal.changes.description')}
            </Text>

            <Textarea
              value={changesReason}
              onChange={(e) => setChangesReason(e.target.value)}
              rows={4}
              placeholder={t('modal.changes.placeholder')}
              className="w-full"
              autoFocus
              disabled={isSubmitting}
              data-testid="changes-reason-input"
              aria-label={t('modal.changesReason.ariaLabel')}
            />

            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <Text className="text-sm text-amber-800 font-medium mb-1">
                    {t('modal.changes.hint.title')}
                  </Text>
                  <Text className="text-xs text-amber-700">
                    {t('modal.changes.hint.text')}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            plain
            onClick={() => setShowChangesModal(false)}
            disabled={isSubmitting}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleRequestChanges}
            disabled={!changesReason.trim() || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="submit-changes"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('modal.changes.submitting')}
              </>
            ) : (
              t('modal.changes.submit')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Manual Approval Modal */}
      <Dialog
        open={showApprovalModal}
        onClose={() => !isSubmitting && setShowApprovalModal(false)}
        className="relative z-50"
      >
        <DialogTitle>{t('modal.approval.title')}</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            <Text className="text-sm text-gray-600">
              {t('modal.approval.description')}
            </Text>

            <Textarea
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              rows={4}
              placeholder={t('modal.approval.placeholder')}
              className="w-full"
              autoFocus
              disabled={isSubmitting}
              data-testid="approval-reason-input"
              aria-label={t('modal.approvalReason.ariaLabel')}
            />

            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <Text className="text-sm text-green-800 font-medium mb-1">
                    {t('modal.approval.hint.title')}
                  </Text>
                  <Text className="text-xs text-green-700">
                    {t('modal.approval.hint.text')}
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            plain
            onClick={() => setShowApprovalModal(false)}
            disabled={isSubmitting}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleGrantApproval}
            disabled={!approvalReason.trim() || isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="submit-approval"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('modal.approval.submitting')}
              </>
            ) : (
              t('modal.approval.submit')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default EditLockBanner;