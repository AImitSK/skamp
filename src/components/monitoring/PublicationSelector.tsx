'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Field, Label } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import {
  handleRecipientLookup,
  type MatchedPublication,
  type PublicationLookupResult
} from '@/lib/utils/publication-matcher';
import { CheckCircleIcon, BuildingOfficeIcon, UserIcon } from '@heroicons/react/24/outline';
import { toastService } from '@/lib/utils/toast';

interface PublicationSelectorProps {
  recipientEmail: string;
  recipientName: string;
  organizationId: string;
  onPublicationSelect: (publication: MatchedPublication | null) => void;
  onDataLoad?: (data: PublicationLookupResult) => void;
}

export function PublicationSelector({
  recipientEmail,
  recipientName,
  organizationId,
  onPublicationSelect,
  onDataLoad
}: PublicationSelectorProps) {
  const t = useTranslations('monitoring.publicationSelector');
  const tToast = useTranslations('toasts');

  const [lookupData, setLookupData] = useState<PublicationLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPublication, setManualPublication] = useState('');

  useEffect(() => {
    async function lookup() {
      setLoading(true);
      try {
        const data = await handleRecipientLookup(recipientEmail, organizationId);
        setLookupData(data);

        if (onDataLoad) {
          onDataLoad(data);
        }

        // Auto-Select wenn nur eine Publikation vorhanden
        if (data?.publications?.length === 1) {
          setSelectedIndex(0);
          onPublicationSelect(data.publications[0]);
        }
      } catch (error) {
        toastService.error(tToast('mediumNotFound'));
      } finally {
        setLoading(false);
      }
    }

    if (recipientEmail) {
      lookup();
    }
  }, [recipientEmail, organizationId]);

  const handlePublicationChange = (value: string) => {
    if (value === 'manual') {
      setManualMode(true);
      setSelectedIndex(null);
      onPublicationSelect(null);
    } else {
      const index = parseInt(value);
      setSelectedIndex(index);
      if (lookupData?.publications[index]) {
        onPublicationSelect(lookupData.publications[index]);
      }
    }
  };

  const handleManualPublicationChange = (value: string) => {
    setManualPublication(value);
    if (value) {
      onPublicationSelect({
        name: value,
        type: 'online',
        source: 'manual'
      });
    } else {
      onPublicationSelect(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // CRM-Daten gefunden
  if (lookupData?.contact) {
    return (
      <div className="space-y-4">
        {/* Info-Banner mit gefundenen Daten */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <Text className="font-medium text-gray-900">
                  {lookupData.contact.firstName} {lookupData.contact.lastName}
                </Text>
                {lookupData.contact.position && (
                  <Text className="text-gray-500">• {lookupData.contact.position}</Text>
                )}
              </div>
              {lookupData.company && (
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  <Text className="text-gray-700">{lookupData.company.name}</Text>
                  {lookupData.company.type === 'media_house' && (
                    <Badge color="blue">{t('mediaHouse')}</Badge>
                  )}
                  {lookupData.company.type === 'publisher' && (
                    <Badge color="purple">{t('publisher')}</Badge>
                  )}
                </div>
              )}
              {lookupData.contact.mediaInfo?.beat && (
                <Text className="text-sm text-gray-600 mt-1">
                  {t('beat')}: {lookupData.contact.mediaInfo.beat}
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Publikations-Auswahl */}
        {lookupData.publications.length > 0 ? (
          <Field>
            <Label>{t('publication')}</Label>
            <Select
              value={manualMode ? 'manual' : (selectedIndex !== null ? selectedIndex.toString() : '')}
              onChange={(e) => handlePublicationChange(e.target.value)}
            >
              <option value="">{t('selectPlaceholder')}</option>
              {lookupData.publications.map((pub, idx) => (
                <option key={idx} value={idx}>
                  {pub.name}
                  {pub.reach && ` • ${(pub.reach / 1000000).toFixed(1)}M Reichweite`}
                  {pub.circulation && !pub.reach && ` • ${(pub.circulation / 1000).toFixed(0)}k Auflage`}
                  {pub.source === 'company' && ' ✓'}
                </option>
              ))}
              <option value="manual">{t('manualEntry')}</option>
            </Select>

            {selectedIndex !== null && lookupData.publications[selectedIndex] && (
              <div className="mt-2 space-y-1">
                {lookupData.publications[selectedIndex].source === 'company' && (
                  <Text className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircleIcon className="h-3 w-3" />
                    {t('completeData')}
                  </Text>
                )}
                {lookupData.publications[selectedIndex].source === 'crm' && (
                  <Text className="text-xs text-amber-600">
                    {t('basicData')}
                  </Text>
                )}
                {lookupData.publications[selectedIndex].focusAreas && (
                  <Text className="text-xs text-gray-500">
                    {t('focusAreas')}: {lookupData.publications[selectedIndex].focusAreas?.join(', ')}
                  </Text>
                )}
              </div>
            )}
          </Field>
        ) : (
          <Field>
            <Label>{t('publication')}</Label>
            <Text className="text-sm text-gray-500 mb-2">
              {t('noPublications')}
            </Text>
            <Input
              type="text"
              value={manualPublication}
              onChange={(e) => handleManualPublicationChange(e.target.value)}
              placeholder={t('manualPlaceholder')}
            />
          </Field>
        )}

        {/* Manuelle Eingabe wenn "Andere" gewählt */}
        {manualMode && (
          <Field>
            <Label>{t('enterManually')}</Label>
            <Input
              type="text"
              value={manualPublication}
              onChange={(e) => handleManualPublicationChange(e.target.value)}
              placeholder={t('manualPlaceholder')}
              autoFocus
            />
          </Field>
        )}
      </div>
    );
  }

  // Kein CRM-Match - Manuelle Eingabe
  return (
    <Field>
      <Label>{t('publication')}</Label>
      <Text className="text-sm text-amber-500 mb-2">
        {t('noCrmEntry', { email: recipientEmail })}
      </Text>
      <Input
        type="text"
        value={manualPublication}
        onChange={(e) => handleManualPublicationChange(e.target.value)}
        placeholder={t('enterManually')}
      />
      <Text className="text-xs text-gray-500 mt-1">
        {t('crmTip')}
      </Text>
    </Field>
  );
}