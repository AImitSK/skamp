// src/app/dashboard/contacts/lists/components/sections/BasicInfoSection.tsx
"use client";

import { Field, Label, FieldGroup, Description } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Radio, RadioGroup, RadioField } from "@/components/ui/radio";
import { BasicInfoSectionProps, categoryOptions } from './types';

export function BasicInfoSection({ formData, onFormDataChange }: BasicInfoSectionProps) {
  return (
    <FieldGroup>
      {/* Basic Info */}
      <Field>
        <Label>Listen-Name *</Label>
        <Input
          value={formData.name || ''}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          required
          autoFocus
          placeholder="z.B. Tech-Journalisten Deutschland"
        />
      </Field>

      <Field>
        <Label>Beschreibung</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => onFormDataChange({ description: e.target.value })}
          rows={2}
          placeholder="Kurze Beschreibung der Liste..."
        />
      </Field>

      <Field>
        <Label>Kategorie</Label>
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
        <Label>Listen-Typ</Label>
        <RadioGroup
          value={formData.type}
          onChange={(value: 'dynamic' | 'static') => onFormDataChange({ type: value })}
          className="mt-2 space-y-4"
        >
          <RadioField>
            <Radio value="dynamic" />
            <div className="ml-3 text-sm leading-6">
              <Label>Dynamische Liste</Label>
              <Description>Kontakte werden automatisch basierend auf Filtern aktualisiert.</Description>
            </div>
          </RadioField>
          <RadioField>
            <Radio value="static" />
            <div className="ml-3 text-sm leading-6">
              <Label>Statische Liste</Label>
              <Description>Kontakte werden manuell ausgewählt und bleiben fest.</Description>
            </div>
          </RadioField>
        </RadioGroup>
      </Field>
    </FieldGroup>
  );
}
