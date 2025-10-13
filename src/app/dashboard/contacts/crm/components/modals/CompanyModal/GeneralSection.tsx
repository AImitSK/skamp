// src/app/dashboard/contacts/crm/components/modals/CompanyModal/GeneralSection.tsx
"use client";

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
  const isMediaCompany = ['publisher', 'media_house', 'agency'].includes(formData.type!);

  return (
    <FieldGroup>
      <Field>
        <Label>
          Anzeigename *
          <InfoTooltip content="Der Name, wie er in Listen und Übersichten angezeigt wird" className="ml-1.5 inline-flex align-text-top" />
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
          <Label>Typ</Label>
          <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as CompanyType })}>
            <option value="customer">Kunde</option>
            <option value="supplier">Lieferant</option>
            <option value="partner">Partner</option>
            <option value="publisher">Verlag</option>
            <option value="media_house">Medienhaus</option>
            <option value="agency">Agentur</option>
            <option value="other">Sonstiges</option>
          </Select>
        </Field>
        <Field>
          <Label>
            Branche
            {isMediaCompany && (
              <InfoTooltip content="Bei Medienunternehmen wird die Branche durch den Typ definiert" className="ml-1.5 inline-flex align-text-top" />
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
            placeholder={isMediaCompany ? "—" : "z.B. IT, Handel, Industrie"}
            disabled={isMediaCompany}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Status</Label>
          <Select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          >
            {COMPANY_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>Lifecycle Stage</Label>
          <Select
            value={formData.lifecycleStage}
            onChange={(e) => setFormData({ ...formData, lifecycleStage: e.target.value as any })}
          >
            {LIFECYCLE_STAGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field>
        <Label>Website</Label>
        <Input
          type="url"
          value={formData.website || ''}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://..."
        />
      </Field>

      {/* Tags */}
      {onCreateTag && (
        <Field>
          <Label>Tags</Label>
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
        <Label>Interne Notizen</Label>
        <Textarea
          value={formData.internalNotes || ''}
          onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
          rows={3}
          placeholder="Notizen, die nicht für Kunden sichtbar sind..."
        />
      </Field>

      <Field>
        <Label>Öffentliche Beschreibung</Label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Beschreibung, die in Media Kits verwendet werden kann..."
        />
      </Field>
    </FieldGroup>
  );
}
