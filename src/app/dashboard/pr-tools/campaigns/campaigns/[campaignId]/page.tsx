// src/app/dashboard/pr/campaigns/[campaignId]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { prService } from '@/lib/firebase/pr-service';
import { PRCampaign, PRCampaignStatus } from '@/types/pr';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  PhotoIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  EyeIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { canEditCampaign } from '@/lib/utils/campaign-utils';
import EmailSendModal from '@/components/pr/EmailSendModal';
import clsx from 'clsx';

// Badge Color Type
type BadgeColor = "zinc" | "yellow" | "orange" | "green" | "blue" | "indigo" | "red" | "purple" | "pink" | "amber" | "emerald" | "teal" | "cyan" | "sky" | "violet" | "fuchsia" | "rose" | "lime";

// Status-Konfiguration
const statusConfig: Record<PRCampaignStatus, { label: string; color: BadgeColor }> = {
  draft: { label: 'Entwurf', color: 'zinc' },
  in_review: { label: 'In Prüfung', color: 'yellow' },
  changes_requested: { label: 'Änderungen erbeten', color: 'orange' },
  approved: { label: 'Freigegeben', color: 'green' },
  scheduled: { label: 'Geplant', color: 'blue' },
  sending: { label: 'Wird gesendet', color: 'indigo' },
  sent: { label: 'Gesendet', color: 'indigo' },
  archived: { label: 'Archiviert', color: 'zinc' }
};

