// src/app/dashboard/contacts/lists/components/shared/EmptyState.tsx

import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<{ className?: string }>;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 border rounded-lg bg-white dark:bg-zinc-800">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mt-2">
        {title}
      </h3>
      <Text className="mt-1">{description}</Text>
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick} color="primary">
            {action.icon && <action.icon />}
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
