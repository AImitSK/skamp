'use client';

import React, { useState, useCallback, memo } from 'react';
import { CheckCircleIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import { ToggleBox } from './ToggleBox';
import { DecisionToggleBoxProps } from '@/types/customer-review';

/**
 * Decision-Toggle-Box für Freigabe-Entscheidungen
 * Ermöglicht Approve/Reject mit optionalem Feedback
 * OPTIMIERT: Mit React.memo für bessere Performance
 */
function DecisionToggleBoxComponent({
  id,
  title,
  isExpanded,
  onToggle,
  organizationId,
  onApprove,
  onReject,
  onRequestChanges,
  disabled = false,
  className = '',
  approveButtonText = 'Freigabe erteilen',
  rejectButtonText = 'Ablehnen',
  requestChangesButtonText = 'Änderungen anfordern',
  ...props
}: DecisionToggleBoxProps) {
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesText, setChangesText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = useCallback(async () => {
    if (disabled || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onApprove?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [onApprove, disabled, isSubmitting]);


  const handleRequestChanges = useCallback(() => {
    if (disabled) return;
    setShowChangesForm(true);
  }, [disabled]);

  const handleSubmitChanges = useCallback(async () => {
    if (disabled || isSubmitting || !changesText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onRequestChanges?.(changesText.trim());
      setShowChangesForm(false);
      setChangesText('');
    } finally {
      setIsSubmitting(false);
    }
  }, [onRequestChanges, changesText, disabled, isSubmitting]);

  const handleCancelChanges = useCallback(() => {
    setShowChangesForm(false);
    setChangesText('');
  }, []);

  return (
    <ToggleBox
      id={id}
      title={title}
      subtitle="Erteilen Sie die Freigabe oder fordern Sie Änderungen an"
      defaultOpen={true}
      icon={CheckCircleIcon}
      iconColor="text-emerald-600"
      isExpanded={isExpanded}
      onToggle={onToggle}
      organizationId={organizationId}
      className={className}
      data-testid="decision-toggle-box"
      {...props}
    >
      <div className="space-y-4">
        {/* Haupt-Aktionen */}
        {!showChangesForm && (
          <div className="space-y-3">
            {/* Freigabe-Button */}
            <button
              onClick={handleApprove}
              disabled={disabled || isSubmitting}
              className={`
                w-full flex items-center justify-center px-6 py-4 border border-transparent 
                text-lg font-semibold rounded-lg transition-colors duration-150
                ${disabled || isSubmitting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
                }
              `}
              data-testid="approve-button"
            >
              <CheckCircleIcon className="h-6 w-6 mr-3" />
              {isSubmitting ? 'Freigabe wird erteilt...' : approveButtonText}
            </button>

            {/* Änderungen anfordern - als einzelner Button */}
            <button
              onClick={handleRequestChanges}
              disabled={disabled || isSubmitting}
              className={`
                w-full flex items-center justify-center px-4 py-3 border border-gray-300
                text-sm font-medium rounded-lg transition-colors duration-150
                ${disabled || isSubmitting
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }
              `}
              data-testid="request-changes-button"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              {requestChangesButtonText}
            </button>
          </div>
        )}

        {/* Änderungen-Formular */}
        {showChangesForm && (
          <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div>
              <h4 className="font-medium text-blue-900 mb-2">
                Änderungen anfordern
              </h4>
              <p className="text-sm text-blue-800 mb-4">
                Beschreiben Sie bitte konkret, welche Änderungen Sie wünschen:
              </p>
            </div>

            {/* Textfeld */}
            <div>
              <textarea
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
                placeholder="Bitte beschreiben Sie hier die gewünschten Änderungen..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                disabled={disabled || isSubmitting}
                data-testid="changes-textarea"
              />
              <div className="text-xs text-gray-500 mt-1">
                {changesText.length} Zeichen
              </div>
            </div>

            {/* Formular-Aktionen */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelChanges}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
                data-testid="cancel-changes-button"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmitChanges}
                disabled={!changesText.trim() || isSubmitting}
                className={`
                  px-4 py-2 border border-transparent text-sm font-medium rounded-md
                  transition-colors duration-150
                  ${!changesText.trim() || isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  }
                `}
                data-testid="submit-changes-button"
              >
                {isSubmitting ? 'Wird gesendet...' : 'Änderungen senden'}
              </button>
            </div>
          </div>
        )}

        {/* Info-Text */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Ihre Optionen:
              </h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><strong>Freigabe erteilen:</strong> Die Pressemitteilung wird freigegeben und kann versendet werden.</li>
                <li><strong>Änderungen anfordern:</strong> Sie können spezifische Änderungswünsche mitteilen.</li>
                <li><strong>Ablehnen:</strong> Die Pressemitteilung wird vollständig abgelehnt.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ToggleBox>
  );
}

// PERFORMANCE: Memoized Export mit Custom Vergleich
export const DecisionToggleBox = memo(DecisionToggleBoxComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.disabled === nextProps.disabled
  );
});

export default DecisionToggleBox;