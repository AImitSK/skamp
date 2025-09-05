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
  monitoringStatus?: 'not_started' | 'active' | 'completed' | 'paused';
  analytics?: {
    totalReach: number;
    clippingCount: number;
    sentimentScore: number;
  };
  className?: string;
}

const MonitoringStatusWidget: React.FC<MonitoringStatusWidgetProps> = ({
  projectId,
  monitoringStatus = 'not_started',
  analytics,
  className = ''
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: EyeIcon,
          label: 'Aktiv überwacht'
        };
      case 'completed':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: CheckCircleIcon,
          label: 'Abgeschlossen'
        };
      case 'paused':
        return {
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: PauseIcon,
          label: 'Pausiert'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: PlayIcon,
          label: 'Nicht gestartet'
        };
    }
  };

  const statusConfig = getStatusConfig(monitoringStatus);
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
      {analytics && monitoringStatus !== 'not_started' ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {analytics.totalReach > 999 
                ? `${(analytics.totalReach / 1000).toFixed(1)}K`
                : analytics.totalReach
              }
            </div>
            <div className="text-xs text-gray-500">Reichweite</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {analytics.clippingCount}
            </div>
            <div className="text-xs text-gray-500">Clippings</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              analytics.sentimentScore > 0.1 ? 'text-green-600' :
              analytics.sentimentScore < -0.1 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {analytics.sentimentScore > 0 ? '+' : ''}{analytics.sentimentScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Sentiment</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">
            {monitoringStatus === 'not_started' 
              ? 'Monitoring noch nicht gestartet'
              : 'Laden...'
            }
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex space-x-2">
          <button className="flex-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">
            Dashboard
          </button>
          <button className="flex-1 text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
            Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonitoringStatusWidget;