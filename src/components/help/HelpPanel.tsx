'use client'

import { Fragment } from 'react'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react'
import { XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useHelp } from './HelpContext'
import { HelpPanelContent } from './HelpPanelContent'
import { useTranslations } from 'next-intl'

export function HelpPanel() {
  const { isOpen, close } = useHelp()
  const t = useTranslations('help')

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/25 dark:bg-black/40 transition-opacity" />
        </TransitionChild>

        {/* Panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-zinc-700">
                      <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <QuestionMarkCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        {t('panel.title')}
                      </DialogTitle>
                      <button
                        onClick={close}
                        className="rounded-md p-1 text-gray-400 hover:text-gray-500 dark:text-zinc-400 dark:hover:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <span className="sr-only">{t('panel.close')}</span>
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                      <HelpPanelContent />
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
