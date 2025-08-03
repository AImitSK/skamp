// src/app/dashboard/academy/documentation/page.tsx
"use client";

import { Heading } from "@/components/ui/heading";
import Link from "next/link";
import { 
  BookOpenIcon, 
  RocketLaunchIcon, 
  UserGroupIcon, 
  EnvelopeIcon, 
  PhotoIcon, 
  SparklesIcon,
  AcademicCapIcon,
  PlayCircleIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  ChartBarIcon,
  CogIcon
} from "@heroicons/react/24/outline";

const sections = [
  {
    title: "🚀 Erste Schritte",
    description: "Der perfekte Einstieg in SKAMP",
    href: "/dashboard/academy/documentation/erste-schritte",
    icon: RocketLaunchIcon,
    color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    items: [
      "Willkommen bei SKAMP",
      "Account einrichten",
      "Erste Kampagne erstellen",
      "Team einladen"
    ]
  },
  {
    title: "📚 Benutzerhandbuch",
    description: "Detaillierte Anleitungen für alle Features",
    href: "/dashboard/academy/documentation/handbuch",
    icon: BookOpenIcon,
    color: "bg-green-50 text-green-600 hover:bg-green-100",
    items: [
      "CRM & Kontakte",
      "Kampagnen-Management",
      "Verteilerlisten",
      "Mediathek"
    ]
  },
  {
    title: "🎥 Video-Tutorials",
    description: "Schritt-für-Schritt Videoanleitungen",
    href: "/dashboard/academy/documentation/videos",
    icon: PlayCircleIcon,
    color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    items: [
      "SKAMP in 5 Minuten",
      "Kontakte importieren",
      "KI-Assistent nutzen",
      "Kampagne versenden"
    ]
  },
  {
    title: "✨ Best Practices",
    description: "Tipps & Tricks von PR-Profis",
    href: "/dashboard/academy/documentation/best-practices",
    icon: SparklesIcon,
    color: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100",
    items: [
      "Perfekte Pressemeldung",
      "Kontaktpflege-Strategien",
      "E-Mail-Optimierung",
      "KI effektiv nutzen"
    ]
  },
  {
    title: "🛠 Anleitungen",
    description: "Spezifische How-To Guides",
    href: "/dashboard/academy/documentation/anleitungen",
    icon: CogIcon,
    color: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
    items: [
      "CSV-Import Guide",
      "Freigabe-Workflow",
      "Mediathek organisieren",
      "Vorlagen erstellen"
    ]
  },
  {
    title: "❓ FAQ & Support",
    description: "Antworten auf häufige Fragen",
    href: "/dashboard/academy/documentation/faq",
    icon: QuestionMarkCircleIcon,
    color: "bg-red-50 text-red-600 hover:bg-red-100",
    items: [
      "Häufige Fragen",
      "Fehlerbehebung",
      "Kontakt zum Support",
      "Feature Requests"
    ]
  }
];

const quickLinks = [
  { 
    label: "🎯 Schnellstart-Guide", 
    href: "/dashboard/academy/documentation/quickstart",
    description: "In 10 Minuten startklar"
  },
  { 
    label: "📊 Was ist neu?", 
    href: "/dashboard/academy/documentation/changelog",
    description: "Aktuelle Updates & Features"
  },
  { 
    label: "🔌 API-Dokumentation", 
    href: "/dashboard/academy/documentation/api",
    description: "Für Entwickler & Integrationen"
  },
  { 
    label: "💡 Use Cases", 
    href: "/dashboard/academy/documentation/use-cases",
    description: "Erfolgsgeschichten & Beispiele"
  }
];

export default function AcademyOverviewPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <AcademicCapIcon className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <Heading level={1}>SKAMP Academy</Heading>
        <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
          Willkommen in der SKAMP Academy! Hier findest du alles, was du brauchst, 
          um das Maximum aus deiner PR-Software herauszuholen.
        </p>
      </div>

      {/* Quick Links */}
      <div className="mb-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="font-medium text-gray-900">{link.label}</div>
              <div className="text-sm text-gray-500 mt-1">{link.description}</div>
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
              {section.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {section.description}
            </p>
            
            <ul className="space-y-1">
              {section.items.map((item, index) => (
                <li key={index} className="text-sm text-gray-500 flex items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                  {item}
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
          Brauchst du persönliche Hilfe?
        </h2>
        <p className="text-gray-600 mb-6">
          Unser Support-Team hilft dir gerne bei allen Fragen rund um SKAMP.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard/academy/documentation/support"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Support kontaktieren
          </Link>
          <Link
            href="/dashboard/academy/documentation/faq"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            FAQ durchsuchen
          </Link>
        </div>
      </div>

      {/* Search Bar (optional) */}
      <div className="mt-12">
        <div className="max-w-xl mx-auto">
          <label htmlFor="search" className="sr-only">
            Dokumentation durchsuchen
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
              placeholder="Durchsuche die Dokumentation..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}