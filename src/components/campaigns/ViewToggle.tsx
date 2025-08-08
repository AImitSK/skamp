// src/components/campaigns/ViewToggle.tsx
"use client";

import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/20/solid";
import clsx from 'clsx';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className = "" }: ViewToggleProps) {
  return (
    <div className={clsx(
      'inline-flex rounded-lg border border-zinc-300 dark:border-zinc-600', 
      className
    )}>
      <button
        onClick={() => onChange('list')}
        className={clsx(
          'flex items-center justify-center p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-l-lg',
          value === 'list'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="Listen-Ansicht"
        title="Listen-Ansicht"
      >
        <ListBulletIcon className="h-5 w-5" />
      </button>
      
      <button
        onClick={() => onChange('grid')}
        className={clsx(
          'flex items-center justify-center p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-r-lg border-l border-zinc-300 dark:border-zinc-600',
          value === 'grid'
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white'
            : 'bg-white text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
        )}
        aria-label="Kachel-Ansicht"
        title="Kachel-Ansicht"
      >
        <Squares2X2Icon className="h-5 w-5" />
      </button>
    </div>
  );
}