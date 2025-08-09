// src/app/dashboard/admin/billing/page.tsx
"use client";

import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { CreditCardIcon, DocumentTextIcon, CalendarIcon } from "@heroicons/react/24/outline";

export default function BillingPage() {
  return (
    <div>
      <Heading>Abrechnung</Heading>
      <Text className="mt-2">
        Verwalte deine Rechnungen, Zahlungsmethoden und Abrechnungseinstellungen
      </Text>

      <Divider className="my-8" />

      {/* Aktueller Plan */}
      <div className="mb-8">
        <Subheading level={2}>Aktueller Plan</Subheading>
        <div className="mt-4 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg">
              <CreditCardIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <Text className="font-semibold text-lg">Professional Plan</Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Aktiv seit Januar 2025 • Nächste Abrechnung: 15. Februar 2025
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Rechnungshistorie */}
      <div className="mb-8">
        <Subheading level={2}>Rechnungshistorie</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          Lade vergangene Rechnungen herunter und verwalte Zahlungsdetails
        </Text>
        
        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-zinc-400" />
            <div>
              <Text className="font-medium">Rechnungsmanagement</Text>
              <Text className="text-sm text-zinc-500">Vollständige Rechnungshistorie wird bereitgestellt</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Zahlungsmethoden */}
      <div className="mb-8">
        <Subheading level={2}>Zahlungsmethoden</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          Kreditkarten und andere Zahlungsoptionen verwalten
        </Text>
        
        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-zinc-400" />
            <div>
              <Text className="font-medium">Zahlungseinstellungen</Text>
              <Text className="text-sm text-zinc-500">Sichere Zahlungsoptionen werden integriert</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <Button color="indigo" disabled>
          Plan upgraden
        </Button>
        <Button plain disabled>
          Rechnung herunterladen
        </Button>
      </div>
    </div>
  );
}