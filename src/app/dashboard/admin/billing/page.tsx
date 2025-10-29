'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Organization } from '@/types/organization';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import SubscriptionManagement from '@/components/subscription/SubscriptionManagement';
import ChangePlanModal from '@/components/subscription/ChangePlanModal';
import toast from 'react-hot-toast';
import { Popover, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function BillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [fixLoading, setFixLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);

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

  const handleSyncUsage = async () => {
    setSyncLoading(true);
    try {
      const { auth } = await import('@/lib/firebase/client-init');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/sync-usage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Billing] Usage Sync erfolgreich:', data.usage);
        toast.success(`Usage synchronisiert: ${data.usage.contacts} Kontakte, ${data.usage.teamMembers} Team-Mitglieder`);
        fetchOrganization(); // Reload
      } else {
        console.error('[Billing] Usage Sync fehlgeschlagen:', data.error);
        toast.error(data.error || 'Fehler beim Synchronisieren');
      }
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Synchronisieren');
    } finally {
      setSyncLoading(false);
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
  const isSpecialAccount = ['beta', 'promo', 'internal'].includes(organization.accountType);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading>Abrechnung & Subscription</Heading>
          <Text className="mt-2">
            Verwalte deine Subscription, Zahlungsmethoden und Nutzung
          </Text>
        </div>
        <div className="flex gap-2">
          {!hasSubscription && !isSpecialAccount && (
            <Button color="amber" onClick={handleFixOrganization} disabled={fixLoading}>
              {fixLoading ? 'Aktualisiere...' : '🔧 Subscription Sync'}
            </Button>
          )}

          {/* Actions Menu (3-Punkte) */}
          <Popover className="relative">
            <Popover.Button className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white p-2.5 text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 h-10 w-10">
              <EllipsisVerticalIcon className="h-5 w-5 stroke-[2.5]" />
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-zinc-800 dark:ring-zinc-700">
                <div className="py-1">
                  <button
                    onClick={handleSyncUsage}
                    disabled={syncLoading}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50"
                  >
                    <ArrowPathIcon className={clsx("h-4 w-4", syncLoading && "animate-spin")} />
                    Usage aktualisieren
                  </button>
                </div>
              </Popover.Panel>
            </Transition>
          </Popover>
        </div>
      </div>

      <Divider className="my-8" />

      {hasSubscription ? (
        <>
          <SubscriptionManagement
            organization={organization}
            onUpgrade={() => setChangePlanModalOpen(true)}
          />

          <ChangePlanModal
            isOpen={changePlanModalOpen}
            onClose={() => setChangePlanModalOpen(false)}
            currentTier={organization.tier}
            stripeSubscriptionId={organization.stripeSubscriptionId || ''}
          />
        </>
      ) : isSpecialAccount ? (
        <div className="space-y-6">
          {/* Beta/Special Account Info */}
          <div className="p-6 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <div>
                <Text className="font-semibold text-lg">
                  {organization.accountType === 'beta' && 'Beta-Tester Account'}
                  {organization.accountType === 'promo' && 'Promo Account'}
                  {organization.accountType === 'internal' && 'Interner Account'}
                </Text>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  Voller Zugang zu allen Features ohne Limits
                </Text>
              </div>
            </div>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              {organization.accountType === 'beta' &&
                'Als Beta-Tester hast du vollen Zugang zu allen Premium-Features während der Testphase. Keine Zahlungsinformationen erforderlich.'}
              {organization.accountType === 'promo' &&
                'Dein Promo-Code gewährt dir vollen Zugang zu allen Premium-Features.'}
              {organization.accountType === 'internal' &&
                'Dies ist ein interner CeleroPress Account mit unbegrenztem Zugang.'}
            </Text>
            {organization.promoDetails?.expiresAt && (
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                ⏰ Gültig bis: {new Date(organization.promoDetails.expiresAt.toString()).toLocaleDateString('de-DE')}
              </Text>
            )}
          </div>

          {/* Current Usage für Special Accounts */}
          {organization.usage && (
            <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800">
              <Subheading level={2}>Aktuelle Nutzung</Subheading>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text className="text-sm text-zinc-500">Team-Mitglieder</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.teamMembersActive} <span className="text-base font-normal text-blue-600">/ Unlimited</span>
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-zinc-500">Kontakte</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.contactsTotal} <span className="text-base font-normal text-blue-600">/ Unlimited</span>
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-zinc-500">E-Mails versendet</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.emailsSent} <span className="text-base font-normal text-blue-600">/ Unlimited</span>
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-zinc-500">AI-Wörter</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.aiWordsUsed} <span className="text-base font-normal text-blue-600">/ Unlimited</span>
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Kein Subscription Hinweis (nur für regular accounts ohne subscription) */}
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
