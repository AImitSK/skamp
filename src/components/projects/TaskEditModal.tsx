// src/components/projects/TaskEditModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('projects.tasks.editModal');
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
      setError(t('errors.titleRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: Partial<ProjectTask> = {
        title: formData.title.trim(),
        assignedUserId: formData.assignedUserId,
        priority: formData.priority,
        status: formData.status,
        progress: formData.progress,
        description: formData.description.trim() || undefined,
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
      setError(error.message || t('errors.updateFailed'));
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
          {t('title')}
        </DialogTitle>

        <DialogBody className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <FieldGroup>
            <Field>
              <Label>{t('fields.title')}</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder={t('placeholders.title')}
                disabled={loading}
              />
            </Field>

            <Field>
              <Label>{t('fields.description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder={t('placeholders.description')}
                disabled={loading}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>{t('fields.assignedPerson')}</Label>
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
                    </option>
                  ))}
                </Select>
              </Field>

              <Field>
                <Label>{t('fields.status')}</Label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  disabled={loading}
                >
                  <option value="pending">{t('statusOptions.pending')}</option>
                  <option value="in_progress">{t('statusOptions.inProgress')}</option>
                  <option value="completed">{t('statusOptions.completed')}</option>
                  <option value="cancelled">{t('statusOptions.cancelled')}</option>
                  <option value="blocked">{t('statusOptions.blocked')}</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>{t('fields.priority')}</Label>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  disabled={loading}
                >
                  <option value="low">{t('priorityOptions.low')}</option>
                  <option value="medium">{t('priorityOptions.medium')}</option>
                  <option value="high">{t('priorityOptions.high')}</option>
                  <option value="urgent">{t('priorityOptions.urgent')}</option>
                </Select>
              </Field>

              <Field>
                <Label>{t('fields.dueDate')}</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  disabled={loading}
                />
              </Field>
            </div>

            <Field>
              <Label>{t('fields.progress')}</Label>
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
                    {t('progressAutoComplete')}
                  </p>
                )}
              </div>
            </Field>
          </FieldGroup>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={handleClose} disabled={loading}>
            {t('actions.cancel')}
          </Button>
          <Button
            type="submit"
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            disabled={loading}
          >
            {loading ? t('actions.saving') : t('actions.saveChanges')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}