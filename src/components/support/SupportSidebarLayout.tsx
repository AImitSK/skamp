'use client'

import * as Headless from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import React, { useState } from 'react'

function MobileSidebar({
  open,
  close,
  children,
}: React.PropsWithChildren<{ open: boolean; close: () => void }>) {
  return (
    <Headless.Dialog open={open} onClose={close} className="relative z-50 lg:hidden">
      <Headless.DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 transition data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />
      <Headless.DialogPanel
        transition
        className="fixed inset-y-0 left-0 w-full max-w-xs p-2 transition duration-300 ease-in-out data-closed:-translate-x-full"
      >
        <div className="flex h-full flex-col rounded-lg bg-white shadow-xl ring-1 ring-gray-200 dark:bg-zinc-900 dark:ring-zinc-700">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-700 px-4 py-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Kategorien</span>
            <Headless.CloseButton
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
              aria-label="Close navigation"
            >
              <XMarkIcon className="h-5 w-5" />
            </Headless.CloseButton>
          </div>
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>
      </Headless.DialogPanel>
    </Headless.Dialog>
  )
}

export function SupportSidebarLayout({
  sidebar,
  children,
}: React.PropsWithChildren<{ sidebar: React.ReactNode }>) {
  const [showSidebar, setShowSidebar] = useState(false)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex gap-8 py-8">
        {/* Mobile menu button */}
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-primary-700 transition-colors"
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-5 w-5" />
            <span>Menü</span>
          </button>
        </div>

        {/* Mobile sidebar */}
        <MobileSidebar open={showSidebar} close={() => setShowSidebar(false)}>
          {sidebar}
        </MobileSidebar>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24">{sidebar}</div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
