'use client';

import { useState } from 'react';
import { PipelineStage } from '@/types/project';
import { ChevronRightIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface StageTransitionControllerProps {
  projectId: string;
  currentStage: PipelineStage;
  availableTransitions: {
    stage: PipelineStage;
    canTransition: boolean;
    blockedReason?: string;
  }[];
  onStageTransition: (toStage: PipelineStage) => Promise<void>;
  onRollback?: (toStage: PipelineStage) => Promise<void>;
}

export default function StageTransitionController({
  projectId,
  currentStage,
  availableTransitions,
  onStageTransition,
  onRollback
}: StageTransitionControllerProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const stageLabels: Record<PipelineStage, string> = {
    'ideas_planning': 'Ideen & Planung',
    'creation': 'Erstellung',
    'internal_approval': 'Interne Freigabe',
    'customer_approval': 'Kunden-Freigabe',
    'distribution': 'Verteilung',
    'monitoring': 'Monitoring',
    'completed': 'Abgeschlossen'
  };

  const handleTransitionClick = (toStage: PipelineStage) => {
    setSelectedStage(toStage);
    setShowConfirmation(true);
  };

  const confirmTransition = async () => {
    if (!selectedStage) return;
    
    setIsTransitioning(true);
    try {
      await onStageTransition(selectedStage);
    } finally {
      setIsTransitioning(false);
      setShowConfirmation(false);
      setSelectedStage(null);
    }
  };

  const handleRollback = async (toStage: PipelineStage) => {
    if (!onRollback) return;
    
    setIsTransitioning(true);
    try {
      await onRollback(toStage);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Stage-Übergänge
      </h3>

      {/* Aktueller Stage */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium text-gray-900">
            Aktueller Stage: {stageLabels[currentStage]}
          </span>
        </div>
      </div>

      {/* Verfügbare Übergänge */}
      <div className="space-y-3">
        {availableTransitions.map(transition => (
          <div
            key={transition.stage}
            className={`
              border border-gray-200 rounded-lg p-4 
              ${transition.canTransition ? 'bg-green-50' : 'bg-gray-50'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                <span className="font-medium text-gray-900">
                  {stageLabels[transition.stage]}
                </span>
                
                {!transition.canTransition && (
                  <div className="flex items-center space-x-1 text-amber-600">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span className="text-sm">Blockiert</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleTransitionClick(transition.stage)}
                disabled={!transition.canTransition || isTransitioning}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium
                  ${transition.canTransition
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                  disabled:opacity-50
                `}
              >
                {isTransitioning ? 'Wird übertragen...' : 'Übergang starten'}
              </button>
            </div>

            {transition.blockedReason && (
              <p className="mt-2 text-sm text-amber-600">
                {transition.blockedReason}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Rollback-Option */}
      {onRollback && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Rollback-Optionen
          </h4>
          <button
            onClick={() => handleRollback('creation')}
            disabled={isTransitioning}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Zurück zur Erstellung
          </button>
        </div>
      )}

      {/* Bestätigungsdialog */}
      {showConfirmation && selectedStage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Stage-Übergang bestätigen
            </h3>
            
            <p className="text-gray-600 mb-6">
              Sind Sie sicher, dass Sie zu &ldquo;{stageLabels[selectedStage]}&rdquo; wechseln möchten?
              Dieser Vorgang führt automatisch entsprechende Workflow-Aktionen aus.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={confirmTransition}
                disabled={isTransitioning}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Bestätigen
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={isTransitioning}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}