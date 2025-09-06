// src/components/projects/kanban/ProjectQuickActionsMenu.tsx - Quick Actions Menu für Plan 10/9
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ShareIcon,
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
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

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

  // Get valid target stages (excluding current)
  const getValidMoveStages = (): PipelineStage[] => {
    const allStages = getAllStages();
    return allStages.filter(stage => stage !== project.currentStage);
  };

  // Handle action and close menu
  const handleAction = (action: () => void) => {
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
            onClick={() => handleAction(() => onView(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <EyeIcon className="h-4 w-4" />
            <span>Projekt anzeigen</span>
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => handleAction(() => onEdit(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Bearbeiten</span>
          </button>
        )}
      </div>

      {/* Move to Stage */}
      {onMoveToStage && (
        <div className="py-1 border-t border-gray-100">
          <div
            className="relative"
            onMouseEnter={() => setShowMoveSubmenu(true)}
            onMouseLeave={() => setShowMoveSubmenu(false)}
          >
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ArrowsRightLeftIcon className="h-4 w-4" />
                <span>Verschieben nach</span>
              </div>
              <span className="text-xs text-gray-400">›</span>
            </button>

            {/* Move Submenu */}
            {showMoveSubmenu && (
              <div className="absolute left-full top-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                {getValidMoveStages().map(stage => {
                  const stageConfig = getStageConfig(stage);
                  return (
                    <button
                      key={stage}
                      onClick={() => handleAction(() => onMoveToStage(project.id!, stage))}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {stageConfig.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Secondary Actions */}
      <div className="py-1 border-t border-gray-100">
        {onAddComment && (
          <button
            onClick={() => handleAction(() => onAddComment(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <ChatBubbleLeftIcon className="h-4 w-4" />
            <span>Kommentar hinzufügen</span>
          </button>
        )}

        {onViewReports && (
          <button
            onClick={() => handleAction(() => onViewReports(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <DocumentTextIcon className="h-4 w-4" />
            <span>Reports anzeigen</span>
          </button>
        )}

        {onScheduleMeeting && (
          <button
            onClick={() => handleAction(() => onScheduleMeeting(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <CalendarIcon className="h-4 w-4" />
            <span>Meeting planen</span>
          </button>
        )}

        {onInviteTeam && (
          <button
            onClick={() => handleAction(() => onInviteTeam(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Team einladen</span>
          </button>
        )}
      </div>

      {/* Utility Actions */}
      <div className="py-1 border-t border-gray-100">
        {onClone && (
          <button
            onClick={() => handleAction(() => onClone(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            <span>Duplizieren</span>
          </button>
        )}

        {onShare && (
          <button
            onClick={() => handleAction(() => onShare(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
          >
            <ShareIcon className="h-4 w-4" />
            <span>Teilen</span>
          </button>
        )}
      </div>

      {/* Danger Zone */}
      {onDelete && (
        <div className="py-1 border-t border-gray-100">
          <button
            onClick={() => handleAction(() => onDelete(project.id!))}
            className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Löschen</span>
          </button>
        </div>
      )}

      {/* Project Status Info */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">
              {project.status === 'active' ? 'Aktiv' :
               project.status === 'on_hold' ? 'Pausiert' :
               project.status === 'completed' ? 'Fertig' :
               project.status === 'cancelled' ? 'Abgebrochen' : project.status}
            </span>
          </div>
          
          {project.assignedTo && project.assignedTo.length > 0 && (
            <div className="flex justify-between">
              <span>Team:</span>
              <span className="font-medium">{project.assignedTo.length} Mitglieder</span>
            </div>
          )}
          
          {project.dueDate && (
            <div className="flex justify-between">
              <span>Fällig:</span>
              <span className="font-medium">
                {new Date(project.dueDate.seconds * 1000).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectQuickActionsMenu;