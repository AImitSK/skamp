// src/components/projects/pressemeldungen/PressemeldungToggleSection.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { mediaService } from '@/lib/firebase/media-service';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { CampaignAssetAttachment } from '@/types/pr';
import { PDFVersion } from '@/types/customer-review';

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
}

export default function PressemeldungToggleSection({
  projectId,
  campaignId
}: Props) {
  const [mediaItems, setMediaItems] = useState<CampaignAssetAttachment[]>([]);
  const [pdfVersions, setPdfVersions] = useState<PDFVersion[]>([]);
  const [communicationCount, setCommunicationCount] = useState(0);
  const [lastMessageDate, setLastMessageDate] = useState<Date | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedToggles, setExpandedToggles] = useState<Record<string, boolean>>({});

  const handleToggle = (id: string) => {
    setExpandedToggles(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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
        console.log('🔍 DEBUG - Angehängte Assets gefunden:', campaign.attachedAssets);
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
      console.log('🔍 DEBUG - PDF-Versionen gefunden:', versions.length, versions);
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
        comment: v.changesSummary || undefined,
        isCurrent: false,
        campaignId: campaignId,
        organizationId: '',
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
      const approvals = await approvalServiceExtended.getApprovalsByProject(projectId, '');

      console.log('🔍 DEBUG - Approvals für Communication geladen:', approvals);

      // Finde das richtige Approval für diese campaignId
      const approval = approvals.find(a => a.campaignId === campaignId);
      console.log('🔍 DEBUG - Approval für campaignId gefunden:', approval);

      // Verwende approval.history statt campaign.approvalData.feedbackHistory (wie in funktionierender Freigabe-Seite)
      const historyData = approval?.history?.filter(h => h.details?.comment) || [];
      console.log('🔍 DEBUG - History mit Comments gefunden:', historyData.length, historyData);

      // Transformiere history zu feedbackHistory Format (wie in funktionierender Freigabe-Seite)
      const feedbackHistoryData = historyData.map(h => ({
        author: h.actorName || 'Teammitglied',
        comment: h.details?.comment || '',
        requestedAt: h.timestamp,
        action: h.action
      }));

      console.log('🔍 DEBUG - Transformierte Feedback-History:', feedbackHistoryData);

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

  const formatLastMessageText = () => {
    if (!lastMessageDate) return 'Keine Nachrichten';

    const now = new Date();
    const diffInMs = now.getTime() - lastMessageDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      return diffInHours === 0 ? 'Letzte Nachricht: vor wenigen Minuten' : `Letzte Nachricht: vor ${diffInHours}h`;
    }

    return `Letzte Nachricht: vor ${diffInDays} Tag${diffInDays === 1 ? '' : 'en'}`;
  };

  if (!campaignId) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-500">
            Erstellen Sie eine Pressemeldung, um Medien, PDF-Historie und Kommunikation anzuzeigen
          </p>
        </div>
      </div>
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
          mediaItems={mediaItems.map(item => ({
            id: item.id,
            filename: item.metadata?.fileName || `Asset-${item.id}`,
            name: item.metadata?.fileName || `Asset-${item.id}`,
            mimeType: item.metadata?.fileType || (item.type === 'asset' ? 'image/jpeg' : 'application/octet-stream'),
            size: item.metadata?.fileSize || 0,
            url: item.metadata?.thumbnailUrl || '',
            thumbnailUrl: item.metadata?.thumbnailUrl || '',
            uploadedAt: new Date(),
            uploadedBy: { id: '', name: '', email: '' },
            organizationId: '',
            metadata: {}
          }))}
          onMediaSelect={(mediaId) => {
            console.log('🔍 DEBUG - Media ID:', mediaId);
            console.log('🔍 DEBUG - Alle mediaItems:', mediaItems);

            // Fullscreen-Viewer öffnen (wie in funktionierender Freigabe-Seite)
            const media = mediaItems.find(item => item.id === mediaId);
            console.log('🔍 DEBUG - Gefundenes Media:', media);

            if (media) {
              const url = media.metadata?.thumbnailUrl || media.metadata?.downloadUrl;
              console.log('🔍 DEBUG - URL zum Öffnen:', url);

              if (url) {
                window.open(url, '_blank');
              } else {
                console.log('❌ Keine URL gefunden in media.metadata');
              }
            }
          }}
        />

        {/* PDF-Historie */}
        <PDFHistoryToggleBox
          id="pdf-history"
          title="PDF-Historie"
          count={pdfVersions.length}
          isExpanded={expandedToggles['pdf-history'] || false}
          onToggle={handleToggle}
          pdfVersions={pdfVersions}
          onVersionSelect={(version) => {
            console.log('PDF-Version ausgewählt:', version);
          }}
          showDownloadButtons={true}
        />

        {/* Kommunikation */}
        <CommunicationToggleBox
          id="communication"
          title="Kommunikation"
          count={communicationCount}
          isExpanded={expandedToggles['communication'] || false}
          onToggle={handleToggle}
          communications={feedbackHistory.sort((a, b) => {
            // Sortiere nach timestamp - älteste zuerst (wie in der funktionierenden Freigabe-Seite)
            const aTime = a.requestedAt ? (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt as any).getTime()) : 0;
            const bTime = b.requestedAt ? (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt as any).getTime()) : 0;
            return aTime - bTime;
          }).map((feedback, index) => {
            // KORREKTE Erkennung basierend auf action-Feld
            const isCustomer = (feedback as any).action === 'changes_requested';

            // Namen und Avatar basierend auf isCustomer
            let senderName, senderAvatar;
            if (isCustomer) {
              // KUNDE: Grüner Avatar
              senderName = feedback.author || 'Kunde';
              senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`;
            } else {
              // TEAM: Blauer Avatar
              senderName = feedback.author || 'Teammitglied';
              senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
            }

            return {
              id: `feedback-${index}`,
              type: 'feedback' as const,
              content: feedback.comment || '',
              message: feedback.comment || '',
              sender: {
                id: 'unknown',
                name: senderName,
                email: '',
                role: isCustomer ? 'customer' as const : 'agency' as const,
                avatar: senderAvatar
              },
              timestamp: feedback.requestedAt ? (feedback.requestedAt instanceof Date ? feedback.requestedAt : new Date(feedback.requestedAt as any)) : new Date(),
              isCustomer: isCustomer
            };
          })}
          onNewMessage={() => {
            console.log('Neue Nachricht');
            loadCommunicationData(); // Reload communication data
          }}
          allowNewMessages={true}
        />
      </Suspense>
    </div>
  );
}