// src/app/dashboard/library/publications/PublicationModal/IdentifiersSection.tsx
"use client";

import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
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
    setSocialMediaUrls([...socialMediaUrls, { platform: '', url: '' }]);
  };

  const removeSocialMedia = (index: number) => {
    setSocialMediaUrls(socialMediaUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-zinc-900 mb-3">Identifikatoren</h4>
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
                  <TrashIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" plain onClick={addIdentifier}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Identifikator hinzufügen
          </Button>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-zinc-900 mb-3">Social Media Profile</h4>
        <div className="space-y-2">
          {socialMediaUrls.map((social, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="text"
                value={social.platform}
                onChange={(e) => {
                  const updated = [...socialMediaUrls];
                  updated[index].platform = e.target.value;
                  setSocialMediaUrls(updated);
                }}
                placeholder="Platform (z.B. Twitter)"
                className="w-40"
              />
              <Input
                type="url"
                value={social.url}
                onChange={(e) => {
                  const updated = [...socialMediaUrls];
                  updated[index].url = e.target.value;
                  setSocialMediaUrls(updated);
                }}
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                type="button"
                plain
                onClick={() => removeSocialMedia(index)}
              >
                <TrashIcon className="h-5 w-5" />
              </Button>
            </div>
          ))}
          <Button type="button" plain onClick={addSocialMedia}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Social Media hinzufügen
          </Button>
        </div>
      </div>
    </div>
  );
});
