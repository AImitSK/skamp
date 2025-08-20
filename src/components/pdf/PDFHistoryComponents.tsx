// src/components/pdf/PDFHistoryComponents.tsx - Wiederverwendbare PDF-Historie Komponenten
"use client";

import { useState } from 'react';
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

const getPDFStatusConfig = (status: string) => {
  const configs = {
    draft: { color: 'zinc', label: 'Entwurf', icon: DocumentIcon },
    pending_customer: { color: 'yellow', label: 'Zur Freigabe', icon: ClockIcon },
    approved: { color: 'green', label: 'Freigegeben', icon: CheckCircleIcon },
    rejected: { color: 'red', label: 'Abgelehnt', icon: XCircleIcon }
  };
  return configs[status as keyof typeof configs] || configs.draft;
};

const getPDFStatusBadgeColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'zinc' => {
  switch (status) {
    case 'approved': return 'green';
    case 'pending_customer': return 'yellow';
    case 'rejected': return 'red';
    default: return 'zinc';
  }
};

const getPDFStatusLabel = (status: string): string => {
  const labels = {
    draft: 'Entwurf',
    pending_customer: 'Zur Freigabe',
    approved: 'Freigegeben',
    rejected: 'Abgelehnt'
  };
  return labels[status as keyof typeof labels] || 'Unbekannt';
};

export function PDFVersionOverview({ 
  version, 
  campaignTitle,
  onHistoryToggle,
  showDownloadButton = true,
  variant = 'admin',
  totalVersions = 1
}: PDFVersionOverviewProps) {
  
  const config = getPDFStatusConfig(version.status);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-6">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-400" />
          PDF-Dokument zur Freigabe
          {variant === 'customer' && (
            <Badge color="blue" className="text-xs ml-2">
              Unveränderlich
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
                {campaignTitle} - Version {version.version}
              </h3>
              <div className="text-sm text-gray-600 mt-1">
                Erstellt am {formatDate(version.createdAt)}
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
            {version.metadata.wordCount} Wörter • {version.metadata.pageCount} Seiten
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
                PDF öffnen und prüfen
              </Button>
            </a>
          )}
          
          {totalVersions > 1 && (
            <Button
              onClick={onHistoryToggle}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              Weitere Versionen ({totalVersions - 1})
            </Button>
          )}
        </div>
        
        {/* Enhanced Info Box für Customer */}
        {variant === 'customer' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">📄 Unveränderliche PDF-Version</p>
                <p>
                  Diese PDF-Version wurde automatisch beim Anfordern der Freigabe erstellt und 
                  kann nicht mehr verändert werden. Sie bildet genau den Inhalt ab, der zur 
                  Freigabe vorgelegt wird.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* PDF-Approval Integration */}
        {version.customerApproval && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">Freigabe-Information</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="h-4 w-4" />
              {version.customerApproval.requestedAt && 
                `Angefordert am ${formatDate(version.customerApproval.requestedAt)}`
              }
              {version.customerApproval.approvedAt && 
                ` • Freigegeben am ${formatDate(version.customerApproval.approvedAt)}`
              }
            </div>
            {version.customerApproval.comment && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <strong>Kommentar:</strong> &ldquo;{version.customerApproval.comment}&rdquo;
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
  
  // Sortiere Versionen nach Version (neueste zuerst)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);
  
  return (
    <Dialog open={true} onClose={onClose} size="2xl">
      <div className="p-6">
        <DialogTitle>PDF-Versions-Historie</DialogTitle>
        
        {variant === 'customer' && (
          <div className="mt-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <InformationCircleIcon className="h-4 w-4 inline mr-1" />
              Hier sehen Sie alle PDF-Versionen dieser Kampagne. Jede Version ist unveränderlich 
              und zeigt den exakten Stand zum Zeitpunkt der Freigabe-Anforderung.
            </p>
          </div>
        )}
        
        <DialogBody className="mt-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {sortedVersions.map((version) => {
              const config = getPDFStatusConfig(version.status);
              
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
                        <div className="font-medium">Version {version.version}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(version.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge color={getPDFStatusBadgeColor(version.status)} className="text-xs">
                        {getPDFStatusLabel(version.status)}
                      </Badge>
                      {version.downloadUrl && (
                        <a
                          href={version.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" plain>
                            <DocumentIcon className="h-4 w-4 mr-1" />
                            Öffnen
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-600">
                    <div className="font-medium mb-1">{version.contentSnapshot?.title || 'Unbenannt'}</div>
                    {version.metadata && (
                      <div className="text-xs">
                        {version.metadata.wordCount} Wörter • {version.metadata.pageCount} Seiten
                        {version.fileSize && ` • ${formatFileSize(version.fileSize)}`}
                      </div>
                    )}
                    
                    {/* Customer-spezifische Version-Details */}
                    {variant === 'customer' && version.customerApproval && (
                      <div className="mt-2 p-2 bg-white bg-opacity-60 rounded">
                        <div className="text-xs text-gray-500">
                          {version.customerApproval.approvedAt && (
                            <>
                              Freigabe-Entscheidung: {version.status === 'approved' ? 'Freigegeben' : 'Abgelehnt'} 
                              am {formatDate(version.customerApproval.approvedAt)}
                            </>
                          )}
                          {version.customerApproval.requestedAt && !version.customerApproval.approvedAt && (
                            <>Freigabe angefordert am {formatDate(version.customerApproval.requestedAt)}</>
                          )}
                        </div>
                        {version.customerApproval.comment && (
                          <div className="text-xs italic mt-1">
                            &ldquo;{version.customerApproval.comment}&rdquo;
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
          <Button plain onClick={onClose}>Schließen</Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}