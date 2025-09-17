// src/components/projects/TaskCreateModal.tsx
'use client';

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { taskService } from '@/lib/firebase/task-service';
import { ProjectTask, TaskPriority } from '@/types/tasks';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  organizationId: string;
  projectManagerId: string;
  teamMembers: TeamMember[];
}

export function TaskCreateModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  organizationId,
  projectManagerId,
  teamMembers
}: TaskCreateModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedUserId: projectManagerId || (teamMembers.length > 0 ? teamMembers[0].userId : ''), // Default: Projekt-Manager oder erstes Teammitglied
    dueDate: '',
    priority: 'medium' as TaskPriority,
    progress: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    if (!formData.assignedUserId) {
      setError('Zuständige Person ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Debug-Ausgabe für Troubleshooting
      console.log('TaskCreate Debug:', {
        assignedUserId: formData.assignedUserId,
        projectManagerId,
        teamMembers: teamMembers.map(m => ({ id: m.id, userId: m.userId, name: m.displayName }))
      });

      const taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'daysUntilDue' | 'overdueBy'> = {
        userId: formData.assignedUserId,
        organizationId,
        projectId,
        assignedUserId: formData.assignedUserId,
        title: formData.title.trim(),
        status: 'pending',
        priority: formData.priority,
        progress: formData.progress,
        isAllDay: true,
        ...(formData.description.trim() && { description: formData.description.trim() }),
        ...(formData.dueDate && { dueDate: Timestamp.fromDate(new Date(formData.dueDate)) })
      };

      await taskService.create(taskData);

      // Reset form
      setFormData({
        title: '',
        description: '',
        assignedUserId: projectManagerId || (teamMembers.length > 0 ? teamMembers[0].userId : ''),
        dueDate: '',
        priority: 'medium',
        progress: 0
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Fehler beim Erstellen der Task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        description: '',
        assignedUserId: projectManagerId || (teamMembers.length > 0 ? teamMembers[0].userId : ''),
        dueDate: '',
        priority: 'medium',
        progress: 0
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          Neue Task erstellen
        </DialogTitle>

        <DialogBody className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <FieldGroup>
            <Field>
              <Label>Titel *</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="z.B. Konzept erstellen, Review durchführen..."
                disabled={loading}
              />
            </Field>

            <Field>
              <Label>Beschreibung</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Weitere Details zur Task..."
                disabled={loading}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>Zuständige Person</Label>
                <Select
                  value={formData.assignedUserId}
                  onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                  disabled={loading}
                >
                  {teamMembers
                    .filter(member => member.userId) // Nur Mitglieder mit gültiger userId
                    .map(member => (
                    <option key={member.id} value={member.userId}>
                      {member.displayName}
                      {member.userId === projectManagerId && ' (Projekt-Manager)'}
                    </option>
                  ))}
                  {teamMembers.length === 0 && (
                    <option value="">Keine Teammitglieder verfügbar</option>
                  )}
                </Select>
              </Field>

              <Field>
                <Label>Priorität</Label>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  disabled={loading}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>Fälligkeitsdatum</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  disabled={loading}
                />
              </Field>

              <Field>
                <Label>Fortschritt</Label>
                <div className="space-y-2">
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.progress}
                    onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                    disabled={loading}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>0%</span>
                    <span className="font-medium">{formData.progress}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </Field>
            </div>
          </FieldGroup>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={handleClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button
            type="submit"
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            disabled={loading}
          >
            {loading ? 'Wird erstellt...' : 'Task erstellen'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}