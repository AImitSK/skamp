// src/components/projects/creation/steps/ProjectStep.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { TagInput } from '@/components/ui/tag-input';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';
import { ProjectStepProps } from './types';

export default function ProjectStep({
  formData,
  onUpdate,
  tags,
  onCreateTag
}: ProjectStepProps) {
  const t = useTranslations('projects.creation.steps.project');
  const tPriority = useTranslations('projects.priority');

  return (
    <FieldGroup>
      {/* Projekt-Titel */}
      <Field>
        <Label>{t('title')}</Label>
        <Input
          type="text"
          required
          value={formData.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder={t('titlePlaceholder')}
          autoFocus
        />
        {formData.title.length > 0 && formData.title.length < 3 && (
          <Text className="text-sm text-red-600 mt-1">
            {t('titleValidation')}
          </Text>
        )}
      </Field>

      {/* Beschreibung */}
      <Field>
        <Label>{t('description')}</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          placeholder={t('descriptionPlaceholder')}
        />
      </Field>

      {/* Priorität */}
      <Field>
        <Label>{t('priorityLabel')}</Label>
        <Select
          value={formData.priority}
          onChange={(e) => onUpdate({ priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
        >
          <option value="low">{tPriority('low')}</option>
          <option value="medium">{tPriority('medium')}</option>
          <option value="high">{tPriority('high')}</option>
          <option value="urgent">{tPriority('urgent')}</option>
        </Select>
      </Field>

      {/* Tags */}
      <Field>
        <Label>{t('tagsLabel')}</Label>
        <TagInput
          selectedTagIds={formData.tags}
          availableTags={tags}
          onChange={(tagIds) => onUpdate({ tags: tagIds })}
          onCreateTag={onCreateTag}
        />
      </Field>

      {/* PR-Kampagne erstellen - SimpleSwitch */}
      <Field>
        <div className="flex items-center justify-between py-2">
          <div className="flex-1 pr-4">
            <Label>{t('createCampaignLabel')}</Label>
            <Text className="text-sm text-gray-600 mt-1">
              {t('createCampaignDescription')}
            </Text>
          </div>
          <SimpleSwitch
            checked={formData.createCampaignImmediately}
            onChange={(checked) => onUpdate({ createCampaignImmediately: checked })}
          />
        </div>
      </Field>
    </FieldGroup>
  );
}
