'use client';

import React, { useCallback, memo, useMemo } from 'react';
import { DocumentTextIcon, ArrowDownTrayIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { ToggleBox } from './ToggleBox';
import { PDFHistoryToggleBoxProps, PDFVersion } from '@/types/customer-review';

/**
 * PDF-Historie-Toggle-Box für die Anzeige der PDF-Versionshistorie
 * Zeigt alle PDF-Versionen mit Status und Download-Möglichkeit
 * OPTIMIERT: Mit React.memo und useMemo für bessere Performance
 */
function PDFHistoryToggleBoxComponent({
  id,
  title,
  isExpanded,
  onToggle,
  organizationId,
  pdfVersions = [],
  currentVersionId,
  onVersionSelect,
  showDownloadButtons = true,
  className = '',
  ...props
}: PDFHistoryToggleBoxProps) {

  const handleDownload = useCallback((pdfVersion: PDFVersion) => {
    // Download logic
    const link = document.createElement('a');
    link.href = pdfVersion.pdfUrl;
    link.download = `Version_${pdfVersion.version}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleView = useCallback((pdfVersion: PDFVersion) => {
    onVersionSelect?.(pdfVersion.id);
    window.open(pdfVersion.pdfUrl, '_blank');
  }, [onVersionSelect]);

  const getStatusConfig = (status: PDFVersion['status']) => {
    switch (status) {
      case 'draft':
        return {
          icon: ClockIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          label: 'Entwurf'
        };
      case 'pending_customer':
        return {
          icon: ClockIcon,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          label: 'Zur Prüfung'
        };
      case 'approved':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          label: 'Freigegeben'
        };
      case 'rejected':
        return {
          icon: XCircleIcon,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          label: 'Abgelehnt'
        };
      default:
        return {
          icon: ClockIcon,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          label: 'Unbekannt'
        };
    }
  };

  const formatDate = (date: Date | string) => {
    if (!date) return 'Unbekannt';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'Unbekannt';
    return dateObj.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // PERFORMANCE: Memoized Berechnungen
  const currentVersion = useMemo(() => 
    pdfVersions.find(v => v.isCurrent) || pdfVersions[0], 
    [pdfVersions]
  );
  
  const sortedVersions = useMemo(() =>
    [...pdfVersions].sort((a, b) => {
      // Handle version as number or string
      const versionA = typeof a.version === 'number' ? a.version : parseInt(a.version) || 0;
      const versionB = typeof b.version === 'number' ? b.version : parseInt(b.version) || 0;
      return versionB - versionA; // Descending order (newest first)
    }),
    [pdfVersions]
  );

  return (
    <ToggleBox
      id={id}
      title={title}
      subtitle={undefined}
      count={pdfVersions.length}
      icon={DocumentTextIcon}
      iconColor="text-purple-600"
      isExpanded={isExpanded}
      onToggle={onToggle}
      organizationId={organizationId}
      className={className}
      data-testid="pdf-history-toggle-box"
      {...props}
    >
      {pdfVersions.length === 0 ? (
        <div className="text-center py-8">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Keine PDF-Versionen verfügbar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Info-Text */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-purple-800">
                  <strong>Aktuelle Version:</strong> Version {currentVersion?.version} vom {currentVersion ? formatDate(currentVersion.createdAt) : ''}
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  Hier sehen Sie die komplette Versionshistorie dieser Pressemitteilung.
                </p>
              </div>
            </div>
          </div>

          {/* PDF-Versionen-Liste */}
          <div className="space-y-3">
            {sortedVersions.map((pdfVersion, index) => {
              const statusConfig = getStatusConfig(pdfVersion.status);
              const StatusIcon = statusConfig.icon;
              const isLatest = index === 0;

              return (
                <div
                  key={pdfVersion.id}
                  className={`
                    border rounded-lg p-4 transition-colors duration-150
                    ${isLatest 
                      ? 'border-purple-300 bg-purple-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                  data-testid={`pdf-version-${pdfVersion.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-grow">
                      {/* Status-Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                      </div>

                      {/* PDF-Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            Version {pdfVersion.version}
                          </h4>
                          {isLatest && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Aktuell
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="mt-1 text-sm text-gray-600">
                          <div>Erstellt: {formatDate(pdfVersion.createdAt)}</div>
                        </div>

                        {/* Änderungen/Kommentar */}
                        {pdfVersion.comment && (
                          <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            <strong>Änderungen:</strong> {pdfVersion.comment}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action-Button */}
                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={() => handleDownload(pdfVersion)}
                        className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors duration-150"
                        data-testid={`pdf-download-${pdfVersion.id}`}
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ToggleBox>
  );
}

// PERFORMANCE: Memoized Export
export const PDFHistoryToggleBox = memo(PDFHistoryToggleBoxComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.pdfVersions.length === nextProps.pdfVersions.length &&
    prevProps.currentVersionId === nextProps.currentVersionId
  );
});

export default PDFHistoryToggleBox;