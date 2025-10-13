// src/app/dashboard/contacts/crm/components/modals/CompanyModal/InternationalSection.tsx
"use client";

import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CountryCode } from "@/types/international";
import { SocialPlatform, socialPlatformLabels } from "@/types/crm";
import { CompanyModalSectionProps } from "./types";
import * as Flags from 'country-flag-icons/react/3x2';

const FlagIcon = ({ countryCode, className = "h-4 w-6" }: { countryCode?: string; className?: string }) => {
  if (!countryCode) return null;
  // @ts-ignore - Dynamic import from flag library
  const Flag = Flags[countryCode.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={className} title={countryCode} />;
};

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
 * International Section für CompanyModal
 *
 * Enthält: Adresse, Telefonnummern, E-Mail-Adressen, Social Media
 */
export function InternationalSection({ formData, setFormData }: CompanyModalSectionProps) {
  const addPhoneField = () => {
    const newPhone = {
      type: 'business' as const,
      number: '',
      countryCode: formData.mainAddress?.countryCode || 'DE',
      isPrimary: false
    };
    setFormData({ ...formData, phones: [...(formData.phones || []), newPhone] });
  };

  const removePhoneField = (index: number) => {
    const updatedPhones = (formData.phones || []).filter((_, i) => i !== index);
    setFormData({ ...formData, phones: updatedPhones });
  };

  const addEmailField = () => {
    const newEmail = { type: 'general' as const, email: '', isPrimary: false };
    setFormData({ ...formData, emails: [...(formData.emails || []), newEmail] });
  };

  const removeEmailField = (index: number) => {
    const updatedEmails = (formData.emails || []).filter((_, i) => i !== index);
    setFormData({ ...formData, emails: updatedEmails });
  };

  const addSocialMediaField = () => {
    const newField = { platform: 'linkedin' as SocialPlatform, url: '' };
    setFormData({ ...formData, socialMedia: [...(formData.socialMedia || []), newField] });
  };

  const removeSocialMediaField = (index: number) => {
    const updatedSocialMedia = (formData.socialMedia || []).filter((_, i) => i !== index);
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };

  const handleSocialMediaChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updatedSocialMedia = [...(formData.socialMedia || [])];
    updatedSocialMedia[index] = { ...updatedSocialMedia[index], [field]: value };
    setFormData({ ...formData, socialMedia: updatedSocialMedia });
  };

  return (
    <FieldGroup>
      {/* Main Address */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-900">Hauptadresse</div>

        <Field>
          <Label>Straße und Hausnummer</Label>
          <Input
            value={formData.mainAddress?.street || ''}
            onChange={(e) => setFormData({
              ...formData,
              mainAddress: { ...formData.mainAddress!, street: e.target.value }
            })}
            placeholder="Musterstraße 123"
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field>
            <Label>PLZ</Label>
            <Input
              value={formData.mainAddress?.postalCode || ''}
              onChange={(e) => setFormData({
                ...formData,
                mainAddress: { ...formData.mainAddress!, postalCode: e.target.value }
              })}
              placeholder="12345"
            />
          </Field>
          <Field className="col-span-2">
            <Label>Stadt</Label>
            <Input
              value={formData.mainAddress?.city || ''}
              onChange={(e) => setFormData({
                ...formData,
                mainAddress: { ...formData.mainAddress!, city: e.target.value }
              })}
              placeholder="Berlin"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Bundesland/Region</Label>
            <Input
              value={formData.mainAddress?.region || ''}
              onChange={(e) => setFormData({
                ...formData,
                mainAddress: { ...formData.mainAddress!, region: e.target.value }
              })}
              placeholder="Bayern"
            />
          </Field>
          <Field>
            <Label>Land</Label>
            <div className="relative" data-slot="control">
              {formData.mainAddress?.countryCode && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                  <FlagIcon countryCode={formData.mainAddress.countryCode} className="h-3 w-5" />
                </div>
              )}
              <Select
                value={formData.mainAddress?.countryCode || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  mainAddress: { ...formData.mainAddress!, countryCode: e.target.value as CountryCode }
                })}
                className={formData.mainAddress?.countryCode ? 'pl-11' : ''}
              >
                <option value="">Land auswählen...</option>
                <option value="DE">Deutschland</option>
                <option value="AT">Österreich</option>
                <option value="CH">Schweiz</option>
                <option value="US">USA</option>
                <option value="GB">Großbritannien</option>
                <option value="FR">Frankreich</option>
                <option value="IT">Italien</option>
                <option value="ES">Spanien</option>
                <option value="NL">Niederlande</option>
                <option value="BE">Belgien</option>
                <option value="LU">Luxemburg</option>
                <option value="DK">Dänemark</option>
                <option value="SE">Schweden</option>
                <option value="NO">Norwegen</option>
                <option value="FI">Finnland</option>
                <option value="PL">Polen</option>
                <option value="CZ">Tschechien</option>
                <option value="HU">Ungarn</option>
                <option value="PT">Portugal</option>
                <option value="GR">Griechenland</option>
                <option value="IE">Irland</option>
                <option value="CA">Kanada</option>
                <option value="AU">Australien</option>
                <option value="JP">Japan</option>
                <option value="CN">China</option>
                <option value="IN">Indien</option>
                <option value="BR">Brasilien</option>
                <option value="MX">Mexiko</option>
                <option value="RU">Russland</option>
                <option value="TR">Türkei</option>
              </Select>
            </div>
          </Field>
        </div>
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
          <div className="space-y-3">
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
                    value={phone.countryCode || formData.mainAddress?.countryCode || 'DE'}
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
                    defaultCountry={phone.countryCode || formData.mainAddress?.countryCode || 'DE'}
                    showCountrySelect={false}
                    placeholder="30 12345678"
                    keepInvalidInput={true}
                    onValidationError={(error) => {}}
                  />
                </div>
                <div className="col-span-1 flex items-center pt-2">
                  <Checkbox
                    checked={phone.isPrimary}
                    onChange={(checked) => {
                      const updated = [...formData.phones!];
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
                    <option value="general">Allgemein</option>
                    <option value="support">Support</option>
                    <option value="sales">Vertrieb</option>
                    <option value="billing">Buchhaltung</option>
                    <option value="press">Presse</option>
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
                    placeholder="email@firma.de"
                  />
                </div>
                <div className="col-span-1 flex items-center">
                  <Checkbox
                    checked={email.isPrimary}
                    onChange={(checked) => {
                      const updated = [...formData.emails!];
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

      {/* Social Media */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Social Media Profile</div>
          <Button type="button" onClick={addSocialMediaField} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            Profil hinzufügen
          </Button>
        </div>

        {formData.socialMedia && formData.socialMedia.length > 0 ? (
          <div className="space-y-2">
            {formData.socialMedia.map((profile, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Select
                    value={profile.platform}
                    onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
                  >
                    {Object.entries(socialPlatformLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-6">
                  <Input
                    value={profile.url}
                    onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-1">
                  <Button type="button" plain onClick={() => removeSocialMediaField(index)}>
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
    </FieldGroup>
  );
}
