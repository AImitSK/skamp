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
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { Project, PipelineStage } from '@/types/project';
import { getStageConfig, getAllStages } from './kanban-constants';

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
  triggerRef
}) => {
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

  // Get next and previous stages
  const getAdjacentStages = () => {
    const allStages = getAllStages();
    const currentIndex = allStages.indexOf(project.currentStage);
    
    return {
      previousStage: currentIndex > 0 ? allStages[currentIndex - 1] : null,
      nextStage: currentIndex < allStages.length - 1 ? allStages[currentIndex + 1] : null
    };
  };

  const { previousStage, nextStage } = getAdjacentStages();

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
            <span>Projekt anzeigen</span>
          </button>
        )}

        {onEdit && (
          <button
            onClick={(e) => handleAction(e, () => onEdit(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Bearbeiten</span>
          </button>
        )}
      </div>

      {/* Phase Navigation */}
      {onMoveToStage && (previousStage || nextStage) && (
        <div className="py-1 border-t border-gray-100">
          {previousStage && (
            <button
              onClick={(e) => handleAction(e, () => onMoveToStage(project.id!, previousStage))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span>← Vorherige Phase ({getStageConfig(previousStage).name})</span>
            </button>
          )}
          
          {nextStage && (
            <button
              onClick={(e) => handleAction(e, () => onMoveToStage(project.id!, nextStage))}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span>→ Nächste Phase ({getStageConfig(nextStage).name})</span>
            </button>
          )}
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
            <span>Kommentar hinzufügen</span>
          </button>
        )}

        {onViewReports && (
          <button
            onClick={(e) => handleAction(e, () => onViewReports(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <DocumentTextIcon className="h-4 w-4" />
            <span>Reports anzeigen</span>
          </button>
        )}

        {onScheduleMeeting && (
          <button
            onClick={(e) => handleAction(e, () => onScheduleMeeting(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Meeting planen</span>
          </button>
        )}

        {onInviteTeam && (
          <button
            onClick={(e) => handleAction(e, () => onInviteTeam(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Team einladen</span>
          </button>
        )}
      </div>


      {/* Danger Zone */}
      {onDelete && (
        <div className="py-1 border-t border-gray-100">
          <button
            onClick={(e) => handleAction(e, () => onDelete(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Löschen</span>
          </button>
        </div>
      )}

    </div>
  );
};

export default ProjectQuickActionsMenu;