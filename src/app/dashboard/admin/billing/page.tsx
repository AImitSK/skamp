'use client';

import { useState, useEffect, Fragment } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';
import { Heading, Subheading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';
import { Organization } from '@/types/organization';
import { SUBSCRIPTION_LIMITS } from '@/config/subscription-limits';
import SubscriptionManagement from '@/components/subscription/SubscriptionManagement';
import ChangePlanModal from '@/components/subscription/ChangePlanModal';
import { toastService } from '@/lib/utils/toast';
import { Popover, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function BillingPage() {
  const { user } = useAuth();
  const t = useTranslations('admin.billing');
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
        toastService.success('Organization erfolgreich aktualisiert!');
        fetchOrganization(); // Reload
      } else {
        toastService.error(data.error || 'Fehler beim Aktualisieren');
      }
    } catch (error: any) {
      toastService.error(error.message || 'Fehler beim Aktualisieren');
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
        toastService.success(`Usage synchronisiert: ${data.usage.contacts} Kontakte, ${data.usage.teamMembers} Team-Mitglieder`);
        fetchOrganization(); // Reload
      } else {
        console.error('[Billing] Usage Sync fehlgeschlagen:', data.error);
        toastService.error(data.error || 'Fehler beim Synchronisieren');
      }
    } catch (error: any) {
      toastService.error(error.message || 'Fehler beim Synchronisieren');
    } finally {
      setSyncLoading(false);
    }
  };

  if (!user) {
    return (
      <div>
        <Heading>{t('title')}</Heading>
        <Text className="mt-2">{t('pleaseLogin')}</Text>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <Heading>{t('title')}</Heading>
        <Text className="mt-2">{t('loading')}</Text>
      </div>
    );
  }

  if (!organization) {
    return (
      <div>
        <Heading>{t('title')}</Heading>
        <Text className="mt-2">{t('organizationNotFound')}</Text>
      </div>
    );
  }

  const hasSubscription = !!organization.stripeSubscriptionId;
  const isSpecialAccount = ['beta', 'promo', 'internal'].includes(organization.accountType);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading>{t('headingWithSubscription')}</Heading>
          <Text className="mt-2">
            {t('description')}
          </Text>
        </div>
        <div className="flex gap-2">
          {!hasSubscription && !isSpecialAccount && (
            <Button color="secondary" onClick={handleFixOrganization} disabled={fixLoading}>
              {fixLoading ? t('syncButtonLoading') : t('syncButton')}
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
                    {t('usageRefreshButton')}
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
                  {organization.accountType === 'beta' && t('specialAccount.betaTitle')}
                  {organization.accountType === 'promo' && t('specialAccount.promoTitle')}
                  {organization.accountType === 'internal' && t('specialAccount.internalTitle')}
                </Text>
                <Text className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t('specialAccount.fullAccess')}
                </Text>
              </div>
            </div>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              {organization.accountType === 'beta' && t('specialAccount.betaDescription')}
              {organization.accountType === 'promo' && t('specialAccount.promoDescription')}
              {organization.accountType === 'internal' && t('specialAccount.internalDescription')}
            </Text>
            {organization.promoDetails?.expiresAt && (
              <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                {t('specialAccount.validUntil', {
                  date: new Date(organization.promoDetails.expiresAt.toString()).toLocaleDateString('de-DE')
                })}
              </Text>
            )}
          </div>

          {/* Current Usage für Special Accounts */}
          {organization.usage && (
            <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800">
              <Subheading level={2}>{t('usage.title')}</Subheading>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text className="text-sm text-zinc-500">{t('usage.teamMembers')}</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.teamMembersActive} <span className="text-base font-normal text-blue-600">/ {t('usage.unlimited')}</span>
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-zinc-500">{t('usage.contacts')}</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.contactsTotal} <span className="text-base font-normal text-blue-600">/ {t('usage.unlimited')}</span>
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-zinc-500">{t('usage.emailsSent')}</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.emailsSent} <span className="text-base font-normal text-blue-600">/ {t('usage.unlimited')}</span>
                  </Text>
                </div>
                <div>
                  <Text className="text-sm text-zinc-500">{t('usage.aiWords')}</Text>
                  <Text className="text-2xl font-semibold">
                    {organization.usage.aiWordsUsed} <span className="text-base font-normal text-blue-600">/ {t('usage.unlimited')}</span>
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
            <Text className="font-semibold text-lg">{t('noSubscription.title')}</Text>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              {t('noSubscription.description')}
            </Text>
            <Text className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              {t('noSubscription.contactSupport')}
            </Text>
          </div>

          {/* Debug Info */}
          <div className="p-6 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <Subheading level={2}>{t('debug.title')}</Subheading>
            <div className="mt-4 space-y-2 text-sm font-mono">
              <div>
                <span className="text-zinc-500">{t('debug.id')}:</span> {organization.id}
              </div>
              <div>
                <span className="text-zinc-500">{t('debug.tier')}:</span> {organization.tier}
              </div>
              <div>
                <span className="text-zinc-500">{t('debug.accountType')}:</span> {organization.accountType}
              </div>
              <div>
                <span className="text-zinc-500">{t('debug.stripeCustomer')}:</span>{' '}
                {organization.stripeCustomerId || t('debug.notAvailable')}
              </div>
              <div>
                <span className="text-zinc-500">{t('debug.stripeSubscription')}:</span>{' '}
                {organization.stripeSubscriptionId || t('debug.notAvailable')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
