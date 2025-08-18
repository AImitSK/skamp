// src/components/campaigns/StatusBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { PRCampaignStatus, PRCampaign } from "@/types/pr";
import { EnhancedApprovalData, TeamApprover, isEnhancedApprovalData } from "@/types/approvals-enhanced";
import { statusConfig } from "@/utils/campaignStatus";
import { Popover, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { 
  UserGroupIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: PRCampaignStatus;
  showDescription?: boolean;
  className?: string;
  campaign?: PRCampaign; // Für erweiterte Freigabe-Info
  showApprovalTooltip?: boolean; // Enable approval tooltip
}

// Hilfsfunktion für Avatar-URLs (Multi-Tenancy)
function getApproverAvatar(approver: TeamApprover): string {
  if (approver.photoUrl) {
    return approver.photoUrl;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(approver.displayName)}&background=005fab&color=fff&size=24`;
}

// Approval-Tooltip Komponente
function ApprovalTooltip({ campaign }: { campaign: PRCampaign }) {
  if (!campaign.approvalData || !isEnhancedApprovalData(campaign.approvalData)) {
    return (
      <div className="p-3 min-w-64">
        <Text className="text-sm text-gray-600">Keine erweiterten Freigabe-Daten verfügbar</Text>
      </div>
    );
  }

  const approvalData = campaign.approvalData as EnhancedApprovalData;
  const hasTeamApproval = approvalData.teamApprovalRequired;
  const hasCustomerApproval = approvalData.customerApprovalRequired;

  if (!hasTeamApproval && !hasCustomerApproval) {
    return (
      <div className="p-3 min-w-64">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <Text className="font-medium text-sm">Keine Freigabe erforderlich</Text>
        </div>
        <Text className="text-xs text-gray-600">
          Diese Kampagne kann direkt versendet werden.
        </Text>
      </div>
    );
  }

  return (
    <div className="p-4 min-w-80 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <ClockIcon className="h-4 w-4 text-blue-500" />
        <Text className="font-semibold text-sm">Freigabe-Status</Text>
      </div>

      <div className="space-y-3">
        {/* Team-Freigabe */}
        {hasTeamApproval && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserGroupIcon className="h-4 w-4 text-blue-500" />
              <Text className="font-medium text-sm">Team-Freigabe</Text>
            </div>
            
            <div className="space-y-2">
              {approvalData.teamApprovers.map((approver) => (
                <div key={approver.userId} className="flex items-center gap-3">
                  <img 
                    src={getApproverAvatar(approver)}
                    alt={approver.displayName}
                    className="w-6 h-6 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <Text className="text-xs font-medium truncate">
                      {approver.displayName}
                    </Text>
                  </div>
                  <div className="flex items-center gap-1">
                    {approver.status === 'approved' && (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                    {approver.status === 'rejected' && (
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                    )}
                    {approver.status === 'pending' && (
                      <ClockIcon className="h-4 w-4 text-yellow-500" />
                    )}
                    <Text className={clsx("text-xs font-medium", {
                      "text-green-600": approver.status === 'approved',
                      "text-red-600": approver.status === 'rejected',
                      "text-yellow-600": approver.status === 'pending'
                    })}>
                      {approver.status === 'approved' && 'Freigegeben'}
                      {approver.status === 'rejected' && 'Abgelehnt'}
                      {approver.status === 'pending' && 'Ausstehend'}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Team-Zusammenfassung */}
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              {(() => {
                const approved = approvalData.teamApprovers.filter(a => a.status === 'approved').length;
                const total = approvalData.teamApprovers.length;
                const rejected = approvalData.teamApprovers.filter(a => a.status === 'rejected').length;
                
                if (rejected > 0) {
                  return <span className="text-red-600 font-medium">{rejected} Ablehnung(en)</span>;
                }
                if (approved === total) {
                  return <span className="text-green-600 font-medium">Alle {total} Team-Mitglieder haben freigegeben</span>;
                }
                return <span className="text-gray-600">{approved} von {total} Freigaben erhalten</span>;
              })()}
            </div>
          </div>
        )}

        {/* Kunden-Freigabe */}
        {hasCustomerApproval && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BuildingOfficeIcon className="h-4 w-4 text-green-500" />
              <Text className="font-medium text-sm">Kunden-Freigabe</Text>
            </div>
            
            {approvalData.customerContact ? (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <BuildingOfficeIcon className="h-3 w-3 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <Text className="text-xs font-medium truncate">
                    {approvalData.customerContact.name}
                  </Text>
                  <Text className="text-xs text-gray-500 truncate">
                    {approvalData.customerContact.companyName}
                  </Text>
                </div>
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4 text-yellow-500" />
                  <Text className="text-xs font-medium text-yellow-600">
                    Ausstehend
                  </Text>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded">
                <ExclamationCircleIcon className="h-4 w-4 text-amber-500" />
                <Text className="text-xs text-amber-700">
                  Kunde noch nicht ausgewählt
                </Text>
              </div>
            )}
          </div>
        )}

        {/* Aktueller Workflow-Stand */}
        <div className="pt-2 border-t border-gray-200">
          <Text className="text-xs text-gray-500">
            <strong>Aktuelle Stufe:</strong> {
              approvalData.currentStage === 'team' ? 'Team-Freigabe' :
              approvalData.currentStage === 'customer' ? 'Kunden-Freigabe' :
              'Abgeschlossen'
            }
          </Text>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ 
  status, 
  showDescription = false, 
  className = "",
  campaign,
  showApprovalTooltip = false
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  // Prüfe ob erweiterte Freigabe-Info verfügbar ist
  const hasApprovalInfo = campaign?.approvalData && 
    (campaign.status === 'pending_approval' || campaign.status === 'approved' || 
     (campaign.approvalData as any)?.teamApprovalRequired || 
     (campaign.approvalData as any)?.customerApprovalRequired);
  
  // Badge-Inhalt (mit oder ohne Tooltip)
  const badgeContent = (
    <Badge 
      color={config.color} 
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap",
        showApprovalTooltip && hasApprovalInfo && "cursor-help",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
  
  if (showDescription) {
    return (
      <div className={`flex items-center gap-3`}>
        {showApprovalTooltip && hasApprovalInfo ? (
          <Popover className="relative">
            <Popover.Button as="div">
              {badgeContent}
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute z-10 mt-2 left-0 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <ApprovalTooltip campaign={campaign!} />
              </Popover.Panel>
            </Transition>
          </Popover>
        ) : (
          badgeContent
        )}
        {config.description && (
          <Text className="text-sm text-gray-500">{config.description}</Text>
        )}
      </div>
    );
  }

  // Einfache Badge ohne showDescription
  if (showApprovalTooltip && hasApprovalInfo && campaign) {
    return (
      <Popover className="relative">
        <Popover.Button as="div">
          {badgeContent}
        </Popover.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <Popover.Panel className="absolute z-10 mt-2 left-0 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <ApprovalTooltip campaign={campaign} />
          </Popover.Panel>
        </Transition>
      </Popover>
    );
  }

  return badgeContent;
}