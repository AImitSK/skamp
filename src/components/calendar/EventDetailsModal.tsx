// src/components/calendar/EventDetailsModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/dialog';
import { Field, Label, FieldGroup } from '@/components/fieldset';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';
import { Select } from '@/components/select';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Text } from '@/components/text';
import {
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/20/solid';
import { CalendarEvent, EVENT_ICONS } from '@/types/calendar';
import Link from 'next/link';
import { taskService } from '@/lib/firebase/task-service';
import { Task, TaskPriority } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';

// Alert Component
function Alert({ 
  type = 'info', 
  title, 
  message 
}: { 
  type?: 'info' | 'error';
  title?: string;
  message: string;
}) {
  const styles = {
    info: 'bg-blue-50 text-blue-700',
    error: 'bg-red-50 text-red-700'
  };

  const Icon = type === 'error' ? ExclamationTriangleIcon : InformationCircleIcon;

  return (
    <div className={`rounded-md p-4 ${styles[type].split(' ')[0]}`}>
      <div className="flex">
        <div className="shrink-0">
          <Icon aria-hidden="true" className={`size-5 ${type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
        </div>
        <div className="ml-3">
          {title && <Text className={`font-medium ${styles[type].split(' ')[1]}`}>{title}</Text>}
          <Text className={`text-sm ${styles[type].split(' ')[1]}`}>{message}</Text>
        </div>
      </div>
    </div>
  );
}

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
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
  const [alert, setAlert] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (type: 'info' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  useEffect(() => {
    if (isOpen && event?.type === 'task' && event.taskId) {
      loadTaskData(event.taskId);
    } else if (!isOpen) {
      setIsEditing(false);
      setTaskData(null);
      setAlert(null);
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
      showAlert('error', 'Fehler beim Laden der Aufgabe');
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
      onTaskUpdated?.();
      onClose();
      showAlert('info', 'Aufgabe erfolgreich aktualisiert!');
    } catch (error) {
      showAlert('error', 'Fehler beim Aktualisieren der Aufgabe');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDelete = () => {
    if (!taskData?.id) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Aufgabe löschen',
      message: 'Möchten Sie diese Aufgabe wirklich löschen?',
      onConfirm: async () => {
        setLoading(true);
        try {
          await taskService.delete(taskData.id!);
          onTaskUpdated?.();
          onClose();
        } catch (error) {
          showAlert('error', 'Fehler beim Löschen der Aufgabe');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleTaskComplete = async () => {
    if (!taskData?.id) return;

    setLoading(true);
    try {
      await taskService.markAsCompleted(taskData.id);
      onTaskUpdated?.();
      onClose();
    } catch (error) {
      showAlert('error', 'Fehler beim Abschließen der Aufgabe');
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const getStatusBadge = () => {
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
        return <Badge color="zinc">Niedrig</Badge>;
      default:
        return <Badge color="zinc">Unbekannt</Badge>;
    }
  };

  const eventIcon = EVENT_ICONS[event.type];

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} size={isEditing ? 'xl' : 'lg'}>
        <div className="p-6">
          {alert && (
            <div className="mb-4">
              <Alert type={alert.type} message={alert.message} />
            </div>
          )}

          {isEditing && event.type === 'task' ? (
            // Bearbeitungsmodus
            <form onSubmit={(e) => { e.preventDefault(); handleTaskUpdate(); }}>
              <DialogTitle>Aufgabe bearbeiten</DialogTitle>
              <DialogBody className="mt-4">
                <FieldGroup>
                  <Field>
                    <Label>Titel</Label>
                    <Input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      required
                    />
                  </Field>

                  <Field>
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                    />
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field>
                      <Label>Fälligkeitsdatum</Label>
                      <Input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      />
                    </Field>

                    <Field>
                      <Label>Priorität</Label>
                      <Select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                      >
                        <option value="low">Niedrig</option>
                        <option value="medium">Mittel</option>
                        <option value="high">Hoch</option>
                        <option value="urgent">Dringend</option>
                      </Select>
                    </Field>
                  </div>
                </FieldGroup>
              </DialogBody>
              <DialogActions>
                <Button plain onClick={() => setIsEditing(false)} disabled={loading}>
                  Abbrechen
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                >
                  Speichern
                </Button>
              </DialogActions>
            </form>
          ) : (
            // Normale Ansicht
            <>
              <DialogTitle>
                {event.title}
              </DialogTitle>
              
              <DialogBody className="mt-4 space-y-4 pb-6">
                {/* Status */}
                {(event.status || (event.type === 'task' && taskData)) && (
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-gray-600">Status:</Text>
                    {getStatusBadge()}
                  </div>
                )}

                {/* Datum */}
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <Text className="text-sm text-gray-600">
                    {event.date.toLocaleDateString('de-DE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </div>

                {/* Task-spezifische Infos */}
                {event.type === 'task' && taskData && (
                  <>
                    <div className="flex items-center gap-2">
                      <Text className="text-sm text-gray-600">Priorität:</Text>
                      {getPriorityBadge(taskData.priority)}
                    </div>

                    {taskData.description && (
                      <div>
                        <Text className="text-sm font-medium text-gray-600">Beschreibung:</Text>
                        <Text className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{taskData.description}</Text>
                      </div>
                    )}
                  </>
                )}

                {/* Client */}
                {event.metadata?.clientName && (
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-gray-600">Kunde:</Text>
                    <Text className="text-sm font-medium">{event.metadata.clientName}</Text>
                  </div>
                )}

                {/* Empfänger */}
                {event.metadata?.recipientCount && (
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-gray-600">Empfänger:</Text>
                    <Text className="text-sm">{event.metadata.recipientCount}</Text>
                  </div>
                )}

                {/* Überfällig seit */}
                {event.metadata?.daysOverdue && (
                  <div className="flex items-center gap-2">
                    <Text className="text-sm text-gray-600">Überfällig seit:</Text>
                    <Text className="text-sm text-red-600 font-medium">
                      {event.metadata.daysOverdue} Tagen
                    </Text>
                  </div>
                )}
              </DialogBody>

              <DialogActions>
                {/* Kampagnen-Buttons */}
                {(event.type === 'campaign_scheduled' || event.type === 'campaign_sent') && event.campaignId && (
                  <Link href={`/dashboard/pr-tools/campaigns/campaigns/${event.campaignId}`}>
                    <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap">
                      Kampagne anzeigen
                    </Button>
                  </Link>
                )}
                
                {/* Freigabe-Buttons */}
                {(event.type === 'approval_pending' || event.type === 'approval_overdue') && (
                  <Link href="/dashboard/pr-tools/approvals">
                    <Button className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap">
                      Zur Freigabe
                    </Button>
                  </Link>
                )}
                
                {/* Task-Buttons */}
                {event.type === 'task' && taskData && (
                  <>
                    {taskData.status === 'completed' ? (
                      // Erledigte Tasks: Status links, Löschen-Button rechts
                      <div className="w-full flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                          <Text className="text-sm text-gray-700 font-medium">
                            Diese Aufgabe wurde bereits erledigt
                          </Text>
                        </div>
                        <Button 
                          plain 
                          onClick={handleTaskDelete} 
                          disabled={loading} 
                          className="text-red-600 hover:text-red-700 whitespace-nowrap"
                        >
                          <TrashIcon />
                          Löschen
                        </Button>
                      </div>
                    ) : (
                      // Nicht erledigte Tasks: Alle Buttons
                      <>
                        <Button 
                          plain 
                          onClick={handleTaskDelete} 
                          disabled={loading} 
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon />
                          Löschen
                        </Button>
                        <Button 
                          plain 
                          onClick={() => setIsEditing(true)} 
                          disabled={loading}
                        >
                          <PencilIcon />
                          Bearbeiten
                        </Button>
                        <Button 
                          onClick={handleTaskComplete} 
                          disabled={loading}
                          className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
                        >
                          <CheckCircleIcon />
                          Erledigt
                        </Button>
                      </>
                    )}
                  </>
                )}
              </DialogActions>
            </>
          )}
        </div>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      >
        <div className="p-6">
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogBody className="mt-2">
                <Text>{confirmDialog.message}</Text>
              </DialogBody>
            </div>
          </div>
          <DialogActions className="mt-5 sm:mt-4">
            <Button
              plain
              onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Abbrechen
            </Button>
            <Button
              color="zinc"
              onClick={() => {
                confirmDialog.onConfirm();
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              }}
              className="whitespace-nowrap"
            >
              Löschen
            </Button>
          </DialogActions>
        </div>
      </Dialog>
    </>
  );
}