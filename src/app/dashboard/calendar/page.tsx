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
  FunnelIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ReactDOM from 'react-dom';
import { getEventsForDateRange } from '@/lib/calendar/notifications';
import { CalendarEvent } from '@/types/calendar';
import { EventDetailsModal } from '@/components/calendar/EventDetailsModal';
import { ApprovalWidget } from '@/components/calendar/ApprovalWidget';
import { EventHoverCard } from '@/components/calendar/EventHoverCard';
import { prService } from '@/lib/firebase/pr-service';
import { Timestamp } from 'firebase/firestore';

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

export default function CalendarDashboard() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    showCampaigns: true,
    showApprovals: true,
    showTasks: true
  });

  // Test-Funktion zum Erstellen vielfältiger Kampagnen
  const createDiverseTestCampaigns = async () => {
    if (!user?.uid) {
      alert('Bitte einloggen!');
      return;
    }
    
    const userId = user.uid; // TypeScript-sichere Zuweisung
    
    try {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Test-Kampagnen Array mit allen erforderlichen Feldern
      const testCampaigns = [
        // Geplante Kampagne (in 3 Tagen)
        {
          title: 'Geplanter Newsletter - Produktupdate',
          content: 'Neues Feature Release Ankündigung',
          contentHtml: '<p>Neues Feature Release Ankündigung</p>',
          status: 'scheduled' as const,
          scheduledAt: Timestamp.fromDate(new Date(currentYear, currentMonth, today.getDate() + 3)),
          recipientCount: 250,
          clientName: 'TechStartup GmbH',
          clientId: 'client-tech-1',
          distributionListId: 'dist-1',
          distributionListName: 'Tech Journalisten',
          approvalRequired: false,
          userId: userId
        },
        
        // Geplante Kampagne (in 10 Tagen)
        {
          title: 'Monatlicher Newsletter',
          content: 'Regelmäßiger Update Newsletter',
          contentHtml: '<p>Regelmäßiger Update Newsletter</p>',
          status: 'scheduled' as const,
          scheduledAt: Timestamp.fromDate(new Date(currentYear, currentMonth, today.getDate() + 10)),
          recipientCount: 500,
          clientName: 'Marketing Pro AG',
          clientId: 'client-marketing-1',
          distributionListId: 'dist-2',
          distributionListName: 'Marketing Kontakte',
          approvalRequired: false,
          userId: userId
        },
        
        // Bereits versendete Kampagne (vor 5 Tagen)
        {
          title: 'Pressemitteilung Q4 Ergebnisse',
          content: 'Quartalszahlen veröffentlicht',
          contentHtml: '<p>Quartalszahlen veröffentlicht</p>',
          status: 'sent' as const,
          sentAt: Timestamp.fromDate(new Date(currentYear, currentMonth, today.getDate() - 5)),
          recipientCount: 150,
          clientName: 'Finance Corp',
          clientId: 'client-finance-1',
          distributionListId: 'dist-3',
          distributionListName: 'Finanz Presse',
          approvalRequired: false,
          userId: userId
        },
        
        // Bereits versendete Kampagne (vor 2 Tagen)
        {
          title: 'Event Einladung - Tech Summit 2024',
          content: 'Einladung zur Jahreskonferenz',
          contentHtml: '<p>Einladung zur Jahreskonferenz</p>',
          status: 'sent' as const,
          sentAt: Timestamp.fromDate(new Date(currentYear, currentMonth, today.getDate() - 2)),
          recipientCount: 300,
          clientName: 'Event Masters',
          clientId: 'client-event-1',
          distributionListId: 'dist-4',
          distributionListName: 'Event Teilnehmer',
          approvalRequired: false,
          userId: userId
        },
        
        // In Review (normale Freigabe)
        {
          title: 'Neue Partnerschaft Ankündigung',
          content: 'Strategische Allianz mit Global Player',
          contentHtml: '<p>Strategische Allianz mit Global Player</p>',
          status: 'in_review' as const,
          approvalData: {
            shareId: 'share-' + Date.now() + '-1',
            status: 'pending' as const,
            feedbackHistory: [{
              requestedAt: Timestamp.fromDate(new Date(currentYear, currentMonth, today.getDate() - 2)),
              author: userId,  // 'author' statt 'requestedBy'
              comment: 'Bitte um Freigabe'  // 'comment' statt 'feedbackText'
            }]
          },
          recipientCount: 400,
          clientName: 'Strategy Consulting',
          clientId: 'client-strategy-1',
          distributionListId: 'dist-5',
          distributionListName: 'Business Partner',
          approvalRequired: true,
          userId: userId
        },
        
        // In Review (überfällig - vor 10 Tagen angefragt)
        {
          title: 'Jahresbericht 2024',
          content: 'Zusammenfassung der Geschäftsentwicklung',
          contentHtml: '<p>Zusammenfassung der Geschäftsentwicklung</p>',
          status: 'in_review' as const,
          approvalData: {
            shareId: 'share-' + Date.now() + '-2',
            status: 'pending' as const,
            feedbackHistory: [{
              requestedAt: Timestamp.fromDate(new Date(currentYear, currentMonth, today.getDate() - 10)),
              author: userId,  // 'author' statt 'requestedBy'
              comment: 'Dringende Freigabe benötigt'  // 'comment' statt 'feedbackText'
            }]
          },
          recipientCount: 1000,
          clientName: 'Corporate Communications',
          clientId: 'client-corp-1',
          distributionListId: 'dist-6',
          distributionListName: 'Alle Stakeholder',
          approvalRequired: true,
          userId: userId
        },
        
        // Draft (heute erstellt)
        {
          title: 'Weihnachtskampagne 2024',
          content: 'Festliche Grüße und Angebote',
          contentHtml: '<p>Festliche Grüße und Angebote</p>',
          status: 'draft' as const,
          recipientCount: 0,
          clientName: 'Retail Solutions',
          clientId: 'client-retail-1',
          distributionListId: 'dist-7',
          distributionListName: 'Retail Partner',
          approvalRequired: false,
          userId: userId
        },
        
        // Geplante Kampagne (Ende des Monats)
        {
          title: 'Monatsabschluss Newsletter',
          content: 'Highlights und Zusammenfassung',
          contentHtml: '<p>Highlights und Zusammenfassung</p>',
          status: 'scheduled' as const,
          scheduledAt: Timestamp.fromDate(new Date(currentYear, currentMonth + 1, 0)), // Letzter Tag des Monats
          recipientCount: 350,
          clientName: 'Newsletter Service',
          clientId: 'client-news-1',
          distributionListId: 'dist-8',
          distributionListName: 'Newsletter Abonnenten',
          approvalRequired: false,
          userId: userId
        }
      ];
      
      // Erstelle alle Test-Kampagnen
      for (const campaignData of testCampaigns) {
        // Entferne createdAt und updatedAt, da diese automatisch gesetzt werden
        const { ...campaignToCreate } = campaignData;
        
        await prService.create(campaignToCreate);
        console.log('✅ Erstellt:', campaignToCreate.title);
      }
      
      alert(`${testCampaigns.length} Test-Kampagnen erfolgreich erstellt! Seite wird neu geladen...`);
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Test-Kampagnen:', error);
      alert('Fehler beim Erstellen der Test-Kampagnen. Siehe Konsole für Details.');
    }
  };

  // Lade echte Events aus Firebase
  useEffect(() => {
    const loadEvents = async () => {
      console.log('🔍 Debug: User ID:', user?.uid);
      
      if (!user?.uid) {
        console.log('❌ Kein User eingeloggt');
        return;
      }
      
      setLoading(true);
      try {
        // Hole Events für den aktuellen Monat
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        console.log('📅 Debug: Zeitraum:', {
          start: startOfMonth.toLocaleDateString('de-DE'),
          end: endOfMonth.toLocaleDateString('de-DE'),
          currentMonth: currentDate.getMonth(),
          currentYear: currentDate.getFullYear()
        });
        
        const realEvents = await getEventsForDateRange(
          user.uid, // user.uid ist hier sicher nicht undefined wegen der Prüfung oben
          startOfMonth,
          endOfMonth
        );
        
        console.log('📊 Debug: Gefundene Events:', realEvents.length);
        console.log('📝 Debug: Events Detail:', realEvents);
        
        // TEMPORÄR: Teste mit aktuellen Mock-Daten für diesen Monat
        const today = new Date();
        const mockEvents: CalendarEvent[] = [
          {
            id: '1',
            title: 'Test: Newsletter versenden',
            date: new Date(today.getFullYear(), today.getMonth(), 15),
            type: 'campaign_scheduled',
            campaignId: '123',
            metadata: {
              clientName: 'TechCorp GmbH'
            }
          },
          {
            id: '2',
            title: 'Test: Kampagne versendet',
            date: new Date(today.getFullYear(), today.getMonth(), 20),
            type: 'campaign_sent',
            campaignId: '124',
            metadata: {
              clientName: 'StartUp AG'
            }
          },
          {
            id: '3',
            title: 'Test: Freigabe überfällig',
            date: new Date(today.getFullYear(), today.getMonth(), 8),
            type: 'approval_overdue',
            status: 'overdue',
            campaignId: '125',
            metadata: {
              clientName: 'Media Corp',
              daysOverdue: 5
            }
          }
        ];
        
        // Verwende Mock-Daten wenn keine echten Events gefunden wurden
        if (realEvents.length === 0) {
          console.log('⚠️ Keine echten Events gefunden, verwende Mock-Daten');
          setEvents(mockEvents);
        } else {
          setEvents(realEvents);
        }
        
      } catch (error) {
        console.error('❌ Fehler beim Laden der Events:', error);
        // Bei Fehler Mock-Daten verwenden
        const today = new Date();
        const fallbackEvents: CalendarEvent[] = [
          {
            id: 'fallback-1',
            title: 'Fallback: Test Event',
            date: new Date(today.getFullYear(), today.getMonth(), 10),
            type: 'campaign_scheduled',
            campaignId: 'test-123',
            metadata: {
              clientName: 'Test Client'
            }
          }
        ];
        setEvents(fallbackEvents);
      } finally {
        setLoading(false);
      }
    };
    
    loadEvents();
  }, [currentDate, user?.uid]);

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
      
      return true;
    });
  }, [events, filters]);

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
      {/* Header mit Test-Buttons */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <Heading>Kalender</Heading>
            <Text className="mt-1">
              Behalte alle Kampagnen, Freigaben und Aufgaben im Überblick
            </Text>
          </div>
          
          {/* Test-Buttons nur in Development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex gap-2">
              <Button 
                onClick={createDiverseTestCampaigns}
                className="bg-orange-500 hover:bg-orange-600"
              >
                🧪 Vielfältige Test-Kampagnen
              </Button>
              
              {/* Optional: Lösch-Button für Tests */}
              <Button 
                onClick={async () => {
                  if (!user?.uid) {
                    alert('Bitte einloggen!');
                    return;
                  }
                  const userId = user.uid;
                  if (confirm('Alle Kampagnen löschen?')) {
                    try {
                      const campaigns = await prService.getAll(userId);
                      for (const c of campaigns) {
                        if (c.id) { // Prüfe ob ID existiert
                          await prService.delete(c.id);
                        }
                      }
                      window.location.reload();
                    } catch (error) {
                      console.error('Fehler beim Löschen:', error);
                      alert('Fehler beim Löschen der Kampagnen');
                    }
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                🗑️ Alle löschen
              </Button>
            </div>
          )}
        </div>
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
                const isWeekend = index % 7 === 5 || index % 7 === 6;
                
                return (
                  <div
                    key={index}
                    className={clsx(
                      "min-h-[100px] p-2 border-r border-b",
                      !day && "bg-gray-50",
                      isToday && "bg-blue-50",
                      isWeekend && day && !isToday && "bg-gray-50/50"
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
    </div>
  );
}