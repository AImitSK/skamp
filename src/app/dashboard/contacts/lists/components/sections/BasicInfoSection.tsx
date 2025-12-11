// src/app/dashboard/contacts/lists/components/sections/BasicInfoSection.tsx
"use client";

import { useTranslations } from 'next-intl';
import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Radio, RadioGroup, RadioField } from "@/components/ui/radio";
import { BasicInfoSectionProps } from './types';

export function BasicInfoSection({ formData, onFormDataChange }: BasicInfoSectionProps) {
  const t = useTranslations('lists.sections.basicInfo');
  const tCategories = useTranslations('lists.categories');

  const categoryOptions = [
    { value: 'press', label: tCategories('press') },
    { value: 'customers', label: tCategories('customers') },
    { value: 'partners', label: tCategories('partners') },
    { value: 'leads', label: tCategories('leads') },
    { value: 'custom', label: tCategories('custom') }
  ] as const;

  return (
    <FieldGroup>
      {/* Basic Info */}
      <Field>
        <Label>{t('nameLabel')}</Label>
        <Input
          value={formData.name || ''}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          required
          autoFocus
          placeholder={t('namePlaceholder')}
        />
      </Field>

      <Field>
        <Label>{t('descriptionLabel')}</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          rows={2}
          placeholder={t('descriptionPlaceholder')}
        />
      </Field>

      <Field>
        <Label>{t('categoryLabel')}</Label>
        <Select
          value={formData.category || 'custom'}
          onChange={(e) => onFormDataChange({ category: e.target.value as any })}
        >
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </Field>

      {/* List Type */}
      <Field>
        <Label>{t('typeLabel')}</Label>
        <RadioGroup
          value={formData.type}
          onChange={(value: string) => onFormDataChange({ type: value as 'dynamic' | 'static' })}
          className="mt-2 space-y-4"
        >
          <RadioField>
            <Radio value="dynamic" />
            <div className="ml-3 text-sm leading-6">
              <Label>{t('dynamicLabel')}</Label>
              <Description>{t('dynamicDescription')}</Description>
            </div>
          </RadioField>
          <RadioField>
            <Radio value="static" />
            <div className="ml-3 text-sm leading-6">
              <Label>{t('staticLabel')}</Label>
              <Description>{t('staticDescription')}</Description>
            </div>
          </RadioField>
        </RadioGroup>
      </Field>
    </FieldGroup>
  );
}
