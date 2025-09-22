// src/components/projects/pressemeldungen/PressemeldungApprovalTable.tsx
'use client';

import { useState, Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu, Transition } from '@headlessui/react';
import {
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  ClipboardIcon,
  CheckIcon
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

function ApprovalTableRow({ approval, onRefresh }: ApprovalTableRowProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'amber';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'expired': return 'zinc';
      default: return 'zinc';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'approved': return 'Freigegeben';
      case 'rejected': return 'Abgelehnt';
      case 'expired': return 'Abgelaufen';
      default: return status;
    }
  };

  const handleOpenLink = () => {
    if (approval.shareId) {
      window.open(`/freigabe/${approval.shareId}`, '_blank');
    }
  };

  const handleCopyLink = async () => {
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
  };

  const handleAgencyApproval = async () => {
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

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center">
        {/* Kampagne */}
        <div className="w-[25%] min-w-0">
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
        <div className="w-[25%] min-w-0">
          <div className="text-sm text-gray-700">
            {approval.customerContact ? (
              <div>
                <p className="font-medium truncate">{approval.customerContact.split(' - ')[0]}</p>
                {approval.customerContact.includes(' - ') && (
                  <p className="text-xs text-gray-500 truncate">
                    {approval.customerContact.split(' - ')[1]}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-gray-500">Nicht zugewiesen</span>
            )}
          </div>
        </div>

        {/* Letzte Aktivität */}
        <div className="w-[20%]">
          <div className="text-sm text-gray-600">
            <p>{formatDate(approval.lastActivity || approval.updatedAt)}</p>
            <p className="text-xs text-gray-500">
              {getTimeSinceLastActivity(approval.lastActivity || approval.updatedAt)}
            </p>
          </div>
        </div>

        {/* Aktionen */}
        <div className="w-[15%] text-center">
          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors">
              <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Panel className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleOpenLink}
                      disabled={!approval.shareId}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } group flex w-full items-center px-4 py-2 text-sm text-gray-700 disabled:opacity-50`}
                    >
                      <ExternalLinkIcon className="mr-3 h-4 w-4" />
                      Freigabe-Link öffnen
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleCopyLink}
                      disabled={!approval.shareId || isCopying}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } group flex w-full items-center px-4 py-2 text-sm text-gray-700 disabled:opacity-50`}
                    >
                      <ClipboardIcon className="mr-3 h-4 w-4" />
                      {isCopying ? 'Wird kopiert...' : 'Link kopieren'}
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleAgencyApproval}
                      disabled={isApproving || approval.status === 'approved'}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } group flex w-full items-center px-4 py-2 text-sm text-gray-700 disabled:opacity-50`}
                    >
                      <CheckIcon className="mr-3 h-4 w-4" />
                      {isApproving ? 'Wird freigegeben...' : 'Agentur Freigabe erteilen'}
                    </button>
                  )}
                </Menu.Item>
              </Menu.Panel>
            </Transition>
          </Menu>
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
          <div className="w-[25%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Kampagne
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </div>
          <div className="w-[25%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Kunde & Kontakt
          </div>
          <div className="w-[20%] text-xs font-medium text-gray-500 uppercase tracking-wider">
            Letzte Aktivität
          </div>
          <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
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