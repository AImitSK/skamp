// src/app/dashboard/settings/import-export/page.tsx
"use client";

import { useState } from 'react';
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { SettingsNav } from '@/components/SettingsNav';
import { CircleStackIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/20/solid";
import { seedDummyDataEnhanced } from 'src/scripts/seed-dummy-data';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function ImportExportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('settings.import');
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSeedData = async () => {
    if (!user) {
      setMessage({ type: 'error', text: t('errors.notLoggedIn') });
      return;
    }

    setIsSeeding(true);
    setMessage(null);

    try {
      await seedDummyDataEnhanced(user.uid);
      setMessage({ type: 'success', text: t('testData.successMessage') });

      // Nach 2 Sekunden zur CRM-Seite navigieren
      setTimeout(() => {
        router.push('/dashboard/contacts/crm');
      }, 2000);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: t('errors.seedDataFailed') });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      {/* Linke Spalte: Navigation */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <SettingsNav />
      </aside>

      {/* Rechte Spalte: Hauptinhalt */}
      <div className="flex-1 space-y-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <Heading>{t('title')}</Heading>
            <Text className="mt-2 text-zinc-600 dark:text-zinc-400">
              {t('description')}
            </Text>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <Text className="text-sm font-medium">{message.text}</Text>
          </div>
        )}

        {/* Content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Import Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6  dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20">
                <ArrowUpTrayIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">{t('import.title')}</h3>
            </div>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              {t('import.description')}
            </Text>
            <Button
              href="/dashboard/contacts/crm?import=true"
              className="w-full justify-center"
            >
              {t('import.button')}
            </Button>
          </div>

          {/* Export Card */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6  dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/20">
                <ArrowDownTrayIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold">{t('export.title')}</h3>
            </div>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              {t('export.description')}
            </Text>
            <Button
              href="/dashboard/contacts/crm"
              className="w-full justify-center"
            >
              {t('export.button')}
            </Button>
          </div>

          {/* Test Data Card - Only in Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-lg border border-zinc-200 bg-white p-6  dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/20">
                  <CircleStackIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold">{t('testData.title')}</h3>
              </div>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                {t('testData.description')}
              </Text>
              <Button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="w-full justify-center bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSeeding ? t('testData.buttonSeeding') : t('testData.button')}
              </Button>
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="rounded-lg bg-zinc-50 p-6 dark:bg-zinc-900/50">
          <h3 className="text-sm font-semibold mb-2">{t('hints.title')}</h3>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>• {t('hints.csvEncoding')}</li>
            <li>• {t('hints.importDuplicates')}</li>
            <li>• {t('hints.exportFields')}</li>
            {process.env.NODE_ENV === 'development' && (
              <li>• {t('hints.testDataDevOnly')}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}