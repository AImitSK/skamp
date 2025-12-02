// src/components/projects/creation/steps/ProjectStep.tsx
'use client';

import React from 'react';
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
  return (
    <FieldGroup>
      {/* Projekt-Titel */}
      <Field>
        <Label>Projekt-Titel *</Label>
        <Input
          type="text"
          required
          value={formData.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="z.B. Produktlaunch Q2 2024"
          autoFocus
        />
        {formData.title.length > 0 && formData.title.length < 3 && (
          <Text className="text-sm text-red-600 mt-1">
            Mindestens 3 Zeichen erforderlich
          </Text>
        )}
      </Field>

      {/* Beschreibung */}
      <Field>
        <Label>Beschreibung</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          placeholder="Kurze Beschreibung des Projekts..."
        />
      </Field>

      {/* Priorität */}
      <Field>
        <Label>Priorität</Label>
        <Select
          value={formData.priority}
          onChange={(e) => onUpdate({ priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
        >
          <option value="low">Niedrig</option>
          <option value="medium">Mittel</option>
          <option value="high">Hoch</option>
          <option value="urgent">Dringend</option>
        </Select>
      </Field>

      {/* Tags */}
      <Field>
        <Label>Tags</Label>
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
            <Label>PR-Kampagne erstellen</Label>
            <Text className="text-sm text-gray-600 mt-1">
              Erstellt automatisch eine verknüpfte PR-Kampagne für dieses Projekt.
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
