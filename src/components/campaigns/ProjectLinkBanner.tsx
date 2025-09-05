// src/components/campaigns/ProjectLinkBanner.tsx - Project-Link Banner für Campaign-Edit
"use client";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { LinkIcon } from "@heroicons/react/24/outline";
import { PRCampaign } from "@/types/pr";

interface ProjectLinkBannerProps {
  campaign: PRCampaign;
  onProjectUpdate?: () => void;
  className?: string;
}

export const ProjectLinkBanner = ({ 
  campaign, 
  onProjectUpdate,
  className = "" 
}: ProjectLinkBannerProps) => {
  
  // Nur anzeigen wenn Projekt verknüpft ist
  if (!campaign.projectId) return null;

  const getPipelineStageBadge = (stage?: string) => {
    switch (stage) {
      case 'creation':
        return <Badge color="blue">Erstellung</Badge>;
      case 'review':
        return <Badge color="amber">Review</Badge>;
      case 'approval':
        return <Badge color="orange">Freigabe</Badge>;
      case 'distribution':
        return <Badge color="green">Verteilung</Badge>;
      case 'completed':
        return <Badge color="zinc">Abgeschlossen</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={`mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LinkIcon className="h-5 w-5 text-blue-600" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Text className="text-sm font-medium text-blue-900">
                Verknüpft mit Projekt: <strong>{campaign.projectTitle}</strong>
              </Text>
              {campaign.pipelineStage && getPipelineStageBadge(campaign.pipelineStage)}
            </div>
            
            {/* Budget-Tracking anzeigen wenn vorhanden */}
            {campaign.budgetTracking && (
              <div className="flex items-center gap-4 mt-2 text-xs text-blue-700">
                {campaign.budgetTracking.allocated && (
                  <span>
                    Budget: {campaign.budgetTracking.spent || 0} / {campaign.budgetTracking.allocated} {campaign.budgetTracking.currency || 'EUR'}
                  </span>
                )}
                
                {/* Meilensteine */}
                {campaign.milestones && campaign.milestones.length > 0 && (
                  <span>
                    Meilensteine: {campaign.milestones.filter(m => m.completed).length} / {campaign.milestones.length} erreicht
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onProjectUpdate && (
            <Button 
              plain 
              onClick={onProjectUpdate}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Aktualisieren
            </Button>
          )}
          
          <Button
            plain
            onClick={() => window.open(`/dashboard/projects/${campaign.projectId}`, '_blank')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Projekt öffnen
          </Button>
        </div>
      </div>
    </div>
  );
};