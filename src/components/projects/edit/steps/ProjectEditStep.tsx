// src/components/projects/edit/steps/ProjectEditStep.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { ProjectEditStepProps } from './types';

export default function ProjectEditStep({
  formData,
  onUpdate,
  tags,
  onCreateTag
}: ProjectEditStepProps) {
  const t = useTranslations('projects.edit.steps.project');

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
        />
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

      {/* Status */}
      <Field>
        <Label>{t('status')}</Label>
        <Select
          value={formData.status}
          onChange={(e) => onUpdate({ status: e.target.value })}
        >
          <option value="active">{t('statusOptions.active')}</option>
          <option value="on_hold">{t('statusOptions.on_hold')}</option>
          <option value="completed">{t('statusOptions.completed')}</option>
          <option value="cancelled">{t('statusOptions.cancelled')}</option>
        </Select>
      </Field>

      {/* Pipeline-Phase */}
      <Field>
        <Label>{t('pipelinePhase')}</Label>
        <Select
          value={formData.currentStage}
          onChange={(e) => onUpdate({ currentStage: e.target.value as any })}
        >
          <option value="ideas_planning">{t('pipelineOptions.ideas_planning')}</option>
          <option value="creation">{t('pipelineOptions.creation')}</option>
          <option value="approval">{t('pipelineOptions.approval')}</option>
          <option value="distribution">{t('pipelineOptions.distribution')}</option>
          <option value="monitoring">{t('pipelineOptions.monitoring')}</option>
          <option value="completed">{t('pipelineOptions.completed')}</option>
        </Select>
      </Field>

      {/* Tags */}
      <Field>
        <Label>{t('tags')}</Label>
        <TagInput
          selectedTagIds={formData.tags}
          availableTags={tags}
          onChange={(tagIds) => onUpdate({ tags: tagIds })}
          onCreateTag={onCreateTag}
        />
      </Field>
    </FieldGroup>
  );
}
