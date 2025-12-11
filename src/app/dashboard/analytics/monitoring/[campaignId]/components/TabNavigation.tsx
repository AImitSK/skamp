'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
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

export const TabNavigation = memo(function TabNavigation({ activeTab, onChange }: Props) {
  const { clippings, suggestions } = useMonitoring();
  const t = useTranslations('monitoring.tabs');

  const tabs: Tab[] = [
    { id: 'dashboard', label: t('analytics'), icon: ChartBarIcon },
    { id: 'performance', label: t('emailPerformance'), icon: ChartBarIcon },
    { id: 'recipients', label: t('recipientsAndPublications'), icon: DocumentTextIcon },
    { id: 'clippings', label: t('clippingArchive'), icon: NewspaperIcon, count: clippings.length },
    {
      id: 'suggestions',
      label: t('autoFinds'),
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
});
