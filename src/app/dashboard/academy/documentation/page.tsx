// src/app/dashboard/academy/documentation/page.tsx
"use client";

import { Heading } from "@/components/ui/heading";
import Link from "next/link";
import {
  BookOpenIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  LightBulbIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  ArchiveBoxIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

export default function AcademyOverviewPage() {
  const t = useTranslations("academy");

  const sections = [
    {
      key: "gettingStarted",
      href: "/dashboard/academy/documentation/erste-schritte",
      icon: RocketLaunchIcon,
      color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
      items: ["welcome", "setupAccount", "firstCampaign", "inviteTeam"]
    },
    {
      key: "crm",
      href: "/dashboard/academy/documentation/handbuch/crm",
      icon: UserGroupIcon,
      color: "bg-green-50 text-green-600 hover:bg-green-100",
      items: ["dashboard", "companies", "people", "lists"]
    },
    {
      key: "library",
      href: "/dashboard/academy/documentation/handbuch/bibliothek/publikationen",
      icon: ArchiveBoxIcon,
      color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
      items: ["publications", "marketing", "assets", "approval"]
    },
    {
      key: "prTools",
      href: "/dashboard/academy/documentation/handbuch/pr-tools/kampagnen",
      icon: MegaphoneIcon,
      color: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100",
      items: ["campaigns", "textModules", "calendar", "media", "approval"]
    },
    {
      key: "communication",
      href: "/dashboard/academy/documentation/handbuch/kommunikation/inbox",
      icon: EnvelopeIcon,
      color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
      items: ["inbox", "email", "notifications", "tracking"]
    },
    {
      key: "settings",
      href: "/dashboard/academy/documentation/handbuch/einstellungen/benachrichtigungen",
      icon: Cog6ToothIcon,
      color: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100",
      items: ["notifications", "branding", "domains", "email", "team", "importExport"]
    },
    {
      key: "admin",
      href: "/dashboard/academy/documentation/handbuch/admin/profil",
      icon: UserIcon,
      color: "bg-red-50 text-red-600 hover:bg-red-100",
      items: ["profile", "contract", "billing", "api"]
    }
  ];

  const quickLinks = [
    {
      key: "quickstart",
      href: "/dashboard/academy/documentation/quickstart",
    },
    {
      key: "changelog",
      href: "/dashboard/academy/documentation/changelog",
    },
    {
      key: "api",
      href: "/dashboard/academy/documentation/api",
    },
    {
      key: "useCases",
      href: "/dashboard/academy/documentation/use-cases",
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <AcademicCapIcon className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <Heading level={1}>{t("title")}</Heading>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      {/* Quick Links */}
      <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("quickAccess.title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="font-medium text-gray-900">{t(`quickAccess.${link.key}.label`)}</div>
              <div className="text-sm text-gray-500 mt-1">{t(`quickAccess.${link.key}.description`)}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group relative rounded-xl border border-gray-200 bg-white p-6 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`inline-flex rounded-lg p-3 ${section.color} transition-colors`}>
                <section.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <svg className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t(`sections.${section.key}.title`)}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {t(`sections.${section.key}.description`)}
            </p>

            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item} className="text-sm text-gray-500 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                  {t(`sections.${section.key}.items.${item}`)}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="bg-gray-50 rounded-2xl p-8 text-center">
        <LightBulbIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("help.title")}
        </h2>
        <p className="text-gray-600 mb-6">
          {t("help.description")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard/academy/documentation/support"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {t("help.contact")}
          </Link>
          <Link
            href="/dashboard/academy/documentation/faq"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            {t("help.faq")}
          </Link>
        </div>
      </div>

      {/* Search Bar (optional) */}
      <div className="mt-12">
        <div className="max-w-xl mx-auto">
          <label htmlFor="search" className="sr-only">
            {t("search.label")}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              name="search"
              id="search"
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t("search.placeholder")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
