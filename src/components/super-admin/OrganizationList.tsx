/**
 * Organization List Component
 * Zeigt alle Organizations mit ihrem Account-Type
 */

'use client';

import { useState, useEffect } from 'react';
import {
  BuildingOfficeIcon,
  StarIcon,
  BeakerIcon,
  BoltIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Organization } from '@/types/organization';

const accountTypeIcons = {
  regular: UserGroupIcon,
  promo: StarIcon,
  beta: BeakerIcon,
  internal: BoltIcon,
};

const accountTypeLabels = {
  regular: 'Regular',
  promo: 'Promo',
  beta: 'Beta',
  internal: 'Internal',
};

const accountTypeColors = {
  regular: 'bg-[#005fab]/10 text-[#005fab]',
  promo: 'bg-purple-100 text-purple-700',
  beta: 'bg-orange-100 text-orange-700',
  internal: 'bg-green-100 text-green-700',
};

export default function OrganizationList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch('/api/super-admin/organizations', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (error: any) {
      console.error('Error loading organizations:', error);
      setError(error.message || 'Fehler beim Laden der Organizations');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    const { auth } = await import('@/lib/firebase/client-init');
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="h-5 w-5 text-zinc-700" />
            <h3 className="text-base font-semibold text-zinc-900">Organizations</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-zinc-500">Lade Organizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="h-5 w-5 text-zinc-700" />
            <h3 className="text-base font-semibold text-zinc-900">Organizations</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="text-red-600">Fehler: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-3">
          <BuildingOfficeIcon className="h-5 w-5 text-zinc-700" />
          <h3 className="text-base font-semibold text-zinc-900">
            Organizations ({organizations.length})
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        {organizations.length === 0 ? (
          <p className="text-zinc-500">Keine Organizations gefunden</p>
        ) : (
          <div className="space-y-2">
            {organizations.map((org) => {
              const Icon = accountTypeIcons[org.accountType];
              const label = accountTypeLabels[org.accountType];
              const colorClass = accountTypeColors[org.accountType];

              return (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-100 hover:bg-zinc-100 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-zinc-900">{org.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                        <Icon className="w-3 h-3 inline mr-1" />
                        {label}
                      </span>
                      <span className="px-2 py-0.5 bg-zinc-200 text-zinc-700 text-xs font-medium rounded">
                        {org.tier}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 mt-1">{org.adminEmail}</p>
                    {org.promoDetails && (
                      <p className="text-xs text-purple-600 mt-1">
                        Promo: {org.promoDetails.code}
                        {org.promoDetails.expiresAt && (
                          <span className="ml-2">
                            • Läuft ab: {(() => {
                              const expiresAt = org.promoDetails.expiresAt;
                              if (typeof expiresAt === 'object' && expiresAt !== null && 'toDate' in expiresAt) {
                                return (expiresAt as any).toDate().toLocaleDateString('de-DE');
                              }
                              return new Date(expiresAt as any).toLocaleDateString('de-DE');
                            })()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
