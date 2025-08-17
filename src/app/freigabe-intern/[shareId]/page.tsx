// src/app/freigabe-intern/[shareId]/page.tsx - Interne Team-Freigabe Seite
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { prService } from '@/lib/firebase/pr-service';
import { teamApprovalService } from '@/lib/firebase/team-approval-service';
import { approvalWorkflowService } from '@/lib/firebase/approval-workflow-service';
import { PRCampaign } from '@/types/pr';
import { TeamApproval, ApprovalWorkflow } from '@/types/approvals-enhanced';
import { TeamApprovalCard } from '@/components/approvals/TeamApprovalCard';
import { WorkflowVisualization } from '@/components/approvals/WorkflowVisualization';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function InternalApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.shareId as string;
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  
  const [campaign, setCampaign] = useState<PRCampaign | null>(null);
  const [workflow, setWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [userApproval, setUserApproval] = useState<TeamApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!authLoading && !orgLoading && user && currentOrganization) {
      loadApprovalData();
    }
  }, [authLoading, orgLoading, user, currentOrganization, shareId]);

  const loadApprovalData = async () => {
    if (!user || !currentOrganization) return;

    try {
      setLoading(true);
      setError(null);

      // Lade Campaign über ShareID
      const campaignData = await prService.getCampaignByShareId(shareId);
      if (!campaignData) {
        setError('Freigabe-Link nicht gefunden oder nicht mehr gültig.');
        return;
      }

      // Prüfe Organizations-Zugehörigkeit
      if (campaignData.organizationId !== currentOrganization.id) {
        setError('Sie sind nicht berechtigt, diese Freigabe zu sehen.');
        return;
      }

      setCampaign(campaignData);

      // Lade Workflow falls vorhanden
      if (campaignData.approvalData?.workflowId) {
        const workflowData = await approvalWorkflowService.getWorkflow(campaignData.approvalData.workflowId);
        setWorkflow(workflowData);

        // Lade User-spezifische Approval
        const userApprovals = await teamApprovalService.getApprovalsByUser(
          user.uid, 
          currentOrganization.id
        );
        const relevantApproval = userApprovals.find(approval => 
          approval.workflowId === workflowData.id
        );
        setUserApproval(relevantApproval || null);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Freigabe-Daten:', error);
      setError('Die Freigabe-Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (newDecision: 'approved' | 'rejected') => {
    if (!userApproval || !user) return;

    try {
      setSubmitting(true);
      
      await teamApprovalService.submitTeamDecision(
        userApproval.id!,
        user.uid,
        newDecision,
        comment.trim() || undefined
      );

      setDecision(newDecision);
      setUserApproval({
        ...userApproval,
        status: newDecision,
        decision: {
          choice: newDecision,
          comment: comment.trim() || undefined,
          submittedAt: new Date() as any
        }
      });

      // Reload workflow to get updated status
      if (workflow) {
        const updatedWorkflow = await approvalWorkflowService.getWorkflow(workflow.id!);
        setWorkflow(updatedWorkflow);
      }

    } catch (error) {
      console.error('Fehler beim Speichern der Entscheidung:', error);
      alert('Die Entscheidung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auth Guard
  if (authLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Freigabe...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <ShieldCheckIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <Heading level={2} className="text-red-900 mb-2">Anmeldung erforderlich</Heading>
          <Text className="text-gray-600 mb-4">
            Diese Seite ist nur für angemeldete Team-Mitglieder zugänglich.
          </Text>
          <Button 
            onClick={() => router.push('/login')}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            Anmelden
          </Button>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Freigabe-Daten...</p>
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
          <Text className="text-gray-600 mb-4">{error}</Text>
          <Button 
            onClick={() => router.push('/dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!campaign || !workflow || !userApproval) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <InformationCircleIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <Heading level={2} className="text-blue-900 mb-2">Keine Freigabe erforderlich</Heading>
          <Text className="text-gray-600 mb-4">
            Für diese Kampagne ist keine Freigabe von Ihnen erforderlich oder sie wurde bereits bearbeitet.
          </Text>
          <Button 
            onClick={() => router.push('/dashboard')}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isDecisionMade = userApproval.status !== 'pending';
  const userDecision = userApproval.decision?.choice;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge color="blue" className="inline-flex items-center gap-1">
                  <ShieldCheckIcon className="h-3 w-3" />
                  Interne Team-Freigabe
                </Badge>
                {isDecisionMade && (
                  <Badge 
                    color={userDecision === 'approved' ? 'green' : 'red'} 
                    className="inline-flex items-center gap-1"
                  >
                    {userDecision === 'approved' ? (
                      <CheckCircleIcon className="h-3 w-3" />
                    ) : (
                      <XCircleIcon className="h-3 w-3" />
                    )}
                    {userDecision === 'approved' ? 'Freigegeben' : 'Abgelehnt'}
                  </Badge>
                )}
              </div>
              
              <Heading level={1} className="text-2xl font-bold text-gray-900 mb-2">
                {campaign.title}
              </Heading>
              
              <Text className="text-gray-600">
                {isDecisionMade 
                  ? `Sie haben diese Kampagne ${userDecision === 'approved' ? 'freigegeben' : 'abgelehnt'}.`
                  : 'Diese Kampagne wartet auf Ihre Freigabe als Team-Mitglied.'
                }
              </Text>
            </div>
            
            <Button 
              plain
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Workflow Visualization */}
        <WorkflowVisualization 
          stages={workflow.stages}
          currentStage={workflow.currentStage}
        />

        {/* Team Approval Status */}
        <TeamApprovalCard
          workflow={workflow}
          userApproval={userApproval}
          currentUserId={user.uid}
          onSubmitDecision={handleDecision}
        />

        {/* Campaign Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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

        {/* Decision Form */}
        {!isDecisionMade && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ihre Entscheidung</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kommentar (optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Optionaler Kommentar zu Ihrer Entscheidung..."
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDecision('approved')}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircleIcon className="h-5 w-5 mr-2" />
                  {submitting ? 'Wird verarbeitet...' : 'Freigeben'}
                </Button>
                <Button
                  onClick={() => handleDecision('rejected')}
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  {submitting ? 'Wird verarbeitet...' : 'Ablehnen'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Hinweis zum Team-Freigabe-Prozess</p>
              <p>
                Als Team-Mitglied prüfen Sie diese Kampagne vor der Weiterleitung an den Kunden. 
                {workflow.teamSettings.approvers.length > 1 && 
                  ` Alle ${workflow.teamSettings.approvers.length} ausgewählten Team-Mitglieder müssen zustimmen.`
                }
                {workflow.customerSettings.required && 
                  ' Nach erfolgreicher Team-Freigabe wird die Kampagne zur Kunden-Freigabe weitergeleitet.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}