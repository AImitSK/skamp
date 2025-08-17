// src/components/approvals/WorkflowVisualization.tsx - Workflow-Fortschritts-Anzeige
"use client";

import { ApprovalWorkflowStage } from '@/types/approvals-enhanced';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { 
  UserGroupIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface WorkflowVisualizationProps {
  stages: ApprovalWorkflowStage[];
  currentStage: 'team' | 'customer' | 'completed';
}

export function WorkflowVisualization({
  stages,
  currentStage
}: WorkflowVisualizationProps) {
  const getStageIcon = (stage: 'team' | 'customer') => {
    switch (stage) {
      case 'team': return UserGroupIcon;
      case 'customer': return BuildingOfficeIcon;
      default: return ClockIcon;
    }
  };

  const getStageLabel = (stage: 'team' | 'customer') => {
    switch (stage) {
      case 'team': return 'Team-Freigabe';
      case 'customer': return 'Kunden-Freigabe';
      default: return stage;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircleIcon;
      case 'rejected': return XCircleIcon;
      case 'in_progress': return ClockIcon;
      default: return ClockIcon;
    }
  };

  const getStatusColor = (status: string, isCurrentStage: boolean) => {
    if (isCurrentStage && status === 'in_progress') {
      return 'text-blue-600 bg-blue-50 border-blue-200';
    }
    
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Abgeschlossen';
      case 'rejected': return 'Abgelehnt';
      case 'in_progress': return 'In Bearbeitung';
      case 'pending': return 'Wartend';
      default: return status;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Freigabe-Workflow</h2>
        <Text className="text-gray-600">
          Aktueller Status: {currentStage === 'completed' ? 'Abgeschlossen' : getStageLabel(currentStage)}
        </Text>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between">
          {stages.map((stage, index) => {
            const StageIcon = getStageIcon(stage.stage);
            const StatusIcon = getStatusIcon(stage.status);
            const isCurrentStage = currentStage === stage.stage;
            const statusColors = getStatusColor(stage.status, isCurrentStage);
            
            return (
              <div key={stage.stage} className="flex items-center">
                {/* Stage */}
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    "relative p-4 rounded-full border-2 transition-all",
                    statusColors
                  )}>
                    <StageIcon className="h-6 w-6" />
                    
                    {/* Status Icon Overlay */}
                    <div className={clsx(
                      "absolute -bottom-1 -right-1 p-1 rounded-full bg-white ring-2 ring-white",
                      stage.status === 'completed' ? 'text-green-600' :
                      stage.status === 'rejected' ? 'text-red-600' :
                      stage.status === 'in_progress' ? 'text-blue-600' : 'text-gray-400'
                    )}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                  </div>
                  
                  {/* Stage Info */}
                  <div className="mt-3 text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {getStageLabel(stage.stage)}
                    </p>
                    <Badge 
                      color={
                        stage.status === 'completed' ? 'green' :
                        stage.status === 'rejected' ? 'red' :
                        stage.status === 'in_progress' ? 'blue' : 'gray'
                      }
                      className="mt-1"
                    >
                      {getStatusLabel(stage.status)}
                    </Badge>
                    
                    {/* Progress Info */}
                    {stage.status !== 'pending' && (
                      <div className="mt-2 text-xs text-gray-500">
                        {stage.status === 'in_progress' && (
                          <p>{stage.receivedApprovals}/{stage.requiredApprovals} Zustimmungen</p>
                        )}
                        {stage.startedAt && (
                          <p>Gestartet: {formatDate(stage.startedAt)}</p>
                        )}
                        {stage.completedAt && (
                          <p>Abgeschlossen: {formatDate(stage.completedAt)}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Arrow */}
                {index < stages.length - 1 && (
                  <ArrowRightIcon className="h-6 w-6 text-gray-400 mx-6" />
                )}
              </div>
            );
          })}
          
          {/* Final State */}
          <div className="flex items-center">
            <ArrowRightIcon className="h-6 w-6 text-gray-400 mx-6" />
            <div className="flex flex-col items-center">
              <div className={clsx(
                "p-4 rounded-full border-2 transition-all",
                currentStage === 'completed' 
                  ? "text-green-600 bg-green-50 border-green-200"
                  : "text-gray-400 bg-gray-50 border-gray-200"
              )}>
                <CheckCircleIcon className="h-6 w-6" />
              </div>
              
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-gray-900">
                  Versand freigegeben
                </p>
                <Badge 
                  color={currentStage === 'completed' ? 'green' : 'gray'}
                  className="mt-1"
                >
                  {currentStage === 'completed' ? 'Bereit' : 'Wartend'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Workflow-Fortschritt</span>
            <span>
              {stages.filter(s => s.status === 'completed').length}/{stages.length} Stufen abgeschlossen
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={clsx(
                "h-2 rounded-full transition-all duration-500",
                currentStage === 'completed' ? 'bg-green-600' : 'bg-blue-600'
              )}
              style={{ 
                width: `${currentStage === 'completed' ? 100 : (stages.filter(s => s.status === 'completed').length / stages.length) * 100}%` 
              }}
            />
          </div>
        </div>

        {/* Current Status Message */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <ClockIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              {currentStage === 'completed' ? (
                <p><strong>Workflow abgeschlossen!</strong> Die Kampagne wurde vollständig freigegeben und kann versendet werden.</p>
              ) : currentStage === 'team' ? (
                <p><strong>Team-Freigabe läuft:</strong> Warten auf Entscheidungen von allen ausgewählten Team-Mitgliedern.</p>
              ) : currentStage === 'customer' ? (
                <p><strong>Kunden-Freigabe läuft:</strong> Die Kampagne wurde an den Kunden zur Freigabe weitergeleitet.</p>
              ) : (
                <p><strong>Workflow gestartet:</strong> Der Freigabe-Prozess wurde initiiert.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}