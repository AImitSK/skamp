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

        // Erstelle Notification
        await notificationsService.create({
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

        console.log(`Mention-Notification gesendet an ${mentionedMember.displayName} (${targetUserId})`);
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
    const mentionPattern = /@([^\s]+)/g;
    const mentions = messageContent.match(mentionPattern);

    if (!mentions) {
      return [];
    }

    const mentionedUserIds: string[] = [];

    mentions.forEach(mention => {
      const mentionText = mention.substring(1); // Entferne @

      // Finde Team-Mitglied by displayName
      const member = teamMembers.find(m =>
        m.displayName.toLowerCase() === mentionText.toLowerCase() ||
        m.displayName.toLowerCase().includes(mentionText.toLowerCase())
      );

      if (member) {
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