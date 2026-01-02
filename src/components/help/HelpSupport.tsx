'use client'

import { EnvelopeIcon, LifebuoyIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

export function HelpSupport() {
  const t = useTranslations('help')

  return (
    <div className="p-4 bg-gray-50 dark:bg-zinc-800/50">
      <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-2">
        <LifebuoyIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        {t('support.title')}
      </h3>
      <p className="text-sm text-gray-600 dark:text-zinc-400 mb-4">
        {t('support.description')}
      </p>
      <a
        href="mailto:support@celeropress.com?subject=Hilfe%20ben%C3%B6tigt"
        className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm font-medium
                   text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-700
                   border border-gray-300 dark:border-zinc-600 rounded-lg
                   hover:bg-gray-50 dark:hover:bg-zinc-600 transition-colors
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        <EnvelopeIcon className="h-4 w-4" />
        {t('support.contactButton')}
      </a>
    </div>
  )
}
