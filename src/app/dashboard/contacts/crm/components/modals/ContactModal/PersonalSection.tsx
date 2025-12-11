// src/app/dashboard/contacts/crm/components/modals/ContactModal/PersonalSection.tsx
"use client";

import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { CountryCode } from "@/types/international";
import { ContactModalSectionProps } from "./types";
import { Timestamp } from 'firebase/firestore';
import * as Flags from 'country-flag-icons/react/3x2';
import { useTranslations } from 'next-intl';

// Flag Component
const FlagIcon = ({ countryCode, className = "h-4 w-6" }: { countryCode?: string; className?: string }) => {
  if (!countryCode) return null;
  // @ts-ignore - Dynamic import from flag library
  const Flag = Flags[countryCode.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={className} title={countryCode} />;
};

/**
 * Personal Section für ContactModal
 *
 * Enthält: Geburtstag, Nationalität, Interessen, Interne Notizen
 */
export function PersonalSection({ formData, setFormData }: ContactModalSectionProps) {
  const t = useTranslations('crm.contactModal.personal');

  return (
    <FieldGroup>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>{t('birthday')}</Label>
          <Input
            type="date"
            value={(() => {
              if (!formData.personalInfo?.birthday) return '';

              // Handle Date object
              if (formData.personalInfo.birthday instanceof Date) {
                return formData.personalInfo.birthday.toISOString().split('T')[0];
              }

              // Handle Firestore Timestamp with toDate method
              if ((formData.personalInfo.birthday as any).toDate) {
                return (formData.personalInfo.birthday as any).toDate().toISOString().split('T')[0];
              }

              // Handle plain Timestamp object {seconds, nanoseconds}
              const ts = formData.personalInfo.birthday as any;
              if (ts.seconds !== undefined) {
                const date = new Date(ts.seconds * 1000);
                return date.toISOString().split('T')[0];
              }

              return '';
            })()}
            onChange={(e) => setFormData({
              ...formData,
              personalInfo: {
                ...formData.personalInfo,
                birthday: e.target.value ? (Timestamp.fromDate(new Date(e.target.value)) as unknown as Date) : undefined
              }
            })}
          />
        </Field>
        <Field>
          <Label>{t('nationality')}</Label>
          <div className="relative" data-slot="control">
            {formData.personalInfo?.nationality && (
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                <FlagIcon countryCode={formData.personalInfo.nationality} className="h-3 w-5" />
              </div>
            )}
            <Select
              value={formData.personalInfo?.nationality || ''}
              onChange={(e) => setFormData({
                ...formData,
                personalInfo: {
                  ...formData.personalInfo,
                  nationality: e.target.value as CountryCode
                }
              })}
              className={formData.personalInfo?.nationality ? 'pl-11' : ''}
            >
              <option value="">{t('nationalityPlaceholder')}</option>
              <option value="DE">{t('countries.DE')}</option>
              <option value="AT">{t('countries.AT')}</option>
              <option value="CH">{t('countries.CH')}</option>
              <option value="US">{t('countries.US')}</option>
              <option value="GB">{t('countries.GB')}</option>
              <option value="FR">{t('countries.FR')}</option>
              <option value="IT">{t('countries.IT')}</option>
              <option value="ES">{t('countries.ES')}</option>
              <option value="NL">{t('countries.NL')}</option>
              <option value="BE">{t('countries.BE')}</option>
              <option value="LU">{t('countries.LU')}</option>
              <option value="DK">{t('countries.DK')}</option>
              <option value="SE">{t('countries.SE')}</option>
              <option value="NO">{t('countries.NO')}</option>
              <option value="FI">{t('countries.FI')}</option>
              <option value="PL">{t('countries.PL')}</option>
              <option value="CZ">{t('countries.CZ')}</option>
              <option value="HU">{t('countries.HU')}</option>
              <option value="PT">{t('countries.PT')}</option>
              <option value="GR">{t('countries.GR')}</option>
              <option value="IE">{t('countries.IE')}</option>
              <option value="CA">{t('countries.CA')}</option>
              <option value="AU">{t('countries.AU')}</option>
              <option value="JP">{t('countries.JP')}</option>
              <option value="CN">{t('countries.CN')}</option>
              <option value="IN">{t('countries.IN')}</option>
              <option value="BR">{t('countries.BR')}</option>
              <option value="MX">{t('countries.MX')}</option>
              <option value="RU">{t('countries.RU')}</option>
              <option value="TR">{t('countries.TR')}</option>
            </Select>
          </div>
        </Field>
      </div>

      <Field>
        <Label>{t('interests')}</Label>
        <Textarea
          value={formData.personalInfo?.interests?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            personalInfo: {
              ...formData.personalInfo,
              interests: e.target.value.split(',').map(i => i.trim()).filter(i => i.length > 0)
            }
          })}
          rows={2}
          placeholder={t('interestsPlaceholder')}
        />
      </Field>

      <Field>
        <Label>{t('internalNotes')}</Label>
        <Textarea
          value={formData.internalNotes || ''}
          onChange={(e) => setFormData({
            ...formData,
            internalNotes: e.target.value
          })}
          rows={4}
          placeholder={t('internalNotesPlaceholder')}
        />
      </Field>
    </FieldGroup>
  );
}
