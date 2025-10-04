// src/components/projects/pressemeldungen/PressemeldungCampaignTable.tsx
'use client';

import { useState, useEffect } from 'react';
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
import { TeamMember } from '@/types/international';
import { prService } from '@/lib/firebase/pr-service';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import EmailSendModal from '@/components/pr/EmailSendModal';

interface Props {
  campaigns: PRCampaign[];
  organizationId: string;
  onRefresh: () => void;
}

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
        <div className="w-[30%] min-w-0">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {campaign.title}
              </p>
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
        <div className="w-[15%]">
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
        <div className="w-[15%]">
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
        <div className="w-[10%] text-center">
          <Dropdown>
            <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
            </DropdownButton>

            <DropdownMenu anchor="bottom end">
              <DropdownItem onClick={handleEdit}>
                <PencilIcon className="h-4 w-4" />
                Bearbeiten
              </DropdownItem>
              <DropdownItem onClick={handleDelete} disabled={isDeleting}>
                <TrashIcon className="h-4 w-4" />
                <span className="text-red-600">
                  {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                </span>
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
  organizationId,
  onRefresh
}: Props) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState<PRCampaign | null>(null);

  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        const members = await teamMemberService.getByOrganization(organizationId);
        setTeamMembers(members);
      } catch (error) {
        console.log('Fehler beim Laden der TeamMembers:', error);
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, [organizationId]);
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
            teamMembers={teamMembers}
            onRefresh={onRefresh}
            onSend={setShowSendModal}
          />
        ))}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={showSendModal}
          onClose={() => setShowSendModal(null)}
          onSent={() => {
            setShowSendModal(null);
            onRefresh();
          }}
          projectMode={true}
        />
      )}
    </div>
  );
}