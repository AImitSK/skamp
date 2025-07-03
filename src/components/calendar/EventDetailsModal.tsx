// src/components/calendar/EventDetailsModal.tsx
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { CalendarEvent, EVENT_COLORS, EVENT_ICONS } from '@/types/calendar';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import Link from 'next/link';
import { taskService } from '@/lib/firebase/task-service';
import { Task, TaskPriority } from '@/types/tasks'; // TaskPriority importieren
import { Timestamp } from 'firebase/firestore';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void; // Callback für Aktualisierung
}

export function EventDetailsModal({ event, isOpen, onClose, onTaskUpdated }: EventDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [taskData, setTaskData] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as TaskPriority
  });
  const [loading, setLoading] = useState(false);

  // Lade Task-Daten wenn es ein Task-Event ist und Modal öffnet
  useEffect(() => {
    if (isOpen && event?.type === 'task' && event.taskId) {
      loadTaskData(event.taskId);
    } else if (!isOpen) {
        // Reset state on close
        setIsEditing(false);
        setTaskData(null);
    }
  }, [event, isOpen]);

  const loadTaskData = async (taskId: string) => {
    setLoading(true);
    try {
      const task = await taskService.getById(taskId);
      if (task) {
        setTaskData(task);
        setEditForm({
          title: task.title,
          description: task.description || '',
          dueDate: task.dueDate ? task.dueDate.toDate().toISOString().split('T')[0] : '',
          priority: task.priority
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Task:', error);
    } finally {
        setLoading(false);
    }
  };

  const handleTaskUpdate = async () => {
    if (!taskData?.id) return;

    setLoading(true);
    try {
      await taskService.update(taskData.id, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        dueDate: editForm.dueDate ? Timestamp.fromDate(new Date(editForm.dueDate)) : undefined
      });

      setIsEditing(false);
      onTaskUpdated?.(); // Callback aufrufen, um die Daten neu zu laden
      onClose(); // Modal nach dem Speichern schließen
      alert('Aufgabe erfolgreich aktualisiert!');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Task:', error);
      alert('Fehler beim Aktualisieren der Aufgabe');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDelete = async () => {
    if (!taskData?.id) return;

    if (!confirm('Möchten Sie diese Aufgabe wirklich löschen?')) return;

    setLoading(true);
    try {
      await taskService.delete(taskData.id);
      onTaskUpdated?.();
      onClose();
      alert('Aufgabe erfolgreich gelöscht!');
    } catch (error) {
      console.error('Fehler beim Löschen der Task:', error);
      alert('Fehler beim Löschen der Aufgabe');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskComplete = async () => {
    if (!taskData?.id) return;

    setLoading(true);
    try {
      await taskService.markAsCompleted(taskData.id);
      onTaskUpdated?.();
      onClose();
      alert('Aufgabe als erledigt markiert!');
    } catch (error) {
      console.error('Fehler beim Abschließen der Task:', error);
      alert('Fehler beim Abschließen der Aufgabe');
    } finally {
      setLoading(false);
    }
  };


  if (!event) return null;

  const getStatusBadge = () => {
    // Wenn es ein Task ist, den Status vom geladenen TaskData nehmen
    const status = event.type === 'task' && taskData ? taskData.status : event.status;

    switch (status) {
      case 'completed':
        return <Badge color="green">Abgeschlossen</Badge>;
      case 'overdue':
        return <Badge color="red">Überfällig</Badge>;
      case 'pending':
      default:
        return <Badge color="yellow">Ausstehend</Badge>;
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
        case 'urgent':
            return <Badge color="red">Dringend</Badge>;
        case 'high':
            return <Badge color="orange">Hoch</Badge>;
        case 'medium':
            return <Badge color="yellow">Mittel</Badge>;
        case 'low':
            return <Badge color="zinc">Niedrig</Badge>
        default:
            return <Badge color="zinc">Unbekannt</Badge>
    }
  }


  const getActionButton = () => {
    switch (event.type) {
      case 'campaign_scheduled':
      case 'campaign_sent':
        return (
          <Link href={`/dashboard/pr/campaigns/${event.campaignId}`}>
            <Button>Kampagne anzeigen</Button>
          </Link>
        );
      case 'approval_pending':
      case 'approval_overdue':
        return (
          <Link href="/dashboard/freigaben">
            <Button>Zur Freigabe</Button>
          </Link>
        );
      case 'task':
        return (
          <div className="flex gap-2">
            {taskData?.status !== 'completed' && (
               <>
                <Button onClick={handleTaskComplete} disabled={loading}>
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Erledigt
                </Button>
                <Button plain onClick={() => setIsEditing(true)} disabled={loading}>
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Bearbeiten
                </Button>
               </>
            )}
            <Button plain onClick={handleTaskDelete} disabled={loading} className="text-red-600 hover:text-red-700">
              <TrashIcon className="h-4 w-4 mr-1" />
              Löschen
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Schließen</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Bearbeitungsmodus für Tasks */}
                {isEditing && event.type === 'task' ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Aufgabe bearbeiten</h3>
                    <form onSubmit={(e) => { e.preventDefault(); handleTaskUpdate(); }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Titel
                        </label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          required
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beschreibung
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          rows={3}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fälligkeitsdatum
                        </label>
                        <input
                          type="date"
                          value={editForm.dueDate}
                          onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priorität
                        </label>
                        <select
                          value={editForm.priority}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none"
                        >
                          <option value="low">Niedrig</option>
                          <option value="medium">Mittel</option>
                          <option value="high">Hoch</option>
                          <option value="urgent">Dringend</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button plain onClick={() => setIsEditing(false)} disabled={loading}>
                          Abbrechen
                        </Button>
                        {/* FIX: isLoading prop entfernt */}
                        <Button type="submit" disabled={loading}>
                          Speichern
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  // Normale Ansicht
                  <>
                    <div className="sm:flex sm:items-start">
                      <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 bg-${EVENT_COLORS[event.type]}-100`}>
                         {EVENT_ICONS[event.type] && <span className={`h-6 w-6 text-${EVENT_COLORS[event.type]}-600`}>{EVENT_ICONS[event.type]}</span>}
                      </div>

                      <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                        <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                          {event.title}
                        </Dialog.Title>

                        <div className="mt-2 space-y-3">
                           {/* Status */}
                           {event.status && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Status:</span>
                              {getStatusBadge()}
                            </div>
                          )}

                          {/* Datum */}
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">
                              {event.date.toLocaleDateString('de-DE', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>

                          {/* Task-spezifische Infos */}
                          {event.type === 'task' && taskData && (
                            <>
                              {/* Priorität */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Priorität:</span>
                                {getPriorityBadge(taskData.priority)}
                              </div>

                              {/* Beschreibung */}
                              {taskData.description && (
                                <div>
                                  <span className="text-sm font-medium text-gray-600">Beschreibung:</span>
                                  <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{taskData.description}</p>
                                </div>
                              )}
                            </>
                          )}

                          {/* Client */}
                          {event.metadata?.clientName && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Kunde:</span>
                              <span className="text-sm font-medium">{event.metadata.clientName}</span>
                            </div>
                          )}

                          {/* Empfänger */}
                          {event.metadata?.recipientCount && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Empfänger:</span>
                              <span className="text-sm">{event.metadata.recipientCount}</span>
                            </div>
                          )}

                          {/* Überfällig seit */}
                          {event.metadata?.daysOverdue && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Überfällig seit:</span>
                              <span className="text-sm text-red-600 font-medium">
                                {event.metadata.daysOverdue} Tagen
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                      {getActionButton()}
                      <Button plain onClick={onClose}>
                        Schließen
                      </Button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}