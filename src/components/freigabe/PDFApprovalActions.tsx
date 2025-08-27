// src/components/freigabe/PDFApprovalActions.tsx - Moderne PDF-Approval-Aktionen für Customer-Freigabe
"use client";

import { useState, useCallback, memo } from 'react';
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
      console.error('Fehler bei der Freigabe:', error);
    } finally {
      setSubmitting(false);
    }
  }, [canTakeAction, submitting, onApprove]);
  
  const handleRequestChanges = useCallback(async () => {
    if (!canTakeAction || !feedbackText.trim() || submitting) return;
    
    try {
      setSubmitting(true);
      await onRequestChanges(feedbackText.trim());
      setFeedbackText('');
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Fehler beim Senden des Feedbacks:', error);
    } finally {
      setSubmitting(false);
    }
  }, [canTakeAction, feedbackText, submitting, onRequestChanges]);
  
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
            Freigabe erfolgreich erteilt
          </h3>
          <p className="text-gray-600">
            Sie haben die PDF-Version {version.version} freigegeben. 
            Das Dokument kann nun von der Agentur verwendet werden.
          </p>
          {version.customerApproval?.approvedAt && (
            <div className="mt-3 text-sm text-gray-500">
              Freigegeben am {new Date(version.customerApproval.approvedAt.toDate()).toLocaleString('de-DE')}
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
        Ihre Entscheidung
      </h3>
      
      {showFeedbackForm ? (
        /* Feedback-Formular */
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welche Änderungen wünschen Sie an der PDF?
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder="Bitte beschreiben Sie konkret, was an der PDF geändert werden soll..."
              className="w-full resize-none"
              autoFocus
            />
            <div className="mt-1 text-xs text-gray-500">
              Ihre Änderungswünsche werden direkt an die Agentur übermittelt.
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
                  Wird gesendet...
                </>
              ) : (
                <>
                  <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                  Änderungen senden
                </>
              )}
            </Button>
            <Button
              onClick={resetFeedbackForm}
              disabled={submitting}
              plain
              className="px-4"
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        /* Haupt-Aktionen */
        <div className="space-y-4">
          <p className="text-gray-600">
            Bitte prüfen Sie das PDF-Dokument sorgfältig. Sie können entweder die Freigabe 
            erteilen oder spezifische Änderungen anfordern.
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
              {submitting ? 'Wird verarbeitet...' : 'PDF freigeben'}
            </ApprovalButton>
            
            <ApprovalButton
              onClick={() => setShowFeedbackForm(true)}
              disabled={!canTakeAction}
              variant="changes"
            >
              <PencilSquareIcon className="h-5 w-5" />
              Änderungen anfordern
            </ApprovalButton>
          </div>
          
          {/* Status-Info */}
          {currentStatus === 'pending' && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded">
              <ClockIcon className="h-4 w-4" />
              Diese PDF wartet auf Ihre erste Prüfung
            </div>
          )}
          
          {currentStatus === 'viewed' && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
              <CheckIcon className="h-4 w-4" />
              Sie haben diese PDF bereits angesehen
            </div>
          )}
          
          {currentStatus === 'commented' && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded">
              <ExclamationCircleIcon className="h-4 w-4" />
              Sie haben bereits Änderungen zu einer vorherigen Version angefordert
            </div>
          )}
        </div>
      )}
      
      {/* Hinweis */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Hinweis:</strong> Nach Ihrer Freigabe ist diese PDF-Version verbindlich und 
          kann nicht mehr geändert werden. Bei Änderungswünschen wird eine neue Version erstellt.
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