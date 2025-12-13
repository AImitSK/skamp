// src/components/projects/kanban/ProjectQuickActionsMenu.tsx - Quick Actions Menu für Plan 10/9
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowsRightLeftIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserPlusIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Project, PipelineStage } from '@/types/project';
import { getStageConfig, getAllStages } from './kanban-constants';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

// ========================================
// INTERFACES
// ========================================

export interface ProjectQuickActionsMenuProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  onClone?: (projectId: string) => void;
  onShare?: (projectId: string) => void;
  onView?: (projectId: string) => void;
  onMoveToStage?: (projectId: string, stage: PipelineStage) => void;
  onAddComment?: (projectId: string) => void;
  onViewReports?: (projectId: string) => void;
  onScheduleMeeting?: (projectId: string) => void;
  onInviteTeam?: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  triggerRef?: React.RefObject<HTMLElement>;
}

// ========================================
// PROJECT QUICK ACTIONS MENU KOMPONENTE
// ========================================

export const ProjectQuickActionsMenu: React.FC<ProjectQuickActionsMenuProps> = ({
  project,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onClone,
  onShare,
  onView,
  onMoveToStage,
  onAddComment,
  onViewReports,
  onScheduleMeeting,
  onInviteTeam,
  onArchive,
  triggerRef
}) => {
  const t = useTranslations('projects.kanban.quickActions');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Close menu on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // BUGFIX: Verwende Business Logic für gültige Stage-Übergänge
  const { getValidTargetStages, getStageName } = useDragAndDrop(
    (projectId: string, targetStage: PipelineStage) => {
      if (onMoveToStage) {
        onMoveToStage(projectId, targetStage);
      }
    }
  );

  // Hole alle gültigen Ziel-Stages für aktuellen Stage
  const validTargetStages = getValidTargetStages(project.currentStage);

  // Handle action and close menu
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    action();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-8 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
    >
      {/* Project Info Header */}
      <div className="px-4 py-2 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900 truncate">
          {project.title}
        </p>
        <p className="text-xs text-gray-500">
          {getStageConfig(project.currentStage).name}
        </p>
      </div>

      {/* Primary Actions */}
      <div className="py-1">
        {onView && (
          <button
            onClick={(e) => handleAction(e, () => onView(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <EyeIcon className="h-4 w-4" />
            <span>{t('view')}</span>
          </button>
        )}

        {onEdit && (
          <button
            onClick={(e) => handleAction(e, () => onEdit(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>{t('edit')}</span>
          </button>
        )}
      </div>

      {/* Phase Navigation - BUGFIX: Business Logic statt Sequential */}
      {onMoveToStage && validTargetStages.length > 0 && (
        <div className="py-1 border-t border-gray-100">
          <div className="px-4 py-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('moveTo')}
            </p>
          </div>
          {validTargetStages.map((targetStage) => (
            <button
              key={targetStage}
              onClick={(e) => handleAction(e, () => onMoveToStage(project.id!, targetStage))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span>{getStageName(targetStage)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Secondary Actions */}
      <div className="py-1 border-t border-gray-100">
        {onAddComment && (
          <button
            onClick={(e) => handleAction(e, () => onAddComment(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <ChatBubbleLeftIcon className="h-4 w-4" />
            <span>{t('addComment')}</span>
          </button>
        )}

        {onViewReports && (
          <button
            onClick={(e) => handleAction(e, () => onViewReports(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <DocumentTextIcon className="h-4 w-4" />
            <span>{t('viewReports')}</span>
          </button>
        )}

        {onScheduleMeeting && (
          <button
            onClick={(e) => handleAction(e, () => onScheduleMeeting(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>{t('scheduleMeeting')}</span>
          </button>
        )}

        {onInviteTeam && (
          <button
            onClick={(e) => handleAction(e, () => onInviteTeam(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>{t('inviteTeam')}</span>
          </button>
        )}
      </div>

      {/* Archive Action */}
      {onArchive && project.status !== 'archived' && (
        <div className="py-1 border-t border-gray-100">
          <button
            onClick={(e) => handleAction(e, () => onArchive(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <ArchiveBoxIcon className="h-4 w-4" />
            <span>{t('archive')}</span>
          </button>
        </div>
      )}

      {/* Danger Zone */}
      {onDelete && (
        <div className="py-1 border-t border-gray-100">
          <button
            onClick={(e) => handleAction(e, () => onDelete(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>{t('delete')}</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default ProjectQuickActionsMenu;