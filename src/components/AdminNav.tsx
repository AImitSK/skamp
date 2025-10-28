"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Die Navigationspunkte für den Admin-Bereich
const adminItems = [
  {
    name: "API-Verwaltung",
    href: "/dashboard/admin/api",
  },
  {
    name: "Abrechnung",
    href: "/dashboard/admin/billing",
  },
  {
    name: "Integrationen",
    href: "/dashboard/admin/integrations",
  },
];

// Hilfsfunktion zum Verketten von CSS-Klassen
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin Navigation" className="flex flex-col">
      <ul role="list" className="-mx-2 space-y-1">
        {adminItems.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className={classNames(
                pathname === item.href
                  ? 'bg-white text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900',
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