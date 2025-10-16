// src/app/dashboard/library/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  UserGroupIcon,
  NewspaperIcon,
  DocumentTextIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";

interface Tab {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: Tab[] = [
  {
    name: "Redakteure",
    href: "/dashboard/library/editors",
    icon: UserGroupIcon,
    description: ""
  },
  {
    name: "Publikationen",
    href: "/dashboard/library/publications",
    icon: NewspaperIcon,
    description: ""
  },
  {
    name: "Boilerplates",
    href: "/dashboard/library/boilerplates",
    icon: DocumentTextIcon,
    description: ""
  },
  {
    name: "Mediathek",
    href: "/dashboard/library/media",
    icon: PhotoIcon,
    description: "Zentrale Verwaltung aller Medieninhalte"
  }
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentTab, setCurrentTab] = useState<Tab | null>(null);

  useEffect(() => {
    // Finde den aktiven Tab basierend auf dem Pfad
    const activeTab = tabs.find(tab => {
      if (tab.href === "/dashboard/library") {
        return pathname === "/dashboard/library";
      }
      return pathname.startsWith(tab.href);
    });
    setCurrentTab(activeTab || tabs[0]);
  }, [pathname]);

  return (
    <div className="h-full flex flex-col">
      {/* Header mit Titel und Beschreibung */}
      <div className="pb-5 mb-5">
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <div className="sm:w-0 sm:flex-1">
            <h1 className="text-3xl font-semibold text-zinc-900">
              Bibliothek
            </h1>
            {currentTab?.description && (
              <p className="mt-1 text-sm text-zinc-500">
                {currentTab.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = 
              tab.href === "/dashboard/library" 
                ? pathname === "/dashboard/library"
                : pathname.startsWith(tab.href);
            
            const Icon = tab.icon;
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={classNames(
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                  "group inline-flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors duration-200"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={classNames(
                    isActive
                      ? "text-primary"
                      : "text-gray-400 group-hover:text-gray-500",
                    "-ml-0.5 mr-2 h-5 w-5"
                  )}
                  aria-hidden="true"
                />
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Tab auswählen
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary"
          value={currentTab?.href}
          onChange={(e) => {
            const tab = tabs.find(t => t.href === e.target.value);
            if (tab) {
              window.location.href = tab.href;
            }
          }}
        >
          {tabs.map((tab) => (
            <option key={tab.name} value={tab.href}>
              {tab.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content Area */}
      <div className="flex-1 py-6">
        {children}
      </div>
    </div>
  );
}