# Implementierungsplan: E-Mail Inbox mit Multi-Tenancy

## 📋 Übersicht

Implementierung einer vollwertigen E-Mail-Inbox für SKAMP mit Multi-Tenancy-Support, damit Nutzer:
- Antworten auf ihre Pressemitteilungen empfangen können
- E-Mails direkt in SKAMP lesen und beantworten können
- Konversationen mit Journalisten verwalten können
- Alles im Kontext ihrer Organisation (Multi-Tenancy)

## 🏗️ Architektur-Grundlagen

### Multi-Tenancy System
- **BaseEntity**: Alle Datenmodelle erweitern das `BaseEntity` Interface
- **OrganizationId**: Primärer Tenant-Identifier (aktuell noch userId als Workaround)
- **Enhanced Services**: Verwendung der neuen Service-Architektur mit `_enhanced` Collections
- **Context-basierte Operationen**: Alle Create/Update-Operationen benötigen Context mit organizationId und userId

## 🎯 Kern-Features

1. **E-Mail-Empfang**: Automatisches Abrufen von E-Mails
2. **Inbox-Verwaltung**: Lesen, Archivieren, Löschen
3. **E-Mail-Antworten**: Direkt aus SKAMP heraus
4. **Konversations-Threading**: Zusammenhängende E-Mails gruppieren
5. **Kontakt-Verknüpfung**: E-Mails mit CRM-Kontakten verbinden
6. **Multi-Tenancy**: Strikte Trennung nach Organisationen

## 🛠️ Technische Optionen

### Option A: SendGrid Inbound Parse (Empfohlen)
- **Pro**: Nahtlose Integration, bereits SendGrid vorhanden
- **Contra**: Benötigt MX-Records, komplexere Domain-Setup

### Option B: IMAP/SMTP Integration
- **Pro**: Funktioniert mit bestehenden E-Mail-Konten
- **Contra**: Benötigt Zugangsdaten, verschiedene Provider

### Option C: Google Workspace / Microsoft 365 APIs
- **Pro**: Native Integration, vollständige Features
- **Contra**: OAuth-Flow, Provider-spezifisch

## 🛠️ Implementierung mit SendGrid Inbound Parse

### Phase 1: Datenbank-Struktur mit Multi-Tenancy

```typescript
// src/types/inbox-enhanced.ts
import { BaseEntity } from './international';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  inline?: boolean;
  contentId?: string;
}

// Hauptentitäten erweitern BaseEntity
export interface EmailMessage extends BaseEntity {
  // Eindeutige Identifikatoren
  messageId: string; // E-Mail Message-ID Header
  threadId?: string; // Für Konversations-Gruppierung
  
  // Empfänger/Absender
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  
  // Inhalt
  subject: string;
  textContent: string;
  htmlContent?: string;
  snippet: string; // Vorschau-Text
  
  // Anhänge
  attachments?: EmailAttachment[];
  
  // Metadaten
  receivedAt: Timestamp;
  sentAt?: Timestamp;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDraft: boolean;
  
  // Kategorisierung
  labels: string[];
  folder: 'inbox' | 'sent' | 'draft' | 'trash' | 'spam';
  importance: 'low' | 'normal' | 'high';
  
  // Verknüpfungen
  campaignId?: string;
  contactId?: string;
  emailAccountId: string;
  
  // SendGrid Spezifisch
  sendgridEventId?: string;
  spamScore?: number;
  spamReport?: string;
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}

export interface EmailAccount extends BaseEntity {
  email: string;
  displayName: string;
  domain: string;
  
  // Konfiguration
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  
  // SendGrid Inbound Parse
  inboundWebhookUrl?: string;
  inboundDomain?: string;
  
  // Signatur
  signature?: string;
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}

export interface EmailThread extends BaseEntity {
  subject: string;
  participants: EmailAddress[];
  lastMessageAt: Timestamp;
  messageCount: number;
  unreadCount: number;
  
  // Erste und letzte Nachricht für Vorschau
  firstMessageId?: string;
  lastMessageId?: string;
  
  // Verknüpfungen
  campaignId?: string;
  contactIds: string[];
  
  // BaseEntity liefert: id, organizationId, userId, createdAt, updatedAt
}
```

