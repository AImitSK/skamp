// src/components/projects/kanban/BoardHeader.tsx - Board Header für Plan 10/9
'use client';

import React from 'react';
import {
  Squares2X2Icon,
  UserGroupIcon,
  PlusIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

// ========================================
// INTERFACES
// ========================================

export interface BoardHeaderProps {
  totalProjects: number;
  activeUsers: Array<{
    id: string;
    name: string;
    avatar?: string;
    currentProject?: string;
    lastSeen?: Date | { seconds: number };
  }>;
  viewMode?: 'board' | 'list';
  onViewModeChange?: (mode: 'board' | 'list') => void;
  onNewProject?: () => void;
}

// ========================================
// BOARD HEADER KOMPONENTE
// ========================================

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  totalProjects,
  activeUsers,
  viewMode = 'board',
  onViewModeChange,
  onNewProject
}) => {

  return (
    <div className="board-header bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side - Title & Stats */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Squares2X2Icon className="h-6 w-6 text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              Projekt-Board
            </h1>
          </div>
          
          {/* Project Count */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
              {totalProjects}
            </span>
            <span>
              {totalProjects === 1 ? 'Projekt' : 'Projekte'}
            </span>
          </div>

          {/* Active Users Indicator */}
          {activeUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <UserGroupIcon className="h-4 w-4" />
              <span>{activeUsers.length} online</span>
              
              {/* User Avatars */}
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map(user => (
                  <div
                    key={user.id}
                    className="relative"
                    title={user.name}
                  >
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-6 w-6 rounded-full border-2 border-white bg-gray-200"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {activeUsers.length > 3 && (
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      +{activeUsers.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - New Toolbar */}
        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => onViewModeChange('board')}
                className={`
                  px-3 py-2 text-sm font-medium rounded-l-lg transition-colors
                  ${viewMode === 'board'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
                title="Board-Ansicht"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`
                  px-3 py-2 text-sm font-medium border-l border-gray-300 rounded-r-lg transition-colors
                  ${viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
                title="Listen-Ansicht"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* New Project Button */}
          {onNewProject && (
            <Button 
              onClick={onNewProject}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Neues Projekt</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardHeader;