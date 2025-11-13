'use client';

import React, { useEffect, useState } from 'react';
import { EmailAddress } from '@/types/email';
import { emailAddressService } from '@/lib/email/email-address-service';
import { useAuth } from '@/context/AuthContext';
import { toastService } from '@/lib/utils/toast';

interface EmailAddressSelectorProps {
  value: string; // emailAddressId
  onChange: (emailAddressId: string) => void;
  organizationId: string;
}

export default function EmailAddressSelector({
  value,
  onChange,
  organizationId
}: EmailAddressSelectorProps) {
  const { user } = useAuth();
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmailAddresses();
  }, [organizationId]);

  const loadEmailAddresses = async () => {
    if (!user) {
      setError('Nicht eingeloggt');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Lade alle Email-Adressen der Organisation
      const addresses = await emailAddressService.getEmailAddressesByOrganization(organizationId);

      console.log('🔍 EmailAddressSelector Debug:', {
        totalAddresses: addresses.length,
        addresses: addresses.map(a => ({
          id: a.id,
          email: a.email,
          isActive: a.isActive,
          verificationStatus: a.verificationStatus
        }))
      });

      // Filter: Nur aktive und verifizierte Emails
      const activeAddresses = addresses.filter(
        (addr) => addr.isActive && addr.verificationStatus === 'verified'
      );

      console.log('✅ Gefilterte Adressen:', {
        activeCount: activeAddresses.length,
        activeAddresses: activeAddresses.map(a => ({ id: a.id, email: a.email }))
      });

      setEmailAddresses(activeAddresses);

      // Auto-Select: Wenn noch keine Auswahl und es gibt eine Default-Email
      if (!value && activeAddresses.length > 0) {
        const defaultAddress = activeAddresses.find((addr) => addr.isDefault);
        if (defaultAddress) {
          onChange(defaultAddress.id!);
        } else {
          // Fallback: Erste Email
          onChange(activeAddresses[0].id!);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Email-Adressen';
      setError(errorMessage);
      toastService.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Finde die aktuell ausgewählte Email
  const selectedEmail = emailAddresses.find((addr) => addr.id === value);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Absender-Email
        </label>
        <div className="flex items-center justify-center h-10 px-4 bg-gray-50 border border-gray-300 rounded-md">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
          <span className="ml-2 text-sm text-gray-500">Lade Email-Adressen...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Absender-Email
        </label>
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (emailAddresses.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Absender-Email
        </label>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Keine verifizierten Email-Adressen gefunden.</strong>
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Bitte fügen Sie zuerst eine Email-Adresse unter{' '}
            <a href="/settings/email" className="underline font-medium">
              Einstellungen → Email
            </a>{' '}
            hinzu und verifizieren Sie diese.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="emailAddressSelector" className="block text-sm font-medium text-gray-700">
        Absender-Email *
      </label>

      <select
        id="emailAddressSelector"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        required
      >
        <option value="">Bitte wählen...</option>
        {emailAddresses.map((emailAddress) => (
          <option key={emailAddress.id} value={emailAddress.id}>
            {emailAddress.email}
            {emailAddress.domain && ` (${emailAddress.domain})`}
            {emailAddress.isDefault && ' [Standard]'}
          </option>
        ))}
      </select>

      {/* Info-Box über ausgewählte Email */}
      {selectedEmail && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start space-x-2">
            <svg
              className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 text-sm">
              <p className="font-medium text-blue-800">
                {selectedEmail.email}
              </p>
              <p className="text-blue-700 mt-1">
                Antworten werden automatisch an die generierte Reply-To-Adresse weitergeleitet.
              </p>
              {selectedEmail.description && (
                <p className="text-blue-600 mt-1 text-xs">
                  {selectedEmail.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hinweis wenn keine Default-Email gesetzt */}
      {emailAddresses.length > 0 && !emailAddresses.some((addr) => addr.isDefault) && (
        <p className="text-xs text-gray-500 mt-1">
          Tipp: Sie können in den{' '}
          <a href="/settings/email" className="text-primary-600 hover:underline">
            Email-Einstellungen
          </a>{' '}
          eine Standard-Absender-Adresse festlegen.
        </p>
      )}
    </div>
  );
}
