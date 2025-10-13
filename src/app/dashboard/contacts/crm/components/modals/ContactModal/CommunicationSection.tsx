// src/app/dashboard/contacts/crm/components/modals/ContactModal/CommunicationSection.tsx
"use client";

import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { PhoneInput } from "@/components/ui/phone-input";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { socialPlatformLabels } from "@/types/crm";
import { COMMUNICATION_CHANNELS, LanguageCode } from "@/types/crm-enhanced";
import { ContactModalSectionProps } from "./types";
import * as Flags from 'country-flag-icons/react/3x2';

// Flag Component
const FlagIcon = ({ countryCode, className = "h-4 w-6" }: { countryCode?: string; className?: string }) => {
  if (!countryCode) return null;
  // @ts-ignore - Dynamic import from flag library
  const Flag = Flags[countryCode.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={className} title={countryCode} />;
};

// Vorwahl-Optionen
const COUNTRY_OPTIONS = [
  { code: 'DE', label: '+49 DE', callingCode: '49' },
  { code: 'AT', label: '+43 AT', callingCode: '43' },
  { code: 'CH', label: '+41 CH', callingCode: '41' },
  { code: 'US', label: '+1 US', callingCode: '1' },
  { code: 'GB', label: '+44 GB', callingCode: '44' },
  { code: 'FR', label: '+33 FR', callingCode: '33' },
  { code: 'IT', label: '+39 IT', callingCode: '39' },
  { code: 'ES', label: '+34 ES', callingCode: '34' },
  { code: 'NL', label: '+31 NL', callingCode: '31' },
  { code: 'BE', label: '+32 BE', callingCode: '32' },
  { code: 'PL', label: '+48 PL', callingCode: '48' },
  { code: 'SE', label: '+46 SE', callingCode: '46' },
  { code: 'NO', label: '+47 NO', callingCode: '47' },
  { code: 'DK', label: '+45 DK', callingCode: '45' },
  { code: 'FI', label: '+358 FI', callingCode: '358' },
  { code: 'CZ', label: '+420 CZ', callingCode: '420' },
  { code: 'HU', label: '+36 HU', callingCode: '36' },
  { code: 'PT', label: '+351 PT', callingCode: '351' },
  { code: 'GR', label: '+30 GR', callingCode: '30' },
  { code: 'IE', label: '+353 IE', callingCode: '353' }
];

/**
 * Communication Section für ContactModal
 *
 * Enthält: Email-Adressen, Telefonnummern, Social Media Profile, Kommunikations-Präferenzen
 */
export function CommunicationSection({ formData, setFormData }: ContactModalSectionProps) {
  // Email handlers
  const addEmailField = () => {
    const newEmail = {
      type: 'business' as const,
      email: '',
      isPrimary: formData.emails?.length === 0
    };
    setFormData({
      ...formData,
      emails: [...(formData.emails || []), newEmail]
    });
  };

  const removeEmailField = (index: number) => {
    const updatedEmails = (formData.emails || []).filter((_, i) => i !== index);
    setFormData({ ...formData, emails: updatedEmails });
  };

  // Phone handlers
  const addPhoneField = () => {
    const newPhone = {
      type: 'business' as const,
      number: '',
      isPrimary: formData.phones?.length === 0
    };
    setFormData({
      ...formData,
      phones: [...(formData.phones || []), newPhone]
    });
  };

  const removePhoneField = (index: number) => {
    const updatedPhones = (formData.phones || []).filter((_, i) => i !== index);
    setFormData({ ...formData, phones: updatedPhones });
  };

  // Social profile handlers
  const addSocialProfile = () => {
    const newProfile = {
      platform: 'linkedin' as const,
      url: ''
    };
    setFormData({
      ...formData,
      socialProfiles: [...(formData.socialProfiles || []), newProfile]
    });
  };

  const removeSocialProfile = (index: number) => {
    const updatedProfiles = (formData.socialProfiles || []).filter((_, i) => i !== index);
    setFormData({ ...formData, socialProfiles: updatedProfiles });
  };

  return (
    <FieldGroup>
      {/* Email Addresses */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">E-Mail-Adressen</div>
          <Button type="button" onClick={addEmailField} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            E-Mail hinzufügen
          </Button>
        </div>

        {formData.emails && formData.emails.length > 0 ? (
          <div className="space-y-2">
            {formData.emails.map((email, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <Select
                    value={email.type}
                    onChange={(e) => {
                      const updated = [...formData.emails!];
                      updated[index].type = e.target.value as any;
                      setFormData({ ...formData, emails: updated });
                    }}
                  >
                    <option value="business">Geschäftlich</option>
                    <option value="private">Privat</option>
                    <option value="other">Sonstige</option>
                  </Select>
                </div>
                <div className="col-span-7">
                  <Input
                    type="email"
                    value={email.email}
                    onChange={(e) => {
                      const updated = [...formData.emails!];
                      updated[index].email = e.target.value;
                      setFormData({ ...formData, emails: updated });
                    }}
                    placeholder="email@beispiel.de"
                  />
                </div>
                <div className="col-span-1 flex items-center">
                  <Checkbox
                    checked={email.isPrimary}
                    onChange={(checked) => {
                      const updated = [...formData.emails!];
                      // Ensure only one primary
                      updated.forEach((e, i) => {
                        e.isPrimary = i === index && checked;
                      });
                      setFormData({ ...formData, emails: updated });
                    }}
                    aria-label="Primär"
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" plain onClick={() => removeEmailField(index)}>
                    <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-sm text-gray-500">Keine E-Mail-Adressen hinzugefügt</Text>
        )}
      </div>

      {/* Phone Numbers */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Telefonnummern</div>
          <Button type="button" onClick={addPhoneField} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            Nummer hinzufügen
          </Button>
        </div>

        {formData.phones && formData.phones.length > 0 ? (
          <div className="space-y-2">
            {formData.phones.map((phone, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-2">
                  <Select
                    value={phone.type}
                    onChange={(e) => {
                      const updated = [...formData.phones!];
                      updated[index].type = e.target.value as any;
                      setFormData({ ...formData, phones: updated });
                    }}
                  >
                    <option value="business">Geschäftlich</option>
                    <option value="mobile">Mobil</option>
                    <option value="private">Privat</option>
                    <option value="fax">Fax</option>
                    <option value="other">Sonstige</option>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Select
                    value={phone.countryCode || 'DE'}
                    onChange={(e) => {
                      const updated = [...formData.phones!];
                      updated[index].countryCode = e.target.value;
                      setFormData({ ...formData, phones: updated });
                    }}
                  >
                    {COUNTRY_OPTIONS.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-6">
                  <PhoneInput
                    value={phone.number}
                    onChange={(value) => {
                      const updated = [...formData.phones!];
                      updated[index].number = value || '';
                      setFormData({ ...formData, phones: updated });
                    }}
                    defaultCountry={phone.countryCode || 'DE'}
                    showCountrySelect={false}
                    placeholder="30 12345678"
                    keepInvalidInput={true}
                    onValidationError={(error) => {
                      // Telefonnummer-Validierungsfehler werden automatisch angezeigt
                    }}
                  />
                </div>
                <div className="col-span-1 flex items-center pt-2">
                  <Checkbox
                    checked={phone.isPrimary}
                    onChange={(checked) => {
                      const updated = [...formData.phones!];
                      // Ensure only one primary
                      updated.forEach((p, i) => {
                        p.isPrimary = i === index && checked;
                      });
                      setFormData({ ...formData, phones: updated });
                    }}
                    aria-label="Primär"
                  />
                </div>
                <div className="col-span-1 pt-2">
                  <Button type="button" plain onClick={() => removePhoneField(index)}>
                    <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-sm text-gray-500">Keine Telefonnummern hinzugefügt</Text>
        )}
      </div>

      {/* Social Profiles */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Social Media Profile</div>
          <Button type="button" onClick={addSocialProfile} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            Profil hinzufügen
          </Button>
        </div>

        {formData.socialProfiles && formData.socialProfiles.length > 0 ? (
          <div className="space-y-2">
            {formData.socialProfiles.map((profile, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <Select
                    value={profile.platform}
                    onChange={(e) => {
                      const updated = [...formData.socialProfiles!];
                      updated[index].platform = e.target.value;
                      setFormData({ ...formData, socialProfiles: updated });
                    }}
                  >
                    {Object.entries(socialPlatformLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-7">
                  <Input
                    value={profile.url}
                    onChange={(e) => {
                      const updated = [...formData.socialProfiles!];
                      updated[index].url = e.target.value;
                      setFormData({ ...formData, socialProfiles: updated });
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" plain onClick={() => removeSocialProfile(index)}>
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

      {/* Communication Preferences */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-900">Kommunikations-Präferenzen</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label>Bevorzugter Kanal</Label>
            <Select
              value={formData.communicationPreferences?.preferredChannel || ''}
              onChange={(e) => setFormData({
                ...formData,
                communicationPreferences: {
                  ...formData.communicationPreferences,
                  preferredChannel: e.target.value as any
                }
              })}
            >
              <option value="">Keine Präferenz</option>
              {COMMUNICATION_CHANNELS.map(channel => (
                <option key={channel.value} value={channel.value}>
                  {channel.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Bevorzugte Sprache</Label>
            <div className="relative" data-slot="control">
              {formData.communicationPreferences?.preferredLanguage && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                  <FlagIcon
                    countryCode={formData.communicationPreferences.preferredLanguage === 'en' ? 'GB' : formData.communicationPreferences.preferredLanguage.toUpperCase()}
                    className="h-3 w-5"
                  />
                </div>
              )}
              <Select
                value={formData.communicationPreferences?.preferredLanguage || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  communicationPreferences: {
                    ...formData.communicationPreferences,
                    preferredLanguage: e.target.value as LanguageCode
                  }
                })}
                className={formData.communicationPreferences?.preferredLanguage ? 'pl-11' : ''}
              >
                <option value="">Sprache auswählen...</option>
                <option value="de">Deutsch</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="nl">Nederlands</option>
                <option value="pl">Polski</option>
                <option value="ru">Русский</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </Select>
            </div>
          </Field>
        </div>
      </div>
    </FieldGroup>
  );
}
