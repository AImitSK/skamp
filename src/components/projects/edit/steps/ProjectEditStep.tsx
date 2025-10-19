// src/components/projects/edit/steps/ProjectEditStep.tsx
'use client';

import React from 'react';
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
        />
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

      {/* Status und Priorität */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <Label>Status</Label>
          <Select
            value={formData.status}
            onChange={(e) => onUpdate({ status: e.target.value })}
          >
            <option value="active">Aktiv</option>
            <option value="on_hold">Pausiert</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Abgebrochen</option>
          </Select>
        </Field>

        <Field>
          <Label>Priorität</Label>
          <Select
            value={formData.priority}
            onChange={(e) => onUpdate({ priority: e.target.value as any })}
          >
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
            <option value="urgent">Dringend</option>
          </Select>
        </Field>
      </div>

      {/* Pipeline-Phase */}
      <Field>
        <Label>Pipeline-Phase</Label>
        <Select
          value={formData.currentStage}
          onChange={(e) => onUpdate({ currentStage: e.target.value as any })}
        >
          <option value="ideas_planning">Ideen & Planung</option>
          <option value="creation">Erstellung</option>
          <option value="internal_approval">Interne Freigabe</option>
          <option value="customer_approval">Kundenfreigabe</option>
          <option value="distribution">Distribution</option>
          <option value="monitoring">Monitoring</option>
          <option value="completed">Abgeschlossen</option>
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
    </FieldGroup>
  );
}
