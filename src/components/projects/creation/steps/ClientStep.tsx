// src/components/projects/creation/steps/ClientStep.tsx
'use client';

import React from 'react';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { ClientSelector } from '../ClientSelector';
import { BaseStepProps } from './types';

export default function ClientStep({
  formData,
  onUpdate,
  creationOptions
}: BaseStepProps) {
  return (
    <FieldGroup>
      <Field>
        <Label>Kunde auswählen *</Label>
        <ClientSelector
          clients={creationOptions?.availableClients || []}
          selectedClientId={formData.clientId}
          onSelect={(clientId) => onUpdate({ clientId })}
        />
      </Field>
    </FieldGroup>
  );
}
