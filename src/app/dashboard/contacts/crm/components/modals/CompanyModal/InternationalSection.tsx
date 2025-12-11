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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('crm.companyModal.international');

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
        <div className="text-sm font-medium text-gray-900">{t('mainAddress.title')}</div>

        <Field>
          <Label>{t('mainAddress.street')}</Label>
          <Input
            value={formData.mainAddress?.street || ''}
            onChange={(e) => setFormData({
              ...formData,
              mainAddress: { ...formData.mainAddress!, street: e.target.value }
            })}
            placeholder={t('mainAddress.streetPlaceholder')}
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field>
            <Label>{t('mainAddress.postalCode')}</Label>
            <Input
              value={formData.mainAddress?.postalCode || ''}
              onChange={(e) => setFormData({
                ...formData,
                mainAddress: { ...formData.mainAddress!, postalCode: e.target.value }
              })}
              placeholder={t('mainAddress.postalCodePlaceholder')}
            />
          </Field>
          <Field className="col-span-2">
            <Label>{t('mainAddress.city')}</Label>
            <Input
              value={formData.mainAddress?.city || ''}
              onChange={(e) => setFormData({
                ...formData,
                mainAddress: { ...formData.mainAddress!, city: e.target.value }
              })}
              placeholder={t('mainAddress.cityPlaceholder')}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>{t('mainAddress.region')}</Label>
            <Input
              value={formData.mainAddress?.region || ''}
              onChange={(e) => setFormData({
                ...formData,
                mainAddress: { ...formData.mainAddress!, region: e.target.value }
              })}
              placeholder={t('mainAddress.regionPlaceholder')}
            />
          </Field>
          <Field>
            <Label>{t('mainAddress.country')}</Label>
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
                <option value="">{t('mainAddress.countryPlaceholder')}</option>
                <option value="DE">{t('mainAddress.countries.DE')}</option>
                <option value="AT">{t('mainAddress.countries.AT')}</option>
                <option value="CH">{t('mainAddress.countries.CH')}</option>
                <option value="US">{t('mainAddress.countries.US')}</option>
                <option value="GB">{t('mainAddress.countries.GB')}</option>
                <option value="FR">{t('mainAddress.countries.FR')}</option>
                <option value="IT">{t('mainAddress.countries.IT')}</option>
                <option value="ES">{t('mainAddress.countries.ES')}</option>
                <option value="NL">{t('mainAddress.countries.NL')}</option>
                <option value="BE">{t('mainAddress.countries.BE')}</option>
                <option value="LU">{t('mainAddress.countries.LU')}</option>
                <option value="DK">{t('mainAddress.countries.DK')}</option>
                <option value="SE">{t('mainAddress.countries.SE')}</option>
                <option value="NO">{t('mainAddress.countries.NO')}</option>
                <option value="FI">{t('mainAddress.countries.FI')}</option>
                <option value="PL">{t('mainAddress.countries.PL')}</option>
                <option value="CZ">{t('mainAddress.countries.CZ')}</option>
                <option value="HU">{t('mainAddress.countries.HU')}</option>
                <option value="PT">{t('mainAddress.countries.PT')}</option>
                <option value="GR">{t('mainAddress.countries.GR')}</option>
                <option value="IE">{t('mainAddress.countries.IE')}</option>
                <option value="CA">{t('mainAddress.countries.CA')}</option>
                <option value="AU">{t('mainAddress.countries.AU')}</option>
                <option value="JP">{t('mainAddress.countries.JP')}</option>
                <option value="CN">{t('mainAddress.countries.CN')}</option>
                <option value="IN">{t('mainAddress.countries.IN')}</option>
                <option value="BR">{t('mainAddress.countries.BR')}</option>
                <option value="MX">{t('mainAddress.countries.MX')}</option>
                <option value="RU">{t('mainAddress.countries.RU')}</option>
                <option value="TR">{t('mainAddress.countries.TR')}</option>
              </Select>
            </div>
          </Field>
        </div>
      </div>

      {/* Phone Numbers */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">{t('phones.title')}</div>
          <Button type="button" onClick={addPhoneField} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            {t('phones.addButton')}
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
                    <option value="business">{t('phones.types.business')}</option>
                    <option value="mobile">{t('phones.types.mobile')}</option>
                    <option value="private">{t('phones.types.private')}</option>
                    <option value="fax">{t('phones.types.fax')}</option>
                    <option value="other">{t('phones.types.other')}</option>
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
                    placeholder={t('phones.phonePlaceholder')}
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
          <Text className="text-sm text-gray-500">{t('phones.empty')}</Text>
        )}
      </div>

      {/* Email Addresses */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">{t('emails.title')}</div>
          <Button type="button" onClick={addEmailField} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            {t('emails.addButton')}
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
                    <option value="general">{t('emails.types.general')}</option>
                    <option value="support">{t('emails.types.support')}</option>
                    <option value="sales">{t('emails.types.sales')}</option>
                    <option value="billing">{t('emails.types.billing')}</option>
                    <option value="press">{t('emails.types.press')}</option>
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
                    placeholder={t('emails.emailPlaceholder')}
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
          <Text className="text-sm text-gray-500">{t('emails.empty')}</Text>
        )}
      </div>

      {/* Social Media */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">{t('socialMedia.title')}</div>
          <Button type="button" onClick={addSocialMediaField} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            {t('socialMedia.addButton')}
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
                    placeholder={t('socialMedia.urlPlaceholder')}
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
          <Text className="text-sm text-gray-500">{t('socialMedia.empty')}</Text>
        )}
      </div>
    </FieldGroup>
  );
}
