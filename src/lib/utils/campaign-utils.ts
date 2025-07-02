// src/lib/utils/campaign-utils.ts

import { PRCampaign } from '@/types/pr';

/**
 * Prüft ob eine Kampagne bearbeitet werden kann
 */
export function canEditCampaign(campaign: PRCampaign): { 
  canEdit: boolean; 
  reason?: string;
  showResubmitPrompt?: boolean;
} {
  // Debug log
  console.log('🔍 canEditCampaign called with:', {
    id: campaign.id,
    status: campaign.status,
    approvalRequired: campaign.approvalRequired
  });

  // Bereits versendete Kampagnen können nicht bearbeitet werden
  if (campaign.status === 'sent' || campaign.status === 'archived') {
    return { 
      canEdit: false, 
      reason: 'Versendete oder archivierte Kampagnen können nicht bearbeitet werden.' 
    };
  }

  // Wenn keine Freigabe erforderlich ist, kann immer bearbeitet werden
  if (!campaign.approvalRequired) {
    return { canEdit: true };
  }

  // MIT Freigabe-Anforderung:
  switch (campaign.status) {
    case 'draft':
      // Entwürfe können immer bearbeitet werden
      return { canEdit: true };
      
    case 'changes_requested':
      // WICHTIG: Wenn Änderungen angefordert wurden, MUSS bearbeitet werden können!
      console.log('✅ Campaign has changes_requested - allowing edit');
      return { 
        canEdit: true,
        showResubmitPrompt: true // Zeige Hinweis zum erneuten Senden
      };
      
    case 'in_review':
      // In Prüfung = nicht bearbeitbar
      return { 
        canEdit: false, 
        reason: 'Die Kampagne befindet sich in der Kundenprüfung und kann nicht bearbeitet werden.' 
      };
      

    case 'approved':
      // Freigegeben = nicht mehr bearbeitbar
      return { 
        canEdit: false, 
        reason: 'Die Kampagne wurde bereits freigegeben und kann nicht mehr bearbeitet werden.' 
      };
      
    default:
      console.log('⚠️ Unknown campaign status:', campaign.status);
      return { canEdit: true };
  }
}