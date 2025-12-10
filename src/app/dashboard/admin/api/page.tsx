// src/app/dashboard/admin/api/page.tsx
"use client";

import { useTranslations } from 'next-intl';
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Divider } from "@/components/ui/divider";
import { APIKeyManager } from "@/components/admin/api/APIKeyManager";

export default function APIPage() {
  const t = useTranslations('admin.api');

  return (
    <div>
      <Heading>{t('title')}</Heading>
      <Text className="mt-2">
        {t('description')}
      </Text>

      <Divider className="my-8" />

      {/* API Keys Management */}
      <APIKeyManager className="mb-12" />

      <Divider className="my-8" />

      {/* Developer Portal Link */}
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">{t('developerPortal.title')}</h3>
        <Text className="mb-4">
          {t('developerPortal.description')}
        </Text>
        <a
          href="/dashboard/developer"
          className="inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-6 py-3 text-sm font-medium"
        >
          {t('developerPortal.button')}
        </a>
      </div>
    </div>
  );
}