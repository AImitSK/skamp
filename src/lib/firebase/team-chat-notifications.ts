import { notificationsService } from './notifications-service';
import { teamMemberService } from './organization-service';
import { TeamMember } from '@/types/international';

interface MentionNotificationData {
  mentionedUserIds: string[];
  messageContent: string;
  authorId: string;
  authorName: string;
  projectId: string;
  projectTitle: string;
  organizationId: string;
}

export class TeamChatNotificationsService {
  /**
   * Sende Push-Notifications für @-Mentions im Team-Chat
   */
  async sendMentionNotifications(data: MentionNotificationData): Promise<void> {
    const {
      mentionedUserIds,
      messageContent,
      authorId,
      authorName,
      projectId,
      projectTitle,
      organizationId
    } = data;

    try {
      // Lade alle Team-Mitglieder um Namen zu resolven
      const teamMembers = await teamMemberService.getByOrganization(organizationId);

      // Debug: Zeige alle Team-Mitglieder
      console.log('🔍 Debug - Alle Team-Mitglieder für Notifications:', teamMembers.map(m => ({
        id: m.id,
        userId: m.userId,
        displayName: m.displayName,
        email: m.email
      })));

      console.log('🎯 Debug - Erwähnte User IDs:', mentionedUserIds);

      // Erstelle Notifications für alle erwähnten User
      const notificationPromises = mentionedUserIds.map(async (mentionedUserId) => {
        console.log(`\n🔎 Debug - Verarbeite Mention für: ${mentionedUserId}`);

        // Finde das erwähnte Team-Mitglied
        const mentionedMember = teamMembers.find(m =>
          m.userId === mentionedUserId ||
          m.id === mentionedUserId ||
          m.displayName.toLowerCase() === mentionedUserId.toLowerCase()
        );

        console.log('👤 Debug - Gefundenes Member:', mentionedMember ? {
          id: mentionedMember.id,
          userId: mentionedMember.userId,
          displayName: mentionedMember.displayName,
          email: mentionedMember.email
        } : null);

        if (!mentionedMember) {
          console.warn(`❌ Team-Mitglied nicht gefunden für: ${mentionedUserId}`);
          return;
        }

        // Verwende die richtige userId für die Notification
        const targetUserId = mentionedMember.userId || mentionedMember.id;
        console.log('🎯 Debug - Target User ID für Notification:', targetUserId);

        // Kürze die Nachricht für die Notification
        const truncatedMessage = messageContent.length > 100
          ? messageContent.substring(0, 100) + '...'
          : messageContent;

        // Erstelle Notification
        console.log('📤 Debug - Erstelle Notification mit:', {
          targetUserId,
          organizationId,
          type: 'TEAM_CHAT_MENTION',
          authorName,
          projectTitle,
          truncatedMessage
        });

        try {
          const notificationId = await notificationsService.create({
            userId: targetUserId,
            organizationId,
            type: 'TEAM_CHAT_MENTION',
            title: `${authorName} hat Sie erwähnt`,
            message: `In ${projectTitle}: "${truncatedMessage}"`,
            linkUrl: `/dashboard/projects/${projectId}?tab=teamchat`,
            linkType: 'project' as any, // Erweitere LinkType später
            linkId: projectId,
            metadata: {
              projectId,
              projectTitle,
              messageContent: truncatedMessage,
              mentionedBy: authorId,
              mentionedByName: authorName
            }
          });

          console.log(`✅ Mention-Notification gesendet an ${mentionedMember.displayName} (${targetUserId}) - ID: ${notificationId}`);
        } catch (error) {
          console.error(`❌ Fehler beim Senden der Notification an ${mentionedMember.displayName} (${targetUserId}):`, error);
          throw error;
        }
      });

      await Promise.all(notificationPromises);
      console.log(`${mentionedUserIds.length} Mention-Notifications erfolgreich gesendet`);

    } catch (error) {
      console.error('Fehler beim Senden der Mention-Notifications:', error);
      throw error;
    }
  }

  /**
   * Extrahiere User-IDs aus @-Mentions im Text
   */
  extractMentionedUserIds(
    messageContent: string,
    teamMembers: TeamMember[]
  ): string[] {
    // Pattern für vollständige Namen mit Leerzeichen
    const mentionPattern = /@([\w\s]+?)(?=\s{2,}|$|[,.!?]|\n)/g;
    const mentions = messageContent.match(mentionPattern);

    console.log('\n🔍 Debug - extractMentionedUserIds:');
    console.log('Message:', messageContent);
    console.log('Gefundene Mentions:', mentions);
    console.log('Verfügbare Team-Mitglieder:', teamMembers.map(m => m.displayName));

    if (!mentions) {
      return [];
    }

    const mentionedUserIds: string[] = [];

    mentions.forEach(mention => {
      const mentionText = mention.substring(1); // Entferne @
      console.log(`\n🔎 Suche Member für Mention: "${mentionText}"`);

      // Suche nach exaktem Treffer des displayName
      let member = teamMembers.find(m =>
        m.displayName === mentionText // Exakter Match mit dem, was eingefügt wurde
      );

      if (!member) {
        // Fallback: Suche nach Teil-Übereinstimmungen
        member = teamMembers.find(m =>
          m.displayName.toLowerCase().includes(mentionText.toLowerCase())
        );
      }

      console.log('Gefundenes Member:', member ? {
        id: member.id,
        userId: member.userId,
        displayName: member.displayName,
        email: member.email
      } : 'NICHT GEFUNDEN');

      if (member) {
        // Präferiere userId, falls verfügbar
        const userId = member.userId || member.id;
        console.log(`Verwende User-ID: ${userId} für ${member.displayName}`);

        if (userId && !mentionedUserIds.includes(userId)) {
          mentionedUserIds.push(userId);
        }
      } else {
        console.warn(`❌ Kein Team-Mitglied gefunden für Mention: "${mentionText}"`);
      }
    });

    console.log('Final mentionedUserIds:', mentionedUserIds);
    return mentionedUserIds;
  }

  /**
   * Prüfe ob ein User erwähnt wurde (für Highlighting)
   */
  isUserMentioned(messageContent: string, userDisplayName: string): boolean {
    const mentionPattern = new RegExp(`@${userDisplayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return mentionPattern.test(messageContent);
  }

  /**
   * Formatiere Nachricht mit Mention-Highlights
   */
  formatMessageWithMentions(
    messageContent: string,
    teamMembers: TeamMember[],
    currentUserName?: string
  ): string {
    let formattedMessage = messageContent;

    // Finde alle @-Mentions
    const mentionPattern = /@([^\s]+)/g;
    const mentions = messageContent.match(mentionPattern);

    if (mentions) {
      mentions.forEach(mention => {
        const mentionText = mention.substring(1);
        const member = teamMembers.find(m =>
          m.displayName.toLowerCase() === mentionText.toLowerCase()
        );

        if (member) {
          const isCurrentUser = currentUserName &&
            member.displayName.toLowerCase() === currentUserName.toLowerCase();

          const className = isCurrentUser
            ? 'mention-highlight-self'
            : 'mention-highlight';

          formattedMessage = formattedMessage.replace(
            mention,
            `<span class="${className}">@${member.displayName}</span>`
          );
        }
      });
    }

    return formattedMessage;
  }
}

export const teamChatNotificationsService = new TeamChatNotificationsService();