# Implementierungsplan: E-Mail Inbox

## 📋 Übersicht

Implementierung einer vollwertigen E-Mail-Inbox für SKAMP, damit Nutzer:
- Antworten auf ihre Pressemitteilungen empfangen können
- E-Mails direkt in SKAMP lesen und beantworten können
- Konversationen mit Journalisten verwalten können

## 🎯 Kern-Features

1. **E-Mail-Empfang**: Automatisches Abrufen von E-Mails
2. **Inbox-Verwaltung**: Lesen, Archivieren, Löschen
3. **E-Mail-Antworten**: Direkt aus SKAMP heraus
4. **Konversations-Threading**: Zusammenhängende E-Mails gruppieren
5. **Kontakt-Verknüpfung**: E-Mails mit CRM-Kontakten verbinden

## 🏗️ Technische Optionen

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

### Phase 1: Datenbank-Struktur

```typescript
// src/types/inbox.ts
export interface EmailMessage {
  id?: string;
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
  campaignId?: string; // Verweis auf PR-Kampagne
  contactId?: string; // Verweis auf CRM-Kontakt
  
  // Organisation
  userId: string;
  organizationId: string;
  emailAccountId: string; // Welches E-Mail-Konto
  
  // SendGrid Spezifisch
  sendgridEventId?: string;
  spamScore?: number;
  spamReport?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string; // Download URL
  inline?: boolean;
  contentId?: string; // Für inline Bilder
}

export interface EmailAccount {
  id?: string;
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
  
  userId: string;
  organizationId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EmailThread {
  id?: string;
  subject: string;
  participants: EmailAddress[];
  lastMessageAt: Timestamp;
  messageCount: number;
  unreadCount: number;
  
  // Erste und letzte Nachricht für Vorschau
  firstMessage?: EmailMessage;
  lastMessage?: EmailMessage;
  
  // Verknüpfungen
  campaignId?: string;
  contactIds: string[];
  
  userId: string;
  organizationId: string;
}
```

### Phase 2: Backend Services

#### 2.1 SendGrid Inbound Parse Webhook

```typescript
// src/app/api/webhooks/sendgrid/inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import formidable from 'formidable';
import { emailInboxService } from '@/lib/email/email-inbox-service';
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
      attachments: files.attachments ? processAttachments(files.attachments) : [],
      spam_score: parseFloat(fields.spam_score as string),
      spam_report: fields.spam_report as string,
    };
    
    // Determine target email account
    const targetEmail = emailData.envelope.to[0];
    const emailAccount = await emailInboxService.getAccountByEmail(targetEmail);
    
    if (!emailAccount) {
      console.error('No email account found for:', targetEmail);
      return NextResponse.json({ error: 'Unknown recipient' }, { status: 404 });
    }
    
    // Save email to inbox
    await emailInboxService.receiveEmail({
      ...emailData,
      emailAccountId: emailAccount.id!,
      userId: emailAccount.userId,
      organizationId: emailAccount.organizationId,
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Inbound email error:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

function processAttachments(files: any[]): any[] {
  // Process and upload attachments to Firebase Storage
  return files.map(file => ({
    filename: file.originalFilename,
    contentType: file.mimetype,
    size: file.size,
    // Upload logic here
  }));
}
```

#### 2.2 Email Inbox Service

