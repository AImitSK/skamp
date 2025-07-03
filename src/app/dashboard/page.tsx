// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Heading, Subheading } from "@/components/heading";
import { Text } from "@/components/text";
import { Badge } from "@/components/badge";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@/components/description-list";
import { Divider } from "@/components/divider";
import { ApprovalWidget } from '@/components/calendar/ApprovalWidget';
import { useState } from 'react';

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Formatiere das Erstellungsdatum
  const accountCreated = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unbekannt";

  const lastSignIn = user?.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleDateString("de-DE", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unbekannt";

  const handleDataRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div>
      <div className="mb-8">
        <Heading>Willkommen bei SKAMP</Heading>
        <Text className="mt-2">
          Hallo {user?.displayName || user?.email?.split("@")[0]}, schön dass
          du wieder da bist!
        </Text>
      </div>

      {/* Freigabe-Widget */}
      {user?.uid && (
        <div className="mb-8">
          <ApprovalWidget
            key={`approval-${refreshKey}`}
            userId={user.uid}
            onRefresh={handleDataRefresh}
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Schnellzugriff */}
        <div className="rounded-lg border border-zinc-950/10 p-6 dark:border-white/10">
          <Subheading level={2}>Schnellzugriff</Subheading>
          <Text className="mt-2">
            Hier findest du bald Schnellzugriffe auf deine wichtigsten
            Funktionen.
          </Text>
          <div className="mt-4 flex gap-2">
            <Badge color="blue">CRM</Badge>
            <Badge color="zinc">Coming Soon</Badge>
          </div>
        </div>

        {/* Account-Informationen */}
        <div className="rounded-lg border border-zinc-950/10 p-6 dark:border-white/10">
          <Subheading level={2}>Account-Informationen</Subheading>
          <Divider className="my-4" soft />
          <DescriptionList>
            <DescriptionTerm>E-Mail</DescriptionTerm>
            <DescriptionDetails>{user?.email}</DescriptionDetails>
            
            <DescriptionTerm>Account erstellt</DescriptionTerm>
            <DescriptionDetails>{accountCreated}</DescriptionDetails>
            
            <DescriptionTerm>Letzte Anmeldung</DescriptionTerm>
            <DescriptionDetails>{lastSignIn}</DescriptionDetails>
            
            <DescriptionTerm>Status</DescriptionTerm>
            <DescriptionDetails>
              <Badge color="green">Aktiv</Badge>
            </DescriptionDetails>
          </DescriptionList>
        </div>
      </div>

      {/* Statistiken Platzhalter */}
      <div className="mt-8 rounded-lg bg-zinc-50 p-8 text-center dark:bg-zinc-900/50">
        <Subheading level={2}>Deine Marketing-Zentrale</Subheading>
        <Text className="mt-2">
          Hier entstehen bald deine Marketing-Tools. Als erstes kommt die
          Kontaktverwaltung!
        </Text>
      </div>
    </div>
  );
}