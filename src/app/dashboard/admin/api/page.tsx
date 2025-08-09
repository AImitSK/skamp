// src/app/dashboard/admin/api/page.tsx
"use client";

import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { KeyIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function APIPage() {
  return (
    <div>
      <Heading>API-Verwaltung</Heading>
      <Text className="mt-2">
        Verwalte API-Keys und Integrationen für externe Services
      </Text>

      <Divider className="my-8" />

      {/* API Keys Sektion */}
      <div className="mb-8">
        <Subheading level={2}>API-Schlüssel</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          Erstelle und verwalte API-Keys für die Authentifizierung
        </Text>
        
        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <KeyIcon className="h-8 w-8 text-zinc-400" />
            <div>
              <Text className="font-medium">API-Management</Text>
              <Text className="text-sm text-zinc-500">Wird in einer zukünftigen Version verfügbar sein</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Dokumentation Sektion */}
      <div className="mb-8">
        <Subheading level={2}>API-Dokumentation</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          Entwicklerressourcen und Integration-Guides
        </Text>
        
        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-zinc-400" />
            <div>
              <Text className="font-medium">Entwickler-Dokumentation</Text>
              <Text className="text-sm text-zinc-500">Vollständige API-Docs werden bereitgestellt</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <Button color="indigo" disabled>
          API-Key erstellen
        </Button>
        <Button plain disabled>
          Dokumentation öffnen
        </Button>
      </div>
    </div>
  );
}