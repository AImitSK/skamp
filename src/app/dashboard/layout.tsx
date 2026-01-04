// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { CrmDataProvider } from "@/context/CrmDataContext";
import { OrganizationProvider } from "@/context/OrganizationContext";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
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
import { Badge } from "@/components/ui/badge";
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
  TicketIcon,
  CircleStackIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { DnaIcon } from "@/components/icons/DnaIcon";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { useState } from "react";
import clsx from 'clsx';
import * as Headless from '@headlessui/react';
import { Toaster } from '@/lib/utils/toast';
import { HelpProvider, HelpButton, HelpPanel } from '@/components/help';

// Navigation Interface Definitions
interface NavigationChild {
  nameKey: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  descriptionKey: string;
  notificationCount?: number;
  badge?: string;
  superAdminOnly?: boolean;
}

interface NavigationItem {
  nameKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  pathPrefix: string;
  href?: string;
  descriptionKey?: string;
  children?: NavigationChild[];
}

interface SettingsItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  descriptionKey: string;
  badge?: string;
  superAdminOnly?: boolean;
}

interface UserMenuItem {
  nameKey: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string;
  superAdminOnly?: boolean;
  dividerAfter?: boolean;
}

// Navigation Items - Keys statt hardcodierter Texte
const navigationItems: Omit<NavigationItem, 'current'>[] = [
  {
    nameKey: "contacts",
    icon: UserGroupIcon,
    pathPrefix: '/dashboard/contacts',
    children: [
      {
        nameKey: "companies",
        href: "/dashboard/contacts/crm?tab=companies",
        icon: BuildingOfficeIcon,
        descriptionKey: "companiesDesc"
      },
      {
        nameKey: "persons",
        href: "/dashboard/contacts/crm?tab=contacts",
        icon: UserGroupIcon,
        descriptionKey: "personsDesc"
      },
      {
        nameKey: "lists",
        href: "/dashboard/contacts/lists",
        icon: QueueListIcon,
        descriptionKey: "listsDesc"
      },
    ],
  },
  {
    nameKey: "library",
    icon: ArchiveBoxIcon,
    pathPrefix: '/dashboard/library',
    children: [
      {
        nameKey: "publications",
        href: "/dashboard/library/publications",
        icon: NewspaperIcon,
        descriptionKey: "publicationsDesc"
      },
      {
        nameKey: "boilerplates",
        href: "/dashboard/library/boilerplates",
        icon: DocumentTextIcon,
        descriptionKey: "boilerplatesDesc"
      },
      {
        nameKey: "media",
        href: "/dashboard/library/media",
        icon: PhotoIcon,
        descriptionKey: "mediaDesc"
      },
      {
        nameKey: "markenDNA",
        href: "/dashboard/library/marken-dna",
        icon: DnaIcon,
        descriptionKey: "markenDNADesc"
      },
      {
        nameKey: "database",
        href: "/dashboard/library/editors",
        icon: CircleStackIcon,
        descriptionKey: "databaseDesc",
        badge: "PREMIUM",
        superAdminOnly: true
      },
    ],
  },
  {
    nameKey: "projects",
    icon: BriefcaseIcon,
    href: "/dashboard/projects",
    pathPrefix: '/dashboard/projects',
    descriptionKey: "projectsDesc"
  },
  {
    nameKey: "analytics",
    icon: ChartBarIcon,
    pathPrefix: '/dashboard/analytics',
    children: [
      {
        nameKey: "monitoring",
        href: "/dashboard/analytics/monitoring",
        icon: ChartBarIcon,
        descriptionKey: "monitoringDesc"
      },
      {
        nameKey: "reporting",
        href: "/dashboard/analytics/reporting",
        icon: ClockIcon,
        descriptionKey: "reportingDesc"
      },
    ],
  },
];

