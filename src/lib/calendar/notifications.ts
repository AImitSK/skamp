// src/lib/calendar/notifications.ts
import { prService } from '@/lib/firebase/pr-service';
import { PRCampaign } from '@/types/pr';

// Event Types
export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'campaign_scheduled' | 'campaign_sent' | 'approval_pending' | 'approval_overdue' | 'task';
  status?: 'pending' | 'completed' | 'overdue';
  campaignId?: string;
  clientName?: string;
  metadata?: {
    campaignTitle?: string;
    daysOverdue?: number;
    recipientCount?: number;
  };
}

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
          clientName: campaign.clientName,
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
            clientName: campaign.clientName,
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
        clientName: campaign.clientName,
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
          action: `/dashboard/pr/campaigns/${event.campaignId}`
        };
        
      case 'approval_overdue':
        return {
          ...baseNotification,
          title: 'Freigabe überfällig!',
          body: `${event.metadata?.campaignTitle || event.title} - ${event.metadata?.daysOverdue} Tage überfällig`,
          icon: '⚠️',
          priority: 'high' as const,
          action: '/dashboard/freigaben'
        };
        
      case 'approval_pending':
        return {
          ...baseNotification,
          title: 'Freigabe ausstehend',
          body: event.metadata?.campaignTitle || event.title,
          icon: '⏳',
          priority: 'normal' as const,
          action: `/dashboard/freigaben`
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
  const campaigns = await prService.getAll(userId);
  const events: CalendarEvent[] = [];
  
  campaigns.forEach((campaign: PRCampaign) => {
    // Versendete Kampagnen
    if (campaign.sentAt) {
      const sentDate = campaign.sentAt.toDate();
      if (sentDate >= startDate && sentDate <= endDate) {
        events.push({
          id: `campaign-sent-${campaign.id}`,
          title: `✅ ${campaign.title}`,
          date: sentDate,
          type: 'campaign_sent',
          campaignId: campaign.id,
          clientName: campaign.clientName,
          metadata: {
            campaignTitle: campaign.title,
            recipientCount: campaign.recipientCount
          }
        });
      }
    }
    
    // Geplante Kampagnen
    if (campaign.scheduledAt && campaign.status === 'scheduled') {
      const scheduledDate = campaign.scheduledAt.toDate();
      if (scheduledDate >= startDate && scheduledDate <= endDate) {
        events.push({
          id: `campaign-scheduled-${campaign.id}`,
          title: `📤 ${campaign.title}`,
          date: scheduledDate,
          type: 'campaign_scheduled',
          campaignId: campaign.id,
          clientName: campaign.clientName,
          metadata: {
            campaignTitle: campaign.title,
            recipientCount: campaign.recipientCount
          }
        });
      }
    }
  });
  
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
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
      clientName: campaign.clientName,
      metadata: {
        campaignTitle: campaign.title,
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
      clientName: campaign.clientName,
      metadata: {
        campaignTitle: campaign.title,
        recipientCount: campaign.recipientCount
      }
    };
  }
  
  return null;
};