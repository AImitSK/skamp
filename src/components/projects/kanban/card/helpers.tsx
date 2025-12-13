// src/components/projects/kanban/card/helpers.tsx
'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ProjectPriority } from '@/types/project';
import { useTranslations } from 'next-intl';

export const getPriorityColor = (priority?: ProjectPriority): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getPriorityIcon = (priority?: ProjectPriority) => {
  if (priority === 'urgent' || priority === 'high') {
    return <ExclamationTriangleIcon className="h-3 w-3" />;
  }
  return null;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

export const usePriorityLabel = () => {
  const t = useTranslations('projects.kanban.card');

  return (priority?: ProjectPriority): string => {
    switch (priority) {
      case 'urgent':
        return t('priority.urgent');
      case 'high':
        return t('priority.high');
      case 'medium':
        return t('priority.medium');
      case 'low':
        return t('priority.low');
      default:
        return t('priority.none');
    }
  };
};

export const useStatusLabel = () => {
  const t = useTranslations('projects.kanban.card');

  return (status: string): string => {
    switch (status) {
      case 'active':
        return t('status.active');
      case 'on_hold':
        return t('status.onHold');
      case 'completed':
        return t('status.completed');
      case 'cancelled':
        return t('status.cancelled');
      default:
        return status;
    }
  };
};
