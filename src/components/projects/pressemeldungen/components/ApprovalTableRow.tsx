// src/components/projects/pressemeldungen/components/ApprovalTableRow.tsx
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { ApprovalEnhanced } from '@/types/approvals';

interface ApprovalTableRowProps {
  approval: ApprovalEnhanced;
  onRefresh: () => void;
}

// Helper functions
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'amber';
    case 'in_review': return 'amber';
    case 'approved': return 'green';
    case 'rejected': return 'red';
    case 'changes_requested': return 'orange';
    case 'expired': return 'zinc';
    default: return 'zinc';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Ausstehend';
    case 'in_review': return 'In Prüfung';
    case 'approved': return 'Freigegeben';
    case 'rejected': return 'Abgelehnt';
    case 'changes_requested': return 'Änderungen Angefordert';
    case 'expired': return 'Abgelaufen';
    default: return status;
  }
};

export const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeSinceLastActivity = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';

  const now = new Date();
  const activityDate = timestamp.toDate();
  const diffInMs = now.getTime() - activityDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    return diffInHours === 0 ? 'Vor wenigen Minuten' : `Vor ${diffInHours}h`;
  }

  return `Vor ${diffInDays} Tag${diffInDays === 1 ? '' : 'en'}`;
};

function ApprovalTableRow({ approval, onRefresh }: ApprovalTableRowProps) {
  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        {/* Kampagne */}
        <div className="w-[35%] min-w-0 pr-12">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {approval.campaignTitle || 'Unbekannte Kampagne'}
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="w-[15%]">
          <Badge
            color={getStatusColor(approval.status) as any}
            className="text-xs whitespace-nowrap"
          >
            {getStatusLabel(approval.status)}
          </Badge>
        </div>

        {/* Kunde & Kontakt */}
        <div className="w-[27%] min-w-0">
          <div className="text-sm text-gray-700">
            {approval.clientName || approval.recipients?.length > 0 || approval.clientEmail ? (
              <div>
                <p className="font-medium truncate">
                  {approval.clientName || 'Kunde'}
                </p>
                {(approval.recipients && approval.recipients.length > 0) || approval.clientEmail ? (
                  <p className="text-xs text-gray-500 truncate"
                     title={approval.recipients?.length > 0 ? approval.recipients[0].email : approval.clientEmail}>
                    {approval.recipients && approval.recipients.length > 0
                      ? (approval.recipients[0].name || approval.recipients[0].email)
                      : approval.clientEmail || 'Kein Kontakt'}
                  </p>
                ) : null}
              </div>
            ) : (
              <span className="text-gray-500">Nicht zugewiesen</span>
            )}
          </div>
        </div>

        {/* Letzte Aktivität */}
        <div className="flex-1">
          <div className="text-sm text-gray-600">
            <p>{formatDate(approval.updatedAt)}</p>
            <p className="text-xs text-gray-500">
              {getTimeSinceLastActivity(approval.updatedAt)}
            </p>
          </div>
        </div>

        {/* Aktionen */}
        <div className="ml-4">
          <Dropdown>
            <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500 stroke-[2.5]" />
            </DropdownButton>

            <DropdownMenu anchor="bottom end">
              <DropdownItem
                href={approval.shareId ? `/freigabe/${approval.shareId}` : "#"}
                target="_blank"
              >
                Freigabe öffnen
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ApprovalTableRow);