```typescript
// src/lib/email/email-inbox-service.ts
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
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/client-init';
import { EmailMessage, EmailAccount, EmailThread } from '@/types/inbox';
import { contactsService } from '../firebase/crm-service';
import { nanoid } from 'nanoid';

export const emailInboxService = {
  // E-Mail empfangen und speichern
  async receiveEmail(data: any): Promise<string> {
    const messageId = data.headers['message-id'] || nanoid();
    
    // Thread-ID ermitteln
    const threadId = await this.determineThreadId(
      data.subject,
      data.headers['in-reply-to'],
      data.headers['references']
    );
    
    // Kontakt verknüpfen
    const contact = await contactsService.getByEmail(
      data.from.email,
      data.organizationId
    );
    
    const emailMessage: EmailMessage = {
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
      contactId: contact?.id,
      userId: data.userId,
      organizationId: data.organizationId,
      emailAccountId: data.emailAccountId,
      spamScore: data.spam_score,
      spamReport: data.spam_report,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    // Kampagne verknüpfen (basierend auf Betreff oder References)
    if (data.subject.includes('[SKAMP-')) {
      const campaignId = this.extractCampaignId(data.subject);
      if (campaignId) {
        emailMessage.campaignId = campaignId;
      }
    }
    
    const docRef = doc(collection(db, 'inbox_messages'));
    await setDoc(docRef, emailMessage);
    
    // Thread aktualisieren
    if (threadId) {
      await this.updateThread(threadId, emailMessage);
    }
    
    // Notification erstellen
    await this.createNewEmailNotification(emailMessage);
    
    return docRef.id;
  },
  
  // E-Mail senden
  async sendEmail(
    accountId: string,
    to: string[],
    subject: string,
    content: string,
    options?: {
      cc?: string[];
      bcc?: string[];
      replyTo?: string;
      attachments?: any[];
      threadId?: string;
      inReplyTo?: string;
    }
  ): Promise<string> {
    const account = await this.getAccount(accountId);
    if (!account) throw new Error('Email account not found');
    
    // SendGrid API call
    const messageId = await this.sendViaSendGrid({
      from: {
        email: account.email,
        name: account.displayName
      },
      to,
      subject,
      html: content,
      text: this.htmlToText(content),
      ...options
    });
    
    // Speichere in Sent folder
    const sentMessage: EmailMessage = {
      messageId,
      threadId: options?.threadId,
      from: {
        email: account.email,
        name: account.displayName
      },
      to: to.map(email => ({ email })),
      cc: options?.cc?.map(email => ({ email })),
      subject,
      textContent: this.htmlToText(content),
      htmlContent: content,
      snippet: this.generateSnippet(content),
      sentAt: Timestamp.now(),
      receivedAt: Timestamp.now(),
      isRead: true,
      isStarred: false,
      isArchived: false,
      isDraft: false,
      labels: [],
      folder: 'sent',
      importance: 'normal',
      userId: account.userId,
      organizationId: account.organizationId,
      emailAccountId: accountId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = doc(collection(db, 'inbox_messages'));
    await setDoc(docRef, sentMessage);
    
    return docRef.id;
  },
  
  // Thread-Management
  async determineThreadId(
    subject: string,
    inReplyTo?: string,
    references?: string
  ): Promise<string | undefined> {
    // Suche nach existierendem Thread
    if (inReplyTo) {
      const q = query(
        collection(db, 'inbox_messages'),
        where('messageId', '==', inReplyTo),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data().threadId || snapshot.docs[0].id;
      }
    }
    
    // Thread basierend auf Betreff
    const cleanSubject = subject.replace(/^(Re:|Fwd:|AW:|WG:)\s*/gi, '').trim();
    const q = query(
      collection(db, 'inbox_messages'),
      where('subject', '==', cleanSubject),
      orderBy('receivedAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data().threadId || snapshot.docs[0].id;
    }
    
    // Neuer Thread
    return nanoid();
  },
  
  // Hilfsfunktionen
  generateSnippet(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  },
  
  detectImportance(data: any): 'low' | 'normal' | 'high' {
    // Logik zur Erkennung wichtiger E-Mails
    const headers = data.headers;
    
    if (headers['importance'] === 'high' || headers['priority'] === 'urgent') {
      return 'high';
    }
    
    if (headers['importance'] === 'low') {
      return 'low';
    }
    
    // Keywords im Betreff
    const urgentKeywords = ['urgent', 'asap', 'wichtig', 'dringend'];
    if (urgentKeywords.some(keyword => 
      data.subject.toLowerCase().includes(keyword)
    )) {
      return 'high';
    }
    
    return 'normal';
  },
  
  extractCampaignId(subject: string): string | null {
    const match = subject.match(/\[SKAMP-([A-Z0-9]+)\]/);
    return match ? match[1] : null;
  },
  
  htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
};
```

