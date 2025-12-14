// src/components/projects/edit/steps/TeamEditStep.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('projects.edit.steps.team');

  const handleTeamMemberChange = (members: string[]) => {
    onUpdate({ assignedTeamMembers: members });

    // Clear project manager if they are no longer in the team
    if (formData.projectManager && !members.some(selectedId =>
      formData.projectManager === selectedId || formData.projectManager.includes(selectedId)
    )) {
      onUpdate({ projectManager: '' });
    }
  };

  const filteredMembers = creationOptions?.availableTeamMembers?.filter((member: any) =>
    formData.assignedTeamMembers.some(selectedId =>
      member.id === selectedId || member.id.includes(selectedId)
    )
  ) || [];

  return (
    <FieldGroup>
      {/* Team-Mitglieder */}
      <Field>
        <Label>{t('teamMembers')}</Label>
        <TeamMemberMultiSelect
          teamMembers={creationOptions?.availableTeamMembers || []}
          selectedMembers={formData.assignedTeamMembers}
          onSelectionChange={handleTeamMemberChange}
        />
      </Field>

      {/* Projekt-Manager / Besitzer */}
      {formData.assignedTeamMembers.length > 0 && (
        <Field>
          <Label>{t('projectManager')}</Label>
          <Select
            value={formData.projectManager}
            onChange={(e) => onUpdate({ projectManager: e.target.value })}
          >
            <option value="">{t('selectPlaceholder')}</option>
            {filteredMembers.map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.displayName} ({member.role})
                {user?.uid && member.id.includes(user.uid) ? ` ${t('currentUserSuffix')}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </FieldGroup>
  );
}
