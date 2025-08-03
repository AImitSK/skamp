// src/app/dashboard/pr-tools/campaigns/campaigns/[campaignId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { teamMemberService } from "@/lib/firebase/organization-service";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from "@/components/ui/dropdown";
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  BuildingOfficeIcon,
  UsersIcon,
  PhotoIcon,
  CalendarIcon,
  LinkIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  ArchiveBoxIcon
} from "@heroicons/react/20/solid";
import { prService } from "@/lib/firebase/pr-service";
import { listsService } from "@/lib/firebase/lists-service";
import { companiesEnhancedService } from "@/lib/firebase/crm-service-enhanced";
import { mediaService } from "@/lib/firebase/media-service";
import { PRCampaign, PRCampaignStatus } from "@/types/pr";
import { DistributionList } from "@/types/lists";
import { CompanyEnhanced } from "@/types/crm-enhanced";
import { MediaAsset, MediaFolder } from "@/types/media";
import EmailSendModal from "@/components/pr/EmailSendModal";

// Status configuration
const statusConfig: Record<PRCampaignStatus, { 
  label: string; 
  color: "zinc" | "yellow" | "orange" | "teal" | "blue" | "indigo" | "green"; 
  icon: React.ElementType;
  description: string;
}> = {
  draft: {
    label: 'Entwurf',
    color: 'zinc',
    icon: PencilSquareIcon,
    description: 'Die Kampagne ist noch in Bearbeitung'
  },
  in_review: {
    label: 'In Prüfung',
    color: 'yellow',
    icon: ClockIcon,
    description: 'Die Kampagne wird vom Kunden geprüft'
  },
  changes_requested: {
    label: 'Änderung erbeten',
    color: 'orange',
    icon: ExclamationCircleIcon,
    description: 'Der Kunde hat Änderungen angefordert'
  },
  approved: {
    label: 'Freigegeben',
    color: 'teal',
    icon: CheckBadgeIcon,
    description: 'Die Kampagne wurde vom Kunden freigegeben'
  },
  scheduled: {
    label: 'Geplant',
    color: 'blue',
    icon: ClockIcon,
    description: 'Die Kampagne ist für den Versand geplant'
  },
  sending: {
    label: 'Wird gesendet',
    color: 'indigo',
    icon: PaperAirplaneIcon,
    description: 'Die Kampagne wird gerade versendet'
  },
  sent: {
    label: 'Gesendet',
    color: 'green',
    icon: CheckCircleIcon,
    description: 'Die Kampagne wurde erfolgreich versendet'
  },
  archived: {
    label: 'Archiviert',
    color: 'zinc',
    icon: ArchiveBoxIcon,
    description: 'Die Kampagne wurde archiviert'
  },
};

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
    info: ExclamationTriangleIcon,
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    error: XCircleIcon
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

// Status Badge Component
function StatusBadge({ status }: { status: PRCampaignStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-3">
      <Badge color={config.color} className="inline-flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
      <Text className="text-sm text-gray-500">{config.description}</Text>
    </div>
  );
}

// Helper function to format date
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

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [company, setCompany] = useState<CompanyEnhanced | null>(null);
  const [distributionList, setDistributionList] = useState<DistributionList | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; title: string; message?: string } | null>(null);
  
  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'success' | 'warning' | 'error', title: string, message?: string) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Load OrganizationId
  useEffect(() => {
    const loadOrganizationId = async () => {
      if (!user) return;
      
      try {
        const orgs = await teamMemberService.getUserOrganizations(user.uid);
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].organization.id!);
        } else {
          // Fallback auf userId für Backwards Compatibility
          setOrganizationId(user.uid);
        }
      } catch (error) {
        console.warn('Organization loading failed, using userId as fallback:', error);
        setOrganizationId(user.uid);
      }
    };
    
    loadOrganizationId();
  }, [user]);

  useEffect(() => {
    if (campaignId && user && organizationId) {
      loadCampaignData();
    }
  }, [campaignId, user, organizationId]);

  const loadCampaignData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load campaign
      const campaignData = await prService.getById(campaignId);
      if (!campaignData) {
        setError('Kampagne nicht gefunden');
        return;
      }
      setCampaign(campaignData);

      // Load related data in parallel
      const promises: Promise<any>[] = [];

      // Load company if exists
      if (campaignData.clientId && organizationId) {
        promises.push(
          companiesEnhancedService.getById(organizationId, campaignData.clientId)
            .then(companyData => setCompany(companyData))
            .catch(err => console.error('Error loading company:', err))
        );
      }

      // Load distribution list
      if (campaignData.distributionListId && organizationId) {
        promises.push(
          listsService.getById(campaignData.distributionListId)
            .then(listData => setDistributionList(listData))
            .catch(err => console.error('Error loading list:', err))
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
              .catch(err => console.error('Error loading assets:', err))
          );
        }

        if (folderIds.length > 0) {
          promises.push(
            Promise.all(folderIds.map(id => mediaService.getFolder(id)))
              .then(foldersData => setFolders(foldersData.filter((folder): folder is MediaFolder => folder !== null)))
              .catch(err => console.error('Error loading folders:', err))
          );
        }
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error loading campaign data:', error);
      setError('Fehler beim Laden der Kampagne');
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

  const handleDuplicate = async () => {
    if (!campaign || !user) return;

    try {
      const newCampaignData = {
        ...campaign,
        title: `${campaign.title} (Kopie)`,
        status: 'draft' as const,
        sentAt: null,
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
      showAlert('success', 'Freigabe angefordert', 'Der Freigabelink wurde erstellt.');
      setShowApprovalModal(false);
    } catch (error) {
      showAlert('error', 'Fehler beim Anfordern der Freigabe');
    }
  };

  const handleResubmit = async () => {
    if (!campaign) return;

    try {
      await prService.resubmitForApproval(campaignId);
      await loadCampaignData();
      showAlert('success', 'Erneut zur Freigabe eingereicht');
    } catch (error) {
      showAlert('error', 'Fehler beim erneuten Einreichen');
    }
  };

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
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <Heading level={2}>Fehler</Heading>
        <Text className="mt-2">{error || 'Kampagne nicht gefunden'}</Text>
        <Button href="/dashboard/pr-tools/campaigns" className="mt-4">
          Zurück zur Übersicht
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
        <Button 
          plain 
          href="/dashboard/pr-tools/campaigns"
          className="mb-4"
        >
          <ArrowLeftIcon />
          Zurück zu Kampagnen
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <Heading level={1}>{campaign.title}</Heading>
            <div className="mt-2">
              <StatusBadge status={campaign.status} />
            </div>
          </div>
          
          {/* Actions Dropdown */}
          <Dropdown>
            <DropdownButton className="inline-flex items-center gap-2">
              Aktionen
              <EllipsisVerticalIcon className="h-5 w-5" />
            </DropdownButton>
            <DropdownMenu anchor="bottom end" className="min-w-48">
              {canSend && (
                <DropdownItem onClick={() => setShowSendModal(true)}>
                  <PaperAirplaneIcon className="h-4 w-4" />
                  Versenden
                </DropdownItem>
              )}
              {canRequestApproval && (
                <DropdownItem onClick={() => setShowApprovalModal(true)}>
                  <CheckBadgeIcon className="h-4 w-4" />
                  Freigabe anfordern
                </DropdownItem>
              )}
              {canResubmit && (
                <DropdownItem onClick={handleResubmit}>
                  <PaperAirplaneIcon className="h-4 w-4" />
                  Erneut einreichen
                </DropdownItem>
              )}
              {canEdit && (
                <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaignId}`}>
                  <PencilIcon className="h-4 w-4" />
                  Bearbeiten
                </DropdownItem>
              )}
              <DropdownItem onClick={handleDuplicate}>
                <DocumentDuplicateIcon className="h-4 w-4" />
                Duplizieren
              </DropdownItem>
              {campaign.status === 'sent' && (
                <DropdownItem href={`/dashboard/pr-tools/campaigns/campaigns/${campaignId}/analytics`}>
                  <ChartBarIcon className="h-4 w-4" />
                  Analytics
                </DropdownItem>
              )}
              <DropdownDivider />
              <DropdownItem onClick={() => setShowDeleteDialog(true)}>
                <TrashIcon className="h-4 w-4" />
                <span className="text-red-600">Löschen</span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Inhalt</h2>
            
            {/* Email Subject würde hier stehen, wenn es das Feld gäbe */}
            
            {/* Content */}
            <div className="prose prose-sm max-w-none">
              <div 
                dangerouslySetInnerHTML={{ __html: campaign.contentHtml }} 
                className="bg-gray-50 rounded-lg p-4 border"
              />
            </div>
          </div>

          {/* Approval Feedback */}
          {campaign.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Feedback-Historie</h2>
              <div className="space-y-4">
                {campaign.approvalData.feedbackHistory.map((feedback, index) => (
                  <div key={index} className="border-l-4 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="font-medium">{feedback.author || 'Kunde'}</span>
                      <span>•</span>
                      <span>{formatDate(feedback.requestedAt)}</span>
                    </div>
                    <Text className="mt-1">{feedback.comment}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Assets */}
          {(assets.length > 0 || folders.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PhotoIcon className="h-5 w-5 text-gray-400" />
                Angehängte Medien
              </h2>
              
              <div className="space-y-3">
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <PhotoIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <Text className="font-medium">{folder.name}</Text>
                      <Badge color="blue" className="text-xs">Ordner</Badge>
                    </div>
                  </div>
                ))}
                
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {asset.fileType?.startsWith('image/') ? (
                      <img 
                        src={asset.downloadUrl} 
                        alt={asset.fileName}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <DocumentTextIcon className="h-10 w-10 text-gray-400" />
                    )}
                    <div>
                      <Text className="font-medium text-sm">{asset.fileName}</Text>
                      <Text className="text-xs text-gray-500">
                        {asset.fileType?.split('/')[1]?.toUpperCase() || 'Datei'}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>

              {campaign.assetShareUrl && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-blue-600" />
                    <Text className="text-sm font-medium text-blue-900">Medien-Link</Text>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            
            <div className="space-y-4">
              {/* Customer */}
              {company && (
                <div>
                  <Text className="text-sm font-medium text-gray-700">Kunde</Text>
                  <Link 
                    href={`/dashboard/contacts/crm/companies/${company.id}`}
                    className="mt-1 flex items-center gap-2 text-[#005fab] hover:text-[#004a8c]"
                  >
                    <BuildingOfficeIcon className="h-4 w-4" />
                    <span>{company.name}</span>
                  </Link>
                </div>
              )}

              {/* Distribution List */}
              {distributionList && (
                <div>
                  <Text className="text-sm font-medium text-gray-700">Verteiler</Text>
                  <Link 
                    href={`/dashboard/contacts/lists/${distributionList.id}`}
                    className="mt-1 flex items-center gap-2 text-[#005fab] hover:text-[#004a8c]"
                  >
                    <UsersIcon className="h-4 w-4" />
                    <span>{distributionList.name}</span>
                  </Link>
                  <Text className="text-sm text-gray-500 mt-1">
                    {campaign.recipientCount} Empfänger
                  </Text>
                </div>
              )}

              {/* Dates */}
              <div>
                <Text className="text-sm font-medium text-gray-700">Erstellt</Text>
                <Text className="text-sm text-gray-600 mt-1">
                  {formatDate(campaign.createdAt)}
                </Text>
              </div>

              {campaign.sentAt && (
                <div>
                  <Text className="text-sm font-medium text-gray-700">Versendet</Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    {formatDate(campaign.sentAt)}
                  </Text>
                </div>
              )}

              {/* Approval Info */}
              {campaign.approvalRequired && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckBadgeIcon className="h-5 w-5 text-blue-500" />
                    <Text className="font-medium">Freigabe erforderlich</Text>
                  </div>
                  
                  {campaign.approvalData?.shareId && (
                    <div className="mt-2">
                      <Text className="text-sm text-gray-700">Freigabe-Link:</Text>
                      <a 
                        href={prService.getApprovalUrl(campaign.approvalData.shareId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 break-all"
                      >
                        {prService.getApprovalUrl(campaign.approvalData.shareId)}
                      </a>
                      <Button
                        plain
                        onClick={() => {
                          navigator.clipboard.writeText(prService.getApprovalUrl(campaign.approvalData!.shareId));
                          showAlert('success', 'Link kopiert');
                        }}
                        className="mt-2 text-sm"
                      >
                        <DocumentDuplicateIcon />
                        Link kopieren
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Email Stats - würden hier stehen wenn das Feld existieren würde */}
        </div>
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
          <DialogTitle>Freigabe anfordern</DialogTitle>
          <DialogBody>
            <Text>
              Die Kampagne wird zur Freigabe an den Kunden gesendet. 
              Sie erhalten einen Link, den Sie per E-Mail weitergeben können.
            </Text>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={() => setShowApprovalModal(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleRequestApproval}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            >
              Freigabe anfordern
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Kampagne löschen</DialogTitle>
        <DialogBody>
          <Text>
            Möchten Sie die Kampagne "{campaign.title}" wirklich löschen? 
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Text>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={() => setShowDeleteDialog(false)}>
            Abbrechen
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Wird gelöscht...' : 'Löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}