### Phase 2: Backend Services mit Enhanced Pattern

#### 2.1 Email Inbox Enhanced Service

```typescript
// src/lib/firebase/email-inbox-service-enhanced.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/client-init';
import { BaseService } from './base-service';
import { EmailMessage, EmailAccount, EmailThread } from '@/types/inbox-enhanced';
import { contactsEnhancedService } from './crm-service-enhanced';
import { nanoid } from 'nanoid';

// Haupt-Service für E-Mail-Nachrichten
class EmailMessagesEnhancedService extends BaseService<EmailMessage> {
  constructor() {
    super('inbox_messages_enhanced');
  }

  // E-Mail empfangen und speichern
  async receiveEmail(
    data: any,
    context: { organizationId: string; userId: string }
  ): Promise<string> {
    const messageId = data.headers['message-id'] || nanoid();
    
    // Thread-ID ermitteln
    const threadId = await this.determineThreadId(
      context.organizationId,
      data.subject,
      data.headers['in-reply-to'],
      data.headers['references']
    );
    
    // Kontakt verknüpfen
    const contacts = await contactsEnhancedService.getByEmail(
      context.organizationId,
      data.from.email
    );
    
    const emailMessage: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'> = {
      messageId,
      threadId,
      from: data.from,
      to: data.to,
      cc: data.cc,
      subject: data.subject,
      textContent: data.text,
      htmlContent: data.html,
      snippet: this.generateSnippet(data.text),
      attachments: data.attachments,
      receivedAt: Timestamp.now(),
      isRead: false,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      labels: [],
      folder: 'inbox',
      importance: this.detectImportance(data),
      contactId: contacts[0]?.id,
      emailAccountId: data.emailAccountId,
      spamScore: data.spam_score,
      spamReport: data.spam_report,
      organizationId: context.organizationId,
      userId: context.userId
    };
    
    // Kampagne verknüpfen
    if (data.subject.includes('[SKAMP-')) {
      const campaignId = this.extractCampaignId(data.subject);
      if (campaignId) {
        emailMessage.campaignId = campaignId;
      }
    }
    
    const docId = await this.create(emailMessage, context);
    
    // Thread aktualisieren
    if (threadId) {
      await this.updateThread(context.organizationId, threadId, emailMessage);
    }
    
    // Notification erstellen
    await this.createNewEmailNotification(emailMessage, docId);
    
    return docId;
  }
  
  // E-Mails nach Ordner abrufen
  async getByFolder(
    organizationId: string,
    folder: string,
    options?: {
      limit?: number;
      startAfter?: any;
      includeArchived?: boolean;
    }
  ): Promise<EmailMessage[]> {
    let q = query(
      this.collection,
      where('organizationId', '==', organizationId),
      where('folder', '==', folder)
    );
    
    if (!options?.includeArchived) {
      q = query(q, where('isArchived', '==', false));
    }
    
    q = query(q, orderBy('receivedAt', 'desc'));
    
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }
    
    return this.queryDocuments(q);
  }
  
  // Thread-Management
  private async determineThreadId(
    organizationId: string,
    subject: string,
    inReplyTo?: string,
    references?: string
  ): Promise<string | undefined> {
    // Suche nach existierendem Thread via Reply
    if (inReplyTo) {
      const messages = await this.queryDocuments(
        query(
          this.collection,
          where('organizationId', '==', organizationId),
          where('messageId', '==', inReplyTo),
          limit(1)
        )
      );
      
      if (messages.length > 0) {
        return messages[0].threadId || messages[0].id;
      }
    }
    
    // Thread basierend auf Betreff
    const cleanSubject = subject.replace(/^(Re:|Fwd:|AW:|WG:)\s*/gi, '').trim();
    const messages = await this.queryDocuments(
      query(
        this.collection,
        where('organizationId', '==', organizationId),
        where('subject', '==', cleanSubject),
        orderBy('receivedAt', 'desc'),
        limit(1)
      )
    );
    
    if (messages.length > 0) {
      return messages[0].threadId || messages[0].id;
    }
    
    // Neuer Thread
    return nanoid();
  }
  
  // E-Mail als gelesen markieren
  async markAsRead(
    organizationId: string,
    messageId: string
  ): Promise<void> {
    const messages = await this.queryDocuments(
      query(
        this.collection,
        where('organizationId', '==', organizationId),
        where('id', '==', messageId),
        limit(1)
      )
    );
    
    if (messages.length > 0) {
      await this.update(messageId, { isRead: true });
    }
  }
  
  // Hilfsfunktionen
  private generateSnippet(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
  
  private detectImportance(data: any): 'low' | 'normal' | 'high' {
    const headers = data.headers || {};
    
    if (headers['importance'] === 'high' || headers['priority'] === 'urgent') {
      return 'high';
    }
    
    if (headers['importance'] === 'low') {
      return 'low';
    }
    
    const urgentKeywords = ['urgent', 'asap', 'wichtig', 'dringend'];
    if (urgentKeywords.some(keyword => 
      data.subject.toLowerCase().includes(keyword)
    )) {
      return 'high';
    }
    
    return 'normal';
  }
  
  private extractCampaignId(subject: string): string | null {
    const match = subject.match(/\[SKAMP-([A-Z0-9]+)\]/);
    return match ? match[1] : null;
  }
  
  private async updateThread(
    organizationId: string,
    threadId: string,
    newMessage: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Thread-Statistiken aktualisieren
    const threadMessages = await this.queryDocuments(
      query(
        this.collection,
        where('organizationId', '==', organizationId),
        where('threadId', '==', threadId)
      )
    );
    
    const unreadCount = threadMessages.filter(m => !m.isRead).length;
    
    await emailThreadsEnhancedService.update(threadId, {
      lastMessageAt: newMessage.receivedAt,
      messageCount: threadMessages.length,
      unreadCount,
      lastMessageId: newMessage.messageId
    });
  }
  
  private async createNewEmailNotification(
    message: Omit<EmailMessage, 'id' | 'createdAt' | 'updatedAt'>,
    messageId: string
  ): Promise<void> {
    // Notification-System Integration
    console.log('New email notification:', {
      from: message.from.email,
      subject: message.subject,
      messageId
    });
  }
}

// Service für E-Mail-Konten
class EmailAccountsEnhancedService extends BaseService<EmailAccount> {
  constructor() {
    super('email_accounts_enhanced');
  }
  
  async getByEmail(
    organizationId: string,
    email: string
  ): Promise<EmailAccount | null> {
    const accounts = await this.queryDocuments(
      query(
        this.collection,
        where('organizationId', '==', organizationId),
        where('email', '==', email),
        limit(1)
      )
    );
    
    return accounts[0] || null;
  }
  
  async getEnabledAccounts(
    organizationId: string
  ): Promise<EmailAccount[]> {
    return this.queryDocuments(
      query(
        this.collection,
        where('organizationId', '==', organizationId),
        where('inboundEnabled', '==', true)
      )
    );
  }
}

// Service für E-Mail-Threads
class EmailThreadsEnhancedService extends BaseService<EmailThread> {
  constructor() {
    super('email_threads_enhanced');
  }
  
  async getByOrganization(
    organizationId: string,
    options?: {
      limit?: number;
      includeArchived?: boolean;
    }
  ): Promise<EmailThread[]> {
    let q = query(
      this.collection,
      where('organizationId', '==', organizationId),
      orderBy('lastMessageAt', 'desc')
    );
    
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }
    
    return this.queryDocuments(q);
  }
}

// Services exportieren
export const emailMessagesEnhancedService = new EmailMessagesEnhancedService();
export const emailAccountsEnhancedService = new EmailAccountsEnhancedService();
export const emailThreadsEnhancedService = new EmailThreadsEnhancedService();

// SendGrid Helper
export async function sendViaSendGrid(data: {
  from: EmailAddress;
  to: string[];
  subject: string;
  html: string;
  text: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
}): Promise<string> {
  // SendGrid API Integration
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    from: data.from,
    to: data.to,
    cc: data.cc,
    bcc: data.bcc,
    subject: data.subject,
    text: data.text,
    html: data.html,
    attachments: data.attachments
  };
  
  const response = await sgMail.send(msg);
  return response[0].headers['x-message-id'];
}
```

