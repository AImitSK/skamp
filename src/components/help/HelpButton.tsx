'use client'

import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { useHelp } from './HelpContext'
import { useTranslations } from 'next-intl'
import clsx from 'clsx'

export function HelpButton() {
  const { toggle, isOpen } = useHelp()
  const t = useTranslations('help')

  return (
    <button
      onClick={toggle}
      className={clsx(
        'fixed bottom-6 right-6 z-40 p-3 rounded-full shadow-lg transition-all duration-200',
        'bg-primary-600 text-white hover:bg-primary-700',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'dark:bg-primary-500 dark:hover:bg-primary-600',
        isOpen && 'opacity-0 pointer-events-none scale-90',
      )}
      aria-label={t('panel.open')}
      title={t('panel.shortcut')}
    >
      <QuestionMarkCircleIcon className="h-6 w-6" />
    </button>
  )
}
