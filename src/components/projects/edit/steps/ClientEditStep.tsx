// src/components/projects/edit/steps/ClientEditStep.tsx
'use client';

import React from 'react';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Text } from '@/components/ui/text';
import { ClientSelector } from '../../creation/ClientSelector';
import { BaseEditStepProps } from './types';

export default function ClientEditStep({
  formData,
  onUpdate,
  creationOptions
}: BaseEditStepProps) {
  return (
    <FieldGroup>
      <Field>
        <Label>Kunde auswählen</Label>
        <Text className="text-sm text-gray-600 mt-1 mb-4">
          Wählen Sie den Kunden aus, für den dieses Projekt durchgeführt wird.
        </Text>

        {creationOptions?.availableClients && (
          <ClientSelector
            clients={creationOptions.availableClients}
            selectedClientId={formData.clientId}
            onSelect={(clientId) => onUpdate({ clientId })}
          />
        )}

        {!creationOptions?.availableClients && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Lade Kunden...</p>
          </div>
        )}
      </Field>
    </FieldGroup>
  );
}