### Phase 3: Frontend Implementation

#### 3.1 Inbox Page

```typescript
// src/app/dashboard/communication/inbox/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Heading } from '@/components/heading';
import { Button } from '@/components/button';
import { InboxList } from '@/components/inbox/InboxList';
import { EmailViewer } from '@/components/inbox/EmailViewer';
import { ComposeEmail } from '@/components/inbox/ComposeEmail';
import { InboxSidebar } from '@/components/inbox/InboxSidebar';
import { EmailMessage } from '@/types/inbox';
import { 
  PencilSquareIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon 
} from '@heroicons/react/20/solid';

export default function InboxPage() {
  const { user } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEmails();
    }
  }, [user, selectedFolder]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      // API call to load emails
      const response = await fetch(`/api/inbox/messages?folder=${selectedFolder}`);
      const data = await response.json();
      setEmails(data.messages);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSelect = (email: EmailMessage) => {
    setSelectedEmail(email);
    // Mark as read
    if (!email.isRead) {
      markAsRead(email.id!);
    }
  };

  const markAsRead = async (emailId: string) => {
    await fetch(`/api/inbox/messages/${emailId}/read`, { method: 'POST' });
    // Update local state
    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, isRead: true } : e
    ));
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <InboxSidebar
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        onCompose={() => setShowCompose(true)}
        unreadCounts={{
          inbox: emails.filter(e => !e.isRead && e.folder === 'inbox').length,
          spam: emails.filter(e => e.folder === 'spam').length
        }}
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
            emails={emails}
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
              onArchive={() => {
                // Archive logic
              }}
              onDelete={() => {
                // Delete logic
              }}
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
          onClose={() => setShowCompose(false)}
          onSend={() => {
            setShowCompose(false);
            loadEmails();
          }}
        />
      )}
    </div>
  );
}
```

#### 3.2 Email List Component

```typescript
// src/components/inbox/InboxList.tsx
"use client";

import { EmailMessage } from '@/types/inbox';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  StarIcon,
  PaperClipIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/20/solid';
import { Badge } from '@/components/badge';

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
            {/* Star */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Toggle star
              }}
              className="mt-1"
            >
              <StarIcon 
                className={`h-5 w-5 ${
                  email.isStarred ? 'text-yellow-400' : 'text-gray-300'
                }`} 
              />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                  {email.from.name || email.from.email}
                </p>
                <span className="text-xs text-gray-500">
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
                  <Badge size="xs" color="purple">Kampagne</Badge>
                )}
                {email.labels.map(label => (
                  <Badge key={label} size="xs">{label}</Badge>
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

#### 3.3 Email Viewer Component

```typescript
// src/components/inbox/EmailViewer.tsx
"use client";

