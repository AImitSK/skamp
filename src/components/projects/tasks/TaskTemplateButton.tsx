/**
 * TaskTemplateButton Component
 *
 * Button zum Erstellen von Standard-Tasks aus Vorlagen.
 * Erstellt 9 vordefinierte Tasks für einen Standard-PR-Workflow.
 *
 * Features:
 * - Erstellt 9 Standard-Tasks (Strategie bis Monitoring)
 * - Toast-Feedback bei Erfolg/Fehler
 * - Automatische Query Invalidierung
 */

'use client';

import { Button } from '@/components/ui/button';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { taskService } from '@/lib/firebase/task-service';
import { toastService } from '@/lib/utils/toast';
import { ProjectTask, TaskPriority } from '@/types/tasks';

// Task-Vorlagen für Standard-PR-Workflow
// Keys werden zur Laufzeit übersetzt
const TASK_TEMPLATE_KEYS = [
  {
    titleKey: 'strategy.title',
    descriptionKey: 'strategy.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'mediaAssets.title',
    descriptionKey: 'mediaAssets.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'pressDraft.title',
    descriptionKey: 'pressDraft.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'internalApproval.title',
    descriptionKey: 'internalApproval.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'customerApproval.title',
    descriptionKey: 'customerApproval.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'distributionList.title',
    descriptionKey: 'distributionList.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'coverLetter.title',
    descriptionKey: 'coverLetter.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'dispatch.title',
    descriptionKey: 'dispatch.description',
    priority: 'medium' as TaskPriority
  },
  {
    titleKey: 'monitoring.title',
    descriptionKey: 'monitoring.description',
    priority: 'medium' as TaskPriority
  }
];

interface TaskTemplateButtonProps {
  projectId: string;
  organizationId: string;
  userId: string;
  disabled?: boolean;
  onSuccess: () => void;
}

export function TaskTemplateButton({
  projectId,
  organizationId,
  userId,
  disabled = false,
  onSuccess
}: TaskTemplateButtonProps) {
  const t = useTranslations('projects.tasks.templateButton');

  const handleCreateTemplateTasks = async () => {
    if (!userId) {
      toastService.error('Benutzer nicht gefunden');
      return;
    }

    try {
      // Erstelle alle Vorlagen-Tasks nacheinander
      // für korrekte Reihenfolge basierend auf Timestamps
      for (let i = 0; i < TASK_TEMPLATE_KEYS.length; i++) {
        const template = TASK_TEMPLATE_KEYS[i];

        const taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'daysUntilDue' | 'overdueBy'> = {
          userId,
          organizationId,
          projectId,
          assignedUserId: userId,
          title: t(`templates.${template.titleKey}`),
          description: t(`templates.${template.descriptionKey}`),
          status: 'pending',
          priority: template.priority,
          progress: 0,
          isAllDay: true
          // Kein dueDate - wie gewünscht
        };

        await taskService.create(taskData);
      }

      // Callback to invalidate queries
      onSuccess();

      // Erfolgs-Toast
      toastService.success(`${TASK_TEMPLATE_KEYS.length} Standard-Tasks erfolgreich erstellt`);
    } catch (error) {
      console.error('Error creating template tasks:', error);
      toastService.error('Fehler beim Erstellen der Vorlagen-Tasks');
    }
  };

  return (
    <Button
      onClick={handleCreateTemplateTasks}
      color="secondary"
      disabled={disabled}
    >
      <DocumentDuplicateIcon className="w-4 h-4" />
      {t('buttonLabel')}
    </Button>
  );
}
