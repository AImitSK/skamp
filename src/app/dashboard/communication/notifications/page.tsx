// src/app/dashboard/communication/notifications/page.tsx
"use client";

import { Heading } from "@/components/heading";
import { NotificationList } from "@/components/notifications/NotificationList";
import { Button } from "@/components/button";
import { BellIcon, Cog6ToothIcon } from "@heroicons/react/20/solid";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <div className="h-full flex flex-col">
      <div className="md:flex md:items-center md:justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <BellIcon className="h-8 w-8 text-gray-400" />
            <Heading>Benachrichtigungen</Heading>
          </div>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button 
            plain
            onClick={() => router.push('/dashboard/settings/notifications')}
          >
            <Cog6ToothIcon className="h-4 w-4" />
            Einstellungen
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl mx-4 mb-4 sm:mx-6 lg:mx-8 overflow-hidden">
        <NotificationList />
      </div>
    </div>
  );
}