// src/app/dashboard/admin/layout.tsx
"use client";

import { useTranslations } from 'next-intl';
import { AdminNav } from '@/components/AdminNav';
import { Divider } from "@/components/ui/divider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('admin.layout');

  return (
    <div className="flex flex-col gap-10 lg:flex-row">
      {/* Linke Spalte: Navigation */}
      <aside className="w-full lg:w-64 lg:flex-shrink-0">
        <div className="sticky top-8">
          <h2 className="text-base/7 font-semibold text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-1 text-sm/6 text-gray-600">
            {t('description')}
          </p>

          <Divider className="my-6" />

          <AdminNav />
        </div>
      </aside>

      {/* Rechte Spalte: Hauptinhalt */}
      <div className="flex-1 space-y-8">
        {children}
      </div>
    </div>
  );
}