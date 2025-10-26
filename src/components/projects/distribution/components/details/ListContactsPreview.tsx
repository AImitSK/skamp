// src/components/projects/distribution/components/details/ListContactsPreview.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ContactEnhanced } from '@/types/crm-enhanced';
import { LANGUAGE_NAMES } from '@/types/international';
import { EnvelopeIcon, PhoneIcon, NewspaperIcon } from '@heroicons/react/24/outline';

interface ListContactsPreviewProps {
  contacts: ContactEnhanced[];
  contactCount: number;
  loading: boolean;
}

/**
 * Formatiert den Namen eines Kontakts
 */
function formatContactName(contact: any): string {
  if ('name' in contact && typeof contact.name === 'object') {
    const parts = [];
    if (contact.name.title) parts.push(contact.name.title);
    if (contact.name.firstName) parts.push(contact.name.firstName);
    if (contact.name.lastName) parts.push(contact.name.lastName);
    return parts.join(' ') || 'Unbekannt';
  }
  if (contact.firstName || contact.lastName) {
    return `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unbekannt';
  }
  return contact.name || 'Unbekannt';
}

export default function ListContactsPreview({
  contacts,
  contactCount,
  loading,
}: ListContactsPreviewProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Kontakte</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Lade...</span>
          </div>
        ) : (
          <Badge color="blue" className="whitespace-nowrap">
            {contactCount.toLocaleString()} Kontakte
          </Badge>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <Text className="mt-2 text-gray-500">Lade Kontakte...</Text>
        </div>
      ) : (
        /* Contact List */
        <div className="space-y-1 max-h-96 overflow-y-auto border rounded-lg p-2 bg-gray-50">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between py-1.5 px-2 bg-white rounded hover:bg-gray-50 transition-colors"
            >
              {/* Contact Info */}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-gray-800">
                  {formatContactName(contact)}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {contact.position && `${contact.position} • `}
                  {contact.companyName || 'Keine Firma'}
                </div>

                {/* Journalist Badge */}
                {'mediaProfile' in contact && (contact as any).mediaProfile?.isJournalist && (
                  <div className="text-xs text-blue-600 mt-0.5">
                    <NewspaperIcon className="h-3 w-3 inline mr-1" />
                    Journalist
                    {(contact as any).mediaProfile.beats?.length ? ` • ${(contact as any).mediaProfile.beats.join(', ')}` : ''}
                  </div>
                )}
              </div>

              {/* Contact Icons */}
              <div className="flex items-center gap-1 ml-4">
                {/* Email Icon */}
                {(('emails' in contact && contact.emails && contact.emails.length > 0) ||
                  ('email' in contact && contact.email)) && (
                  <EnvelopeIcon className="h-3 w-3 text-primary" title="Hat E-Mail" />
                )}

                {/* Phone Icon */}
                {(('phones' in contact && contact.phones && contact.phones.length > 0) ||
                  ('phone' in contact && contact.phone)) && (
                  <PhoneIcon className="h-3 w-3 text-green-600" title="Hat Telefon" />
                )}

                {/* Language Badge */}
                {'communicationPreferences' in contact && (contact as any).communicationPreferences?.preferredLanguage && (
                  <span
                    className="text-xs text-gray-500 font-medium"
                    title={`Sprache: ${LANGUAGE_NAMES[(contact as any).communicationPreferences.preferredLanguage] || (contact as any).communicationPreferences.preferredLanguage}`}
                  >
                    {(contact as any).communicationPreferences.preferredLanguage.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
