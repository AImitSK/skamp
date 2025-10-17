// src/components/projects/kanban/UserPresenceOverlay.tsx - User Presence für Plan 10/9
'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { de } from 'date-fns/locale/de';

// ========================================
// INTERFACES
// ========================================

export interface ActiveUser {
  id: string;
  name: string;
  avatar?: string;
  currentProject?: string;
  lastSeen: { seconds: number } | Date;
}

export interface UserPresenceOverlayProps {
  activeUsers: ActiveUser[];
}

// ========================================
// USER PRESENCE OVERLAY KOMPONENTE
// ========================================

export const UserPresenceOverlay: React.FC<UserPresenceOverlayProps> = ({
  activeUsers
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute for relative timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Filter really active users (last 2 minutes)
  const recentlyActiveUsers = activeUsers.filter(user => {
    const lastSeenDate = user.lastSeen instanceof Date 
      ? user.lastSeen 
      : new Date(user.lastSeen.seconds * 1000);
    
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    return lastSeenDate > twoMinutesAgo;
  });

  // Don't render if no active users
  if (activeUsers.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Presence Indicator */}
      <div className="fixed top-20 right-6 z-50">
        <div 
          className="relative"
          onMouseEnter={() => setShowDetails(true)}
          onMouseLeave={() => setShowDetails(false)}
        >
          {/* Main Indicator */}
          <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-lg">
            {/* Active Users Count */}
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                {recentlyActiveUsers.length}
              </span>
            </div>

            {/* User Avatars */}
            <div className="flex -space-x-2">
              {recentlyActiveUsers.slice(0, 3).map(user => (
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
                  
                  {/* Online Status Dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
              ))}
              
              {recentlyActiveUsers.length > 3 && (
                <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-300 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    +{recentlyActiveUsers.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Tooltip */}
          {showDetails && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Online Benutzer ({activeUsers.length})
                  </h3>
                  <div className="flex items-center space-x-1">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500">Live</span>
                  </div>
                </div>

                {/* User List */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {activeUsers.map(user => {
                    const lastSeenDate = user.lastSeen instanceof Date 
                      ? user.lastSeen 
                      : new Date(user.lastSeen.seconds * 1000);
                    
                    const isVeryRecent = Date.now() - lastSeenDate.getTime() < 60 * 1000; // Last minute
                    const isRecent = Date.now() - lastSeenDate.getTime() < 2 * 60 * 1000; // Last 2 minutes

                    return (
                      <div
                        key={user.id}
                        className={`flex items-center space-x-3 p-2 rounded-lg ${
                          isVeryRecent ? 'bg-green-50' : isRecent ? 'bg-blue-50' : 'bg-gray-50'
                        }`}
                      >
                        {/* User Avatar */}
                        <div className="relative flex-shrink-0">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="h-8 w-8 rounded-full bg-gray-200"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          {/* Status Indicator */}
                          <div className={`
                            absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white
                            ${isVeryRecent ? 'bg-green-400' : isRecent ? 'bg-yellow-400' : 'bg-gray-400'}
                          `}></div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.name}
                            </p>
                            <span className={`
                              text-xs font-medium px-2 py-1 rounded-full
                              ${isVeryRecent ? 'bg-green-100 text-green-800' :
                                isRecent ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            `}>
                              {isVeryRecent ? 'Jetzt aktiv' : lastSeenDate.toLocaleTimeString('de-DE')}
                            </span>
                          </div>
                          
                          {/* Current Project */}
                          {user.currentProject && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              📋 Arbeitet an: {user.currentProject}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Aktualisiert alle 30s</span>
                    <span>{recentlyActiveUsers.length} sehr aktiv</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active User Cursors (Placeholder) */}
      {recentlyActiveUsers.length > 0 && (
        <div className="pointer-events-none">
          {/* TODO: Implement real-time cursor tracking */}
          {/* This would show live mouse cursors of other users */}
        </div>
      )}

      {/* Conflict Notifications */}
      {activeUsers.some(user => user.currentProject) && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* TODO: Show conflict messages when multiple users edit same project */}
        </div>
      )}
    </>
  );
};

export default UserPresenceOverlay;