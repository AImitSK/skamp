// src/app/dashboard/admin/integrations/page.tsx
"use client";

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
  return (
    <div>
      <Heading>Integrationen</Heading>
      <Text className="mt-2">
        Verbinde CeleroPress mit deinen bestehenden Tools und Services
      </Text>

      <Divider className="my-8" />

      {/* Verfügbare Integrationen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* E-Mail-Services */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <EnvelopeIcon className="h-8 w-8 text-blue-600" />
            <div>
              <Text className="font-semibold">E-Mail-Services</Text>
              <Text className="text-sm text-zinc-500">SendGrid, Mailgun, AWS SES</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            Konfiguriere professionelle E-Mail-Versand-Services für deine Kampagnen
          </Text>
          <Button plain disabled className="w-full">
            Konfigurieren
          </Button>
        </div>

        {/* Analytics */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <ChartBarIcon className="h-8 w-8 text-green-600" />
            <div>
              <Text className="font-semibold">Analytics</Text>
              <Text className="text-sm text-zinc-500">Google Analytics, Mixpanel</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            Verknüpfe deine Analytics-Tools für detailliertes Tracking
          </Text>
          <Button plain disabled className="w-full">
            Verbinden
          </Button>
        </div>

        {/* CRM-Systeme */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <LinkIcon className="h-8 w-8 text-purple-600" />
            <div>
              <Text className="font-semibold">CRM-Integration</Text>
              <Text className="text-sm text-zinc-500">Salesforce, HubSpot, Pipedrive</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            Synchronisiere Kontakte mit deinem bestehenden CRM-System
          </Text>
          <Button plain disabled className="w-full">
            Einrichten
          </Button>
        </div>

        {/* Webhook */}
        <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3 mb-4">
            <CogIcon className="h-8 w-8 text-orange-600" />
            <div>
              <Text className="font-semibold">Webhooks</Text>
              <Text className="text-sm text-zinc-500">Custom API-Endpunkte</Text>
            </div>
          </div>
          <Text className="text-sm mb-4">
            Erstelle benutzerdefinierte Webhook-Integrationen
          </Text>
          <Button plain disabled className="w-full">
            Webhook erstellen
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-8">
        <Subheading level={2}>Aktive Verbindungen</Subheading>
        <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
          Derzeit sind keine Integrationen konfiguriert
        </Text>
        
        <div className="mt-6 p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          <div className="text-center">
            <Text className="font-medium">Keine aktiven Integrationen</Text>
            <Text className="text-sm text-zinc-500 mt-1">
              Integrationen werden in einer zukünftigen Version verfügbar sein
            </Text>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <Button color="indigo" disabled>
          Integration hinzufügen
        </Button>
        <Button plain disabled>
          Dokumentation öffnen
        </Button>
      </div>
    </div>
  );
}