#### 2.2 SendGrid Inbound Parse Webhook

```typescript
// src/app/api/webhooks/sendgrid/inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import formidable from 'formidable';
import { 
  emailMessagesEnhancedService, 
  emailAccountsEnhancedService 
} from '@/lib/firebase/email-inbox-service-enhanced';
import crypto from 'crypto';

// Verify SendGrid Webhook Signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  const timestampPayload = timestamp + payload;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(timestampPayload)
    .digest('base64');
  
  return expectedSignature === signature;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = headers().get('x-twilio-email-event-webhook-signature');
    const timestamp = headers().get('x-twilio-email-event-webhook-timestamp');
    
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
    
    // Parse multipart form data
    const form = new formidable.IncomingForm();
    const [fields, files] = await form.parse(request);
    
    // Extract email data
    const emailData = {
      from: JSON.parse(fields.from as string),
      to: JSON.parse(fields.to as string),
      cc: fields.cc ? JSON.parse(fields.cc as string) : [],
      subject: fields.subject as string,
      text: fields.text as string,
      html: fields.html as string,
      headers: JSON.parse(fields.headers as string),
      envelope: JSON.parse(fields.envelope as string),
      attachments: files.attachments ? await processAttachments(files.attachments) : [],
      spam_score: parseFloat(fields.spam_score as string),
      spam_report: fields.spam_report as string,
    };
    
    // Determine target email account with multi-tenancy
    const targetEmail = emailData.envelope.to[0];
    
    // Suche nach dem E-Mail-Account über alle Organisationen
    // In Produktion sollte dies über Domain-Mapping optimiert werden
    const emailAccount = await findEmailAccountByEmail(targetEmail);
    
    if (!emailAccount) {
      console.error('No email account found for:', targetEmail);
      return NextResponse.json({ error: 'Unknown recipient' }, { status: 404 });
    }
    
    // Context für Multi-Tenancy
    const context = {
      organizationId: emailAccount.organizationId,
      userId: emailAccount.userId
    };
    
    // Save email to inbox
    await emailMessagesEnhancedService.receiveEmail({
      ...emailData,
      emailAccountId: emailAccount.id!,
    }, context);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Inbound email error:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

async function findEmailAccountByEmail(email: string): Promise<EmailAccount | null> {
  // TODO: Optimierung mit Domain-Index für bessere Performance
  // Aktuell: Durchsuche alle Accounts (nicht optimal für Produktion)
  
  // Temporäre Lösung: Domain extrahieren und cachen
  const domain = email.split('@')[1];
  
  // In Produktion: Domain-zu-Organization Mapping verwenden
  // Für MVP: Direkte Suche
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase/client-init');
  
  const q = query(
    collection(db, 'email_accounts_enhanced'),
    where('email', '==', email),
    where('inboundEnabled', '==', true)
  );
  
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as EmailAccount;
  }
  
  return null;
}

async function processAttachments(files: any[]): Promise<any[]> {
  // Process and upload attachments to Firebase Storage
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storage = getStorage();
  
  const attachments = await Promise.all(
    files.map(async (file) => {
      const fileRef = ref(storage, `email-attachments/${Date.now()}-${file.originalFilename}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      return {
        id: nanoid(),
        filename: file.originalFilename,
        contentType: file.mimetype,
        size: file.size,
        url
      };
    })
  );
  
  return attachments;
}
```

### Phase 3: Frontend Implementation mit Multi-Tenancy

#### 3.1 Inbox Page mit Organization Context

```typescript
// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Button } from '@/components/button';
import { InboxList } from './components/InboxList';
import { EmailViewer } from './components/EmailViewer';
import { ComposeEmail } from './components/ComposeEmail';
import { InboxSidebar } from './components/InboxSidebar';
import { EmailMessage } from '@/types/inbox-enhanced';
import { 
  PencilSquareIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EnvelopeIcon
} from '@heroicons/react/20/solid';

