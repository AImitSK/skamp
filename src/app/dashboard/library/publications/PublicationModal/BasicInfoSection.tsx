// src/app/dashboard/library/publications/PublicationModal/BasicInfoSection.tsx
"use client";

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LanguageSelectorMulti } from '@/components/ui/language-selector';
import { CountrySelectorMulti } from '@/components/ui/country-selector';
import { TagInput } from './TagInput';
import type { CompanyEnhanced } from '@/types/crm-enhanced';
import type { PublicationFormData } from './types';
import { publicationTypes, geographicScopes } from './types';
import {
  GlobeAltIcon,
  LanguageIcon,
  BuildingOfficeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface BasicInfoSectionProps {
  formData: PublicationFormData;
  setFormData: (data: PublicationFormData) => void;
  publishers: CompanyEnhanced[];
  loadingPublishers: boolean;
  onPublisherChange: (publisherId: string) => void;
}

// Alert Component
function Alert({
  type = 'info',
  message
}: {
  type?: 'info' | 'warning';
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    warning: 'bg-yellow-50 text-yellow-700'
  };

  const icons = {
    info: InformationCircleIcon,
    warning: InformationCircleIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          <p className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</p>
        </div>
      </div>
    </div>
  );
}

export function BasicInfoSection({
  formData,
  setFormData,
  publishers,
  loadingPublishers,
  onPublisherChange
}: BasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Titel der Publikation *
          </label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="z.B. Süddeutsche Zeitung"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Untertitel / Claim
          </label>
          <Input
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="z.B. Die große Tageszeitung"
          />
        </div>
      </div>

      {/* Publisher Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <BuildingOfficeIcon className="inline h-4 w-4 mr-1" />
          Verlag / Medienhaus *
        </label>
        {loadingPublishers ? (
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        ) : publishers.length === 0 ? (
          <div>
            <Alert
              type="warning"
              message="Keine Verlage oder Medienhäuser gefunden. Bitte legen Sie zuerst eine Firma vom Typ 'Verlag', 'Medienhaus' oder 'Partner' im CRM an."
            />
            <Button
              type="button"
              plain
              onClick={() => window.location.href = '/dashboard/contacts/crm?tab=companies'}
              className="mt-2 text-sm"
            >
              Zum CRM →
            </Button>
          </div>
        ) : (
          <Select
            value={formData.publisherId}
            onChange={(e) => onPublisherChange(e.target.value)}
            required
          >
            <option value="">Bitte wählen...</option>
            {publishers.map(publisher => (
              <option key={publisher.id} value={publisher.id}>
                {publisher.name}
                {publisher.type === 'publisher' && ' (Verlag)'}
                {publisher.type === 'media_house' && ' (Medienhaus)'}
                {publisher.type === 'partner' && ' (Partner)'}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <Input
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reichweite
          </label>
          <Select
            value={formData.geographicScope}
            onChange={(e) => setFormData({ ...formData, geographicScope: e.target.value as any })}
          >
            {geographicScopes.map(scope => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Typ *
          </label>
          <Select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          >
            {publicationTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format
          </label>
          <Select
            value={formData.format}
            onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
          >
            <option value="print">Print</option>
            <option value="online">Digital</option>
            <option value="both">Print & Digital</option>
            <option value="broadcast">Broadcast</option>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <Select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          >
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="discontinued">Eingestellt</option>
            <option value="planned">Geplant</option>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <LanguageIcon className="inline h-4 w-4 mr-1" />
          Sprachen *
        </label>
        <LanguageSelectorMulti
          value={formData.languages}
          onChange={(languages) => setFormData({ ...formData, languages })}
          placeholder="Sprachen auswählen..."
          multiple
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <GlobeAltIcon className="inline h-4 w-4 mr-1" />
          Geografische Zielgebiete *
        </label>
        <CountrySelectorMulti
          value={formData.geographicTargets}
          onChange={(countries) => setFormData({ ...formData, geographicTargets: countries })}
          placeholder="Länder auswählen..."
          multiple
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Themenbereiche
        </label>
        <TagInput
          value={formData.focusAreas}
          onChange={(tags) => setFormData({ ...formData, focusAreas: tags })}
          placeholder="Tippen Sie und drücken Sie Enter..."
        />
        <p className="mt-1 text-xs text-gray-500">
          Geben Sie Themenbereiche ein und drücken Sie Enter oder Komma
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.verified}
          onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
          className="h-4 w-4 text-[#005fab] focus:ring-[#005fab] border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Publikation ist verifiziert
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Interne Notizen
        </label>
        <Textarea
          value={formData.internalNotes}
          onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
          rows={2}
          placeholder="Interne Anmerkungen..."
        />
      </div>
    </div>
  );
}
