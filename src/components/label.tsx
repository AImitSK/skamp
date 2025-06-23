// src/components/label.tsx
"use client";

import { clsx } from 'clsx';
import React from 'react';

// Eine einfache, eigenständige Label-Komponente, die keine Abhängigkeiten
// von Headless UI oder einem Eltern-Kontext hat.
export function Label({ className, ...props }: React.ComponentPropsWithoutRef<'label'>) {
  return (
    <label
      {...props}
      className={clsx(
        className,
        // Basis-Styling für das Label
        'block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-200'
      )}
    />
  );
}
