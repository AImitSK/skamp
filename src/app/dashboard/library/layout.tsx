// src/app/dashboard/library/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  NewspaperIcon,
  DocumentTextIcon,
  PhotoIcon,
  CircleStackIcon
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { useAutoGlobal } from "@/lib/hooks/useAutoGlobal";
import { useTranslations } from "next-intl";

interface Tab {
  nameKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionKey?: string;
  badge?: string;
  superAdminOnly?: boolean;
}

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
  const { isSuperAdmin } = useAutoGlobal();
  const t = useTranslations("library.layout");

  const tabs: Tab[] = [
    {
      nameKey: "tabs.publications",
      href: "/dashboard/library/publications",
      icon: NewspaperIcon,
      descriptionKey: ""
    },
    {
      nameKey: "tabs.boilerplates",
      href: "/dashboard/library/boilerplates",
      icon: DocumentTextIcon,
      descriptionKey: ""
    },
    {
      nameKey: "tabs.media",
      href: "/dashboard/library/media",
      icon: PhotoIcon,
      descriptionKey: ""
    },
    {
      nameKey: "tabs.database",
      href: "/dashboard/library/editors",
      icon: CircleStackIcon,
      descriptionKey: "",
      badge: "PREMIUM",
      superAdminOnly: true
    }
  ];

  useEffect(() => {
    const activeTab = tabs.find(tab => {
      if (tab.href === "/dashboard/library") {
        return pathname === "/dashboard/library";
      }
      return pathname.startsWith(tab.href);
    });
    setCurrentTab(activeTab || tabs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="h-full flex flex-col">
      {/* Header mit Titel und Beschreibung */}
      <div className="pb-5 mb-5">
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <div className="sm:w-0 sm:flex-1">
            <h1 className="text-3xl font-semibold text-zinc-900">
              {t("title")}
            </h1>
            {currentTab?.descriptionKey && (
              <p className="mt-1 text-sm text-zinc-500">
                {t(currentTab.descriptionKey as any)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div>
        <nav className="-mb-px flex space-x-8" aria-label={t("ariaLabel")}>
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/dashboard/library"
                ? pathname === "/dashboard/library"
                : pathname.startsWith(tab.href);

            const Icon = tab.icon;
            const isRestricted = tab.superAdminOnly && !isSuperAdmin;

            if (isRestricted) {
              return (
                <div
                  key={tab.nameKey}
                  className="group inline-flex items-center whitespace-nowrap border-b-2 border-transparent py-4 px-1 text-sm font-medium opacity-50 cursor-not-allowed"
                >
                  <Icon
                    className="-ml-0.5 mr-2 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <span className="text-gray-400">{t(tab.nameKey as any)}</span>
                  {tab.badge && (
                    <Badge color="pink" className="ml-2">{tab.badge}</Badge>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={tab.nameKey}
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
                <span>{t(tab.nameKey as any)}</span>
                {tab.badge && (
                  <Badge color="pink" className="ml-2">{tab.badge}</Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          {t("selectTabLabel")}
        </label>
        <select
          id="tabs"
          name="tabs"
          className="block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary"
          value={currentTab?.href}
          onChange={(e) => {
            const tab = tabs.find(t => t.href === e.target.value);
            if (tab && !(tab.superAdminOnly && !isSuperAdmin)) {
              window.location.href = tab.href;
            }
          }}
        >
          {tabs.map((tab) => {
            const isRestricted = tab.superAdminOnly && !isSuperAdmin;
            return (
              <option
                key={tab.nameKey}
                value={tab.href}
                disabled={isRestricted}
                className={isRestricted ? "text-gray-400" : ""}
              >
                {t(tab.nameKey as any)}{tab.badge ? ` [${tab.badge}]` : ""}{isRestricted ? ` ${t("restrictedSuffix")}` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {/* Content Area */}
      <div className="flex-1 py-6">
        {children}
      </div>
    </div>
  );
}