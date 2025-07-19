// src/app/dashboard/library/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  BookOpenIcon, 
  NewspaperIcon, 
  BuildingLibraryIcon 
} from "@heroicons/react/24/outline";

interface Tab {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const tabs: Tab[] = [
  {
    name: "Dashboard",
    href: "/dashboard/library",
    icon: BuildingLibraryIcon,
    description: "Übersicht und Statistiken"
  },
  {
    name: "Publikationen",
    href: "/dashboard/library/publications",
    icon: BookOpenIcon,
    description: "Zeitungen, Magazine & Online-Medien"
  },
  {
    name: "Werbemittel",
    href: "/dashboard/library/advertisements",
    icon: NewspaperIcon,
    description: "Anzeigenformate & Spezifikationen"
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
      <div className="border-b border-gray-200 pb-5 mb-5">
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <div className="sm:w-0 sm:flex-1">
            <h1 className="text-2xl font-semibold leading-6 text-gray-900">
              Bibliothek
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {currentTab?.description || "Verwalten Sie Publikationen und Werbemittel"}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
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
                    ? "border-[#005fab] text-[#005fab]"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                  "group inline-flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors duration-200"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={classNames(
                    isActive
                      ? "text-[#005fab]"
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
          className="block w-full rounded-md border-gray-300 focus:border-[#005fab] focus:ring-[#005fab]"
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