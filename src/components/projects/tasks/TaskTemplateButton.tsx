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
import { taskService } from '@/lib/firebase/task-service';
import { toastService } from '@/lib/utils/toast';
import { ProjectTask, TaskPriority } from '@/types/tasks';

// Task-Vorlagen für Standard-PR-Workflow
const TASK_TEMPLATES = [
  {
    title: 'Strategie-Dokumente erstellen',
    description: '- Unternehmensprofil & Senderanalyse\n- Situationsanalyse\n- Zielgruppenanalyse\n- Kernbotschaften & Kommunikationsziele',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Medien Assets zusammenstellen',
    description: '- Bilder hochladen\n- Videos hochladen\n- Key Visual festlegen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Pressemeldungsentwurf',
    description: '- KI Assistent instruieren\n- Pressemeldung verfeinern',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Interne Freigabe',
    description: '- Text entwurf im Chat diskutieren\n- Key Visual im Chat besprechen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Kundenfreigabe einholen',
    description: '- Korrekturphasen\n- Kundenfreigabe der Pressemeldung\n- Asset Auswahl Freigabe',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Verteilerliste zusammenstellen',
    description: '- Journalisten importieren\n- Verteilerliste zusammenstellen\n- Monitoring Parameter festlegen (RSS Feeds)',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Anschreiben erstellen',
    description: '- Begleitschreiben formulieren\n- Testversand',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Versand',
    description: '- Termin festlegen\n- Versand planen\n- Versand überwachen',
    priority: 'medium' as TaskPriority
  },
  {
    title: 'Monitoring',
    description: '- Email Performance überwachen\n- Veröffentlichungen überwachen\n- Veröffentlichungen manuell einpflegen',
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
  const handleCreateTemplateTasks = async () => {
    if (!userId) {
      toastService.error('Benutzer nicht gefunden');
      return;
    }

    try {
      // Erstelle alle Vorlagen-Tasks nacheinander
      // für korrekte Reihenfolge basierend auf Timestamps
      for (let i = 0; i < TASK_TEMPLATES.length; i++) {
        const template = TASK_TEMPLATES[i];

        const taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue' | 'daysUntilDue' | 'overdueBy'> = {
          userId,
          organizationId,
          projectId,
          assignedUserId: userId,
          title: template.title,
          description: template.description,
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
      toastService.success(`${TASK_TEMPLATES.length} Standard-Tasks erfolgreich erstellt`);
    } catch (error) {
      console.error('Error creating template tasks:', error);
      toastService.error('Fehler beim Erstellen der Vorlagen-Tasks');
    }
  };

  return (
    <Button
      onClick={handleCreateTemplateTasks}
      outline
      disabled={disabled}
    >
      <DocumentDuplicateIcon className="w-4 h-4" />
      Task Vorlage verwenden
    </Button>
  );
}
