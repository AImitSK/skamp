// src/components/mediathek/LoadingSpinner.tsx
"use client";

import { useTranslations } from 'next-intl';
import { Text } from "@/components/ui/text";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message
}: LoadingSpinnerProps) {
  const t = useTranslations('common');
  const displayMessage = message || t('loading');

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
        <Text className="mt-4">{displayMessage}</Text>
      </div>
    </div>
  );
}
