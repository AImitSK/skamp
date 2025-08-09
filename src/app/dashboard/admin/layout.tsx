// src/app/dashboard/admin/layout.tsx
"use client";

import { AdminNav } from '@/components/AdminNav';
import { Divider } from "@/components/ui/divider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          {/* Navigation Sidebar */}
          <aside className="md:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-base/7 font-semibold text-gray-900">
                Administration
              </h2>
              <p className="mt-1 text-sm/6 text-gray-600">
                Verwalte deinen Account und organisationsweite Einstellungen
              </p>
              
              <Divider className="my-6" />
              
              <AdminNav />
            </div>
          </aside>

          {/* Main Content */}
          <main className="md:col-span-2">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}