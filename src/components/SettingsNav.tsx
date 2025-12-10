"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { useAutoGlobal } from '@/lib/hooks/useAutoGlobal';

// Die Navigationspunkte für die Einstellungen (ohne Icons)
// nameKey verweist auf den Übersetzungsschlüssel
const settingsItems = [
  {
    nameKey: "notifications",
    href: "/dashboard/settings/notifications",
  },
  {
    nameKey: "branding",
    href: "/dashboard/settings/branding",
  },
  {
    nameKey: "language",
    href: "/dashboard/settings/language",
  },
  {
    nameKey: "team",
    href: "/dashboard/settings/team",
  },
  {
    nameKey: "domains",
    href: "/dashboard/settings/domain",
  },
  {
    nameKey: "email",
    href: "/dashboard/settings/email",
  },
  {
    nameKey: "monitoringAve",
    href: "/dashboard/settings/monitoring",
  },
  {
    nameKey: "importExport",
    href: "/dashboard/settings/import-export",
  },
  {
    nameKey: "pdfTemplates",
    href: "/dashboard/settings/templates",
    badgeKey: "premium",
    superAdminOnly: true,
  },
  {
    nameKey: "spamBlocklist",
    href: "/dashboard/settings/spam-blocklist",
  },
];

// Hilfsfunktion zum Verketten von CSS-Klassen
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function SettingsNav() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAutoGlobal();
  const t = useTranslations('settings.navigation');

  return (
    <nav aria-label={t('ariaLabel')} className="flex flex-col">
      <ul role="list" className="-mx-2 space-y-1">
        {settingsItems.map((item) => {
          const isRestricted = item.superAdminOnly && !isSuperAdmin;
          const itemName = t(item.nameKey);

          if (isRestricted) {
            return (
              <li key={item.nameKey}>
                <div
                  className="flex items-center justify-between rounded-md p-2 text-sm/6 font-semibold text-gray-400 cursor-not-allowed opacity-50"
                >
                  <span>{itemName}</span>
                  {item.badgeKey && (
                    <Badge color="pink">{t(`badges.${item.badgeKey}`)}</Badge>
                  )}
                </div>
              </li>
            );
          }

          return (
            <li key={item.nameKey}>
              <Link
                href={item.href}
                className={classNames(
                  pathname === item.href
                    ? 'bg-white text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                  'flex items-center justify-between rounded-md p-2 text-sm/6 font-semibold'
                )}
              >
                <span>{itemName}</span>
                {item.badgeKey && (
                  <Badge color="pink">{t(`badges.${item.badgeKey}`)}</Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}