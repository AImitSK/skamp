'use client';

import React, { useState } from 'react';
import { 
  DocumentDuplicateIcon, 
  ClockIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  category: string;
}

interface ProjectTemplateSelectorProps {
  templates: TemplateOption[];
  selectedTemplateId?: string;
  onSelect: (templateId?: string) => void;
}

export function ProjectTemplateSelector({ 
  templates, 
  selectedTemplateId, 
  onSelect 
}: ProjectTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Kategorien extrahieren
  const categories = Array.from(new Set(templates.map(t => t.category)));

  // Templates nach Kategorie filtern
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  // Mock-Daten für Template-Details
  const getTemplateDetails = (templateId: string) => {
    const mockDetails = {
      'pr-campaign-standard': {
        estimatedDuration: '21 Tage',
        recommendedTeamSize: 3,
        phases: ['Planung', 'Erstellung', 'Freigabe', 'Verteilung'],
        keyTasks: [
          'Projekt-Briefing erstellen',
          'Strategie-Dokument verfassen',
          'Content erstellen',
          'Interne Review',
          'Kundenfreigabe',
          'Medienverteilung'
        ],
        successRate: 92,
        usageCount: 145
      },
      'product-launch': {
        estimatedDuration: '30 Tage',
        recommendedTeamSize: 4,
        phases: ['Research', 'Positioning', 'Content', 'Launch'],
        keyTasks: [
          'Marktanalyse',
          'Competitive Analysis',
          'Product Messaging',
          'Launch-Materialien',
          'Launch-Event',
          'Performance-Tracking'
        ],
        successRate: 88,
        usageCount: 87
      }
    };

    return mockDetails[templateId as keyof typeof mockDetails] || {
      estimatedDuration: 'Variabel',
      recommendedTeamSize: 2,
      phases: ['Planung', 'Umsetzung'],
      keyTasks: ['Grundlegende Projekt-Tasks'],
      successRate: 75,
      usageCount: 0
    };
  };

  const handleTemplateSelect = (templateId?: string) => {
    onSelect(templateId);
  };

  return (
    <div className="space-y-4">
      {/* Kategorie-Filter */}
      {categories.length > 1 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Kategorie:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 text-sm rounded-full border ${
                selectedCategory === 'all'
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  selectedCategory === category
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'standard' ? 'Standard' : 
                 category === 'custom' ? 'Custom' : 
                 category === 'industry' ? 'Branche' : category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* "Kein Template" Option */}
      <div
        onClick={() => handleTemplateSelect(undefined)}
        className={`p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          !selectedTemplateId
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <DocumentDuplicateIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-gray-900">
              Ohne Template starten
            </h4>
            <p className="text-sm text-gray-500">
              Erstellen Sie ein leeres Projekt ohne vordefinierte Aufgaben
            </p>
          </div>
          {!selectedTemplateId && (
            <div className="ml-auto">
              <CheckCircleIcon className="h-5 w-5 text-blue-600" />
            </div>
          )}
        </div>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTemplates.map(template => {
          const isSelected = selectedTemplateId === template.id;
          const details = getTemplateDetails(template.id);

          return (
            <div key={template.id} className="space-y-2">
              <div
                onClick={() => handleTemplateSelect(template.id)}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-base font-medium text-gray-900">
                        {template.name}
                      </h4>
                      
                      {/* Template Category Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        template.category === 'standard'
                          ? 'bg-green-100 text-green-800'
                          : template.category === 'custom'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {template.category === 'standard' ? 'Standard' : 
                         template.category === 'custom' ? 'Custom' : 'Branche'}
                      </span>

                      {/* Success Rate Stars */}
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600 ml-1">
                          {details.successRate}%
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {template.description}
                    </p>

                    {/* Template Stats */}
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        {template.taskCount} Aufgaben
                      </div>
                      
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {details.estimatedDuration}
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-xs">👥</span>
                        <span className="ml-1">{details.recommendedTeamSize} Team-Mitglieder</span>
                      </div>

                      <div className="text-xs text-gray-400">
                        {details.usageCount}x verwendet
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Details Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(showDetails === template.id ? null : template.id);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Details anzeigen"
                    >
                      <InformationCircleIcon className="h-5 w-5" />
                    </button>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Template Details Modal */}
              {showDetails === template.id && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 ml-4">
                  <div className="space-y-4">
                    {/* Phasen */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">
                        Projekt-Phasen:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {details.phases.map((phase, index) => (
                          <span
                            key={phase}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {index + 1}. {phase}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Key Tasks */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">
                        Wichtige Aufgaben:
                      </h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {details.keyTasks.map(task => (
                          <li key={task} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Template Bewertung */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-600">Erfolgsrate:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {details.successRate}%
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Verwendet:</span>
                          <span className="ml-1 font-medium">
                            {details.usageCount}x
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowDetails(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Schließen
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-6">
          <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Keine Templates verfügbar
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedCategory === 'all' 
              ? 'Derzeit sind keine Templates verfügbar.' 
              : `Keine Templates in der Kategorie "${selectedCategory}" gefunden.`
            }
          </p>
        </div>
      )}
    </div>
  );
}