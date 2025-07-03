// src/types/calendar.ts

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date; // Für mehrtägige Events
  allDay?: boolean;
  type: 'campaign_scheduled' | 'campaign_sent' | 'approval_pending' | 
        'approval_overdue' | 'task' | 'deadline' | 'follow_up';
  status?: 'pending' | 'completed' | 'overdue' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Verknüpfungen
  campaignId?: string;
  taskId?: string;
  clientId?: string;
  
  // Metadaten
  metadata?: {
    campaignTitle?: string;
    clientName?: string;
    recipientCount?: number;
    daysOverdue?: number;
    assignedTo?: string[];
    description?: string;
    location?: string;
    reminderMinutesBefore?: number;
    
    // NEU: Zeit-spezifische Felder für Tasks
    isAllDay?: boolean;
    startTime?: string; // Format: "HH:MM"
    endTime?: string;   // Format: "HH:MM"
    duration?: number;  // Dauer in Minuten (alternativ zu endTime)
  };
  
  // Styling
  color?: string;
  icon?: string;
  className?: string;
  
  // Recurring Events (für später)
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[]; // 0 = Sonntag, 1 = Montag, etc.
  };
}

export interface CalendarFilter {
  showCampaigns: boolean;
  showApprovals: boolean;
  showTasks: boolean;
  clientId?: string | null;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda' | 'year';
  date: Date;
}

export interface CalendarNotification {
  id: string;
  eventId: string;
  userId: string;
  title: string;
  body: string;
  icon?: string;
  priority: 'low' | 'normal' | 'high';
  action?: string;
  scheduledFor: Date;
  sent: boolean;
  sentAt?: Date;
  read: boolean;
  readAt?: Date;
}

// Event Factory Functions
export const EventFactories = {
  campaignScheduled: (campaign: any): CalendarEvent => ({
    id: `campaign-scheduled-${campaign.id}`,
    title: `📤 ${campaign.title}`,
    date: campaign.scheduledAt.toDate(),
    type: 'campaign_scheduled',
    campaignId: campaign.id,
    metadata: {
      campaignTitle: campaign.title,
      clientName: campaign.clientName,
      recipientCount: campaign.recipientCount
    },
    color: '#005fab',
    priority: 'high'
  }),
  
  campaignSent: (campaign: any): CalendarEvent => ({
    id: `campaign-sent-${campaign.id}`,
    title: `✅ ${campaign.title}`,
    date: campaign.sentAt.toDate(),
    type: 'campaign_sent',
    campaignId: campaign.id,
    metadata: {
      campaignTitle: campaign.title,
      clientName: campaign.clientName,
      recipientCount: campaign.recipientCount
    },
    color: '#10b981',
    status: 'completed'
  }),
  
  approvalPending: (campaign: any): CalendarEvent => ({
    id: `approval-pending-${campaign.id}`,
    title: `⏳ Freigabe: ${campaign.title}`,
    date: new Date(campaign.updatedAt?.toDate() || new Date()),
    type: 'approval_pending',
    campaignId: campaign.id,
    metadata: {
      campaignTitle: campaign.title,
      clientName: campaign.clientName
    },
    color: '#f59e0b',
    priority: 'medium'
  }),
  
  approvalOverdue: (campaign: any, daysOverdue: number): CalendarEvent => ({
    id: `approval-overdue-${campaign.id}`,
    title: `⚠️ Überfällig: ${campaign.title}`,
    date: new Date(),
    type: 'approval_overdue',
    status: 'overdue',
    priority: 'urgent',
    campaignId: campaign.id,
    metadata: {
      campaignTitle: campaign.title,
      clientName: campaign.clientName,
      daysOverdue
    },
    color: '#dc2626'
  }),
  
  // NEU: Task Factory mit Zeitunterstützung
  task: (task: any): CalendarEvent => ({
    id: `task-${task.id}`,
    title: `📋 ${task.title}`,
    date: task.dueDate?.toDate() || new Date(),
    type: 'task',
    taskId: task.id,
    status: task.status === 'completed' ? 'completed' : 'pending',
    priority: task.priority,
    clientId: task.linkedClientId,
    campaignId: task.linkedCampaignId,
    metadata: {
      description: task.description,
      clientName: task.clientName,
      isAllDay: task.isAllDay !== false, // Default ist true
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.duration
    },
    color: '#8b5cf6',
    allDay: task.isAllDay !== false
  })
};

// Farb-Schema für Event-Typen
export const EVENT_COLORS = {
  campaign_scheduled: '#005fab', // Blau
  campaign_sent: '#10b981',      // Grün
  approval_pending: '#f59e0b',   // Gelb/Orange
  approval_overdue: '#dc2626',   // Rot
  task: '#8b5cf6',              // Lila
  deadline: '#ef4444',          // Rot
  follow_up: '#06b6d4'          // Cyan
} as const;

// Icon-Mapping für Event-Typen
export const EVENT_ICONS = {
  campaign_scheduled: '📤',
  campaign_sent: '✅',
  approval_pending: '⏳',
  approval_overdue: '⚠️',
  task: '📋',
  deadline: '🎯',
  follow_up: '📞'
} as const;