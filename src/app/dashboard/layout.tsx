// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { CrmDataProvider } from "@/context/CrmDataContext";
import { useRouter } from "next/navigation";
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
} from "@/components/dropdown";
import { Avatar } from "@/components/avatar";
import { useNotifications } from "@/hooks/use-notifications";
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
  ChevronDownIcon
} from "@heroicons/react/20/solid";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from "react";
import clsx from 'clsx';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Fehler beim Logout:", error);
    }
  };

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: HomeIcon,
      current: pathname === '/dashboard',
    },
    {
      name: "Kontakte",
      icon: UserGroupIcon,
      current: pathname.startsWith('/dashboard/contacts'),
      children: [
        { name: "Unternehmen", href: "/dashboard/contacts/crm?tab=companies", icon: BuildingOfficeIcon },
        { name: "Personen", href: "/dashboard/contacts/crm?tab=contacts", icon: UserGroupIcon },
        { name: "Listen", href: "/dashboard/contacts/lists", icon: QueueListIcon },
      ],
    },
    {
        name: "PR-Tools",
        icon: MegaphoneIcon,
        current: pathname.startsWith('/dashboard/pr-tools'),
        children: [
            { name: "Kampagnen", href: "/dashboard/pr-tools/campaigns", icon: MegaphoneIcon },
            { name: "Freigaben", href: "/dashboard/pr-tools/approvals", icon: ShieldCheckIcon },
            { name: "Kalender", href: "/dashboard/pr-tools/calendar", icon: CalendarDaysIcon },
            { name: "Mediathek", href: "/dashboard/pr-tools/media-library", icon: PhotoIcon },
            { name: "Boilerplates", href: "/dashboard/pr-tools/boilerplates", icon: DocumentTextIcon },
        ],
    },
    {
        name: "Kommunikation",
        icon: EnvelopeIcon,
        current: pathname.startsWith('/dashboard/communication'),
        children: [
            { name: "Kampagnen In-Box", href: "/dashboard/communication/inbox", icon: InboxIcon },
            { name: "Benachrichtigungen", href: "/dashboard/communication/notifications", icon: BellIcon, notificationCount: unreadCount },
        ],
    },
    {
        name: "Academy",
        icon: AcademicCapIcon,
        current: pathname.startsWith('/dashboard/academy'),
        children: [
            { name: "Dokumentation", href: "/dashboard/academy/documentation", icon: BookOpenIcon },
            { name: "Einsteiger Tutorials", href: "/dashboard/academy/tutorials", icon: AcademicCapIcon },
            { name: "Blog", href: "/dashboard/academy/blog", icon: NewspaperIcon },
        ],
    },
  ];

  const settingsItems = [
    { name: "Benachrichtigungen", href: "/dashboard/settings/notifications", icon: BellAlertIcon },
    { name: "Branding", href: "/dashboard/settings/branding", icon: PaintBrushIcon },
    { name: "Domains", href: "/dashboard/settings/domain", icon: EnvelopeIcon },
    { name: "Import / Export", href: "/dashboard/settings/import-export", icon: ArrowDownTrayIcon },
  ];

  const userMenuItems = [
      { name: "Profil", href: "/dashboard/admin/profile", icon: UserIcon },
      { name: "Vertrag", href: "/dashboard/admin/contract", icon: DocumentCheckIcon },
      { name: "Abrechnung", href: "/dashboard/admin/billing", icon: CreditCardIcon },
      { name: "Integrationen", href: "/dashboard/admin/integrations", icon: PuzzlePieceIcon },
      { name: "API", href: "/dashboard/admin/api", icon: CodeBracketIcon },
  ];


  return (
    <ProtectedRoute>
      <CrmDataProvider>
        <StackedLayout
          navbar={
            <Navbar>
                <a href="/dashboard" className="flex-shrink-0">
                    <img
                        src="/logo_skamp.svg"
                        alt="SKAMP Logo"
                        className="h-10 w-auto max-w-[100px]"
                    />
                </a>
              <NavbarSection className="ml-4 flex items-center gap-x-6">
                {navigationItems.map((item) =>
                  item.children ? (
                    <Dropdown key={item.name}>
                      <DropdownButton as={NavbarItem} className={clsx('!border-transparent', item.current && 'bg-zinc-100 dark:bg-zinc-800/50')}>
                        <item.icon className="size-5 flex-shrink-0" />
                        <span>{item.name}</span>
                        <ChevronDownIcon className="size-4" />
                      </DropdownButton>
                      <DropdownMenu>
                        {item.children.map((child) => (
                          <DropdownItem href={child.href} key={child.name} className="flex cursor-pointer items-center gap-x-3 py-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                            <child.icon className="size-4 flex-shrink-0" />
                            <span>{child.name}</span>
                            {child.notificationCount && child.notificationCount > 0 && (
                               <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                 {child.notificationCount > 99 ? '99+' : child.notificationCount}
                               </span>
                            )}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <NavbarItem key={item.name} href={item.href} className={clsx('!border-transparent', item.current && 'bg-zinc-100 dark:bg-zinc-800/50')}>
                      <item.icon className="size-5" />
                      {item.name}
                    </NavbarItem>
                  )
                )}
              </NavbarSection>
              <NavbarSpacer />
              <NavbarSection className="flex items-center gap-x-4">
                <NavbarItem href="/dashboard/communication/notifications" aria-label="Benachrichtigungen" className="relative !border-transparent">
                    <BellIcon className="size-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center rounded-full bg-red-500 size-2" />
                    )}
                </NavbarItem>
                <Dropdown>
                    <DropdownButton as={NavbarItem} aria-label="Einstellungen" className="!border-transparent">
                        <Cog6ToothIcon className="size-6" />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                        {settingsItems.map(item => (
                            <DropdownItem href={item.href} key={item.name} className="flex cursor-pointer items-center gap-x-3 py-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                                <item.icon className="size-4 flex-shrink-0" />
                                <span>{item.name}</span>
                            </DropdownItem>
                        ))}
                    </DropdownMenu>
                </Dropdown>

<Dropdown>
                <DropdownButton className="bg-[#f4f4f5] hover:bg-[#f4f4f5] rounded-full p-0 focus:outline-none focus:ring-2 focus:ring-[#f4f4f5] focus:ring-opacity-100">
                  <Avatar
                    src={user?.photoURL || undefined}
                    initials={
                      user?.displayName?.split(" ").map((n) => n[0]).join("").toUpperCase() || 
                      user?.email?.[0].toUpperCase()
                    }
                    className="size-9"
                  />

                  </DropdownButton>
                  <DropdownMenu anchor="bottom end">
                    <DropdownItem href="/dashboard/admin/profile" className="cursor-pointer py-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
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
                        <DropdownItem href={item.href} key={item.name} className="flex cursor-pointer items-center gap-x-3 py-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                            <item.icon className="size-4 flex-shrink-0" />
                            <span>{item.name}</span>
                        </DropdownItem>
                    ))}
                    <DropdownDivider />
                    <DropdownItem onClick={handleLogout} className="flex cursor-pointer items-center gap-x-3 py-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                      <ArrowRightOnRectangleIcon className="size-4 flex-shrink-0" />
                      <span>Abmelden</span>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </NavbarSection>
            </Navbar>
          }
          sidebar={
            <Sidebar>
                <SidebarHeader>
                    <a href="/dashboard">
                        <img
                            src="/logo_skamp.svg"
                            alt="SKAMP Logo"
                            className="h-10 w-auto max-w-[150px]"
                        />
                    </a>
                </SidebarHeader>
                <SidebarBody>
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
                                        <DropdownItem href={child.href} key={child.name} className="flex cursor-pointer items-center gap-x-3 py-2 px-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                                            <child.icon className="size-4 flex-shrink-0" />
                                            <span>{child.name}</span>
                                            {child.notificationCount && child.notificationCount > 0 && (
                                               <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                                                 {child.notificationCount > 99 ? '99+' : child.notificationCount}
                                               </span>
                                            )}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                        ) : (
                            <SidebarItem href={item.href} key={item.name} current={item.current}>
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
        </StackedLayout>
      </CrmDataProvider>
    </ProtectedRoute>
  );
}
