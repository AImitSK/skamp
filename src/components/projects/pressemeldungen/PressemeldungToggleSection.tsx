// src/components/projects/pressemeldungen/PressemeldungToggleSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { MediaToggleBox, PDFHistoryToggleBox, CommunicationToggleBox } from '@/components/customer-review/toggle';
import { mediaService } from '@/lib/firebase/media-service';
import { pdfVersionsService } from '@/lib/firebase/pdf-versions-service';
import { notificationsService } from '@/lib/firebase/notifications-service';
import { CampaignAssetAttachment } from '@/types/pr';
import { PDFVersion } from '@/types/customer-review';

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
      // TODO: Implement media loading for campaign
      // For now, return empty array
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

      // TODO: Implement communication data loading
      // For now, set default values
      setCommunicationCount(0);
      setLastMessageDate(null);
    } catch (error) {
      console.error('Fehler beim Laden der Kommunikationsdaten:', error);
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
      {/* Angehängte Medien */}
      <MediaToggleBox
        id="media"
        title="Angehängte Medien"
        subtitle="Diese werden nach Ihrer Freigabe mit der Mitteilung versendet"
        count={mediaItems.length}
        isExpanded={expandedToggles['media'] || false}
        onToggle={handleToggle}
        mediaItems={mediaItems}
        onMediaSelect={(mediaId) => {
          console.log('Medium ausgewählt:', mediaId);
        }}
      />

      {/* PDF-Historie */}
      <PDFHistoryToggleBox
        id="pdf-history"
        title="PDF-Historie"
        subtitle="Alle Versionen der Pressemitteilung"
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
        subtitle={formatLastMessageText()}
        count={communicationCount}
        isExpanded={expandedToggles['communication'] || false}
        onToggle={handleToggle}
        communications={[]}
        onNewMessage={() => {
          console.log('Neue Nachricht');
          loadCommunicationData(); // Reload communication data
        }}
        allowNewMessages={true}
      />
    </div>
  );
}