// src/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { teamMemberService } from "@/lib/firebase/team-service-enhanced";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Alert } from "@/components/common/Alert";
import { StatusBadge } from "@/components/campaigns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useAlert } from "@/hooks/useAlert";
import { formatDate } from "@/utils/dateHelpers";
import { LOADING_SPINNER_SIZE, LOADING_SPINNER_BORDER } from "@/constants/ui";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/20/solid";
import {
  PencilIcon as PencilIconOutline,
  TrashIcon as TrashIconOutline, 
  PaperAirplaneIcon as PaperAirplaneIconOutline,
  DocumentDuplicateIcon as DocumentDuplicateIconOutline,
  EyeIcon as EyeIconOutline,
  ArrowDownTrayIcon as ArrowDownTrayIconOutline,
  ChartBarIcon as ChartBarIconOutline
} from "@heroicons/react/24/outline";
import { prService } from "@/lib/firebase/pr-service";
import { listsService } from "@/lib/firebase/lists-service";
import { PDFVersionHistory } from "@/components/campaigns/PDFVersionHistory";
import { FeedbackChatView } from "@/components/freigabe/FeedbackChatView";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { mediaService } from "@/lib/firebase/media-service";
import { boilerplatesService } from "@/lib/firebase/boilerplate-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import { DistributionList } from "@/types/lists";
import { CompanyEnhanced } from "@/types/crm-enhanced";
import { MediaAsset, MediaFolder } from "@/types/media";
import { TeamMember } from "@/types/international";
import EmailSendModal from "@/components/pr/EmailSendModal";





