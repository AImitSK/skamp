'use client'

import { useHelp } from './HelpContext'
import { HelpFAQ } from './HelpFAQ'
import { HelpTips } from './HelpTips'
import { HelpVideo } from './HelpVideo'
import { HelpSupport } from './HelpSupport'
import { useTranslations } from 'next-intl'

export function HelpPanelContent() {
  const { content, loading } = useHelp()
  const t = useTranslations('help')

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
      </div>
    )
  }

  if (!content) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-zinc-400 text-center mb-6">
          {t('panel.noContent')}
        </p>
        <HelpSupport />
      </div>
    )
  }

  // Sammle alle Tipps: Quick-Tipps + Artikel-Tipps
  const allTips = [
    ...(content.quickTips || []),
    ...(content.mainArticle?.tips || []),
  ]

  return (
    <div className="divide-y divide-gray-200 dark:divide-zinc-700">
      {/* FAQ Section */}
      {content.mainArticle && <HelpFAQ article={content.mainArticle} />}

      {/* Tips Section */}
      {allTips.length > 0 && <HelpTips tips={allTips} />}

      {/* Video Section */}
      {content.featureVideo && <HelpVideo video={content.featureVideo} />}

      {/* Support Section */}
      <HelpSupport />
    </div>
  )
}
