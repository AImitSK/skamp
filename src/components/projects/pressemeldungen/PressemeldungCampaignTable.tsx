// src/components/projects/pressemeldungen/PressemeldungCampaignTable.tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { PRCampaign } from '@/types/pr';
import { prService } from '@/lib/firebase/pr-service';
import { useRouter } from 'next/navigation';

interface Props {
  campaigns: PRCampaign[];
  onRefresh: () => void;
}

interface CampaignTableRowProps {
  campaign: PRCampaign;
  onRefresh: () => void;
}

function CampaignTableRow({ campaign, onRefresh }: CampaignTableRowProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return 'zinc';
      case 'approved': return 'green';
      case 'sent': return 'blue';
      case 'rejected': return 'red';
      default: return 'zinc';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'draft': return 'Entwurf';
      case 'approved': return 'Freigegeben';
      case 'sent': return 'Versendet';
      case 'rejected': return 'Abgelehnt';
      default: return status;
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/pr-tools/campaigns/campaigns/edit/${campaign.id}`);
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie diese Kampagne wirklich löschen?')) return;

    setIsDeleting(true);
    try {
      await prService.deleteCampaign(campaign.id!, campaign.organizationId);
      onRefresh();
    } catch (error) {
      console.error('Fehler beim Löschen der Kampagne:', error);
      alert('Fehler beim Löschen der Kampagne');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSend = () => {
    // TODO: Implement campaign sending logic
    console.log('Kampagne versenden:', campaign.id);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) return 'Unbekannt';
    return timestamp.toDate().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        {/* Kampagne */}
        <div className="w-[30%] min-w-0">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {campaign.title}
              </p>
              {campaign.description && (
                <p className="text-xs text-gray-500 truncate mt-1">
                  {campaign.description}
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
        <div className="w-[15%]">
          <div className="flex items-center">
            <Avatar
              src={campaign.userAvatar}
              alt={campaign.userName || 'Admin'}
              className="h-6 w-6 mr-2"
            />
            <span className="text-sm text-gray-700 truncate">
              {campaign.userName || 'Unbekannt'}
            </span>
          </div>
        </div>

        {/* Erstellt am */}
        <div className="w-[15%]">
          <span className="text-sm text-gray-600">
            {formatDate(campaign.createdAt)}
          </span>
        </div>

        {/* Kampagne Versenden */}
        <div className="w-[15%]">
          {campaign.status === 'approved' && (
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
        <div className="w-[10%] text-center">
          <Dropdown>
            <DropdownButton plain className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
            </DropdownButton>

            <DropdownMenu anchor="bottom end">
              <DropdownItem onClick={handleEdit}>
                <PencilIcon className="mr-3 h-4 w-4" />
                Bearbeiten
              </DropdownItem>
              <DropdownItem onClick={handleDelete} disabled={isDeleting}>
                <TrashIcon className="mr-3 h-4 w-4" />
                {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}

export default function PressemeldungCampaignTable({
  campaigns,
  onRefresh
}: Props) {
  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-gray-500">
            Noch keine Pressemeldungen mit diesem Projekt verknüpft
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <div className="w-[30%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Kampagne
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Admin
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Erstellt am
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Versenden
          </div>
          <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
            Aktionen
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-200">
        {campaigns.map((campaign) => (
          <CampaignTableRow
            key={campaign.id}
            campaign={campaign}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}