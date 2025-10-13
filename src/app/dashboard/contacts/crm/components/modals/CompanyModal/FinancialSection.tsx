// src/app/dashboard/contacts/crm/components/modals/CompanyModal/FinancialSection.tsx
"use client";

import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CurrencyCode } from "@/types/international";
import { CompanyModalSectionProps } from "./types";

/**
 * Financial Section für CompanyModal
 *
 * Enthält: Jahresumsatz, Mitarbeiterzahl, Geschäftsjahresende, Kreditrating
 */
export function FinancialSection({ formData, setFormData }: CompanyModalSectionProps) {
  return (
    <FieldGroup>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Jahresumsatz</Label>
          <CurrencyInput
            value={formData.financial?.annualRevenue?.amount}
            onChange={(value) => setFormData({
              ...formData,
              financial: {
                ...formData.financial!,
                annualRevenue: value ? { amount: value, currency: 'EUR' as CurrencyCode } : undefined
              }
            })}
            currency={'EUR'}
            currencyPosition="right"
            placeholder="0,00"
          />
        </Field>
        <Field>
          <Label>Mitarbeiterzahl</Label>
          <Input
            type="number"
            value={formData.financial?.employees || ''}
            onChange={(e) => setFormData({
              ...formData,
              financial: {
                ...formData.financial!,
                employees: e.target.value ? parseInt(e.target.value) : undefined
              }
            })}
            placeholder="0"
          />
        </Field>
      </div>

      <Field>
        <Label>
          Geschäftsjahresende
          <InfoTooltip content="Format: TT.MM. (z.B. 31.12. für 31. Dezember)" className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Input
          type="text"
          value={formData.financial?.fiscalYearEnd || ''}
          onChange={(e) => setFormData({
            ...formData,
            financial: {
              ...formData.financial!,
              fiscalYearEnd: e.target.value || undefined
            }
          })}
          placeholder="31.12."
        />
      </Field>

      <Field>
        <Label>Kreditrating</Label>
        <Input
          value={formData.financial?.creditRating || ''}
          onChange={(e) => setFormData({
            ...formData,
            financial: { ...formData.financial!, creditRating: e.target.value || undefined }
          })}
          placeholder="AAA, BB+, etc."
        />
      </Field>
    </FieldGroup>
  );
}
