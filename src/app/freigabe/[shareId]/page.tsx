// src/app/freigabe/[shareId]/page.tsx - Mit Branding-Integration
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { useParams } from "next/navigation";
import { prService } from "@/lib/firebase/pr-service";
import { approvalService } from "@/lib/firebase/approval-service";
import { mediaService } from "@/lib/firebase/media-service";
import { brandingService } from "@/lib/firebase/branding-service";
import { teamMemberService } from "@/lib/firebase/team-service-enhanced";
import { pdfVersionsService } from "@/lib/firebase/pdf-versions-service";
import { notificationsService } from "@/lib/firebase/notifications-service";
import { inboxService } from "@/lib/firebase/inbox-service";
import { useToggleState } from "@/hooks/use-toggle-state";
import { PRCampaign, CampaignAssetAttachment } from "@/types/pr";
import { MediaAsset, MediaFolder } from "@/types/media";
import { BrandingSettings } from "@/types/branding";
import { PDFVersion as ServicePDFVersion } from "@/lib/firebase/pdf-versions-service";
import { PDFVersion } from "@/types/customer-review";
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
// OPTIMIERUNG: Lazy-Loading für Toggle-Komponenten
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamische Imports mit Loading-States
const MediaToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.MediaToggleBox })),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

const PDFHistoryToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.PDFHistoryToggleBox })),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

const CommunicationToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.CommunicationToggleBox })),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);

const DecisionToggleBox = dynamic(
  () => import("@/components/customer-review/toggle").then(mod => ({ default: mod.DecisionToggleBox })),
  { 
    loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-32"></div>,
    ssr: false
  }
);
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

