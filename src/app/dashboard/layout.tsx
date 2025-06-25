// src/app/dashboard/layout.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { CrmDataProvider } from "@/context/CrmDataContext"; // NEU: Import des Daten-Providers
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
  UsersIcon, 
  UserIcon, 
  ArrowRightOnRectangleIcon,
  QueueListIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  PhotoIcon
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

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Kontakte", href: "/dashboard/contacts", icon: UsersIcon },
    { name: "Listen", href: "/dashboard/listen", icon: QueueListIcon },
    { name: "PR-Tools", href: "/dashboard/pr", icon: MegaphoneIcon },
    { name: "Mediathek", href: "/dashboard/mediathek", icon: PhotoIcon },
    { name: "Einstellungen", href: "/dashboard/settings/boilerplates", icon: Cog6ToothIcon },
  ];

  const sidebarContent = (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <span className="text-sm font-semibold">S</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-950 dark:text-white">
              SKAMP
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Marketing Suite
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarBody>
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarItem
                key={item.name}
                href={item.href}
                current={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
              >
                <Icon className="size-5" data-slot="icon" />
                <SidebarLabel>{item.name}</SidebarLabel>
              </SidebarItem>
            );
          })}
        </nav>
      </SidebarBody>
      <SidebarFooter>
        <Dropdown>
          <DropdownButton as={SidebarItem}>
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
                <span className="truncate">
                  {user?.displayName || user?.email?.split("@")[0]}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.email}
                </span>
              </div>
            </SidebarLabel>
          </DropdownButton>
          <DropdownMenu anchor="top start" className="min-w-56">
            <DropdownItem href="/dashboard/profile">
              <UserIcon className="size-4" data-slot="icon" />
              <DropdownLabel>Profil</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem onClick={handleLogout}>
              <ArrowRightOnRectangleIcon className="size-4" data-slot="icon" />
              <DropdownLabel>Abmelden</DropdownLabel>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </SidebarFooter>
    </Sidebar>
  );

  return (
    <ProtectedRoute>
      {/* KORRIGIERT: Der CrmDataProvider umschließt jetzt das gesamte Layout */}
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