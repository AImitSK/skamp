// src/app/dashboard/library/publications/PublicationModal/IdentifiersSection.tsx
"use client";

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { socialPlatformLabels } from '@/types/crm';
import type { IdentifierItem, SocialMediaItem } from './types';

interface IdentifiersSectionProps {
  identifiers: IdentifierItem[];
  setIdentifiers: (identifiers: IdentifierItem[]) => void;
  socialMediaUrls: SocialMediaItem[];
  setSocialMediaUrls: (urls: SocialMediaItem[]) => void;
}

export const IdentifiersSection = memo(function IdentifiersSection({
  identifiers,
  setIdentifiers,
  socialMediaUrls,
  setSocialMediaUrls
}: IdentifiersSectionProps) {
  const addIdentifier = () => {
    setIdentifiers([...identifiers, { type: 'URL', value: '' }]);
  };

  const removeIdentifier = (index: number) => {
    setIdentifiers(identifiers.filter((_, i) => i !== index));
  };

  const addSocialMedia = () => {
    setSocialMediaUrls([...socialMediaUrls, { platform: 'linkedin', url: '' }]);
  };

  const removeSocialMedia = (index: number) => {
    setSocialMediaUrls(socialMediaUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Identifikatoren */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Identifikatoren</div>
          <Button type="button" onClick={addIdentifier} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            Identifikator hinzufügen
          </Button>
        </div>

        {identifiers && identifiers.length > 0 ? (
          <div className="space-y-2">
            {identifiers.map((identifier, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <Select
                    value={identifier.type}
                    onChange={(e) => {
                      const updated = [...identifiers];
                      updated[index] = { ...updated[index], type: e.target.value as any };
                      setIdentifiers(updated);
                    }}
                  >
                    <option value="ISSN">ISSN</option>
                    <option value="ISBN">ISBN</option>
                    <option value="DOI">DOI</option>
                    <option value="URL">URL</option>
                    <option value="DOMAIN">Domain</option>
                    <option value="SOCIAL_HANDLE">Social Handle</option>
                    <option value="OTHER">Sonstiges</option>
                  </Select>
                </div>
                <div className="col-span-8">
                  <Input
                    type="text"
                    value={identifier.value}
                    onChange={(e) => {
                      const updated = [...identifiers];
                      updated[index].value = e.target.value;
                      setIdentifiers(updated);
                    }}
                    placeholder="Wert eingeben..."
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    plain
                    onClick={() => removeIdentifier(index)}
                    disabled={identifiers.length === 1}
                  >
                    <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-sm text-gray-500">Keine Identifikatoren hinzugefügt</Text>
        )}
      </div>

      {/* Social Media Profile */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Social Media Profile</div>
          <Button type="button" onClick={addSocialMedia} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            Profil hinzufügen
          </Button>
        </div>

        {socialMediaUrls && socialMediaUrls.length > 0 ? (
          <div className="space-y-2">
            {socialMediaUrls.map((social, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Select
                    value={social.platform}
                    onChange={(e) => {
                      const updated = [...socialMediaUrls];
                      updated[index].platform = e.target.value;
                      setSocialMediaUrls(updated);
                    }}
                  >
                    {Object.entries(socialPlatformLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-7">
                  <Input
                    type="url"
                    value={social.url}
                    onChange={(e) => {
                      const updated = [...socialMediaUrls];
                      updated[index].url = e.target.value;
                      setSocialMediaUrls(updated);
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" plain onClick={() => removeSocialMedia(index)}>
                    <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-sm text-gray-500">Keine Social Media Profile hinzugefügt</Text>
        )}
      </div>
    </div>
  );
});
