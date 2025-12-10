"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import { useAutoGlobal } from "@/lib/hooks/useAutoGlobal";

// Die Navigationspunkte für den Admin-Bereich
const adminItems = [
  {
    nameKey: "profile",
    href: "/dashboard/admin/profile",
  },
  {
    nameKey: "billing",
    href: "/dashboard/admin/billing",
  },
  {
    nameKey: "apiManagement",
    href: "/dashboard/admin/api",
    badge: "PREMIUM",
    superAdminOnly: true,
  },
];

// Hilfsfunktion zum Verketten von CSS-Klassen
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function AdminNav() {
  const pathname = usePathname();
  const { isSuperAdmin } = useAutoGlobal();
  const t = useTranslations('admin.navigation');

  return (
    <nav aria-label={t('ariaLabel')} className="flex flex-col">
      <ul role="list" className="-mx-2 space-y-1">
        {adminItems.map((item) => {
          const isRestricted = item.superAdminOnly && !isSuperAdmin;
          const itemName = t(item.nameKey);

          if (isRestricted) {
            return (
              <li key={item.nameKey}>
                <div
                  className="flex items-center justify-between rounded-md p-2 text-sm/6 font-semibold text-gray-400 cursor-not-allowed opacity-50"
                >
                  <span>{itemName}</span>
                  {item.badge && (
                    <Badge color="pink">{item.badge}</Badge>
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
                {item.badge && (
                  <Badge color="pink">{item.badge}</Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}