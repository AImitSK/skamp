// src/lib/inbox/mockData.ts
import { EmailMessage, EmailThread, EmailAddress } from '@/types/inbox-enhanced';
import { Timestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';

export function generateMockData(organizationId: string, folder: string) {
  const now = new Date();
  
  // Mock contacts
  const contacts: EmailAddress[] = [
    { email: 'redaktion@spiegel.de', name: 'Spiegel Online Redaktion' },
    { email: 'presse@faz.net', name: 'FAZ Pressestelle' },
    { email: 'news@sueddeutsche.de', name: 'Süddeutsche Zeitung' },
    { email: 'redaktion@zeit.de', name: 'Die Zeit Redaktion' },
    { email: 'wirtschaft@handelsblatt.com', name: 'Handelsblatt Wirtschaft' },
    { email: 'j.mueller@lokalzeitung.de', name: 'Julia Müller' },
    { email: 'm.schmidt@pr-magazin.de', name: 'Michael Schmidt' }
  ];

  // Generate threads
  const threads: EmailThread[] = [];
  const emails: EmailMessage[] = [];

  if (folder === 'inbox') {
    // Thread 1: Response to PR campaign
    const thread1Id = nanoid();
    threads.push({
      id: thread1Id,
      subject: 'Re: [SKAMP-2024-001] Neue KI-Lösung revolutioniert PR-Arbeit',
      participants: [contacts[0], { email: 'noreply@skamp.de', name: 'SKAMP' }],
      lastMessageAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 60 * 60 * 1000)), // 2 hours ago
      messageCount: 3,
      unreadCount: 1,
      organizationId,
      userId: organizationId,
      contactIds: [],
      createdAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      updatedAt: Timestamp.now()
    });

    // Emails for thread 1
    emails.push(
      {
        id: nanoid(),
        messageId: `<${nanoid()}@skamp.de>`,
        threadId: thread1Id,
        from: { email: 'noreply@skamp.de', name: 'SKAMP' },
        to: [contacts[0]],
        subject: '[SKAMP-2024-001] Neue KI-Lösung revolutioniert PR-Arbeit',
        textContent: 'Sehr geehrte Damen und Herren...',
        htmlContent: '<p>Sehr geehrte Damen und Herren...</p>',
        snippet: 'Sehr geehrte Damen und Herren, wir freuen uns, Ihnen unsere neue...',
        receivedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        sentAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
        isRead: true,
        isStarred: false,
        isArchived: false,
        isDraft: false,
        labels: ['Kampagne'],
        folder: 'sent',
        importance: 'normal',
        organizationId,
        userId: organizationId,
        campaignId: 'campaign-123',
        emailAccountId: 'account-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        id: nanoid(),
        messageId: `<${nanoid()}@spiegel.de>`,
        threadId: thread1Id,
        from: contacts[0],
        to: [{ email: 'noreply@skamp.de', name: 'SKAMP' }],
        subject: 'Re: [SKAMP-2024-001] Neue KI-Lösung revolutioniert PR-Arbeit',
        textContent: 'Vielen Dank für die Pressemitteilung. Könnten Sie uns bitte weitere Informationen zu den technischen Details senden?',
        htmlContent: '<p>Vielen Dank für die Pressemitteilung. Könnten Sie uns bitte weitere Informationen zu den technischen Details senden?</p>',
        snippet: 'Vielen Dank für die Pressemitteilung. Könnten Sie uns bitte weitere Informationen...',
        receivedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 60 * 60 * 1000)),
        isRead: false,
        isStarred: true,
        isArchived: false,
        isDraft: false,
        labels: ['Rückfrage'],
        folder: 'inbox',
        importance: 'high',
        organizationId,
        userId: organizationId,
        campaignId: 'campaign-123',
        emailAccountId: 'account-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    );

    // Thread 2: Direct inquiry
    const thread2Id = nanoid();
    threads.push({
      id: thread2Id,
      subject: 'Interview-Anfrage: KI in der PR-Branche',
      participants: [contacts[5], { email: 'info@skamp.de', name: 'SKAMP Info' }],
      lastMessageAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 60 * 60 * 1000)),
      messageCount: 1,
      unreadCount: 1,
      organizationId,
      userId: organizationId,
      contactIds: [],
      createdAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 60 * 60 * 1000)),
      updatedAt: Timestamp.now()
    });

    emails.push({
      id: nanoid(),
      messageId: `<${nanoid()}@lokalzeitung.de>`,
      threadId: thread2Id,
      from: contacts[5],
      to: [{ email: 'info@skamp.de', name: 'SKAMP Info' }],
      subject: 'Interview-Anfrage: KI in der PR-Branche',
      textContent: 'Guten Tag, ich arbeite an einem Artikel über KI-Lösungen in der PR-Branche...',
      htmlContent: '<p>Guten Tag,</p><p>ich arbeite an einem Artikel über KI-Lösungen in der PR-Branche und bin auf SKAMP aufmerksam geworden. Wäre es möglich, ein kurzes Interview mit einem Ihrer Experten zu führen?</p><p>Mit freundlichen Grüßen<br>Julia Müller</p>',
      snippet: 'Guten Tag, ich arbeite an einem Artikel über KI-Lösungen in der PR-Branche...',
      receivedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 60 * 60 * 1000)),
      isRead: false,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      labels: ['Interview'],
      folder: 'inbox',
      importance: 'normal',
      organizationId,
      userId: organizationId,
      emailAccountId: 'account-1',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  if (folder === 'sent') {
    // Add some sent emails
    const sentThread = nanoid();
    threads.push({
      id: sentThread,
      subject: 'Pressemitteilung: SKAMP launcht neue Features',
      participants: contacts.slice(0, 3),
      lastMessageAt: Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      messageCount: 1,
      unreadCount: 0,
      organizationId,
      userId: organizationId,
      contactIds: [],
      createdAt: Timestamp.fromDate(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      updatedAt: Timestamp.now()
    });
  }

  if (folder === 'drafts') {
    // Add draft emails
    const draftThread = nanoid();
    threads.push({
      id: draftThread,
      subject: 'Entwurf: Antwort auf Interview-Anfrage',
      participants: [contacts[5]],
      lastMessageAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 60 * 1000)),
      messageCount: 1,
      unreadCount: 0,
      organizationId,
      userId: organizationId,
      contactIds: [],
      createdAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 60 * 1000)),
      updatedAt: Timestamp.now()
    });

    emails.push({
      id: nanoid(),
      messageId: `<draft-${nanoid()}@skamp.de>`,
      threadId: draftThread,
      from: { email: 'info@skamp.de', name: 'SKAMP Info' },
      to: [contacts[5]],
      subject: 'Re: Interview-Anfrage: KI in der PR-Branche',
      textContent: 'Sehr geehrte Frau Müller, vielen Dank für Ihre Anfrage...',
      htmlContent: '<p>Sehr geehrte Frau Müller,</p><p>vielen Dank für Ihre Anfrage...</p>',
      snippet: 'Sehr geehrte Frau Müller, vielen Dank für Ihre Anfrage...',
      receivedAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 60 * 1000)),
      isRead: true,
      isStarred: false,
      isArchived: false,
      isDraft: true,
      labels: ['Entwurf'],
      folder: 'draft',
      importance: 'normal',
      organizationId,
      userId: organizationId,
      emailAccountId: 'account-1',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  return { threads, emails };
}