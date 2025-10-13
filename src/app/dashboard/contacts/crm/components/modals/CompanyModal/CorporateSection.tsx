// src/app/dashboard/contacts/crm/components/modals/CompanyModal/CorporateSection.tsx
"use client";

import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Select } from "@/components/ui/select";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CompanyModalSectionProps } from "./types";

/**
 * Corporate Section für CompanyModal
 *
 * Enthält: Muttergesellschaft, Oberste Muttergesellschaft
 */
export function CorporateSection({ formData, setFormData, companies = [] }: CompanyModalSectionProps) {
  return (
    <FieldGroup>
      <Field>
        <Label>
          Muttergesellschaft
          <InfoTooltip content="Direkte Muttergesellschaft dieses Unternehmens" className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Select
          value={formData.parentCompanyId || ''}
          onChange={(e) => setFormData({ ...formData, parentCompanyId: e.target.value || undefined })}
        >
          <option value="">Keine Muttergesellschaft</option>
          {companies.map(comp => (
            <option key={comp.id} value={comp.id}>{comp.name}</option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label>
          Oberste Muttergesellschaft
          <InfoTooltip content="Oberste Muttergesellschaft in der Konzernstruktur" className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Select
          value={formData.ultimateParentId || ''}
          onChange={(e) => setFormData({ ...formData, ultimateParentId: e.target.value || undefined })}
        >
          <option value="">Keine oberste Muttergesellschaft</option>
          {companies.map(comp => (
            <option key={comp.id} value={comp.id}>{comp.name}</option>
          ))}
        </Select>
      </Field>
    </FieldGroup>
  );
}
