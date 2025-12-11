// src/app/dashboard/contacts/crm/components/modals/CompanyModal/CorporateSection.tsx
"use client";

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('crm.companyModal.corporate');

  return (
    <FieldGroup>
      <Field>
        <Label>
          {t('parentCompany')}
          <InfoTooltip content={t('parentCompanyTooltip')} className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Select
          value={formData.parentCompanyId || ''}
          onChange={(e) => setFormData({ ...formData, parentCompanyId: e.target.value || undefined })}
        >
          <option value="">{t('noParentCompany')}</option>
          {companies.map(comp => (
            <option key={comp.id} value={comp.id}>{comp.name}</option>
          ))}
        </Select>
      </Field>

      <Field>
        <Label>
          {t('ultimateParent')}
          <InfoTooltip content={t('ultimateParentTooltip')} className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Select
          value={formData.ultimateParentId || ''}
          onChange={(e) => setFormData({ ...formData, ultimateParentId: e.target.value || undefined })}
        >
          <option value="">{t('noUltimateParent')}</option>
          {companies.map(comp => (
            <option key={comp.id} value={comp.id}>{comp.name}</option>
          ))}
        </Select>
      </Field>
    </FieldGroup>
  );
}