import { EmailMessage } from '@/types/inbox';
import { Button } from '@/components/button';
import { Avatar } from '@/components/avatar';
import { 
  ReplyIcon,
  ForwardIcon,
  TrashIcon,
  ArchiveBoxIcon,
  StarIcon,
  PaperClipIcon,
  ChevronDownIcon
} from '@heroicons/react/20/solid';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface EmailViewerProps {
  email: EmailMessage;
  onReply: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export function EmailViewer({ 
  email, 
  onReply, 
  onForward,
  onArchive,
  onDelete 
}: EmailViewerProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{email.subject}</h2>
          <div className="flex items-center gap-2">
            <Button plain size="sm" onClick={onReply}>
              <ReplyIcon className="h-4 w-4" />
              Antworten
            </Button>
            <Button plain size="sm" onClick={onForward}>
              <ForwardIcon className="h-4 w-4" />
              Weiterleiten
            </Button>
            <div className="border-l pl-2 ml-2 flex gap-1">
              <button className="p-1 hover:bg-gray-100 rounded">
                <ArchiveBoxIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded">
                <TrashIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded">
                <StarIcon className={`h-5 w-5 ${
                  email.isStarred ? 'text-yellow-400' : 'text-gray-600'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Details */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-start gap-4">
          <Avatar name={email.from.name || email.from.email} size="lg" />
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{email.from.name || 'Unbekannt'}</p>
                <p className="text-sm text-gray-600">{email.from.email}</p>
              </div>
              <p className="text-sm text-gray-500">
                {format(email.receivedAt.toDate(), 'PPpp', { locale: de })}
              </p>
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              <p>An: {email.to.map(t => t.email).join(', ')}</p>
              {email.cc && email.cc.length > 0 && (
                <p>CC: {email.cc.map(c => c.email).join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-4">
          {email.htmlContent ? (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: email.htmlContent }}
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans">
              {email.textContent}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="px-6 py-4 border-t">
            <h3 className="text-sm font-medium mb-3">
              Anhänge ({email.attachments.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {email.attachments.map((attachment) => (
                
                  key={attachment.id}
                  href={attachment.url}
                  download={attachment.filename}
                  className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50"
                >
                  <PaperClipIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{attachment.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.size)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
```

### Phase 4: Domain Setup für Inbox

#### 4.1 MX Records Setup Guide

```typescript
// src/components/domains/InboxSetupGuide.tsx
"use client";

import { useState } from 'react';
import { Text } from '@/components/text';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { 
  InformationCircleIcon,
  ClipboardDocumentIcon,
  CheckIcon 
} from '@heroicons/react/20/solid';

interface InboxSetupGuideProps {
  domain: string;
  currentStep: 'mx' | 'webhook' | 'test';
}

export function InboxSetupGuide({ domain, currentStep }: InboxSetupGuideProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const mxRecords = [
    { priority: 10, value: 'mx.sendgrid.net' }
  ];

  const webhookUrl = `https://app.skamp.de/api/webhooks/sendgrid/inbound`;

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Alert type="info">
        <InformationCircleIcon className="h-5 w-5" />
        <div>
          <Text className="font-semibold">E-Mail-Empfang einrichten</Text>
          <Text className="text-sm mt-1">
            Um E-Mails empfangen zu können, müssen Sie zusätzlich zu den 
            CNAME-Einträgen auch einen MX-Record einrichten.
          </Text>
        </div>
      </Alert>

      {currentStep === 'mx' && (
        <div>
          <h3 className="font-medium mb-3">Schritt 1: MX-Record hinzufügen</h3>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-xs text-gray-500 uppercase">Typ</Text>
                <Text className="font-medium">MX</Text>
              </div>
              <div>
                <Text className="text-xs text-gray-500 uppercase">Priorität</Text>
                <Text className="font-medium">10</Text>
              </div>
              <div className="col-span-2">
                <Text className="text-xs text-gray-500 uppercase">Wert</Text>
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm">mx.sendgrid.net</Text>
                  <button
                    onClick={() => handleCopy('mx.sendgrid.net', 0)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copiedIndex === 0 ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Alert type="warning" className="mt-4">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <div>
              <Text className="font-semibold">Wichtiger Hinweis</Text>
              <Text className="text-sm mt-1">
                Wenn Sie bereits einen E-Mail-Provider nutzen (z.B. Google Workspace),
                sollten Sie eine Subdomain wie "mail.{domain}" verwenden, um 
                bestehende E-Mails nicht zu beeinträchtigen.
              </Text>
            </div>
          </Alert>
        </div>
      )}

      {currentStep === 'webhook' && (
        <div>
          <h3 className="font-medium mb-3">Schritt 2: Inbound Parse konfigurieren</h3>
          
          <Text className="text-sm text-gray-600 mb-3">
            Dieser Schritt wird automatisch von SKAMP konfiguriert. 
            Die folgende URL empfängt Ihre E-Mails:
          </Text>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Text className="font-mono text-sm break-all flex-1">
                {webhookUrl}
              </Text>
              <button
                onClick={() => handleCopy(webhookUrl, 1)}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                {copiedIndex === 1 ? (
                  <CheckIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <ClipboardDocumentIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'test' && (
        <div>
          <h3 className="font-medium mb-3">Schritt 3: Empfang testen</h3>
          
          <Text className="text-sm text-gray-600 mb-4">
            Senden Sie eine Test-E-Mail an:
          </Text>

          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Text className="font-mono text-lg text-blue-900">
              test@{domain}
            </Text>
          </div>

          <Text className="text-sm text-gray-600 mt-4">
            Die E-Mail sollte innerhalb weniger Sekunden in Ihrer Inbox erscheinen.
          </Text>
        </div>
      )}
    </div>
  );
}
```

## 🔄 Alternativer Ansatz: IMAP/SMTP Integration

Falls SendGrid Inbound Parse zu komplex ist:

```typescript
// src/lib/email/imap-service.ts
import Imap from 'imap';
import { simpleParser } from 'mailparser';

export class ImapService {
  private imap: Imap;
  
  constructor(config: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
  }) {
    this.imap = new Imap({
      ...config,
      tlsOptions: { rejectUnauthorized: false }
    });
  }
  
  async fetchNewEmails(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const emails: any[] = [];
      
      this.imap.once('ready', () => {
        this.imap.openBox('INBOX', false, (err, box) => {
          if (err) reject(err);
          
          // Fetch unseen emails
          const f = this.imap.seq.fetch('1:*', {
            bodies: '',
            struct: true
          });
          
          f.on('message', (msg) => {
            let buffer = '';
            
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
            });
            
            msg.once('end', async () => {
              const parsed = await simpleParser(buffer);
              emails.push(parsed);
            });
          });
          
          f.once('end', () => {
            this.imap.end();
            resolve(emails);
          });
        });
      });
      
      this.imap.connect();
    });
  }
}
```

## 🚀 Deployment Schritte

### SendGrid Inbound Parse Setup:
1. Domain in SendGrid verifizieren (bereits gemacht)
2. MX Record hinzufügen: `mx.sendgrid.net`
3. Inbound Parse Webhook konfigurieren
4. Webhook URL: `https://app.skamp.de/api/webhooks/sendgrid/inbound`

