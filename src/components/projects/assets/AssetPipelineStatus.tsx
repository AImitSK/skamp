'use client';

import React, { useState, useEffect } from 'react';
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  LinkIcon,
  ChartBarIcon,
  EyeIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import { Project } from '@/types/project';
import { AssetValidationResult, ResolvedAsset } from '@/types/pr';
import { useAuth } from '@/context/AuthContext';
import { projectService } from '@/lib/firebase/project-service';
import { mediaService } from '@/lib/firebase/media-service';

interface AssetPipelineStatusProps {
  project: Project;
  onValidationUpdate?: (result: AssetValidationResult) => void;
}

interface PipelinePhaseStatus {
  phase: string;
  phaseName: string;
  assetCount: number;
  validAssets: number;
  missingAssets: number;
  outdatedAssets: number;
  totalUsage: number;
  lastActivity?: Date;
}

interface AssetHealthMetrics {
  totalAssets: number;
  validAssets: number;
  missingAssets: number;
  outdatedAssets: number;
  healthScore: number; // 0-100
  lastValidation?: Date;
  criticalIssues: string[];
}

export default function AssetPipelineStatus({ 
  project, 
  onValidationUpdate 
}: AssetPipelineStatusProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [phaseStatus, setPhaseStatus] = useState<PipelinePhaseStatus[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<AssetHealthMetrics | null>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (project.id && user?.uid) {
      loadPipelineStatus();
    }
  }, [project.id, user?.uid]);

  const loadPipelineStatus = async () => {
    if (!project.id || !user?.uid) return;
    
    try {
      setLoading(true);
      
      // Asset-Validierung für das gesamte Projekt
      const validation = await projectService.validateProjectAssets(project.id, {
        organizationId: user.uid
      });
      
      // Pipeline-Phase Status berechnen
      const phases = calculatePhaseStatus(validation);
      setPhaseStatus(phases);
      
      // Health Metrics berechnen
      const health = calculateHealthMetrics(validation);
      setHealthMetrics(health);
      
      // Asset-History laden (simplified)
      setAssetHistory([]);
      
      onValidationUpdate?.(validation);
    } catch (error) {
      console.error('Fehler beim Laden des Pipeline-Status:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePhaseStatus = (validation: any): PipelinePhaseStatus[] => {
    const phaseMap = new Map<string, PipelinePhaseStatus>();
    
    // Initialisiere alle Phasen
    const phases = ['creation', 'internal_approval', 'customer_approval', 'distribution', 'monitoring'];
    const phaseNames = {
      'creation': 'Erstellung',
      'internal_approval': 'Interne Freigabe',
      'customer_approval': 'Kunden-Freigabe', 
      'distribution': 'Distribution',
      'monitoring': 'Monitoring'
    };
    
    phases.forEach(phase => {
      phaseMap.set(phase, {
        phase,
        phaseName: phaseNames[phase as keyof typeof phaseNames] || phase,
        assetCount: 0,
        validAssets: 0,
        missingAssets: 0,
        outdatedAssets: 0,
        totalUsage: 0
      });
    });
    
    // Analysiere Validierung-Details
    validation.validationDetails?.forEach((detail: any) => {
      detail.assetIssues?.validationErrors?.forEach((error: string) => {
        // Extrahiere Phase-Info aus Fehlern (simplified)
        const phase = 'creation'; // Default
        const status = phaseMap.get(phase);
        if (status) {
          status.assetCount += 1;
          if (error.includes('nicht verfügbar')) {
            status.missingAssets += 1;
          } else if (error.includes('veraltet')) {
            status.outdatedAssets += 1;
          } else {
            status.validAssets += 1;
          }
        }
      });
    });
    
    return Array.from(phaseMap.values());
  };

  const calculateHealthMetrics = (validation: any): AssetHealthMetrics => {
    const totalAssets = validation.totalAssets || 0;
    const validAssets = validation.validAssets || 0;
    const missingAssets = validation.missingAssets || 0;
    const outdatedAssets = validation.outdatedAssets || 0;
    
    let healthScore = 100;
    if (totalAssets > 0) {
      const issuePercentage = ((missingAssets + outdatedAssets) / totalAssets) * 100;
      healthScore = Math.max(0, 100 - issuePercentage);
    }
    
    const criticalIssues: string[] = [];
    if (missingAssets > 0) {
      criticalIssues.push(`${missingAssets} fehlende Assets`);
    }
    if (outdatedAssets > 5) {
      criticalIssues.push(`${outdatedAssets} veraltete Assets`);
    }
    
    return {
      totalAssets,
      validAssets,
      missingAssets,
      outdatedAssets,
      healthScore,
      lastValidation: new Date(),
      criticalIssues
    };
  };

  const runFullValidation = async () => {
    if (!project.id || !user?.uid) return;
    
    try {
      setValidating(true);
      await loadPipelineStatus();
    } catch (error) {
      console.error('Fehler bei der Asset-Validierung:', error);
    } finally {
      setValidating(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircleIcon className="h-5 w-5" />;
    if (score >= 70) return <ExclamationTriangleIcon className="h-5 w-5" />;
    return <ExclamationTriangleIcon className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Asset Health Overview */}
      {healthMetrics && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Asset Health Status</h3>
            <button
              onClick={runFullValidation}
              disabled={validating}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`-ml-1 mr-2 h-4 w-4 ${validating ? 'animate-spin' : ''}`} />
              {validating ? 'Validiere...' : 'Neu validieren'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Health Score */}
            <div className={`p-4 rounded-lg ${getHealthColor(healthMetrics.healthScore)}`}>
              <div className="flex items-center">
                {getHealthIcon(healthMetrics.healthScore)}
                <div className="ml-3">
                  <p className="text-sm font-medium">Health Score</p>
                  <p className="text-2xl font-bold">{Math.round(healthMetrics.healthScore)}%</p>
                </div>
              </div>
            </div>
            
            {/* Total Assets */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <DocumentDuplicateIcon className="h-5 w-5 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-700">Assets Total</p>
                  <p className="text-2xl font-bold text-blue-900">{healthMetrics.totalAssets}</p>
                </div>
              </div>
            </div>
            
            {/* Valid Assets */}
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-700">Gültig</p>
                  <p className="text-2xl font-bold text-green-900">{healthMetrics.validAssets}</p>
                </div>
              </div>
            </div>
            
            {/* Issues */}
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-700">Probleme</p>
                  <p className="text-2xl font-bold text-red-900">
                    {healthMetrics.missingAssets + healthMetrics.outdatedAssets}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Critical Issues */}
          {healthMetrics.criticalIssues.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">Kritische Probleme</h4>
              <ul className="space-y-1">
                {healthMetrics.criticalIssues.map((issue, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Phase Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Pipeline Asset Status</h3>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ClockIcon className="h-4 w-4 mr-1" />
            {showTimeline ? 'Timeline ausblenden' : 'Timeline anzeigen'}
          </button>
        </div>

        {/* Phase Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {phaseStatus.map((phase) => (
            <div
              key={phase.phase}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedPhase === phase.phase
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPhase(
                selectedPhase === phase.phase ? null : phase.phase
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{phase.phaseName}</h4>
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Assets:</span>
                  <span className="font-medium">{phase.assetCount}</span>
                </div>
                
                {phase.assetCount > 0 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(phase.validAssets / phase.assetCount) * 100}%`
                        }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{phase.validAssets} gültig</span>
                      <span>
                        {phase.missingAssets + phase.outdatedAssets} Probleme
                      </span>
                    </div>
                  </>
                )}
                
                {phase.lastActivity && (
                  <div className="flex items-center text-xs text-gray-500 mt-2">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {phase.lastActivity.toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Phase View */}
        {selectedPhase && (
          <div className="border-t pt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-4">
                Details: {phaseStatus.find(p => p.phase === selectedPhase)?.phaseName}
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {phaseStatus.find(p => p.phase === selectedPhase)?.assetCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Assets gesamt</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {phaseStatus.find(p => p.phase === selectedPhase)?.validAssets || 0}
                  </p>
                  <p className="text-sm text-gray-600">Gültige Assets</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {phaseStatus.find(p => p.phase === selectedPhase)?.outdatedAssets || 0}
                  </p>
                  <p className="text-sm text-gray-600">Veraltet</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {phaseStatus.find(p => p.phase === selectedPhase)?.missingAssets || 0}
                  </p>
                  <p className="text-sm text-gray-600">Fehlend</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Asset Timeline */}
      {showTimeline && assetHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Activity Timeline</h3>
          
          <div className="space-y-4">
            {assetHistory.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <LinkIcon className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.fileName}</span>
                    {' '}wurde {activity.action === 'added' ? 'hinzugefügt' : 
                     activity.action === 'removed' ? 'entfernt' : 
                     activity.action === 'modified' ? 'geändert' : 'geteilt'}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{activity.phase}</span>
                    <span>•</span>
                    <span>{activity.userName}</span>
                    <span>•</span>
                    <span>{new Date(activity.timestamp.seconds * 1000).toLocaleString()}</span>
                  </div>
                  {activity.reason && (
                    <p className="text-xs text-gray-500 mt-1">{activity.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => {/* TODO: Open Asset Gallery */}}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
        >
          <EyeIcon className="-ml-1 mr-2 h-4 w-4" />
          Assets anzeigen
        </button>
        
        <button
          onClick={runFullValidation}
          disabled={validating}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`-ml-1 mr-2 h-4 w-4 ${validating ? 'animate-spin' : ''}`} />
          {validating ? 'Validiere...' : 'Assets validieren'}
        </button>
      </div>
    </div>
  );
}