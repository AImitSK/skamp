// src/app/dashboard/settings/notifications/page.tsx
"use client";

import { useTranslations } from 'next-intl';
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { SettingsNav } from '@/components/SettingsNav';

export default function NotificationSettingsPage() {
  const t = useTranslations('settings.notifications');

  return (
    // Flex-Container für das zweispaltige Layout
    <div className="flex flex-col gap-10 lg:flex-row">

      {/* Linke Spalte: Navigation */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      {/* Rechte Spalte: Hauptinhalt */}
      <div className="flex-1">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="min-w-0 flex-1">
            <Heading level={1}>{t('title')}</Heading>
            <Text className="mt-2 text-gray-600">
              {t('description')}
            </Text>
          </div>
        </div>

        <div className="max-w-4xl">
          <div className="bg-white ring-1 ring-gray-900/5 sm:rounded-xl">
            <div className="px-4 py-6 sm:p-8">
              <NotificationSettings />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}