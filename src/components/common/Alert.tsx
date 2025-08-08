// src/components/common/Alert.tsx
"use client";

import { Text } from "@/components/ui/text";
import { 
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from "@heroicons/react/20/solid";

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: { 
    label: string; 
    onClick: () => void; 
  };
  className?: string;
}

const alertStyles = {
  info: {
    container: 'bg-blue-50 border border-blue-200',
    icon: 'text-blue-400',
    title: 'text-blue-700',
    message: 'text-blue-600',
    action: 'text-blue-700 hover:text-blue-800'
  },
  success: {
    container: 'bg-green-50 border border-green-200',
    icon: 'text-green-400',
    title: 'text-green-700',
    message: 'text-green-600',
    action: 'text-green-700 hover:text-green-800'
  },
  warning: {
    container: 'bg-yellow-50 border border-yellow-200',
    icon: 'text-yellow-400',
    title: 'text-yellow-700',
    message: 'text-yellow-600',
    action: 'text-yellow-700 hover:text-yellow-800'
  },
  error: {
    container: 'bg-red-50 border border-red-200',
    icon: 'text-red-400',
    title: 'text-red-700',
    message: 'text-red-600',
    action: 'text-red-700 hover:text-red-800'
  }
};

const icons = {
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon
};

export function Alert({ 
  type = 'info', 
  title, 
  message, 
  action,
  className = ""
}: AlertProps) {
  const styles = alertStyles[type];
  const Icon = icons[type];

  return (
    <div className={`rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon 
            aria-hidden="true" 
            className={`h-5 w-5 ${styles.icon}`} 
          />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles.title}`}>
              {title}
            </Text>
            {message && (
              <Text className={`mt-2 text-sm ${styles.message}`}>
                {message}
              </Text>
            )}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles.action}`}
              >
                {action.label}
                <span aria-hidden="true"> →</span>
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}