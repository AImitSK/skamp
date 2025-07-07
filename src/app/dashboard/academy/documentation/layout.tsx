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
  PlayCircleIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Navigation Items für die Dokumentation
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
    name: 'Benutzerhandbuch',
    icon: BookOpenIcon,
    href: '/dashboard/academy/documentation/handbuch',
    children: [
      { 
        name: 'CRM & Kontakte', 
        href: '/dashboard/academy/documentation/handbuch/crm',
        icon: UserGroupIcon 
      },
      { 
        name: 'Kampagnen', 
        href: '/dashboard/academy/documentation/handbuch/kampagnen',
        icon: EnvelopeIcon 
      },
      { 
        name: 'Verteilerlisten', 
        href: '/dashboard/academy/documentation/handbuch/verteilerlisten',
        icon: ClipboardDocumentListIcon 
      },
      { 
        name: 'Mediathek', 
        href: '/dashboard/academy/documentation/handbuch/mediathek',
        icon: PhotoIcon 
      },
      { 
        name: 'Kalender', 
        href: '/dashboard/academy/documentation/handbuch/kalender',
        icon: CalendarIcon 
      },
      { 
        name: 'Textbausteine', 
        href: '/dashboard/academy/documentation/handbuch/textbausteine',
        icon: DocumentTextIcon 
      },
      { 
        name: 'KI-Assistent', 
        href: '/dashboard/academy/documentation/handbuch/ki-assistent',
        icon: CpuChipIcon 
      },
      { 
        name: 'Freigaben', 
        href: '/dashboard/academy/documentation/handbuch/freigaben',
        icon: ShieldCheckIcon 
      },
    ]
  },
  {
    name: 'Video-Tutorials',
    icon: PlayCircleIcon,
    href: '/dashboard/academy/documentation/videos',
    children: [
      { 
        name: 'Schnellstart', 
        href: '/dashboard/academy/documentation/videos/schnellstart' 
      },
      { 
        name: 'Kontakte importieren', 
        href: '/dashboard/academy/documentation/videos/kontakte-import' 
      },
      { 
        name: 'Kampagne erstellen', 
        href: '/dashboard/academy/documentation/videos/kampagne-erstellen' 
      },
      { 
        name: 'KI nutzen', 
        href: '/dashboard/academy/documentation/videos/ki-nutzen' 
      },
    ]
  },
  {
    name: 'Best Practices',
    icon: SparklesIcon,
    href: '/dashboard/academy/documentation/best-practices',
    children: [
      { 
        name: 'Perfekte Pressemeldung', 
        href: '/dashboard/academy/documentation/best-practices/pressemeldung' 
      },
      { 
        name: 'Kontaktpflege', 
        href: '/dashboard/academy/documentation/best-practices/kontaktpflege' 
      },
      { 
        name: 'E-Mail-Optimierung', 
        href: '/dashboard/academy/documentation/best-practices/email-optimierung' 
      },
      { 
        name: 'Medienlisten aufbauen', 
        href: '/dashboard/academy/documentation/best-practices/medienlisten' 
      },
    ]
  },
  {
    name: 'Anleitungen',
    icon: Cog6ToothIcon,
    href: '/dashboard/academy/documentation/anleitungen',
    children: [
      { 
        name: 'CSV-Import', 
        href: '/dashboard/academy/documentation/anleitungen/csv-import' 
      },
      { 
        name: 'Freigabe-Workflow', 
        href: '/dashboard/academy/documentation/anleitungen/freigabe-workflow' 
      },
      { 
        name: 'Vorlagen erstellen', 
        href: '/dashboard/academy/documentation/anleitungen/vorlagen' 
      },
      { 
        name: 'Mediathek organisieren', 
        href: '/dashboard/academy/documentation/anleitungen/mediathek-organisation' 
      },
    ]
  },
  { 
    name: 'FAQ & Support', 
    href: '/dashboard/academy/documentation/faq', 
    icon: QuestionMarkCircleIcon 
  },
  { 
    name: 'Changelog', 
    href: '/dashboard/academy/documentation/changelog', 
    icon: ChartBarIcon 
  },
];

// Fehlende Icons importieren
import { CalendarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

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