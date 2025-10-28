'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Organization } from '@/types/organization';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import SubscriptionManagement from '@/components/subscription/SubscriptionManagement';
import toast from 'react-hot-toast';

export default function BillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [fixLoading, setFixLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrganization();
    }
  }, [user]);

  const fetchOrganization = async () => {
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/subscription/organization', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixOrganization = async () => {
    setFixLoading(true);
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/fix-my-org', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Organization erfolgreich aktualisiert!');
        fetchOrganization(); // Reload
      } else {
        toast.error(data.error || 'Fehler beim Aktualisieren');
      }
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Aktualisieren');
    } finally {
      setFixLoading(false);
    }
  };

  if (!user) {
    return (
      <div>
        <Heading>Abrechnung</Heading>
        <Text className="mt-2">Bitte melde dich an.</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <Heading>Abrechnung</Heading>
        <Text className="mt-2">Lädt...</Text>
      </div>
    );
  }

  if (!organization) {
    return (
      <div>
        <Heading>Abrechnung</Heading>
        <Text className="mt-2">Organization nicht gefunden.</Text>
      </div>
    );
  }

  const hasSubscription = !!organization.stripeSubscriptionId;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading>Abrechnung & Subscription</Heading>
          <Text className="mt-2">
            Verwalte deine Subscription, Zahlungsmethoden und Nutzung
          </Text>
        </div>
        {!hasSubscription && (
          <Button color="amber" onClick={handleFixOrganization} disabled={fixLoading}>
            {fixLoading ? 'Aktualisiere...' : '🔧 Subscription Sync'}
          </Button>
        )}
      </div>

      <Divider className="my-8" />

      {hasSubscription ? (
        <SubscriptionManagement
          organization={organization}
          onUpgrade={() => {
            // TODO: Implement pricing/upgrade flow
            toast('Upgrade Flow wird demnächst implementiert', {
              icon: 'ℹ️',
            });
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Kein Subscription Hinweis */}
          <div className="p-6 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <Text className="font-semibold text-lg">Keine aktive Subscription gefunden</Text>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              Du hast derzeit keine aktive Stripe-Subscription. Falls du bereits eine Zahlung getätigt hast,
              klicke auf "Subscription Sync" oben rechts.
            </Text>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              Kontaktiere support@celeropress.com für eine neue Subscription.
            </Text>
          </div>

          {/* Debug Info */}
          <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <Subheading level={2}>Organization Details (Debug)</Subheading>
            <div className="mt-4 space-y-2 text-sm font-mono">
              <div>
                <span className="text-zinc-500">ID:</span> {organization.id}
              </div>
              <div>
                <span className="text-zinc-500">Tier:</span> {organization.tier}
              </div>
              <div>
                <span className="text-zinc-500">Account Type:</span> {organization.accountType}
              </div>
              <div>
                <span className="text-zinc-500">Stripe Customer:</span>{' '}
                {organization.stripeCustomerId || 'Nicht vorhanden'}
              </div>
              <div>
                <span className="text-zinc-500">Stripe Subscription:</span>{' '}
                {organization.stripeSubscriptionId || 'Nicht vorhanden'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
