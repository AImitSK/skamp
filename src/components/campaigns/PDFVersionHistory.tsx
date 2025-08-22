// src/components/campaigns/PDFVersionHistory.tsx
"use client";

import { useState, useEffect } from 'react';
import { PDFVersion, pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { formatDateShort } from '@/utils/dateHelpers';
import {
  DocumentArrowDownIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface PDFVersionHistoryProps {
  campaignId: string;
  organizationId: string;
  showActions?: boolean;
  compact?: boolean;
  onVersionSelect?: (version: PDFVersion) => void;
}

export function PDFVersionHistory({
  campaignId,
  organizationId,
  showActions = true,
  compact = false,
  onVersionSelect
}: PDFVersionHistoryProps) {
  const [versions, setVersions] = useState<PDFVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentVersion, setCurrentVersion] = useState<PDFVersion | null>(null);

  useEffect(() => {
    loadVersions();
  }, [campaignId]);

  const loadVersions = async () => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      const versionHistory = await pdfVersionsService.getVersionHistory(campaignId);
      const current = await pdfVersionsService.getCurrentVersion(campaignId);
      
      // Debug: Zeige erste Version um Timestamp-Format zu prüfen
      if (versionHistory.length > 0) {
        console.log('📄 PDF Version Debug:', {
          version: versionHistory[0].version,
          createdAt: versionHistory[0].createdAt,
          createdAtType: typeof versionHistory[0].createdAt,
          createdAtKeys: versionHistory[0].createdAt ? Object.keys(versionHistory[0].createdAt) : 'null'
        });
      }
      
      // Sortiere nach Version absteigend (neueste zuerst)
      const sortedVersions = versionHistory.sort((a, b) => b.version - a.version);
      
      setVersions(sortedVersions);
      setCurrentVersion(current);
    } catch (error) {
      console.error('Fehler beim Laden der PDF-Versionen:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'pending_customer':
      case 'pending_team':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'changes_requested':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Entwurf';
      case 'pending_customer':
        return 'Zur Kundenfreigabe';
      case 'pending_team':
        return 'Zur Teamfreigabe';
      case 'approved':
        return 'Freigegeben';
      case 'rejected':
        return 'Abgelehnt';
      case 'changes_requested':
        return 'Änderungen angefordert';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'zinc' => {
    switch (status) {
      case 'approved':
        return 'green';
      case 'pending_customer':
      case 'pending_team':
        return 'yellow';
      case 'rejected':
        return 'red';
      case 'changes_requested':
        return 'orange';
      case 'draft':
        return 'blue';
      default:
        return 'zinc';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-24 bg-gray-200 rounded-lg"></div>
        <div className="h-24 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300" />
        <Text className="mt-2 text-gray-500">Noch keine PDF-Versionen vorhanden</Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version, index) => {
        const isCurrent = currentVersion?.id === version.id;
        
        return (
          <div
            key={version.id}
            className={`
              border rounded-lg p-4 transition-all
              ${isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
              ${onVersionSelect ? 'cursor-pointer' : ''}
            `}
            onClick={() => onVersionSelect?.(version)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getStatusIcon(version.status)}
                
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <Text className="font-semibold">
                      PDF v{version.version}
                    </Text>
                    {isCurrent && (
                      <Badge color="blue" className="text-xs">Aktuell</Badge>
                    )}
                    <Badge color={getStatusColor(version.status)} className="text-xs">
                      {getStatusLabel(version.status)}
                    </Badge>
                  </div>
                  
                  {/* Datum */}
                  <Text className="text-sm text-gray-600">
                    {version.createdAt ? formatDateShort(version.createdAt) : '—'}
                  </Text>
                  
                  {/* Kommentar falls vorhanden */}
                  {version.rejectionReason && (
                    <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                      <div className="flex items-start gap-2">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <Text className="text-sm text-orange-800">
                          {version.rejectionReason}
                        </Text>
                      </div>
                    </div>
                  )}
                  
                  {/* Metadata */}
                  {!compact && version.metadata && (
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      {version.metadata.pageCount && (
                        <span>{version.metadata.pageCount} Seiten</span>
                      )}
                      {version.metadata.wordCount && (
                        <span>{version.metadata.wordCount} Wörter</span>
                      )}
                      {version.metadata.fileSize && (
                        <span>{(version.metadata.fileSize / 1024).toFixed(1)} KB</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              {showActions && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    plain
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(version.downloadUrl, '_blank');
                    }}
                    className="!text-gray-600 hover:!text-gray-900"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    plain
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(version.downloadUrl, '_blank');
                    }}
                    className="!text-gray-600 hover:!text-gray-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Vorschau
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PDFVersionHistory;