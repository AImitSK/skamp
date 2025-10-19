'use client';

import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Text } from '@/components/ui/text';
import type { AlertProps } from '../types';

/**
 * Alert Component
 *
 * Wiederverwendbare Alert-Komponente für Feedback
 * Optimiert mit React.memo
 */
const Alert = React.memo(function Alert({
  type = 'info',
  message
}: AlertProps) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700',
    success: 'bg-green-50 text-green-700'
  };

  const iconColor = type === 'error' ? 'text-red-400' :
                   type === 'success' ? 'text-green-400' : 'text-blue-400';

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <InformationCircleIcon aria-hidden="true" className={`size-5 ${iconColor}`} />
        </div>
        <div className="ml-3">
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
});

export default Alert;
