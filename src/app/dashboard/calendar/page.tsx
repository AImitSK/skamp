// src/app/dashboard/calendar/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
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
  FunnelIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

// Temporäre Event-Typen (später in src/types/calendar.ts verschieben)
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'campaign_scheduled' | 'campaign_sent' | 'approval_pending' | 'approval_overdue' | 'task';
  status?: 'pending' | 'completed' | 'overdue';
  color?: string;
  campaignId?: string;
  clientName?: string;
}

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
function EventCard({ event }: { event: CalendarEvent }) {
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
      default:
        return null;
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case 'campaign_scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'campaign_sent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approval_pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approval_overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={clsx(
      "text-xs p-1 rounded border mb-1 truncate cursor-pointer hover:opacity-80 transition-opacity",
      getEventColor()
    )}>
      <div className="flex items-center gap-1">
        {getEventIcon()}
        <span className="truncate">{event.title}</span>
      </div>
    </div>
  );
}

export default function CalendarDashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    showCampaigns: true,
    showApprovals: true,
    showTasks: true
  });

  // Mock Events für Demo (später durch echte Daten ersetzen)
  useEffect(() => {
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Newsletter Q1 versenden',
        date: new Date(2024, 0, 15),
        type: 'campaign_scheduled',
        campaignId: '123',
        clientName: 'TechCorp GmbH'
      },
      {
        id: '2',
        title: 'Produktlaunch Kampagne',
        date: new Date(2024, 0, 20),
        type: 'campaign_sent',
        campaignId: '124',
        clientName: 'StartUp AG'
      },
      {
        id: '3',
        title: 'Freigabe: Pressemitteilung',
        date: new Date(2024, 0, 8),
        type: 'approval_overdue',
        status: 'overdue',
        campaignId: '125',
        clientName: 'Media Corp'
      },
      {
        id: '4',
        title: 'Warten auf Freigabe',
        date: new Date(2024, 0, 25),
        type: 'approval_pending',
        status: 'pending',
        campaignId: '126'
      }
    ];
    
    setEvents(mockEvents);
    setLoading(false);
  }, []);

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
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
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

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = events.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getMonth() === currentDate.getMonth() &&
             eventDate.getFullYear() === currentDate.getFullYear();
    });
    
    const overdue = events.filter(e => {
      const eventDate = new Date(e.date);
      return e.type === 'approval_overdue' || (e.status === 'pending' && eventDate < today);
    });
    
    return {
      thisMonth: thisMonth.length,
      overdue: overdue.length,
      upcoming: events.filter(e => new Date(e.date) >= today).length
    };
  }, [events, currentDate]);

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
        <Heading>Kalender</Heading>
        <Text className="mt-1">
          Behalte alle Kampagnen, Freigaben und Aufgaben im Überblick
        </Text>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-sm">Übersicht</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Diesen Monat</span>
                <Badge color="blue">{stats.thisMonth}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Anstehend</span>
                <Badge color="green">{stats.upcoming}</Badge>
              </div>
              
              {stats.overdue > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Überfällig</span>
                  <Badge color="red">{stats.overdue}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <FunnelIcon className="h-4 w-4" />
              Filter
            </h3>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showCampaigns}
                  onChange={(e) => setFilters({...filters, showCampaigns: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm">Kampagnen</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showApprovals}
                  onChange={(e) => setFilters({...filters, showApprovals: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm">Freigaben</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showTasks}
                  onChange={(e) => setFilters({...filters, showTasks: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm">Aufgaben</span>
              </label>
            </div>
          </div>

          {/* Legende */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3">Legende</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>Geplante Kampagne</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>Versendete Kampagne</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span>Ausstehende Freigabe</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Überfällig</span>
              </div>
            </div>
          </div>
        </div>

        {/* Kalender */}
        <div className="lg:col-span-3">
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
                
                return (
                  <div
                    key={index}
                    className={clsx(
                      "min-h-[100px] p-2 border-r border-b",
                      !day && "bg-gray-50",
                      isToday && "bg-blue-50"
                    )}
                  >
                    {day && (
                      <>
                        <div className={clsx(
                          "text-sm mb-1",
                          isToday ? "font-bold text-blue-600" : "text-gray-700"
                        )}>
                          {day}
                        </div>
                        
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => (
                            <EventCard key={event.id} event={event} />
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
        </div>
      </div>
    </div>
  );
}