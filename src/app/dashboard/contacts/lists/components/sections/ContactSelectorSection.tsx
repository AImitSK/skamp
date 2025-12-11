// src/app/dashboard/contacts/lists/components/sections/ContactSelectorSection.tsx
"use client";

import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UsersIcon } from "@heroicons/react/24/outline";
import { ContactSelectorSectionProps } from './types';

export function ContactSelectorSection({ contactCount, onOpenSelector }: ContactSelectorSectionProps) {
  const t = useTranslations('lists.sections.contactSelector');

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="font-medium mb-2 text-gray-900">{t('title')}</h3>
      <Text className="text-sm mb-4">
        {t('description')}
      </Text>
      <Button
        type="button"
        onClick={onOpenSelector}
        className="whitespace-nowrap"
      >
        <UsersIcon />
        {t('button', { count: contactCount })}
      </Button>
    </div>
  );
}
