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
  return (
    <FieldGroup>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Geburtstag</Label>
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
                birthday: e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : undefined
              }
            })}
          />
        </Field>
        <Field>
          <Label>Nationalität</Label>
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
              <option value="">Nationalität auswählen...</option>
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

      <Field>
        <Label>Interessen</Label>
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
          placeholder="z.B. Golf, Technologie, Reisen (kommagetrennt)"
        />
      </Field>

      <Field>
        <Label>Interne Notizen</Label>
        <Textarea
          value={formData.internalNotes || ''}
          onChange={(e) => setFormData({
            ...formData,
            internalNotes: e.target.value
          })}
          rows={4}
          placeholder="Interne Notizen für das Team (nicht sichtbar für externe Kontakte)..."
        />
      </Field>
    </FieldGroup>
  );
}
