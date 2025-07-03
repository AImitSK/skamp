// src/app/dashboard/calendar/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Text } from '@/components/text';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { 
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  FunnelIcon,
  PlusIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ReactDOM from 'react-dom';
import { getEventsForDateRange } from '@/lib/calendar/notifications';
import { CalendarEvent } from '@/types/calendar';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { ApprovalWidget } from '@/components/calendar/ApprovalWidget';
import { EventHoverCard } from '@/components/calendar/EventHoverCard';
import { prService } from '@/lib/firebase/pr-service';
import { taskService } from '@/lib/firebase/task-service';
import { Task } from '@/types/tasks';
import { Timestamp } from 'firebase/firestore';
import { companiesService } from '@/lib/firebase/crm-service';
import { Company } from '@/types/crm';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';

// Helper für Monatsnavigation
const getMonthName = (date: Date) => {
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
};

const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay() || 7; // Montag = 1, Sonntag = 7
  
  return { daysInMonth, startingDayOfWeek };
};

// Event Card Component
function EventCard({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set timeout for hover delay
    hoverTimeoutRef.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setHoverPosition({
          x: rect.left + rect.width / 2,
          y: rect.top
        });
        setIsHovered(true);
      }
    }, 500); // 500ms delay before showing
  };

  const handleMouseLeave = () => {
    // Clear timeout if mouse leaves before delay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getEventIcon = () => {
    switch (event.type) {
      case 'campaign_scheduled':
        return <PaperAirplaneIcon className="h-3 w-3" />;
      case 'campaign_sent':
        return <CheckCircleIcon className="h-3 w-3" />;
      case 'approval_pending':
        return <ClockIcon className="h-3 w-3" />;
      case 'approval_overdue':
        return <ExclamationTriangleIcon className="h-3 w-3" />;
      case 'task':
        return <CheckCircleIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case 'campaign_scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      case 'campaign_sent':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'approval_pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      case 'approval_overdue':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      case 'task':
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    }
  };

  return (
    <>
      <div 
        ref={cardRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={clsx(
          "text-xs p-1 rounded border mb-1 truncate cursor-pointer transition-all",
          getEventColor()
        )}
      >
        <div className="flex items-center gap-1">
          {getEventIcon()}
          <span className="truncate">{event.title}</span>
        </div>
      </div>
      
      {/* Hover Card Portal */}
      {typeof window !== 'undefined' && ReactDOM.createPortal(
        <EventHoverCard 
          event={event} 
          isVisible={isHovered} 
          position={hoverPosition} 
        />,
        document.body
      )}
    </>
  );
}

