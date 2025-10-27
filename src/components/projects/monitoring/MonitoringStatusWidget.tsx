// src/components/projects/monitoring/MonitoringStatusWidget.tsx
'use client';

import React from 'react';
import {
  EyeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface MonitoringStatusWidgetProps {
  projectId: string;
  currentStage?: string;
  isEnabled?: boolean;
  status?: 'not_started' | 'active' | 'completed' | 'paused';
  stats?: {
    totalClippings: number;
    totalReach: number;
    averageSentiment: number;
    trending: string;
    lastUpdated: Date;
  };
  onStart?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  className?: string;
}

const MonitoringStatusWidget = React.memo<MonitoringStatusWidgetProps>(({
  projectId,
  currentStage,
  isEnabled,
  status = 'not_started',
  stats,
  onStart,
  onPause,
  onStop,
  className = ''
}) => {
  const currentStatus = status;
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: EyeIcon,
          label: 'Aktiv überwacht',
          displayText: 'Monitoring läuft'
        };
      case 'completed':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: CheckCircleIcon,
          label: 'Abgeschlossen',
          displayText: 'Monitoring abgeschlossen'
        };
      case 'paused':
        return {
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: PauseIcon,
          label: 'Pausiert',
          displayText: 'Monitoring pausiert'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: PlayIcon,
          label: 'Nicht gestartet',
          displayText: 'Monitoring nicht gestartet'
        };
    }
  };

  const statusConfig = getStatusConfig(currentStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <StatusIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">Monitoring</span>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
          {statusConfig.label}
        </div>
      </div>

      {/* Metrics */}
      {stats && currentStatus !== 'not_started' ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {stats.totalReach > 999
                ? `${(stats.totalReach / 1000).toFixed(1)}K`
                : stats.totalReach}
            </div>
            <div className="text-xs text-gray-500">Reichweite</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {stats.totalClippings}
            </div>
            <div className="text-xs text-gray-500">Clippings</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              stats.averageSentiment > 0.1 ? 'text-green-600' :
              stats.averageSentiment < -0.1 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {stats.averageSentiment > 0 ? '+' : ''}
              {stats.averageSentiment.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Sentiment</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">
            {statusConfig.displayText || 'Laden...'}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        {/* Interaktive Monitoring-Buttons für Tests */}
        {(onStart || onPause || onStop) ? (
          <div className="flex space-x-2">
            {currentStatus === 'not_started' && onStart && (
              <button 
                onClick={onStart}
                className="flex-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
              >
                <PlayIcon className="w-3 h-3" data-testid="play-icon" />
                <span>Starten</span>
              </button>
            )}
            
            {currentStatus === 'active' && (
              <>
                {onPause && (
                  <button 
                    onClick={onPause}
                    className="flex-1 text-xs bg-yellow-600 text-white px-3 py-1.5 rounded hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <PauseIcon className="w-3 h-3" data-testid="pause-icon" />
                    <span>Pausieren</span>
                  </button>
                )}
                {onStop && (
                  <button 
                    onClick={onStop}
                    className="flex-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <CheckCircleIcon className="w-3 h-3" data-testid="stop-icon" />
                    <span>Stoppen</span>
                  </button>
                )}
              </>
            )}
            
            {currentStatus === 'paused' && onStart && (
              <button 
                onClick={onStart}
                className="flex-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
              >
                <PlayIcon className="w-3 h-3" data-testid="play-icon" />
                <span>Fortsetzen</span>
              </button>
            )}
          </div>
        ) : (
          /* Standard Dashboard-Buttons */
          <div className="flex space-x-2">
            <button className="flex-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">
              Dashboard
            </button>
            <button className="flex-1 text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}));

export default MonitoringStatusWidget;