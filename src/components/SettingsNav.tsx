"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Die Navigationspunkte für die Einstellungen (ohne Icons)
const settingsItems = [
  {
    name: "Benachrichtigungen",
    href: "/dashboard/settings/notifications",
  },
  {
    name: "Branding",
    href: "/dashboard/settings/branding",
  },
  {
    name: "Team",
    href: "/dashboard/settings/team",
  },
  {
    name: "Domains",
    href: "/dashboard/settings/domain",
  },
  {
    name: "E-Mail",
    href: "/dashboard/settings/email",
  },
  {
    name: "Monitoring & AVE",
    href: "/dashboard/settings/monitoring",
  },
  {
    name: "Import / Export",
    href: "/dashboard/settings/import-export",
  },
  {
    name: "PDF Templates",
    href: "/dashboard/settings/templates",
  },
  {
    name: "Spam-Blocklist",
    href: "/dashboard/settings/spam-blocklist",
  },
];

// Hilfsfunktion zum Verketten von CSS-Klassen
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sidebar" className="flex flex-col">
      <ul role="list" className="-mx-2 space-y-1">
        {settingsItems.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className={classNames(
                pathname === item.href
                  ? 'bg-white text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
                // ✨ Geändert: 'flex' und 'gap' entfernt, da keine Icons mehr da sind
                'block rounded-md p-2 text-sm/6 font-semibold'
              )}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}