// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { CrmDataProvider } from "@/context/CrmDataContext";
import { OrganizationProvider } from "@/context/OrganizationContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client-init";
import { StackedLayout } from "@/components/stacked-layout";
import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
} from "@/components/sidebar";
import {
  Navbar,
  NavbarItem,
  NavbarSection,
  NavbarSpacer,
} from "@/components/navbar";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
} from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { useInboxCount } from "@/hooks/use-inbox-count";
import { useAutoGlobal } from "@/lib/hooks/useAutoGlobal";
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  QueueListIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  PhotoIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  InboxIcon,
  BellIcon,
  AcademicCapIcon,
  BookOpenIcon,
  NewspaperIcon,
  Cog6ToothIcon,
  BellAlertIcon,
  PaintBrushIcon,
  ArrowDownTrayIcon,
  UserIcon,
  DocumentCheckIcon,
  CreditCardIcon,
  PuzzlePieceIcon,
  CodeBracketIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  Bars3Icon,
  TableCellsIcon,
  BriefcaseIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  ChartBarIcon,
  GlobeAltIcon,
  UsersIcon,
  AdjustmentsHorizontalIcon,
  TicketIcon
} from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useState } from "react";
import clsx from 'clsx';
import * as Headless from '@headlessui/react';
import { Toaster } from '@/lib/utils/toast';

// Navigation Interface Definitions
interface NavigationChild {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  notificationCount?: number;
}