// NEU: Customer Message Banner Component - zeigt letzte Agentur-Nachricht
function CustomerMessageBanner({ 
  feedbackHistory,
  campaign,
  teamMember,
  customerContact
}: { 
  feedbackHistory: any[],
  campaign: any,
  teamMember: any,
  customerContact: any
}) {
  if (!feedbackHistory || feedbackHistory.length === 0) return null;
  
  // Finde die letzte Nachricht von der Agentur (alles was NICHT vom Kunden ist)
  const agencyMessages = feedbackHistory.filter(msg => 
    msg.author !== 'Kunde' && 
    msg.author !== 'Customer' && 
    msg.author !== customerContact?.name &&
    !(teamMember && msg.author === customerContact?.name) // Sicherheitscheck
  );
  
  if (agencyMessages.length === 0) return null;
  
  const latestAgencyMessage = agencyMessages[agencyMessages.length - 1];
  
  // Bestimme den korrekten Absender-Namen
  const senderName = teamMember?.displayName || campaign.userName || campaign.createdBy?.name || 'Teammitglied';
  
  // Formatiere Zeitstempel
  const formatTimeAgo = (date: any) => {
    if (!date) return 'gerade eben';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    
    // Validierung: Prüfe ob Datum gültig ist
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'unbekannt';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
    // Zusätzliche Validierung für negative Zeiten
    if (diffInMinutes < 0) return 'gerade eben';
    if (diffInMinutes < 1) return 'gerade eben';
    if (diffInMinutes < 60) return `vor ${diffInMinutes} Min.`;
    if (diffInMinutes < 1440) return `vor ${Math.floor(diffInMinutes / 60)} Std.`;
    return `vor ${Math.floor(diffInMinutes / 1440)} Tag(en)`;
  };
  
  // Avatar-URL generieren
  const senderAvatar = teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`; // Blau für Team
  
  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex">
        <div className="mr-3 flex-shrink-0">
          <img
            src={senderAvatar}
            alt={senderName}
            className="h-8 w-8 rounded-full"
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-green-900">Neueste Nachricht</h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Feedback
            </span>
            <span className="text-sm text-green-700">
              {formatTimeAgo(latestAgencyMessage.requestedAt)}
            </span>
          </div>
          <div className="text-sm text-green-800 mb-2">
            <strong>Von:</strong> {senderName}
          </div>
          <div className="text-green-900 whitespace-pre-wrap">
            {latestAgencyMessage.comment}
          </div>
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
  
  // OPTIMIERUNG: Memoized Toggle-State-Management
  const toggleInitialState = useMemo(() => ({
    'decision': true // Entscheidung standardmäßig geöffnet
  }), []);
  
  const { toggleStates, toggleBox, isOpen } = useToggleState(toggleInitialState);
  
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);
  
  // NEU: PDF-Integration State
  const [pdfVersions, setPdfVersions] = useState<ServicePDFVersion[]>([]);
  const [currentPdfVersion, setCurrentPdfVersion] = useState<ServicePDFVersion | null>(null);
  const [showPdfHistory, setShowPdfHistory] = useState(false);
  const [customerMessage, setCustomerMessage] = useState<string>('');
  const [teamMember, setTeamMember] = useState<any>(null);
  const [customerContact, setCustomerContact] = useState<any>(null);
  const [approval, setApproval] = useState<any>(null);

  useEffect(() => {
    if (shareId) {
      loadCampaign();
    }
  }, [shareId]);

  const loadCampaign = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // NEU: Direkte Approval-Service Nutzung (vereinfachter 1-stufiger Workflow)
      const approvalData = await approvalService.getByShareId(shareId);
      
      if (!approvalData) {
        setError('Freigabe-Link nicht gefunden oder nicht mehr gültig.');
        return;
      }
      
      setApproval(approvalData);
      
      // Lade zugehörige Campaign über approvalService
      const campaignData = await prService.getById(approvalData.campaignId);
      
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
      const approvalDataForCampaign = {
        shareId: approvalData.shareId,
        status: approvalData.status === 'approved' ? 'approved' : 
                approvalData.status === 'rejected' ? 'commented' :
                approvalData.status === 'changes_requested' ? 'commented' :
                approvalData.status === 'pending' ? 'pending' : 'viewed',
        feedbackHistory: approvalData.history?.filter(h => h.details?.comment).map(h => {
          // Verwende den Namen aus recipients für Kunden, sonst actorName
          let authorName = h.actorName || 'Teammitglied';
          
          // NUR für Kundennachrichten: Ersetze "Kunde" durch den echten Namen
          if (h.actorName === 'Kunde' || h.actorEmail?.includes('customer') || h.actorEmail?.includes('freigabe.system')) {
            if (approvalData.recipients?.[0]?.name) {
              authorName = approvalData.recipients[0].name;
            } else if (customerContact?.name) {
              authorName = customerContact.name;
            } else {
              authorName = 'Kunde';
            }
          }
          
          return {
            comment: h.details?.comment || '',
            requestedAt: h.timestamp,
            author: authorName
          };
        }) || [],
        approvedAt: approvalData.approvedAt,
        customerApprovalRequired: true,
        teamApprovalRequired: false,
        teamApprovers: [],
        currentStage: 'customer' as const,
        workflowStartedAt: approvalData.requestedAt,
        workflowId: approvalData.id
      };
      
      // Merge Campaign mit vereinfachten Approval-Daten
      campaignData.approvalData = approvalDataForCampaign as any;

      // 🐛 TEMP DEBUG: Prüfe Content-Properties


      // PDF-Versionen laden (vereinfachter 1-stufiger Workflow)
      if (approvalData.campaignId) {
        try {
          const pdfVersions = await pdfVersionsService.getVersionHistory(approvalData.campaignId);
          
          setPdfVersions(pdfVersions);
          
          // Vereinfachte PDF-Status-Logik (kein Team-Approval):
          // Suche nach der aktuellen Customer-PDF (nur pending_customer, approved, rejected)
          const currentPdfVersion = pdfVersions.find(v => 
            v.status === 'pending_customer' || 
            v.status === 'approved' || 
            v.status === 'rejected'
          ) || pdfVersions[0]; // Fallback zur neuesten Version
          
          setCurrentPdfVersion(currentPdfVersion);
          
          
          // VALIDIERUNG: PDF MUSS vorhanden sein!
          if (!currentPdfVersion) {
            // Keine PDF-Version verfügbar
            setError('Systemfehler: PDF-Version nicht gefunden. Bitte Support kontaktieren.');
            return;
          }
          
        } catch (pdfError) {
          // Fehler beim Laden der PDF-Versionen - nicht kritisch
          setError('PDF-Versionen konnten nicht geladen werden.');
          return;
        }
      }

      // Customer Contact Daten laden (aus approvalData oder approval)
      if (campaignData.approvalData && (campaignData.approvalData as any).customerContact) {
        setCustomerContact((campaignData.approvalData as any).customerContact);
      } else if ((approvalData as any).customerContact) {
        // Fallback: Direkt aus approval laden
        setCustomerContact((approvalData as any).customerContact);
      } else if ((approvalData as any).recipients && (approvalData as any).recipients.length > 0) {
        // Fallback: Ersten Empfänger als customerContact verwenden
        const firstRecipient = (approvalData as any).recipients[0];
        setCustomerContact({
          name: firstRecipient.name || 'Kunde',
          email: firstRecipient.email || '',
          role: firstRecipient.role || ''
        });
      }
      
      // Customer Approval Message aus Approval-Service (vereinfacht)
      if ((approvalData as any).customerMessage) {
        setCustomerMessage((approvalData as any).customerMessage);
      }

      // Markiere als "viewed" bei allen aktiven Status (nicht nur pending)
      if (approvalData.status === 'pending' || approvalData.status === 'in_review' || approvalData.status === 'changes_requested') {
        await approvalService.markAsViewed(shareId);
      }

      setCampaign(campaignData);

      // Lade TeamMember-Daten für den zuständigen Mitarbeiter
      if (campaignData.organizationId && campaignData.userId) {
        try {
          const members = await teamMemberService.getByOrganization(campaignData.organizationId);
          const member = members.find(m => m.userId === campaignData.userId);
          if (member) {
            setTeamMember(member);
          }
        } catch (teamError) {
          // Fehler beim Laden der TeamMember-Daten - nicht kritisch
        }
      }

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
  }, [shareId]);

  const handleApprove = async () => {
    if (!campaign) return;

    try {
      setSubmitting(true);
      
      // NEU: Direkte Approval-Service Nutzung (vereinfachter Workflow)
      await approvalService.submitDecisionPublic(
        shareId,
        'approved',
        undefined, // Kein Kommentar bei Freigabe
        customerContact?.name || 'Kunde'
      );
      
      // PDF-Version Status aktualisieren (vereinfachter Workflow)
      if (currentPdfVersion) {
        try {
          await pdfVersionsService.updateVersionStatus(
            currentPdfVersion.id!, 
            'approved'
          );
        } catch (pdfError) {
          // Fehler beim PDF-Status Update
          // Nicht kritisch - fahre fort
        }
      }

      // Email-Benachrichtigung an internen User senden
      try {
        await notificationsService.notifyApprovalGranted(
          campaign,
          customerContact?.name || 'Kunde', // Customer-Name
          campaign.userId,
          campaign.organizationId
        );
      } catch (notificationError) {
        // Notification-Fehler nicht kritisch
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

  const handleRequestChanges = async (changesText?: string) => {
    // Verwende übergebenen Text oder fallback auf feedbackText
    const textToSubmit = changesText || feedbackText;
    
    if (!campaign || !textToSubmit.trim()) return;

    try {
      setSubmitting(true);
      
      // NEU: Direkte Approval-Service Nutzung (vereinfachter Workflow)
      await approvalService.requestChangesPublic(
        shareId,
        customerContact?.email || 'customer@freigabe.system', // Customer E-Mail
        textToSubmit.trim(),
        customerContact?.name || 'Kunde'
      );
      
      // PDF-Version Status aktualisieren (vereinfachter Workflow)
      if (currentPdfVersion) {
        try {
          await pdfVersionsService.updateVersionStatus(
            currentPdfVersion.id!, 
            'rejected'
          );
        } catch (pdfError) {
          // Fehler beim PDF-Status Update
          // Nicht kritisch - fahre fort
        }
      }

      // Email-Benachrichtigung und Inbox-Thread erstellen
      try {
        // Notification an internen User
        await notificationsService.notifyChangesRequested(
          campaign,
          customerContact?.name || 'Kunde', // Customer-Name
          campaign.userId
        );

        // Inbox-Thread für Communication
        await inboxService.createApprovalThread({
          organizationId: campaign.organizationId || '',
          approvalId: shareId,
          campaignTitle: campaign.title || 'Pressemitteilung',
          clientName: campaign.clientName || 'Kunde',
          createdBy: {
            userId: 'customer',
            name: customerContact?.name || 'Kunde',
            email: customerContact?.email || 'kunde@example.com'
          },
          initialMessage: feedbackText.trim()
        });
      } catch (communicationError) {
        // Communication-Fehler nicht kritisch
      }
      
      // Aktualisiere lokalen State
      const newFeedback = {
        comment: feedbackText.trim(),
        requestedAt: new Date() as any,
        author: customerContact?.name || 'Kunde'
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
              
              {campaign.approvalData?.approvedAt && (
                <div className="mt-3 flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
                  <span>Freigegeben am {formatDate(campaign.approvalData.approvedAt)}</span>
                </div>
              )}
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


          {/* NEU: Customer Approval Message - zeigt letzte Agentur-Nachricht */}
          <CustomerMessageBanner 
            feedbackHistory={campaign.approvalData?.feedbackHistory || []}
            campaign={campaign}
            teamMember={teamMember}
            customerContact={customerContact}
          />

          {/* MODERNISIERTE CAMPAIGN-PREVIEW - Phase 3 */}
          <CampaignPreviewRenderer
            campaignTitle={campaign.title}
            contentHtml={
              // mainContent ist der vollständige Content (2018 Zeichen)
              (campaign as any).finalContentHtml || campaign.mainContent || campaign.contentHtml || '<p>Kein Inhalt verfügbar</p>'
            }
            keyVisual={campaign.keyVisual}
            clientName={campaign.clientName}
            createdAt={campaign.createdAt}
            attachedAssets={campaign.attachedAssets}
            textbausteine={campaign.boilerplateSections || []}
            keywords={campaign.keywords || []}
            organizationId={campaign.organizationId}
            isCustomerView={true}
            showSimplified={false}
            className="mb-6"
          />

          {/* OPTIMIERTE TOGGLE-STRUKTUR mit Lazy Loading */}
          <div className="space-y-4">
            <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded-lg h-64"></div>}>
            {/* Toggle 1: Angehängte Medien */}
            <MediaToggleBox
              id="attached-media"
              title="Angehängte Medien"
              isExpanded={isOpen('attached-media')}
              onToggle={toggleBox}
              organizationId={campaign.organizationId || ''}
              mediaItems={campaign.attachedAssets?.map(asset => ({
                id: asset.id,
                filename: asset.metadata?.fileName || `Asset-${asset.id}`,
                name: asset.metadata?.fileName || `Asset-${asset.id}`,
                mimeType: asset.metadata?.fileType || (asset.type === 'asset' ? 'image/jpeg' : 'application/octet-stream'),
                size: 0,
                url: asset.metadata?.thumbnailUrl || '',
                thumbnailUrl: asset.metadata?.thumbnailUrl || '',
                uploadedAt: new Date(),
                uploadedBy: { id: '', name: '', email: '' },
                organizationId: campaign.organizationId || '',
                metadata: {}
              })) || []}
              onMediaSelect={(mediaId) => {
                // Fullscreen-Viewer öffnen
                const media = campaign.attachedAssets?.find(asset => asset.id === mediaId);
                if (media && media.metadata?.thumbnailUrl) {
                  window.open(media.metadata.thumbnailUrl, '_blank');
                }
              }}
              className="mb-4"
            />

            {/* Toggle 2: PDF-Historie */}
            <PDFHistoryToggleBox
              id="pdf-history"
              title="PDF-Historie"
              isExpanded={isOpen('pdf-history')}
              onToggle={toggleBox}
              organizationId={campaign.organizationId || ''}
              pdfVersions={pdfVersions?.map(version => ({
                ...version,
                id: version.id || `version-${version.version}`,
                version: String(version.version),
                status: version.status as 'draft' | 'pending_customer' | 'approved' | 'rejected' | undefined,
                metadata: version.metadata || {},
                pdfUrl: version.downloadUrl || '',
                isCurrent: version.version === (currentPdfVersion?.version || 1),
                createdAt: version.createdAt instanceof Date 
                  ? version.createdAt 
                  : new Date((version.createdAt as any)?.seconds * 1000 || Date.now()),
                createdBy: version.createdBy || { id: '', name: 'Unbekannt', email: '' },
                fileSize: version.fileSize || 0,
                campaignId: campaign.id,
                organizationId: campaign.organizationId || ''
              } as PDFVersion)) || []}
              onVersionSelect={(versionId) => {
                const version = pdfVersions?.find(v => v.id === versionId);
                if (version && version.downloadUrl) {
                  window.open(version.downloadUrl, '_blank');
                }
              }}
              className="mb-4"
            />

            {/* Toggle 3: Kommunikation */}
            <CommunicationToggleBox
              id="communication"
              title="Kommunikation"
              isExpanded={isOpen('communication')}
              onToggle={toggleBox}
              organizationId={campaign.organizationId || ''}
              communications={campaign.approvalData?.feedbackHistory?.sort((a, b) => {
                // Sortiere nach timestamp - neueste zuerst
                const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : new Date(a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp).getTime();
                const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : new Date(b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp).getTime();
                return bTime - aTime;
              }).map((feedback, index) => {
                // KORREKTE Erkennung basierend auf action-Feld
                const isCustomer = feedback.action === 'changes_requested';
                
                // Namen und Avatar basierend auf isCustomer
                let senderName, senderAvatar;
                if (isCustomer) {
                  senderName = customerContact?.name || 'Kunde';
                  senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`; // Grün für Kunde
                } else {
                  senderName = teamMember?.displayName || feedback.author;
                  senderAvatar = teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`; // Blau für Team
                }
                
                return {
                  id: `feedback-${index}`,
                  type: 'feedback' as const,
                  content: feedback.comment,
                  message: feedback.comment,
                  sender: {
                    id: 'unknown',
                    name: senderName,
                    email: '',
                    role: isCustomer ? 'customer' as const : 'agency' as const
                  },
                  senderName: senderName,
                  senderAvatar: senderAvatar,
                  createdAt: feedback.requestedAt?.toDate ? feedback.requestedAt.toDate() : new Date(),
                  isRead: true,
                  campaignId: shareId,
                  organizationId: campaign.organizationId || ''
                };
              }) || []}
              latestMessage={(() => {
                const feedbackHistory = campaign.approvalData?.feedbackHistory;
                if (!feedbackHistory || feedbackHistory.length === 0) return undefined;
                
                // Sortierte Liste - neueste zuerst
                const sortedHistory = feedbackHistory.sort((a, b) => {
                  const aTime = a.requestedAt ? new Date(a.requestedAt).getTime() : new Date(a.timestamp?.toDate ? a.timestamp.toDate() : a.timestamp).getTime();
                  const bTime = b.requestedAt ? new Date(b.requestedAt).getTime() : new Date(b.timestamp?.toDate ? b.timestamp.toDate() : b.timestamp).getTime();
                  return bTime - aTime;
                });
                
                const latest = sortedHistory[0]; // Erste = neueste
                // KORREKTE Erkennung basierend auf action-Feld
                const isCustomer = latest.action === 'changes_requested';
                
                // Namen und Avatar basierend auf isCustomer
                let senderName, senderAvatar;
                if (isCustomer) {
                  senderName = customerContact?.name || 'Kunde';
                  senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`; // Grün für Kunde
                } else {
                  senderName = teamMember?.displayName || latest.author;
                  senderAvatar = teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`; // Blau für Team
                }
                
                return {
                  id: 'latest',
                  type: 'feedback' as const,
                  content: latest.comment,
                  message: latest.comment,
                  sender: {
                    id: 'unknown',
                    name: senderName,
                    email: '',
                    role: isCustomer ? 'customer' as const : 'agency' as const
                  },
                  senderName: senderName,
                  senderAvatar: senderAvatar,
                  createdAt: latest.requestedAt?.toDate ? latest.requestedAt.toDate() : new Date(),
                  isRead: true,
                  campaignId: shareId,
                  organizationId: campaign.organizationId || ''
                };
              })()}
              onReply={(communication) => {
                setShowFeedbackForm(true);
              }}
              className="mb-4"
            />

            </Suspense>
            
            {/* Toggle 4: Ihre Entscheidung - Nur anzeigen wenn noch keine Aktion erfolgt */}
            {!isApproved && !actionCompleted && (
              <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded-lg h-48"></div>}>
                <DecisionToggleBox
                id="decision"
                title="Ihre Entscheidung"
                isExpanded={isOpen('decision')}
                onToggle={toggleBox}
                organizationId={campaign.organizationId || ''}
                onApprove={handleApprove}
                onReject={async () => {
                  // Reject-Implementierung falls gewünscht
                }}
                onRequestChanges={async (changesText) => {
                  setFeedbackText(changesText);
                  await handleRequestChanges(changesText); // Text direkt übergeben
                }}
                disabled={submitting}
                  className="mb-4"
                />
              </Suspense>
            )}
          </div>


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