export default function CampaignDetailPage() {
  const t = useTranslations('campaigns');
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [company, setCompany] = useState<CompanyEnhanced | null>(null);
  const [distributionList, setDistributionList] = useState<DistributionList | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<TeamMember | null>(null);
  const [loadedBoilerplates, setLoadedBoilerplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Alert Management
  const { alert, showAlert } = useAlert();
  
  // Download Chat Transcript Function
  const downloadTranscript = () => {
    if (!campaign?.approvalData?.feedbackHistory || campaign.approvalData.feedbackHistory.length === 0) {
      return;
    }
    
    // Format der Transcript-Datei
    let transcript = t('detail.transcript.header') + `\n`;
    transcript += `==========================\n\n`;
    transcript += t('detail.transcript.campaign') + `: ${campaign.title}\n`;
    transcript += t('detail.transcript.customer') + `: ${(company as any)?.companyName || campaign.clientName || t('detail.transcript.unknown')}\n`;
    transcript += t('detail.transcript.createdAt') + `: ${new Date().toLocaleString('de-DE')}\n`;
    transcript += `\n----------------------------\n\n`;
    
    // Sortiere Nachrichten chronologisch
    const sortedHistory = [...campaign.approvalData.feedbackHistory].sort((a, b) => {
      const dateA = (a.requestedAt as any)?.toDate ? (a.requestedAt as any).toDate() : new Date((a.requestedAt as any));
      const dateB = (b.requestedAt as any)?.toDate ? (b.requestedAt as any).toDate() : new Date((b.requestedAt as any));
      return (dateA as any) - (dateB as any);
    });
    
    // Füge jede Nachricht hinzu
    sortedHistory.forEach((feedback, index) => {
      const timestamp = feedback.requestedAt?.toDate 
        ? new Date(feedback.requestedAt.toDate()).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : feedback.requestedAt 
        ? new Date((feedback.requestedAt as any)).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Unbekannt';
      
      transcript += `[${timestamp}] ${feedback.author}:\n`;
      transcript += `${feedback.comment}\n\n`;
    });
    
    transcript += `\n----------------------------\n`;
    transcript += t('detail.transcript.end') + `\n`;
    transcript += t('detail.transcript.autoGenerated') + `\n`;
    
    // Erstelle Blob und Download-Link
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Dateiname mit Datum
    const fileName = `Freigabe-Transcript_${campaign.title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showAlert('success', 'Transcript wurde heruntergeladen');
  };
  
  // Multi-Tenancy Avatar Helper
  const getTeamMemberAvatar = (member: TeamMember, size: number = 40): string => {
    if (member.photoUrl) {
      // Echtes Avatar verfügbar (Multi-Tenancy Avatar-System)
      return member.photoUrl;
    }
    
    // Fallback zu generiertem Avatar
    const displayName = member.displayName || 'Admin';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=005fab&color=fff&size=${size}`;
  };

  useEffect(() => {
    if (campaignId && user && currentOrganization) {
      loadCampaignData();
    }
  }, [campaignId, user, currentOrganization]);

  const loadCampaignData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load campaign
      const campaignData = await prService.getById(campaignId);
      if (!campaignData) {
        setError(t('detail.errors.notFound'));
        return;
      }
      
      // Lade erweiterte Approval-Daten mit feedbackHistory wenn ShareId vorhanden
      if (campaignData.approvalData?.shareId && campaignData.approvalData.shareId !== '') {
        try {
          const campaignWithFeedback = await prService.getCampaignByShareId(campaignData.approvalData.shareId);
          if (campaignWithFeedback?.approvalData?.feedbackHistory) {
            campaignData.approvalData.feedbackHistory = campaignWithFeedback.approvalData.feedbackHistory;
          }
        } catch (error) {
        }
      } else if ((campaignData.approvalData as any)?.customerApprovalMessage) {
        // Legacy-Support: Erstelle feedbackHistory aus alten Daten
        campaignData.approvalData!.feedbackHistory = [{
          comment: (campaignData.approvalData as any).customerApprovalMessage,
          requestedAt: (campaignData.updatedAt || campaignData.createdAt) as any,
          author: 'Ihre Nachricht (Legacy)'
        }];
      }
      
      setCampaign(campaignData);

      // Load related data in parallel
      const promises: Promise<any>[] = [];

      // Load company if exists
      if (campaignData.clientId && currentOrganization?.id) {
        promises.push(
          companiesEnhancedService.getById(currentOrganization.id, campaignData.clientId)
            .then(companyData => setCompany(companyData))
            .catch(err => {})
        );
      }

      // Load distribution list
      if (campaignData.distributionListId && currentOrganization?.id) {
        promises.push(
          listsService.getById(campaignData.distributionListId)
            .then(listData => setDistributionList(listData))
            .catch(err => {})
        );
      }

      // Load attached assets
      if (campaignData.attachedAssets && campaignData.attachedAssets.length > 0) {
        const assetIds = campaignData.attachedAssets
          .filter(a => a.type === 'asset' && a.assetId)
          .map(a => a.assetId!);
        
        const folderIds = campaignData.attachedAssets
          .filter(a => a.type === 'folder' && a.folderId)
          .map(a => a.folderId!);

        if (assetIds.length > 0) {
          promises.push(
            Promise.all(assetIds.map(id => mediaService.getMediaAssetById(id)))
              .then(assetsData => setAssets(assetsData.filter((asset): asset is MediaAsset => asset !== null)))
              .catch(err => {})
          );
        }

        if (folderIds.length > 0) {
          promises.push(
            Promise.all(folderIds.map(id => mediaService.getFolder(id)))
              .then(foldersData => setFolders(foldersData.filter((folder): folder is MediaFolder => folder !== null)))
              .catch(err => {})
          );
        }
      }

      // Load team members and find current admin
      if (currentOrganization?.id) {
        promises.push(
          teamMemberService.getByOrganization(currentOrganization.id)
            .then(members => {
              setTeamMembers(members);
              // Find current admin (campaign creator)
              const admin = members.find(member => member.userId === campaignData.userId);
              setCurrentAdmin(admin || null);
            })
            .catch(err => {})
        );
      }

      // Load boilerplates if campaign has boilerplateSections with IDs
      if (campaignData.boilerplateSections && campaignData.boilerplateSections.length > 0 && currentOrganization?.id) {
        const boilerplateIds = campaignData.boilerplateSections
          .filter(section => section.boilerplateId)
          .map(section => section.boilerplateId);
        
        if (boilerplateIds.length > 0) {
          promises.push(
            // Load all boilerplates for organization and then filter by IDs
            boilerplatesService.getAll(currentOrganization.id)
            .then(allBoilerplates => {
              const matchingBoilerplates = allBoilerplates.filter(bp => 
                boilerplateIds.includes(bp.id!)
              );
              setLoadedBoilerplates(matchingBoilerplates);
            })
          );
        }
      }

      await Promise.all(promises);
    } catch (error) {
      setError(t('detail.errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await prService.delete(campaignId);
      showAlert('success', 'Kampagne gelöscht');
      router.push('/dashboard/pr-tools/campaigns');
    } catch (error) {
      showAlert('error', 'Fehler beim Löschen');
      setDeleting(false);
    }
  };

  const handleChangeAdmin = async (newAdminId: string) => {
    if (!campaign || !currentOrganization) return;

    try {
      // Update campaign with new admin
      await prService.update(campaignId, { userId: newAdminId } as any);
      
      // Update local state
      const newAdmin = teamMembers.find(member => member.userId === newAdminId);
      setCurrentAdmin(newAdmin || null);
      
      // Reload campaign data to reflect changes
      await loadCampaignData();

      showAlert('success', t('detail.success.adminChanged'), t('detail.success.adminChangedDesc', { name: newAdmin?.displayName || t('detail.newAdmin') }));
    } catch (error) {
      showAlert('error', t('detail.errors.adminChangeError'));
    }
  };

  const handleDuplicate = async () => {
    if (!campaign || !user) return;

    try {
      const newCampaignData = {
        ...campaign,
        title: `${campaign.title} ${t('detail.copyTitle')}`,
        status: 'draft' as const,
        scheduledAt: null,
        emailStats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          failed: 0
        }
      };

      delete (newCampaignData as any).id;
      delete (newCampaignData as any).createdAt;
      delete (newCampaignData as any).updatedAt;
      delete (newCampaignData as any).sentAt; // WICHTIG: sentAt nicht kopieren!

      const newCampaignId = await prService.create(newCampaignData);
      showAlert('success', 'Kampagne dupliziert');
      router.push(`/dashboard/pr-tools/campaigns/campaigns/${newCampaignId}`);
    } catch (error) {
      showAlert('error', 'Fehler beim Duplizieren');
    }
  };

  const handleRequestApproval = async () => {
    if (!campaign) return;

    try {
      const shareId = await prService.requestApproval(campaignId);
      await loadCampaignData(); // Reload to get updated status
      showAlert('success', t('detail.success.approvalRequested'), t('detail.success.approvalRequestedDesc'));
      setShowApprovalModal(false);
    } catch (error) {
      showAlert('error', t('detail.errors.approvalRequestError'));
    }
  };

  const handleResubmit = async () => {
    if (!campaign) return;

    try {
      await prService.resubmitForApproval(campaignId);
      await loadCampaignData();
      showAlert('success', t('detail.success.resubmitted'));
    } catch (error) {
      showAlert('error', t('detail.errors.resubmitError'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className={`animate-spin rounded-full ${LOADING_SPINNER_SIZE} ${LOADING_SPINNER_BORDER} mx-auto`}></div>
          <Text className="mt-4">{t('detail.loading')}</Text>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <Heading level={2}>{t('detail.error')}</Heading>
        <Text className="mt-2">{error || t('detail.errors.notFound')}</Text>
        <Button href="/dashboard/pr-tools/campaigns" className="mt-4">
          {t('detail.backToOverview')}
        </Button>
      </div>
    );
  }

  const canSend = campaign.status === 'draft' || campaign.status === 'approved';
  const canEdit = campaign.status === 'draft' || campaign.status === 'changes_requested';
  const canRequestApproval = campaign.status === 'draft' && campaign.approvalRequired;
  const canResubmit = campaign.status === 'changes_requested';

  return (
    <div className="max-w-6xl mx-auto">
      {/* Alert */}
      {alert && (
        <div className="mb-6">
          <Alert type={alert.type} title={alert.title} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/pr-tools/campaigns')}
          className="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-900 border-0 rounded-md px-3 py-2 text-sm font-medium mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {t('detail.backToCampaigns')}
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <Heading level={1}>{campaign.title}</Heading>
            <div className="mt-2 flex items-center gap-4">
              <StatusBadge status={campaign.status} showDescription={false} />
              <Text className="text-sm text-gray-600">
                {t('detail.createdAt', { date: formatDate(campaign.createdAt) })}
              </Text>
            </div>
          </div>
          
          {/* Actions and Admin */}
          <div className="flex items-center gap-2">
            {/* Admin Dropdown */}
            {teamMembers.length > 1 && (
              <Dropdown>
                <DropdownButton className="inline-flex items-center gap-2 px-3 py-1.5 !bg-gray-100 hover:!bg-gray-200 !text-gray-700 !border-gray-300 rounded-full text-sm">
                  <img
                    src={getTeamMemberAvatar(currentAdmin!, 16)}
                    alt={currentAdmin?.displayName ?? ''}
                    className="w-4 h-4 rounded-full"
                  />
                  {t('detail.admin')}
                </DropdownButton>
                <DropdownMenu anchor="bottom end" className="w-64">
                  {teamMembers
                    .filter(member => member.userId !== campaign?.userId)
                    .map((member) => (
                      <DropdownItem 
                        key={member.userId}
                        onClick={() => handleChangeAdmin(member.userId)}
                        className="text-left justify-start items-start"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <img
                            src={getTeamMemberAvatar(member, 32)}
                            alt={member.displayName}
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="text-left">
                            <div className="font-medium">{member.displayName}</div>
                            <div className="text-xs text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </DropdownItem>
                    ))}
                </DropdownMenu>
              </Dropdown>
            )}

            {/* Actions Dropdown */}
            <Dropdown>
              <DropdownButton className="inline-flex items-center gap-2">
                {t('detail.actions')}
                <EllipsisVerticalIcon className="h-5 w-5" />
              </DropdownButton>
            <DropdownMenu anchor="bottom end" className="min-w-48">
              {canSend && (
                <DropdownItem onClick={() => setShowSendModal(true)}>
                  <PaperAirplaneIconOutline className="h-4 w-4" />
                  {t('detail.actions.send')}
                </DropdownItem>
              )}
              {canRequestApproval && (
                <DropdownItem onClick={() => setShowApprovalModal(true)}>
                  <ShieldCheckIcon className="h-4 w-4" />
                  {t('detail.actions.requestApproval')}
                </DropdownItem>
              )}
              {canResubmit && (
                <DropdownItem onClick={handleResubmit}>
                  <PaperAirplaneIconOutline className="h-4 w-4" />
                  {t('detail.actions.resubmit')}
                </DropdownItem>
              )}
              {canEdit && (
                <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaignId}`}>
                  <PencilIconOutline className="h-4 w-4" />
                  {t('detail.actions.edit')}
                </DropdownItem>
              )}
              <DropdownItem onClick={handleDuplicate}>
                <DocumentDuplicateIconOutline className="h-4 w-4" />
                {t('detail.actions.duplicate')}
              </DropdownItem>
              {campaign.status === 'sent' && (
                <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaignId}/analytics`}>
                  <ChartBarIconOutline className="h-4 w-4" />
                  {t('detail.actions.analytics')}
                </DropdownItem>
              )}
              <DropdownDivider />
              <DropdownItem onClick={() => setShowDeleteDialog(true)}>
                <TrashIconOutline className="h-4 w-4" />
                <span className="text-red-600">{t('detail.actions.delete')}</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
          </div>
        </div>
      </div>

      <div className="space-y-6">

        {/* PDF-Versionen und Chat-Historie */}
        {campaign.id && currentOrganization && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-gray-600" />
              {t('detail.pdfVersionHistory')}
            </h3>
            <PDFVersionHistory
              campaignId={campaign.id}
              organizationId={currentOrganization.id}
              showActions={true}
            />
            
            {/* Chat-Historie Section */}
            {campaign.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />
                  {t('detail.chatHistory')}
                </h3>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowHistoryModal(true)}
                    className="bg-[#005fab] hover:bg-[#004a8c] text-white"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                    {t('detail.showChatHistory')}
                  </Button>
                  <Button
                    onClick={downloadTranscript}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    {t('detail.downloadTranscript')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Second Box: Attached Assets */}
          {(assets.length > 0 || folders.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-hidden">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PhotoIcon className="h-5 w-5 text-gray-400" />
                {t('detail.attachedMedia')}
              </h2>
              
              <div className="space-y-3">
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <PhotoIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Text className="font-medium truncate" title={folder.name}>{folder.name}</Text>
                      <Badge color="blue" className="text-xs">{t('detail.folder')}</Badge>
                    </div>
                  </div>
                ))}
                
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {asset.fileType?.startsWith('image/') ? (
                      <img 
                        src={asset.downloadUrl} 
                        alt={asset.fileName}
                        className="h-10 w-10 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <DocumentTextIcon className="h-10 w-10 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <Text className="font-medium text-sm truncate" title={asset.fileName}>{asset.fileName}</Text>
                      {asset.description && (
                        <Text className="text-xs text-gray-500 truncate" title={asset.description}>
                          {asset.description}
                        </Text>
                      )}
                      <Text className="text-xs text-gray-400">
                        {asset.fileType?.split('/')[1]?.toUpperCase() || t('detail.file')}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>

              {campaign.assetShareUrl && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-blue-600" />
                    <Text className="text-sm font-medium text-blue-900">{t('detail.mediaLink')}</Text>
                  </div>
                  <a 
                    href={campaign.assetShareUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 break-all"
                  >
                    {campaign.assetShareUrl}
                  </a>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={campaign}
          onClose={() => setShowSendModal(false)}
          onSent={() => {
            setShowSendModal(false);
            showAlert('success', 'Kampagne versendet');
            loadCampaignData();
          }}
        />
      )}

      {/* Approval Request - Temporär deaktiviert bis Modal vorhanden ist */}
      {showApprovalModal && (
        <Dialog open={showApprovalModal} onClose={() => setShowApprovalModal(false)}>
          <DialogTitle>{t('detail.dialogs.requestApproval.title')}</DialogTitle>
          <DialogBody>
            <Text>
              {t('detail.dialogs.requestApproval.message')}
            </Text>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setShowApprovalModal(false)}>
              {t('detail.dialogs.cancel')}
            </Button>
            <Button
              onClick={handleRequestApproval}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            >
              {t('detail.dialogs.requestApproval.confirm')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>{t('detail.dialogs.delete.title')}</DialogTitle>
        <DialogBody>
          <Text>
            {t('detail.dialogs.delete.message', { title: campaign.title })}
          </Text>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteDialog(false)}>
            {t('detail.dialogs.cancel')}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? t('detail.dialogs.delete.deleting') : t('detail.dialogs.delete.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chat-Historie Modal - Neuer FeedbackChatView */}
      {showHistoryModal && campaign && currentOrganization && (
        <Dialog open={showHistoryModal} onClose={() => setShowHistoryModal(false)} size="4xl">
          <DialogTitle>{t('detail.dialogs.chatHistory.title')}</DialogTitle>
          <DialogBody>
            <FeedbackChatView
              communications={(() => {
                // Konvertiere feedbackHistory zu CommunicationItem Format  
                if (!campaign.approvalData?.feedbackHistory || campaign.approvalData.feedbackHistory.length === 0) {
                  return [];
                }

                return campaign.approvalData.feedbackHistory
                  .sort((a, b) => {
                    const aTime = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt as any).getTime());
                    const bTime = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt as any).getTime());
                    return aTime - bTime; // Älteste zuerst
                  })
                  .map((feedback, index) => {
                    const isCustomer = feedback.author === 'Kunde';
                    const senderName = isCustomer 
                      ? (feedback.author || 'Kunde')
                      : (feedback.author || 'Teammitglied');
                    
                    // Finde Teammitglied für echtes Avatar
                    const teamMember = teamMembers.find(member => 
                      member.displayName === senderName
                    );

                    const senderAvatar = isCustomer
                      ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`
                      : (teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`);

                    return {
                      id: `feedback-${index}`,
                      type: 'feedback' as const,
                      content: feedback.comment || '',
                      message: feedback.comment || '',
                      sender: {
                        id: 'unknown',
                        name: senderName,
                        email: '',
                        role: isCustomer ? 'customer' as const : 'agency' as const
                      },
                      senderName: senderName,
                      senderAvatar: senderAvatar,
                      createdAt: feedback.requestedAt?.toDate ? feedback.requestedAt.toDate() : (feedback.requestedAt instanceof Date ? feedback.requestedAt : new Date(feedback.requestedAt as any)),
                      isRead: true,
                      campaignId: campaign.id || '',
                      organizationId: currentOrganization.id
                    };
                  });
              })()}
              latestMessage={(() => {
                // Finde die neueste Nachricht für das Latest-Banner
                if (!campaign.approvalData?.feedbackHistory || campaign.approvalData.feedbackHistory.length === 0) {
                  return undefined;
                }

                const sortedFeedback = campaign.approvalData.feedbackHistory.sort((a, b) => {
                  const aTime = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt as any).getTime());
                  const bTime = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt as any).getTime());
                  return bTime - aTime; // Neueste zuerst
                });
                
                const latest = sortedFeedback[0];
                const isCustomer = latest.author === 'Kunde';
                const senderName = isCustomer 
                  ? (latest.author || 'Kunde')
                  : (latest.author || 'Teammitglied');
                
                // Finde Teammitglied für echtes Avatar
                const teamMember = teamMembers.find(member => 
                  member.displayName === senderName
                );

                const senderAvatar = isCustomer
                  ? `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`
                  : (teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`);

                return {
                  id: 'latest',
                  type: 'feedback' as const,
                  content: latest.comment || '',
                  message: latest.comment || '',
                  sender: {
                    id: 'unknown',
                    name: senderName,
                    email: '',
                    role: isCustomer ? 'customer' as const : 'agency' as const
                  },
                  senderName: senderName,
                  senderAvatar: senderAvatar,
                  createdAt: latest.requestedAt?.toDate ? latest.requestedAt.toDate() : (latest.requestedAt instanceof Date ? latest.requestedAt : new Date(latest.requestedAt as any)),
                  isRead: true,
                  campaignId: campaign.id || '',
                  organizationId: currentOrganization.id
                };
              })()}
            />
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setShowHistoryModal(false)}>{t('detail.dialogs.close')}</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}