// src/types/__tests__/calendar.test.ts
import { 
  CalendarEvent,
  EventFactories,
  EVENT_COLORS,
  EVENT_ICONS,
  isScheduledEmailEvent,
  isLegacyScheduledCampaign
} from '../calendar';
import { Timestamp } from 'firebase/firestore';

describe('Calendar Types', () => {
  describe('EventFactories', () => {
    describe('campaignScheduled', () => {
      it('sollte Campaign Event korrekt erstellen', () => {
        const mockCampaign = {
          id: 'campaign-123',
          title: 'Test Kampagne',
          scheduledAt: {
            toDate: () => new Date('2024-12-25T10:00:00Z')
          },
          clientName: 'Test Client',
          recipientCount: 150
        };

        const event = EventFactories.campaignScheduled(mockCampaign);

        expect(event).toEqual({
          id: 'campaign-scheduled-campaign-123',
          title: '📤 Test Kampagne',
          date: new Date('2024-12-25T10:00:00Z'),
          type: 'campaign_scheduled',
          campaignId: 'campaign-123',
          metadata: {
            campaignTitle: 'Test Kampagne',
            clientName: 'Test Client',
            recipientCount: 150
          },
          color: '#005fab',
          priority: 'high'
        });
      });
    });

    describe('emailScheduled', () => {
      it('sollte geplante E-Mail Event korrekt erstellen', () => {
        const mockScheduledEmail = {
          id: 'email-123',
          jobId: 'job-456',
          campaignTitle: 'E-Mail Kampagne',
          campaignId: 'campaign-789',
          scheduledAt: new Date('2024-12-25T14:30:00Z'),
          recipients: { totalCount: 200 },
          calendarEventId: 'cal-event-123',
          senderInfo: { name: 'Max Mustermann' }
        };

        const event = EventFactories.emailScheduled(mockScheduledEmail);

        expect(event).toEqual({
          id: 'email-scheduled-email-123',
          title: '📧 E-Mail Kampagne',
          date: new Date('2024-12-25T14:30:00Z'),
          type: 'campaign_scheduled',
          campaignId: 'campaign-789',
          metadata: {
            campaignTitle: 'E-Mail Kampagne',
            recipientCount: 200,
            scheduledEmailId: 'email-123',
            jobId: 'job-456',
            calendarEventId: 'cal-event-123',
            senderName: 'Max Mustermann'
          },
          color: '#005fab',
          priority: 'high'
        });
      });

      it('sollte mit jobId als ID funktionieren, wenn id fehlt', () => {
        const mockScheduledEmail = {
          jobId: 'job-456',
          campaignTitle: 'E-Mail Kampagne',
          scheduledAt: new Date('2024-12-25T14:30:00Z')
        };

        const event = EventFactories.emailScheduled(mockScheduledEmail);

        expect(event.id).toBe('email-scheduled-job-456');
      });

      it('sollte mit Timestamp arbeiten', () => {
        const mockScheduledEmail = {
          id: 'email-123',
          campaignTitle: 'E-Mail Kampagne',
          scheduledAt: {
            toDate: () => new Date('2024-12-25T14:30:00Z')
          }
        };

        const event = EventFactories.emailScheduled(mockScheduledEmail);

        expect(event.date).toEqual(new Date('2024-12-25T14:30:00Z'));
      });
    });

    describe('campaignSent', () => {
      it('sollte versendete Kampagne Event korrekt erstellen', () => {
        const mockCampaign = {
          id: 'campaign-123',
          title: 'Versendete Kampagne',
          sentAt: {
            toDate: () => new Date('2024-12-25T12:00:00Z')
          },
          clientName: 'Test Client',
          recipientCount: 100
        };

        const event = EventFactories.campaignSent(mockCampaign);

        expect(event).toEqual({
          id: 'campaign-sent-campaign-123',
          title: '✅ Versendete Kampagne',
          date: new Date('2024-12-25T12:00:00Z'),
          type: 'campaign_sent',
          campaignId: 'campaign-123',
          metadata: {
            campaignTitle: 'Versendete Kampagne',
            clientName: 'Test Client',
            recipientCount: 100
          },
          color: '#10b981',
          status: 'completed'
        });
      });
    });

    describe('approvalPending', () => {
      it('sollte ausstehende Freigabe Event korrekt erstellen', () => {
        const mockCampaign = {
          id: 'campaign-123',
          title: 'Kampagne zur Freigabe',
          updatedAt: {
            toDate: () => new Date('2024-12-20T08:00:00Z')
          },
          clientName: 'Test Client'
        };

        const event = EventFactories.approvalPending(mockCampaign);

        expect(event).toEqual({
          id: 'approval-pending-campaign-123',
          title: '⏳ Freigabe: Kampagne zur Freigabe',
          date: new Date('2024-12-20T08:00:00Z'),
          type: 'approval_pending',
          campaignId: 'campaign-123',
          metadata: {
            campaignTitle: 'Kampagne zur Freigabe',
            clientName: 'Test Client'
          },
          color: '#f59e0b',
          priority: 'medium'
        });
      });
    });

    describe('approvalOverdue', () => {
      it('sollte überfällige Freigabe Event korrekt erstellen', () => {
        const mockCampaign = {
          id: 'campaign-123',
          title: 'Überfällige Kampagne',
          clientName: 'Test Client'
        };

        const event = EventFactories.approvalOverdue(mockCampaign, 3);

        expect(event).toEqual({
          id: 'approval-overdue-campaign-123',
          title: '⚠️ Überfällig: Überfällige Kampagne',
          date: expect.any(Date),
          type: 'approval_overdue',
          status: 'overdue',
          priority: 'urgent',
          campaignId: 'campaign-123',
          metadata: {
            campaignTitle: 'Überfällige Kampagne',
            clientName: 'Test Client',
            daysOverdue: 3
          },
          color: '#dc2626'
        });
      });
    });

    describe('task', () => {
      it('sollte Task Event korrekt erstellen', () => {
        const mockTask = {
          id: 'task-123',
          title: 'Test Aufgabe',
          description: 'Beschreibung der Aufgabe',
          status: 'pending',
          priority: 'high',
          dueDate: {
            toDate: () => new Date('2024-12-25T16:00:00Z')
          },
          linkedClientId: 'client-123',
          linkedCampaignId: 'campaign-456',
          clientName: 'Test Client',
          isAllDay: false,
          startTime: '09:00',
          endTime: '10:00',
          duration: 60
        };

        const event = EventFactories.task(mockTask);

        expect(event).toEqual({
          id: 'task-task-123',
          title: '📋 Test Aufgabe',
          date: new Date('2024-12-25T16:00:00Z'),
          type: 'task',
          taskId: 'task-123',
          status: 'pending',
          priority: 'high',
          clientId: 'client-123',
          campaignId: 'campaign-456',
          metadata: {
            description: 'Beschreibung der Aufgabe',
            clientName: 'Test Client',
            isAllDay: false,
            startTime: '09:00',
            endTime: '10:00',
            duration: 60
          },
          color: '#8b5cf6',
          allDay: false
        });
      });

      it('sollte ganztägige Task als Standard behandeln', () => {
        const mockTask = {
          id: 'task-123',
          title: 'Ganztägige Aufgabe',
          status: 'pending',
          priority: 'medium',
          dueDate: {
            toDate: () => new Date('2024-12-25')
          }
        };

        const event = EventFactories.task(mockTask);

        expect(event.allDay).toBe(true);
        expect(event.metadata?.isAllDay).toBe(true);
      });

      it('sollte erledigte Task korrekt markieren', () => {
        const mockTask = {
          id: 'task-123',
          title: 'Erledigte Aufgabe',
          status: 'completed',
          priority: 'low',
          dueDate: {
            toDate: () => new Date('2024-12-25')
          }
        };

        const event = EventFactories.task(mockTask);

        expect(event.status).toBe('completed');
      });
    });
  });

  describe('EVENT_COLORS', () => {
    it('sollte alle Event-Typen definiert haben', () => {
      expect(EVENT_COLORS.campaign_scheduled).toBe('#005fab');
      expect(EVENT_COLORS.campaign_sent).toBe('#10b981');
      expect(EVENT_COLORS.approval_pending).toBe('#f59e0b');
      expect(EVENT_COLORS.approval_overdue).toBe('#dc2626');
      expect(EVENT_COLORS.task).toBe('#8b5cf6');
      expect(EVENT_COLORS.deadline).toBe('#ef4444');
      expect(EVENT_COLORS.follow_up).toBe('#06b6d4');
    });
  });

  describe('EVENT_ICONS', () => {
    it('sollte alle Event-Typen definiert haben', () => {
      expect(EVENT_ICONS.campaign_scheduled).toBe('📤');
      expect(EVENT_ICONS.campaign_sent).toBe('✅');
      expect(EVENT_ICONS.approval_pending).toBe('⏳');
      expect(EVENT_ICONS.approval_overdue).toBe('⚠️');
      expect(EVENT_ICONS.task).toBe('📋');
      expect(EVENT_ICONS.deadline).toBe('🎯');
      expect(EVENT_ICONS.follow_up).toBe('📞');
    });
  });

  describe('isScheduledEmailEvent', () => {
    it('sollte true zurückgeben für Events mit scheduledEmailId', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        title: 'Test Event',
        date: new Date(),
        type: 'campaign_scheduled',
        metadata: {
          scheduledEmailId: 'email-123'
        }
      };

      expect(isScheduledEmailEvent(event)).toBe(true);
    });

    it('sollte true zurückgeben für Events mit jobId', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        title: 'Test Event',
        date: new Date(),
        type: 'campaign_scheduled',
        metadata: {
          jobId: 'job-456'
        }
      };

      expect(isScheduledEmailEvent(event)).toBe(true);
    });

    it('sollte false zurückgeben für andere Event-Typen', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        title: 'Test Event',
        date: new Date(),
        type: 'task'
      };

      expect(isScheduledEmailEvent(event)).toBe(false);
    });

    it('sollte false zurückgeben für campaign_scheduled ohne E-Mail-Metadaten', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        title: 'Test Event',
        date: new Date(),
        type: 'campaign_scheduled',
        metadata: {
          campaignTitle: 'Some Campaign'
        }
      };

      expect(isScheduledEmailEvent(event)).toBe(false);
    });
  });

  describe('isLegacyScheduledCampaign', () => {
    it('sollte true zurückgeben für alte campaign_scheduled Events', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        title: 'Test Event',
        date: new Date(),
        type: 'campaign_scheduled',
        metadata: {
          campaignTitle: 'Legacy Campaign'
        }
      };

      expect(isLegacyScheduledCampaign(event)).toBe(true);
    });

    it('sollte false zurückgeben für neue E-Mail-scheduled Events', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        title: 'Test Event',
        date: new Date(),
        type: 'campaign_scheduled',
        metadata: {
          scheduledEmailId: 'email-123'
        }
      };

      expect(isLegacyScheduledCampaign(event)).toBe(false);
    });

    it('sollte false zurückgeben für andere Event-Typen', () => {
      const event: CalendarEvent = {
        id: 'event-1',
        title: 'Test Event',
        date: new Date(),
        type: 'task'
      };

      expect(isLegacyScheduledCampaign(event)).toBe(false);
    });
  });

  describe('CalendarEvent Interface', () => {
    it('sollte ein vollständiges CalendarEvent erstellen können', () => {
      const event: CalendarEvent = {
        id: 'event-123',
        title: 'Test Event',
        date: new Date('2024-12-25T10:00:00Z'),
        endDate: new Date('2024-12-25T11:00:00Z'),
        allDay: false,
        type: 'task',
        status: 'pending',
        priority: 'high',
        campaignId: 'campaign-123',
        taskId: 'task-456',
        clientId: 'client-789',
        metadata: {
          campaignTitle: 'Test Campaign',
          clientName: 'Test Client',
          recipientCount: 100,
          daysOverdue: 2,
          assignedTo: ['user-1', 'user-2'],
          description: 'Event description',
          location: 'Office',
          reminderMinutesBefore: 30,
          isAllDay: false,
          startTime: '10:00',
          endTime: '11:00',
          duration: 60
        },
        color: '#8b5cf6',
        icon: '📋',
        className: 'custom-event'
      };

      expect(event.id).toBe('event-123');
      expect(event.title).toBe('Test Event');
      expect(event.type).toBe('task');
      expect(event.metadata?.duration).toBe(60);
    });
  });

  describe('CalendarFilter Interface', () => {
    it('sollte einen vollständigen Filter erstellen können', () => {
      const filter = {
        showCampaigns: true,
        showApprovals: false,
        showTasks: true,
        showScheduledEmails: true,
        clientId: 'client-123',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-31'),
        searchTerm: 'test search'
      };

      expect(filter.showCampaigns).toBe(true);
      expect(filter.showApprovals).toBe(false);
      expect(filter.clientId).toBe('client-123');
      expect(filter.searchTerm).toBe('test search');
    });
  });
});