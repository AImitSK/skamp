'use client';

import { UserIcon } from "@heroicons/react/24/outline";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export default function EmptyState({
  icon: Icon = UserIcon,
  title,
  description
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-zinc-400" />
      <h3 className="mt-2 text-sm font-medium text-zinc-900">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500">
        {description}
      </p>
    </div>
  );
}
