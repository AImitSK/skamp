'use client'

import { LightBulbIcon } from '@heroicons/react/24/outline'
import { useTranslations } from 'next-intl'

interface HelpTipsProps {
  tips: { text: string }[]
}

export function HelpTips({ tips }: HelpTipsProps) {
  const t = useTranslations('help')

  return (
    <div className="p-4">
      <h3 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white mb-3">
        <LightBulbIcon className="h-5 w-5 text-yellow-500" />
        {t('sections.tips')}
      </h3>
      <ul className="space-y-2">
        {tips.map((tip, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-400"
          >
            <span className="text-primary-500 mt-1">•</span>
            <span>{tip.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
