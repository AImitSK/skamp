// src/app/dashboard/contacts/crm/components/modals/CompanyModal/LegalSection.tsx
"use client";

import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { InfoTooltip } from "@/components/InfoTooltip";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Timestamp } from 'firebase/firestore';
import { CompanyModalSectionProps } from "./types";

const LEGAL_FORMS = [
  { value: 'GmbH', label: 'GmbH' },
  { value: 'AG', label: 'AG' },
  { value: 'KG', label: 'KG' },
  { value: 'OHG', label: 'OHG' },
  { value: 'GbR', label: 'GbR' },
  { value: 'UG', label: 'UG (haftungsbeschränkt)' },
  { value: 'Ltd', label: 'Ltd.' },
  { value: 'Inc', label: 'Inc.' },
  { value: 'LLC', label: 'LLC' },
  { value: 'SA', label: 'SA' },
  { value: 'SAS', label: 'SAS' },
  { value: 'BV', label: 'BV' },
  { value: 'Other', label: 'Sonstige' }
];

const IDENTIFIER_TYPES = [
  { value: 'VAT_EU', label: 'USt-IdNr. (EU)' },
  { value: 'EIN_US', label: 'EIN (US)' },
  { value: 'COMPANY_REG_DE', label: 'Handelsregister (DE)' },
  { value: 'COMPANY_REG_UK', label: 'Companies House (UK)' },
  { value: 'UID_CH', label: 'UID (CH)' },
  { value: 'SIREN_FR', label: 'SIREN (FR)' },
  { value: 'DUNS', label: 'D-U-N-S' },
  { value: 'LEI', label: 'LEI' },
  { value: 'OTHER', label: 'Sonstige' }
];

/**
 * Legal Section für CompanyModal
 *
 * Enthält: Offizieller Name, Handelsname, Rechtsform, Gründungsdatum, Business Identifiers
 */
export function LegalSection({ formData, setFormData }: CompanyModalSectionProps) {
  const addIdentifier = () => {
    const newIdentifier = {
      type: 'VAT_EU' as const,
      value: '',
      issuingAuthority: 'DE',
      validFrom: undefined,
      validUntil: undefined
    };
    setFormData({ ...formData, identifiers: [...(formData.identifiers || []), newIdentifier] });
  };

  const removeIdentifier = (index: number) => {
    const updatedIdentifiers = (formData.identifiers || []).filter((_, i) => i !== index);
    setFormData({ ...formData, identifiers: updatedIdentifiers });
  };

  return (
    <FieldGroup>
      <Field>
        <Label>
          Offizieller Firmenname
          <InfoTooltip content="Name laut Handelsregister oder offiziellen Dokumenten" className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Input
          value={formData.officialName || ''}
          onChange={(e) => setFormData({ ...formData, officialName: e.target.value })}
          placeholder="z.B. Example GmbH"
        />
      </Field>

      <Field>
        <Label>
          Handelsname (DBA)
          <InfoTooltip content="Falls anders als offizieller Name" className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Input
          value={formData.tradingName || ''}
          onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
          placeholder="z.B. Example"
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Rechtsform</Label>
          <Select
            value={formData.legalForm || ''}
            onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
          >
            <option value="">Bitte wählen...</option>
            {LEGAL_FORMS.map(form => (
              <option key={form.value} value={form.value}>{form.label}</option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label>Gründungsdatum</Label>
          <Input
            type="date"
            value={(() => {
              if (!formData.foundedDate) return '';

              // Handle Date object
              if (formData.foundedDate instanceof Date) {
                return formData.foundedDate.toISOString().split('T')[0];
              }

              // Handle Firestore Timestamp with toDate method
              if ((formData.foundedDate as any).toDate) {
                return (formData.foundedDate as any).toDate().toISOString().split('T')[0];
              }

              // Handle plain Timestamp object {seconds, nanoseconds}
              const ts = formData.foundedDate as any;
              if (ts.seconds !== undefined) {
                const date = new Date(ts.seconds * 1000);
                return date.toISOString().split('T')[0];
              }

              return '';
            })()}
            onChange={(e) => setFormData({
              ...formData,
              foundedDate: e.target.value ? Timestamp.fromDate(new Date(e.target.value)) : undefined
            })}
          />
        </Field>
      </div>

      {/* Business Identifiers */}
      <div className="space-y-4 rounded-md border p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">
            Geschäftliche Kennungen
            <InfoTooltip content="USt-ID, Handelsregister, etc." className="ml-1.5 inline-flex align-text-top" />
          </div>
          <Button type="button" onClick={addIdentifier} plain className="text-sm">
            <PlusIcon className="h-4 w-4" />
            Kennung hinzufügen
          </Button>
        </div>

        {formData.identifiers && formData.identifiers.length > 0 ? (
          <div className="space-y-2">
            {formData.identifiers.map((identifier, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <Select
                      value={identifier.type}
                      onChange={(e) => {
                        const updated = [...formData.identifiers!];
                        updated[index].type = e.target.value as any;
                        setFormData({ ...formData, identifiers: updated });
                      }}
                    >
                      {IDENTIFIER_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-6">
                    <Input
                      value={identifier.value}
                      onChange={(e) => {
                        const updated = [...formData.identifiers!];
                        updated[index].value = e.target.value;
                        setFormData({ ...formData, identifiers: updated });
                      }}
                      placeholder="Wert eingeben..."
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={identifier.issuingAuthority || ''}
                      onChange={(e) => {
                        const updated = [...formData.identifiers!];
                        updated[index].issuingAuthority = e.target.value;
                        setFormData({ ...formData, identifiers: updated });
                      }}
                      placeholder="Land/Behörde"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" plain onClick={() => removeIdentifier(index)}>
                      <TrashIcon className="h-5 w-5 text-zinc-500 hover:text-zinc-700" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Text className="text-sm text-gray-500">Keine Kennungen hinzugefügt</Text>
        )}
      </div>
    </FieldGroup>
  );
}
