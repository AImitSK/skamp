// src/app/freigabe/[shareId]/page.tsx - Mit Enhanced Approval Integration
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { prService } from "@/lib/firebase/pr-service";
import { approvalService } from "@/lib/firebase/approval-service";
import { mediaService } from "@/lib/firebase/media-service";
import { brandingService } from "@/lib/firebase/branding-service";
import { pdfVersionsService, PDFVersion } from "@/lib/firebase/pdf-versions-service";
import { PRCampaign, CampaignAssetAttachment } from "@/types/pr";
import { ApprovalEnhanced, ApprovalStatus, APPROVAL_STATUS_CONFIG } from "@/types/approvals";
import { MediaAsset, MediaFolder } from "@/types/media";
import { BrandingSettings } from "@/types/branding";
import { 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CalendarIcon,
  InformationCircleIcon,
  PhotoIcon,
  FolderIcon,
  DocumentIcon,
  FilmIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  UserIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "@/components/ui/dialog";
import clsx from "clsx";

// Media Gallery Component
function MediaGallery({
  attachments,
  loading
}: {
  attachments: CampaignAssetAttachment[];
  loading: boolean;
}) {
  const t = useTranslations('prTools.approvals');
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  useEffect(() => {
    if (attachments.length > 0) {
      loadAssetDetails();
    } else {
      setLoadingAssets(false);
    }
  }, [attachments]);

  const loadAssetDetails = async () => {
    try {
      setLoadingAssets(true);
      
      // Lade Asset-Details
      const assetPromises = attachments
        .filter(a => a.type === 'asset' && a.assetId)
        .map(a => mediaService.getMediaAssetById(a.assetId!));
      
      // Lade Folder-Details
      const folderPromises = attachments
        .filter(a => a.type === 'folder' && a.folderId)
        .map(a => mediaService.getFolder(a.folderId!));
      
      const [loadedAssets, loadedFolders] = await Promise.all([
        Promise.all(assetPromises),
        Promise.all(folderPromises)
      ]);
      
      setAssets(loadedAssets.filter(Boolean) as MediaAsset[]);
      setFolders(loadedFolders.filter(Boolean) as MediaFolder[]);
      
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return DocumentIcon;
    if (fileType.startsWith('image/')) return PhotoIcon;
    if (fileType.startsWith('video/')) return FilmIcon;
    if (fileType.includes('pdf')) return DocumentTextIcon;
    return DocumentIcon;
  };

  if (loading || loadingAssets) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <PhotoIcon className="h-5 w-5 text-gray-400" />
          {t('media.title', { count: attachments.length })}
        </h2>
      </div>

      <div className="p-6">
        {/* Folders */}
        {folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('media.folders')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {folders.map((folder) => (
                <div 
                  key={folder.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <FolderIcon className="h-8 w-8 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{folder.name}</p>
                    {folder.description && (
                      <p className="text-xs text-gray-500">{folder.description}</p>
                    )}
                  </div>
                  <Badge color="blue" className="text-xs">{t('media.folderBadge')}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assets Grid */}
        {assets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('media.files')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset) => {
                const FileIcon = getFileIcon(asset.fileType);
                const isImage = asset.fileType?.startsWith('image/');
                
                return (
                  <div 
                    key={asset.id}
                    className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Preview */}
                    <div className="aspect-square bg-gray-50 flex items-center justify-center">
                      {isImage ? (
                        <img
                          src={asset.downloadUrl}
                          alt={asset.fileName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIcon className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <a
                          href={asset.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                          title={t('media.view')}
                        >
                          <EyeIcon className="h-5 w-5 text-gray-700" />
                        </a>
                      </div>
                    </div>
                    
                    {/* File Info */}
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-900 truncate" title={asset.fileName}>
                        {asset.fileName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {asset.fileType?.split('/')[1]?.toUpperCase() || t('media.file')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              {t('media.info')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// PDF-Version-Overview Component
function PDFVersionOverview({
  version,
  campaignTitle,
  onHistoryToggle
}: {
  version: PDFVersion;
  campaignTitle: string;
  onHistoryToggle: () => void;
}) {
  const t = useTranslations('prTools.approvals');

  const statusConfig = {
    draft: { color: 'zinc', labelKey: 'pdfVersion.status.draft', icon: DocumentIcon },
    pending_customer: { color: 'yellow', labelKey: 'pdfVersion.status.pending', icon: ClockIcon },
    approved: { color: 'green', labelKey: 'pdfVersion.status.approved', icon: CheckCircleIcon },
    rejected: { color: 'red', labelKey: 'pdfVersion.status.rejected', icon: XCircleIcon }
  };
  
  const config = statusConfig[version.status] || statusConfig.draft;
  
  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            {t('pdfVersion.title', { version: version.version })}
          </h2>
          <Button
            plain
            onClick={onHistoryToggle}
            className="text-sm"
          >
            {t('pdfVersion.showHistory')}
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <config.icon className="h-8 w-8 text-gray-500" />
            <div>
              <h3 className="font-medium text-gray-900">{campaignTitle}</h3>
              <div className="text-sm text-gray-600 mt-1">
                {t('pdfVersion.createdAt', { date: formatDate(version.createdAt) })}
              </div>
              {version.metadata && (
                <div className="text-xs text-gray-500 mt-1">
                  {t('pdfVersion.metadata', {
                    words: version.metadata.wordCount,
                    pages: version.metadata.pageCount,
                    size: formatFileSize(version.fileSize)
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge color={config.color as any} className="text-sm">
              {t(config.labelKey)}
            </Badge>
            <a
              href={version.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white">
                <DocumentIcon className="h-4 w-4 mr-2" />
                {t('pdfVersion.openPdf')}
              </Button>
            </a>
          </div>
        </div>

        {/* Content Preview */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">{t('pdfVersion.contentPreview')}</h4>
          <div className="text-sm text-gray-600 line-clamp-3">
            {version.contentSnapshot.title}
          </div>
        </div>
        
        {/* PDF-Approval Integration */}
        {version.customerApproval && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-2">{t('pdfVersion.approvalInfo')}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ClockIcon className="h-4 w-4" />
              {version.customerApproval.requestedAt &&
                t('pdfVersion.requestedAt', { date: formatDate(version.customerApproval.requestedAt) })
              }
              {version.customerApproval.approvedAt &&
                ` • ${t('pdfVersion.approvedAt', { date: formatDate(version.customerApproval.approvedAt) })}`
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// PDF-History Modal
function PDFHistoryModal({
  versions,
  onClose
}: {
  versions: PDFVersion[];
  onClose: () => void;
}) {
  const t = useTranslations('prTools.approvals');

  const getPDFStatusBadgeColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'zinc' => {
    switch (status) {
      case 'approved': return 'green';
      case 'pending_customer': return 'yellow';
      case 'rejected': return 'red';
      case 'draft': return 'blue';
      default: return 'zinc';
    }
  };

  const getPDFStatusLabelKey = (status: string): string => {
    switch (status) {
      case 'approved': return 'pdfVersion.status.approved';
      case 'pending_customer': return 'pdfVersion.status.pending';
      case 'rejected': return 'pdfVersion.status.rejected';
      case 'draft': return 'pdfVersion.status.draft';
      default: return status;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Dialog open={true} onClose={onClose} size="4xl">
      <div className="p-6">
        <DialogTitle>{t('pdfHistory.title')}</DialogTitle>
        <DialogBody className="mt-4">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {versions.map((version) => (
              <div key={version.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <DocumentIcon className="h-5 w-5 text-gray-500" />
                    <div>
                      <span className="font-medium">{t('pdfHistory.versionLabel', { version: version.version })}</span>
                      <div className="text-sm text-gray-600">
                        {formatDate(version.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge color={getPDFStatusBadgeColor(version.status)} className="text-xs">
                      {t(getPDFStatusLabelKey(version.status))}
                    </Badge>
                    <a
                      href={version.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button plain>
                        <DocumentIcon className="h-4 w-4 mr-1" />
                        {t('pdfHistory.open')}
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <div className="font-medium mb-1">{version.contentSnapshot.title}</div>
                  {version.metadata && (
                    <div className="text-xs">
                      {t('pdfHistory.metadata', {
                        words: version.metadata.wordCount,
                        pages: version.metadata.pageCount
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogBody>
        <DialogActions>
          <Button plain onClick={onClose}>{t('pdfHistory.close')}</Button>
        </DialogActions>
      </div>
    </Dialog>
  );
}

// Recipient Status Component
function RecipientStatus({
  recipient,
  isCurrentUser
}: {
  recipient: any;
  isCurrentUser: boolean;
}) {
  const t = useTranslations('prTools.approvals');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case 'commented':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-orange-600" />;
      case 'viewed':
        return <EyeIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabelKey = (status: string) => {
    switch (status) {
      case 'approved':
        return 'recipientStatus.approved';
      case 'rejected':
        return 'recipientStatus.rejected';
      case 'commented':
        return 'recipientStatus.commented';
      case 'viewed':
        return 'recipientStatus.viewed';
      default:
        return 'recipientStatus.pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'green';
      case 'rejected':
        return 'red';
      case 'commented':
        return 'orange';
      case 'viewed':
        return 'blue';
      default:
        return 'zinc';
    }
  };

  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 rounded-lg border",
      isCurrentUser ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
    )}>
      {getStatusIcon(recipient.status)}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">
            {recipient.name}
            {isCurrentUser && <span className="text-blue-600"> {t('recipientStatus.you')}</span>}
          </p>
          <Badge color={getStatusColor(recipient.status) as any} className="text-xs">
            {t(getStatusLabelKey(recipient.status))}
          </Badge>
        </div>
        {recipient.email && (
          <p className="text-xs text-gray-500">{recipient.email}</p>
        )}
      </div>
      {recipient.role === 'approver' && recipient.isRequired && (
        <div className="text-xs text-gray-500">{t('recipientStatus.required')}</div>
      )}
    </div>
  );
}

export default function ApprovalPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const t = useTranslations('prTools.approvals');

  const [approval, setApproval] = useState<ApprovalEnhanced | null>(null);
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  
  // NEU: PDF-State-Variablen
  const [pdfVersions, setPdfVersions] = useState<PDFVersion[]>([]);
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);
  const [showPdfHistory, setShowPdfHistory] = useState(false);

  useEffect(() => {
    if (shareId) {
      loadApproval();
    }
  }, [shareId]);

  const loadApproval = async () => {
    try {
      setLoading(true);
      setError(null);

      // Versuche zuerst Enhanced Approval zu laden
      const enhancedApproval = await approvalService.getByShareId(shareId);
      
      if (enhancedApproval) {
        setApproval(enhancedApproval);
        
        // NEU: PDF-Versionen laden
        try {
          const pdfVersions = await pdfVersionsService.getVersionHistory(enhancedApproval.campaignId);
          const currentPdfVersion = await pdfVersionsService.getCurrentVersion(enhancedApproval.campaignId);
          
          setPdfVersions(pdfVersions);
          setCurrentPdfVersion(currentPdfVersion);
        } catch (pdfError) {
          console.error('Error loading PDF versions:', pdfError);
        }
        
        // Markiere als angesehen
        await approvalService.markAsViewed(shareId, currentUserEmail);
        
        // Lade zugehörige Kampagne
        const campaignData = await prService.getById(enhancedApproval.campaignId);
        if (campaignData) {
          setCampaign(campaignData);
          
          // Lade Branding-Einstellungen
          if (campaignData.organizationId) {
            try {
              const branding = await brandingService.getBrandingSettings(campaignData.organizationId);
              setBrandingSettings(branding);
            } catch (brandingError) {
              console.error('Error loading branding settings:', brandingError);
            }
          }
        }
      } else {
        // Fallback zu Legacy-Methode
        const campaignData = await prService.getCampaignByShareId(shareId);

        if (!campaignData) {
          setError(t('errors.notFound'));
          return;
        }

        setCampaign(campaignData);
        
        // Markiere als "viewed" wenn noch pending
        if (campaignData.approvalData?.status === 'pending') {
          await prService.markApprovalAsViewed(shareId);
          campaignData.approvalData.status = 'viewed';
        }

        // Lade Branding-Einstellungen
        if (campaignData.organizationId) {
          try {
            const branding = await brandingService.getBrandingSettings(campaignData.organizationId);
            setBrandingSettings(branding);
          } catch (brandingError) {
            console.error('Error loading branding settings:', brandingError);
          }
        }
      }

    } catch (error) {
      console.error('Error loading approval:', error);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!shareId) return;

    try {
      setSubmitting(true);
      
      if (approval) {
        // Enhanced Approval
        await approvalService.submitDecision(shareId, currentUserEmail || 'unknown@example.com', 'approved');
      } else {
        // Legacy Approval
        await prService.approveCampaign(shareId);
      }
      
      setActionCompleted(true);
      setShowFeedbackForm(false);
      
      // Reload
      await loadApproval();
    } catch (error) {
      console.error('Error approving:', error);
      alert(t('errors.approveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!shareId || !feedbackText.trim()) return;

    try {
      setSubmitting(true);

      if (approval) {
        // Enhanced Approval
        await approvalService.requestChanges(shareId, currentUserEmail || 'unknown@example.com', feedbackText.trim());
      } else {
        // Legacy Approval
        await prService.submitFeedback(shareId, feedbackText.trim());
      }

      setFeedbackText('');
      setShowFeedbackForm(false);
      setActionCompleted(true);

      // Reload
      await loadApproval();
    } catch (error) {
      console.error('Error sending feedback:', error);
      alert(t('errors.feedbackFailed'));
    } finally {
      setSubmitting(false);
    }
  };

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

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <Heading level={2} className="text-red-900 mb-2">{t('errors.title')}</Heading>
          <Text className="text-gray-600">{error}</Text>
        </div>
      </div>
    );
  }

  if (!campaign && !approval) return null;

  // Verwende Enhanced Approval Daten wenn vorhanden
  const title = approval?.title || campaign?.title || 'Pressemitteilung';
  const contentHtml = approval?.content.html || campaign?.contentHtml || '';
  const clientName = approval?.clientName || campaign?.clientName || '';
  const attachedAssets = campaign?.attachedAssets || [];
  
  const currentStatus = approval?.status || campaign?.approvalData?.status || 'pending';
  const mapLegacyStatus = (status: string): ApprovalStatus => {
    switch (status) {
      case 'viewed':
        return 'in_review';
      case 'commented':
        return 'changes_requested';
      default:
        return status as ApprovalStatus;
    }
  };
  const mappedStatus = mapLegacyStatus(currentStatus);
  const statusInfo = APPROVAL_STATUS_CONFIG[mappedStatus] || APPROVAL_STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon === 'ClockIcon' ? ClockIcon : 
                     statusInfo.icon === 'CheckCircleIcon' ? CheckCircleIcon :
                     statusInfo.icon === 'XCircleIcon' ? XCircleIcon :
                     statusInfo.icon === 'ExclamationTriangleIcon' ? ExclamationTriangleIcon :
                     InformationCircleIcon;
  
  const isApproved = mappedStatus === 'approved' || mappedStatus === 'completed';
  const canTakeAction = !isApproved && !actionCompleted && mappedStatus !== 'rejected';
  
  // Finde aktuellen Benutzer in Empfängern
  const currentRecipient = approval?.recipients.find(r => r.email === currentUserEmail);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge color={statusInfo.color as any} className="inline-flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
                {clientName && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    {clientName}
                  </div>
                )}
              </div>
              
              <Heading level={1} className="text-2xl font-bold text-gray-900 mb-2">
                {title}
              </Heading>
              
              <Text className="text-gray-600">
                {mappedStatus === 'pending' && t('status.description.pending')}
                {mappedStatus === 'in_review' && t('status.description.inReview')}
                {mappedStatus === 'changes_requested' && t('status.description.changesRequested')}
                {mappedStatus === 'approved' && t('status.description.approved')}
                {mappedStatus === 'rejected' && t('status.description.rejected')}
                {mappedStatus === 'completed' && t('status.description.completed')}
                {!['pending', 'in_review', 'changes_requested', 'approved', 'rejected', 'completed'].includes(mappedStatus) && t('status.description.default')}
              </Text>
              
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Erstellt am {formatDate(approval?.createdAt || campaign?.createdAt)}
                </div>
                {(approval?.approvedAt || campaign?.approvalData?.approvedAt) && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    Freigegeben am {formatDate(approval?.approvedAt || campaign?.approvalData?.approvedAt)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Logo oder Fallback */}
            <div className="text-right">
              {brandingSettings?.logoUrl ? (
                <img 
                  src={brandingSettings.logoUrl} 
                  alt={brandingSettings.companyName || 'Logo'} 
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <>
                  <div className="text-xs text-gray-400 mb-1">Freigabe-System</div>
                  <div className="text-sm font-medium text-[#005fab]">CeleroPress</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Success Message */}
          {actionCompleted && (
            <div className={clsx(
              "mb-6 p-4 rounded-lg flex items-start gap-3",
              isApproved 
                ? "bg-green-50 border border-green-200" 
                : "bg-orange-50 border border-orange-200"
            )}>
              {isApproved ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Freigabe erfolgreich erteilt</p>
                    <p className="text-sm text-green-700 mt-1">
                      Die Pressemitteilung wurde freigegeben und kann nun versendet werden.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ExclamationCircleIcon className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">Änderungen angefordert</p>
                    <p className="text-sm text-orange-700 mt-1">
                      Ihr Feedback wurde übermittelt. Die Agentur wird die gewünschten Änderungen vornehmen.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PDF Version Display */}
          {currentPdfVersion && (
            <PDFVersionOverview
              version={currentPdfVersion}
              campaignTitle={title}
              onHistoryToggle={() => setShowPdfHistory(true)}
            />
          )}

          {/* Recipients Status (wenn Enhanced Approval) */}
          {approval && approval.recipients.length > 1 && (
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Freigabe-Status ({(approval.recipients || []).filter(r => r.status === 'approved').length} von {(approval.recipients || []).length})
              </h3>
              <div className="space-y-2">
                {(approval.recipients || []).map((recipient) => (
                  <RecipientStatus
                    key={recipient.id}
                    recipient={recipient}
                    isCurrentUser={recipient.email === currentUserEmail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Feedback History */}
          {approval && approval.history.filter(h => h.action === 'commented' || h.action === 'changes_requested').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Bisheriges Feedback
              </h3>
              <div className="space-y-3">
                {approval.history
                  .filter(h => h.action === 'commented' || h.action === 'changes_requested')
                  .map((entry) => (
                    <div key={entry.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-orange-900">{entry.actorName}</span>
                        <span className="text-xs text-orange-600">{formatDate(entry.timestamp)}</span>
                      </div>
                      <p className="text-sm text-orange-800">{entry.details.comment}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Legacy Feedback History */}
          {!approval && campaign?.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Bisheriges Feedback
              </h3>
              <div className="space-y-3">
                {campaign.approvalData.feedbackHistory.map((feedback, index) => (
                  <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-900">{feedback.author}</span>
                      <span className="text-xs text-orange-600">{formatDate(feedback.requestedAt)}</span>
                    </div>
                    <p className="text-sm text-orange-800">{feedback.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PR Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                Inhalt der Pressemitteilung
              </h2>
            </div>
            <div className="px-6 py-6">
              <div 
                className="prose prose-gray max-w-none"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          </div>

          {/* Media Gallery */}
          {attachedAssets && attachedAssets.length > 0 && (
            <MediaGallery 
              attachments={attachedAssets} 
              loading={loading}
            />
          )}

          {/* Actions */}
          {canTakeAction && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ihre Aktion</h3>
              
              {/* E-Mail Eingabe wenn Enhanced Approval und kein Empfänger gefunden */}
              {approval && !currentRecipient && !currentUserEmail && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ihre E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    value={currentUserEmail}
                    onChange={(e) => setCurrentUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#005fab] focus:border-[#005fab]"
                    placeholder="ihre.email@beispiel.de"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Bitte geben Sie Ihre E-Mail-Adresse ein, um fortzufahren.
                  </p>
                </div>
              )}
              
              {showFeedbackForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Welche Änderungen wünschen Sie?
                    </label>
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      rows={4}
                      placeholder="Bitte beschreiben Sie die gewünschten Änderungen..."
                      className="w-full"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleRequestChanges}
                      disabled={!feedbackText.trim() || submitting || (approval && !currentRecipient && !currentUserEmail) || false}
                      color="indigo"
                      className="flex-1"
                    >
                      {submitting ? 'Wird gesendet...' : 'Änderungen senden'}
                    </Button>
                    <Button
                      plain
                      onClick={() => {
                        setShowFeedbackForm(false);
                        setFeedbackText('');
                      }}
                      disabled={submitting}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Bitte prüfen Sie die Pressemitteilung {attachedAssets && attachedAssets.length > 0 ? 'und die angehängten Medien ' : ''}sorgfältig. 
                    Sie können entweder die Freigabe erteilen oder Änderungen anfordern.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleApprove}
                      className="flex-1 bg-[#005fab] hover:bg-[#004a8c] text-white"
                      disabled={submitting || (approval && !currentRecipient && !currentUserEmail) || false}
                    >
                      <CheckIcon className="h-5 w-5 mr-2" />
                      {submitting ? 'Wird verarbeitet...' : 'Freigabe erteilen'}
                    </Button>
                    <Button
                      onClick={() => setShowFeedbackForm(true)}
                      className="flex-1 !bg-white !border !border-gray-300 !text-gray-700 hover:!bg-gray-100"
                      disabled={submitting}
                    >
                      <PencilSquareIcon className="h-5 w-5 mr-2" />
                      Änderungen anfordern
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PDF History Modal */}
          {showPdfHistory && (
            <PDFHistoryModal
              versions={pdfVersions}
              onClose={() => setShowPdfHistory(false)}
            />
          )}

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Hinweis zum Freigabeprozess</p>
                <p>
                  Nach Ihrer Freigabe kann die Pressemitteilung {attachedAssets && attachedAssets.length > 0 ? 'zusammen mit den Medien ' : ''}
                  von der Agentur versendet werden. Bei Änderungswünschen wird die Agentur benachrichtigt und die Mitteilung entsprechend angepasst.
                  {currentPdfVersion && ' Das zugehörige PDF wird ebenfalls nach der Freigabe finalisiert.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer mit Branding */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {brandingSettings ? (
            <div className="space-y-3">
              {/* Firmeninfo-Zeile */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-600">
                {brandingSettings.companyName && (
                  <span className="font-medium">{brandingSettings.companyName}</span>
                )}
                
                {brandingSettings.address && (brandingSettings.address.street || brandingSettings.address.postalCode || brandingSettings.address.city) && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" />
                      {[
                        brandingSettings.address.street,
                        brandingSettings.address.postalCode && brandingSettings.address.city 
                          ? `${brandingSettings.address.postalCode} ${brandingSettings.address.city}`
                          : brandingSettings.address.postalCode || brandingSettings.address.city
                      ].filter(Boolean).join(', ')}
                    </span>
                  </>
                )}
                
                {brandingSettings.phone && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="h-4 w-4" />
                      {brandingSettings.phone}
                    </span>
                  </>
                )}
                
                {brandingSettings.email && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="flex items-center gap-1">
                      <EnvelopeIcon className="h-4 w-4" />
                      {brandingSettings.email}
                    </span>
                  </>
                )}
                
                {brandingSettings.website && (
                  <>
                    <span className="text-gray-400">|</span>
                    <a 
                      href={brandingSettings.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#005fab] hover:underline"
                    >
                      <GlobeAltIcon className="h-4 w-4" />
                      {brandingSettings.website.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  </>
                )}
              </div>
              
              {/* Copyright-Zeile */}
              {brandingSettings.showCopyright && (
                <div className="text-center text-xs text-gray-500">
                  <p>Copyright © {new Date().getFullYear()} {brandingSettings.companyName || 'CeleroPress'}. Alle Rechte vorbehalten.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">
              <p>Bereitgestellt über CeleroPress</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}