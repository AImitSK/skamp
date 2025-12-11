// src/app/dashboard/academy/documentation/layout.tsx
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
// Diese Funktion wird innerhalb der Komponente verwendet, um Zugriff auf useTranslations zu haben
function useNavigationItems() {
  const t = useTranslations('academy.layout.navigation');

  return [
    {
      name: t('overview'),
      href: '/dashboard/academy/documentation',
      icon: HomeIcon
    },
    {
      name: t('gettingStarted'),
      href: '/dashboard/academy/documentation/erste-schritte',
      icon: RocketLaunchIcon
    },
    {
      name: t('contacts.title'),
      icon: UserGroupIcon,
      href: '/dashboard/academy/documentation/handbuch/kontakte',
      children: [
        {
          name: t('contacts.companies'),
          href: '/dashboard/academy/documentation/handbuch/kontakte/unternehmen',
          icon: BuildingOfficeIcon
        },
        {
          name: t('contacts.people'),
          href: '/dashboard/academy/documentation/handbuch/kontakte/personen',
          icon: UserGroupIcon
        },
        {
          name: t('contacts.distributionLists'),
          href: '/dashboard/academy/documentation/handbuch/kontakte/verteilerlisten',
          icon: QueueListIcon
        },
      ]
    },
    {
      name: t('library.title'),
      icon: ArchiveBoxIcon,
      href: '/dashboard/academy/documentation/handbuch/bibliothek',
      children: [
        {
          name: t('library.publications'),
          href: '/dashboard/academy/documentation/handbuch/bibliothek/publikationen',
          icon: NewspaperIcon
        },
        {
          name: t('library.marketingMaterials'),
          href: '/dashboard/academy/documentation/handbuch/bibliothek/werbemittel',
          icon: PhotoIcon
        },
      ]
    },
    {
      name: t('prTools.title'),
      icon: MegaphoneIcon,
      href: '/dashboard/academy/documentation/handbuch/pr-tools',
      children: [
        {
          name: t('prTools.campaigns'),
          href: '/dashboard/academy/documentation/handbuch/pr-tools/kampagnen',
          icon: MegaphoneIcon
        },
        {
          name: t('prTools.approvals'),
          href: '/dashboard/academy/documentation/handbuch/pr-tools/freigaben',
          icon: ShieldCheckIcon
        },
        {
          name: t('prTools.calendar'),
          href: '/dashboard/academy/documentation/handbuch/pr-tools/kalender',
          icon: CalendarDaysIcon
        },
        {
          name: t('prTools.mediaLibrary'),
          href: '/dashboard/academy/documentation/handbuch/pr-tools/mediathek',
          icon: PhotoIcon
        },
        {
          name: t('prTools.textModules'),
          href: '/dashboard/academy/documentation/handbuch/pr-tools/textbausteine',
          icon: DocumentTextIcon
        },
      ]
    },
    {
      name: t('communication.title'),
      icon: EnvelopeIcon,
      href: '/dashboard/academy/documentation/handbuch/kommunikation',
      children: [
        {
          name: t('communication.inbox'),
          href: '/dashboard/academy/documentation/handbuch/kommunikation/inbox',
          icon: InboxIcon
        },
        {
          name: t('communication.notifications'),
          href: '/dashboard/academy/documentation/handbuch/kommunikation/benachrichtigungen',
          icon: BellIcon
        },
      ]
    },
    {
      name: t('settings.title'),
      icon: Cog6ToothIcon,
      href: '/dashboard/academy/documentation/handbuch/einstellungen',
      children: [
        {
          name: t('settings.notifications'),
          href: '/dashboard/academy/documentation/handbuch/einstellungen/benachrichtigungen',
          icon: BellAlertIcon
        },
        {
          name: t('settings.branding'),
          href: '/dashboard/academy/documentation/handbuch/einstellungen/branding',
          icon: PaintBrushIcon
        },
        {
          name: t('settings.domains'),
          href: '/dashboard/academy/documentation/handbuch/einstellungen/domains',
          icon: EnvelopeIcon
        },
        {
          name: t('settings.email'),
          href: '/dashboard/academy/documentation/handbuch/einstellungen/email',
          icon: EnvelopeIcon
        },
        {
          name: t('settings.importExport'),
          href: '/dashboard/academy/documentation/handbuch/einstellungen/import-export',
          icon: ArrowDownTrayIcon
        },
        {
          name: t('settings.team'),
          href: '/dashboard/academy/documentation/handbuch/einstellungen/team',
          icon: UserGroupIcon
        },
      ]
    },
    {
      name: t('adminCenter.title'),
      icon: UserIcon,
      href: '/dashboard/academy/documentation/handbuch/admin',
      children: [
        {
          name: t('adminCenter.profile'),
          href: '/dashboard/academy/documentation/handbuch/admin/profil',
          icon: UserIcon
        },
        {
          name: t('adminCenter.contract'),
          href: '/dashboard/academy/documentation/handbuch/admin/vertrag',
          icon: DocumentCheckIcon
        },
        {
          name: t('adminCenter.billing'),
          href: '/dashboard/academy/documentation/handbuch/admin/abrechnung',
          icon: CreditCardIcon
        },
        {
          name: t('adminCenter.api'),
          href: '/dashboard/academy/documentation/handbuch/admin/api',
          icon: CodeBracketIcon
        },
      ]
    },
  ];
}


export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const t = useTranslations('academy.layout');
  const navigation = useNavigationItems();

  // Automatisch aktive Sektion öffnen
  useEffect(() => {
    const activeSection = navigation.find(item =>
      item.children?.some(child => pathname.startsWith(child.href))
    );
    if (activeSection) {
      setExpandedSections([activeSection.name]);
    }
  }, [pathname, navigation]);

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
          <h2 className="text-lg font-semibold text-gray-900">{t('header')}</h2>
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
            {t('support')}
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