'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { useProject } from '../../context/ProjectContext';
import { Tag } from '@/types/crm';

/**
 * ProjectInfoBar Props
 */
interface ProjectInfoBarProps {
  projectTags: Tag[];
}

/**
 * Helper: Get Stage Label Key
 */
const getStageKey = (stage: string): string => {
  switch (stage) {
    case 'ideas_planning': return 'ideasPlanning';
    case 'creation': return 'creation';
    case 'approval': return 'approval';
    case 'distribution': return 'distribution';
    case 'monitoring': return 'monitoring';
    case 'completed': return 'completed';
    // Legacy Stages (falls noch in alten Daten vorhanden)
    case 'planning': return 'planningLegacy';
    case 'content_creation': return 'contentCreationLegacy';
    case 'internal_review': return 'internalReviewLegacy';
    case 'internal_approval': return 'approval';
    case 'customer_approval': return 'approval';
    default: return 'unknown';
  }
};

/**
 * ProjectInfoBar Component
 *
 * Zeigt kompakte Info-Zeile mit:
 * - Phase (ohne Icon)
 * - Kunde (mit Link, ohne Icon)
 * - Deadline (ohne Icon)
 * - Tags (mit Badges, ohne Icon)
 *
 * Design: Bewusst ohne Icons, um visuelle Überladung zu vermeiden
 * (Tab-Navigation darunter hat bereits viele Icons)
 */
export const ProjectInfoBar = React.memo(function ProjectInfoBar({ projectTags }: ProjectInfoBarProps) {
  const router = useRouter();
  const { project } = useProject();
  const t = useTranslations('projects.detail.header');

  if (!project) return null;

  return (
    <>
      {/* Trennlinie */}
      <div className="border-t border-gray-200 mt-4 mb-3"></div>

      {/* Kompakte Info-Zeile */}
      <div className="flex items-center flex-wrap gap-8 text-sm text-gray-600">
        {/* Aktuelle Phase */}
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{t('infoBar.stage')}:</span>
          <span className="text-gray-900">{t(`infoBar.stages.${getStageKey(project.currentStage)}`)}</span>
        </div>

        {/* Kunde */}
        {project.customer && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{t('infoBar.customer')}:</span>
            <button
              className="text-primary hover:text-primary-hover hover:underline text-sm"
              onClick={() => router.push(`/dashboard/contacts/crm/companies/${project.customer?.id}`)}
              title={t('infoBar.viewCustomer')}
            >
              {project.customer.name}
            </button>
          </div>
        )}

        {/* Deadline wenn vorhanden */}
        {project.deadline && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{t('infoBar.deadline')}:</span>
            <span className="text-gray-900">
              {project.deadline?.toDate().toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        )}

        {/* Tags - ans Ende und nur wenn vorhanden */}
        {projectTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{t('infoBar.tags')}:</span>
            <div className="flex items-center gap-1">
              {projectTags.slice(0, 3).map(tag => (
                <Badge
                  key={tag.id}
                  color={tag.color || 'zinc'}
                  className="!py-0.5 !text-xs"
                >
                  {tag.name}
                </Badge>
              ))}
              {projectTags.length > 3 && (
                <span className="text-xs text-gray-500">+{projectTags.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
});