export default function InboxPage() {
  const { user } = useAuth();
  const organizationId = user?.uid || ''; // Workaround - später durch echte Org-ID ersetzen
  
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({
    inbox: 0,
    spam: 0
  });

  useEffect(() => {
    if (user && organizationId) {
      loadEmails();
      loadUnreadCounts();
    }
  }, [user, organizationId, selectedFolder]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/inbox/messages?folder=${selectedFolder}&organizationId=${organizationId}`
      );
      const data = await response.json();
      setEmails(data.messages);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      const response = await fetch(
        `/api/inbox/unread-counts?organizationId=${organizationId}`
      );
      const data = await response.json();
      setUnreadCounts(data);
    } catch (error) {
      console.error('Failed to load unread counts:', error);
    }
  };

  const handleEmailSelect = async (email: EmailMessage) => {
    setSelectedEmail(email);
    
    // Mark as read
    if (!email.isRead) {
      await markAsRead(email.id!);
    }
  };

  const markAsRead = async (emailId: string) => {
    await fetch(`/api/inbox/messages/${emailId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId })
    });
    
    // Update local state
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, isRead: true } : e
    ));
    
    // Update unread counts
    setUnreadCounts(prev => ({
      ...prev,
      [selectedFolder]: Math.max(0, prev[selectedFolder as keyof typeof prev] - 1)
    }));
  };

  const handleArchive = async (emailId: string) => {
    await fetch(`/api/inbox/messages/${emailId}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId })
    });
    
    // Remove from current view
    setEmails(prev => prev.filter(e => e.id !== emailId));
    setSelectedEmail(null);
  };

  const handleDelete = async (emailId: string) => {
    await fetch(`/api/inbox/messages/${emailId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId })
    });
    
    // Remove from current view
    setEmails(prev => prev.filter(e => e.id !== emailId));
    setSelectedEmail(null);
  };

  // Filter emails based on search
  const filteredEmails = emails.filter(email => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(searchLower) ||
      email.from.email.toLowerCase().includes(searchLower) ||
      email.from.name?.toLowerCase().includes(searchLower) ||
      email.snippet.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar */}
      <InboxSidebar
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        onCompose={() => setShowCompose(true)}
        unreadCounts={unreadCounts}
      />

      {/* Email List */}
      <div className="flex-1 flex">
        <div className="w-96 border-r bg-gray-50">
          {/* Search Bar */}
          <div className="p-4 border-b bg-white">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="E-Mails durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005fab]"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Email List */}
          <InboxList
            emails={filteredEmails}
            selectedEmail={selectedEmail}
            onEmailSelect={handleEmailSelect}
            loading={loading}
          />
        </div>

        {/* Email Viewer */}
        <div className="flex-1">
          {selectedEmail ? (
            <EmailViewer
              email={selectedEmail}
              onReply={() => {
                setShowCompose(true);
                // Set reply context
              }}
              onForward={() => {
                setShowCompose(true);
                // Set forward context
              }}
              onArchive={() => handleArchive(selectedEmail.id!)}
              onDelete={() => handleDelete(selectedEmail.id!)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <EnvelopeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Wählen Sie eine E-Mail aus</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeEmail
          organizationId={organizationId}
          onClose={() => setShowCompose(false)}
          onSend={() => {
            setShowCompose(false);
            loadEmails();
          }}
          replyTo={selectedEmail}
        />
      )}
    </div>
  );
}
```

#### 3.2 API Routes mit Multi-Tenancy

```typescript
// src/app/api/inbox/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { 
  emailMessagesEnhancedService 
} from '@/lib/firebase/email-inbox-service-enhanced';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const folder = searchParams.get('folder') || 'inbox';
    
    // Multi-Tenancy: OrganizationId aus Session oder Query
    const organizationId = searchParams.get('organizationId') || session.user.id;

    const messages = await emailMessagesEnhancedService.getByFolder(
      organizationId,
      folder,
      {
        limit: 50,
        includeArchived: false
      }
    );

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const organizationId = data.organizationId || session.user.id;
    
    const context = {
      organizationId,
      userId: session.user.id
    };

    // Send email logic
    const messageId = await sendViaSendGrid({
      from: data.from,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
      cc: data.cc,
      bcc: data.bcc
    });

    // Save to sent folder
    await emailMessagesEnhancedService.create({
      ...data,
      messageId,
      folder: 'sent',
      isRead: true,
      receivedAt: Timestamp.now(),
      sentAt: Timestamp.now()
    }, context);

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
```

#### 3.3 Komponenten mit SimpleSwitch

```typescript
// src/app/dashboard/communication/inbox/components/InboxList.tsx
"use client";

