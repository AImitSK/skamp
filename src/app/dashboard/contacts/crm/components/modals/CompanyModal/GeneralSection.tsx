// src/app/dashboard/contacts/crm/components/modals/CompanyModal/GeneralSection.tsx
"use client";

import { useTranslations } from "next-intl";
import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { InfoTooltip } from "@/components/InfoTooltip";
import { TagInput } from "@/components/ui/tag-input";
import { CompanyType } from "@/types/crm";
import { COMPANY_STATUS_OPTIONS, LIFECYCLE_STAGE_OPTIONS } from "@/types/crm-enhanced";
import { CompanyModalSectionProps } from "./types";

/**
 * General Section für CompanyModal
 *
 * Enthält: Name, Typ, Branche, Status, Lifecycle Stage, Website, Tags, Notizen
 */
export function GeneralSection({
  formData,
  setFormData,
  tags = [],
  onCreateTag
}: CompanyModalSectionProps) {
  const t = useTranslations('crm.companyModal.general');
  const isMediaCompany = ['publisher', 'media_house', 'agency'].includes(formData.type!);

  return (
    <FieldGroup>
      <Field>
        <Label>
          {t('name')}
          <InfoTooltip content={t('nameTooltip')} className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>{t('type')}</Label>
          <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as CompanyType })}>
            <option value="customer">{t('types.customer')}</option>
            <option value="supplier">{t('types.supplier')}</option>
            <option value="partner">{t('types.partner')}</option>
            <option value="publisher">{t('types.publisher')}</option>
            <option value="media_house">{t('types.mediaHouse')}</option>
            <option value="agency">{t('types.agency')}</option>
            <option value="other">{t('types.other')}</option>
          </Select>
        </Field>
        <Field>
          <Label>
            {t('industry')}
            {isMediaCompany && (
              <InfoTooltip content={t('industryTooltip')} className="ml-1.5 inline-flex align-text-top" />
            )}
          </Label>
          <Input
            value={formData.industryClassification?.primary || ''}
            onChange={(e) => setFormData({
              ...formData,
              industryClassification: {
                ...formData.industryClassification,
                primary: e.target.value
              }
            })}
            placeholder={isMediaCompany ? t('industryDisabled') : t('industryPlaceholder')}
            disabled={isMediaCompany}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>{t('status')}</Label>
          <Select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          >
            <option value="prospect">{t('statusOptions.prospect')}</option>
            <option value="active">{t('statusOptions.active')}</option>
            <option value="inactive">{t('statusOptions.inactive')}</option>
            <option value="archived">{t('statusOptions.archived')}</option>
          </Select>
        </Field>
        <Field>
          <Label>{t('lifecycleStage')}</Label>
          <Select
            value={formData.lifecycleStage}
            onChange={(e) => setFormData({ ...formData, lifecycleStage: e.target.value as any })}
          >
            <option value="lead">{t('lifecycleOptions.lead')}</option>
            <option value="opportunity">{t('lifecycleOptions.opportunity')}</option>
            <option value="customer">{t('lifecycleOptions.customer')}</option>
            <option value="partner">{t('lifecycleOptions.partner')}</option>
            <option value="former">{t('lifecycleOptions.former')}</option>
          </Select>
        </Field>
      </div>

      <Field>
        <Label>{t('website')}</Label>
        <Input
          type="url"
          value={formData.website || ''}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder={t('websitePlaceholder')}
        />
      </Field>

      {/* Tags */}
      {onCreateTag && (
        <Field>
          <Label>{t('tags')}</Label>
          <TagInput
            selectedTagIds={formData.tagIds || []}
            availableTags={tags}
            onChange={(tagIds) => setFormData({ ...formData, tagIds })}
            onCreateTag={onCreateTag}
          />
        </Field>
      )}

      {/* Notes */}
      <Field>
        <Label>{t('internalNotes')}</Label>
        <Textarea
          value={formData.internalNotes || ''}
          onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
          rows={3}
          placeholder={t('internalNotesPlaceholder')}
        />
      </Field>

      <Field>
        <Label>{t('description')}</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder={t('descriptionPlaceholder')}
        />
      </Field>
    </FieldGroup>
  );
}
