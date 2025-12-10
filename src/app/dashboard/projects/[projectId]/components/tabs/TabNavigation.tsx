'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  FolderOpenIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

/**
 * Tab Type
 */
type TabType = 'overview' | 'tasks' | 'strategie' | 'daten' | 'verteiler' | 'pressemeldung' | 'monitoring';

/**
 * Tab Definition
 */
interface Tab {
  id: TabType;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'overview', labelKey: 'overview', icon: DocumentTextIcon },
  { id: 'tasks', labelKey: 'tasks', icon: ClipboardDocumentListIcon },
  { id: 'strategie', labelKey: 'strategy', icon: DocumentTextIcon },
  { id: 'daten', labelKey: 'data', icon: FolderOpenIcon },
  { id: 'verteiler', labelKey: 'distributionLists', icon: UsersIcon },
  { id: 'pressemeldung', labelKey: 'pressRelease', icon: DocumentTextIcon },
  { id: 'monitoring', labelKey: 'monitoring', icon: ChartBarIcon },
];

/**
 * TabNavigation Props
 */
interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

/**
 * TabNavigation Component
 *
 * Zeigt 7 Tab-Buttons mit Icons und Active-State Highlighting
 */
export const TabNavigation = React.memo(function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const t = useTranslations('projects.detail.tabs');

  return (
    <div className="border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center pb-2 text-sm font-medium ${
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
