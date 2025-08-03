// src/app/dashboard/pr-tools/campaigns/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import EmailSendModal from "@/components/pr/EmailSendModal";
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon,
  EnvelopeIcon,
  UsersIcon,
  DocumentTextIcon,
  PhotoIcon,
  PencilIcon,
  PaperAirplaneIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  FolderIcon,
  DocumentIcon
} from "@heroicons/react/20/solid";

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message, 
  action 
}: { 
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'info' || type === 'success' ? 'text-blue-400' : type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>
            {message && <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>{message}</Text>}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Status configuration
const statusConfig: Record<PRCampaignStatus, { label: string; color: "zinc" | "yellow" | "orange" | "teal" | "blue" | "indigo" | "green"; icon: React.ElementType }> = {
  draft: {
    label: 'Entwurf',
    color: 'zinc',
    icon: PencilSquareIcon,
  },
  in_review: {
    label: 'In Prüfung',
    color: 'yellow',
    icon: ClockIcon,
  },
  changes_requested: {
    label: 'Änderung erbeten',
    color: 'orange',
    icon: ExclamationCircleIcon,
  },
  approved: {
    label: 'Freigegeben',
    color: 'teal',
    icon: CheckBadgeIcon,
  },
  scheduled: {
    label: 'Geplant',
    color: 'blue',
    icon: ClockIcon,
  },
  sending: {
    label: 'Wird gesendet',
    color: 'indigo',
    icon: PaperAirplaneIcon,
  },
  sent: {
    label: 'Gesendet',
    color: 'green',
    icon: CheckCircleIcon,
  },
  archived: {
    label: 'Archiviert',
    color: 'zinc',
    icon: ArchiveBoxIcon,
  },
};

// Helper functions
function formatDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Status Badge Component
function StatusBadge({ status }: { status: PRCampaignStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge color={config.color} className="inline-flex items-center gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Info Card Component
function InfoCard({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-500" />
          {title}
        </h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

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

  return (
    <Dialog open={isOpen} onClose={onClose} size="2xl">
      <DialogTitle>Feedback-Historie</DialogTitle>
      <DialogBody>
        {campaign.approvalData.feedbackHistory.length === 0 ? (
          <Text className="text-center py-8">Noch kein Feedback vorhanden</Text>
        ) : (
          <div className="space-y-4">
            {campaign.approvalData.feedbackHistory.map((feedback, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg ${
                  feedback.author === 'System' 
                    ? "bg-gray-50 border border-gray-200" 
                    : feedback.author === 'Kunde'
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-orange-50 border border-orange-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium flex items-center gap-2 ${
                    feedback.author === 'System' ? "text-gray-700" : 
                    feedback.author === 'Kunde' ? "text-blue-900" : "text-orange-900"
                  }`}>
                    {feedback.author === 'Kunde' && <ChatBubbleLeftRightIcon className="h-4 w-4" />}
                    {feedback.author === 'System' && <InformationCircleIcon className="h-4 w-4" />}
                    {feedback.author}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(feedback.requestedAt)}
                  </span>
                </div>
                <p className={`text-sm whitespace-pre-wrap ${
                  feedback.author === 'System' ? "text-gray-600 italic" : 
                  feedback.author === 'Kunde' ? "text-blue-800" : "text-orange-800"
                }`}>
                  {feedback.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogBody>
      <DialogActions>
        <Button plain onClick={onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CampaignDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  const loadCampaign = useCallback(async () => {
    if (!user || !campaignId) return;
    setLoading(true);
    setError(null);
    
    try {
      const data = await prService.getById(campaignId);
      if (!data) {
        setError('Kampagne nicht gefunden');
        return;
      }
      setCampaign(data);
    } catch (err) {
      setError('Fehler beim Laden der Kampagne');
    } finally {
      setLoading(false);
    }
  }, [user, campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  const handleDelete = async () => {
    if (!campaign) return;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Kampagne löschen',
      message: `Möchten Sie die Kampagne "${campaign.title}" wirklich unwiderruflich löschen?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await prService.delete(campaign.id!);
          showAlert('success', 'Kampagne gelöscht');
          router.push('/dashboard/pr-tools/campaigns');
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen', 'Die Kampagne konnte nicht gelöscht werden.');
        }
      }
    });
  };

  const handleCopyApprovalLink = async () => {
    if (!campaign?.approvalData?.shareId) return;
    
    try {
      const url = prService.getApprovalUrl(campaign.approvalData.shareId);
      await navigator.clipboard.writeText(url);
      showAlert('success', 'Link kopiert', 'Der Freigabe-Link wurde in die Zwischenablage kopiert.');
    } catch (error) {
      showAlert('error', 'Fehler', 'Der Link konnte nicht kopiert werden.');
    }
  };

  const canEdit = campaign && (campaign.status === 'draft' || campaign.status === 'changes_requested');
  const canSend = campaign && (campaign.status === 'draft' || campaign.status === 'approved');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Kampagne...</Text>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-8">
        <Alert type="error" title="Fehler" message={error || 'Kampagne nicht gefunden'} />
        <div className="mt-4">
          <Button onClick={() => router.push('/dashboard/pr-tools/campaigns')} plain>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Alert */}
        {alert && (
          <div className="mb-4">
            <Alert type={alert.type} title={alert.title} message={alert.message} />
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <Button 
            plain 
            onClick={() => router.push('/dashboard/pr-tools/campaigns')}
            className="mb-4 flex items-center gap-2 whitespace-nowrap"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Zurück zur Übersicht
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <Heading>{campaign.title}</Heading>
              <div className="flex items-center gap-4 mt-2">
                <StatusBadge status={campaign.status} />
                {campaign.clientName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <Link href={`/dashboard/contacts/crm/companies/${campaign.clientId}`} className="text-[#005fab] hover:text-[#004a8c]">
                      {campaign.clientName}
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {campaign.status === 'sent' && (
                <Button href={`/dashboard/pr-tools/campaigns/campaigns/${campaign.id}/analytics`} plain>
                  <ChartBarIcon />
                  Analytics
                </Button>
              )}
              {canEdit && (
                <Button 
                  href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                >
                  <PencilIcon />
                  Bearbeiten
                </Button>
              )}
              {canSend && (
                <Button 
                  onClick={() => setShowSendModal(true)}
                  className="whitespace-nowrap"
                >
                  <PaperAirplaneIcon />
                  Versenden
                </Button>
              )}
              <Button 
                plain
                onClick={handleDelete}
                className="text-red-600 hover:text-red-500 whitespace-nowrap"
              >
                <TrashIcon />
                Löschen
              </Button>
            </div>
          </div>
        </div>

        {/* Approval Banner if applicable */}
        {campaign.approvalRequired && campaign.approvalData && (
          <div className={`mb-6 p-4 rounded-lg border ${
            campaign.status === 'in_review' ? 'bg-yellow-50 border-yellow-200' :
            campaign.status === 'changes_requested' ? 'bg-orange-50 border-orange-200' :
            campaign.status === 'approved' ? 'bg-green-50 border-green-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Freigabe-Status</h3>
                <Text className="text-sm">
                  {campaign.status === 'in_review' && 'Diese Kampagne wartet auf Kundenfreigabe.'}
                  {campaign.status === 'changes_requested' && 'Der Kunde hat Änderungen angefordert.'}
                  {campaign.status === 'approved' && `Freigegeben am ${formatDate(campaign.approvalData.approvedAt)}`}
                </Text>
                
                {campaign.approvalData.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
                  <button
                    onClick={() => setShowFeedbackHistory(true)}
                    className="mt-2 text-sm text-[#005fab] hover:text-[#004a8c] flex items-center gap-1"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    {campaign.approvalData.feedbackHistory.length} Feedback-Einträge
                  </button>
                )}
              </div>
              
              {campaign.approvalData.shareId && (
                <div className="flex gap-2">
                  <Button
                    href={`/freigabe/${campaign.approvalData.shareId}`}
                    target="_blank"
                    plain
                    className="text-sm whitespace-nowrap"
                  >
                    <EyeIcon />
                    Freigabe-Seite
                  </Button>
                  <Button
                    plain
                    onClick={handleCopyApprovalLink}
                    className="text-sm whitespace-nowrap"
                  >
                    <LinkIcon />
                    Link kopieren
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content */}
            <InfoCard title="Inhalt der Pressemitteilung" icon={DocumentTextIcon}>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: campaign.contentHtml }}
              />
            </InfoCard>

            {/* Attached Assets */}
            {campaign.attachedAssets && campaign.attachedAssets.length > 0 && (
              <InfoCard title="Angehängte Medien" icon={PhotoIcon}>
                <div className="space-y-3">
                  {campaign.attachedAssets.map((asset, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {asset.type === 'folder' ? (
                        <>
                          <FolderIcon className="h-6 w-6 text-gray-400" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{asset.metadata.folderName}</p>
                            {asset.metadata.description && (
                              <p className="text-xs text-gray-500">{asset.metadata.description}</p>
                            )}
                          </div>
                          <Badge color="blue" className="text-xs">Ordner</Badge>
                        </>
                      ) : (
                        <>
                          {asset.metadata.fileType?.startsWith('image/') ? (
                            <img 
                              src={asset.metadata.thumbnailUrl} 
                              alt={asset.metadata.fileName}
                              className="h-10 w-10 object-cover rounded"
                            />
                          ) : (
                            <DocumentIcon className="h-6 w-6 text-gray-400" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm truncate">{asset.metadata.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {asset.metadata.fileType?.split('/')[1]?.toUpperCase() || 'Datei'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Campaign Details */}
            <InfoCard title="Kampagnen-Details" icon={InformationCircleIcon}>
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
                    {campaign.recipientCount?.toLocaleString('de-DE') || 0}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm text-gray-500">Angehängte Medien</dt>
                  <dd className="font-medium flex items-center gap-2">
                    <PhotoIcon className="h-4 w-4 text-gray-400" />
                    {campaign.attachedAssets?.length || 0}
                  </dd>
                </div>
              </dl>
            </InfoCard>

            {/* Timestamps */}
            <InfoCard title="Zeitleiste" icon={ClockIcon}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <span className="text-gray-600">Erstellt:</span>
                    <span className="ml-2">{formatDate(campaign.createdAt)}</span>
                  </div>
                </div>
                {campaign.sentAt && (
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-gray-600">Versendet:</span>
                      <span className="ml-2">{formatDate(campaign.sentAt)}</span>
                    </div>
                  </div>
                )}
                {campaign.scheduledAt && (
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <span className="text-gray-600">Geplant für:</span>
                      <span className="ml-2">{formatDate(campaign.scheduledAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>
          </div>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={campaign}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            showAlert('success', 'Kampagne versendet', 'Die Kampagne wurde erfolgreich versendet.');
            loadCampaign();
          }}
        />
      )}

      {/* Feedback History Modal */}
      <FeedbackHistoryModal
        isOpen={showFeedbackHistory}
        onClose={() => setShowFeedbackHistory(false)}
        campaign={campaign}
      />

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
              confirmDialog.type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <ExclamationTriangleIcon className={`h-6 w-6 ${
                confirmDialog.type === 'danger' ? 'text-red-600' : 'text-yellow-600'
              }`} />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogBody className="mt-2">
                <Text>{confirmDialog.message}</Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button
              plain
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Abbrechen
            </Button>
            <Button
              color={confirmDialog.type === 'danger' ? 'zinc' : 'zinc'}
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
            >
              {confirmDialog.type === 'danger' ? 'Löschen' : 'Bestätigen'}
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </>
  );
}