// src/components/projects/edit/steps/TeamEditStep.tsx
'use client';

import React from 'react';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { TeamMemberMultiSelect } from '../../creation/TeamMemberMultiSelect';
import { BaseEditStepProps } from './types';
import { useAuth } from '@/context/AuthContext';

export default function TeamEditStep({
  formData,
  onUpdate,
  creationOptions
}: BaseEditStepProps) {
  const { user } = useAuth();

  const handleTeamMemberChange = (members: string[]) => {
    onUpdate({ assignedTeamMembers: members });

    // Clear project manager if they are no longer in the team
    if (formData.projectManager && !members.some(selectedId =>
      formData.projectManager === selectedId || formData.projectManager.includes(selectedId)
    )) {
      onUpdate({ projectManager: '' });
    }
  };

  // DEBUG: Log values
  const filteredMembers = creationOptions?.availableTeamMembers?.filter((member: any) =>
    formData.assignedTeamMembers.some(selectedId =>
      member.id === selectedId || member.id.includes(selectedId)
    )
  ) || [];

  console.log('🔍 TeamEditStep DEBUG:', {
    projectManager: formData.projectManager,
    assignedTeamMembers: formData.assignedTeamMembers,
    filteredMemberIds: filteredMembers.map((m: any) => m.id),
    allMembers: creationOptions?.availableTeamMembers?.map((m: any) => ({ id: m.id, name: m.displayName }))
  });

  return (
    <FieldGroup>
      {/* Team-Mitglieder */}
      <Field>
        <Label>Team-Mitglieder</Label>
        <TeamMemberMultiSelect
          teamMembers={creationOptions?.availableTeamMembers || []}
          selectedMembers={formData.assignedTeamMembers}
          onSelectionChange={handleTeamMemberChange}
        />
      </Field>

      {/* Projekt-Manager / Besitzer */}
      {formData.assignedTeamMembers.length > 0 && (
        <Field>
          <Label>Projekt-Manager / Besitzer</Label>
          <Select
            value={formData.projectManager}
            onChange={(e) => onUpdate({ projectManager: e.target.value })}
          >
            <option value="">-- Bitte wählen --</option>
            {filteredMembers.map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.displayName} ({member.role})
                {user?.uid && member.id.includes(user.uid) ? ' (Sie)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </FieldGroup>
  );
}
