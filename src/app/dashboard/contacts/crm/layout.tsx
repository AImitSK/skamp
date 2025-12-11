// src/app/dashboard/contacts/crm/layout.tsx
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BuildingOfficeIcon, UsersIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

/**
 * CRM Layout Component
 *
 * Provides consistent layout with tab navigation for CRM module.
 * Supports route-based navigation instead of client-side tabs.
 *
 * @component
 */
export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('crm.layout');

  const tabs = [
    {
      name: t('tabs.companies.name'),
      href: '/dashboard/contacts/crm/companies',
      icon: BuildingOfficeIcon,
      description: t('tabs.companies.description')
    },
    {
      name: t('tabs.contacts.name'),
      href: '/dashboard/contacts/crm/contacts',
      icon: UsersIcon,
      description: t('tabs.contacts.description')
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-zinc-950 dark:text-white">{t('title')}</h1>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-0 border-zinc-200 dark:border-zinc-700">
          <nav aria-label={t('navigation')} className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={clsx(
                    'group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                  )}
                >
                  <Icon
                    className={clsx(
                      'mr-2 -ml-0.5 size-5',
                      isActive
                        ? 'text-primary'
                        : 'text-zinc-400 group-hover:text-zinc-500 dark:text-zinc-500 dark:group-hover:text-zinc-400'
                    )}
                  />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
