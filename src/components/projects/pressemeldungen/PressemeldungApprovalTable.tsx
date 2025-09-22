// src/components/projects/pressemeldungen/PressemeldungApprovalTable.tsx
'use client';

import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '@/components/ui/dropdown';
import {
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  ClipboardIcon,
  CheckIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { ApprovalEnhanced } from '@/types/approval';

interface Props {
  approvals: ApprovalEnhanced[];
  onRefresh: () => void;
}

interface ApprovalTableRowProps {
  approval: ApprovalEnhanced;
  onRefresh: () => void;
}

// Helper functions außerhalb der Component
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return 'amber';
    case 'in_review': return 'amber';
    case 'approved': return 'green';
    case 'rejected': return 'red';
    case 'expired': return 'zinc';
    default: return 'zinc';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Ausstehend';
    case 'in_review': return 'In Prüfung';
    case 'approved': return 'Freigegeben';
    case 'rejected': return 'Abgelehnt';
    case 'expired': return 'Abgelaufen';
    default: return status;
  }
};

const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return 'Unbekannt';
  return timestamp.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getTimeSinceLastActivity = (timestamp: any) => {
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
  const [isCopying, setIsCopying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleOpenLink = useCallback(() => {
    if (approval.shareId) {
      window.open(`/freigabe/${approval.shareId}`, '_blank');
    }
  }, [approval.shareId]);

  const handleCopyLink = useCallback(async () => {
    if (!approval.shareId) return;

    setIsCopying(true);
    try {
      const url = `${window.location.origin}/freigabe/${approval.shareId}`;
      await navigator.clipboard.writeText(url);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Fehler beim Kopieren des Links:', error);
    } finally {
      setIsCopying(false);
    }
  }, [approval.shareId]);

  const handleAgencyApproval = useCallback(async () => {
    setIsApproving(true);
    try {
      // TODO: Implement agency approval service call
      console.log('Agentur Freigabe erteilen für:', approval.id);
      onRefresh();
    } catch (error) {
      console.error('Fehler bei der Agentur Freigabe:', error);
    } finally {
      setIsApproving(false);
    }
  }, [approval.id, onRefresh]);


  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        {/* Kampagne */}
        <div className="w-[30%] min-w-0">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {approval.campaignTitle || 'Unbekannte Kampagne'}
              </p>
              {approval.campaignDescription && (
                <p className="text-xs text-gray-500 truncate mt-1">
                  {approval.campaignDescription}
                </p>
              )}
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
        <div className="w-[20%] min-w-0">
          <div className="text-sm text-gray-700">
            {approval.clientName || approval.recipients?.length > 0 ? (
              <div>
                <p className="font-medium truncate">
                  {approval.clientName || 'Kunde'}
                </p>
                {approval.recipients && approval.recipients.length > 0 && (
                  <p className="text-xs text-gray-500 truncate" title={approval.recipients[0].email}>
                    {approval.recipients[0].name || approval.recipients[0].email}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-gray-500">Nicht zugewiesen</span>
            )}
          </div>
        </div>

        {/* Letzte Aktivität */}
        <div className="w-[15%]">
          <div className="text-sm text-gray-600">
            <p>{formatDate(approval.lastActivity || approval.updatedAt)}</p>
            <p className="text-xs text-gray-500">
              {getTimeSinceLastActivity(approval.lastActivity || approval.updatedAt)}
            </p>
          </div>
        </div>

        {/* Versenden */}
        <div className="w-[10%]">
          <Button
            color="secondary"
            className="text-xs px-3 py-1"
            disabled={true}
          >
            <PaperAirplaneIcon className="h-3 w-3 mr-1" />
            Versenden
          </Button>
        </div>

        {/* Aktionen */}
        <div className="w-[10%] text-center">
          <Dropdown>
            <DropdownButton plain className="p-1.5 hover:bg-gray-100 rounded-md">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
            </DropdownButton>

            <DropdownMenu anchor="bottom end">
              <DropdownItem onClick={handleOpenLink} disabled={!approval.shareId}>
                <ExternalLinkIcon className="h-4 w-4" />
                Freigabe-Link öffnen
              </DropdownItem>
              <DropdownItem onClick={handleCopyLink} disabled={!approval.shareId || isCopying}>
                <ClipboardIcon className="h-4 w-4" />
                {isCopying ? 'Wird kopiert...' : 'Link kopieren'}
              </DropdownItem>
              <DropdownItem onClick={handleAgencyApproval} disabled={isApproving || approval.status === 'approved'}>
                <CheckIcon className="h-4 w-4" />
                <span className="text-green-600">
                  {isApproving ? 'Wird freigegeben...' : 'Agentur Freigabe erteilen'}
                </span>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>
    </div>
  );
}

export default function PressemeldungApprovalTable({
  approvals,
  onRefresh
}: Props) {
  if (approvals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-gray-500">
            Keine Freigaben für dieses Projekt gefunden
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
          <div className="w-[20%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Kunde & Kontakt
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Letzte Aktivität
          </div>
          <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Versenden
          </div>
          <div className="w-[10%] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
            Aktionen
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-200">
        {approvals.map((approval) => (
          <ApprovalTableRow
            key={approval.id}
            approval={approval}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}