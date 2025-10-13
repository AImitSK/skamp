// src/app/dashboard/contacts/crm/components/modals/ContactModal/ProfessionalSection.tsx
"use client";

import { Field, FieldGroup, Label } from "@/components/ui/fieldset";
import { Textarea } from "@/components/ui/textarea";
import { ContactModalSectionProps } from "./types";

/**
 * Professional Section für ContactModal
 *
 * Enthält: Biografie
 */
export function ProfessionalSection({ formData, setFormData }: ContactModalSectionProps) {
  return (
    <FieldGroup>
      <Field>
        <Label>Biografie</Label>
        <Textarea
          value={formData.professionalInfo?.biography || ''}
          onChange={(e) => setFormData({
            ...formData,
            professionalInfo: {
              ...formData.professionalInfo,
              biography: e.target.value
            }
          })}
          rows={4}
          placeholder="Beruflicher Werdegang..."
        />
      </Field>
    </FieldGroup>
  );
}
