'use client';

import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  UserIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Project } from '@/types/project';
import { TeamMember } from '@/types/international';
import { TeamMemberMultiSelect } from './creation/TeamMemberMultiSelect';
import { teamMemberService } from '@/lib/firebase/organization-service';
import { projectService } from '@/lib/firebase/project-service';
import { useAuth } from '@/context/AuthContext';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  organizationId: string;
  onSuccess?: (updatedProject: Project) => void;
}

function Alert({
  type = 'error',
  message
}: {
  type?: 'error' | 'success';
  message: string;
}) {
  const styles = {
    error: 'bg-red-50 text-red-700',
    success: 'bg-green-50 text-green-700'
  };

  const icons = {
    error: ExclamationTriangleIcon,
    success: CheckIcon
  };

  const Icon = icons[type];

  return (
    <div className={`rounded-md p-4 mb-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${
            type === 'error' ? 'text-red-400' : 'text-green-400'
          }`} />
        </div>
        <div className="ml-3 flex-1">
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

export function TeamManagementModal({
  isOpen,
  onClose,
  project,
  organizationId,
  onSuccess
}: TeamManagementModalProps) {
  const { user } = useAuth();
  const [availableTeamMembers, setAvailableTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [projectManager, setProjectManager] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeamMembers();
      // Set initial values
      setSelectedTeamMembers(project.assignedTo || []);
      setProjectManager((project as any).projectManager || project.userId || '');
    }
  }, [isOpen, project]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const members = await teamMemberService.getAll(organizationId);
      setAvailableTeamMembers(members);
    } catch (error) {
      console.error('Fehler beim Laden der Team-Mitglieder:', error);
      setAlert({ type: 'error', message: 'Fehler beim Laden der Team-Mitglieder.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !project.id) return;

    try {
      setSaving(true);
      setAlert(null);

      const updateData: Partial<Project> = {
        assignedTo: selectedTeamMembers,
        updatedAt: new Date(),
        updatedBy: user.uid
      };

      // Add project manager
      (updateData as any).projectManager = projectManager;

      const updatedProject = await projectService.update(project.id, updateData, {
        organizationId
      });

      setAlert({ type: 'success', message: 'Team erfolgreich aktualisiert!' });

      // Close modal after short delay and call success callback
      setTimeout(() => {
        onClose();
        if (onSuccess && updatedProject) {
          onSuccess(updatedProject);
        }
      }, 1500);

    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setAlert({ type: 'error', message: 'Fehler beim Speichern der Team-Änderungen.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTeamMemberChange = (members: string[]) => {
    setSelectedTeamMembers(members);

    // Clear project manager if they are no longer in the team
    if (projectManager && !members.includes(projectManager)) {
      setProjectManager('');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="lg">
      <DialogTitle>
        <div className="flex items-center">
          <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
          Team verwalten
        </div>
      </DialogTitle>

      <DialogBody>
        {alert && (
          <Alert type={alert.type} message={alert.message} />
        )}

        <div className="space-y-6">
          <div>
            <Text className="text-lg font-medium text-gray-900 mb-2">
              {project.title}
            </Text>
            <Text className="text-sm text-gray-600 mb-6">
              Verwalten Sie die Team-Mitglieder und den Projekt-Manager für dieses Projekt.
            </Text>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <>
              {/* Team-Mitglieder Auswahl */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team-Mitglieder
                </label>
                <TeamMemberMultiSelect
                  teamMembers={availableTeamMembers}
                  selectedMembers={selectedTeamMembers}
                  onSelectionChange={handleTeamMemberChange}
                />
                <Text className="text-xs text-gray-500 mt-1">
                  Wählen Sie die Personen aus, die an diesem Projekt arbeiten werden.
                </Text>
              </div>

              {/* Projekt-Manager Auswahl */}
              {selectedTeamMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      Projekt-Manager / Besitzer
                    </div>
                  </label>
                  <select
                    value={projectManager}
                    onChange={(e) => setProjectManager(e.target.value)}
                    className="block w-full rounded-lg border border-zinc-950/10 bg-white py-2 px-3 text-base/6 text-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Keinen Manager auswählen</option>
                    {availableTeamMembers
                      .filter(member => selectedTeamMembers.includes(member.id || member.userId))
                      .map(member => (
                        <option key={member.id || member.userId} value={member.id || member.userId}>
                          {member.displayName} ({member.email})
                        </option>
                      ))}
                  </select>
                  <Text className="text-xs text-gray-500 mt-1">
                    Der Projekt-Manager hat erweiterte Berechtigungen für dieses Projekt.
                  </Text>
                </div>
              )}

              {/* Team-Übersicht */}
              {selectedTeamMembers.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Team-Übersicht ({selectedTeamMembers.length} Mitglieder)
                  </Text>
                  <div className="space-y-2">
                    {availableTeamMembers
                      .filter(member => selectedTeamMembers.includes(member.id || member.userId))
                      .map(member => (
                        <div key={member.id || member.userId} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Text className="text-xs font-medium text-blue-700">
                                {member.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </Text>
                            </div>
                            <div>
                              <Text className="text-sm font-medium text-gray-900">{member.displayName}</Text>
                              <Text className="text-xs text-gray-500">{member.email}</Text>
                            </div>
                          </div>
                          {(member.id || member.userId) === projectManager && (
                            <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              Manager
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogBody>

      <DialogActions>
        <Button
          plain
          onClick={onClose}
          disabled={saving}
        >
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
        >
          {saving ? 'Speichern...' : 'Team aktualisieren'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}