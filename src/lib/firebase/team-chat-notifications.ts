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

      // Erstelle Notifications für alle erwähnten User
      const notificationPromises = mentionedUserIds.map(async (mentionedUserId) => {
        // Finde das erwähnte Team-Mitglied
        const mentionedMember = teamMembers.find(m =>
          m.userId === mentionedUserId ||
          m.id === mentionedUserId ||
          m.displayName.toLowerCase() === mentionedUserId.toLowerCase()
        );

        if (!mentionedMember) {
          console.warn(`Team-Mitglied nicht gefunden für: ${mentionedUserId}`);
          return;
        }

        // Verwende die richtige userId für die Notification
        const targetUserId = mentionedMember.userId || mentionedMember.id;

        // Kürze die Nachricht für die Notification
        const truncatedMessage = messageContent.length > 100
          ? messageContent.substring(0, 100) + '...'
          : messageContent;

        try {
          await notificationsService.create({
            userId: targetUserId,
            organizationId,
            type: 'TEAM_CHAT_MENTION',
            title: `${authorName} hat Sie erwähnt`,
            message: `In ${projectTitle}: "${truncatedMessage}"`,
            linkUrl: `/dashboard/projects/${projectId}?tab=teamchat`,
            linkType: 'project',
            linkId: projectId,
            isRead: false,
            metadata: {
              projectId,
              projectTitle,
              messageContent: truncatedMessage,
              mentionedBy: authorId,
              mentionedByName: authorName
            }
          });
        } catch (error) {
          console.error(`Fehler beim Senden der Notification an ${mentionedMember.displayName}:`, error);
          throw error;
        }
      });

      await Promise.all(notificationPromises);

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
    // Pattern für vollständige Namen mit Leerzeichen und Umlauten (ä, ö, ü, ß)
    // Stoppt bei Satzzeichen, doppelten Leerzeichen oder Zeilenende
    const mentionPattern = /@([^\s@]+(?:\s+[^\s@,.!?]+)*)(?=\s|[,.!?]|$|\n)/g;
    const mentions = messageContent.match(mentionPattern);

    if (!mentions) {
      return [];
    }

    const mentionedUserIds: string[] = [];

    mentions.forEach(mention => {
      const mentionText = mention.substring(1).trim(); // Entferne @ und Whitespace

      // Prüfe ob der mentionText mit einem bekannten Member-Namen STARTET
      // (weil Regex zu greedy ist und mehr matched als nur den Namen)
      const member = teamMembers.find(m =>
        mentionText.toLowerCase().startsWith(m.displayName.toLowerCase())
      );

      if (member) {
        // Präferiere userId, falls verfügbar
        const userId = member.userId || member.id;

        if (userId && !mentionedUserIds.includes(userId)) {
          mentionedUserIds.push(userId);
        }
      }
    });

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