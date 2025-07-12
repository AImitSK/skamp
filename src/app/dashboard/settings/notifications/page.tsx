// src/app/dashboard/settings/notifications/page.tsx
"use client";

import { Heading } from "@/components/heading";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { BellIcon } from "@heroicons/react/20/solid";

export default function NotificationSettingsPage() {
  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <BellIcon className="h-8 w-8 text-gray-400" />
            <Heading>Benachrichtigungen</Heading>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <NotificationSettings />
        </div>
      </div>
    </div>
  );
}