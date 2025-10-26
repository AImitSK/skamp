// src/components/projects/distribution/components/EmptyListState.tsx
'use client';

import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';

interface EmptyListStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyListState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyListStateProps) {
  return (
    <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <Heading level={3} className="mt-2">
        {title}
      </Heading>
      <Text className="mt-1 text-gray-500">{description}</Text>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-4 bg-[#005fab] hover:bg-[#004a8c] text-white"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
