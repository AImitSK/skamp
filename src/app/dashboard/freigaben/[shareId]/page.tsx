// src/app/freigabe/[shareId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { prService } from "@/lib/firebase/pr-service";
import { PRCampaign } from "@/types/pr";
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
  InformationCircleIcon // HINZUGEFÜGT
} from "@heroicons/react/24/outline";
import { Button } from "@/components/button";
import { Textarea } from "@/components/textarea";
import { Heading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/badge";
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
  
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);

  useEffect(() => {
    if (shareId) {
      loadCampaign();
    }
  }, [shareId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      setError(null);

      const campaignData = await prService.getCampaignByShareId(shareId);
      
      if (!campaignData) {
        setError('Freigabe-Link nicht gefunden oder nicht mehr gültig.');
        return;
      }

      // Markiere als "viewed" wenn noch pending - KORRIGIERT
      if (campaignData.approvalData?.status === 'pending') {
        await prService.markApprovalAsViewed(shareId); // Verwende die korrekte Funktion
        campaignData.approvalData.status = 'viewed';
      }

      setCampaign(campaignData);

    } catch (error) {
      console.error('Fehler beim Laden der Kampagne:', error);
      setError('Die Pressemitteilung konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!campaign) return;

    try {
      setSubmitting(true);
      await prService.approveCampaign(shareId);
      
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
      
      setActionCompleted(true);
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Fehler bei der Freigabe:', error);
      alert('Die Freigabe konnte nicht erteilt werden. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!campaign || !feedbackText.trim()) return;

    try {
      setSubmitting(true);
      await prService.submitFeedback(shareId, feedbackText.trim());
      
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
      
      setFeedbackText('');
      setShowFeedbackForm(false);
      setActionCompleted(true);
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

  if (!campaign) return null;

  const currentStatus = campaign.approvalData?.status || 'pending';
  const statusInfo = approvalStatusConfig[currentStatus];
  const StatusIcon = statusInfo.icon;
  const isApproved = currentStatus === 'approved';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge color={statusInfo.color} className="inline-flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
                {campaign.clientName && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    {campaign.clientName}
                  </div>
                )}
              </div>
              
              <Heading level={1} className="text-2xl font-bold text-gray-900 mb-2">
                {campaign.title}
              </Heading>
              
              <Text className="text-gray-600">{statusInfo.description}</Text>
              
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Erstellt am {formatDate(campaign.createdAt)}
                </div>
                {campaign.approvalData?.approvedAt && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircleIcon className="h-4 w-4" />
                    Freigegeben am {formatDate(campaign.approvalData.approvedAt)}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">Freigabe-System</div>
              <div className="text-sm font-medium text-[#005fab]">SKAMP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
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

        {/* Feedback History */}
        {campaign.approvalData?.feedbackHistory && campaign.approvalData.feedbackHistory.length > 0 && (
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
              dangerouslySetInnerHTML={{ __html: campaign.contentHtml }}
            />
          </div>
        </div>

        {/* Actions */}
        {!isApproved && !actionCompleted && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ihre Aktion</h3>
            
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
                    disabled={!feedbackText.trim() || submitting}
                    color="indigo" // KORRIGIERT: Verwende indigo statt orange
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
                  Bitte prüfen Sie die Pressemitteilung sorgfältig. Sie können entweder die Freigabe erteilen 
                  oder Änderungen anfordern.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleApprove}
                    color="indigo" // KORRIGIERT: Verwende indigo statt green
                    className="flex-1 bg-green-600 hover:bg-green-500" // Füge grünes Styling als Klassen hinzu
                    disabled={submitting}
                  >
                    <CheckIcon className="h-5 w-5 mr-2" />
                    {submitting ? 'Wird verarbeitet...' : 'Freigabe erteilen'}
                  </Button>
                  <Button
                    onClick={() => setShowFeedbackForm(true)}
                    plain // KORRIGIERT: Verwende plain statt dark/white
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
                Nach Ihrer Freigabe kann die Pressemitteilung von der Agentur versendet werden. 
                Bei Änderungswünschen wird die Agentur benachrichtigt und die Mitteilung entsprechend angepasst.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Bereitgestellt über SKAMP PR-Suite</p>
          </div>
        </div>
      </div>
    </div>
  );
}