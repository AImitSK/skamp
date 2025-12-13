// src/components/projects/monitoring/MonitoringStatusWidget.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('projects.monitoring.status');
  const currentStatus = status;
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: EyeIcon,
          label: t('active.label'),
          displayText: t('active.displayText')
        };
      case 'completed':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: CheckCircleIcon,
          label: t('completed.label'),
          displayText: t('completed.displayText')
        };
      case 'paused':
        return {
          color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
          icon: PauseIcon,
          label: t('paused.label'),
          displayText: t('paused.displayText')
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: PlayIcon,
          label: t('notStarted.label'),
          displayText: t('notStarted.displayText')
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
          <span className="text-sm font-medium text-gray-900">{t('title')}</span>
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
            <div className="text-xs text-gray-500">{t('metrics.reach')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {stats.totalClippings}
            </div>
            <div className="text-xs text-gray-500">{t('metrics.clippings')}</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-semibold ${
              stats.averageSentiment > 0.1 ? 'text-green-600' :
              stats.averageSentiment < -0.1 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {stats.averageSentiment > 0 ? '+' : ''}
              {stats.averageSentiment.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">{t('metrics.sentiment')}</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="text-sm text-gray-500">
            {statusConfig.displayText || t('loading')}
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
                <span>{t('actions.start')}</span>
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
                    <span>{t('actions.pause')}</span>
                  </button>
                )}
                {onStop && (
                  <button
                    onClick={onStop}
                    className="flex-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <CheckCircleIcon className="w-3 h-3" data-testid="stop-icon" />
                    <span>{t('actions.stop')}</span>
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
                <span>{t('actions.resume')}</span>
              </button>
            )}
          </div>
        ) : (
          /* Standard Dashboard-Buttons */
          <div className="flex space-x-2">
            <button className="flex-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors">
              {t('actions.dashboard')}
            </button>
            <button className="flex-1 text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
              {t('actions.report')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

MonitoringStatusWidget.displayName = 'MonitoringStatusWidget';

export default MonitoringStatusWidget;