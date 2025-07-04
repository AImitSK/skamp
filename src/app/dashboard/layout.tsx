// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { CrmDataProvider } from "@/context/CrmDataContext";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client-init";
import { SidebarLayout } from "@/components/sidebar-layout";
import {
  Sidebar,
  SidebarHeader,
  SidebarBody,
  SidebarFooter,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarDivider,
} from "@/components/sidebar";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  DropdownLabel,
} from "@/components/dropdown";
import { Avatar } from "@/components/avatar";
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
  ArrowUpTrayIcon,
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Fehler beim Logout:", error);
    }
  };

  const sidebarContent = (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2">
          <img 
            src="/logo_skamp.svg" 
            alt="SKAMP Logo" 
            className="w-[120px] h-auto"
          />
        </div>
      </SidebarHeader>
      <SidebarBody className="mt-12">
        <SidebarSection>
          <nav className="flex flex-col gap-1">
            {/* Dashboard */}
            <SidebarItem
              href="/dashboard"
              current={pathname === '/dashboard'}
              className="text-white hover:bg-[#0693e3] dark:hover:bg-zinc-800 transition-colors"
            >
              <HomeIcon className="size-5 text-white" />
              <SidebarLabel className="text-white">Dashboard</SidebarLabel>
            </SidebarItem>

            {/* Kontakte Dropdown */}
            <Dropdown>
              <DropdownButton 
                as={SidebarItem}
                className="text-white hover:bg-[#0693e3] dark:hover:bg-zinc-800 transition-colors w-full"
              >
                <UserGroupIcon className="size-5 text-white" />
                <SidebarLabel className="text-white flex-1">Kontakte</SidebarLabel>
                <ChevronDownIcon className="size-4 text-white" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end" className="min-w-48">
                <DropdownItem 
                  href="/dashboard/contacts?tab=companies"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <BuildingOfficeIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Unternehmen</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="/dashboard/contacts?tab=contacts"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <UserGroupIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Personen</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="/dashboard/listen"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <QueueListIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Listen</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* PR-Tools Dropdown */}
            <Dropdown>
              <DropdownButton 
                as={SidebarItem}
                className="text-white hover:bg-[#0693e3] dark:hover:bg-zinc-800 transition-colors w-full"
              >
                <MegaphoneIcon className="size-5 text-white" />
                <SidebarLabel className="text-white flex-1">PR-Tools</SidebarLabel>
                <ChevronDownIcon className="size-4 text-white" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end" className="min-w-48">
                <DropdownItem 
                  href="/dashboard/pr"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <MegaphoneIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Kampagnen</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="/dashboard/freigaben"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <ShieldCheckIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Freigaben</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="/dashboard/calendar"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <CalendarDaysIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Kalender</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="/dashboard/mediathek"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <PhotoIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Mediathek</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="/dashboard/settings/boilerplates"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <DocumentTextIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Boilerplates</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* Kommunikation Dropdown */}
            <Dropdown>
              <DropdownButton 
                as={SidebarItem}
                className="text-white hover:bg-[#0693e3] dark:hover:bg-zinc-800 transition-colors w-full"
              >
                <EnvelopeIcon className="size-5 text-white" />
                <SidebarLabel className="text-white flex-1">Kommunikation</SidebarLabel>
                <ChevronDownIcon className="size-4 text-white" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end" className="min-w-48">
                <DropdownItem 
                  href="#"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <InboxIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Kampagnen In-Box</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="#"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <BellIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Benachrichtigungen</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* Academy Dropdown */}
            <Dropdown>
              <DropdownButton 
                as={SidebarItem}
                className="text-white hover:bg-[#0693e3] dark:hover:bg-zinc-800 transition-colors w-full"
              >
                <AcademicCapIcon className="size-5 text-white" />
                <SidebarLabel className="text-white flex-1">Academy</SidebarLabel>
                <ChevronDownIcon className="size-4 text-white" />
              </DropdownButton>
              <DropdownMenu anchor="bottom end" className="min-w-48">
                <DropdownItem 
                  href="#"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <BookOpenIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Dokumentation</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="#"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <AcademicCapIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Einsteiger Tutorials</DropdownLabel>
                </DropdownItem>
                <DropdownItem 
                  href="#"
                  className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
                >
                  <NewspaperIcon className="size-4 flex-shrink-0" />
                  <DropdownLabel>Blog</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </nav>
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        
        {/* Einstellungen Dropdown */}
        <Dropdown>
          <DropdownButton 
            as={SidebarItem}
            className="text-white hover:bg-[#0693e3] dark:hover:bg-zinc-800 transition-colors w-full"
          >
            <Cog6ToothIcon className="size-5 text-white" />
            <SidebarLabel className="text-white flex-1">Einstellungen</SidebarLabel>
            <ChevronDownIcon className="size-4 text-white" />
          </DropdownButton>
          <DropdownMenu anchor="top end" className="min-w-48">
            <DropdownItem 
              href="#"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <BellAlertIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Benachrichtigungen</DropdownLabel>
            </DropdownItem>
            <DropdownItem 
              href="#"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <PaintBrushIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Branding</DropdownLabel>
            </DropdownItem>
            <DropdownItem 
              href="#"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <ArrowDownTrayIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Import / Export</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
        <SidebarDivider />

        <Dropdown>
          <DropdownButton 
            as={SidebarItem}
            className="hover:bg-[#0693e3] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Avatar
              src={user?.photoURL || undefined}
              initials={
                user?.displayName
                  ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase()
                  : user?.email?.[0].toUpperCase()
              }
              className="size-8"
            />
            <SidebarLabel className="flex-1">
              <div className="flex flex-col">
                <span className="truncate text-white">
                  {user?.displayName || user?.email?.split("@")[0]}
                </span>
                <span className="text-xs text-[#ffffff] dark:text-[#ffffff] truncate">
                  {user?.email}
                </span>
              </div>
            </SidebarLabel>
            <ChevronDownIcon className="size-4 text-white" />
          </DropdownButton>
          <DropdownMenu anchor="top end" className="min-w-56">
            <DropdownItem 
              href="/dashboard/profile"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <UserIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Profil</DropdownLabel>
            </DropdownItem>
            <DropdownItem 
              href="#"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <DocumentCheckIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Vertrag</DropdownLabel>
            </DropdownItem>
            <DropdownItem 
              href="#"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <CreditCardIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Abrechnung</DropdownLabel>
            </DropdownItem>
            <DropdownItem 
              href="#"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <PuzzlePieceIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Integrationen</DropdownLabel>
            </DropdownItem>
            <DropdownItem 
              href="#"
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <CodeBracketIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>API</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem 
              onClick={handleLogout}
              className="hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3"
            >
              <ArrowRightOnRectangleIcon className="size-4 flex-shrink-0" />
              <DropdownLabel>Abmelden</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );

  return (
    <ProtectedRoute>
      <CrmDataProvider>
        <SidebarLayout 
          navbar={
            <div className="flex items-center justify-between px-4">
              <h1 className="text-base font-semibold text-zinc-950 dark:text-white">
                SKAMP Marketing Suite
              </h1>
            </div>
          }
          sidebar={sidebarContent}
        >
          {children}
        </SidebarLayout>
      </CrmDataProvider>
    </ProtectedRoute>
  );
}