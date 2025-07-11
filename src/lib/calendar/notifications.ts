// src/lib/calendar/notifications.ts
import { prService } from '@/lib/firebase/pr-service';
import { PRCampaign } from '@/types/pr';
import { CalendarEvent } from '@/types/calendar';
import { taskService } from '@/lib/firebase/task-service';
import { Task } from '@/types/tasks';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client-init';


export interface Notification {
  id: string;
  title: string;
  body: string;
  icon: string;
  priority?: 'low' | 'normal' | 'high';
  action?: string;
  timestamp: Date;
}

// Hilfsfunktion: Hole anstehende Events
async function getUpcomingEvents(userId: string, hoursAhead: number = 24): Promise<CalendarEvent[]> {
  const now = new Date();
  const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
  
  // Hole alle Kampagnen
  const campaigns = await prService.getAll(userId);
  const events: CalendarEvent[] = [];
  
  // Konvertiere Kampagnen zu Events
  campaigns.forEach((campaign: PRCampaign) => {
    // Geplante Kampagnen
    if (campaign.scheduledAt && campaign.status === 'scheduled') {
      const scheduledDate = campaign.scheduledAt.toDate();
      if (scheduledDate >= now && scheduledDate <= endTime) {
        events.push({
          id: `campaign-scheduled-${campaign.id}`,
          title: `Kampagne: ${campaign.title}`,
          date: scheduledDate,
          type: 'campaign_scheduled',
          campaignId: campaign.id,
          clientId: campaign.clientId,
          metadata: {
            campaignTitle: campaign.title,
            recipientCount: campaign.recipientCount
          }
        });
      }
    }
    
    // Überfällige Freigaben
    if (campaign.status === 'in_review' && campaign.approvalData) {
      const requestDate = campaign.approvalData.feedbackHistory?.[0]?.requestedAt?.toDate();
      if (requestDate) {
        const daysSinceRequest = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceRequest > 7) { // Nach 7 Tagen als überfällig markieren
          events.push({
            id: `approval-overdue-${campaign.id}`,
            title: `Freigabe überfällig: ${campaign.title}`,
            date: now,
            type: 'approval_overdue',
            status: 'overdue',
            campaignId: campaign.id,
            clientId: campaign.clientId,
            metadata: {
              campaignTitle: campaign.title,
              daysOverdue: daysSinceRequest - 7
            }
          });
        }
      }
    }
    
    // Ausstehende Freigaben
    if (campaign.status === 'in_review') {
      events.push({
        id: `approval-pending-${campaign.id}`,
        title: `Warten auf Freigabe: ${campaign.title}`,
        date: campaign.updatedAt?.toDate() || now,
        type: 'approval_pending',
        status: 'pending',
        campaignId: campaign.id,
        clientId: campaign.clientId,
        metadata: {
          campaignTitle: campaign.title
        }
      });
    }
  });
  
  return events;
}

// Hauptfunktion: Prüfe anstehende Events und erstelle Notifications
export const checkUpcomingEvents = async (userId: string): Promise<Notification[]> => {
  const events = await getUpcomingEvents(userId, 24); // Nächste 24h
  
  const notifications: Notification[] = events.map((event: CalendarEvent) => {
    const baseNotification = {
      id: `notification-${event.id}`,
      timestamp: new Date()
    };
    
    switch(event.type) {
      case 'campaign_scheduled':
        return {
          ...baseNotification,
          title: 'Kampagne wird morgen versendet',
          body: event.metadata?.campaignTitle || event.title,
          icon: '📤',
          priority: 'normal' as const,
          action: `/dashboard/pr-tools/campaigns/campaigns/${event.campaignId}`
        };
        
      case 'approval_overdue':
        return {
          ...baseNotification,
          title: 'Freigabe überfällig!',
          body: `${event.metadata?.campaignTitle || event.title} - ${event.metadata?.daysOverdue} Tage überfällig`,
          icon: '⚠️',
          priority: 'high' as const,
          action: '/dashboard/pr-tools/approvals'
        };
        
      case 'approval_pending':
        return {
          ...baseNotification,
          title: 'Freigabe ausstehend',
          body: event.metadata?.campaignTitle || event.title,
          icon: '⏳',
          priority: 'normal' as const,
          action: `/dashboard/pr-tools/approvals`
        };
        
      default:
        return {
          ...baseNotification,
          title: 'Kalendereintrag',
          body: event.title,
          icon: '📅',
          priority: 'low' as const
        };
    }
  });
  
  return notifications.filter(Boolean);
};

