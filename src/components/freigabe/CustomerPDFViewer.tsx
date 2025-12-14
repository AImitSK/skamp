// src/components/freigabe/CustomerPDFViewer.tsx - Customer-optimierte PDF-Anzeige für Freigabe-Seite
"use client";

import { useState, useMemo, memo } from 'react';
import { useTranslations } from 'next-intl';
import { PDFVersion } from '@/lib/firebase/pdf-versions-service';
import {
  DocumentTextIcon,
  DocumentIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import clsx from 'clsx';

interface CustomerPDFViewerProps {
  version: PDFVersion;
  campaignTitle: string;
  onHistoryToggle: () => void;
  totalVersions?: number;
  className?: string;
}

// Helper Functions
const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  
  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return '';
  }
  
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getPDFStatusConfig = (status: string, t: any) => {
  const configs = {
    pending_customer: {
      color: 'yellow',
      label: t('statusLabels.pendingCustomer'),
      icon: ClockIcon,
      description: t('statusDescriptions.pendingCustomer')
    },
    approved: {
      color: 'green',
      label: t('statusLabels.approved'),
      icon: CheckCircleIcon,
      description: t('statusDescriptions.approved')
    },
    rejected: {
      color: 'red',
      label: t('statusLabels.rejected'),
      icon: XCircleIcon,
      description: t('statusDescriptions.rejected')
    }
  };
  return configs[status as keyof typeof configs] || {
    color: 'zinc',
    label: t('statusLabels.unknown'),
    icon: DocumentIcon,
    description: t('statusDescriptions.unknown')
  };
};

export default memo(function CustomerPDFViewer({
  version,
  campaignTitle,
  onHistoryToggle,
  totalVersions = 1,
  className = ""
}: CustomerPDFViewerProps) {

  const t = useTranslations('freigabe.customerPdfViewer');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const config = useMemo(() => getPDFStatusConfig(version.status, t), [version.status, t]);
  
  // PDF-URL prüfen (memoized for performance)
  const hasPDFUrl = useMemo(() => 
    Boolean(version.downloadUrl && version.downloadUrl.trim() !== ''), 
    [version.downloadUrl]
  );
  
  return (
    <div className={clsx("bg-white rounded-lg border border-gray-200", className)}>
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
          {t('header.title')}
          <Badge color="blue" className="text-xs ml-2">
            {t('header.immutable')}
          </Badge>
        </h2>
      </div>
      
      <div className="p-6">
        {/* PDF-Status Anzeige */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <config.icon className={clsx(
              "h-8 w-8",
              config.color === 'green' && "text-green-500",
              config.color === 'yellow' && "text-yellow-500", 
              config.color === 'red' && "text-red-500",
              config.color === 'zinc' && "text-gray-500"
            )} />
            <div>
              <h3 className="font-medium text-gray-900">
                {campaignTitle} - Version {version.version}
              </h3>
              <div className="text-sm text-gray-600 mt-1">
                {t('versionInfo.createdAt')} {formatDate(version.createdAt)}
                {version.fileSize && ` • ${formatFileSize(version.fileSize)}`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge color={config.color as any} className="text-sm">
              {config.label}
            </Badge>
          </div>
        </div>
        
        {/* PDF Metadaten */}
        {version.metadata && (
          <div className="text-sm text-gray-600 mb-4 flex items-center gap-4">
            <span>{version.metadata.pageCount} {t('metadata.pages')}</span>
            <span>{version.metadata.wordCount} {t('metadata.words')}</span>
          </div>
        )}
        
        {/* Hauptaktionen */}
        <div className="space-y-3 mb-6">
          {hasPDFUrl ? (
            <>
              {/* Primäre PDF-Aktion */}
              <a
                href={version.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white text-base py-3">
                  <DocumentIcon className="h-5 w-5 mr-3" />
                  {t('actions.openAndReview')}
                </Button>
              </a>
              
              {/* Sekundäre Aktionen */}
              <div className="flex gap-3">
                {/* Download-Button */}
                <a
                  href={version.downloadUrl}
                  download={`${campaignTitle} - Version ${version.version}.pdf`}
                  className="flex-1"
                >
                  <Button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700" plain>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    {t('actions.download')}
                  </Button>
                </a>

                {/* Versions-Historie */}
                {totalVersions > 1 && (
                  <Button
                    onClick={onHistoryToggle}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                    plain
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    {t('actions.moreVersions', { count: totalVersions - 1 })}
                  </Button>
                )}
              </div>
            </>
          ) : (
            // Fehlerfall: Keine PDF-URL
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <div>
                  <h4 className="font-medium text-red-900">{t('error.notAvailable')}</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {t('error.notAvailableDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Status-abhängige Info-Boxen */}
        {version.status === 'pending_customer' && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <ClockIcon className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">{t('infoBoxes.pending.title')}</p>
                <p>
                  {t('infoBoxes.pending.description')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {version.status === 'approved' && version.customerApproval?.approvedAt && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">{t('infoBoxes.approved.title')}</p>
                <p>
                  {t('infoBoxes.approved.description', { date: formatDate(version.customerApproval.approvedAt) })}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {version.status === 'rejected' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">{t('infoBoxes.rejected.title')}</p>
                <p>
                  {t('infoBoxes.rejected.description')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Allgemeine Info zur PDF-Unveränderlichkeit */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">{t('infoBoxes.immutable.title')}</p>
              <p>
                {t('infoBoxes.immutable.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison für Performance-Optimierung
  return (
    prevProps.version.id === nextProps.version.id &&
    prevProps.version.status === nextProps.version.status &&
    prevProps.version.downloadUrl === nextProps.version.downloadUrl &&
    prevProps.campaignTitle === nextProps.campaignTitle &&
    prevProps.totalVersions === nextProps.totalVersions
  );
});