import { EmailMessage } from '@/types/inbox-enhanced';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  StarIcon,
  PaperClipIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/20/solid';
import { Badge } from '@/components/badge';
import { SimpleSwitch } from '@/components/notifications/SimpleSwitch';

interface InboxListProps {
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  onEmailSelect: (email: EmailMessage) => void;
  loading: boolean;
}

export function InboxList({ 
  emails, 
  selectedEmail, 
  onEmailSelect,
  loading 
}: InboxListProps) {
  const handleStarToggle = async (email: EmailMessage, isStarred: boolean) => {
    // Update star status
    await fetch(`/api/inbox/messages/${email.id}/star`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        isStarred,
        organizationId: email.organizationId 
      })
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005fab]"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Keine E-Mails</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {emails.map((email) => (
        <button
          key={email.id}
          onClick={() => onEmailSelect(email)}
          className={`
            w-full text-left p-4 hover:bg-gray-100 transition-colors
            ${selectedEmail?.id === email.id ? 'bg-blue-50' : ''}
            ${!email.isRead ? 'bg-white' : 'bg-gray-50'}
          `}
        >
          <div className="flex items-start gap-3">
            {/* Star Toggle mit SimpleSwitch für visuelles Feedback */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            >
              <button
                onClick={() => handleStarToggle(email, !email.isStarred)}
                className="p-1"
              >
                <StarIcon 
                  className={`h-5 w-5 transition-colors ${
                    email.isStarred ? 'text-yellow-400' : 'text-gray-300 hover:text-gray-400'
                  }`} 
                />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                  {email.from.name || email.from.email}
                </p>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(email.receivedAt.toDate(), {
                    addSuffix: true,
                    locale: de
                  })}
                </span>
              </div>

              <p className={`text-sm truncate mb-1 ${!email.isRead ? 'font-medium' : ''}`}>
                {email.subject}
              </p>

              <p className="text-sm text-gray-600 truncate">
                {email.snippet}
              </p>

              {/* Indicators */}
              <div className="flex items-center gap-2 mt-2">
                {email.importance === 'high' && (
                  <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
                )}
                {email.attachments && email.attachments.length > 0 && (
                  <PaperClipIcon className="h-4 w-4 text-gray-400" />
                )}
                {email.campaignId && (
                  <Badge size="xs" color="purple" className="whitespace-nowrap">
                    Kampagne
                  </Badge>
                )}
                {email.labels.map(label => (
                  <Badge key={label} size="xs" className="whitespace-nowrap">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
```

### Phase 4: Domain Setup für Inbox mit Multi-Tenancy

```typescript
// src/app/dashboard/domains/[id]/inbox-setup/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/button';
import { InboxSetupGuide } from './components/InboxSetupGuide';
import { emailAccountsEnhancedService } from '@/lib/firebase/email-inbox-service-enhanced';

export default function DomainInboxSetupPage() {
  const { id: domainId } = useParams();
  const { user } = useAuth();
  const organizationId = user?.uid || '';
  
  const [domain, setDomain] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'mx' | 'webhook' | 'test'>('mx');
  const [emailAccount, setEmailAccount] = useState<EmailAccount | null>(null);

  useEffect(() => {
    if (domainId && organizationId) {
      loadDomainAndAccount();
    }
  }, [domainId, organizationId]);

  const loadDomainAndAccount = async () => {
    // Load domain details
    const domainDoc = await domainsEnhancedService.get(domainId as string);
    if (domainDoc) {
      setDomain(domainDoc.domain);
      
      // Check if email account exists
      const account = await emailAccountsEnhancedService.getByEmail(
        organizationId,
        `noreply@${domainDoc.domain}`
      );
      setEmailAccount(account);
    }
  };

  const createEmailAccount = async () => {
    const context = {
      organizationId,
      userId: user!.uid
    };

    const newAccount = await emailAccountsEnhancedService.create({
      email: `noreply@${domain}`,
      displayName: 'SKAMP Automated',
      domain: domain,
      inboundEnabled: true,
      outboundEnabled: true,
      organizationId,
      userId: user!.uid
    }, context);

    setEmailAccount(newAccount);
    
    // Configure SendGrid Inbound Parse
    await configureSendGridInboundParse(domain, organizationId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Heading>E-Mail-Empfang für {domain} einrichten</Heading>
      
      <div className="mt-8">
        {!emailAccount ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              Noch kein E-Mail-Konto für diese Domain eingerichtet.
            </p>
            <Button onClick={createEmailAccount}>
              E-Mail-Konto erstellen
            </Button>
          </div>
        ) : (
          <InboxSetupGuide
            domain={domain}
            currentStep={currentStep}
            onStepComplete={(step) => {
              if (step === 'mx') setCurrentStep('webhook');
              else if (step === 'webhook') setCurrentStep('test');
            }}
          />
        )}
      </div>
    </div>
  );
}

async function configureSendGridInboundParse(
  domain: string,
  organizationId: string
): Promise<void> {
  // Call backend API to configure SendGrid
  await fetch('/api/sendgrid/configure-inbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, organizationId })
  });
}
```

## 🔄 Alternativer Ansatz: IMAP/SMTP Integration

Falls SendGrid Inbound Parse zu komplex ist, hier die IMAP-Alternative mit Multi-Tenancy:

```typescript
// src/lib/email/imap-service-enhanced.ts
import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { emailMessagesEnhancedService } from '../firebase/email-inbox-service-enhanced';

export class ImapServiceEnhanced {
  private imap: Imap;
  private organizationId: string;
  private userId: string;
  private emailAccountId: string;
  
  constructor(
    config: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
    },
    context: {
      organizationId: string;
      userId: string;
      emailAccountId: string;
    }
  ) {
    this.imap = new Imap({
      ...config,
      tlsOptions: { rejectUnauthorized: false }
    });
    
    this.organizationId = context.organizationId;
    this.userId = context.userId;
    this.emailAccountId = context.emailAccountId;
  }
  
  async fetchNewEmails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        this.imap.openBox('INBOX', false, async (err, box) => {
          if (err) reject(err);
          
          // Fetch unseen emails
          const f = this.imap.seq.fetch('1:*', {
            bodies: '',
            struct: true,
            markSeen: true
          });
          
          f.on('message', (msg) => {
            let buffer = '';
            
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
            });
            
            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                
                // Save to Firestore with Multi-Tenancy context
                await emailMessagesEnhancedService.receiveEmail({
                  from: {
                    email: parsed.from?.value[0]?.address || '',
                    name: parsed.from?.value[0]?.name
                  },
                  to: parsed.to?.value.map(t => ({
                    email: t.address,
                    name: t.name
                  })) || [],
                  subject: parsed.subject || '',
                  text: parsed.text || '',
                  html: parsed.html || '',
                  headers: parsed.headers,
                  attachments: await this.processAttachments(parsed.attachments),
                  emailAccountId: this.emailAccountId
                }, {
                  organizationId: this.organizationId,
                  userId: this.userId
                });
              } catch (error) {
                console.error('Error processing email:', error);
              }
            });
          });
          
          f.once('end', () => {
            this.imap.end();
            resolve();
          });
        });
      });
      
      this.imap.once('error', reject);
      this.imap.connect();
    });
  }
  
  private async processAttachments(attachments: any[]): Promise<any[]> {
    // Process and upload attachments
    return attachments.map(att => ({
      id: nanoid(),
      filename: att.filename,
      contentType: att.contentType,
      size: att.size
    }));
  }
}

