// src/app/freigabe/[shareId]/page.tsx - Öffentliche Freigabe-Seite (kein Auth erforderlich)
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { useParams } from "next/navigation";
import { useToggleState } from "@/hooks/use-toggle-state";
import { PRCampaign } from "@/types/pr";
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
import { LatestMessageBanner } from '@/components/freigabe/LatestMessageBanner';
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
  DocumentIcon,
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

  // Helper: Rekonstruiert Firestore Timestamps aus serialisierten Daten
  const parseTimestamp = (val: any) => {
    if (!val) return val;
    if (val._seconds !== undefined) {
      return new Date(val._seconds * 1000);
    }
    if (typeof val === 'string') {
      return new Date(val);
    }
    return val;
  };

  const loadCampaign = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Alle Daten über öffentliche API-Route laden (kein Auth erforderlich)
      const res = await fetch(`/api/public/approval/${shareId}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || 'Freigabe-Link nicht gefunden oder nicht mehr gültig.');
        return;
      }

      const data = await res.json();
      const { approval: approvalData, campaign: campaignData, pdfVersions: pdfVersionsData, brandingSettings: brandingData, teamMember: teamMemberData } = data;

      setApproval(approvalData);

      // Vereinfachte Approval-Daten (1-stufiger Workflow)
      const approvalDataForCampaign = {
        shareId: approvalData.shareId,
        status: approvalData.status === 'approved' ? 'approved' :
                approvalData.status === 'rejected' ? 'commented' :
                approvalData.status === 'changes_requested' ? 'commented' :
                approvalData.status === 'pending' ? 'pending' : 'viewed',
        feedbackHistory: approvalData.history?.filter((h: any) => h.details?.comment).map((h: any) => {
          let authorName = h.actorName || 'Teammitglied';

          if (h.actorName === 'Kunde' || h.actorEmail?.includes('customer') || h.actorEmail?.includes('freigabe.system')) {
            if (approvalData.recipients?.[0]?.name) {
              authorName = approvalData.recipients[0].name;
            } else {
              authorName = 'Kunde';
            }
          }

          return {
            comment: h.details?.comment || '',
            requestedAt: parseTimestamp(h.timestamp),
            author: authorName,
            action: h.action
          };
        }) || [],
        approvedAt: parseTimestamp(approvalData.approvedAt),
        customerApprovalRequired: true,
        teamApprovalRequired: false,
        teamApprovers: [],
        currentStage: 'customer' as const,
        workflowStartedAt: parseTimestamp(approvalData.requestedAt),
        workflowId: approvalData.id
      };

      campaignData.approvalData = approvalDataForCampaign as any;

      // PDF-Versionen setzen
      if (pdfVersionsData && pdfVersionsData.length > 0) {
        setPdfVersions(pdfVersionsData);

        const currentPdf = pdfVersionsData.find((v: any) =>
          v.status === 'pending_customer' ||
          v.status === 'approved' ||
          v.status === 'rejected'
        ) || pdfVersionsData[0];

        setCurrentPdfVersion(currentPdf);

        if (!currentPdf) {
          setError('Systemfehler: PDF-Version nicht gefunden. Bitte Support kontaktieren.');
          return;
        }
      }

      // Customer Contact aus Recipients
      if (approvalData.recipients && approvalData.recipients.length > 0) {
        const recipient = approvalData.recipients[0];
        setCustomerContact({
          name: recipient.name || approvalData.clientName || 'Kunde',
          email: recipient.email || approvalData.clientEmail || '',
          role: 'client'
        });
      } else {
        setCustomerContact({
          name: approvalData.clientName || 'Kunde',
          email: approvalData.clientEmail || '',
          role: 'client'
        });
      }

      if (approvalData.customerMessage) {
        setCustomerMessage(approvalData.customerMessage);
      }

      // Markiere als "viewed" über API (non-blocking)
      if (approvalData.status === 'pending' || approvalData.status === 'in_review' || approvalData.status === 'changes_requested') {
        fetch(`/api/public/approval/${shareId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'markAsViewed' })
        }).catch(() => {});
      }

      setCampaign(campaignData);

      // Team-Member und Branding kommen direkt aus der API-Antwort
      if (teamMemberData) {
        setTeamMember(teamMemberData);
      }
      if (brandingData) {
        setBrandingSettings(brandingData);
      }

    } catch (error) {
      setError('Die Pressemitteilung konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [shareId]);

  const handleApprove = async () => {
    if (!campaign) return;

    try {
      setSubmitting(true);

      // Freigabe über öffentliche API-Route
      const res = await fetch(`/api/public/approval/${shareId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          authorName: customerContact?.name || 'Kunde'
        })
      });

      if (!res.ok) {
        throw new Error('Freigabe fehlgeschlagen');
      }

      // PDF-Version Status aktualisieren über API
      if (currentPdfVersion?.id) {
        fetch(`/api/public/approval/${shareId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updatePdfStatus',
            pdfVersionId: currentPdfVersion.id,
            status: 'approved'
          })
        }).catch(() => {});
      }

      // Benachrichtigungen werden server-seitig in der API-Route erstellt

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

      if (currentPdfVersion) {
        setCurrentPdfVersion({
          ...currentPdfVersion,
          status: 'approved'
        });
      }

      setActionCompleted(true);
      setShowFeedbackForm(false);
    } catch (error) {
      alert('Die Freigabe konnte nicht erteilt werden. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async (changesText?: string) => {
    const textToSubmit = changesText || feedbackText;

    if (!campaign || !textToSubmit.trim()) return;

    try {
      setSubmitting(true);

      // Änderungen über öffentliche API-Route anfordern
      const res = await fetch(`/api/public/approval/${shareId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'requestChanges',
          comment: textToSubmit.trim(),
          authorName: customerContact?.name || 'Kunde',
          recipientEmail: customerContact?.email || 'customer@freigabe.system'
        })
      });

      if (!res.ok) {
        throw new Error('Feedback konnte nicht gesendet werden');
      }

      // PDF-Version Status aktualisieren über API
      if (currentPdfVersion?.id) {
        fetch(`/api/public/approval/${shareId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updatePdfStatus',
            pdfVersionId: currentPdfVersion.id,
            status: 'rejected'
          })
        }).catch(() => {});
      }

      // Benachrichtigungen und Inbox-Thread werden server-seitig in der API-Route erstellt

      // Aktualisiere lokalen State
      const newFeedback = {
        comment: textToSubmit.trim(),
        requestedAt: new Date() as any,
        author: customerContact?.name || 'Kunde',
        action: 'changes_requested'
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

          {/* Latest Message Banner - identisch zur Toggle-Box */}
          <LatestMessageBanner 
            latestMessage={(() => {
              const feedbackHistory = campaign.approvalData?.feedbackHistory;
              if (!feedbackHistory || feedbackHistory.length === 0) return undefined;
              
              // Sortierte Liste - neueste zuerst für latestMessage
              const sortedHistory = feedbackHistory.sort((a, b) => {
                const aTime = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : a.requestedAt.toMillis());
                const bTime = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : b.requestedAt.toMillis());
                return bTime - aTime; // Neueste zuerst für latestMessage
              });
              
              const latest = sortedHistory[0]; // Erste = neueste
              if (!latest) return undefined;
              
              // KORREKTE Erkennung basierend auf action-Feld
              const isCustomer = (latest as any).action === 'changes_requested';
              
              // Namen und Avatar basierend auf isCustomer
              let senderName, senderAvatar;
              if (isCustomer) {
                // KUNDE: Grüner Avatar
                senderName = customerContact?.name || latest.author || 'Kunde';
                senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`;
              } else {
                // TEAM: Blauer Avatar oder echtes Foto
                senderName = teamMember?.displayName || latest.author || 'Teammitglied';
                senderAvatar = teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
              }
              
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
                createdAt: latest.requestedAt?.toDate ? latest.requestedAt.toDate() : (latest.requestedAt instanceof Date ? latest.requestedAt : new Date()),
                isRead: true,
                campaignId: shareId,
                organizationId: campaign.organizationId || ''
              };
            })()}
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
                const aTime = a.requestedAt ? (a.requestedAt instanceof Date ? a.requestedAt.getTime() : new Date(a.requestedAt as any).getTime()) : 0;
                const bTime = b.requestedAt ? (b.requestedAt instanceof Date ? b.requestedAt.getTime() : new Date(b.requestedAt as any).getTime()) : 0;
                return aTime - bTime; // Umgekehrt: Älteste zuerst, neueste unten
              }).map((feedback, index) => {
                // KORREKTE Erkennung basierend auf action-Feld
                const isCustomer = (feedback as any).action === 'changes_requested';
                
                // Namen und Avatar basierend auf isCustomer
                let senderName, senderAvatar;
                if (isCustomer) {
                  // KUNDE: Grüner Avatar
                  senderName = customerContact?.name || feedback.author || 'Kunde';
                  senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`;
                } else {
                  // TEAM: Blauer Avatar oder echtes Foto
                  senderName = teamMember?.displayName || feedback.author || 'Teammitglied';
                  senderAvatar = teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
                }
                
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
                  createdAt: feedback.requestedAt?.toDate ? feedback.requestedAt.toDate() : (feedback.requestedAt instanceof Date ? feedback.requestedAt : new Date()),
                  isRead: true,
                  campaignId: shareId,
                  organizationId: campaign.organizationId || ''
                };
              }) || []}
              latestMessage={(() => {
                const feedbackHistory = campaign.approvalData?.feedbackHistory;
                if (!feedbackHistory || feedbackHistory.length === 0) return undefined;
                
                // Sortierte Liste - neueste zuerst für latestMessage
                const sortedHistory = feedbackHistory.sort((a, b) => {
                  const aTime = a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : (a.requestedAt instanceof Date ? a.requestedAt.getTime() : a.requestedAt.toMillis());
                  const bTime = b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : (b.requestedAt instanceof Date ? b.requestedAt.getTime() : b.requestedAt.toMillis());
                  return bTime - aTime; // Neueste zuerst für latestMessage
                });
                
                const latest = sortedHistory[0]; // Erste = neueste
                // KORREKTE Erkennung basierend auf action-Feld
                const isCustomer = (latest as any).action === 'changes_requested';
                
                // Namen und Avatar basierend auf isCustomer
                let senderName, senderAvatar;
                if (isCustomer) {
                  // KUNDE: Grüner Avatar
                  senderName = customerContact?.name || latest.author || 'Kunde';
                  senderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=10b981&color=fff&size=32`;
                } else {
                  // TEAM: Blauer Avatar oder echtes Foto
                  senderName = teamMember?.displayName || latest.author || 'Teammitglied';
                  senderAvatar = teamMember?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=005fab&color=fff&size=32`;
                }
                
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
                  createdAt: latest.requestedAt?.toDate ? latest.requestedAt.toDate() : (latest.requestedAt instanceof Date ? latest.requestedAt : new Date()),
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