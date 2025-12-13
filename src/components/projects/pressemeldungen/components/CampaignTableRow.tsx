// src/components/projects/pressemeldungen/components/CampaignTableRow.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem, DropdownDivider } from '@/components/ui/dropdown';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { PRCampaign } from '@/types/pr';
import { TeamMember } from '@/types/international';
import { ApprovalEnhanced } from '@/types/approvals';
import { prService } from '@/lib/firebase/pr-service';
import { approvalService } from '@/lib/firebase/approval-service';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';

interface CampaignTableRowProps {
  campaign: PRCampaign;
  teamMembers: TeamMember[];
  approvals: ApprovalEnhanced[];
  organizationId: string;
  onRefresh: () => void;
  onSend: (campaign: PRCampaign) => void;
}

function CampaignTableRow({ campaign, teamMembers, approvals, organizationId, onRefresh, onSend }: CampaignTableRowProps) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('projects.pressemeldungen.tableRow');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Finde die Freigabe für diese Kampagne
  const campaignApproval = useMemo(
    () => approvals.find(approval => approval.campaignId === campaign.id),
    [approvals, campaign.id]
  );

  // Prüfe ob Freigabe-Funktionen verfügbar sind (Kampagne darf nicht im Entwurf sein und muss eine Freigabe haben)
  const hasApproval = !!campaignApproval;
  const approvalDisabled = !hasApproval;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return 'zinc';
      case 'in_review': return 'amber';
      case 'approved': return 'green';
      case 'scheduled': return 'blue';
      case 'sent': return 'green';
      case 'rejected': return 'red';
      case 'changes_requested': return 'orange';
      default: return 'zinc';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'draft': return t('status.draft');
      case 'in_review': return t('status.inReview');
      case 'approved': return t('status.approved');
      case 'scheduled': return t('status.scheduled');
      case 'sent': return t('status.sent');
      case 'rejected': return t('status.rejected');
      case 'changes_requested': return t('status.changesRequested');
      default: return status;
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);
    setIsDeleting(true);
    try {
      await prService.delete(campaign.id!);
      toastService.success('Kampagne erfolgreich gelöscht');
      onRefresh();
    } catch (error) {
      toastService.error('Fehler beim Löschen der Kampagne');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  const handleSend = () => {
    onSend(campaign);
  };

  const handleOpenApproval = () => {
    if (campaignApproval?.shareId) {
      window.open(`/freigabe/${campaignApproval.shareId}`, '_blank');
    }
  };

  const handleResendApprovalLink = async () => {
    if (!campaignApproval?.id || !user?.uid) return;

    setIsResending(true);
    try {
      await approvalService.sendNotifications(
        campaignApproval,
        're-request'
      );
      toastService.success('Freigabe-Link erfolgreich versendet');
    } catch (error) {
      console.error('Error resending approval link:', error);
      toastService.error('Fehler beim Versenden des Freigabe-Links');
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyApprovalLink = async () => {
    if (!campaignApproval?.shareId) return;

    const approvalUrl = `${window.location.origin}/freigabe/${campaignApproval.shareId}`;
    try {
      await navigator.clipboard.writeText(approvalUrl);
      toastService.success('Freigabe-Link kopiert');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toastService.error('Fehler beim Kopieren des Links');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t('unknown');

    // Handle Firestore Timestamp
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return t('unknown');
    }

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        {/* Kampagne */}
        <div className="w-[40%] min-w-0 pr-4">
          <a
            href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-[#005fab] truncate block cursor-pointer transition-colors"
          >
            {campaign.title}
          </a>
          {campaign.projectTitle && (
            <p className="text-xs text-gray-500 truncate mt-1">
              {t('projectLabel')} {campaign.projectTitle}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="w-[18%] shrink-0 -ml-3">
          <Badge
            color={getStatusColor(campaign.status) as any}
            className="text-xs whitespace-nowrap"
          >
            {getStatusLabel(campaign.status)}
          </Badge>
          {campaign.status === 'scheduled' && campaign.scheduledAt && (
            <div className="text-xs text-gray-500 mt-1">
              {(() => {
                const scheduledDate = typeof campaign.scheduledAt === 'object' && campaign.scheduledAt !== null && 'toDate' in campaign.scheduledAt
                  ? (campaign.scheduledAt as any).toDate()
                  : new Date(campaign.scheduledAt as any);
                return scheduledDate.toLocaleString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              })()}
            </div>
          )}
        </div>

        {/* Admin */}
        <div className="w-[12%] shrink-0 -ml-3">
          {(() => {
            const campaignAdmin = teamMembers?.find(member => member.userId === campaign.userId);
            const displayName = campaignAdmin?.displayName || user?.displayName || user?.email || 'Admin';
            const avatarUrl = campaignAdmin?.photoUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=005fab&color=fff&size=32`;

            return (
              <Avatar
                src={avatarUrl}
                alt={displayName}
                title={displayName}
                className="h-6 w-6 cursor-help"
              />
            );
          })()}
        </div>

        {/* Erstellt am */}
        <div className="w-[15%] shrink-0 -ml-3">
          <span className="text-sm text-gray-600">
            {formatDate(campaign.createdAt)}
          </span>
        </div>

        {/* Kampagne Versenden */}
        <div className="flex-1 -ml-3">
          {campaign.status === 'sent' ? (
            <a
              href={`/dashboard/analytics/monitoring/${campaign.id}`}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
            >
              {t('actions.monitoring')}
            </a>
          ) : (
            <Button
              onClick={handleSend}
              color="secondary"
              className="text-xs px-3 py-1"
            >
              <PaperAirplaneIcon className="h-3 w-3 mr-1" />
              {t('actions.send')}
            </Button>
          )}
        </div>

        {/* Aktionen */}
        <div className="ml-4">
          <Dropdown>
            <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500 stroke-[2.5]" />
            </DropdownButton>

            <DropdownMenu anchor="bottom end">
              <DropdownItem onClick={handleEdit}>
                <PencilIcon className="h-4 w-4" />
                {t('actions.edit')}
              </DropdownItem>
              <DropdownItem onClick={handleOpenApproval} disabled={approvalDisabled}>
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                {t('actions.openApproval')}
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem onClick={handleResendApprovalLink} disabled={approvalDisabled || isResending}>
                <EnvelopeIcon className="h-4 w-4" />
                {isResending ? t('actions.sending') : t('actions.resendApproval')}
              </DropdownItem>
              <DropdownItem onClick={handleCopyApprovalLink} disabled={approvalDisabled}>
                <ClipboardDocumentIcon className="h-4 w-4" />
                {t('actions.copyApproval')}
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem onClick={handleDeleteClick} disabled={isDeleting}>
                <TrashIcon className="h-4 w-4" />
                <span className="text-red-600">
                  {isDeleting ? t('actions.deleting') : t('actions.delete')}
                </span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* Lösch-Bestätigungs-Dialog */}
      <Dialog open={showDeleteDialog} onClose={handleDeleteCancel} size="sm">
        <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
        <DialogBody>
          <p>{t('deleteDialog.message', { title: campaign.title })}</p>
          <p className="mt-2 text-red-600">{t('deleteDialog.warning')}</p>
        </DialogBody>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="secondary">
            {t('deleteDialog.cancel')}
          </Button>
          <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
            {t('deleteDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default React.memo(CampaignTableRow);
