// src/app/dashboard/contacts/lists/components/sections/PreviewSection.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import {
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  NewspaperIcon
} from "@heroicons/react/24/outline";
import { LANGUAGE_NAMES } from "@/types/international";
import { PreviewSectionProps, formatContactName } from './types';

export function PreviewSection({
  previewContacts,
  previewCount,
  loadingPreview,
  listType
}: PreviewSectionProps) {
  return (
    <div className="sticky top-6 border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Live-Vorschau</h3>
        {loadingPreview ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Lade...</span>
          </div>
        ) : (
          <Badge color="blue" className="whitespace-nowrap">
            {previewCount.toLocaleString()} Kontakte
          </Badge>
        )}
      </div>

      {previewContacts.length > 0 ? (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {previewContacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded"
            >
              <div>
                <div className="font-medium text-sm text-gray-800">
                  {formatContactName(contact)}
                </div>
                <div className="text-xs text-gray-500">
                  {contact.position && `${contact.position} • `}
                  {contact.companyName || 'Keine Firma'}
                </div>
                {'mediaProfile' in contact && (contact as any).mediaProfile?.isJournalist && (
                  <div className="text-xs text-blue-600 mt-0.5">
                    <NewspaperIcon className="h-3 w-3 inline mr-1" />
                    Journalist
                    {(contact as any).mediaProfile.beats?.length ? ` • ${(contact as any).mediaProfile.beats.join(', ')}` : ''}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {(('emails' in contact && contact.emails && contact.emails.length > 0) ||
                  ('email' in contact && contact.email)) && (
                  <EnvelopeIcon className="h-3 w-3 text-primary" title="Hat E-Mail" />
                )}
                {(('phones' in contact && contact.phones && contact.phones.length > 0) ||
                  ('phone' in contact && contact.phone)) && (
                  <PhoneIcon className="h-3 w-3 text-green-600" title="Hat Telefon" />
                )}
                {'communicationPreferences' in contact && (contact as any).communicationPreferences?.preferredLanguage && (
                  <span
                    className="text-xs text-gray-500"
                    title={`Sprache: ${LANGUAGE_NAMES[(contact as any).communicationPreferences.preferredLanguage] || (contact as any).communicationPreferences.preferredLanguage}`}
                  >
                    {(contact as any).communicationPreferences.preferredLanguage.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
          {previewCount > 10 && (
            <Text className="text-sm text-center pt-2">
              ... und {(previewCount - 10).toLocaleString()} weitere Kontakte
            </Text>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <Text className="text-sm">
            {listType === 'dynamic'
              ? "Keine Kontakte entsprechen den Filtern."
              : "Noch keine Kontakte ausgewählt."
            }
          </Text>
        </div>
      )}
    </div>
  );
}
