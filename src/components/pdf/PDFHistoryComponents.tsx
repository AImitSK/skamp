// src/components/pdf/PDFHistoryComponents.tsx - Wiederverwendbare PDF-Historie Komponenten
"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PDFVersion } from '@/lib/firebase/pdf-versions-service';
import { 
  DocumentTextIcon,
  DocumentIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import clsx from 'clsx';

interface PDFVersionOverviewProps {
  version: PDFVersion;
  campaignTitle: string;
  onHistoryToggle: () => void;
  showDownloadButton?: boolean;
  variant?: 'admin' | 'customer';
  totalVersions?: number;
}

interface PDFHistoryModalProps {
  versions: PDFVersion[];
  onClose: () => void;
  variant?: 'admin' | 'customer';
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

const getPDFStatusConfig = (status: string, t: (key: string) => string) => {
  const configs = {
    draft: { color: 'zinc', label: t('status.draft'), icon: DocumentIcon },
    pending_customer: { color: 'yellow', label: t('status.pendingCustomer'), icon: ClockIcon },
    approved: { color: 'green', label: t('status.approved'), icon: CheckCircleIcon },
    rejected: { color: 'red', label: t('status.rejected'), icon: XCircleIcon }
  };
  return configs[status as keyof typeof configs] || { color: 'zinc', label: t('status.unknown'), icon: DocumentIcon };
};

const getPDFStatusBadgeColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'zinc' => {
  switch (status) {
    case 'approved': return 'green';
    case 'pending_customer': return 'yellow';
    case 'rejected': return 'red';
    default: return 'zinc';
  }
};

const getPDFStatusLabel = (status: string, t: (key: string) => string): string => {
  const labels = {
    draft: t('status.draft'),
    pending_customer: t('status.pendingCustomer'),
    approved: t('status.approved'),
    rejected: t('status.rejected')
  };
  return labels[status as keyof typeof labels] || t('status.unknown');
};

export function PDFVersionOverview({
  version,
  campaignTitle,
  onHistoryToggle,
  showDownloadButton = true,
  variant = 'admin',
  totalVersions = 1
}: PDFVersionOverviewProps) {
  const t = useTranslations('freigabe.pdf.history');
  const tPdf = useTranslations('freigabe.pdf');

  const config = getPDFStatusConfig(version.status, t);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
          {t('overview.title')}
          {variant === 'customer' && (
            <Badge color="blue" className="text-xs ml-2">
              {t('modal.immutable')}
            </Badge>
          )}
        </h2>
      </div>
      
      <div className="p-6">
        {/* PDF-Version Details */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <config.icon className="h-8 w-8 text-gray-500" />
            <div>
              <h3 className="font-medium text-gray-900">
                {campaignTitle} - {t('overview.version')} {version.version}
              </h3>
              <div className="text-sm text-gray-600 mt-1">
                {t('overview.createdAt')} {formatDate(version.createdAt)}
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
        
        {/* PDF Metadata */}
        {version.metadata && (
          <div className="text-sm text-gray-600 mb-4">
            {version.metadata.wordCount} {tPdf('metadata.words')} • {version.metadata.pageCount} {tPdf('metadata.pages')}
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3">
          {showDownloadButton && version.downloadUrl && (
            <a
              href={version.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full bg-[#005fab] hover:bg-[#004a8c] text-white">
                <DocumentIcon className="h-5 w-5 mr-2" />
                {t('overview.openAndReview')}
              </Button>
            </a>
          )}
          
          {totalVersions > 1 && (
            <Button
              onClick={onHistoryToggle}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              {t('overview.moreVersions', { count: totalVersions - 1 })}
            </Button>
          )}
        </div>
        
        {/* Enhanced Info Box für Customer */}
        {variant === 'customer' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">{tPdf('infoBoxes.immutable.title')}</p>
                <p>
                  {tPdf('infoBoxes.immutable.description')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* PDF-Approval Integration */}
        {version.customerApproval && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">{t('overview.approvalInfo')}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="h-4 w-4" />
              {version.customerApproval.requestedAt &&
                `${t('overview.requestedAt')} ${formatDate(version.customerApproval.requestedAt)}`
              }
              {version.customerApproval.approvedAt &&
                ` • ${t('overview.approvedAt')} ${formatDate(version.customerApproval.approvedAt)}`
              }
            </div>
            {(version.customerApproval as any)?.comment && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <strong>{t('overview.comment')}</strong> &ldquo;{(version.customerApproval as any).comment}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PDFHistoryModal({
  versions,
  onClose,
  variant = 'admin'
}: PDFHistoryModalProps) {
  const t = useTranslations('freigabe.pdf.history');
  const tPdf = useTranslations('freigabe.pdf');

  // Sortiere Versionen nach Version (neueste zuerst)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
  
  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <div className="p-6">
        <DialogTitle>{t('modal.title')}</DialogTitle>

        {variant === 'customer' && (
          <div className="mt-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <InformationCircleIcon className="h-4 w-4 inline mr-1" />
              {t('modal.infoCustomer')}
            </p>
          </div>
        )}
        
        <DialogBody className="mt-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedVersions.map((version) => {
              const config = getPDFStatusConfig(version.status, t);
              
              return (
                <div key={version.id} 
                  className={clsx(
                    "p-4 rounded-lg border",
                    version.status === 'approved' 
                      ? "bg-green-50 border-green-200" 
                      : version.status === 'pending_customer'
                      ? "bg-yellow-50 border-yellow-200"
                      : version.status === 'rejected'
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <config.icon className="h-6 w-6" />
                      <div>
                        <div className="font-medium">{t('modal.version')} {version.version}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge color={getPDFStatusBadgeColor(version.status)} className="text-xs">
                        {getPDFStatusLabel(version.status, t)}
                      </Badge>
                      {version.downloadUrl && (
                        <a
                          href={version.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button plain className="text-sm">
                            <DocumentIcon className="h-4 w-4 mr-1" />
                            {t('modal.open')}
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="font-medium mb-1">{version.contentSnapshot?.title || t('modal.unnamed')}</div>
                    {version.metadata && (
                      <div className="text-xs">
                        {version.metadata.wordCount} {tPdf('metadata.words')} • {version.metadata.pageCount} {tPdf('metadata.pages')}
                        {version.fileSize && ` • ${formatFileSize(version.fileSize)}`}
                      </div>
                    )}
                    
                    {/* Customer-spezifische Version-Details */}
                    {variant === 'customer' && version.customerApproval && (
                      <div className="mt-2 p-2 bg-white bg-opacity-60 rounded">
                        <div className="text-xs text-gray-500">
                          {version.customerApproval.approvedAt && (
                            <>
                              {t('overview.approvalDecision')} {version.status === 'approved' ? t('status.approved') : t('status.rejected')}
                              {' '}{t('overview.approvedAt').toLowerCase()} {formatDate(version.customerApproval.approvedAt)}
                            </>
                          )}
                          {version.customerApproval.requestedAt && !version.customerApproval.approvedAt && (
                            <>{t('overview.requestedAt')} {formatDate(version.customerApproval.requestedAt)}</>
                          )}
                        </div>
                        {(version.customerApproval as any)?.comment && (
                          <div className="text-xs italic mt-1">
                            &ldquo;{(version.customerApproval as any).comment}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogBody>


        <DialogActions>
          <Button plain onClick={onClose}>{t('modal.close')}</Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}