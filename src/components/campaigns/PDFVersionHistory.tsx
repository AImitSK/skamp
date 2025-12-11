// src/components/campaigns/PDFVersionHistory.tsx
"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('campaigns.pdf');
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

      // Filtere Entwürfe aus der Historie (nur finale Versionen zeigen)
      // Entwürfe werden nur in der "Aktuelle PDF-Version" Box oben angezeigt
      const finalVersions = versionHistory.filter(v => v.status !== 'draft');

      // Sortiere nach Version absteigend (neueste zuerst)
      const sortedVersions = finalVersions.sort((a, b) => b.version - a.version);

      setVersions(sortedVersions);
      setCurrentVersion(current);
    } catch (error) {
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
        return t('status.draft');
      case 'pending_customer':
        return t('status.pendingCustomer');
      case 'pending_team':
        return t('status.pendingTeam');
      case 'approved':
        return t('status.approved');
      case 'rejected':
        return t('status.rejected');
      case 'changes_requested':
        return t('status.changesRequested');
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
        <Text className="mt-2 text-gray-500">{t('noVersions')}</Text>
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
              border rounded-lg p-3 transition-all
              ${isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}
              ${onVersionSelect ? 'cursor-pointer' : ''}
            `}
            onClick={() => onVersionSelect?.(version)}
          >
            <div className="flex items-center justify-between">
              {/* Linke Seite: Kompakte Info in einer Zeile */}
              <div className="flex items-center gap-3">
                <Text className="font-medium">
                  PDF v{version.version}
                </Text>
                {isCurrent && (
                  <Badge color="blue" className="text-xs">{t('current')}</Badge>
                )}
                <Badge color={getStatusColor(version.status)} className="text-xs">
                  {getStatusLabel(version.status)}
                </Badge>
                <Text className="text-sm text-gray-500">
                  {(() => {
                    // Robuste Timestamp-Behandlung
                    const getTimestamp = (createdAt: any) => {
                      // Standard Firebase Timestamp
                      if (createdAt?.toDate) {
                        return createdAt.toDate();
                      }
                      // Native Date Object
                      if (createdAt instanceof Date) {
                        return createdAt;
                      }
                      // Unaufgelöste serverTimestamp() FieldValue-Objekte (Legacy-Daten)
                      if (createdAt && typeof createdAt === 'object' && createdAt._methodName === 'serverTimestamp') {
                        // Fallback: Relative Timestamps für bestehende kaputte Daten
                        const now = new Date();
                        const versionOffset = (version.version - 1) * 60000; // 1 Minute pro Version zurück
                        return new Date(now.getTime() - versionOffset);
                      }
                      // Fehlerhafte Timestamp-Objekte mit seconds/nanoseconds
                      if (createdAt && typeof createdAt === 'object') {
                        const seconds = createdAt.seconds || createdAt._seconds;
                        const nanoseconds = createdAt.nanoseconds || createdAt._nanoseconds || 0;
                        
                        if (typeof seconds === 'number') {
                          return new Date(seconds * 1000 + nanoseconds / 1000000);
                        }
                      }
                      return null;
                    };
                    
                    const timestamp = getTimestamp(version.createdAt);
                    return timestamp ? formatDateShort(timestamp) : '—';
                  })()}
                </Text>
              </div>
              
              {/* Actions */}
              {showActions && (
                <div className="flex items-center gap-2">
                  <Button
                    plain
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      window.open(version.downloadUrl, '_blank');
                    }}
                    className="!text-gray-600 hover:!text-gray-900 text-sm"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    {t('download')}
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