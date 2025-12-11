// src/components/campaigns/ProjectLinkBanner.tsx - Project-Link Banner für Campaign-Edit
"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations('campaigns.project');

  // Nur anzeigen wenn Projekt verknüpft ist
  if (!campaign.projectId) return null;

  const getPipelineStageBadge = (stage?: string) => {
    const stageColors = {
      creation: 'blue',
      review: 'amber',
      approval: 'orange',
      distribution: 'green',
      completed: 'zinc'
    } as const;

    if (!stage || !(stage in stageColors)) return null;

    const color = stageColors[stage as keyof typeof stageColors];
    return <Badge color={color}>{t(`pipelineStages.${stage}`)}</Badge>;
  };

  return (
    <div className={`mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LinkIcon className="h-5 w-5 text-blue-600" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Text className="text-sm font-medium text-blue-900">
                {t('linkedWith')} <strong>{campaign.projectTitle}</strong>
              </Text>
              {campaign.pipelineStage && getPipelineStageBadge(campaign.pipelineStage)}
            </div>

            {/* Budget-Tracking anzeigen wenn vorhanden */}
            {campaign.budgetTracking && (
              <div className="flex items-center gap-4 mt-2 text-xs text-blue-700">
                {campaign.budgetTracking.allocated && (
                  <span>
                    {t('budget')} {campaign.budgetTracking.spent || 0} / {campaign.budgetTracking.allocated} {campaign.budgetTracking.currency || 'EUR'}
                  </span>
                )}

                {/* Meilensteine */}
                {campaign.milestones && campaign.milestones.length > 0 && (
                  <span>
                    {t('milestonesLabel')} {t('milestones', {
                      completed: campaign.milestones.filter(m => m.completed).length,
                      total: campaign.milestones.length
                    })}
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
              {t('update')}
            </Button>
          )}

          <Button
            plain
            onClick={() => window.open(`/dashboard/projects/${campaign.projectId}`, '_blank')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {t('openProject')}
          </Button>
        </div>
      </div>
    </div>
  );
};