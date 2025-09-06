'use client';

import { useState } from 'react';
import { PipelineStage } from '@/types/project';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  TrophyIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface PipelineProgressDashboardProps {
  projectId: string;
  progress: {
    overallPercent: number;
    stageProgress: Record<PipelineStage, number>;
    taskCompletion: number;
    criticalTasksRemaining: number;
    lastUpdated: Date;
    milestones: Array<{
      percent: number;
      achievedAt?: Date;
      notificationSent: boolean;
    }>;
  };
  currentStage: PipelineStage;
}

export default function PipelineProgressDashboard({
  projectId,
  progress,
  currentStage
}: PipelineProgressDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month');

  const stageLabels: Record<PipelineStage, string> = {
    'ideas_planning': 'Ideen & Planung',
    'creation': 'Erstellung',
    'internal_approval': 'Interne Freigabe',
    'customer_approval': 'Kunden-Freigabe',
    'distribution': 'Verteilung',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  };

  const stageOrder: PipelineStage[] = [
    'ideas_planning',
    'creation', 
    'internal_approval',
    'customer_approval',
    'distribution',
    'monitoring',
    'completed'
  ];

  const getStageStatus = (stage: PipelineStage): 'completed' | 'current' | 'upcoming' => {
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMilestoneIcon = (achieved: boolean) => {
    return achieved ? (
      <TrophyIcon className="w-5 h-5 text-yellow-500" />
    ) : (
      <TrophyIcon className="w-5 h-5 text-gray-300" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Gesamt-Progress Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Pipeline-Fortschritt
          </h3>
          <ChartBarIcon className="w-6 h-6" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gesamt-Fortschritt */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Gesamt-Fortschritt</p>
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-bold">
                {Math.round(progress.overallPercent)}%
              </div>
              <div className="flex-1 bg-blue-500 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${progress.overallPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Task-Completion */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Task-Completion</p>
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-bold">
                {Math.round(progress.taskCompletion)}%
              </div>
              <div className="flex-1 bg-blue-500 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-300"
                  style={{ width: `${progress.taskCompletion}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Kritische Tasks */}
          <div>
            <p className="text-blue-100 text-sm mb-2">Kritische Tasks</p>
            <div className="flex items-center space-x-2">
              {progress.criticalTasksRemaining > 0 ? (
                <>
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-300" />
                  <span className="text-xl font-bold">
                    {progress.criticalTasksRemaining} offen
                  </span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-6 h-6 text-green-300" />
                  <span className="text-xl font-bold">
                    Alle erledigt
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-blue-100">
          Letztes Update: {progress.lastUpdated.toLocaleString('de-DE')}
        </div>
      </div>

      {/* Stage-spezifischer Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Fortschritt nach Stage
        </h4>

        <div className="space-y-4">
          {stageOrder.map(stage => {
            const stageProgress = progress.stageProgress[stage] || 0;
            const status = getStageStatus(stage);
            const progressColor = getProgressColor(stageProgress);

            return (
              <div key={stage} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {status === 'completed' && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    )}
                    {status === 'current' && (
                      <ClockIcon className="w-5 h-5 text-blue-500" />
                    )}
                    {status === 'upcoming' && (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                    )}
                    
                    <span className={`font-medium ${
                      status === 'current' ? 'text-blue-600' : 
                      status === 'completed' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {stageLabels[stage]}
                    </span>
                  </div>

                  <span className="text-sm font-medium text-gray-600">
                    {Math.round(stageProgress)}%
                  </span>
                </div>

                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`${progressColor} rounded-full h-3 transition-all duration-500`}
                      style={{ width: `${stageProgress}%` }}
                    ></div>
                  </div>
                  
                  {status === 'current' && (
                    <div className="absolute inset-0 bg-blue-200 rounded-full opacity-50 animate-pulse"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Milestone Achievement */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Meilenstein-Errungenschaften
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[25, 50, 75, 90].map(milestone => {
            const achieved = progress.overallPercent >= milestone;
            const milestoneData = progress.milestones.find(m => m.percent === milestone);
            
            return (
              <div
                key={milestone}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${achieved 
                    ? 'border-yellow-300 bg-yellow-50' 
                    : 'border-gray-200 bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  {getMilestoneIcon(achieved)}
                  <span className={`text-sm font-medium ${
                    achieved ? 'text-yellow-700' : 'text-gray-500'
                  }`}>
                    {milestone}%
                  </span>
                </div>
                
                <p className={`text-xs ${
                  achieved ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {achieved 
                    ? milestoneData?.achievedAt 
                      ? `Erreicht am ${milestoneData.achievedAt.toLocaleDateString('de-DE')}`
                      : 'Erreicht!'
                    : 'Noch nicht erreicht'
                  }
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Task Warnings */}
      {progress.criticalTasksRemaining > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-amber-800">
              Warnung: Kritische Tasks ausstehend
            </h4>
          </div>
          <p className="mt-2 text-sm text-amber-700">
            Es sind noch {progress.criticalTasksRemaining} kritische Tasks offen, 
            die für den nächsten Stage-Übergang erforderlich sind.
          </p>
        </div>
      )}

      {/* Trend Chart Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">
            Fortschritts-Trend
          </h4>
          
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="week">Letzte Woche</option>
            <option value="month">Letzter Monat</option>
            <option value="all">Gesamt</option>
          </select>
        </div>

        {/* Vereinfachter Trend-Indikator */}
        <div className="flex items-center justify-center h-32 bg-gray-50 rounded-lg">
          <div className="text-center">
            <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              Trend-Chart für {selectedTimeframe === 'week' ? 'letzte Woche' : 
                               selectedTimeframe === 'month' ? 'letzten Monat' : 'gesamten Zeitraum'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Detaillierte Charts werden in einer zukünftigen Version implementiert
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}