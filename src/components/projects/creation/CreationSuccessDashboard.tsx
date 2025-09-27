'use client';

import React from 'react';
import { 
  CheckCircleIcon,
  RocketLaunchIcon,
  SpeakerWaveIcon,
  PhotoIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { ProjectCreationResult } from '@/types/project';

interface CreationSuccessDashboardProps {
  result: ProjectCreationResult;
  onClose: () => void;
  onGoToProject: (projectId: string) => void;
}

export function CreationSuccessDashboard({ 
  result, 
  onClose, 
  onGoToProject 
}: CreationSuccessDashboardProps) {

  const handleGoToProject = () => {
    onGoToProject(result.projectId);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Animation Header */}
      <div className="text-center py-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
        <div className="relative inline-flex items-center justify-center">
          {/* Animated Success Icon */}
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
            <CheckCircleIcon className="w-12 h-12 text-white" />
          </div>
          
          {/* Sparkles Animation */}
          <SparklesIcon className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
          <SparklesIcon className="w-4 h-4 text-blue-400 absolute -bottom-1 -left-2 animate-ping" />
        </div>
        
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Projekt erfolgreich erstellt! 🎉
        </h2>
        <p className="mt-2 text-gray-600">
          Ihr Projekt &quot;{result.project.title}&quot; ist bereit und alle Ressourcen wurden initialisiert.
        </p>
      </div>

      {/* Created Resources Summary */}
      <div className="p-6 bg-white border-l border-r border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ClipboardDocumentListIcon className="w-5 h-5 mr-2 text-blue-500" />
          Erstellte Ressourcen
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Projekt */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <RocketLaunchIcon className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Projekt erstellt</h4>
                <p className="text-sm text-green-700">{result.project.title}</p>
                <p className="text-xs text-green-600 mt-1">
                  Status: {result.project.status} | Phase: {result.project.currentStage}
                </p>
              </div>
            </div>
          </div>

          {/* Kampagne */}
          {result.campaignId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <SpeakerWaveIcon className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">PR-Kampagne erstellt</h4>
                  <p className="text-sm text-blue-700">
                    {result.campaign?.title || 'Kampagne erfolgreich verknüpft'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Automatisch mit Projekt verknüpft
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tasks */}
          {result.tasksCreated.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600" />
                <div>
                  <h4 className="font-medium text-purple-900">Tasks erstellt</h4>
                  <p className="text-sm text-purple-700">
                    {result.tasksCreated.length} Aufgaben aus Template
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Bereit zur Bearbeitung
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Assets */}
          {result.assetsAttached > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <PhotoIcon className="w-6 h-6 text-orange-600" />
                <div>
                  <h4 className="font-medium text-orange-900">Assets angehängt</h4>
                  <p className="text-sm text-orange-700">
                    {result.assetsAttached} Medien-Asset(s)
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Verfügbar im Projekt
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Team-Notification Status */}
        {result.project.assignedTo && result.project.assignedTo.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-3">
              <UserGroupIcon className="w-6 h-6 text-indigo-600" />
              <div>
                <h4 className="font-medium text-indigo-900">Team benachrichtigt</h4>
                <p className="text-sm text-indigo-700">
                  {result.project.assignedTo.length} Team-Mitglieder wurden über das neue Projekt informiert
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ Hinweise:</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              {result.warnings.map((warning, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Info Messages */}
        {result.infos.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Informationen:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {result.infos.map((info, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  {info}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next Steps Checklist */}
      <div className="p-6 bg-white border-l border-r border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Nächste Schritte
        </h3>

        <div className="space-y-3">
          {result.nextSteps.map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-100 border-2 border-gray-300 rounded flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">{index + 1}</span>
              </div>
              <span className="text-sm text-gray-700">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 bg-gray-50 rounded-b-lg border border-gray-200">
        <div className="text-center">
          {/* Go to Project - Einziger Button */}
          <button
            onClick={handleGoToProject}
            className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
          >
            <RocketLaunchIcon className="w-5 h-5 mr-2" />
            Zum Projekt
            <ArrowTopRightOnSquareIcon className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}