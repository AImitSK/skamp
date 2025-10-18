// src/components/projects/creation/steps/TeamStep.tsx
'use client';

import React from 'react';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Select } from '@/components/ui/select';
import { TeamMemberMultiSelect } from '../TeamMemberMultiSelect';
import { BaseStepProps } from './types';
import { useAuth } from '@/context/AuthContext';

export default function TeamStep({
  formData,
  onUpdate,
  creationOptions
}: BaseStepProps) {
  const { user } = useAuth();

  const handleTeamMemberChange = (members: string[]) => {
    onUpdate({ assignedTeamMembers: members });

    // Auto-select current user as project manager if they are in the team
    if (user?.uid && members.includes(user.uid) && !formData.projectManager) {
      const userMember = creationOptions?.availableTeamMembers?.find(member =>
        member.id.includes(user.uid)
      );
      if (userMember) {
        onUpdate({ projectManager: userMember.id });
      }
    }

    // Clear project manager if they are no longer in the team
    if (formData.projectManager && !members.some(selectedId =>
      formData.projectManager === selectedId || formData.projectManager.includes(selectedId)
    )) {
      onUpdate({ projectManager: '' });
    }
  };

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

      {/* Projekt-Manager - nur anzeigen wenn Team-Mitglieder gewählt */}
      {formData.assignedTeamMembers.length > 0 && (
        <Field>
          <Label>Projekt-Manager / Besitzer</Label>
          <Select
            value={formData.projectManager}
            onChange={(e) => onUpdate({ projectManager: e.target.value })}
          >
            {creationOptions?.availableTeamMembers
              ?.filter(member => formData.assignedTeamMembers.some(selectedId =>
                member.id === selectedId || member.id.includes(selectedId)
              ))
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} ({member.role})
                  {user?.uid && member.id.includes(user.uid) ? ' (Sie)' : ''}
                </option>
              ))
            }
          </Select>
        </Field>
      )}
    </FieldGroup>
  );
}
