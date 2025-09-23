// src/components/projects/strategy/StrategyTemplateGrid.tsx
'use client';

import React from 'react';
import {
  DocumentTextIcon,
  TableCellsIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UsersIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import { STRATEGY_TEMPLATES, type TemplateType } from '@/constants/strategy-templates';

interface TemplateCardProps {
  id: TemplateType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

interface StrategyTemplateGridProps {
  onTemplateSelect: (templateType: TemplateType, content?: string) => void;
}

function TemplateCard({ id, title, description, icon: Icon, onClick }: TemplateCardProps) {
  const isTemplate = id !== 'blank' && id !== 'table';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#005fab] focus:ring-offset-2 ${
        isTemplate ? 'bg-gradient-to-br from-blue-50 to-white' : 'bg-white'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start space-x-4 mb-auto">
          <div className="flex-shrink-0">
            <Icon className="w-8 h-8 text-[#005fab]" />
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              {isTemplate && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  Vorlage
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function StrategyTemplateGrid({ onTemplateSelect }: StrategyTemplateGridProps) {
  const handleTemplateClick = (templateType: TemplateType) => {
    const template = STRATEGY_TEMPLATES[templateType];
    onTemplateSelect(templateType, template.content);
  };

  const templateCards: Array<{
    id: TemplateType;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'blank', icon: DocumentTextIcon },
    { id: 'table', icon: TableCellsIcon },
    { id: 'company-profile', icon: BuildingOfficeIcon },
    { id: 'situation-analysis', icon: ChartBarIcon },
    { id: 'audience-analysis', icon: UsersIcon },
    { id: 'core-messages', icon: SpeakerWaveIcon },
  ];

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Strategiedokument erstellen
        </h2>
        <p className="text-sm text-gray-600">
          Wählen Sie eine Vorlage aus, um schnell mit der Strategieentwicklung zu beginnen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templateCards.map(({ id, icon }) => {
          const template = STRATEGY_TEMPLATES[id];
          return (
            <TemplateCard
              key={id}
              id={id}
              title={template.title}
              description={template.description}
              icon={icon}
              onClick={() => handleTemplateClick(id)}
            />
          );
        })}
      </div>
    </div>
  );
}