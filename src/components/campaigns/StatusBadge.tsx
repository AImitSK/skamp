// src/components/campaigns/StatusBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { PRCampaignStatus } from "@/types/pr";
import { statusConfig } from "@/utils/campaignStatus";

interface StatusBadgeProps {
  status: PRCampaignStatus;
  showDescription?: boolean;
  className?: string;
}

export function StatusBadge({ 
  status, 
  showDescription = false, 
  className = ""
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  if (showDescription) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Badge color={config.color} className="inline-flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        {config.description && (
          <Text className="text-sm text-gray-500">{config.description}</Text>
        )}
      </div>
    );
  }

  return (
    <Badge 
      color={config.color} 
      className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}