// Quick Task Modal Component
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
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      date,
      linkedCampaignId: linkedCampaignId || undefined,
      linkedClientId: linkedClientId || undefined,
      priority
    });
    // Reset form
    setTitle('');
    setDescription('');
    setLinkedCampaignId('');
    setLinkedClientId('');
    setPriority('medium');
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
                Priorität
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#005fab] focus:outline-none focus:ring-1 focus:ring-[#005fab]"
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
              </select>
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clients, setClients] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [filters, setFilters] = useState({
    showCampaigns: true,
    showApprovals: true,
    showTasks: true
  });
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Lade echte Events aus Firebase
  useEffect(() => {
    const loadEvents = async () => {
      if (!user?.uid) {
        console.log('❌ Kein User eingeloggt');
        return;
      }
      
      setLoading(true);
      try {
        // Hole Events für den aktuellen Monat
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
        
        console.log('📅 Lade Events für Zeitraum:', {
          start: startOfMonth.toLocaleString('de-DE'),
          end: endOfMonth.toLocaleString('de-DE'),
          currentMonth: currentDate.getMonth() + 1,
          currentYear: currentDate.getFullYear()
        });
        
        const realEvents = await getEventsForDateRange(
          user.uid,
          startOfMonth,
          endOfMonth
        );
        
        setEvents(realEvents);
        
      } catch (error) {
        console.error('❌ Fehler beim Laden der Events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadEvents();
  }, [currentDate, user?.uid]);

  // Lade Kampagnen und Kunden für Filter und Quick Task
  useEffect(() => {
    const loadAdditionalData = async () => {
      if (!user?.uid) return;
      
      try {
        const [campaignsData, clientsData] = await Promise.all([
          prService.getAll(user.uid),
          companiesService.getAll(user.uid)
        ]);
        setCampaigns(campaignsData);
        setClients(clientsData.filter(c => c.type === 'customer'));
      } catch (error) {
        console.error('Fehler beim Laden der Zusatzdaten:', error);
      }
    };
    
    loadAdditionalData();
  }, [user?.uid]);

  // Gefilterte Events berechnen
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filter nach Event-Typ
      if (event.type === 'campaign_scheduled' || event.type === 'campaign_sent') {
        if (!filters.showCampaigns) return false;
      }
      
      if (event.type === 'approval_pending' || event.type === 'approval_overdue') {
        if (!filters.showApprovals) return false;
      }
      
      if (event.type === 'task') {
        if (!filters.showTasks) return false;
      }
      
      // Filter nach Kunde
      if (selectedClientIds.length > 0) {
        if (!event.clientId || !selectedClientIds.includes(event.clientId)) {
          return false;
        }
      }
      
      return true;
    });
  }, [events, filters, selectedClientIds]);

  // Client options für Dropdown
  const clientOptions = useMemo(() => {
    return clients.map(client => ({
      value: client.id!,
      label: client.name
    }));
  }, [clients]);

  // Kalender-Daten berechnen
  const calendarData = useMemo(() => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    
    // Leere Tage am Anfang
    for (let i = 1; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Tage des Monats
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  }, [currentDate]);

  // Events für einen bestimmten Tag
  const getEventsForDay = (day: number) => {
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  // Event-Click Handler
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Quick Task Handler - Vollständige Firebase Implementation
  const handleCreateTask = async (taskData: any) => {
    if (!user?.uid) {
      console.error('Kein User eingeloggt');
      alert('Sie müssen eingeloggt sein, um eine Aufgabe zu erstellen.');
      return;
    }
    
    try {
      console.log('Erstelle Task mit Daten:', taskData);
      
      // Erstelle Task-Objekt für Firebase
      const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: user.uid,
        title: taskData.title,
        description: taskData.description || '',
        status: 'pending',
        priority: taskData.priority,
        dueDate: taskData.date ? Timestamp.fromDate(taskData.date) : undefined,
        linkedCampaignId: taskData.linkedCampaignId || undefined,
        linkedClientId: taskData.linkedClientId || undefined
      };
      
      console.log('Task-Objekt für Firebase:', newTask);
      
      // Speichere in Firebase
      const taskId = await taskService.create(newTask);
      console.log('✅ Task erfolgreich erstellt mit ID:', taskId);
      
      // Debug: Lade die Task direkt nach dem Erstellen
      const createdTask = await taskService.getById(taskId);
      console.log('📝 Erstellte Task aus DB:', createdTask);
      
      // Füge die neue Task sofort zu den Events hinzu (für sofortige Anzeige)
      if (taskData.date) {
        const newEvent: CalendarEvent = {
          id: `task-${taskId}`,
          title: `📋 ${taskData.title}`,
          date: taskData.date,
          type: 'task',
          status: 'pending',
          priority: taskData.priority,
          taskId: taskId,
          campaignId: taskData.linkedCampaignId,
          clientId: taskData.linkedClientId,
          metadata: {
            description: taskData.description,
            clientName: taskData.linkedClientId 
              ? clients.find(c => c.id === taskData.linkedClientId)?.name 
              : undefined
          }
        };
        
        setEvents([...events, newEvent]);
        
        // Success Feedback
        alert('Aufgabe wurde erfolgreich erstellt!');
      }
      
    } catch (error: any) {
      console.error('Fehler beim Erstellen der Aufgabe:', error);
      console.error('Fehler-Details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Spezifische Fehlermeldungen
      if (error.code === 'permission-denied') {
        alert('Sie haben keine Berechtigung, Aufgaben zu erstellen. Bitte kontaktieren Sie den Administrator.');
      } else if (error.code === 'not-found') {
        alert('Die Aufgaben-Funktion ist noch nicht eingerichtet. Bitte kontaktieren Sie den Administrator.');
      } else {
        alert(`Fehler beim Erstellen der Aufgabe: ${error.message || 'Unbekannter Fehler'}`);
      }
    }
  };

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = filteredEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
    
    const overdue = filteredEvents.filter(e => {
      const eventDate = new Date(e.date);
      return e.type === 'approval_overdue' || (e.status === 'pending' && eventDate < today);
    });
    
    return {
      thisMonth: thisMonth.length,
      overdue: overdue.length,
      upcoming: filteredEvents.filter(e => new Date(e.date) >= today).length
    };
  }, [filteredEvents, currentDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <CalendarDaysIcon className="h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">Lade Kalender...</p>
        </div>
      </div>
    );
  }

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
            onClick={() => setShowTaskModal(true)}
            className="inline-flex items-center gap-x-2 rounded-lg bg-[#005fab] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005fab]"
          >
            <PlusIcon className="size-4" />
            Aufgabe erstellen
          </button>
        </div>
      </div>

      {/* Filter Box */}
      <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-4 mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Kunden-Filter */}
          <div className="w-full lg:w-64">
            <MultiSelectDropdown 
              label="" 
              placeholder="Nach Kunde filtern..." 
              options={clientOptions} 
              selectedValues={selectedClientIds} 
              onChange={setSelectedClientIds}
            />
          </div>

          {/* Event-Typ Filter */}
          <div className="flex items-center gap-4 flex-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showCampaigns}
                onChange={(e) => setFilters({...filters, showCampaigns: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-sm">Kampagnen</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showApprovals}
                onChange={(e) => setFilters({...filters, showApprovals: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-sm">Freigaben</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showTasks}
                onChange={(e) => setFilters({...filters, showTasks: e.target.checked})}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <span className="text-sm">Aufgaben</span>
            </label>
          </div>
        </div>

        {/* Filter-Info */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredEvents.length} von {events.length} Events
            {selectedClientIds.length > 0 && ` • ${selectedClientIds.length} Kunde${selectedClientIds.length > 1 ? 'n' : ''} ausgewählt`}
          </span>
          
          {/* Legende */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-xs">Geplant</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-xs">Versendet</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span className="text-xs">Freigabe</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-xs">Überfällig</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-xs">Aufgabe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kalender - Volle Breite */}
      <div className="bg-white rounded-lg border">
        {/* Kalender Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold capitalize">
              {getMonthName(currentDate)}
            </h2>
            
            <div className="flex items-center gap-2">
              <Button plain onClick={goToToday} className="text-sm">
                Heute
              </Button>
              
              <div className="flex items-center">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Wochentage */}
        <div className="grid grid-cols-7 gap-0 border-b">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Kalender Grid */}
        <div className="grid grid-cols-7 gap-0">
          {calendarData.map((day, index) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const isToday = day === new Date().getDate() && 
                           currentDate.getMonth() === new Date().getMonth() &&
                           currentDate.getFullYear() === new Date().getFullYear();
            const isWeekend = index % 7 === 5 || index % 7 === 6;
            
            return (
              <div
                key={index}
                className={clsx(
                  "min-h-[120px] p-2 border-r border-b",
                  !day && "bg-gray-50",
                  isToday && "bg-blue-50",
                  isWeekend && day && !isToday && "bg-gray-50/50"
                )}
              >
                {day && (
                  <>
                    <div className={clsx(
                      "text-sm mb-1 flex items-center justify-between",
                      isToday ? "font-bold text-blue-600" : "text-gray-700"
                    )}>
                      <span>{day}</span>
                      {isToday && dayEvents.length === 0 && (
                        <button
                          onClick={() => {
                            setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                            setShowTaskModal(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          + Aufgabe
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          onClick={() => handleEventClick(event)}
                        />
                      ))}
                      
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayEvents.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Freigabe-Widget unter dem Kalender mit voller Breite */}
      {user?.uid && (
        <div className="mt-6">
          <ApprovalWidget 
            userId={user.uid} 
            onRefresh={() => {
              // Kalender-Events neu laden
              window.location.reload();
            }}
          />
        </div>
      )}

      {/* Event Details Modal */}
      <EventDetailsModal 
        event={selectedEvent}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
      />

      {/* Quick Task Modal */}
      <QuickTaskModal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedDate(null);
        }}
        onSave={handleCreateTask}
        defaultDate={selectedDate || undefined}
        campaigns={campaigns}
        clients={clients}
      />
    </div>
  );
}