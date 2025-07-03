// src/app/dashboard/calendar/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import {
  PlusIcon,
} from '@heroicons/react/24/outline';
import { getEventsForDateRange } from '@/lib/calendar/notifications';
import { CalendarEvent, EVENT_ICONS } from '@/types/calendar';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { OverdueTasksWidget } from '@/components/calendar/OverdueTasksWidget';
import { prService } from '@/lib/firebase/pr-service';
import { taskService } from '@/lib/firebase/task-service';
// Temporäre Type-Definitionen falls tasks.ts nicht existiert
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
// import { Task, TaskPriority } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';
import { companiesService } from '@/lib/firebase/crm-service';
import { Company } from '@/types/crm';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventDropArg, EventClickArg } from '@fullcalendar/core';

// Quick Task Modal (kann unverändert bleiben oder in eine eigene Datei ausgelagert werden)
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
    clients: Company[];
  }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(defaultDate || new Date());
    const [linkedCampaignId, setLinkedCampaignId] = useState('');
    const [linkedClientId, setLinkedClientId] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [isAllDay, setIsAllDay] = useState(true);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');

    useEffect(() => {
      if (defaultDate) {
        setDate(defaultDate);
      }
    }, [defaultDate, isOpen]);


    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        title,
        description,
        date,
        linkedCampaignId,
        linkedClientId,
        priority,
        isAllDay,
        startTime: !isAllDay ? startTime : undefined,
        endTime: !isAllDay ? endTime : undefined
      });
      // Reset form
      setTitle('');
      setDescription('');
      setLinkedCampaignId('');
      setLinkedClientId('');
      setPriority('medium');
      setIsAllDay(true);
      setStartTime('09:00');
      setEndTime('10:00');
      onClose();
    };

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black bg-opacity-25 transition-opacity"
            onClick={onClose}
          />

          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all p-6">
            <h3 className="text-lg font-semibold mb-4">Neue Aufgabe erstellen</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
                  placeholder="z.B. Follow-up Call mit Kunde"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
                  placeholder="Weitere Details zur Aufgabe..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fälligkeitsdatum
                </label>
                <input
                  type="date"
                  value={date.toISOString().split('T')[0]}
                  onChange={(e) => setDate(new Date(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zeiteinstellungen
                </label>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Ganztägig</span>
                </label>
                
                {!isAllDay && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Von</label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Bis</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mit Kampagne verknüpfen (optional)
                </label>
                <select
                  value={linkedCampaignId}
                  onChange={(e) => setLinkedCampaignId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
                >
                  <option value="">Keine Verknüpfung</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mit Kunde verknüpfen (optional)
                </label>
                <select
                  value={linkedClientId}
                  onChange={(e) => setLinkedClientId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
                >
                  <option value="">Kein Kunde</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button plain onClick={onClose}>
                  Abbrechen
                </Button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#005fab] text-white rounded-md hover:bg-[#004a8c] transition-colors"
                >
                  Aufgabe erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }


export default function CalendarDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clients, setClients] = useState<Company[]>([]);
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

  // Funktion zum Neuladen der Daten
  const handleDataRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Lade alle Events, Kampagnen und Kunden
  useEffect(() => {
    const loadAllData = async () => {
      if (!user?.uid) {
        console.log('❌ Kein User eingeloggt');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const startOfMonth = new Date();
        startOfMonth.setMonth(startOfMonth.getMonth() - 2); // Lade Daten für einen größeren Zeitraum
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 2);

        const [realEvents, campaignsData, clientsData] = await Promise.all([
          getEventsForDateRange(user.uid, startOfMonth, endOfMonth),
          prService.getAll(user.uid),
          companiesService.getAll(user.uid)
        ]);

        setEvents(realEvents);
        setCampaigns(campaignsData);
        setClients(clientsData.filter(c => c.type === 'customer'));
      } catch (error) {
        console.error('❌ Fehler beim Laden der Kalenderdaten:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [user?.uid, refreshKey]);

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
        // Basis-Event-Objekt
        const calendarEvent: any = {
          id: event.id,
          title: event.title,
          allDay: true,
          extendedProps: {
            ...event
          },
          className: `fc-event-${event.type}`,
        };

        // Spezielle Behandlung für Tasks mit Zeiten
        if (event.type === 'task' && event.metadata) {
          const meta = event.metadata as any; // Type assertion für flexibleren Zugriff
          if (meta.startTime && meta.endTime && !meta.isAllDay) {
            const startDate = new Date(event.date);
            const endDate = new Date(event.date);
            
            // Setze Start- und Endzeiten
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
        alert("Nur Aufgaben können verschoben werden.");
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
        alert("Aufgabe erfolgreich verschoben!");
        handleDataRefresh();
    } catch(error) {
        console.error("Fehler beim Verschieben der Aufgabe:", error);
        alert("Ein Fehler ist aufgetreten. Die Aufgabe konnte nicht verschoben werden.");
        dropInfo.revert();
    }
  };

  // Handler für das Erstellen einer neuen Aufgabe
  const handleCreateTask = async (taskData: any) => {
    if (!user?.uid) {
      alert('Sie müssen eingeloggt sein, um eine Aufgabe zu erstellen.');
      return;
    }
    try {
      const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
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

      await taskService.create(newTask as Task);
      alert('Aufgabe wurde erfolgreich erstellt!');
      handleDataRefresh();
    } catch (error: any) {
      console.error('Fehler beim Erstellen der Aufgabe:', error);
      alert(`Fehler beim Erstellen der Aufgabe: ${error.message}`);
    }
  };

  // Handler für Klick auf einen Tag im Kalender
  const handleDateClick = (arg: any) => {
    setQuickTaskDate(arg.date);
    setShowTaskModal(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <Heading>Kalender</Heading>
            <Text className="mt-1">
              Behalte alle Kampagnen, Freigaben und Aufgaben im Überblick
            </Text>
          </div>
          <button
            onClick={() => {
                setQuickTaskDate(new Date());
                setShowTaskModal(true);
            }}
            className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
          >
            <PlusIcon className="size-4" />
            Aufgabe erstellen
          </button>
        </div>
      </div>

      {/* --- NUR NOCH OVERDUE TASKS WIDGET --- */}
      <div className="mb-6">
        {user?.uid && (
            <OverdueTasksWidget
            key={`overdue-${refreshKey}`}
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
      {/* --- ENDE WIDGETS --- */}


      {/* FullCalendar Integration */}
      <div className="bg-white rounded-lg border p-4">
        <style>
            {`
                /* Event Backgrounds */
                .fc-event-campaign_scheduled { background-color: #dbeafe; border-color: #bfdbfe; }
                .fc-event-campaign_sent { background-color: #d1fae5; border-color: #a7f3d0; }
                .fc-event-approval_pending, .fc-event-approval_overdue { background-color: #fef9c3; border-color: #fef08a; }
                .fc-event-task { background-color: #e9d5ff; border-color: #d8b4fe; }

                /* Textfarbe explizit für die Text-Elemente setzen */
                .fc-event-campaign_scheduled .fc-event-title, .fc-event-campaign_scheduled .fc-event-time, .fc-event-campaign_scheduled span { color: #1e40af !important; }
                .fc-event-campaign_sent .fc-event-title, .fc-event-campaign_sent .fc-event-time, .fc-event-campaign_sent span { color: #065f46 !important; }
                .fc-event-approval_pending .fc-event-title, .fc-event-approval_pending .fc-event-time, .fc-event-approval_pending span { color: #854d0e !important; }
                .fc-event-approval_overdue .fc-event-title, .fc-event-approval_overdue .fc-event-time, .fc-event-approval_overdue span { color: #991b1b !important; }
                .fc-event-task .fc-event-title, .fc-event-task .fc-event-time, .fc-event-task span { color: #6b21a8 !important; }

                /* Allgemeine Stile */
                .fc-daygrid-event { white-space: normal; cursor: pointer; padding: 2px 4px; }
                .fc-event-title { font-weight: 500; }
                .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 600; }
                .fc .fc-button-primary { background-color: #005fab !important; border-color: #005fab !important; }
                
                /* Erhöhte Zellenhöhe */
                .fc .fc-daygrid-body-unbalanced .fc-daygrid-day-frame { min-height: 100px; }
                .fc .fc-timegrid-slot { height: 60px; }
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

            {/* Filter Box */}
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 my-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-64">
            <MultiSelectDropdown
              label=""
              placeholder="Nach Kunde filtern..."
              options={clientOptions}
              selectedValues={selectedClientIds}
              onChange={setSelectedClientIds}
            />
          </div>
          <div className="flex items-center gap-4 flex-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.showCampaigns} onChange={(e) => setFilters({ ...filters, showCampaigns: e.target.checked })} className="rounded"/>
              <span className="text-sm">Kampagnen</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.showApprovals} onChange={(e) => setFilters({ ...filters, showApprovals: e.target.checked })} className="rounded"/>
              <span className="text-sm">Freigaben</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters.showTasks} onChange={(e) => setFilters({ ...filters, showTasks: e.target.checked })} className="rounded"/>
              <span className="text-sm">Aufgaben</span>
            </label>
          </div>
        </div>
      </div>


      <EventDetailsModal
        event={selectedEvent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onTaskUpdated={handleDataRefresh}
      />
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
  return (
    <div className="flex items-center gap-1 overflow-hidden p-1">
      {icon && <span className="text-sm flex-shrink-0">{icon}</span>}
      <span className="truncate text-xs">{eventInfo.event.title}</span>
    </div>
  );
}