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
  regular: 'bg-blue-100 text-blue-700',
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

      // TODO: Create API route to fetch all organizations
      // For now, this is a placeholder
      // const token = await getAuthToken();
      // const response = await fetch('/api/super-admin/organizations', {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // const data = await response.json();
      // setOrganizations(data.organizations);

      // Placeholder for now
      setOrganizations([]);
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">Lade Organizations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-red-600">Fehler: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <BuildingOfficeIcon className="w-6 h-6 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Organizations ({organizations.length})
        </h2>
      </div>

      {organizations.length === 0 ? (
        <p className="text-gray-500">Keine Organizations gefunden</p>
      ) : (
        <div className="space-y-2">
          {organizations.map((org) => {
            const Icon = accountTypeIcons[org.accountType];
            const label = accountTypeLabels[org.accountType];
            const colorClass = accountTypeColors[org.accountType];

            return (
              <div
                key={org.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                      <Icon className="w-3 h-3 inline mr-1" />
                      {label}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                      {org.tier}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{org.adminEmail}</p>
                  {org.promoDetails && (
                    <p className="text-xs text-purple-600 mt-1">
                      Promo: {org.promoDetails.code}
                      {org.promoDetails.expiresAt && (
                        <span className="ml-2">
                          • Läuft ab: {new Date(org.promoDetails.expiresAt.toDate()).toLocaleDateString('de-DE')}
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
  );
}