interface NavigationItem {
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  current: boolean;
  href?: string;
  description?: string;
  children?: NavigationChild[];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const { totalUnread: inboxUnread, assignedUnread } = useInboxCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSuperAdmin, autoGlobalMode, globalPermissions } = useAutoGlobal();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Fehler beim Logout:", error);
    }
  };

  const navigationItems: NavigationItem[] = [
  {
    name: "Kontakte",
    icon: UserGroupIcon,
    current: pathname.startsWith('/dashboard/contacts'),
    children: [
      { 
        name: "Unternehmen", 
        href: "/dashboard/contacts/crm?tab=companies", 
        icon: BuildingOfficeIcon,
        description: "Verwalte deine Unternehmenskontakte und Kunden"
      },
      { 
        name: "Personen", 
        href: "/dashboard/contacts/crm?tab=contacts", 
        icon: UserGroupIcon,
        description: "Alle Journalisten und Ansprechpartner im Überblick"
      },
      { 
        name: "Listen", 
        href: "/dashboard/contacts/lists", 
        icon: QueueListIcon,
        description: "Erstelle und verwalte deine Verteilerlisten"
      },
    ],
  },
  {
    name: "Bibliothek",
    icon: ArchiveBoxIcon,
    current: pathname.startsWith('/dashboard/library'),
    children: [
      {
        name: "Redakteure",
        href: "/dashboard/library/editors",
        icon: UserGroupIcon,
        description: "Redakteure und ihre Publikationen verwalten"
      },
      {
        name: "Publikationen",
        href: "/dashboard/library/publications",
        icon: NewspaperIcon,
        description: "Alle Publikationen und deren Metriken verwalten"
      },
      {
        name: "Boilerplates",
        href: "/dashboard/library/boilerplates",
        icon: DocumentTextIcon,
        description: "Wiederverwendbare Textbausteine und Vorlagen"
      },
      {
        name: "Mediathek",
        href: "/dashboard/library/media",
        icon: PhotoIcon,
        description: "Zentrale Verwaltung aller Medieninhalte"
      },
    ],
  },
  {
    name: "Projekte",
    icon: BriefcaseIcon,
    href: "/dashboard/projects",
    current: pathname.startsWith('/dashboard/projects'),
    description: "Projekt-Management mit Kanban-Board und Pipeline-Tracking"
  },
  {
    name: "Analyse",
    icon: ChartBarIcon,
    current: pathname.startsWith('/dashboard/analytics'),
    children: [
      {
        name: "Monitoring",
        href: "/dashboard/analytics/monitoring",
        icon: ChartBarIcon,
        description: "E-Mail Tracking und Veröffentlichungs-Monitoring"
      },
    ],
  },
];

  const settingsItems = [
    {
      name: "Subscription",
      href: "/dashboard/subscription",
      icon: CreditCardIcon,
      description: "Plan verwalten und upgraden"
    },
    {
      name: "Benachrichtigungen",
      href: "/dashboard/settings/notifications",
      icon: BellAlertIcon,
      description: "E-Mail und Push-Benachrichtigungen verwalten"
    },
    {
      name: "Branding",
      href: "/dashboard/settings/branding",
      icon: PaintBrushIcon,
      description: "Personalisiere CeleroPress mit eigenem Logo"
    },
    {
      name: "Templates",
      href: "/dashboard/settings/templates",
      icon: DocumentTextIcon,
      description: "PDF-Layout-Vorlagen verwalten"
    },
    {
      name: "Domains",
      href: "/dashboard/settings/domain",
      icon: EnvelopeIcon,
      description: "Eigene E-Mail-Domain einrichten"
    },
        {
      name: "E-Mail",
      href: "/dashboard/settings/email",
      icon: EnvelopeIcon,
      description: "E-Mail Konfiguration"
    },
    {
      name: "Import / Export",
      href: "/dashboard/settings/import-export",
      icon: ArrowDownTrayIcon,
      description: "Daten importieren oder exportieren"
    },
    {
      name: "Team",
      href: "/dashboard/settings/team",
      icon: UserGroupIcon,
      description: "Team-Mitglieder verwalten"
    },
  ];

  const userMenuItems = [
      {
        name: "Profil",
        href: "/dashboard/admin/profile",
        icon: UserIcon,
        description: "Persönliche Einstellungen bearbeiten"
      },
      {
        name: "API-Verwaltung",
        href: "/dashboard/admin/api",
        icon: CodeBracketIcon,
        description: "API-Schlüssel und Dokumentation"
      },
      {
        name: "Developer Portal",
        href: "/dashboard/developer",
        icon: CodeBracketIcon,
        description: "API-Dokumentation, Testing-Tools und Integration-Beispiele"
      },
      {
        name: "Abrechnung",
        href: "/dashboard/admin/billing",
        icon: CreditCardIcon,
        description: "Rechnungen und Zahlungsmethoden"
      },
      {
        name: "Vertragsdetails",
        href: "/dashboard/admin/contract",
        icon: DocumentCheckIcon,
        description: "Vertragsdetails und Konditionen"
      },
      {
        name: "Integrationen",
        href: "/dashboard/admin/integrations",
        icon: PuzzlePieceIcon,
        description: "Verbinde CeleroPress mit anderen Tools"
      },
      {
        name: "Dokumentation",
        href: "/dashboard/academy/documentation",
        icon: BookOpenIcon,
        description: "Detaillierte Anleitungen und Hilfe"
      },
  ];

  // Mobile Menu Component
  const MobileMenu = () => (
    <Headless.Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
      <Headless.DialogBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <Headless.DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-zinc-900/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <a href="/dashboard" className="-m-1.5 p-1.5">
            <Image
              src="/logo_skamp.svg"
              alt="CeleroPress Logo"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
          </a>
          <button
            type="button"
            className="-m-2.5 rounded-md p-2.5 text-zinc-700 dark:text-zinc-300"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="sr-only">Menü schließen</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flow-root">
          <div className="-my-6 divide-y divide-zinc-500/10 dark:divide-zinc-700">
            <div className="space-y-2 py-6">
              {navigationItems.map((item) => (
                <div key={item.name}>
                  <div className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  <div className="ml-7 space-y-1">
                    {item.children?.map((child) => (
                      <a
                        key={child.name}
                        href={child.href}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="flex items-center gap-2">
                          {child.name}
                          {(child.notificationCount ?? 0) > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                              {(child.notificationCount ?? 0) > 99 ? '99+' : (child.notificationCount ?? 0)}
                            </span>
                          )}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="py-6 space-y-2">
              <div className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <Cog6ToothIcon className="h-5 w-5" />
                Einstellungen
              </div>
              <div className="ml-7 space-y-1">
                {settingsItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="py-6 space-y-2">
              <div className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Account
              </div>
              <div className="ml-7 space-y-1">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium text-zinc-900 dark:text-white">{user?.displayName || user?.email?.split("@")[0]}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</div>
                </div>
                {userMenuItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="py-6">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </Headless.DialogPanel>
    </Headless.Dialog>
  );

  return (
    <ProtectedRoute>
      <OrganizationProvider>
        <CrmDataProvider>
          <StackedLayout
          navbar={
            <Navbar>
              {/* Logo */}
              <a href="/dashboard" className="flex-shrink-0">
                <Image
                  src="/logo_skamp.svg"
                  alt="CeleroPress Logo"
                  width={40}
                  height={40}
                  className="h-10 w-auto max-w-[100px]"
                />
              </a>
              
              {/* Desktop Navigation */}
              <NavbarSection className="hidden lg:flex ml-4 items-center gap-x-6">
                {navigationItems.map((item) => (
                  item.children ? (
                    <Dropdown key={item.name}>
                        <DropdownButton as={NavbarItem} className={clsx('!border-transparent', item.current && 'bg-zinc-100 dark:bg-zinc-800/50 rounded-md')}>                        <span>{item.name}</span>
                        <ChevronDownIcon className="size-4" />
                      </DropdownButton>
                      <DropdownMenu>
                        {item.children.map((child) => (
                          <DropdownItem 
                            href={child.href} 
                            key={child.name} 
                            icon={child.icon}
                            description={child.description}
                          >
                            <span className="flex items-center gap-2">
                              {child.name}
                              {(child.notificationCount ?? 0) > 0 && (
                                 <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                   {(child.notificationCount ?? 0) > 99 ? '99+' : (child.notificationCount ?? 0)}
                                 </span>
                              )}
                            </span>
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <a 
                      key={item.name}
                      href={item.href}
                      className={clsx(
                        'text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white px-3 py-2 rounded-md transition-colors',
                        item.current && 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white'
                      )}
                    >
                      {item.name}
                    </a>
                  )
                ))}
              </NavbarSection>
              
              <NavbarSpacer />
              
              {/* Right side icons */}
              <NavbarSection className="flex items-center gap-x-4">
                {/* Inbox Icon - only desktop */}
                <a
                  href="/dashboard/communication/inbox"
                  className="hidden lg:flex relative p-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors"
                  aria-label="Inbox"
                >
                  <InboxIcon className="size-6" />
                  {inboxUnread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {inboxUnread > 99 ? '99+' : inboxUnread}
                    </span>
                  )}
                </a>

                {/* Notifications Dropdown - visible on all screens */}
                <NotificationsDropdown />

                {/* Settings Link - only desktop */}
                <a
                  href="/dashboard/settings/notifications"
                  className="hidden lg:flex p-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors"
                  aria-label="Einstellungen"
                >
                  <Cog6ToothIcon className="size-6" />
                </a>

                {/* SuperAdmin Dropdown - only for SuperAdmin */}
                {isSuperAdmin && (
                  <Dropdown>
                    <DropdownButton
                      as="button"
                      className="hidden lg:flex items-center gap-1 p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <ShieldCheckIcon className="size-5" />
                      <span className="text-sm font-medium">Super Admin</span>
                      <ChevronDownIcon className="size-4" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end" className="min-w-60">
                      <DropdownItem
                        href="/dashboard/super-admin/accounts"
                        icon={TicketIcon}
                        description="Promo-Codes und Special Accounts"
                      >
                        Account Management
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/organizations"
                        icon={BuildingOfficeIcon}
                        description="Organizations Overview & Support"
                      >
                        Organizations
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/matching/candidates"
                        icon={AdjustmentsHorizontalIcon}
                        description="Neue Premium-Kandidaten prüfen"
                      >
                        Matching-Kandidaten
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/matching/analytics"
                        icon={ChartBarIcon}
                        description="Datenqualität und Statistiken"
                      >
                        Analytics
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/monitoring"
                        icon={ChartBarIcon}
                        description="Monitoring & Crawler Control"
                      >
                        Monitoring Control
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/settings"
                        icon={Cog6ToothIcon}
                        description="Global-System konfigurieren"
                      >
                        Global-Einstellungen
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                )}

                {/* User Avatar - only desktop */}
                <Dropdown>
                  <DropdownButton className="hidden lg:block !bg-transparent hover:!bg-transparent dark:!bg-transparent dark:hover:!bg-transparent rounded-full p-0 focus:outline-none transition-opacity">
                    <Avatar
                      src={user?.photoURL || undefined}
                      initials={
                        user?.displayName?.split(" ").map((n) => n[0]).join("").toUpperCase() || 
                        user?.email?.[0].toUpperCase()
                      }
                      className="size-9"
                    />
                  </DropdownButton>
                  <DropdownMenu anchor="bottom end" className="avatar-dropdown-menu">
                    <DropdownItem href="/dashboard/admin/profile">
                      <div className="flex items-center gap-x-3">
                        <UserIcon className="size-4 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium">{user?.displayName || user?.email?.split("@")[0]}</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</span>
                        </div>
                      </div>
                    </DropdownItem>
                    <DropdownDivider />
                    {userMenuItems.map(item => (
                      <DropdownItem 
                        href={item.href} 
                        key={item.name}
                        icon={item.icon}
                        description={item.description}
                      >
                        {item.name}
                      </DropdownItem>
                    ))}
                    <DropdownDivider />
                    <DropdownItem 
                      onClick={handleLogout}
                      icon={ArrowRightOnRectangleIcon}
                      description="Von CeleroPress abmelden"
                    >
                      Abmelden
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>

                {/* Mobile menu button */}
                <button
                  type="button"
                  className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-zinc-700 dark:text-zinc-300 lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <span className="sr-only">Hauptmenü öffnen</span>
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                </button>
              </NavbarSection>
            </Navbar>
          }
          sidebar={
            <Sidebar>
              <SidebarHeader>
                <a href="/dashboard">
                  <Image
                    src="/logo_skamp.svg"
                    alt="CeleroPress Logo"
                    width={40}
                    height={40}
                    className="h-10 w-auto max-w-[150px]"
                  />
                </a>
              </SidebarHeader>
              <SidebarBody>
                <SidebarItem href="/dashboard" current={pathname === '/dashboard'}>
                  <HomeIcon className="size-5" />
                  <SidebarLabel>Dashboard</SidebarLabel>
                </SidebarItem>
                {navigationItems.map(item => (
                  item.children ? (
                    <Dropdown key={item.name}>
                      <DropdownButton as={SidebarItem} current={item.current}>
                        <item.icon className="size-5" />
                        <SidebarLabel>{item.name}</SidebarLabel>
                        <ChevronDownIcon className="size-4" />
                      </DropdownButton>
                      <DropdownMenu>
                        {item.children.map(child => (
                          <DropdownItem 
                            href={child.href} 
                            key={child.name}
                            icon={child.icon}
                            description={child.description}
                          >
                            <span className="flex items-center gap-2">
                              {child.name}
                              {(child.notificationCount ?? 0) > 0 && (
                                 <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                   {(child.notificationCount ?? 0) > 99 ? '99+' : (child.notificationCount ?? 0)}
                                 </span>
                              )}
                            </span>
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <SidebarItem key={item.name} href={item.href} current={item.current}>
                      <item.icon className="size-5" />
                      <SidebarLabel>{item.name}</SidebarLabel>
                    </SidebarItem>
                  )
                ))}
              </SidebarBody>
            </Sidebar>
          }
        >
          {children}
          <Toaster />
          <MobileMenu />
          </StackedLayout>
        </CrmDataProvider>
      </OrganizationProvider>
    </ProtectedRoute>
  );
}