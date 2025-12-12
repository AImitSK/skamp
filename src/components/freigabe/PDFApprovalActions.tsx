// src/components/freigabe/PDFApprovalActions.tsx - Moderne PDF-Approval-Aktionen für Customer-Freigabe
"use client";

import { useState, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import { PDFVersion } from '@/lib/firebase/pdf-versions-service';
import {
  CheckIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import clsx from 'clsx';

interface PDFApprovalActionsProps {
  version: PDFVersion;
  currentStatus: 'pending' | 'viewed' | 'commented' | 'approved';
  onApprove: () => Promise<void>;
  onRequestChanges: (feedback: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

interface ApprovalButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant: 'approve' | 'changes';
}

function ApprovalButton({ onClick, disabled, loading, children, variant }: ApprovalButtonProps) {
  const baseClasses = "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    approve: "bg-[#005fab] hover:bg-[#004a8c] text-white focus:ring-[#005fab] disabled:bg-gray-300 disabled:text-gray-500",
    changes: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(baseClasses, variants[variant])}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
      ) : null}
      {children}
    </button>
  );
}

export default memo(function PDFApprovalActions({
  version,
  currentStatus,
  onApprove,
  onRequestChanges,
  disabled = false,
  className = ""
}: PDFApprovalActionsProps) {
  const t = useTranslations('freigabe.approval');

  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Prüfe ob Aktionen verfügbar sind
  const isApproved = currentStatus === 'approved';
  const isCompleted = isApproved;
  const canTakeAction = !isCompleted && !disabled;
  
  const handleApprove = useCallback(async () => {
    if (!canTakeAction || submitting) return;

    try {
      setSubmitting(true);
      await onApprove();
    } catch (error) {
      console.error(t('errors.approveError'), error);
    } finally {
      setSubmitting(false);
    }
  }, [canTakeAction, submitting, onApprove, t]);
  
  const handleRequestChanges = useCallback(async () => {
    if (!canTakeAction || !feedbackText.trim() || submitting) return;

    try {
      setSubmitting(true);
      await onRequestChanges(feedbackText.trim());
      setFeedbackText('');
      setShowFeedbackForm(false);
    } catch (error) {
      console.error(t('errors.feedbackError'), error);
    } finally {
      setSubmitting(false);
    }
  }, [canTakeAction, feedbackText, submitting, onRequestChanges, t]);
  
  const resetFeedbackForm = useCallback(() => {
    setShowFeedbackForm(false);
    setFeedbackText('');
  }, []);
  
  // Wenn bereits abgeschlossen, zeige Status
  if (isCompleted) {
    return (
      <div className={clsx("bg-white rounded-lg border border-gray-200 p-6", className)}>
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('completed.title')}
          </h3>
          <p className="text-gray-600">
            {t('completed.description', { version: version.version })}
          </p>
          {version.customerApproval?.approvedAt && (
            <div className="mt-3 text-sm text-gray-500">
              {t('completed.approvedAt', {
                date: new Date(version.customerApproval.approvedAt.toDate()).toLocaleString('de-DE')
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className={clsx("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
        {t('title')}
      </h3>

      {showFeedbackForm ? (
        /* Feedback-Formular */
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('feedback.label')}
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder={t('feedback.placeholder')}
              className="w-full resize-none"
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500">
              {t('feedback.hint')}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleRequestChanges}
              disabled={!feedbackText.trim() || submitting}
              color="indigo"
              className="flex-1"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('feedback.sending')}
                </>
              ) : (
                <>
                  <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                  {t('feedback.submit')}
                </>
              )}
            </Button>
            <Button
              onClick={resetFeedbackForm}
              disabled={submitting}
              plain
              className="px-4"
            >
              {t('feedback.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        /* Haupt-Aktionen */
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('description')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <ApprovalButton
              onClick={handleApprove}
              disabled={!canTakeAction}
              loading={submitting}
              variant="approve"
            >
              <CheckIcon className="h-5 w-5" />
              {submitting ? t('actions.processing') : t('actions.approve')}
            </ApprovalButton>

            <ApprovalButton
              onClick={() => setShowFeedbackForm(true)}
              disabled={!canTakeAction}
              variant="changes"
            >
              <PencilSquareIcon className="h-5 w-5" />
              {t('actions.requestChanges')}
            </ApprovalButton>
          </div>

          {/* Status-Info */}
          {currentStatus === 'pending' && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded">
              <ClockIcon className="h-4 w-4" />
              {t('status.pending')}
            </div>
          )}

          {currentStatus === 'viewed' && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
              <CheckIcon className="h-4 w-4" />
              {t('status.viewed')}
            </div>
          )}

          {currentStatus === 'commented' && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded">
              <ExclamationCircleIcon className="h-4 w-4" />
              {t('status.commented')}
            </div>
          )}
        </div>
      )}
      
      {/* Hinweis */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>{t('notice.label')}</strong> {t('notice.text')}
        </p>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison für Performance-Optimierung
  return (
    prevProps.version.id === nextProps.version.id &&
    prevProps.version.status === nextProps.version.status &&
    prevProps.currentStatus === nextProps.currentStatus &&
    prevProps.disabled === nextProps.disabled
  );
});