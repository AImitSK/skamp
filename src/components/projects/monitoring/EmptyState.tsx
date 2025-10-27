import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * EmptyState Komponente für Monitoring Tab
 *
 * Wiederverwendbare Komponente für leere Listen und fehlende Daten.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="Noch keine Monitoring-Aktivitäten"
 *   description="Versende eine Kampagne oder erfasse eine Veröffentlichung"
 *   icon={ChartBarIcon}
 * />
 * ```
 */
export default function EmptyState({
  title,
  description,
  icon: Icon = ChartBarIcon,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
      <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <Subheading>{title}</Subheading>
      <Text className="text-gray-500">{description}</Text>
    </div>
  );
}
