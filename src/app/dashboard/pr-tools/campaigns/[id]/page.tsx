// src\app\dashboard\pr-tools\campaigns\[id]\page.tsx

"use client";

import { PRCampaign } from '@/types/pr';
import { Button } from '@/components/button';
import { 
  ExclamationCircleIcon, 
  CheckCircleIcon, 
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/20/solid';
import { prService } from '@/lib/firebase/pr-service';
import { useRouter } from 'next/navigation';
import { useState } from 'react';



interface ApprovalFeedbackBannerProps {
  campaign: PRCampaign;
  onResubmit?: () => void;
  showToast?: (type: 'success' | 'error', title: string, message?: string) => void;
}

export function ApprovalFeedbackBanner({ 
  campaign, 
  onResubmit,
  showToast = () => {} 
}: ApprovalFeedbackBannerProps) {
  const router = useRouter();
  const [isResubmitting, setIsResubmitting] = useState(false);

  if (!campaign.approvalRequired || !campaign.approvalData) {
    return null;
  }

  const lastFeedback = campaign.approvalData.feedbackHistory
    ?.filter(f => f.author === 'Kunde')
    ?.slice(-1)[0];

  const handleResubmit = async () => {
    try {
      setIsResubmitting(true);
      await prService.resubmitForApproval(campaign.id!);
      showToast('success', 'Erneut zur Freigabe gesendet', 'Die Kampagne wurde erneut an den Kunden gesendet.');
      
      if (onResubmit) {
        onResubmit();
      } else {
        // Reload der Seite oder Navigation
        router.refresh();
      }
    } catch (error) {
      showToast('error', 'Fehler beim erneuten Senden', 'Die Kampagne konnte nicht erneut gesendet werden.');
      console.error('Fehler beim erneuten Senden:', error);
    } finally {
      setIsResubmitting(false);
    }
  };

  // Status: Änderungen angefordert
  if (campaign.status === 'changes_requested' && lastFeedback) {
    return (
      <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationCircleIcon className="h-5 w-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-orange-900">
              Änderungen vom Kunden angefordert
            </h3>
            <div className="mt-2 text-sm text-orange-800">
              <p className="font-medium">Feedback:</p>
              <p className="mt-1 italic bg-orange-100 rounded p-2 border border-orange-200">
                "{lastFeedback.comment}"
              </p>
              <p className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                <ChatBubbleLeftRightIcon className="h-3 w-3" />
                {lastFeedback.requestedAt && formatDate(lastFeedback.requestedAt)} • {lastFeedback.author}
              </p>
            </div>
            
            {/* Medien-Hinweis wenn vorhanden */}
            {campaign.attachedAssets && campaign.attachedAssets.length > 0 && (
              <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700">
                <p className="font-medium">Hinweis:</p>
                <p>Die angehängten Medien ({campaign.attachedAssets.length}) sind ebenfalls Teil der Freigabe.</p>
              </div>
            )}
            
            <Button
              onClick={handleResubmit}
              disabled={isResubmitting}
              color="indigo"
              className="mt-3"
            >
              {isResubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Wird gesendet...
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Nach Überarbeitung erneut zur Freigabe senden
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Status: In Prüfung
  if (campaign.status === 'in_review') {
    return (
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <ClockIcon className="h-5 w-5 text-yellow-600 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-900">
              Warten auf Kundenfreigabe
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Diese Kampagne wurde zur Freigabe an den Kunden gesendet und wartet auf eine Rückmeldung.
            </p>
            {campaign.attachedAssets && campaign.attachedAssets.length > 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                {campaign.attachedAssets.length} Medien sind Teil der Freigabe.
              </p>
            )}
          </div>
          <Button
            plain
            onClick={() => router.push('/dashboard/freigaben')}
            className="ml-4"
          >
            Zum Freigaben-Center
          </Button>
        </div>
      </div>
    );
  }

  // Status: Freigegeben
  if (campaign.status === 'approved') {
    return (
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900">
              Vom Kunden freigegeben
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Diese Kampagne wurde vom Kunden freigegeben und kann versendet werden.
            </p>
            {campaign.approvalData.approvedAt && (
              <p className="text-xs text-green-600 mt-2">
                Freigegeben am {formatDate(campaign.approvalData.approvedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Helper function
function formatDate(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}