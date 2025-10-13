// src/app/dashboard/contacts/crm/components/shared/Alert.tsx
"use client";

import { InformationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Text } from "@/components/ui/text";

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void
  };
}

/**
 * Alert Component
 *
 * Zeigt farbcodierte Benachrichtigungen mit optionaler Aktion an.
 *
 * @component
 * @example
 * ```tsx
 * <Alert
 *   type="success"
 *   title="Erfolgreich gespeichert"
 *   message="Die Änderungen wurden übernommen."
 * />
 * ```
 */
export function Alert({
  type = 'info',
  title,
  message,
  action
}: AlertProps) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700'
  };

  const icons = {
    info: InformationCircleIcon,
    success: InformationCircleIcon,
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon
            aria-hidden="true"
            className={`size-5 ${
              type === 'info' || type === 'success'
                ? 'text-blue-400'
                : type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }`}
          />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <div>
            <Text className={`font-medium ${styles[type].split(' ')[1]}`}>
              {title}
            </Text>
            {message && (
              <Text className={`mt-2 ${styles[type].split(' ')[1]}`}>
                {message}
              </Text>
            )}
          </div>
          {action && (
            <p className="mt-3 text-sm md:mt-0 md:ml-6">
              <button
                onClick={action.onClick}
                className={`font-medium whitespace-nowrap ${styles[type].split(' ')[1]} hover:opacity-80`}
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
