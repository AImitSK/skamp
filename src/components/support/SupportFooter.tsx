'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSupportPath } from './SupportContext'

export function SupportFooter() {
  const currentYear = new Date().getFullYear()
  const { isSubdomain } = useSupportPath()

  // Auf Subdomain absolute URLs zur Hauptdomain verwenden
  const homeHref = isSubdomain ? 'https://celeropress.com' : '/'
  const pricingHref = isSubdomain ? 'https://celeropress.com/pricing' : '/pricing'

  return (
    <footer className="bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo_skamp.svg"
              alt="CeleroPress"
              width={28}
              height={28}
              className="h-7 w-auto"
            />
            <span className="text-sm text-gray-500 dark:text-zinc-400">
              © {currentYear} CeleroPress
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-zinc-400">
            <Link
              href={homeHref}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Startseite
            </Link>
            <Link
              href={pricingHref}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Preise
            </Link>
            <a
              href="mailto:support@celeropress.com"
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Kontakt
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
