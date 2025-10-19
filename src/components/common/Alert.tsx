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
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
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
  onDismiss,
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
            {title && (
              <Text className={`font-medium ${styles.title}`}>
                {title}
              </Text>
            )}
            <Text className={`${title ? 'mt-2' : ''} text-sm ${styles.message}`}>
              {message}
            </Text>
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
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              className={`inline-flex rounded-md p-1.5 ${styles.title} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2`}
              onClick={onDismiss}
            >
              <span className="sr-only">Schließen</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}