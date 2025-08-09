// src/app/dashboard/admin/contract/page.tsx
"use client";

import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { DocumentTextIcon, CalendarIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function ContractPage() {
  return (
    <div>
      <Heading>Vertragsdetails</Heading>
      <Text className="mt-2">
        Überblick über deinen CeleroPress-Vertrag und Servicebedingungen
      </Text>

      <Divider className="my-8" />

      {/* Vertragsstatus */}
      <div className="mb-8">
        <Subheading level={2}>Vertragsstatus</Subheading>
        <div className="mt-4 p-6 border border-green-200 dark:border-green-700 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <Text className="font-semibold text-lg">Aktiver Professional-Vertrag</Text>
              <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                Laufzeit: 1 Jahr • Verlängerung: Automatisch • Kündigung: 30 Tage
              </Text>
            </div>
          </div>
        </div>
      </div>

      {/* Vertragsdokumente */}
      <div className="mb-8">
        <Subheading level={2}>Dokumente</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          Lade Vertragsdokumente und Servicebedingungen herunter
        </Text>
        
        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-zinc-400" />
            <div>
              <Text className="font-medium">Vertragsdokumente</Text>
              <Text className="text-sm text-zinc-500">PDF-Downloads werden bereitgestellt</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Vertragsende */}
      <div className="mb-8">
        <Subheading level={2}>Kündigung</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          Vertragsbeendigung und Datenexport verwalten
        </Text>
        
        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-zinc-400" />
            <div>
              <Text className="font-medium">Kündigungsmanagement</Text>
              <Text className="text-sm text-zinc-500">Kündigungsoptionen werden bereitgestellt</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <Button color="indigo" disabled>
          Vertrag herunterladen
        </Button>
        <Button plain disabled>
          Support kontaktieren
        </Button>
      </div>
    </div>
  );
}