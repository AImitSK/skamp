// src/components/projects/pressemeldungen/PressemeldungToggleSection.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { CampaignAssetAttachment } from '@/types/pr';
import { PDFVersion } from '@/types/customer-review';
import {
  transformMediaItems,
  transformCommunicationItems,
  formatLastMessageText as formatLastMessageHelper
} from './components/ToggleDataHelpers';
import EmptyState from './components/EmptyState';
import { FolderIcon } from '@heroicons/react/24/outline';

// Dynamische Imports mit Loading-States (wie in der funktionierenden Freigabe-Seite)
const MediaToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.MediaToggleBox })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

const PDFHistoryToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.PDFHistoryToggleBox })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

const CommunicationToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.CommunicationToggleBox })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

interface Props {
  projectId: string;
  campaignId?: string;
  organizationId: string;
}

export default function PressemeldungToggleSection({
  projectId,
  campaignId,
  organizationId
}: Props) {
  const [mediaItems, setMediaItems] = useState<CampaignAssetAttachment[]>([]);
  const [pdfVersions, setPdfVersions] = useState<PDFVersion[]>([]);
  const [communicationCount, setCommunicationCount] = useState(0);
  const [lastMessageDate, setLastMessageDate] = useState<Date | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedToggles, setExpandedToggles] = useState<Record<string, boolean>>({});

  // Handler mit useCallback für Performance
  const handleToggle = useCallback((id: string) => {
    setExpandedToggles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  useEffect(() => {
    if (campaignId) {
      loadToggleData();
    } else {
      setLoading(false);
    }
  }, [campaignId, projectId]);

  const loadToggleData = async () => {
    if (!campaignId) return;

    try {
      const [media, pdfs, notifications] = await Promise.all([
        loadMediaItems(),
        loadPDFVersions(),
        loadCommunicationData()
      ]);

      setMediaItems(media || []);
      setPdfVersions(pdfs || []);
    } catch (error) {
      console.error('Fehler beim Laden der Toggle-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMediaItems = async (): Promise<CampaignAssetAttachment[]> => {
    try {
      if (!campaignId) return [];

      // Lade Kampagne-Daten um attachedAssets zu erhalten
      const { prService } = await import('@/lib/firebase/pr-service');
      const campaign = await prService.getById(campaignId);

      if (campaign?.attachedAssets) {
        return campaign.attachedAssets;
      }

      return [];
    } catch (error) {
      console.error('Fehler beim Laden der Medien:', error);
      return [];
    }
  };

  const loadPDFVersions = async (): Promise<PDFVersion[]> => {
    try {
      if (!campaignId) return [];

      const versions = await pdfVersionsService.getVersionHistory(campaignId);
      return versions.map(v => ({
        id: v.id || '',
        version: v.version.toString(),
        pdfUrl: v.downloadUrl || '',
        createdAt: v.createdAt instanceof Date
          ? v.createdAt
          : v.createdAt?.toDate
            ? v.createdAt.toDate()
            : new Date(),
        createdBy: {
          id: v.createdBy || '',
          name: v.createdBy || 'Unbekannt',
          email: ''
        },
        fileSize: v.fileSize || 0,
        comment: undefined,
        isCurrent: false,
        campaignId: campaignId,
        organizationId: organizationId,
        status: v.status as 'draft' | 'pending_customer' | 'approved' | 'rejected'
      }));
    } catch (error) {
      console.error('Fehler beim Laden der PDF-Versionen:', error);
      return [];
    }
  };

  const loadCommunicationData = async () => {
    try {
      if (!campaignId) return;

      // Lade Approval-Daten um history zu erhalten (wie in funktionierender Freigabe-Seite)
      const { approvalServiceExtended } = await import('@/lib/firebase/approval-service');

      const approvals = await approvalServiceExtended.getApprovalsByProject(projectId, organizationId);

      // Finde das richtige Approval für diese campaignId
      const approval = approvals.find(a => a.campaignId === campaignId);

      // Verwende approval.history statt campaign.approvalData.feedbackHistory (wie in funktionierender Freigabe-Seite)
      const historyData = approval?.history?.filter(h => h.details?.comment) || [];

      // Transformiere history zu feedbackHistory Format (wie in funktionierender Freigabe-Seite)
      const feedbackHistoryData = historyData.map(h => ({
        author: h.actorName || 'Teammitglied',
        comment: h.details?.comment || '',
        requestedAt: h.timestamp,
        action: h.action
      }));

      setFeedbackHistory(feedbackHistoryData);
      setCommunicationCount(feedbackHistoryData.length);

      if (feedbackHistoryData.length > 0) {
        // Finde die neueste Nachricht
        const sortedFeedback = feedbackHistoryData.sort((a, b) => {
          const aTime = a.requestedAt ? (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt as any).getTime()) : 0;
          const bTime = b.requestedAt ? (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt as any).getTime()) : 0;
          return bTime - aTime;
        });

        const latestFeedback = sortedFeedback[0];
        setLastMessageDate(latestFeedback.requestedAt ? (latestFeedback.requestedAt instanceof Date ? latestFeedback.requestedAt : new Date(latestFeedback.requestedAt as any)) : null);
      } else {
        setLastMessageDate(null);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kommunikationsdaten:', error);
      setCommunicationCount(0);
      setLastMessageDate(null);
    }
  };

  // Callbacks für ToggleBoxes
  const handleMediaSelect = useCallback((mediaId: string) => {
    const media = mediaItems.find(item => item.id === mediaId);
    if (media) {
      const url = media.metadata?.thumbnailUrl;
      if (url) {
        window.open(url, '_blank');
      }
    }
  }, [mediaItems]);

  const handleVersionSelect = useCallback((version: string) => {
    // PDF-Version wurde ausgewählt - Handler für zukünftige Implementierung
  }, []);

  const handleNewMessage = useCallback(() => {
    // Neue Nachricht - Kommunikationsdaten neu laden
    loadCommunicationData();
  }, []);

  // Memoized transformed data
  const transformedMediaItems = useMemo(() => transformMediaItems(mediaItems), [mediaItems]);
  const transformedCommunications = useMemo(() => transformCommunicationItems(feedbackHistory), [feedbackHistory]);

  if (!campaignId) {
    return (
      <EmptyState
        icon={FolderIcon}
        title="Keine Pressemeldung"
        description="Erstellen Sie eine Pressemeldung, um Medien, PDF-Historie und Kommunikation anzuzeigen"
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 rounded-lg h-20"></div>
        <div className="animate-pulse bg-gray-200 rounded-lg h-20"></div>
        <div className="animate-pulse bg-gray-200 rounded-lg h-20"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded-lg h-64"></div>}>
        {/* Angehängte Medien */}
        <MediaToggleBox
          id="media"
          title="Angehängte Medien"
          count={mediaItems.length}
          isExpanded={expandedToggles['media'] || false}
          onToggle={handleToggle}
          mediaItems={transformedMediaItems}
          onMediaSelect={handleMediaSelect}
          organizationId={organizationId}
        />

        {/* PDF-Historie */}
        <PDFHistoryToggleBox
          id="pdf-history"
          title="PDF-Historie"
          count={pdfVersions.length}
          isExpanded={expandedToggles['pdf-history'] || false}
          onToggle={handleToggle}
          pdfVersions={pdfVersions}
          onVersionSelect={handleVersionSelect}
          showDownloadButtons={true}
          organizationId={organizationId}
        />

        {/* Kommunikation */}
        <CommunicationToggleBox
          id="communication"
          title="Kommunikation"
          count={communicationCount}
          isExpanded={expandedToggles['communication'] || false}
          onToggle={handleToggle}
          communications={transformedCommunications}
          onNewMessage={handleNewMessage}
          allowNewMessages={true}
          organizationId={organizationId}
        />
      </Suspense>
    </div>
  );
}