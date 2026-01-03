'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '@/components/ui/dropdown'
import { useSupportPath } from './SupportContext'

export function SupportHeader() {
  const pathname = usePathname()
  const { buildPath, isSubdomain } = useSupportPath()

  // Ermittle aktuelle Sprache aus dem Pfad
  const pathWithoutSupport = pathname.replace('/support', '')
  const currentLocale = pathWithoutSupport.includes('/en') ? 'en' : 'de'

  // Erstelle den Pfad für die andere Sprache
  const switchLocalePath = (newLocale: string) => {
    if (currentLocale === newLocale) return pathname
    // Ersetze nur die Locale im Pfad
    const newPath = pathWithoutSupport.replace(`/${currentLocale}`, `/${newLocale}`)
    return buildPath(newPath)
  }

  // Logo-Link: Auf Subdomain zur Hauptseite, sonst zur Root
  const logoHref = isSubdomain ? 'https://celeropress.com' : '/'

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-gray-200 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <Link href={logoHref} className="flex items-center gap-2">
              <Image
                src="/logo_skamp.svg"
                alt="CeleroPress"
                width={32}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <div className="h-6 w-px bg-gray-300 dark:bg-zinc-700" />
            <Link
              href={buildPath(`/${currentLocale}`)}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
            >
              {currentLocale === 'de' ? 'Hilfe-Center' : 'Help Center'}
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <Dropdown>
              <DropdownButton
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                aria-label="Sprache wechseln"
              >
                <GlobeAltIcon className="h-5 w-5" />
                <span>{currentLocale === 'de' ? 'DE' : 'EN'}</span>
              </DropdownButton>
              <DropdownMenu anchor="bottom end">
                <DropdownItem href={switchLocalePath('de')}>
                  <span className={currentLocale === 'de' ? 'font-semibold' : ''}>
                    Deutsch
                  </span>
                </DropdownItem>
                <DropdownItem href={switchLocalePath('en')}>
                  <span className={currentLocale === 'en' ? 'font-semibold' : ''}>
                    English
                  </span>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* Login Link */}
            <Link
              href={isSubdomain ? 'https://celeropress.com/login' : '/login'}
              className="text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
            >
              {currentLocale === 'de' ? 'Anmelden' : 'Sign in'}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
