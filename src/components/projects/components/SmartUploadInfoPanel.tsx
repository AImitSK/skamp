// src/components/projects/components/SmartUploadInfoPanel.tsx
// Smart Upload Info Panel für Project Folder Views

import React from 'react';
import { 
  InformationCircleIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import type { PipelineStage } from '@/types/project';
import type { FolderRoutingRecommendation } from '../utils/project-folder-context-builder';

// =====================
// INTERFACE DEFINITIONS
// =====================

interface SmartUploadInfoPanelProps {
  isEnabled: boolean;
  currentStage: PipelineStage;
  projectTitle: string;
  customerName?: string;
  currentFolder?: string;
  recommendations?: Record<string, FolderRoutingRecommendation>;
  warnings?: string[];
  pipelineLocked?: boolean;
  onToggleSmartRouting?: () => void;
  className?: string;
}

interface PipelineStageInfo {
  name: string;
  description: string;
  defaultFolder: string;
  color: string;
  icon: string;
  tips: string[];
}

// =====================
// PIPELINE STAGE CONFIGURATION
// =====================

const PIPELINE_STAGE_INFO: Record<PipelineStage, PipelineStageInfo> = {
  'ideas_planning': {
    name: 'Ideen & Planung',
    description: 'Konzeption und erste Materialsammlung',
    defaultFolder: 'Dokumente',
    color: 'blue',
    icon: '💡',
    tips: [
      'Briefings und Konzepte → Dokumente',
      'Referenzmaterial → Medien',
      'Erste Entwürfe → Dokumente'
    ]
  },
  'creation': {
    name: 'Erstellung',
    description: 'Asset-Produktion und Content-Entwicklung',
    defaultFolder: 'Medien',
    color: 'purple',
    icon: '🎨',
    tips: [
      'Bilder und Videos → Medien',
      'Texte und Dokumente → Dokumente',
      'Rohmaterial → Medien'
    ]
  },
  'internal_approval': {
    name: 'Interne Freigabe',
    description: 'Interne Qualitätskontrolle und Freigabe',
    defaultFolder: 'Dokumente',
    color: 'yellow',
    icon: '🔍',
    tips: [
      'Review-Dokumente → Dokumente',
      'Finale Assets → Medien',
      'Feedback-Dateien → Dokumente'
    ]
  },
  'customer_approval': {
    name: 'Kunden-Freigabe',
    description: 'Kundenabstimmung und finale Freigabe',
    defaultFolder: 'Pressemeldungen',
    color: 'orange',
    icon: '✅',
    tips: [
      'Finale Texte → Pressemeldungen',
      'Freigabe-Dokumente → Dokumente',
      'Approved Assets → Medien'
    ]
  },
  'distribution': {
    name: 'Verteilung',
    description: 'Versand und Veröffentlichung',
    defaultFolder: 'Pressemeldungen',
    color: 'green',
    icon: '📤',
    tips: [
      'Versandfertige Inhalte → Pressemeldungen',
      'Distribution-Listen → Dokumente',
      'Finale Assets → Medien'
    ]
  },
  'monitoring': {
    name: 'Monitoring',
    description: 'Erfolgsüberwachung und Berichterstattung',
    defaultFolder: 'Dokumente',
    color: 'gray',
    icon: '📊',
    tips: [
      'Reports und Analytics → Dokumente',
      'Clippings → Medien',
      'Auswertungen → Dokumente'
    ]
  },
  'completed': {
    name: 'Abgeschlossen',
    description: 'Projekt erfolgreich beendet',
    defaultFolder: 'Dokumente',
    color: 'green',
    icon: '🎯',
    tips: [
      'Archivierung → Dokumente',
      'Finale Berichte → Dokumente',
      'Lessons Learned → Dokumente'
    ]
  }
};

// =====================
// MAIN COMPONENT
// =====================

export default function SmartUploadInfoPanel({
  isEnabled,
  currentStage,
  projectTitle,
  customerName,
  currentFolder,
  recommendations,
  warnings = [],
  pipelineLocked = false,
  onToggleSmartRouting,
  className = ''
}: SmartUploadInfoPanelProps) {
  
  const stageInfo = PIPELINE_STAGE_INFO[currentStage];
  const hasRecommendations = recommendations && Object.keys(recommendations).length > 0;
  const highConfidenceCount = hasRecommendations 
    ? Object.values(recommendations).filter(rec => rec.confidence > 80).length 
    : 0;
  
  if (!isEnabled) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <InformationCircleIcon className="w-5 h-5 text-gray-400 mr-2" />
            <Text className="text-sm text-gray-600">
              Standard Upload Modus
            </Text>
          </div>
          {onToggleSmartRouting && (
            <button
              onClick={onToggleSmartRouting}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Smart Router aktivieren
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
          <div>
            <Text className="text-sm font-medium text-gray-900">
              Smart Upload Router aktiv
            </Text>
            <Text className="text-xs text-gray-600">
              Intelligente Ordner-Erkennung basierend auf Pipeline-Phase
            </Text>
          </div>
        </div>
        {onToggleSmartRouting && (
          <button
            onClick={onToggleSmartRouting}
            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Aktiv
          </button>
        )}
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-md p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-900">
            {projectTitle}
          </Text>
          {customerName && (
            <Badge color="blue" className="text-xs">
              {customerName}
            </Badge>
          )}
        </div>
        
        {/* Pipeline Stage Info */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{stageInfo.icon}</span>
            <div>
              <Text className="text-sm font-medium text-gray-700">
                {stageInfo.name}
              </Text>
              <Text className="text-xs text-gray-500">
                {stageInfo.description}
              </Text>
            </div>
          </div>
          
          <div className="flex-1 flex justify-end">
            <div className="text-right">
              <Text className="text-xs text-gray-500">Standard-Ordner</Text>
              <div className="flex items-center space-x-1">
                <FolderIcon className="w-4 h-4 text-blue-500" />
                <Text className="text-xs font-medium text-blue-700">
                  {stageInfo.defaultFolder}
                </Text>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Context */}
      {currentFolder && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
          <div className="flex items-center">
            <FolderIcon className="w-4 h-4 text-blue-500 mr-2" />
            <Text className="text-sm text-blue-700">
              Aktueller Ordner: <span className="font-medium">{currentFolder}</span>
            </Text>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <Text className="text-sm font-medium text-yellow-800 mb-1">
                Hinweise für diese Pipeline-Phase:
              </Text>
              <ul className="text-xs text-yellow-700 space-y-1">
                {warnings.slice(0, 2).map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Lock Warning */}
      {pipelineLocked && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mr-2" />
            <Text className="text-sm text-red-700">
              Pipeline ist gesperrt - Uploads mit Vorsicht durchführen
            </Text>
          </div>
        </div>
      )}

      {/* Smart Recommendations Summary */}
      {hasRecommendations && (
        <div className="bg-purple-50 border border-purple-200 rounded-md p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <LightBulbIcon className="w-4 h-4 text-purple-500 mr-2" />
              <Text className="text-sm font-medium text-purple-700">
                Smart Empfehlungen verfügbar
              </Text>
            </div>
            <Badge color="purple" className="text-xs">
              {highConfidenceCount} von {Object.keys(recommendations).length}
            </Badge>
          </div>
          <Text className="text-xs text-purple-600 mt-1">
            {highConfidenceCount > 0 
              ? `${highConfidenceCount} Dateien mit hoher Konfidenz zugeordnet`
              : 'Empfehlungen mit niedriger Konfidenz - Manuelle Prüfung empfohlen'
            }
          </Text>
        </div>
      )}

      {/* Smart Routing Tips */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
        <div className="flex items-start">
          <LightBulbIcon className="w-4 h-4 text-indigo-500 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <Text className="text-sm font-medium text-indigo-800 mb-2">
              Routing-Tipps für {stageInfo.name}:
            </Text>
            <ul className="text-xs text-indigo-700 space-y-1">
              {stageInfo.tips.map((tip, index) => (
                <li key={index}>• {tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================
// UTILITY COMPONENTS
// =====================

/**
 * Kompakte Version des Info Panels für kleinere Bereiche
 */
export function SmartUploadInfoBadge({
  isEnabled,
  currentStage,
  highConfidenceCount = 0,
  totalFiles = 0,
  className = ''
}: {
  isEnabled: boolean;
  currentStage: PipelineStage;
  highConfidenceCount?: number;
  totalFiles?: number;
  className?: string;
}) {
  if (!isEnabled) {
    return (
      <Badge color="gray" className={className}>
        Standard Upload
      </Badge>
    );
  }

  const stageInfo = PIPELINE_STAGE_INFO[currentStage];
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge color="green" className="flex items-center space-x-1">
        <span>{stageInfo.icon}</span>
        <span>Smart Router</span>
      </Badge>
      
      {totalFiles > 0 && (
        <Badge color="purple" className="text-xs">
          {highConfidenceCount}/{totalFiles} empfohlen
        </Badge>
      )}
    </div>
  );
}

/**
 * Drag & Drop Status Indicator
 */
export function DragDropStatusIndicator({
  isDragging,
  targetFolder,
  smartRoutingEnabled,
  className = ''
}: {
  isDragging: boolean;
  targetFolder?: string;
  smartRoutingEnabled: boolean;
  className?: string;
}) {
  if (!isDragging) return null;

  return (
    <div className={`bg-blue-100 border border-blue-300 rounded-lg p-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="animate-bounce">📁</div>
        <div>
          <Text className="text-sm font-medium text-blue-800">
            {smartRoutingEnabled ? 'Smart Drop erkannt' : 'Drop Zone aktiv'}
          </Text>
          {targetFolder && (
            <Text className="text-xs text-blue-600">
              Zielordner: {targetFolder}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}