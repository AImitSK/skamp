// src/components/projects/pressemeldungen/PressemeldungCampaignTable.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PRCampaign } from '@/types/pr';
import { TeamMember } from '@/types/international';
import { ApprovalEnhanced } from '@/types/approvals';
import { teamMemberService } from '@/lib/firebase/team-service-enhanced';
import EmailSendModal from '@/components/pr/EmailSendModal';
import CampaignTableRow from './components/CampaignTableRow';
import EmptyState from './components/EmptyState';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface Props {
  campaigns: PRCampaign[];
  approvals: ApprovalEnhanced[];
  organizationId: string;
  onRefresh: () => void;
}

export default function PressemeldungCampaignTable({
  campaigns,
  approvals,
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
        // Fehler beim Laden ignorieren - App funktioniert mit leeren TeamMembers
        setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, [organizationId]);

  // Callbacks mit useCallback für Performance
  const handleCloseModal = useCallback(() => {
    setShowSendModal(null);
  }, []);

  const handleSentSuccess = useCallback(() => {
    setShowSendModal(null);
    onRefresh();
  }, [onRefresh]);

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={DocumentTextIcon}
        title="Keine Pressemeldungen"
        description="Noch keine Pressemeldungen mit diesem Projekt verknüpft"
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="flex items-center">
          <div className="w-[40%] min-w-0 pr-4">Kampagne</div>
          <div className="w-[18%] shrink-0 -ml-3">Status</div>
          <div className="w-[12%] shrink-0 -ml-3">Admin</div>
          <div className="w-[15%] shrink-0 -ml-3">Erstellt am</div>
          <div className="flex-1 -ml-3">Versenden</div>
          <div className="ml-4 w-7">{/* Aktionen-Platzhalter */}</div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-200">
        {campaigns.map((campaign) => (
          <CampaignTableRow
            key={campaign.id}
            campaign={campaign}
            teamMembers={teamMembers}
            approvals={approvals}
            organizationId={organizationId}
            onRefresh={onRefresh}
            onSend={setShowSendModal}
          />
        ))}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <EmailSendModal
          campaign={showSendModal}
          onClose={handleCloseModal}
          onSent={handleSentSuccess}
          projectMode={true}
        />
      )}
    </div>
  );
}