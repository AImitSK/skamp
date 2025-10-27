// src/components/projects/pressemeldungen/components/CampaignTableRow.tsx
'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { PRCampaign } from '@/types/pr';
import { TeamMember } from '@/types/international';
import { prService } from '@/lib/firebase/pr-service';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';

interface CampaignTableRowProps {
  campaign: PRCampaign;
  teamMembers: TeamMember[];
  onRefresh: () => void;
  onSend: (campaign: PRCampaign) => void;
}

function CampaignTableRow({ campaign, teamMembers, onRefresh, onSend }: CampaignTableRowProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return 'zinc';
      case 'in_review': return 'amber';
      case 'approved': return 'green';
      case 'sent': return 'blue';
      case 'rejected': return 'red';
      case 'changes_requested': return 'orange';
      default: return 'zinc';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'in_review': return 'In Prüfung';
      case 'approved': return 'Freigegeben';
      case 'sent': return 'Versendet';
      case 'rejected': return 'Abgelehnt';
      case 'changes_requested': return 'Änderungen Angefordert';
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
      console.error('Fehler beim Löschen der Kampagne:', error);
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unbekannt';

    // Handle Firestore Timestamp
    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Unbekannt';
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
        <div className="w-[35%] min-w-0 pr-12">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <a
                href={`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`}
                className="text-sm font-semibold text-gray-900 hover:text-[#005fab] truncate block cursor-pointer transition-colors"
              >
                {campaign.title}
              </a>
              {campaign.projectTitle && (
                <p className="text-xs text-gray-500 truncate mt-1">
                  Projekt: {campaign.projectTitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="w-[15%]">
          <Badge
            color={getStatusColor(campaign.status) as any}
            className="text-xs whitespace-nowrap"
          >
            {getStatusLabel(campaign.status)}
          </Badge>
        </div>

        {/* Admin */}
        <div className="w-[12%]">
          <div className="flex items-center">
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
        </div>

        {/* Erstellt am */}
        <div className="w-[15%]">
          <span className="text-sm text-gray-600">
            {formatDate(campaign.createdAt)}
          </span>
        </div>

        {/* Kampagne Versenden */}
        <div className="flex-1">
          {campaign.status === 'sent' ? (
            <a
              href={`/dashboard/analytics/monitoring/${campaign.id}`}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
            >
              Monitoring →
            </a>
          ) : (
            <Button
              onClick={handleSend}
              color="secondary"
              className="text-xs px-3 py-1"
            >
              <PaperAirplaneIcon className="h-3 w-3 mr-1" />
              Versenden
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
                Bearbeiten
              </DropdownItem>
              <DropdownItem onClick={handleDeleteClick} disabled={isDeleting}>
                <TrashIcon className="h-4 w-4" />
                <span className="text-red-600">
                  {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                </span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* Lösch-Bestätigungs-Dialog */}
      <Dialog open={showDeleteDialog} onClose={handleDeleteCancel} size="sm">
        <DialogTitle>Kampagne löschen</DialogTitle>
        <DialogBody>
          <p>Möchten Sie die Kampagne <strong>&quot;{campaign.title}&quot;</strong> wirklich löschen?</p>
          <p className="mt-2 text-red-600">Diese Aktion kann nicht rückgängig gemacht werden.</p>
        </DialogBody>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="secondary">
            Abbrechen
          </Button>
          <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default React.memo(CampaignTableRow);
