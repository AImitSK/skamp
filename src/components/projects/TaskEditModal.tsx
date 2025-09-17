// src/components/projects/TaskEditModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { taskService } from '@/lib/firebase/task-service';
import { ProjectTask, TaskPriority, TaskStatus } from '@/types/tasks';
import { TeamMember } from '@/types/international';
import { Timestamp } from 'firebase/firestore';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: ProjectTask;
  teamMembers: TeamMember[];
}

export function TaskEditModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  teamMembers
}: TaskEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedUserId: '',
    dueDate: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    progress: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when task changes
  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignedUserId: task.assignedUserId || '',
        dueDate: task.dueDate ? task.dueDate.toDate().toISOString().split('T')[0] : '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        progress: task.progress || 0
      });
      setError(null);
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: Partial<ProjectTask> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        assignedUserId: formData.assignedUserId,
        priority: formData.priority,
        status: formData.status,
        progress: formData.progress,
        dueDate: formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate)) : undefined
      };

      // If marking as completed, add completedAt timestamp
      if (formData.status === 'completed' && task.status !== 'completed') {
        updateData.completedAt = Timestamp.now();
        updateData.progress = 100; // Auto-set to 100% when completed
      }

      await taskService.update(task.id!, updateData);
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Fehler beim Aktualisieren der Task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  // Auto-update progress when status changes to completed
  const handleStatusChange = (newStatus: TaskStatus) => {
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      progress: newStatus === 'completed' ? 100 : prev.progress
    }));
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} size="xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          Task bearbeiten
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
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.userId}>
                      {member.displayName}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={loading}
                >
                  <option value="pending">Ausstehend</option>
                  <option value="in_progress">In Bearbeitung</option>
                  <option value="completed">Erledigt</option>
                  <option value="cancelled">Abgebrochen</option>
                  <option value="blocked">Blockiert</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <Field>
                <Label>Fälligkeitsdatum</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  disabled={loading}
                />
              </Field>
            </div>

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
                  disabled={loading || formData.status === 'completed'}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>0%</span>
                  <span className="font-medium">{formData.progress}%</span>
                  <span>100%</span>
                </div>
                {formData.status === 'completed' && (
                  <p className="text-sm text-gray-500">
                    Fortschritt wird automatisch auf 100% gesetzt bei erledigten Tasks.
                  </p>
                )}
              </div>
            </Field>
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
            {loading ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}