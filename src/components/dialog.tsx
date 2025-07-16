// src/components/dialog.tsx
"use client";

import { Dialog as HeadlessDialog, DialogPanel, DialogTitle as HeadlessDialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import React, { Fragment, ReactNode } from 'react';

// Props für die Dialog-Komponente definieren
interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode; // Hier stellen wir sicher, dass 'children' erwartet wird
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  className?: string;
}

export function Dialog({ open, onClose, children, size = 'lg', className }: DialogProps) {
  const sizeClasses = {
    xs: 'max-w-xs', sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg',
    xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', '4xl': 'max-w-4xl', '5xl': 'max-w-5xl'
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
        {/* Der Overlay-Hintergrund */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </TransitionChild>

        <div className="fixed inset-0 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className={clsx("w-full transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all", sizeClasses[size], className)}>
                {children}
                {/* Optionaler Schließen-Button oben rechts */}
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button type="button" className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" onClick={onClose}>
                    <span className="sr-only">Schließen</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
}

// Kleinere Komponenten für den Dialog-Aufbau
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof HeadlessDialogTitle>) {
    return <HeadlessDialogTitle className={clsx("text-lg font-medium leading-6 text-gray-900", className)} {...props} />;
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={clsx("text-sm text-gray-500", className)} {...props} />;
}

export function DialogActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={clsx("flex justify-end gap-4 bg-gray-50", className)} {...props} />;
}