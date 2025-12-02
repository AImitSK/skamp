// src/app/dashboard/contacts/crm/components/modals/ContactModal/GeneralSection.tsx
"use client";

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
  return (
    <FieldGroup>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Anrede</Label>
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
            <option value="">Keine Anrede</option>
            <option value="Herr">Herr</option>
            <option value="Frau">Frau</option>
            <option value="Dr.">Dr.</option>
            <option value="Prof.">Prof.</option>
            <option value="Prof. Dr.">Prof. Dr.</option>
          </Select>
        </Field>
        <Field>
          <Label>Titel</Label>
          <Input
            value={formData.name?.title || ''}
            onChange={(e) => setFormData({
              ...formData,
              name: {
                ...formData.name!,
                title: e.target.value
              }
            })}
            placeholder="z.B. Dr., Prof."
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Vorname *</Label>
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
          <Label>Nachname *</Label>
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
          Firma
          <InfoTooltip content="Wählen Sie die Firma aus, bei der diese Person arbeitet" className="ml-1.5 inline-flex align-text-top" />
        </Label>
        <Select
          value={formData.companyId || ''}
          onChange={(e) => onCompanyChange?.(e.target.value)}
        >
          <option value="">Keine Firma zugeordnet</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Position</Label>
          <Input
            value={formData.position || ''}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="z.B. Geschäftsführer, Redakteur"
          />
        </Field>
        <Field>
          <Label>Abteilung</Label>
          <Input
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="z.B. Vertrieb, Redaktion"
          />
        </Field>
      </div>

      {/* Tags */}
      <Field>
        <Label>Tags</Label>
        <TagInput
          selectedTagIds={formData.tagIds || []}
          availableTags={tags}
          onChange={(tagIds) => setFormData({ ...formData, tagIds })}
          onCreateTag={onCreateTag!}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Label>Status</Label>
          <Select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
          >
            {CONTACT_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>
            Ist Journalist?
            <InfoTooltip content="Aktiviert zusätzliche Medien-Felder" className="ml-1.5 inline-flex align-text-top" />
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
              <span className="ml-2">Diese Person ist Journalist/Redakteur</span>
            </label>
          </div>
        </Field>
      </div>
    </FieldGroup>
  );
}