// Feedback History Modal
function FeedbackHistoryModal({ 
  isOpen, 
  onClose, 
  campaign 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  campaign: PRCampaign;
}) {
  if (!isOpen || !campaign.approvalData?.feedbackHistory) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="sticky top-0 bg-white border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Feedback-Historie</h3>
                <p className="text-sm text-gray-500 mt-1">{campaign.title}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {campaign.approvalData.feedbackHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch kein Feedback vorhanden</p>
            ) : (
              <div className="space-y-4">
                {campaign.approvalData.feedbackHistory.map((feedback, index) => (
                  <div 
                    key={index} 
                    className={clsx(
                      "p-4 rounded-lg",
                      feedback.author === 'System' 
                        ? "bg-gray-50 border border-gray-200" 
                        : feedback.author === 'Kunde'
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-orange-50 border border-orange-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={clsx(
                        "font-medium flex items-center gap-2",
                        feedback.author === 'System' ? "text-gray-700" : 
                        feedback.author === 'Kunde' ? "text-blue-900" : "text-orange-900"
                      )}>
                        {feedback.author === 'Kunde' && <ChatBubbleLeftRightIcon className="h-4 w-4" />}
                        {feedback.author === 'System' && <InformationCircleIcon className="h-4 w-4" />}
                        {feedback.author}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(feedback.requestedAt)}
                      </span>
                    </div>
                    <p className={clsx(
                      "text-sm whitespace-pre-wrap",
                      feedback.author === 'System' ? "text-gray-600 italic" : 
                      feedback.author === 'Kunde' ? "text-blue-800" : "text-orange-800"
                    )}>
                      {feedback.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {campaign.approvalData.feedbackHistory.length} Einträge
              </div>
              <Button onClick={onClose}>Schließen</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user && campaignId) {
      loadCampaign();
    }
  }, [user, campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const data = await prService.getById(campaignId);
      if (!data) {
        setError('Kampagne nicht gefunden');
        return;
      }
      setCampaign(data);
    } catch (err) {
      console.error('Fehler beim Laden der Kampagne:', err);
      setError('Fehler beim Laden der Kampagne');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign || !confirm(`Möchten Sie die Kampagne "${campaign.title}" wirklich löschen?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await prService.delete(campaign.id!);
      router.push('/dashboard/pr');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen der Kampagne');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-indigo-600 rounded-full animate-bounce"></div>
          <p className="mt-4 text-gray-500">Lade Kampagne...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Kampagne nicht gefunden'}</p>
        <Link href="/dashboard/pr">
          <Button>Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  const editStatus = canEditCampaign(campaign);
  const canSend = campaign.status === 'draft' || campaign.status === 'approved';
  const statusInfo = statusConfig[campaign.status] || { label: 'Unbekannt', color: 'zinc' as const };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/dashboard/pr" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Zurück zur Übersicht
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <Heading>{campaign.title}</Heading>
            <div className="mt-2 flex items-center gap-4">
              <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
              {campaign.clientName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  {campaign.clientName}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarIcon className="h-4 w-4" />
                Erstellt: {formatDate(campaign.createdAt)}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            {campaign.status === 'sent' && (
              <Link href={`/dashboard/pr/campaigns/${campaign.id}/analytics`}>
                <Button plain>
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Analytics
                </Button>
              </Link>
            )}
            
            {editStatus.canEdit && (
              <Link href={`/dashboard/pr/campaigns/edit/${campaign.id}`}>
                <Button plain>
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Bearbeiten
                </Button>
              </Link>
            )}
            
            {canSend && (
              <Button 
                color="indigo"
                onClick={() => setShowSendModal(true)}
              >
                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                Versenden
              </Button>
            )}
            
            <Button 
              plain
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-500"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              {isDeleting ? 'Lösche...' : 'Löschen'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Freigabe-Info wenn vorhanden */}
          {campaign.approvalRequired && campaign.approvalData && (
            <div className={clsx(
              "p-4 rounded-lg border",
              campaign.status === 'in_review' && "bg-yellow-50 border-yellow-200",
              campaign.status === 'changes_requested' && "bg-orange-50 border-orange-200",
              campaign.status === 'approved' && "bg-green-50 border-green-200"
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Freigabe-Status</h3>
                  <p className="text-sm text-gray-600">
                    {campaign.status === 'in_review' && 'Diese Kampagne wartet auf Kundenfreigabe.'}
                    {campaign.status === 'changes_requested' && 'Der Kunde hat Änderungen angefordert.'}
                    {campaign.status === 'approved' && `Freigegeben am ${formatDate(campaign.approvalData.approvedAt)}`}
                  </p>
                  
                  {campaign.approvalData.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
                    <button
                      onClick={() => setShowFeedbackHistory(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      {campaign.approvalData.feedbackHistory.length} Feedback-Einträge anzeigen
                    </button>
                  )}
                </div>
                
                {campaign.approvalData.shareId && (
                  <div className="flex gap-2">
                    <Link 
                      href={`/freigabe/${campaign.approvalData.shareId}`}
                      target="_blank"
                    >
                      <Button plain className="text-sm">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Freigabe-Seite
                      </Button>
                    </Link>
                    <Button
                      plain
                      onClick={async () => {
                        const url = prService.getApprovalUrl(campaign.approvalData!.shareId);
                        await navigator.clipboard.writeText(url);
                        alert('Link kopiert!');
                      }}
                      className="text-sm"
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Link kopieren
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-400" />
              Inhalt der Pressemitteilung
            </h2>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: campaign.contentHtml }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Kampagnen-Details</h3>
            
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-500">Verteiler</dt>
                <dd className="font-medium">
                  {campaign.distributionListNames?.join(', ') || campaign.distributionListName}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm text-gray-500">Empfänger</dt>
                <dd className="font-medium flex items-center gap-2">
                  <UsersIcon className="h-4 w-4 text-gray-400" />
                  {campaign.recipientCount?.toLocaleString() || 0}
                </dd>
              </div>
              
              <div>
                <dt className="text-sm text-gray-500">Angehängte Medien</dt>
                <dd className="font-medium flex items-center gap-2">
                  <PhotoIcon className="h-4 w-4 text-gray-400" />
                  {campaign.attachedAssets?.length || 0}
                </dd>
              </div>
              
              {campaign.sentAt && (
                <div>
                  <dt className="text-sm text-gray-500">Versendet am</dt>
                  <dd className="font-medium">{formatDate(campaign.sentAt)}</dd>
                </div>
              )}
              
              {campaign.scheduledAt && (
                <div>
                  <dt className="text-sm text-gray-500">Geplant für</dt>
                  <dd className="font-medium">{formatDate(campaign.scheduledAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Attached Assets */}
          {campaign.attachedAssets && campaign.attachedAssets.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Angehängte Medien</h3>
              <div className="space-y-2">
                {campaign.attachedAssets.map((asset, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    {asset.type === 'folder' ? (
                      <>
                        <PhotoIcon className="h-4 w-4 text-gray-400" />
                        <span>{asset.metadata.folderName}</span>
                        <Badge color="blue" className="text-xs">Ordner</Badge>
                      </>
                    ) : (
                      <>
                        <DocumentTextIcon className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{asset.metadata.fileName}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSendModal && (
        <EmailSendModal
          campaign={campaign}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            loadCampaign();
          }}
        />
      )}

      <FeedbackHistoryModal
        isOpen={showFeedbackHistory}
        onClose={() => setShowFeedbackHistory(false)}
        campaign={campaign}
      />
    </div>
  );
}