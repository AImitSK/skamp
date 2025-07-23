// src/app/freigabe/[shareId]/page.tsx - Mit Enhanced Approval Integration
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { prService } from "@/lib/firebase/pr-service";
import { approvalService } from "@/lib/firebase/approval-service";
import { mediaService } from "@/lib/firebase/media-service";
import { brandingService } from "@/lib/firebase/branding-service";
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
import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/badge";
import clsx from "clsx";

// Media Gallery Component
function MediaGallery({ 
  attachments,
  loading 
}: { 
  attachments: CampaignAssetAttachment[];
  loading: boolean;
}) {
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
      console.error('Fehler beim Laden der Medien:', error);
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
          Angehängte Medien ({attachments.length})
        </h2>
      </div>
      
      <div className="p-6">
        {/* Folders */}
        {folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Ordner</h3>
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
                  <Badge color="blue" className="text-xs">Ordner</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assets Grid */}
        {assets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Dateien</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset) => {
                const FileIcon = getFileIcon(asset.fileType);
                const isImage = asset.fileType?.startsWith('image/');
                
                return (
                  <div 
                    key={asset.id}
                    className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
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
                          title="Ansehen"
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
                        {asset.fileType?.split('/')[1]?.toUpperCase() || 'Datei'}
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
              Diese Medien sind Teil der Pressemitteilung und werden nach Ihrer Freigabe 
              zusammen mit der Mitteilung an die Empfänger versendet.
            </p>
          </div>
        </div>
      </div>
    </div>
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Freigegeben';
      case 'rejected':
        return 'Abgelehnt';
      case 'commented':
        return 'Kommentiert';
      case 'viewed':
        return 'Angesehen';
      default:
        return 'Ausstehend';
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
            {isCurrentUser && <span className="text-blue-600"> (Sie)</span>}
          </p>
          <Badge color={getStatusColor(recipient.status) as any} className="text-xs">
            {getStatusLabel(recipient.status)}
          </Badge>
        </div>
        {recipient.email && (
          <p className="text-xs text-gray-500">{recipient.email}</p>
        )}
      </div>
      {recipient.role === 'approver' && recipient.isRequired && (
        <div className="text-xs text-gray-500">Erforderlich</div>
      )}
    </div>
  );
}

export default function ApprovalPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  
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
        
        // Markiere als angesehen
        await approvalService.markAsViewed(shareId, currentUserEmail);
        
        // Lade zugehörige Kampagne
        const campaignData = await prService.getById(enhancedApproval.campaignId);
        if (campaignData) {
          setCampaign(campaignData);
          
          // Lade Branding-Einstellungen
          if (campaignData.userId) {
            try {
              const branding = await brandingService.getBrandingSettings(campaignData.userId);
              setBrandingSettings(branding);
            } catch (brandingError) {
              console.error('Fehler beim Laden der Branding-Einstellungen:', brandingError);
            }
          }
        }
      } else {
        // Fallback zu Legacy-Methode
        const campaignData = await prService.getCampaignByShareId(shareId);
        
        if (!campaignData) {
          setError('Freigabe-Link nicht gefunden oder nicht mehr gültig.');
          return;
        }

        setCampaign(campaignData);
        
        // Markiere als "viewed" wenn noch pending
        if (campaignData.approvalData?.status === 'pending') {
          await prService.markApprovalAsViewed(shareId);
          campaignData.approvalData.status = 'viewed';
        }

        // Lade Branding-Einstellungen
        if (campaignData.userId) {
          try {
            const branding = await brandingService.getBrandingSettings(campaignData.userId);
            setBrandingSettings(branding);
          } catch (brandingError) {
            console.error('Fehler beim Laden der Branding-Einstellungen:', brandingError);
          }
        }
      }

    } catch (error) {
      console.error('Fehler beim Laden der Freigabe:', error);
      setError('Die Pressemitteilung konnte nicht geladen werden.');
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
      console.error('Fehler bei der Freigabe:', error);
      alert('Die Freigabe konnte nicht erteilt werden. Bitte versuchen Sie es erneut.');
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
      console.error('Fehler beim Senden des Feedbacks:', error);
      alert('Das Feedback konnte nicht gesendet werden. Bitte versuchen Sie es erneut.');
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
          <p className="text-gray-600">Lade Pressemitteilung...</p>
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
          <Heading level={2} className="text-red-900 mb-2">Fehler</Heading>
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
                {mappedStatus === 'pending' && 'Diese Pressemitteilung wartet auf Ihre Prüfung.'}
                {mappedStatus === 'in_review' && 'Sie haben diese Pressemitteilung angesehen.'}
                {mappedStatus === 'changes_requested' && 'Sie haben Änderungen zu dieser Pressemitteilung angefordert.'}
                {mappedStatus === 'approved' && 'Diese Pressemitteilung wurde von Ihnen freigegeben.'}
                {mappedStatus === 'rejected' && 'Diese Pressemitteilung wurde abgelehnt.'}
                {mappedStatus === 'completed' && 'Diese Pressemitteilung wurde freigegeben und versendet.'}
                {!['pending', 'in_review', 'changes_requested', 'approved', 'rejected', 'completed'].includes(mappedStatus) && 'Status der Pressemitteilung.'}
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
                  <div className="text-sm font-medium text-[#005fab]">SKAMP</div>
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

          {/* Recipients Status (wenn Enhanced Approval) */}
          {approval && approval.recipients.length > 1 && (
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Freigabe-Status ({approval.recipients.filter(r => r.status === 'approved').length} von {approval.recipients.length})
              </h3>
              <div className="space-y-2">
                {approval.recipients.map((recipient) => (
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
                      color="indigo"
                      className="flex-1 bg-green-600 hover:bg-green-500"
                      disabled={submitting || (approval && !currentRecipient && !currentUserEmail) || false}
                    >
                      <CheckIcon className="h-5 w-5 mr-2" />
                      {submitting ? 'Wird verarbeitet...' : 'Freigabe erteilen'}
                    </Button>
                    <Button
                      onClick={() => setShowFeedbackForm(true)}
                      plain
                      className="flex-1"
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

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Hinweis zum Freigabeprozess</p>
                <p>
                  Nach Ihrer Freigabe kann die Pressemitteilung {attachedAssets && attachedAssets.length > 0 ? 'zusammen mit den Medien ' : ''}
                  von der Agentur versendet werden. Bei Änderungswünschen wird die Agentur benachrichtigt und die Mitteilung entsprechend angepasst.
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
                  <p>Copyright © {new Date().getFullYear()} SKAMP. Alle Rechte vorbehalten.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">
              <p>Bereitgestellt über SKAMP PR-Suite</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}