### Firestore Indexes:
```json
{
  "indexes": [
    {
      "collectionGroup": "inbox_messages",
      "fields": [
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "folder", "order": "ASCENDING" },
        { "fieldPath": "receivedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "inbox_messages",
      "fields": [
        { "fieldPath": "threadId", "order": "ASCENDING" },
        { "fieldPath": "receivedAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## 📊 Features Roadmap

### Phase 1 (MVP):
- [x] E-Mails empfangen
- [x] E-Mails anzeigen
- [x] Auf E-Mails antworten
- [x] Basis-Ordnerstruktur

### Phase 2:
- [ ] Erweiterte Suche
- [ ] Labels & Filter
- [ ] Automatische Kategorisierung
- [ ] Massen-Aktionen

### Phase 3:
- [ ] Email Templates
- [ ] Geplanter Versand
- [ ] Follow-up Reminders
- [ ] Analytics

### Phase 4:
- [ ] Mobile App Support
- [ ] Offline-Sync
- [ ] Verschlüsselung
- [ ] Multi-Account Support

---

**Geschätzte Implementierungszeit**: 8-10 Tage
- Tag 1-2: Backend Setup (Webhook, Services)
- Tag 3-4: Frontend Inbox UI
- Tag 5-6: Email Composer & Threading
- Tag 7-8: Domain Setup Integration
- Tag 9-10: Testing & Polish

**Wichtig**: Die Inbox-Funktionalität sollte NACH der Domain-Authentifizierung implementiert werden, da sie darauf aufbaut!