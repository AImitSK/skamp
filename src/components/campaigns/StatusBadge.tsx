// src/components/campaigns/StatusBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { PRCampaignStatus, PRCampaign } from "@/types/pr";
import { EnhancedApprovalData, TeamApprover, isEnhancedApprovalData } from "@/types/approvals-enhanced";
import { statusConfig } from "@/utils/campaignStatus";
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  teamMembers?: any[]; // Team members for name/avatar lookup
}

// Hilfsfunktion für Avatar-URLs (Multi-Tenancy)
function getApproverAvatar(approver: TeamApprover): string {
  if (approver.photoUrl) {
    return approver.photoUrl;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(approver.displayName)}&background=005fab&color=fff&size=24`;
}

// Hover-Tooltip mit intelligenter Positionierung (immer sichtbar)
function HoverTooltip({ 
  campaign, 
  isVisible, 
  position, 
  onMouseEnter, 
  onMouseLeave,
  teamMembers 
}: { 
  campaign: PRCampaign;
  isVisible: boolean;
  position: { top: number; left: number; right?: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  teamMembers?: any[];
}) {
  if (!isVisible) return null;

  return createPortal(
    <div
      className="fixed z-50 transition-opacity duration-200"
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 max-w-sm">
        <ApprovalTooltipContent campaign={campaign} teamMembers={teamMembers} />
      </div>
    </div>,
    document.body
  );
}

// Approval-Tooltip Inhalt (separiert für bessere Organisation)
function ApprovalTooltipContent({ campaign, teamMembers }: { campaign: PRCampaign; teamMembers?: any[] }) {
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
              {approvalData.teamApprovers.map((approver) => {
                // Lade echte TeamMember-Daten für bessere Namen und Avatare
                const realTeamMember = teamMembers?.find(member => member.id === approver.userId);
                const displayName = realTeamMember?.displayName || approver.displayName;
                const photoUrl = realTeamMember?.photoUrl || approver.photoUrl;
                
                const avatarSrc = photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=005fab&color=fff&size=24`;
                
                return (
                  <div key={approver.userId} className="flex items-center gap-3">
                    <img 
                      src={avatarSrc}
                      alt={displayName}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback bei Ladefehler
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=005fab&color=fff&size=24`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <Text className="text-xs font-medium truncate">
                        {displayName}
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
              );
              })}
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
  showApprovalTooltip = false,
  teamMembers
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  // Hover-Tooltip State
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Prüfe ob erweiterte Freigabe-Info verfügbar ist
  const hasApprovalInfo = campaign?.approvalData && 
    (campaign.status === 'pending_approval' || campaign.status === 'approved' || 
     (campaign.approvalData as any)?.teamApprovalRequired || 
     (campaign.approvalData as any)?.customerApprovalRequired);

  // Berechne Tooltip-Position (intelligente Platzierung, immer sichtbar)
  const calculateTooltipPosition = () => {
    if (!badgeRef.current) return;

    const badgeRect = badgeRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // max-w-sm entspricht ca. 320px
    const tooltipHeight = 300; // Geschätzte max. Höhe
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const margin = 16; // Mindestabstand zu Viewport-Rändern
    
    let left = badgeRect.left + scrollX;
    let top = badgeRect.bottom + scrollY + 8; // 8px unter Badge
    
    // Horizontal: Badge als Startpunkt, aber innerhalb Viewport bleiben
    if (left + tooltipWidth > viewportWidth + scrollX - margin) {
      // Rechts über Rand: Nach links verschieben
      left = badgeRect.right + scrollX - tooltipWidth;
    }
    if (left < scrollX + margin) {
      // Links über Rand: Mindestabstand einhalten
      left = scrollX + margin;
    }
    
    // Vertikal: Unter Badge, aber bei Bedarf nach oben
    if (top + tooltipHeight > viewportHeight + scrollY - margin) {
      // Unten über Rand: Über dem Badge platzieren
      top = badgeRect.top + scrollY - tooltipHeight - 8; // 8px über Badge
    }
    if (top < scrollY + margin) {
      // Oben über Rand: Mindestabstand einhalten
      top = scrollY + margin;
    }

    setTooltipPosition({
      top: top,
      left: left
    });
  };

  // Mouse Event Handlers
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    calculateTooltipPosition();
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsTooltipVisible(false);
    }, 100); // 100ms delay um flackern zu verhindern
  };

  const handleTooltipMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Badge-Inhalt mit Hover-Events
  const badgeContent = (
    <div 
      ref={badgeRef}
      onMouseEnter={showApprovalTooltip && hasApprovalInfo ? handleMouseEnter : undefined}
      onMouseLeave={showApprovalTooltip && hasApprovalInfo ? handleMouseLeave : undefined}
    >
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
    </div>
  );
  
  return (
    <>
      {showDescription ? (
        <div className={`flex items-center gap-3`}>
          {badgeContent}
          {config.description && (
            <Text className="text-sm text-gray-500">{config.description}</Text>
          )}
        </div>
      ) : (
        badgeContent
      )}
      
      {/* Hover-Tooltip (via Portal) */}
      {showApprovalTooltip && hasApprovalInfo && campaign && (
        <HoverTooltip
          campaign={campaign}
          isVisible={isTooltipVisible}
          position={tooltipPosition}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          teamMembers={teamMembers}
        />
      )}
    </>
  );
}