// src/app/dashboard/contacts/crm/components/shared/EmptyState.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Empty State Component
 *
 * Zeigt einen leeren Zustand mit Icon, Text und optionaler Aktion an.
 *
 * @component
 * @example
 * ```tsx
 * <EmptyState
 *   icon={BuildingOfficeIcon}
 *   title="Keine Firmen vorhanden"
 *   description="Erstellen Sie Ihre erste Firma."
 *   action={{
 *     label: "Firma erstellen",
 *     onClick: () => setShowModal(true)
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-zinc-400" />
      <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white">
        {title}
      </h3>
      {description && (
        <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </Text>
      )}
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
