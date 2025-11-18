'use client';

import { ChartBarIcon, DocumentTextIcon, NewspaperIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useMonitoring } from '../context/MonitoringContext';

type TabId = 'dashboard' | 'performance' | 'recipients' | 'clippings' | 'suggestions';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface Props {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}

export function TabNavigation({ activeTab, onChange }: Props) {
  const { clippings, suggestions } = useMonitoring();

  const tabs: Tab[] = [
    { id: 'dashboard', label: 'Analytics', icon: ChartBarIcon },
    { id: 'performance', label: 'E-Mail Performance', icon: ChartBarIcon },
    { id: 'recipients', label: 'Empfänger & Veröffentlichungen', icon: DocumentTextIcon },
    { id: 'clippings', label: 'Clipping-Archiv', icon: NewspaperIcon, count: clippings.length },
    {
      id: 'suggestions',
      label: 'Auto-Funde',
      icon: SparklesIcon,
      count: suggestions.filter(s => s.status === 'pending').length
    },
  ];

  return (
    <div className="flex space-x-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex items-center pb-2 text-sm font-medium ${
            activeTab === tab.id
              ? 'text-[#005fab] border-b-2 border-[#005fab]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <tab.icon className="w-4 h-4 mr-2" />
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
}
