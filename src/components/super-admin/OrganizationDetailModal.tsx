/**
 * Organization Detail Modal Component
 * Zeigt Details einer Organization mit Quick Actions
 */

'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Organization, OrganizationUsage } from '@/types/organization';
import { isUnlimited, getUsagePercentage } from '@/config/subscription-limits';

interface Props {
  organization: Organization;
  onClose: () => void;
  onUpdate: () => void;
}

export default function OrganizationDetailModal({ organization, onClose, onUpdate }: Props) {
  const [supportNote, setSupportNote] = useState('');
  const [loading, setLoading] = useState(false);

  const getAuthToken = async () => {
    const { auth } = await import('@/lib/firebase/client-init');
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  const handleChangeTier = async (newTier: string) => {
    if (!confirm(`Tier zu ${newTier} ändern?`)) return;

    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/change-tier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: newTier }),
      });

      if (response.ok) {
        toast.success('Tier erfolgreich geändert');
        onUpdate();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Ändern des Tiers');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendPromo = async (months: number) => {
    if (!confirm(`Promo um ${months} Monate verlängern?`)) return;

    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/extend-promo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ months }),
      });

      if (response.ok) {
        toast.success('Promo erfolgreich verlängert');
        onUpdate();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Verlängern');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!supportNote.trim()) {
      toast.error('Bitte geben Sie eine Note ein');
      return;
    }

    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/super-admin/organizations/${organization.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: supportNote }),
      });

      if (response.ok) {
        toast.success('Note gespeichert');
        setSupportNote('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Netzwerkfehler');
    } finally {
      setLoading(false);
    }
  };

  const openStripe = () => {
    if (organization.stripeCustomerId) {
      window.open(`https://dashboard.stripe.com/customers/${organization.stripeCustomerId}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{organization.name}</h2>
            <p className="text-sm text-zinc-500">{organization.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">📋 Basic Info</h3>
            <div className="bg-zinc-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Admin Email:</span>
                <span className="font-medium">{organization.adminEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Created:</span>
                <span className="font-medium">
                  {organization.createdAt?.toDate().toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Tier:</span>
                <span className="font-medium">{organization.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Account Type:</span>
                <span className="font-medium">{organization.accountType}</span>
              </div>
              {organization.stripeCustomerId && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Stripe Customer:</span>
                  <button
                    onClick={openStripe}
                    className="text-[#005fab] hover:text-[#004a8c] font-medium"
                  >
                    {organization.stripeCustomerId.substring(0, 20)}...
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Usage Details */}
          {organization.usage && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">📊 Usage Details</h3>
              <div className="space-y-3">
                <UsageBar
                  label="Emails"
                  current={organization.usage.emailsSent}
                  limit={organization.usage.emailsLimit}
                />
                <UsageBar
                  label="Kontakte"
                  current={organization.usage.contactsTotal}
                  limit={organization.usage.contactsLimit}
                />
                <UsageBar
                  label="Storage"
                  current={organization.usage.storageUsed}
                  limit={organization.usage.storageLimit}
                  formatter={(val) => `${(val / (1024 ** 3)).toFixed(2)} GB`}
                />
                <UsageBar
                  label="AI Words"
                  current={organization.usage.aiWordsUsed}
                  limit={organization.usage.aiWordsLimit}
                />
                <UsageBar
                  label="Team Members"
                  current={organization.usage.teamMembersActive}
                  limit={organization.usage.teamMembersLimit}
                />
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">🛠️ Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              <select
                onChange={(e) => e.target.value && handleChangeTier(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-lg text-sm"
                disabled={loading}
                value=""
              >
                <option value="">Change Tier...</option>
                <option value="STARTER">STARTER</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="AGENTUR">AGENTUR</option>
              </select>

              {organization.accountType === 'promo' && (
                <>
                  <button
                    onClick={() => handleExtendPromo(1)}
                    disabled={loading}
                    className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition"
                  >
                    +1 Monat
                  </button>
                  <button
                    onClick={() => handleExtendPromo(3)}
                    disabled={loading}
                    className="px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition"
                  >
                    +3 Monate
                  </button>
                </>
              )}

              {organization.stripeCustomerId && (
                <button
                  onClick={openStripe}
                  className="px-3 py-2 bg-[#005fab]/10 hover:bg-[#005fab]/20 text-[#005fab] rounded-lg text-sm font-medium transition"
                >
                  View in Stripe
                </button>
              )}
            </div>
          </div>

          {/* Support Notes */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">📝 Support Notes (Internal)</h3>
            <textarea
              value={supportNote}
              onChange={(e) => setSupportNote(e.target.value)}
              placeholder="Notizen für interne Zwecke..."
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg resize-none text-sm
                         focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={4}
            />
            <button
              onClick={handleSaveNote}
              disabled={loading || !supportNote.trim()}
              className="mt-2 px-4 py-2 bg-[#005fab] hover:bg-[#004a8c] text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  formatter?: (val: number) => string;
}

function UsageBar({ label, current, limit, formatter }: UsageBarProps) {
  const percentage = getUsagePercentage(current, limit);
  const unlimited = isUnlimited(limit);

  const getColor = () => {
    if (unlimited) return 'bg-[#005fab]';
    if (percentage < 80) return 'bg-green-500';
    if (percentage < 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatValue = formatter || ((val: number) => val.toLocaleString('de-DE'));

  return (
    <div className="bg-zinc-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-zinc-700">{label}</span>
        {unlimited ? (
          <span className="text-sm font-bold text-[#005fab]">Unlimited ∞</span>
        ) : (
          <span className="text-sm font-medium text-zinc-900">
            {formatValue(current)} / {formatValue(limit)} ({percentage}%)
          </span>
        )}
      </div>
      {!unlimited && (
        <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