// Background job to fetch emails
export async function syncImapAccounts() {
  // Get all IMAP-enabled accounts across all organizations
  const accounts = await emailAccountsEnhancedService.queryDocuments(
    query(
      collection(db, 'email_accounts_enhanced'),
      where('imapEnabled', '==', true)
    )
  );
  
  for (const account of accounts) {
    try {
      const imapService = new ImapServiceEnhanced(
        {
          user: account.email,
          password: account.imapPassword, // Encrypted
          host: account.imapHost,
          port: account.imapPort,
          tls: account.imapTls
        },
        {
          organizationId: account.organizationId,
          userId: account.userId,
          emailAccountId: account.id!
        }
      );
      
      await imapService.fetchNewEmails();
    } catch (error) {
      console.error(`Failed to sync ${account.email}:`, error);
    }
  }
}
```

## 🚀 Deployment Schritte mit Multi-Tenancy

### SendGrid Inbound Parse Setup:
1. Domain in SendGrid verifizieren (bereits gemacht)
2. MX Record hinzufügen: `mx.sendgrid.net`
3. Inbound Parse Webhook konfigurieren
4. Webhook URL: `https://app.skamp.de/api/webhooks/sendgrid/inbound`
5. **Multi-Tenancy**: Domain-zu-Organization Mapping implementieren

