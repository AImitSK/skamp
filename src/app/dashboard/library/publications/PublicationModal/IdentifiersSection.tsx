// src/app/dashboard/library/publications/PublicationModal/IdentifiersSection.tsx
"use client";

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { SocialPlatform } from '@/types/crm';
import type { IdentifierItem, SocialMediaItem } from './types';

// Social platforms for dropdown
const socialPlatforms: SocialPlatform[] = ['linkedin', 'twitter', 'xing', 'facebook', 'instagram', 'youtube', 'tiktok', 'other'];

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
  const t = useTranslations('publications.modal.identifiers');

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
          <div className="text-sm font-medium text-gray-900">{t('title')}</div>
          <Button type="button" onClick={addIdentifier} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            {t('addButton')}
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
                    <option value="ISSN">{t('types.ISSN')}</option>
                    <option value="ISBN">{t('types.ISBN')}</option>
                    <option value="DOI">{t('types.DOI')}</option>
                    <option value="URL">{t('types.URL')}</option>
                    <option value="DOMAIN">{t('types.DOMAIN')}</option>
                    <option value="SOCIAL_HANDLE">{t('types.SOCIAL_HANDLE')}</option>
                    <option value="OTHER">{t('types.OTHER')}</option>
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
                    placeholder={t('valuePlaceholder')}
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
          <Text className="text-sm text-gray-500">{t('empty')}</Text>
        )}
      </div>

      {/* Social Media Profile */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">{t('socialMedia.title')}</div>
          <Button type="button" onClick={addSocialMedia} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            {t('socialMedia.addButton')}
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
                    {socialPlatforms.map((platform) => (
                      <option key={platform} value={platform}>{t(`socialMedia.platforms.${platform}`)}</option>
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
                    placeholder={t('socialMedia.urlPlaceholder')}
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
          <Text className="text-sm text-gray-500">{t('socialMedia.empty')}</Text>
        )}
      </div>
    </div>
  );
});
