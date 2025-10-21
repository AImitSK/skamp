'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Squares2X2Icon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useProject } from '../../context/ProjectContext';
import { Tag } from '@/types/crm';

/**
 * ProjectInfoBar Props
 */
interface ProjectInfoBarProps {
  projectTags: Tag[];
}

/**
 * Helper: Get Stage Label
 */
const getStageLabel = (stage: string) => {
  switch (stage) {
    case 'ideas_planning': return 'Ideen & Planung';
    case 'creation': return 'Content und Materialien';
    case 'approval': return 'Freigabe';
    case 'distribution': return 'Verteilung';
    case 'monitoring': return 'Monitoring';
    case 'completed': return 'Abgeschlossen';
    // Legacy Stages (falls noch in alten Daten vorhanden)
    case 'planning': return 'Planung (Legacy)';
    case 'content_creation': return 'Content-Erstellung (Legacy)';
    case 'internal_review': return 'Interne Prüfung (Legacy)';
    case 'internal_approval': return 'Freigabe';
    case 'customer_approval': return 'Freigabe';
    default: return stage;
  }
};

/**
 * ProjectInfoBar Component
 *
 * Zeigt kompakte Info-Zeile mit:
 * - Phase
 * - Kunde (mit Link)
 * - Priorität
 * - Deadline
 * - Tags
 */
export function ProjectInfoBar({ projectTags }: ProjectInfoBarProps) {
  const router = useRouter();
  const { project } = useProject();

  if (!project) return null;

  return (
    <>
      {/* Trennlinie */}
      <div className="border-t border-gray-200 mt-4 mb-3"></div>

      {/* Kompakte Info-Zeile */}
      <div className="flex items-center flex-wrap gap-8 text-sm text-gray-600">
        {/* Aktuelle Phase */}
        <div className="flex items-center gap-1.5">
          <Squares2X2Icon className="w-4 h-4 text-gray-400" />
          <span className="font-medium">Phase:</span>
          <span className="text-gray-900">{getStageLabel(project.currentStage)}</span>
        </div>

        {/* Kunde */}
        {project.customer && (
          <div className="flex items-center gap-1.5">
            <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Kunde:</span>
            <button
              className="text-primary hover:text-primary-hover hover:underline text-sm"
              onClick={() => router.push(`/dashboard/contacts/crm/companies/${project.customer?.id}`)}
              title="Kunde anzeigen"
            >
              {project.customer.name}
            </button>
          </div>
        )}

        {/* Priorität */}
        <div className="flex items-center gap-1.5">
          <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
          <span className="font-medium">Priorität:</span>
          <Badge
            color={project.priority === 'high' ? 'red' : project.priority === 'medium' ? 'yellow' : 'zinc'}
            className="!py-0.5 !text-xs"
          >
            {project.priority === 'high' ? 'Hoch' : project.priority === 'medium' ? 'Mittel' : 'Niedrig'}
          </Badge>
        </div>

        {/* Deadline wenn vorhanden */}
        {project.deadline && (
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Deadline:</span>
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
            <TagIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Tags:</span>
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
}
