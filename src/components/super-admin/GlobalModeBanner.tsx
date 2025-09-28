"use client";

import { useState } from 'react';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface GlobalModeBannerProps {
  context?: 'contact' | 'company' | 'publication';
  className?: string;
  onLiveModeChange?: (isLive: boolean) => void;
}

export function GlobalModeBanner({
  context = 'contact',
  className = '',
  onLiveModeChange
}: GlobalModeBannerProps) {
  const {
    autoGlobalMode,
    isSuperAdmin,
    isGlobalTeamMember,
    isGlobalTeamAdmin,
    userRole
  } = useAutoGlobal();

  const [liveMode, setLiveMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Nur anzeigen wenn im Auto-Global Modus
  if (!autoGlobalMode) {
    return null;
  }

  const handleLiveModeToggle = (newLiveMode: boolean) => {
    setLiveMode(newLiveMode);
    onLiveModeChange?.(newLiveMode);
  };

  const getContextText = () => {
    switch (context) {
      case 'contact':
        return 'Kontakte werden zur Journalisten-Datenbank hinzugefügt';
      case 'company':
        return 'Firmen werden zur Media-Datenbank hinzugefügt';
      case 'publication':
        return 'Publikationen werden zur globalen Bibliothek hinzugefügt';
      default:
        return 'Inhalte werden global verfügbar gemacht';
    }
  };

  const getRoleText = () => {
    if (isSuperAdmin) return 'SuperAdmin';
    if (userRole === 'global-team-admin') return 'Global Team Admin';
    if (userRole === 'global-team-member') return 'Global Team Member';
    if (isGlobalTeamMember) return 'Global Team';
    return 'Global Mode';
  };

  if (isCollapsed) {
    return (
      <div className={`flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <GlobeAltIcon className="h-5 w-5 text-orange-600" />
          <Badge color="orange" className="text-xs">
            {getRoleText()}
          </Badge>
          <Badge color={liveMode ? "red" : "yellow"} className="text-xs">
            {liveMode ? "LIVE" : "ENTWURF"}
          </Badge>
        </div>

        <Button
          plain
          onClick={() => setIsCollapsed(false)}
          className="text-orange-600 hover:bg-orange-100 p-1"
        >
          <EyeIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`border border-orange-200 bg-orange-50 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <ShieldCheckIcon className="h-6 w-6 text-orange-600 mt-0.5" />

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-medium text-orange-800">
                🚨 GLOBAL-MODUS AKTIV
              </h3>
              <Badge color="orange" className="text-xs">
                {getRoleText()}
              </Badge>
            </div>

            <p className="text-sm text-orange-700 mb-3">
              {getContextText()}
            </p>

            <div className="flex items-center space-x-4">
              {/* Live-Modus Toggle */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-orange-700">Modus:</span>
                <div className="flex items-center space-x-2">
                  <SimpleSwitch
                    checked={liveMode}
                    onChange={handleLiveModeToggle}
                  />
                  <Badge
                    color={liveMode ? "red" : "yellow"}
                    className="text-xs font-medium"
                  >
                    {liveMode ? (
                      <>
                        🔴 LIVE
                        <span className="ml-1 text-xs">Sofort global</span>
                      </>
                    ) : (
                      <>
                        📝 ENTWURF
                        <span className="ml-1 text-xs">Review erforderlich</span>
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              {/* Berechtigungen anzeigen */}
              {isSuperAdmin && (
                <div className="flex items-center space-x-1 text-xs text-orange-600">
                  <span>Vollzugriff</span>
                  <span>•</span>
                  <span>Kann löschen</span>
                  <span>•</span>
                  <span>Team verwalten</span>
                </div>
              )}

              {isGlobalTeamAdmin && !isSuperAdmin && (
                <div className="flex items-center space-x-1 text-xs text-orange-600">
                  <span>Team Admin</span>
                  <span>•</span>
                  <span>Kann einladen</span>
                  <span>•</span>
                  <span>Bulk-Import</span>
                </div>
              )}

              {userRole === 'global-team-member' && (
                <div className="flex items-center space-x-1 text-xs text-orange-600">
                  <span>Team Member</span>
                  <span>•</span>
                  <span>Kann erstellen</span>
                  <span>•</span>
                  <span>Nur Entwürfe</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapse Button */}
        <Button
          plain
          onClick={() => setIsCollapsed(true)}
          className="text-orange-600 hover:bg-orange-100 p-1"
        >
          <EyeSlashIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Warning für Live-Modus */}
      {liveMode && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700 font-medium">
              Vorsicht: Alle Änderungen sind sofort für Premium-Kunden sichtbar!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}