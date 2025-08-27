// src/app/freigabe/[shareId]/page.tsx - Mit Branding-Integration
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { useParams } from "next/navigation";
import { prService } from "@/lib/firebase/pr-service";
import { approvalService } from "@/lib/firebase/approval-service";
import { mediaService } from "@/lib/firebase/media-service";
import { brandingService } from "@/lib/firebase/branding-service";
import { pdfVersionsService } from "@/lib/firebase/pdf-versions-service";
import { PRCampaign, CampaignAssetAttachment } from "@/types/pr";
import { MediaAsset, MediaFolder } from "@/types/media";
import { BrandingSettings } from "@/types/branding";
import { PDFVersion } from "@/lib/firebase/pdf-versions-service";
import { 
  PDFVersionOverview, 
  PDFHistoryModal 
} from '@/components/pdf/PDFHistoryComponents';
import CustomerPDFViewer from '@/components/freigabe/CustomerPDFViewer';
import PDFApprovalActions from '@/components/freigabe/PDFApprovalActions';
import CustomerFeedbackForm from '@/components/freigabe/CustomerFeedbackForm';
import { PDFStatusBadge } from '@/components/freigabe/PDFStatusIndicator';
import { CustomerCommentSystem } from '@/components/freigabe/CustomerCommentSystem';
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
  MapPinIcon
} from "@heroicons/react/24/outline";
import { CampaignPreviewRenderer } from "@/components/campaigns/CampaignPreviewRenderer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

// Status-Konfiguration für Badges
const approvalStatusConfig = {
  pending: {
    label: 'In Prüfung',
    color: 'yellow' as const,
    icon: ClockIcon,
    description: 'Diese Pressemitteilung wartet auf Ihre Prüfung.'
  },
  viewed: {
    label: 'Angesehen',
    color: 'blue' as const,
    icon: ClockIcon,
    description: 'Sie haben diese Pressemitteilung angesehen.'
  },
  commented: {
    label: 'Änderungen erbeten',
    color: 'orange' as const,
    icon: ExclamationCircleIcon,
    description: 'Sie haben Änderungen zu dieser Pressemitteilung angefordert.'
  },
  approved: {
    label: 'Freigegeben',
    color: 'green' as const,
    icon: CheckCircleIcon,
    description: 'Diese Pressemitteilung wurde von Ihnen freigegeben.'
  }
};

// NEU: Customer Message Banner Component
function CustomerMessageBanner({ message }: { message: string }) {
  if (!message) return null;
  
  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="flex">
        <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-900 mb-2">Nachricht zur Freigabe</h3>
          <div 
            className="text-blue-800 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: message }}
          />
        </div>
      </div>
    </div>
  );
}

// ENTFERNT: CustomerPDFVersionCard - ersetzt durch PDFVersionOverview

// NEU: Media Gallery Component
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
      // Fehler beim Laden der Medien
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
    <div className="bg-white rounded-lg border border-gray-200 mb-6">
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
                    className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:bg-gray-50 transition-colors"
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

