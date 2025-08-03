// src/components/radio.tsx
"use client";

import { Radio as HeadlessRadio, RadioGroup as HeadlessRadioGroup, RadioGroupProps, RadioProps } from '@headlessui/react';
import { Label, Description } from '@/components/ui/fieldset';
import clsx from 'clsx';
import React from 'react';

// Der Radio-Button selbst
export function Radio({ value, className, ...props }: RadioProps<'input'>) {
  return (
    <HeadlessRadio
      {...props}
      value={value}
      className={clsx(
        className,
        // Basic layout
        'group relative flex cursor-pointer rounded-lg bg-white p-4 text-zinc-900 shadow-sm transition',
        // Pseudos
        'focus:outline-none data-[focus]:outline-1 data-[focus]:outline-white data-[focus]:ring-2 data-[focus]:ring-primary'
      )}
    >
      {/* Der eigentliche Radio-Kreis */}
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white transition duration-200 ease-in-out group-data-[checked]:border-[#005fab] group-data-[checked]:bg-[#005fab]">
        <span className="h-1.5 w-1.5 rounded-full bg-white transition duration-200 ease-in-out group-data-[checked]:scale-100 scale-0" />
      </span>
    </HeadlessRadio>
  );
}

// Das Feld, das Radio, Label und Beschreibung umschließt
export const RadioField = React.forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
  ({ className, children }, ref) => {
    return (
      <div ref={ref} className={clsx("flex items-start gap-x-3", className)}>
        {children}
      </div>
    );
  }
);
RadioField.displayName = "RadioField";

// Die Gruppe, die alles zusammenhält
export function RadioGroup({ className, ...props }: RadioGroupProps<'div'>) {
  return <HeadlessRadioGroup className={clsx("space-y-4", className)} {...props} />;
}