// Hilfsfunktion: Hole Events für einen bestimmten Zeitraum
export const getEventsForDateRange = async (
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<CalendarEvent[]> => {
  console.log('🔍 getEventsForDateRange Debug:', {
    userId,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  });
  
  const campaigns = await prService.getAll(userId);
  console.log('📊 Gefundene Kampagnen:', campaigns.length);
  
  const events: CalendarEvent[] = [];
  const now = new Date();
  
  // Lade Tasks
  let tasks: Task[] = [];
  try {
    console.log('🔄 Versuche Tasks zu laden...');
    tasks = await taskService.getByDateRange(userId, startDate, endDate);
    console.log('📊 Gefundene Tasks:', tasks.length);
    console.log('📝 Tasks Detail:', tasks);
  } catch (error) {
    console.error('⚠️ Fehler beim Laden der Tasks:', error);
  }
  
  // NEU: Lade Kalender-Events aus der calendar_events Collection
  try {
    console.log('📅 Lade Kalender-Events...');
    
    // Query für calendar_events im Zeitraum
    const calendarEventsRef = collection(db, 'calendar_events');
    const q = query(
      calendarEventsRef,
      where('userId', '==', userId),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('startTime', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    console.log('📅 Gefundene Kalender-Events:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📅 Kalender-Event:', data);
      
      // Konvertiere zu CalendarEvent
      if (data.type === 'email_campaign' && data.metadata) {
        events.push({
          id: `calendar-${doc.id}`,
          title: data.title,
          date: data.startTime.toDate(),
          endDate: data.endTime?.toDate(),
          type: 'campaign_scheduled',
          campaignId: data.metadata.campaignId,
          metadata: {
            campaignTitle: data.title.replace('📧 E-Mail-Versand: ', ''),
            recipientCount: data.metadata.recipientCount,
            scheduledEmailId: data.metadata.scheduledEmailId,
            calendarEventId: doc.id
          },
          color: '#005fab',
          priority: 'high'
        });
      }
    });
  } catch (error) {
    console.error('⚠️ Fehler beim Laden der Kalender-Events:', error);
  }
  
  // NEU: Lade auch scheduled_emails für zusätzliche Informationen
  try {
    console.log('📧 Lade geplante E-Mails...');
    
    const scheduledEmailsRef = collection(db, 'scheduled_emails');
    const q = query(
      scheduledEmailsRef,
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      where('scheduledAt', '>=', Timestamp.fromDate(startDate)),
      where('scheduledAt', '<=', Timestamp.fromDate(endDate))
    );
    
    const querySnapshot = await getDocs(q);
    console.log('📧 Gefundene geplante E-Mails:', querySnapshot.size);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Prüfe ob schon ein Event aus calendar_events existiert
      const existingEvent = events.find(e => 
        e.metadata?.scheduledEmailId === doc.id
      );
      
      if (!existingEvent) {
        // Füge Event hinzu falls noch nicht vorhanden
        events.push({
          id: `scheduled-email-${doc.id}`,
          title: `📧 ${data.campaignTitle}`,
          date: data.scheduledAt.toDate(),
          type: 'campaign_scheduled',
          campaignId: data.campaignId,
          metadata: {
            campaignTitle: data.campaignTitle,
            recipientCount: data.recipients.totalCount,
            scheduledEmailId: doc.id,
            jobId: data.jobId
          },
          color: '#005fab',
          priority: 'high'
        });
      }
    });
  } catch (error) {
    console.error('⚠️ Fehler beim Laden der geplanten E-Mails:', error);
  }
  
  campaigns.forEach((campaign: PRCampaign) => {
    console.log('🔎 Prüfe Kampagne:', {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      scheduledAt: campaign.scheduledAt?.toDate?.(),
      sentAt: campaign.sentAt?.toDate?.()
    });
    
    // Versendete Kampagnen
    if (campaign.sentAt) {
      const sentDate = campaign.sentAt.toDate();
      console.log('📤 Versendete Kampagne gefunden:', {
        title: campaign.title,
        sentDate: sentDate.toISOString(),
        inRange: sentDate >= startDate && sentDate <= endDate
      });
      
      if (sentDate >= startDate && sentDate <= endDate) {
        events.push({
          id: `campaign-sent-${campaign.id}`,
          title: `✅ ${campaign.title}`,
          date: sentDate,
          type: 'campaign_sent',
          campaignId: campaign.id,
          clientId: campaign.clientId,
          metadata: {
            campaignTitle: campaign.title,
            clientName: campaign.clientName,
            recipientCount: campaign.recipientCount
          }
        });
      }
    }
    
    // Nur alte geplante Kampagnen (vor der neuen Implementierung)
    if (campaign.scheduledAt && campaign.status === 'scheduled') {
      const scheduledDate = campaign.scheduledAt.toDate();
      console.log('📅 Geplante Kampagne gefunden:', {
        title: campaign.title,
        scheduledDate: scheduledDate.toISOString(),
        inRange: scheduledDate >= startDate && scheduledDate <= endDate
      });
      
      // Prüfe ob schon ein Event aus scheduled_emails existiert
      const isDuplicate = events.some(e => 
        e.campaignId === campaign.id && e.type === 'campaign_scheduled'
      );
      
      if (!isDuplicate && scheduledDate >= startDate && scheduledDate <= endDate) {
        events.push({
          id: `campaign-scheduled-${campaign.id}`,
          title: `📤 ${campaign.title}`,
          date: scheduledDate,
          type: 'campaign_scheduled',
          campaignId: campaign.id,
          clientId: campaign.clientId,
          metadata: {
            campaignTitle: campaign.title,
            clientName: campaign.clientName,
            recipientCount: campaign.recipientCount
          }
        });
      }
    }
    
    // Freigaben (immer im aktuellen Monat anzeigen wenn in Review)
    if (campaign.status === 'in_review') {
      console.log('⏳ In Review Kampagne gefunden:', {
        title: campaign.title,
        updatedAt: campaign.updatedAt?.toDate?.()
      });
      
      const reviewDate = campaign.updatedAt?.toDate() || now;
      
      // Zeige In-Review Kampagnen im aktuellen Zeitraum
      if (reviewDate >= startDate && reviewDate <= endDate || !campaign.updatedAt) {
        events.push({
          id: `approval-pending-${campaign.id}`,
          title: `⏳ Freigabe: ${campaign.title}`,
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate()), // Heute
          type: 'approval_pending',
          status: 'pending',
          campaignId: campaign.id,
          clientId: campaign.clientId,
          metadata: {
            campaignTitle: campaign.title,
            clientName: campaign.clientName
          }
        });
      }
      
      // Prüfe auf überfällige Freigaben
      if (campaign.approvalData?.feedbackHistory?.[0]?.requestedAt) {
        const requestDate = campaign.approvalData.feedbackHistory[0].requestedAt.toDate();
        const daysSinceRequest = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceRequest > 7) {
          events.push({
            id: `approval-overdue-${campaign.id}`,
            title: `⚠️ Überfällig: ${campaign.title}`,
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate()), // Heute
            type: 'approval_overdue',
            status: 'overdue',
            priority: 'urgent',
            campaignId: campaign.id,
            clientId: campaign.clientId,
            metadata: {
              campaignTitle: campaign.title,
              clientName: campaign.clientName,
              daysOverdue: daysSinceRequest - 7
            }
          });
        }
      }
    }
    
    // Draft Kampagnen als "Geplant" anzeigen (optional)
    if (campaign.status === 'draft' && campaign.createdAt) {
      const createdDate = campaign.createdAt.toDate();
      // Zeige Drafts, die in diesem Monat erstellt wurden
      if (createdDate >= startDate && createdDate <= endDate) {
        events.push({
          id: `campaign-draft-${campaign.id}`,
          title: `📝 Entwurf: ${campaign.title}`,
          date: createdDate,
          type: 'task', // Verwende task type für Drafts
          campaignId: campaign.id,
          clientId: campaign.clientId,
          metadata: {
            campaignTitle: campaign.title,
            clientName: campaign.clientName
          }
        });
      }
    }
  });
  
  // Verarbeite Tasks
  tasks.forEach((task: Task) => {
    if (task.dueDate) {
      const dueDate = task.dueDate.toDate();
      
      // Priorität in Event-Priorität umwandeln
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
      if (task.priority === 'urgent') priority = 'urgent';
      else if (task.priority === 'high') priority = 'high';
      else if (task.priority === 'low') priority = 'low';
      
      // Finde den Kundennamen falls verknüpft
      let clientName: string | undefined;
      if (task.linkedClientId) {
        const linkedCampaign = campaigns.find(c => c.clientId === task.linkedClientId);
        clientName = linkedCampaign?.clientName;
      }
      
      events.push({
        id: `task-${task.id}`,
        title: `📋 ${task.title}`,
        date: dueDate,
        type: 'task',
        status: task.status === 'completed' ? 'completed' : 'pending',
        priority: priority,
        taskId: task.id,
        clientId: task.linkedClientId,
        campaignId: task.linkedCampaignId,
        metadata: {
          description: task.description,
          clientName: clientName,
          // NEU: Zeitinformationen hinzufügen
          isAllDay: task.isAllDay !== false, // Default ist true
          startTime: task.startTime,
          endTime: task.endTime,
          duration: task.duration
        }
      });
      
      console.log(`✅ Task als Event hinzugefügt: ${task.title}`);
    }
  });
  
  // Entferne Duplikate basierend auf ID
  const uniqueEvents = events.filter((event, index, self) =>
    index === self.findIndex((e) => e.id === event.id)
  );
  
  console.log('✅ Finale Events:', uniqueEvents.length, uniqueEvents);
  return uniqueEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
};

// Hilfsfunktion: Erstelle Event aus Kampagne
export const createEventFromCampaign = (campaign: PRCampaign): CalendarEvent | null => {
  if (campaign.scheduledAt && campaign.status === 'scheduled') {
    return {
      id: `campaign-${campaign.id}`,
      title: campaign.title,
      date: campaign.scheduledAt.toDate(),
      type: 'campaign_scheduled',
      campaignId: campaign.id,
      clientId: campaign.clientId,
      metadata: {
        campaignTitle: campaign.title,
        clientName: campaign.clientName,
        recipientCount: campaign.recipientCount
      }
    };
  }
  
  if (campaign.sentAt) {
    return {
      id: `campaign-${campaign.id}`,
      title: campaign.title,
      date: campaign.sentAt.toDate(),
      type: 'campaign_sent',
      campaignId: campaign.id,
      clientId: campaign.clientId,
      metadata: {
        campaignTitle: campaign.title,
        clientName: campaign.clientName,
        recipientCount: campaign.recipientCount
      }
    };
  }
  
  return null;
};