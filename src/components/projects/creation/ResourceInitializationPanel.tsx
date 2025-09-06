'use client';

import React from 'react';
import { 
  SpeakerWaveIcon,
  PhotoIcon,
  EnvelopeIcon,
  PlayIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { ProjectCreationWizardData } from '@/types/project';

interface DistributionList {
  id: string;
  name: string;
  contactCount: number;
}

interface ResourceInitializationPanelProps {
  wizardData: ProjectCreationWizardData;
  onUpdate: (updates: Partial<ProjectCreationWizardData>) => void;
  distributionLists: DistributionList[];
}

export function ResourceInitializationPanel({ 
  wizardData, 
  onUpdate, 
  distributionLists 
}: ResourceInitializationPanelProps) {

  // Mock Asset-Daten - in der Praxis würde das von einem Service kommen
  const mockAssets = [
    { id: 'asset1', name: 'Firmenlogo.png', type: 'image', size: '45 KB' },
    { id: 'asset2', name: 'Produktbild_01.jpg', type: 'image', size: '234 KB' },
    { id: 'asset3', name: 'Pressefoto_CEO.jpg', type: 'image', size: '567 KB' },
    { id: 'asset4', name: 'Infografik_Q2.pdf', type: 'document', size: '1.2 MB' },
    { id: 'asset5', name: 'Pressemitteilung_Template.docx', type: 'document', size: '89 KB' }
  ];

  const handleCampaignToggle = (enabled: boolean) => {
    onUpdate({ 
      createCampaignImmediately: enabled,
      campaignTitle: enabled ? (wizardData.campaignTitle || `${wizardData.title} - Kampagne`) : ''
    });
  };

  const handleAssetToggle = (assetId: string) => {
    const currentAssets = wizardData.initialAssets || [];
    const newAssets = currentAssets.includes(assetId)
      ? currentAssets.filter(id => id !== assetId)
      : [...currentAssets, assetId];
    
    onUpdate({ initialAssets: newAssets });
  };

  const handleDistributionListToggle = (listId: string) => {
    const currentLists = wizardData.distributionLists || [];
    const newLists = currentLists.includes(listId)
      ? currentLists.filter(id => id !== listId)
      : [...currentLists, listId];
    
    onUpdate({ distributionLists: newLists });
  };

  return (
    <div className="space-y-6">
      {/* Ressourcen-Übersicht Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Projekt-Ressourcen initialisieren
        </h3>
        <p className="text-sm text-gray-600">
          Konfigurieren Sie, welche Ressourcen automatisch für Ihr neues Projekt erstellt werden sollen.
        </p>
      </div>

      {/* Kampagnen-Erstellung */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <SpeakerWaveIcon className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-gray-900">
                PR-Kampagne erstellen
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={wizardData.createCampaignImmediately}
                  onChange={(e) => handleCampaignToggle(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  wizardData.createCampaignImmediately ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    wizardData.createCampaignImmediately ? 'translate-x-5' : 'translate-x-0.5'
                  } mt-0.5`} />
                </div>
              </label>
            </div>
            
            <p className="text-sm text-gray-600 mt-1 mb-3">
              Erstellt automatisch eine verknüpfte PR-Kampagne für dieses Projekt.
            </p>

            {/* Kampagnen-Titel Input */}
            {wizardData.createCampaignImmediately && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kampagnen-Titel
                </label>
                <input
                  type="text"
                  value={wizardData.campaignTitle || ''}
                  onChange={(e) => onUpdate({ campaignTitle: e.target.value })}
                  placeholder={`${wizardData.title} - Kampagne`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Asset-Auswahl */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <PhotoIcon className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900">
              Medien-Assets anhängen
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Wählen Sie vorhandene Assets aus, die dem Projekt zugeordnet werden sollen.
            </p>
          </div>
        </div>

        {/* Asset-Liste */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {mockAssets.map(asset => {
            const isSelected = wizardData.initialAssets.includes(asset.id);
            
            return (
              <div
                key={asset.id}
                className={`flex items-center p-2 rounded border cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => handleAssetToggle(asset.id)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleAssetToggle(asset.id)}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      {asset.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        asset.type === 'image' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {asset.type === 'image' ? 'Bild' : 'Dokument'}
                      </span>
                      <span className="text-xs text-gray-500">{asset.size}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {wizardData.initialAssets.length > 0 && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            {wizardData.initialAssets.length} Asset(s) ausgewählt
          </div>
        )}
      </div>

      {/* Verteilerlisten-Zuordnung */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <EnvelopeIcon className="h-6 w-6 text-purple-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900">
              Verteilerlisten verknüpfen
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Verknüpfen Sie bestehende Verteilerlisten für die spätere Medienverteilung.
            </p>
          </div>
        </div>

        {/* Verteilerlisten */}
        <div className="space-y-2">
          {distributionLists.length === 0 ? (
            <div className="text-center py-4 text-sm text-gray-500">
              Keine Verteilerlisten verfügbar
            </div>
          ) : (
            distributionLists.map(list => {
              const isSelected = wizardData.distributionLists.includes(list.id);
              
              return (
                <div
                  key={list.id}
                  className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleDistributionListToggle(list.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleDistributionListToggle(list.id)}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {list.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {list.contactCount} Kontakte
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {wizardData.distributionLists.length > 0 && (
          <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
            {wizardData.distributionLists.length} Liste(n) ausgewählt
          </div>
        )}
      </div>

      {/* Resource-Preview-Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <PlayIcon className="h-6 w-6 text-indigo-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900 mb-3">
              Zusammenfassung der Initialisierung
            </h4>
            
            <div className="space-y-2 text-sm">
              {/* Kampagne */}
              <div className="flex items-center space-x-2">
                {wizardData.createCampaignImmediately ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded border-2 border-gray-300" />
                )}
                <span className={wizardData.createCampaignImmediately ? 'text-gray-900' : 'text-gray-500'}>
                  {wizardData.createCampaignImmediately 
                    ? `Kampagne "${wizardData.campaignTitle || 'Unbenannt'}" wird erstellt`
                    : 'Keine automatische Kampagnen-Erstellung'
                  }
                </span>
              </div>

              {/* Assets */}
              <div className="flex items-center space-x-2">
                {wizardData.initialAssets.length > 0 ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded border-2 border-gray-300" />
                )}
                <span className={wizardData.initialAssets.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                  {wizardData.initialAssets.length > 0 
                    ? `${wizardData.initialAssets.length} Asset(s) werden angehängt`
                    : 'Keine Assets werden angehängt'
                  }
                </span>
              </div>

              {/* Verteilerlisten */}
              <div className="flex items-center space-x-2">
                {wizardData.distributionLists.length > 0 ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="h-4 w-4 rounded border-2 border-gray-300" />
                )}
                <span className={wizardData.distributionLists.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                  {wizardData.distributionLists.length > 0 
                    ? `${wizardData.distributionLists.length} Verteilerliste(n) verknüpft`
                    : 'Keine Verteilerlisten verknüpft'
                  }
                </span>
              </div>

              {/* Team-Benachrichtigung */}
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-gray-900">
                  Team-Mitglieder werden benachrichtigt ({wizardData.assignedTeamMembers.length} Personen)
                </span>
              </div>
            </div>

            {/* Hinweis */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Hinweis:</p>
              <p>
                Alle Ressourcen können nach der Projekt-Erstellung jederzeit nachträglich 
                angepasst oder hinzugefügt werden.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}