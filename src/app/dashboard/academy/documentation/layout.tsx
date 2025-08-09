// src/app/dashboard/academy/documentation/layout.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  BookOpenIcon, 
  HomeIcon, 
  RocketLaunchIcon, 
  UserGroupIcon, 
  EnvelopeIcon, 
  PhotoIcon, 
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  QueueListIcon,
  MegaphoneIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  InboxIcon,
  BellIcon,
  BellAlertIcon,
  PaintBrushIcon,
  ArrowDownTrayIcon,
  UserIcon,
  DocumentCheckIcon,
  CreditCardIcon,
  CodeBracketIcon,
  NewspaperIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

// Navigation Items für die Dokumentation - 6 Hauptkategorien basierend auf App-Navigation
const navigation = [
  { 
    name: 'Übersicht', 
    href: '/dashboard/academy/documentation', 
    icon: HomeIcon 
  },
  { 
    name: 'Erste Schritte', 
    href: '/dashboard/academy/documentation/erste-schritte', 
    icon: RocketLaunchIcon 
  },
  {
    name: 'Kontakte',
    icon: UserGroupIcon,
    href: '/dashboard/academy/documentation/handbuch/kontakte',
    children: [
      { 
        name: 'Unternehmen', 
        href: '/dashboard/academy/documentation/handbuch/kontakte/unternehmen',
        icon: BuildingOfficeIcon 
      },
      { 
        name: 'Personen', 
        href: '/dashboard/academy/documentation/handbuch/kontakte/personen',
        icon: UserGroupIcon 
      },
      { 
        name: 'Verteilerlisten', 
        href: '/dashboard/academy/documentation/handbuch/kontakte/verteilerlisten',
        icon: QueueListIcon 
      },
    ]
  },
  {
    name: 'Bibliothek',
    icon: ArchiveBoxIcon,
    href: '/dashboard/academy/documentation/handbuch/bibliothek',
    children: [
      { 
        name: 'Publikationen', 
        href: '/dashboard/academy/documentation/handbuch/bibliothek/publikationen',
        icon: NewspaperIcon 
      },
      { 
        name: 'Werbemittel', 
        href: '/dashboard/academy/documentation/handbuch/bibliothek/werbemittel',
        icon: PhotoIcon 
      },
    ]
  },
  {
    name: 'PR-Tools',
    icon: MegaphoneIcon,
    href: '/dashboard/academy/documentation/handbuch/pr-tools',
    children: [
      { 
        name: 'Kampagnen', 
        href: '/dashboard/academy/documentation/handbuch/pr-tools/kampagnen',
        icon: MegaphoneIcon 
      },
      { 
        name: 'Freigaben', 
        href: '/dashboard/academy/documentation/handbuch/pr-tools/freigaben',
        icon: ShieldCheckIcon 
      },
      { 
        name: 'Kalender', 
        href: '/dashboard/academy/documentation/handbuch/pr-tools/kalender',
        icon: CalendarDaysIcon 
      },
      { 
        name: 'Mediathek', 
        href: '/dashboard/academy/documentation/handbuch/pr-tools/mediathek',
        icon: PhotoIcon 
      },
      { 
        name: 'Textbausteine', 
        href: '/dashboard/academy/documentation/handbuch/pr-tools/textbausteine',
        icon: DocumentTextIcon 
      },
    ]
  },
  {
    name: 'Kommunikation',
    icon: EnvelopeIcon,
    href: '/dashboard/academy/documentation/handbuch/kommunikation',
    children: [
      { 
        name: 'Kampagnen In-Box', 
        href: '/dashboard/academy/documentation/handbuch/kommunikation/inbox',
        icon: InboxIcon 
      },
      { 
        name: 'Benachrichtigungen', 
        href: '/dashboard/academy/documentation/handbuch/kommunikation/benachrichtigungen',
        icon: BellIcon 
      },
    ]
  },
  {
    name: 'Einstellungen',
    icon: Cog6ToothIcon,
    href: '/dashboard/academy/documentation/handbuch/einstellungen',
    children: [
      { 
        name: 'Benachrichtigungen', 
        href: '/dashboard/academy/documentation/handbuch/einstellungen/benachrichtigungen',
        icon: BellAlertIcon 
      },
      { 
        name: 'Branding', 
        href: '/dashboard/academy/documentation/handbuch/einstellungen/branding',
        icon: PaintBrushIcon 
      },
      { 
        name: 'Domains', 
        href: '/dashboard/academy/documentation/handbuch/einstellungen/domains',
        icon: EnvelopeIcon 
      },
      { 
        name: 'E-Mail', 
        href: '/dashboard/academy/documentation/handbuch/einstellungen/email',
        icon: EnvelopeIcon 
      },
      { 
        name: 'Import/Export', 
        href: '/dashboard/academy/documentation/handbuch/einstellungen/import-export',
        icon: ArrowDownTrayIcon 
      },
      { 
        name: 'Team', 
        href: '/dashboard/academy/documentation/handbuch/einstellungen/team',
        icon: UserGroupIcon 
      },
    ]
  },
  {
    name: 'Admin-Center',
    icon: UserIcon,
    href: '/dashboard/academy/documentation/handbuch/admin',
    children: [
      { 
        name: 'Profil', 
        href: '/dashboard/academy/documentation/handbuch/admin/profil',
        icon: UserIcon 
      },
      { 
        name: 'Vertrag', 
        href: '/dashboard/academy/documentation/handbuch/admin/vertrag',
        icon: DocumentCheckIcon 
      },
      { 
        name: 'Abrechnung', 
        href: '/dashboard/academy/documentation/handbuch/admin/abrechnung',
        icon: CreditCardIcon 
      },
      { 
        name: 'API', 
        href: '/dashboard/academy/documentation/handbuch/admin/api',
        icon: CodeBracketIcon 
      },
    ]
  },
];


export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Automatisch aktive Sektion öffnen
  useEffect(() => {
    const activeSection = navigation.find(item => 
      item.children?.some(child => pathname.startsWith(child.href))
    );
    if (activeSection) {
      setExpandedSections([activeSection.name]);
    }
  }, [pathname]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <nav className="w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <BookOpenIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Academy</h2>
        </div>
        <div className="flex-1 px-3 py-4">
          {navigation.map((item) => (
            <div key={item.name} className="mb-1">
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleSection(item.name)}
                    className="w-full group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      {item.icon && (
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500" />
                      )}
                      {item.name}
                    </div>
                    {expandedSections.includes(item.name) ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  {expandedSections.includes(item.name) && (
                    <div className="ml-8 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`
                            group flex items-center px-3 py-1.5 text-sm font-medium rounded-md
                            ${isActive(child.href)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }
                          `}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md
                    ${isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500" />
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Footer mit Support-Link */}
        <div className="border-t border-gray-200 p-4">
          <a
            href="mailto:support@skamp.de"
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <QuestionMarkCircleIcon className="h-4 w-4 mr-2" />
            Support kontaktieren
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-8">
          {/* MDX Styling Container */}
          <div className="prose prose-lg prose-blue max-w-none">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}