const settingsItems: SettingsItem[] = [
  {
    nameKey: "subscription",
    href: "/dashboard/admin/billing",
    icon: CreditCardIcon,
    descriptionKey: "subscriptionDesc"
  },
  {
    nameKey: "notifications",
    href: "/dashboard/settings/notifications",
    icon: BellAlertIcon,
    descriptionKey: "notificationsDesc"
  },
  {
    nameKey: "branding",
    href: "/dashboard/settings/branding",
    icon: PaintBrushIcon,
    descriptionKey: "brandingDesc"
  },
  {
    nameKey: "templates",
    href: "/dashboard/settings/templates",
    icon: DocumentTextIcon,
    descriptionKey: "templatesDesc",
    badge: "PREMIUM",
    superAdminOnly: true
  },
  {
    nameKey: "domains",
    href: "/dashboard/settings/domain",
    icon: EnvelopeIcon,
    descriptionKey: "domainsDesc"
  },
  {
    nameKey: "email",
    href: "/dashboard/settings/email",
    icon: EnvelopeIcon,
    descriptionKey: "emailDesc"
  },
  {
    nameKey: "importExport",
    href: "/dashboard/settings/import-export",
    icon: ArrowDownTrayIcon,
    descriptionKey: "importExportDesc"
  },
  {
    nameKey: "team",
    href: "/dashboard/settings/team",
    icon: UserGroupIcon,
    descriptionKey: "teamDesc"
  },
];

const userMenuItems: UserMenuItem[] = [
  {
    nameKey: "billing",
    href: "/dashboard/admin/billing",
    icon: CreditCardIcon,
  },
  {
    nameKey: "apiManagement",
    href: "/dashboard/admin/api",
    icon: CodeBracketIcon,
    badge: "PREMIUM",
    superAdminOnly: true,
  },
  {
    nameKey: "developerPortal",
    href: "/dashboard/developer",
    icon: CodeBracketIcon,
    badge: "PREMIUM",
    superAdminOnly: true,
    dividerAfter: true,
  },
  {
    nameKey: "documentation",
    href: "/support",
    icon: BookOpenIcon,
  },
];

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
  const t = useTranslations('layout.navigation');
  const tSettings = useTranslations('layout.settings');
  const tUser = useTranslations('layout.userMenu');
  const tMobile = useTranslations('layout.mobile');
  const tSuperAdmin = useTranslations('layout.superAdmin');

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Mobile Menu Component
  const MobileMenu = () => (
    <Headless.Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
      <Headless.DialogBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <Headless.DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-zinc-900/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <a href="/dashboard" className="-m-1.5 p-1.5">
            <Image
              src="/logo_skamp.svg"
              alt={tMobile('logoAlt')}
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
            <span className="sr-only">{tMobile('closeMenu')}</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flow-root">
          <div className="-my-6 divide-y divide-zinc-500/10 dark:divide-zinc-700">
            <div className="space-y-2 py-6">
              {navigationItems.map((item) => (
                <div key={item.nameKey}>
                  <div className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                    <item.icon className="h-5 w-5" />
                    {t(item.nameKey)}
                  </div>
                  <div className="ml-7 space-y-1">
                    {item.children?.map((child) => {
                      const isRestricted = child.superAdminOnly && !isSuperAdmin;

                      if (isRestricted) {
                        return (
                          <div
                            key={child.nameKey}
                            className="block rounded-lg px-3 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
                          >
                            <span className="flex items-center gap-2 text-zinc-400">
                              {t(child.nameKey)}
                              {child.badge && (
                                <Badge color="pink">{child.badge}</Badge>
                              )}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <a
                          key={child.nameKey}
                          href={child.href}
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <span className="flex items-center gap-2">
                            {t(child.nameKey)}
                            {child.badge && (
                              <Badge color="pink">{child.badge}</Badge>
                            )}
                            {(child.notificationCount ?? 0) > 0 && (
                              <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                {(child.notificationCount ?? 0) > 99 ? '99+' : (child.notificationCount ?? 0)}
                              </span>
                            )}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="py-6 space-y-2">
              <div className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <Cog6ToothIcon className="h-5 w-5" />
                {tMobile('settings')}
              </div>
              <div className="ml-7 space-y-1">
                {settingsItems.map((item) => {
                  const isRestricted = item.superAdminOnly && !isSuperAdmin;

                  if (isRestricted) {
                    return (
                      <div
                        key={item.nameKey}
                        className="block rounded-lg px-3 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
                      >
                        <span className="flex items-center gap-2 text-zinc-400">
                          {tSettings(item.nameKey)}
                          {item.badge && (
                            <Badge color="pink">{item.badge}</Badge>
                          )}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={item.nameKey}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex items-center gap-2">
                        {tSettings(item.nameKey)}
                        {item.badge && (
                          <Badge color="pink">{item.badge}</Badge>
                        )}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="py-6 space-y-2">
              <div className="font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                {tMobile('account')}
              </div>
              <div className="ml-7 space-y-1">
                <div className="px-3 py-2 text-sm">
                  <div className="font-medium text-zinc-900 dark:text-white">{user?.displayName || user?.email?.split("@")[0]}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</div>
                </div>
                {userMenuItems.map((item) => {
                  const isRestricted = item.superAdminOnly && !isSuperAdmin;

                  if (isRestricted) {
                    return (
                      <div
                        key={item.nameKey}
                        className="block rounded-lg px-3 py-2 text-sm font-medium opacity-50 cursor-not-allowed"
                      >
                        <span className="flex items-center gap-2 text-zinc-400">
                          {tUser(item.nameKey)}
                          {item.badge && (
                            <Badge color="pink">{item.badge}</Badge>
                          )}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <a
                      key={item.nameKey}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="flex items-center gap-2">
                        {tUser(item.nameKey)}
                        {item.badge && (
                          <Badge color="pink">{item.badge}</Badge>
                        )}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="py-6">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold text-zinc-900 hover:bg-zinc-50 dark:text-white dark:hover:bg-zinc-800"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                {tMobile('logout')}
              </button>
            </div>
          </div>
        </div>
      </Headless.DialogPanel>
    </Headless.Dialog>
  );

  return (
    <ProtectedRoute>
    <HelpProvider>
      <OrganizationProvider>
        <CrmDataProvider>
          <StackedLayout
          navbar={
            <Navbar>
              {/* Logo */}
              <a href="/dashboard" className="flex-shrink-0">
                <Image
                  src="/logo_skamp.svg"
                  alt={t('logoAlt')}
                  width={40}
                  height={40}
                  className="h-10 w-auto max-w-[100px]"
                />
              </a>
              
              {/* Desktop Navigation */}
              <NavbarSection className="hidden lg:flex ml-4 items-center gap-x-6">
                {navigationItems.map((item) => {
                  const isCurrent = pathname.startsWith(item.pathPrefix);
                  return item.children ? (
                    <Dropdown key={item.nameKey}>
                        <DropdownButton as={NavbarItem} className={clsx('!border-transparent', isCurrent && 'bg-zinc-100 dark:bg-zinc-800/50 rounded-md')}>
                        <span>{t(item.nameKey)}</span>
                        <ChevronDownIcon className="size-4" />
                      </DropdownButton>
                      <DropdownMenu>
                        {item.children.map((child) => {
                          const isRestricted = child.superAdminOnly && !isSuperAdmin;

                          if (isRestricted) {
                            return (
                              <div
                                key={child.nameKey}
                                className="flex items-center gap-3 px-3.5 py-2.5 opacity-50 cursor-not-allowed"
                              >
                                <child.icon className="size-5 text-zinc-400" />
                                <div className="flex flex-col">
                                  <span className="flex items-center gap-2 text-sm text-zinc-400">
                                    {t(child.nameKey)}
                                    {child.badge && (
                                      <Badge color="pink">{child.badge}</Badge>
                                    )}
                                  </span>
                                  <span className="text-xs text-zinc-400">{t(child.descriptionKey)}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <DropdownItem
                              href={child.href}
                              key={child.nameKey}
                              icon={child.icon}
                              description={t(child.descriptionKey)}
                            >
                              <span className="flex items-center gap-2">
                                {t(child.nameKey)}
                                {child.badge && (
                                  <Badge color="pink">{child.badge}</Badge>
                                )}
                                {(child.notificationCount ?? 0) > 0 && (
                                   <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                     {(child.notificationCount ?? 0) > 99 ? '99+' : (child.notificationCount ?? 0)}
                                   </span>
                                )}
                              </span>
                            </DropdownItem>
                          );
                        })}
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <a
                      key={item.nameKey}
                      href={item.href}
                      className={clsx(
                        'text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white px-3 py-2 rounded-md transition-colors',
                        isCurrent && 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white'
                      )}
                    >
                      {t(item.nameKey)}
                    </a>
                  );
                })}
              </NavbarSection>
              
              <NavbarSpacer />
              
              {/* Right side icons */}
              <NavbarSection className="flex items-center gap-x-4">
                {/* Inbox Icon - only desktop */}
                <a
                  href="/dashboard/communication/inbox"
                  className="hidden lg:flex relative p-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white transition-colors"
                  aria-label={t('inbox')}
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
                  aria-label={tSettings('title')}
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
                      <span className="text-sm font-medium">{tSuperAdmin('title')}</span>
                      <ChevronDownIcon className="size-4" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end" className="min-w-60">
                      <DropdownItem
                        href="/dashboard/super-admin/accounts"
                        icon={TicketIcon}
                        description={tSuperAdmin('accountsDesc')}
                      >
                        {tSuperAdmin('accounts')}
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/organizations"
                        icon={BuildingOfficeIcon}
                        description={tSuperAdmin('organizationsDesc')}
                      >
                        {tSuperAdmin('organizations')}
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/matching/candidates"
                        icon={AdjustmentsHorizontalIcon}
                        description={tSuperAdmin('matchingCandidatesDesc')}
                      >
                        {tSuperAdmin('matchingCandidates')}
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/matching/analytics"
                        icon={ChartBarIcon}
                        description={tSuperAdmin('analyticsDesc')}
                      >
                        {tSuperAdmin('analytics')}
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/monitoring"
                        icon={ChartBarIcon}
                        description={tSuperAdmin('monitoringControlDesc')}
                      >
                        {tSuperAdmin('monitoringControl')}
                      </DropdownItem>
                      <DropdownItem
                        href="/dashboard/super-admin/settings"
                        icon={Cog6ToothIcon}
                        description={tSuperAdmin('globalSettingsDesc')}
                      >
                        {tSuperAdmin('globalSettings')}
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
                    <DropdownItem href="/dashboard/admin/profile" compact>
                      <UserIcon className="size-3.5 flex-shrink-0 text-zinc-600 dark:text-zinc-400" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{user?.displayName || user?.email?.split("@")[0]}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</span>
                      </div>
                    </DropdownItem>
                    <DropdownDivider />
                    {userMenuItems.map((item) => {
                      const isRestricted = item.superAdminOnly && !isSuperAdmin;

                      if (isRestricted) {
                        return (
                          <React.Fragment key={item.nameKey}>
                            <div className="flex items-center gap-2 px-3.5 py-2 opacity-50 cursor-not-allowed">
                              <item.icon className="size-3.5 flex-shrink-0 text-zinc-400" />
                              <span className="text-sm text-zinc-400">{tUser(item.nameKey)}</span>
                              {item.badge && (
                                <Badge color="pink" className="ml-auto">{item.badge}</Badge>
                              )}
                            </div>
                            {item.dividerAfter && <DropdownDivider />}
                          </React.Fragment>
                        );
                      }

                      return (
                        <React.Fragment key={item.nameKey}>
                          <DropdownItem
                            href={item.href}
                            compact
                          >
                            <item.icon className="size-3.5 flex-shrink-0 text-zinc-600 dark:text-zinc-400" />
                            <span className="text-sm text-zinc-900 dark:text-white">{tUser(item.nameKey)}</span>
                            {item.badge && (
                              <Badge color="pink" className="ml-auto">{item.badge}</Badge>
                            )}
                          </DropdownItem>
                          {item.dividerAfter && <DropdownDivider />}
                        </React.Fragment>
                      );
                    })}
                    <DropdownDivider />
                    <DropdownItem
                      onClick={handleLogout}
                      compact
                    >
                      <ArrowRightOnRectangleIcon className="size-3.5 flex-shrink-0 text-zinc-600 dark:text-zinc-400" />
                      <span className="text-sm text-zinc-900 dark:text-white">{tUser('logout')}</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>

                {/* Mobile menu button */}
                <button
                  type="button"
                  className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-zinc-700 dark:text-zinc-300 lg:hidden"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <span className="sr-only">{tMobile('openMenu')}</span>
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
                    alt={t('logoAlt')}
                    width={40}
                    height={40}
                    className="h-10 w-auto max-w-[150px]"
                  />
                </a>
              </SidebarHeader>
              <SidebarBody>
                <SidebarItem href="/dashboard" current={pathname === '/dashboard'}>
                  <HomeIcon className="size-5" />
                  <SidebarLabel>{t('dashboard')}</SidebarLabel>
                </SidebarItem>
                {navigationItems.map(item => {
                  const isCurrent = pathname.startsWith(item.pathPrefix);
                  return item.children ? (
                    <Dropdown key={item.nameKey}>
                      <DropdownButton as={SidebarItem} current={isCurrent}>
                        <item.icon className="size-5" />
                        <SidebarLabel>{t(item.nameKey)}</SidebarLabel>
                        <ChevronDownIcon className="size-4" />
                      </DropdownButton>
                      <DropdownMenu>
                        {item.children.map(child => {
                          const isRestricted = child.superAdminOnly && !isSuperAdmin;

                          if (isRestricted) {
                            return (
                              <div
                                key={child.nameKey}
                                className="flex items-center gap-3 px-3.5 py-2.5 opacity-50 cursor-not-allowed"
                              >
                                <child.icon className="size-5 text-zinc-400" />
                                <div className="flex flex-col">
                                  <span className="flex items-center gap-2 text-sm text-zinc-400">
                                    {t(child.nameKey)}
                                    {child.badge && (
                                      <Badge color="pink">{child.badge}</Badge>
                                    )}
                                  </span>
                                  <span className="text-xs text-zinc-400">{t(child.descriptionKey)}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <DropdownItem
                              href={child.href}
                              key={child.nameKey}
                              icon={child.icon}
                              description={t(child.descriptionKey)}
                            >
                              <span className="flex items-center gap-2">
                                {t(child.nameKey)}
                                {child.badge && (
                                  <Badge color="pink">{child.badge}</Badge>
                                )}
                                {(child.notificationCount ?? 0) > 0 && (
                                   <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                     {(child.notificationCount ?? 0) > 99 ? '99+' : (child.notificationCount ?? 0)}
                                   </span>
                                )}
                              </span>
                            </DropdownItem>
                          );
                        })}
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <SidebarItem key={item.nameKey} href={item.href} current={isCurrent}>
                      <item.icon className="size-5" />
                      <SidebarLabel>{t(item.nameKey)}</SidebarLabel>
                    </SidebarItem>
                  );
                })}
              </SidebarBody>
            </Sidebar>
          }
        >
          {children}
          <Toaster />
          <MobileMenu />
          </StackedLayout>
          {/* Hilfe-System */}
          <HelpButton />
          <HelpPanel />
        </CrmDataProvider>
      </OrganizationProvider>
    </HelpProvider>
    </ProtectedRoute>
  );
}