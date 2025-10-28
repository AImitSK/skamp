/**
 * Organization Table Component
 * Zeigt alle Organizations mit Usage-Metriken in einer Tabelle
 */

'use client';

import { EyeIcon } from '@heroicons/react/24/outline';
import { Organization } from '@/types/organization';
import { getUsagePercentage, getUsageColor, isUnlimited } from '@/config/subscription-limits';

interface Props {
  organizations: Organization[];
  onViewDetails: (org: Organization) => void;
}

export default function OrganizationTable({ organizations, onViewDetails }: Props) {
  const getUsageEmoji = (percentage: number) => {
    if (percentage < 80) return '🟢';
    if (percentage < 95) return '🟡';
    return '🔴';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      regular: 'reg',
      promo: 'promo',
      beta: 'beta',
      internal: 'int',
    };
    return labels[type] || type;
  };

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      STARTER: 'bg-[#005fab]/10 text-[#005fab]',
      BUSINESS: 'bg-[#005fab]/10 text-[#005fab]',
      AGENTUR: 'bg-purple-100 text-purple-800',
    };
    return colors[tier] || 'bg-zinc-100 text-zinc-800';
  };

  const getPromoExpiryWarning = (org: Organization) => {
    if (org.accountType !== 'promo' || !org.promoDetails?.expiresAt) {
      return null;
    }

    const daysUntilExpiry = Math.ceil(
      (org.promoDetails.expiresAt.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      return (
        <span className="text-xs text-orange-600 flex items-center gap-1">
          ⚠️ Exp: {daysUntilExpiry}d
        </span>
      );
    }

    if (daysUntilExpiry <= 0) {
      return <span className="text-xs text-red-600">❌ Expired</span>;
    }

    return null;
  };

  const getColorClassName = (color: 'green' | 'yellow' | 'red') => {
    const colors = {
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      red: 'text-red-600',
    };
    return colors[color];
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                Organization
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                Tier
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                Emails
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">
                Storage
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {organizations.map((org) => {
              const emailPercentage = org.usage
                ? getUsagePercentage(org.usage.emailsSent, org.usage.emailsLimit)
                : 0;

              const storagePercentage = org.usage
                ? getUsagePercentage(org.usage.storageUsed, org.usage.storageLimit)
                : 0;

              const emailColor = getUsageColor(emailPercentage);
              const storageColor = getUsageColor(storagePercentage);

              return (
                <tr key={org.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-zinc-900">{org.name}</p>
                      <p className="text-xs text-zinc-500">{org.adminEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getTierBadgeColor(org.tier)}`}>
                      {org.tier.substring(0, 3)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-zinc-600 font-mono">
                      {getTypeLabel(org.accountType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {org.usage && isUnlimited(org.usage.emailsLimit) ? (
                      <span className="text-sm font-medium text-[#005fab]">∞</span>
                    ) : org.usage ? (
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getColorClassName(emailColor)}`}>
                          {org.usage.emailsSent?.toLocaleString() || 0}/{org.usage.emailsLimit?.toLocaleString() || 0}
                        </p>
                        <p className={`text-xs ${getColorClassName(emailColor)}`}>
                          {emailPercentage}% {getUsageEmoji(emailPercentage)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {org.usage && isUnlimited(org.usage.storageLimit) ? (
                      <span className="text-sm font-medium text-[#005fab]">∞</span>
                    ) : org.usage ? (
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getColorClassName(storageColor)}`}>
                          {(org.usage.storageUsed / (1024 ** 3)).toFixed(1)}/{(org.usage.storageLimit / (1024 ** 3)).toFixed(0)} GB
                        </p>
                        <p className={`text-xs ${getColorClassName(storageColor)}`}>
                          {storagePercentage}% {getUsageEmoji(storagePercentage)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">✅</span>
                      {getPromoExpiryWarning(org)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onViewDetails(org)}
                        className="p-1.5 text-[#005fab] hover:bg-[#005fab]/10 rounded transition"
                        title="Details anzeigen"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {organizations.length === 0 && (
        <div className="p-12 text-center text-zinc-500">
          Keine Organizations gefunden
        </div>
      )}
    </div>
  );
}