### Firestore Indexes:
```json
{
  "indexes": [
    {
      "collectionGroup": "inbox_messages_enhanced",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "folder", "order": "ASCENDING" },
        { "fieldPath": "receivedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "inbox_messages_enhanced",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "threadId", "order": "ASCENDING" },
        { "fieldPath": "receivedAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "email_accounts_enhanced",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "email", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Environment Variables:
```env
SENDGRID_API_KEY=your_api_key
SENDGRID_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=https://app.skamp.de
```

## 📊 Features Roadmap

### Phase 1 (MVP):
- [x] E-Mails empfangen mit Multi-Tenancy
- [x] E-Mails anzeigen pro Organisation
- [x] Auf E-Mails antworten
- [x] Basis-Ordnerstruktur
- [x] SimpleSwitch für UI-Toggles

### Phase 2:
- [ ] Erweiterte Suche mit Elasticsearch
- [ ] Labels & Filter pro Organisation
- [ ] Automatische Kategorisierung
- [ ] Massen-Aktionen
- [ ] Domain-zu-Organization Optimierung

### Phase 3:
- [ ] Email Templates pro Organisation
- [ ] Geplanter Versand
- [ ] Follow-up Reminders
- [ ] Analytics pro Organisation
- [ ] Shared Inboxes für Teams

### Phase 4:
- [ ] Mobile App Support
- [ ] Offline-Sync
- [ ] End-to-End Verschlüsselung
- [ ] Multi-Account Support pro User
- [ ] Erweiterte Berechtigungen

## 🔐 Sicherheitsüberlegungen

1. **Tenant Isolation**: Strikte Trennung der Daten nach organizationId
2. **Domain Verification**: Nur verifizierte Domains können E-Mails empfangen
3. **Rate Limiting**: Schutz vor Spam und Missbrauch
4. **Encryption**: Sensible Daten verschlüsselt speichern
5. **Audit Trail**: Alle Aktionen protokollieren

---

**Geschätzte Implementierungszeit**: 10-12 Tage
- Tag 1-2: Backend Setup mit Multi-Tenancy (Webhook, Services)
- Tag 3-4: Frontend Inbox UI mit Organization Context
- Tag 5-6: Email Composer & Threading
- Tag 7-8: Domain Setup Integration
- Tag 9-10: Testing & Polish
- Tag 11-12: Multi-Tenancy Optimierungen & Sicherheit

**Wichtig**: 
1. Die Inbox-Funktionalität sollte NACH der Domain-Authentifizierung implementiert werden
2. Alle neuen Features müssen dem Enhanced Service Pattern folgen
3. Immer organizationId für Queries verwenden, nie nur userId
4. Bei UI-Komponenten SimpleSwitch statt Catalyst Switch verwenden