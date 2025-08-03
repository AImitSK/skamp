// src/app/dashboard/pr-tools/calendar/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrganization } from '@/context/OrganizationContext';
import { useCrmData } from '@/context/CrmDataContext';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '@/components/ui/dialog';
import { Field, Label, FieldGroup } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusIcon, InformationCircleIcon } from '@heroicons/react/20/solid';
import { getEventsForDateRange } from '@/lib/calendar/notifications';
import { CalendarEvent, EVENT_ICONS } from '@/types/calendar';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { OverdueTasksWidget } from '@/components/calendar/OverdueTasksWidget';
import { prService } from '@/lib/firebase/pr-service';
import { taskService } from '@/lib/firebase/task-service';
import { Timestamp } from 'firebase/firestore';
import { Company } from '@/types/crm';
import { CompanyEnhanced } from '@/types/crm-enhanced';
import { Task as TaskType } from '@/types/tasks';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventDropArg, EventClickArg } from '@fullcalendar/core';

// Types
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
interface Task {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: TaskPriority;
  dueDate?: Timestamp;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  linkedCampaignId?: string;
  linkedClientId?: string;
}

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

  const Icon = InformationCircleIcon;

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

// Quick Task Modal
function QuickTaskModal({
  isOpen,
  onClose,
  onSave,
  defaultDate,
  campaigns,
  clients
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: any) => void;
  defaultDate?: Date;
  campaigns: any[];
  clients: CompanyEnhanced[];
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: defaultDate || new Date(),
    linkedCampaignId: '',
    linkedClientId: '',
    priority: 'medium' as TaskPriority,
    isAllDay: true,
    startTime: '09:00',
    endTime: '10:00'
  });

  useEffect(() => {
    if (defaultDate) {
      setFormData(prev => ({ ...prev, date: defaultDate }));
    }
  }, [defaultDate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form
    setFormData({
      title: '',
      description: '',
      date: defaultDate || new Date(),
      linkedCampaignId: '',
      linkedClientId: '',
      priority: 'medium',
      isAllDay: true,
      startTime: '09:00',
      endTime: '10:00'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit}>
        <DialogTitle className="px-6 py-4 text-lg font-semibold">
          Neue Aufgabe erstellen
        </DialogTitle>
        
        <DialogBody className="p-6">
          <FieldGroup>
            <Field>
              <Label>Titel *</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="z.B. Follow-up Call mit Kunde"
              />
            </Field>

            <Field>
              <Label>Beschreibung</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Weitere Details zur Aufgabe..."
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <Label>Fälligkeitsdatum</Label>
                <Input
                  type="date"
                  value={formData.date.toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                />
              </Field>

              <Field>
                <Label>Priorität</Label>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </Select>
              </Field>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.isAllDay}
                  onChange={(checked) => setFormData({ ...formData, isAllDay: checked })}
                />
                <span className="text-sm font-medium text-gray-700">Ganztägig</span>
              </label>
              
              {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <Label>Von</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <Label>Bis</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            </div>

            <Field>
              <Label>Mit Kampagne verknüpfen (optional)</Label>
              <Select
                value={formData.linkedCampaignId}
                onChange={(e) => setFormData({ ...formData, linkedCampaignId: e.target.value })}
              >
                <option value="">Keine Verknüpfung</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <Label>Mit Kunde verknüpfen (optional)</Label>
              <Select
                value={formData.linkedClientId}
                onChange={(e) => setFormData({ ...formData, linkedClientId: e.target.value })}
              >
                <option value="">Kein Kunde</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
              {clients.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Keine Kunden verfügbar. Bitte erst Kunden im CRM anlegen.
                </p>
              )}
            </Field>
          </FieldGroup>
        </DialogBody>

        <DialogActions className="px-6 py-4">
          <Button plain onClick={onClose}>
            Abbrechen
          </Button>
          <Button 
            type="submit"
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            Aufgabe erstellen
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function CalendarDashboard() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { companies } = useCrmData();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clients, setClients] = useState<CompanyEnhanced[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [quickTaskDate, setQuickTaskDate] = useState<Date | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    showCampaigns: true,
    showApprovals: true,
    showTasks: true
  });
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [alert, setAlert] = useState<{ type: 'info' | 'error'; message: string } | null>(null);

  // Alert Management
  const showAlert = useCallback((type: 'info' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Funktion zum Neuladen der Daten
  const handleDataRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Lade alle Events, Kampagnen und Kunden
  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.uid || !currentOrganization?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const startOfMonth = new Date();
        startOfMonth.setMonth(startOfMonth.getMonth() - 2);
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 2);

        const [realEvents, campaignsData] = await Promise.all([
          getEventsForDateRange(currentOrganization.id, startOfMonth, endOfMonth, user.uid),
          prService.getAll(currentOrganization.id, true), // true = useOrganizationId
        ]);

        setEvents(realEvents);
        setCampaigns(campaignsData);
        
        // Verwende Daten aus CrmDataContext statt separater API-Calls
        const customerClients = companies.filter(c => c.type === 'customer');
        setClients(customerClients);
      } catch (error) {
        showAlert('error', 'Fehler beim Laden der Kalenderdaten');
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [user?.uid, currentOrganization?.id, refreshKey, showAlert, companies]);

  // Gefilterte Events berechnen für FullCalendar
  const filteredEventsForCalendar = useMemo(() => {
    return events
      .filter(event => {
        if ((event.type === 'campaign_scheduled' || event.type === 'campaign_sent') && !filters.showCampaigns) return false;
        if ((event.type === 'approval_pending' || event.type === 'approval_overdue') && !filters.showApprovals) return false;
        if (event.type === 'task' && !filters.showTasks) return false;
        if (selectedClientIds.length > 0 && (!event.clientId || !selectedClientIds.includes(event.clientId))) return false;
        return true;
      })
      .map(event => {
        const calendarEvent: any = {
          id: event.id,
          title: event.title,
          allDay: true,
          extendedProps: {
            ...event
          },
          className: `fc-event-${event.type}`,
        };

        if (event.type === 'task' && event.metadata) {
          const meta = event.metadata as any;
          if (meta.startTime && meta.endTime && !meta.isAllDay) {
            const startDate = new Date(event.date);
            const endDate = new Date(event.date);
            
            const [startHour, startMinute] = meta.startTime.split(':').map(Number);
            const [endHour, endMinute] = meta.endTime.split(':').map(Number);
            
            startDate.setHours(startHour, startMinute, 0, 0);
            endDate.setHours(endHour, endMinute, 0, 0);
            
            calendarEvent.start = startDate;
            calendarEvent.end = endDate;
            calendarEvent.allDay = false;
          } else {
            calendarEvent.start = event.date;
          }
        } else {
          calendarEvent.start = event.date;
        }

        return calendarEvent;
      });
  }, [events, filters, selectedClientIds]);

  // Client-Optionen für das Dropdown
  const clientOptions = useMemo(() => clients.map(client => ({
    value: client.id!,
    label: client.name
  })), [clients]);

  // Event-Click-Handler für FullCalendar
  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventData = clickInfo.event.extendedProps as CalendarEvent;
    setSelectedEvent(eventData);
    setModalOpen(true);
  };

  // Handler für das Verschieben von Events (Drag-and-Drop)
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const eventData = dropInfo.event.extendedProps as CalendarEvent;

    if (eventData.type !== 'task' || !eventData.taskId) {
        showAlert('info', 'Nur Aufgaben können verschoben werden.');
        dropInfo.revert();
        return;
    }

    if (!dropInfo.event.start) {
        dropInfo.revert();
        return;
    }

    try {
        await taskService.update(eventData.taskId, {
            dueDate: Timestamp.fromDate(dropInfo.event.start)
        });
        showAlert('info', 'Aufgabe erfolgreich verschoben!');
        handleDataRefresh();
    } catch(error) {
        showAlert('error', 'Die Aufgabe konnte nicht verschoben werden.');
        dropInfo.revert();
    }
  };

  // Handler für das Erstellen einer neuen Aufgabe
  const handleCreateTask = async (taskData: any) => {
    if (!user?.uid || !currentOrganization?.id) {
      showAlert('error', 'Sie müssen eingeloggt sein, um eine Aufgabe zu erstellen.');
      return;
    }
    try {
      const newTask: Omit<TaskType, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        organizationId: currentOrganization.id,
        title: taskData.title,
        description: taskData.description || '',
        status: 'pending',
        priority: taskData.priority,
        dueDate: taskData.date ? Timestamp.fromDate(taskData.date) : undefined,
        isAllDay: taskData.isAllDay !== undefined ? taskData.isAllDay : true,
        startTime: taskData.startTime,
        endTime: taskData.endTime
      };
      if (taskData.linkedCampaignId) (newTask as any).linkedCampaignId = taskData.linkedCampaignId;
      if (taskData.linkedClientId) (newTask as any).linkedClientId = taskData.linkedClientId;

      await taskService.create(newTask);
      showAlert('info', 'Aufgabe wurde erfolgreich erstellt!');
      handleDataRefresh();
    } catch (error: any) {
      showAlert('error', `Fehler beim Erstellen der Aufgabe: ${error.message}`);
    }
  };

  // Handler für Klick auf einen Tag im Kalender
  const handleDateClick = (arg: any) => {
    setQuickTaskDate(arg.date);
    setShowTaskModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005fab] mx-auto"></div>
          <Text className="mt-4">Lade Kalender...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Alert */}
      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} message={alert.message} />
        </div>
      )}

      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <Heading>Kalender</Heading>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Button
            onClick={() => {
                setQuickTaskDate(new Date());
                setShowTaskModal(true);
            }}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white whitespace-nowrap"
          >
            <PlusIcon />
            Aufgabe erstellen
          </Button>
        </div>
      </div>

      {/* Overdue Tasks Widget */}
      <div className="mt-6 mb-6">
        {user?.uid && currentOrganization && (
          <OverdueTasksWidget
            key={`overdue-${refreshKey}`}
            organizationId={currentOrganization.id}
            userId={user.uid}
            onTaskClick={(task) => {
              const taskEvent: CalendarEvent = {
                id: `task-${task.id}`,
                title: `📋 ${task.title}`,
                date: task.dueDate?.toDate() || new Date(),
                type: 'task',
                status: task.status === 'completed' ? 'completed' : 'pending',
                priority: task.priority,
                taskId: task.id,
                clientId: task.linkedClientId,
                campaignId: task.linkedCampaignId,
                metadata: { description: task.description }
              };
              setSelectedEvent(taskEvent);
              setModalOpen(true);
            }}
            onRefresh={handleDataRefresh}
          />
        )}
      </div>

      {/* Filter Box */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-64">
            <MultiSelectDropdown
              placeholder="Nach Kunde filtern..."
              options={clientOptions}
              selectedValues={selectedClientIds}
              onChange={setSelectedClientIds}
            />
          </div>
          <div className="flex items-center gap-4 flex-1 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showCampaigns}
                onChange={(checked) => setFilters({ ...filters, showCampaigns: checked })}
              />
              <span className="text-sm">Kampagnen</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showApprovals}
                onChange={(checked) => setFilters({ ...filters, showApprovals: checked })}
              />
              <span className="text-sm">Freigaben</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.showTasks}
                onChange={(checked) => setFilters({ ...filters, showTasks: checked })}
              />
              <span className="text-sm">Aufgaben</span>
            </label>
          </div>
        </div>
      </div>

      {/* FullCalendar */}
      <div className="bg-white rounded-lg border p-4">
        <style>
          {`
            /* Event Backgrounds */
            .fc-event-campaign_scheduled { background-color: #dbeafe; border-color: #bfdbfe; }
            .fc-event-campaign_sent { background-color: #d1fae5; border-color: #a7f3d0; }
            .fc-event-approval_pending, .fc-event-approval_overdue { background-color: #fef9c3; border-color: #fef08a; }
            .fc-event-task { background-color: #e9d5ff; border-color: #d8b4fe; }

            /* FORCE dark text on ALL event elements */
            .fc-event,
            .fc-event *,
            .fc-event-main,
            .fc-event-main *,
            .fc-daygrid-event,
            .fc-daygrid-event *,
            .fc-timegrid-event,
            .fc-timegrid-event *,
            .fc-event-title,
            .fc-event-time,
            .fc-event-title-container,
            .fc-event-time-container,
            .fc-event-main-frame {
              color: #111827 !important;
            }
            
            /* Specific overrides for all event types to ensure dark text */
            .fc-event-campaign_scheduled *,
            .fc-event-campaign_sent *,
            .fc-event-approval_pending *,
            .fc-event-approval_overdue *,
            .fc-event-task * {
              color: #111827 !important;
            }

            /* Additional specificity for nested elements */
            .fc-daygrid-event-harness .fc-event,
            .fc-daygrid-event-harness .fc-event * {
              color: #111827 !important;
            }

            /* Allgemeine Stile */
            .fc-daygrid-event { 
              white-space: normal; 
              cursor: pointer; 
              padding: 2px 4px;
              color: #111827 !important;
            }
            .fc-event-title { 
              font-weight: 500;
              color: #111827 !important;
            }
            .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 600; }
            .fc .fc-button-primary { background-color: #005fab !important; border-color: #005fab !important; }
            .fc .fc-button-primary:hover { background-color: #004a8c !important; border-color: #004a8c !important; }
            
            /* Zellenhöhe */
            .fc .fc-daygrid-body-unbalanced .fc-daygrid-day-frame { min-height: 100px; }
            .fc .fc-timegrid-slot { height: 60px; }
            
            /* Ensure text contrast on hover */
            .fc-event:hover,
            .fc-event:hover * {
              color: #000000 !important;
            }
            
            /* Override any theme colors */
            .fc-h-event .fc-event-main {
              color: #111827 !important;
            }
            
            /* Time grid specific */
            .fc-timegrid-event .fc-event-main {
              color: #111827 !important;
            }
            
            /* List view if used */
            .fc-list-event-title,
            .fc-list-event-time {
              color: #111827 !important;
            }
          `}
        </style>
        <FullCalendar
          key={`calendar-${refreshKey}`}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={filteredEventsForCalendar}
          locale="de"
          buttonText={{ today: 'Heute', month: 'Monat', week: 'Woche', day: 'Tag' }}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventContent={renderEventContent}
          aspectRatio={2.2}
          dayMaxEvents={true}
        />
      </div>

{/* Event Details Modal */}
<EventDetailsModal
  event={selectedEvent}
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  onTaskUpdated={handleDataRefresh}
  onEmailCancelled={handleDataRefresh} // NEU: Diesen Callback hinzufügen!
/>

      {/* Quick Task Modal */}
      <QuickTaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleCreateTask}
        defaultDate={quickTaskDate}
        campaigns={campaigns}
        clients={clients}
      />
    </div>
  );
}

// Benutzerdefinierte Render-Funktion für Events
function renderEventContent(eventInfo: any) {
  const eventType = eventInfo.event.extendedProps.type as keyof typeof EVENT_ICONS;
  const icon = EVENT_ICONS[eventType];
  const title = eventInfo.event.title;
  
  // Entferne Icon aus dem Titel, falls es dort schon enthalten ist
  const cleanTitle = title.replace(/^[^\s]+\s/, '');
  
  return (
    <div className="flex items-center gap-1 overflow-hidden p-1">
      {icon && <span className="text-sm flex-shrink-0">{icon}</span>}
      <span className="truncate text-xs text-gray-900 font-medium">{cleanTitle}</span>
    </div>
  );
}