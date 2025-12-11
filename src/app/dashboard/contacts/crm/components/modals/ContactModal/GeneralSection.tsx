// src/app/dashboard/contacts/crm/components/modals/ContactModal/GeneralSection.tsx
"use client";

import { useTranslations } from "next-intl";
import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { InfoTooltip } from "@/components/InfoTooltip";
import { CONTACT_STATUS_OPTIONS } from "@/types/crm-enhanced";
import { ContactModalSectionProps } from "./types";

/**
 * General Section für ContactModal
 *
 * Enthält: Anrede, Titel, Vorname, Nachname, Firma, Position, Abteilung, Tags, Status, Journalist-Checkbox
 */
export function GeneralSection({
  formData,
  setFormData,
  tags = [],
  companies = [],
  onCreateTag,
  onCompanyChange
}: ContactModalSectionProps) {
  const t = useTranslations('crm.contactModal.general');

  return (
    <FieldGroup>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>{t('labels.salutation')}</Label>
          <Select
            value={formData.name?.salutation || ''}
            onChange={(e) => setFormData({
              ...formData,
              name: {
                ...formData.name!,
                salutation: e.target.value
              }
            })}
          >
            <option value="">{t('salutations.none')}</option>
            <option value="Herr">{t('salutations.mr')}</option>
            <option value="Frau">{t('salutations.ms')}</option>
            <option value="Dr.">{t('salutations.dr')}</option>
            <option value="Prof.">{t('salutations.prof')}</option>
            <option value="Prof. Dr.">{t('salutations.profDr')}</option>
          </Select>
        </Field>
        <Field>
          <Label>{t('labels.title')}</Label>
          <Input
            value={formData.name?.title || ''}
            onChange={(e) => setFormData({
              ...formData,
              name: {
                ...formData.name!,
                title: e.target.value
              }
            })}
            placeholder={t('placeholders.titleExample')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>{t('labels.firstName')} {t('required')}</Label>
          <Input
            value={formData.name?.firstName || ''}
            onChange={(e) => setFormData({
              ...formData,
              name: {
                ...formData.name!,
                firstName: e.target.value
              }
            })}
            required
            autoFocus
          />
        </Field>
        <Field>
          <Label>{t('labels.lastName')} {t('required')}</Label>
          <Input
            value={formData.name?.lastName || ''}
            onChange={(e) => setFormData({
              ...formData,
              name: {
                ...formData.name!,
                lastName: e.target.value
              }
            })}
            required
          />
        </Field>
      </div>

      <Field>
        <Label>
          {t('labels.company')}
          <InfoTooltip content={t('company.tooltip')} className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Select
          value={formData.companyId || ''}
          onChange={(e) => onCompanyChange?.(e.target.value)}
        >
          <option value="">{t('company.none')}</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>{t('labels.position')}</Label>
          <Input
            value={formData.position || ''}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder={t('placeholders.positionExample')}
          />
        </Field>
        <Field>
          <Label>{t('labels.department')}</Label>
          <Input
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder={t('placeholders.departmentExample')}
          />
        </Field>
      </div>

      {/* Tags */}
      <Field>
        <Label>{t('labels.tags')}</Label>
        <TagInput
          selectedTagIds={formData.tagIds || []}
          availableTags={tags}
          onChange={(tagIds) => setFormData({ ...formData, tagIds })}
          onCreateTag={onCreateTag!}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>{t('labels.status')}</Label>
          <Select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          >
            {CONTACT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {t(`contactStatus.${opt.value}` as any)}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>
            {t('labels.isJournalist')}
            <InfoTooltip content={t('journalist.tooltip')} className="ml-1.5 inline-flex align-text-top" />
          </Label>
          <div className="mt-2">
            <label className="flex items-center">
              <Checkbox
                checked={formData.mediaProfile?.isJournalist || false}
                onChange={(checked) => setFormData({
                  ...formData,
                  mediaProfile: {
                    ...formData.mediaProfile!,
                    isJournalist: checked
                  }
                })}
              />
              <span className="ml-2">{t('journalist.label')}</span>
            </label>
          </div>
        </Field>
      </div>
    </FieldGroup>
  );
}
