// src/app/dashboard/admin/api/page.tsx
"use client";

import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Divider } from "@/components/ui/divider";
import { APIKeyManager } from "@/components/admin/api/APIKeyManager";
import { APIDocumentation } from "@/components/admin/api/APIDocumentation";

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

      {/* API Documentation */}
      <APIDocumentation />
    </div>
  );
}