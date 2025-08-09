// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Heading, Subheading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@/components/ui/description-list";
import { Divider } from "@/components/ui/divider";
import { ApprovalWidget } from '@/components/calendar/ApprovalWidget';
import { Select } from "@/components/ui/select";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserGroupIcon } from '@heroicons/react/24/outline';

// Komponente für den Welcome-Check mit useSearchParams
function WelcomeCheck({ onWelcome }: { onWelcome: () => void }) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      onWelcome();
      // URL aufräumen
      const url = new URL(window.location.href);
      url.searchParams.delete('welcome');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, onWelcome]);
  
  return null;
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const { currentOrganization, organizations, loading: orgLoading, switchOrganization, userRole } = useOrganization();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Welcome message für neue Team-Mitglieder
  const [showWelcome, setShowWelcome] = useState(false);

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

  // Role Labels
  const roleLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Team-Mitglied',
    client: 'Kunde',
    guest: 'Gast'
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab]"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Suspense Boundary für useSearchParams */}
      <Suspense fallback={null}>
        <WelcomeCheck onWelcome={() => setShowWelcome(true)} />
      </Suspense>
      
      {/* Welcome Banner für neue Mitglieder */}
      {showWelcome && (
        <div className="mb-8 rounded-lg bg-green-50 border border-green-200 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Willkommen im Team!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Sie wurden erfolgreich zum Team hinzugefügt. Ihre Rolle: <strong>{roleLabels[userRole || 'member']}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading>Willkommen bei CeleroPress</Heading>
            <Text className="mt-2">
              Hallo {user?.displayName || user?.email?.split("@")[0]}, schön dass
              du wieder da bist!
            </Text>
          </div>
          
          {/* Organization Switcher - nur wenn mehrere Orgs vorhanden */}
          {organizations.length > 1 && (
            <div className="flex items-center gap-4">
              <Text className="text-sm text-gray-600">Organisation:</Text>
              <Select
                value={currentOrganization?.id || ''}
                onChange={(e) => switchOrganization(e.target.value)}
                className="min-w-[200px]"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({roleLabels[org.role]})
                  </option>
                ))}
              </Select>
            </div>
          )}
          {/* Zeige aktuelle Rolle wenn nur eine Organisation */}
          {organizations.length === 1 && currentOrganization && (
            <Badge color="blue" className="flex items-center gap-1">
              <UserGroupIcon className="h-3 w-3" />
              {roleLabels[currentOrganization.role]}
            </Badge>
          )}
        </div>
      </div>

      {/* Keine Organisation Meldung */}
      {!currentOrganization && organizations.length === 0 && (
        <div className="mb-8 rounded-lg bg-yellow-50 border border-yellow-200 p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Keine Organisation gefunden
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Sie sind derzeit keiner Organisation zugeordnet. Bitte warten Sie auf eine Einladung oder kontaktieren Sie Ihren Administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Freigabe-Widget */}
      {currentOrganization && (
        <div className="mb-8">
          <ApprovalWidget
            key={`approval-${refreshKey}-${currentOrganization.id}`}
            userId={currentOrganization.id}
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
            
            <DescriptionTerm>Rolle</DescriptionTerm>
            <DescriptionDetails>
              <Badge color={userRole === 'owner' ? 'purple' : userRole === 'admin' ? 'blue' : 'green'}>
                {roleLabels[userRole || 'member']}
              </Badge>
            </DescriptionDetails>
            
            <DescriptionTerm>Organisation</DescriptionTerm>
            <DescriptionDetails>{currentOrganization?.name || 'Keine'}</DescriptionDetails>
            
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
          {currentOrganization?.id === user?.uid 
            ? "Hier entstehen bald deine Marketing-Tools. Als erstes kommt die Kontaktverwaltung!"
            : `Sie arbeiten jetzt in der Organisation: ${currentOrganization?.name}`
          }
        </Text>
      </div>
    </div>
  );
}