export default function ApprovalPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);
  
  // NEU: PDF-Integration State
  const [pdfVersions, setPdfVersions] = useState<PDFVersion[]>([]);
  const [currentPdfVersion, setCurrentPdfVersion] = useState<PDFVersion | null>(null);
  const [showPdfHistory, setShowPdfHistory] = useState(false);
  const [customerMessage, setCustomerMessage] = useState<string>('');

  useEffect(() => {
    if (shareId) {
      loadCampaign();
    }
  }, [shareId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      setError(null);

      // NEU: Direkte Approval-Service Nutzung (vereinfachter 1-stufiger Workflow)
      const approval = await approvalService.getByShareId(shareId);
      
      if (!approval) {
        setError('Freigabe-Link nicht gefunden oder nicht mehr gültig.');
        return;
      }
      
      // Lade zugehörige Campaign über approvalService
      const campaignData = await prService.getById(approval.campaignId);
      
      if (!campaignData) {
        setError('Zugehörige Kampagne nicht gefunden.');
        return;
      }
      
      // Prüfe ob Kampagne bereits versendet wurde
      if (campaignData.status === 'sent') {
        setError('Diese Kampagne wurde bereits versendet. Die Freigabe-Seite ist nicht mehr verfügbar.');
        return;
      }
      
      // Vereinfachte Approval-Daten (1-stufiger Workflow)
      const approvalData = {
        shareId: approval.shareId,
        status: approval.status === 'approved' ? 'approved' : 
                approval.status === 'rejected' ? 'commented' :
                approval.status === 'changes_requested' ? 'commented' :
                approval.status === 'pending' ? 'pending' : 'viewed',
        feedbackHistory: approval.history?.filter(h => h.details?.comment).map(h => ({
          comment: h.details?.comment || '',
          requestedAt: h.timestamp,
          author: h.actorName || 'Kunde'
        })) || [],
        approvedAt: approval.approvedAt,
        customerApprovalRequired: true,
        teamApprovalRequired: false,
        teamApprovers: [],
        currentStage: 'customer' as const,
        workflowStartedAt: approval.requestedAt,
        workflowId: approval.id
      };
      
      // Merge Campaign mit vereinfachten Approval-Daten
      campaignData.approvalData = approvalData as any;

      // PDF-Versionen laden (vereinfachter 1-stufiger Workflow)
      if (approval.campaignId) {
        try {
          const pdfVersions = await pdfVersionsService.getVersionHistory(approval.campaignId);
          
          setPdfVersions(pdfVersions);
          
          // Vereinfachte PDF-Status-Logik (kein Team-Approval):
          // Suche nach der aktuellen Customer-PDF (nur pending_customer, approved, rejected)
          const currentPdfVersion = pdfVersions.find(v => 
            v.status === 'pending_customer' || 
            v.status === 'approved' || 
            v.status === 'rejected'
          ) || pdfVersions[0]; // Fallback zur neuesten Version
          
          setCurrentPdfVersion(currentPdfVersion);
          
          console.log('PDF-Versionen geladen (1-stufiger Workflow):', { 
            count: pdfVersions.length, 
            current: currentPdfVersion?.version,
            status: currentPdfVersion?.status
          });
          
          // VALIDIERUNG: PDF MUSS vorhanden sein!
          if (!currentPdfVersion) {
            console.error('🚨 KRITISCHER FEHLER: Keine PDF-Version gefunden!');
            setError('Systemfehler: PDF-Version nicht gefunden. Bitte Support kontaktieren.');
            return;
          }
          
        } catch (pdfError) {
          console.error('Fehler beim Laden der PDF-Versionen:', pdfError);
          setError('PDF-Versionen konnten nicht geladen werden.');
          return;
        }
      }

      // Customer Approval Message aus Approval-Service (vereinfacht)
      if (approval.customerContact) {
        setCustomerMessage(approval.customerContact);
        console.log('Customer Approval Message geladen (vereinfacht)');
      }

      // Markiere als "viewed" wenn noch pending (vereinfachter Service-Call)
      if (approval.status === 'pending') {
        await approvalService.markAsViewed(shareId);
        // Status bleibt pending bis zur endgültigen Entscheidung
      }

      setCampaign(campaignData);

      // Lade Branding-Einstellungen
      if (campaignData.organizationId) {
        try {
          const branding = await brandingService.getBrandingSettings(campaignData.organizationId);
          setBrandingSettings(branding);
        } catch (brandingError) {
          // Fehler beim Laden der Branding-Einstellungen
          // Kein kritischer Fehler - fahre ohne Branding fort
        }
      }

    } catch (error) {
      // Fehler beim Laden der Kampagne
      setError('Die Pressemitteilung konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!campaign) return;

    try {
      setSubmitting(true);
      
      // NEU: Direkte Approval-Service Nutzung (vereinfachter Workflow)
      await approvalService.submitDecisionPublic(
        shareId,
        'approved',
        undefined, // Kein Kommentar bei Freigabe
        'Kunde'
      );
      
      // PDF-Version Status aktualisieren (vereinfachter Workflow)
      if (currentPdfVersion) {
        try {
          await pdfVersionsService.updateVersionStatus(
            currentPdfVersion.id!, 
            'approved'
          );
          console.log('PDF-Status auf approved aktualisiert (1-stufiger Workflow)');
        } catch (pdfError) {
          // Fehler beim PDF-Status Update
          // Nicht kritisch - fahre fort
        }
      }
      
      // Aktualisiere lokalen State
      setCampaign({
        ...campaign,
        status: 'approved',
        approvalData: {
          ...campaign.approvalData!,
          status: 'approved',
          approvedAt: new Date() as any
        }
      });
      
      // Update PDF State lokal
      if (currentPdfVersion) {
        setCurrentPdfVersion({
          ...currentPdfVersion,
          status: 'approved'
        });
      }
      
      setActionCompleted(true);
      setShowFeedbackForm(false);
    } catch (error) {
      // Fehler bei der Freigabe
      alert('Die Freigabe konnte nicht erteilt werden. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!campaign || !feedbackText.trim()) return;

    try {
      setSubmitting(true);
      
      // NEU: Direkte Approval-Service Nutzung (vereinfachter Workflow)
      await approvalService.requestChangesPublic(
        shareId,
        'customer@freigabe.system', // Placeholder E-Mail
        feedbackText.trim(),
        'Kunde'
      );
      
      // PDF-Version Status aktualisieren (vereinfachter Workflow)
      if (currentPdfVersion) {
        try {
          await pdfVersionsService.updateVersionStatus(
            currentPdfVersion.id!, 
            'rejected'
          );
          console.log('PDF-Status auf rejected aktualisiert (1-stufiger Workflow)');
        } catch (pdfError) {
          // Fehler beim PDF-Status Update
          // Nicht kritisch - fahre fort
        }
      }
      
      // Aktualisiere lokalen State
      const newFeedback = {
        comment: feedbackText.trim(),
        requestedAt: new Date() as any,
        author: 'Kunde'
      };

      setCampaign({
        ...campaign,
        status: 'changes_requested',
        approvalData: {
          ...campaign.approvalData!,
          status: 'commented',
          feedbackHistory: [...(campaign.approvalData?.feedbackHistory || []), newFeedback]
        }
      });
      
      // Update PDF State lokal
      if (currentPdfVersion) {
        setCurrentPdfVersion({
          ...currentPdfVersion,
          status: 'rejected'
        });
      }
      
      setFeedbackText('');
      setShowFeedbackForm(false);
      setActionCompleted(true);
    } catch (error) {
      // Fehler beim Senden des Feedbacks
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
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <Heading level={2} className="text-red-900 mb-2">Fehler</Heading>
          <Text className="text-gray-600">{error}</Text>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const currentStatus = campaign.approvalData?.status || 'pending';
  const statusInfo = approvalStatusConfig[currentStatus];
  const StatusIcon = statusInfo.icon;
  const isApproved = currentStatus === 'approved';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <Badge color={statusInfo.color} className="inline-flex items-center gap-1 w-fit">
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
                {campaign.clientName && (
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-500">
                    <BuildingOfficeIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{campaign.clientName}</span>
                  </div>
                )}
              </div>
              
              <Heading level={1} className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                {campaign.title}
              </Heading>
              
              <Text className="text-sm sm:text-base text-gray-600">{statusInfo.description}</Text>
              
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                  <span>Erstellt am {formatDate(campaign.createdAt)}</span>
                </div>
                {campaign.approvalData?.approvedAt && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                    <span>Freigegeben am {formatDate(campaign.approvalData.approvedAt)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Logo oder Fallback */}
            <div className="text-right flex-shrink-0">
              {brandingSettings?.logoUrl ? (
                <img 
                  src={brandingSettings.logoUrl} 
                  alt={brandingSettings.companyName || 'Logo'} 
                  className="h-8 sm:h-12 w-auto object-contain"
                />
              ) : (
                <>
                  <div className="text-xs text-gray-400 mb-1">Freigabe-System</div>
                  <div className="text-xs sm:text-sm font-medium text-[#005fab]">CeleroPress</div>
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

          {/* Feedback History im WhatsApp-Stil */}
          {campaign.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                Bisheriges Feedback
              </h3>
              <div className="bg-gray-100 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                {[...campaign.approvalData.feedbackHistory].reverse().map((feedback, index) => {
                  const isAgency = feedback.author === 'Ihre Nachricht' || feedback.author === 'Agentur' || feedback.author === 'System';
                  
                  return (
                    <div key={index} className={`flex ${isAgency ? 'justify-end' : 'justify-start'}`}>
                      <div className={`relative max-w-[75%] ${isAgency ? 'mr-2' : 'ml-2'}`}>
                        {/* Sprechblase */}
                        <div className={`
                          rounded-lg px-4 py-3 relative shadow-sm
                          ${isAgency 
                            ? 'bg-[#005fab] text-white' 
                            : 'bg-white text-gray-800 border border-gray-200'}
                        `}>
                          {/* Sprechblasen-Spitze */}
                          <div className={`
                            absolute top-4 w-0 h-0
                            ${isAgency 
                              ? 'right-[-8px] border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-[#005fab]' 
                              : 'left-[-8px] border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-white'}
                          `}></div>
                          
                          {/* Author */}
                          <div className={`text-xs font-semibold mb-1 ${isAgency ? 'text-blue-100' : 'text-gray-600'}`}>
                            {feedback.author}
                          </div>
                          
                          {/* Nachricht */}
                          <p className="text-sm break-words leading-relaxed">{feedback.comment}</p>
                          
                          {/* Zeitstempel */}
                          <div className={`text-xs mt-2 ${isAgency ? 'text-blue-100 opacity-80' : 'text-gray-400'}`}>
                            {formatDate(feedback.requestedAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NEU: Customer Approval Message */}
          {customerMessage && (
            <CustomerMessageBanner message={customerMessage} />
          )}

          {/* MODERNISIERTE CAMPAIGN-PREVIEW - Phase 3 */}
          <CampaignPreviewRenderer
            campaignTitle={campaign.title}
            contentHtml={campaign.contentHtml}
            keyVisual={campaign.keyVisual}
            clientName={campaign.clientName}
            createdAt={campaign.createdAt}
            attachedAssets={campaign.attachedAssets}
            textbausteine={campaign.boilerplateSections}
            keywords={campaign.keywords}
            isCustomerView={true}
            showSimplified={true}
            className="mb-6"
          />

          {/* MODERNISIERTE PDF-INTEGRATION - Phase 2 */}
          {currentPdfVersion ? (
            <div className="mb-6">
              <CustomerPDFViewer 
                version={currentPdfVersion}
                campaignTitle={campaign.title}
                onHistoryToggle={() => setShowPdfHistory(true)}
                totalVersions={pdfVersions.length}
              />
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="font-medium text-red-900">Systemfehler</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Keine PDF-Version gefunden. Dies sollte nicht passieren - 
                    bei Kundenfreigaben wird automatisch eine PDF-Version erstellt.
                  </p>
                  <p className="text-xs text-red-600 mt-2">
                    Bitte kontaktieren Sie den Support mit folgender Information: 
                    Campaign ID: {campaign?.id}, ShareId: {shareId}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* NEU: Media Gallery */}
          {campaign.attachedAssets && (
            <MediaGallery 
              attachments={campaign.attachedAssets} 
              loading={loading}
            />
          )}

          {/* MODERNISIERTE PDF-APPROVAL-ACTIONS - Phase 2 */}
          {!isApproved && !actionCompleted && currentPdfVersion && (
            <PDFApprovalActions
              version={currentPdfVersion}
              currentStatus={currentStatus}
              onApprove={handleApprove}
              onRequestChanges={async (feedback) => {
                setFeedbackText(feedback);
                await handleRequestChanges();
              }}
              disabled={submitting}
              className="mb-6"
            />
          )}

          {/* FALLBACK: Legacy Actions für Fälle ohne PDF */}
          {!isApproved && !actionCompleted && !currentPdfVersion && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ihre Aktion</h3>
              
              {showFeedbackForm ? (
                <CustomerFeedbackForm
                  onSubmit={async (feedback) => {
                    setFeedbackText(feedback);
                    await handleRequestChanges();
                  }}
                  onCancel={() => {
                    setShowFeedbackForm(false);
                    setFeedbackText('');
                  }}
                  disabled={submitting}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Bitte prüfen Sie die Pressemitteilung{campaign.attachedAssets && campaign.attachedAssets.length > 0 ? ' und die angehängten Medien' : ''} sorgfältig. 
                    Sie können entweder die Freigabe erteilen oder Änderungen anfordern.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleApprove}
                      className="flex-1 bg-[#005fab] hover:bg-[#004a8c] text-white"
                      disabled={submitting}
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

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Hinweis zum Freigabeprozess</p>
                <p>
                  Nach Ihrer Freigabe kann die Pressemitteilung{currentPdfVersion ? ' mit der finalen PDF-Version' : ''}{campaign.attachedAssets && campaign.attachedAssets.length > 0 ? ' zusammen mit den Medien' : ''} von der Agentur versendet werden. Bei Änderungswünschen wird die Agentur benachrichtigt und die Mitteilung entsprechend angepasst.
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

      {/* PDF History Modal */}
      {showPdfHistory && (
        <PDFHistoryModal
          versions={pdfVersions}
          variant="customer"
          onClose={() => setShowPdfHistory(false)}
        />
      )}
    </div>
  );
}