// src/app/dashboard/admin/integrations/page.tsx
"use client";

import { useTranslations } from "next-intl";
import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import {
  LinkIcon,
  EnvelopeIcon,
  ChartBarIcon,
  CogIcon
} from "@heroicons/react/24/outline";

export default function IntegrationsPage() {
  const t = useTranslations("admin.integrations");

  return (
    <div>
      <Heading>{t("title")}</Heading>
      <Text className="mt-2">
        {t("description")}
      </Text>

      <Divider className="my-8" />

      {/* Verfügbare Integrationen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* E-Mail-Services */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            <div>
              <Text className="font-semibold">{t("cards.email.title")}</Text>
              <Text className="text-sm text-zinc-500">{t("cards.email.providers")}</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            {t("cards.email.description")}
          </Text>
          <Button plain disabled className="w-full">
            {t("cards.email.action")}
          </Button>
        </div>

        {/* Analytics */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <ChartBarIcon className="h-8 w-8 text-green-600" />
            <div>
              <Text className="font-semibold">{t("cards.analytics.title")}</Text>
              <Text className="text-sm text-zinc-500">{t("cards.analytics.providers")}</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            {t("cards.analytics.description")}
          </Text>
          <Button plain disabled className="w-full">
            {t("cards.analytics.action")}
          </Button>
        </div>

        {/* CRM-Systeme */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <LinkIcon className="h-8 w-8 text-purple-600" />
            <div>
              <Text className="font-semibold">{t("cards.crm.title")}</Text>
              <Text className="text-sm text-zinc-500">{t("cards.crm.providers")}</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            {t("cards.crm.description")}
          </Text>
          <Button plain disabled className="w-full">
            {t("cards.crm.action")}
          </Button>
        </div>

        {/* Webhook */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <CogIcon className="h-8 w-8 text-orange-600" />
            <div>
              <Text className="font-semibold">{t("cards.webhooks.title")}</Text>
              <Text className="text-sm text-zinc-500">{t("cards.webhooks.providers")}</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            {t("cards.webhooks.description")}
          </Text>
          <Button plain disabled className="w-full">
            {t("cards.webhooks.action")}
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-8">
        <Subheading level={2}>{t("activeConnections.title")}</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          {t("activeConnections.subtitle")}
        </Text>

        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="text-center">
            <Text className="font-medium">{t("activeConnections.empty")}</Text>
            <Text className="text-sm text-zinc-500 mt-1">
              {t("activeConnections.futureAvailability")}
            </Text>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <Button color="indigo" disabled>
          {t("actions.addIntegration")}
        </Button>
        <Button plain disabled>
          {t("actions.openDocumentation")}
        </Button>
      </div>
    </div>
  );
}