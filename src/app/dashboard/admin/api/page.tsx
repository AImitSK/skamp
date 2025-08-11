// src/app/dashboard/admin/api/page.tsx
"use client";

import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Divider } from "@/components/ui/divider";
import { APIKeyManager } from "@/components/admin/api/APIKeyManager";

export default function APIPage() {
  return (
    <div>
      <Heading>API-Verwaltung</Heading>
      <Text className="mt-2">
        Verwalte API-Keys und Integrationen für externe Services wie Salesforce, HubSpot und individuelle CRM-Systeme
      </Text>

      <Divider className="my-8" />

      {/* API Keys Management */}
      <APIKeyManager className="mb-12" />

      <Divider className="my-8" />

      {/* Developer Portal Link */}
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Vollständige API-Dokumentation</h3>
        <Text className="mb-4">
          Für die komplette API-Dokumentation, Testing-Tools und Integration-Beispiele besuche unser Developer Portal.
        </Text>
        <a
          href="/dashboard/developer"
          className="inline-flex items-center bg-primary hover:bg-primary-hover text-white border-0 rounded-md px-6 py-3 text-sm font-medium"
        >
          Zum Developer Portal
        </a>
      </div>
    </div>
  );
}