"use client";

import { useState, useEffect } from 'react';
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SettingsNav } from '@/components/SettingsNav';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';

export default function SpamBlocklistPage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Load spam patterns
    setLoading(false);
  }, [currentOrganization?.id]);

  if (loading) {
    return (
      <div className="flex h-full">
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-6">
          <SettingsNav />
        </aside>
        <main className="flex-1 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 p-6">
        <SettingsNav />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-4xl">
          <Heading>Spam-Blocklist</Heading>
          <Text className="mt-2 text-gray-600">
            Verwalten Sie globale Spam-Filter für das Monitoring-System.
          </Text>

          {/* Content wird in Phase 4.2 implementiert */}
          <div className="mt-8 p-8 bg-gray-50 rounded-lg text-center">
            <Text className="text-gray-500">
              Spam-Blocklist Verwaltung wird in Phase 4.2 implementiert.
            </Text>
          </div>
        </div>
      </main>
    </div>
  );
}
