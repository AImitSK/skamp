'use client';

import { useState } from 'react';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CampaignMonitoringTracker } from '@/types/monitoring';
import { differenceInDays, format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MonitoringControlBoxProps {
  tracker: CampaignMonitoringTracker | null;
  isLoading: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  onExtend: (days: 30 | 60 | 90) => Promise<void>;
}

export function MonitoringControlBox({
  tracker,
  isLoading,
  onToggle,
  onExtend
}: MonitoringControlBoxProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // Kein Tracker = Noch keine Kampagne versendet
  if (!tracker) {
    return (
      <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-6 mb-6">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-zinc-400" />
          <div>
            <Text className="font-medium text-zinc-700">Monitoring</Text>
            <Text className="text-sm text-zinc-500">
              Wird automatisch aktiviert, sobald eine Kampagne versendet wird.
            </Text>
          </div>
        </div>
      </div>
    );
  }

  // Status berechnen - handle Firestore Timestamps
  const now = new Date();
  const endDate = tracker.endDate && typeof tracker.endDate.toDate === 'function'
    ? tracker.endDate.toDate()
    : new Date(tracker.endDate as unknown as string);
  const startDate = tracker.startDate && typeof tracker.startDate.toDate === 'function'
    ? tracker.startDate.toDate()
    : new Date(tracker.startDate as unknown as string);

  const daysRemaining = differenceInDays(endDate, now);
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(now, startDate);
  const progressPercent = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  const isExpired = daysRemaining <= 0;
  const isActive = tracker.isActive && !isExpired;

  // Status Badge
  const getStatusBadge = () => {
    if (!tracker.isActive) {
      return <Badge color="zinc">Deaktiviert</Badge>;
    }
    if (isExpired) {
      return <Badge color="amber">Abgelaufen</Badge>;
    }
    return <Badge color="green">Aktiv</Badge>;
  };

  // Toggle Handler
  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(!tracker.isActive);
    } finally {
      setIsToggling(false);
    }
  };

  // Extend Handler
  const handleExtend = async (days: 30 | 60 | 90) => {
    setIsExtending(true);
    try {
      await onExtend(days);
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-6 w-6 text-primary" />
          <Text className="font-semibold text-zinc-900 text-lg">Monitoring</Text>
          {getStatusBadge()}
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2">
          <Text className="text-sm text-zinc-600">
            {tracker.isActive ? 'Aktiv' : 'Inaktiv'}
          </Text>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={tracker.isActive}
              onChange={handleToggle}
              disabled={isToggling || isLoading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Content - Aktiv */}
      {isActive && (
        <>
          {/* Zeit-Info */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-zinc-500" />
                <Text className="text-sm text-zinc-600">
                  Läuft noch <span className="font-semibold text-zinc-900">{daysRemaining} Tage</span>
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  plain
                  onClick={() => handleExtend(30)}
                  disabled={isExtending}
                  className="text-sm !text-primary hover:!bg-blue-50"
                >
                  +30 Tage
                </Button>
                <Button
                  plain
                  onClick={() => handleExtend(60)}
                  disabled={isExtending}
                  className="text-sm !text-primary hover:!bg-blue-50"
                >
                  +60 Tage
                </Button>
                <Button
                  plain
                  onClick={() => handleExtend(90)}
                  disabled={isExtending}
                  className="text-sm !text-primary hover:!bg-blue-50"
                >
                  +90 Tage
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between mt-1">
              <Text className="text-xs text-zinc-500">
                Gestartet: {format(startDate, 'dd.MM.yyyy', { locale: de })}
              </Text>
              <Text className="text-xs text-zinc-500">
                Endet: {format(endDate, 'dd.MM.yyyy', { locale: de })}
              </Text>
            </div>
          </div>

          {/* Statistiken */}
          <div className="border-t border-zinc-200 pt-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-zinc-900">{tracker.totalArticlesFound || 0}</span>
                <span className="text-zinc-600">Auto-Funde</span>
              </div>
              <span className="text-zinc-300">·</span>
              <div className="flex items-center gap-1">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="font-semibold text-zinc-900">{tracker.totalAutoConfirmed || 0}</span>
                <span className="text-zinc-600">bestätigt</span>
              </div>
              <span className="text-zinc-300">·</span>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-zinc-900">{tracker.totalManuallyAdded || 0}</span>
                <span className="text-zinc-600">manuell</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content - Deaktiviert */}
      {!tracker.isActive && !isExpired && (
        <div className="text-center py-4">
          <Text className="text-zinc-600 mb-3">
            Monitoring wurde deaktiviert.
          </Text>
          <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 mb-4">
            <span>{tracker.totalArticlesFound || 0} gefunden</span>
            <span>·</span>
            <span>{tracker.totalAutoConfirmed || 0} bestätigt</span>
          </div>
          <Button
            onClick={handleToggle}
            disabled={isToggling}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Wieder aktivieren
          </Button>
        </div>
      )}

      {/* Content - Abgelaufen */}
      {isExpired && (
        <div className="text-center py-4">
          <Text className="text-zinc-600 mb-1">
            Monitoring-Zeitraum endete am {format(endDate, 'dd.MM.yyyy', { locale: de })}.
          </Text>
          <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 mb-4">
            <span>{tracker.totalArticlesFound || 0} gefunden</span>
            <span>·</span>
            <span>{tracker.totalAutoConfirmed || 0} bestätigt</span>
          </div>
          <Button
            onClick={() => handleExtend(30)}
            disabled={isExtending}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Verlängern (+30 Tage)
          </Button>
        </div>
      )}
    </div>
  );
}
