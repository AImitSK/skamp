// src/components/projects/pressemeldungen/components/ToggleDataHelpers.ts

import { CampaignAssetAttachment } from '@/types/pr';

/**
 * Transformiert Campaign-Assets zu MediaItems für die MediaToggleBox
 */
export function transformMediaItems(mediaItems: CampaignAssetAttachment[]) {
  return mediaItems.map(item => ({
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
  }));
}

/**
 * Transformiert Feedback-History zu Communication-Items für die CommunicationToggleBox
 */
export function transformCommunicationItems(feedbackHistory: any[]) {
  return feedbackHistory
    .sort((a, b) => {
      // Sortiere nach timestamp - älteste zuerst
      const aTime = a.requestedAt
        ? (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt as any).getTime())
        : 0;
      const bTime = b.requestedAt
        ? (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt as any).getTime())
        : 0;
      return aTime - bTime;
    })
    .map((feedback, index) => {
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
        timestamp: feedback.requestedAt
          ? (feedback.requestedAt instanceof Date ? feedback.requestedAt : new Date(feedback.requestedAt as any))
          : new Date(),
        isCustomer: isCustomer
      };
    });
}

/**
 * Formatiert das Datum der letzten Nachricht für die Anzeige
 */
export function formatLastMessageText(lastMessageDate: Date | null): string {
  if (!lastMessageDate) return 'Keine Nachrichten';

  const now = new Date();
  const diffInMs = now.getTime() - lastMessageDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    return diffInHours === 0
      ? 'Letzte Nachricht: vor wenigen Minuten'
      : `Letzte Nachricht: vor ${diffInHours}h`;
  }

  return `Letzte Nachricht: vor ${diffInDays} Tag${diffInDays === 1 ? '' : 'en'}`;
}
