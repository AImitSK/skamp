// src/components/inbox/EmailViewer.tsx
"use client";

import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { InternalNotes } from '@/components/inbox/InternalNotes';
import { TeamAssignmentUI } from '@/components/inbox/TeamAssignmentUI';
import { StatusManager } from '@/components/inbox/StatusManager';
import { AIInsightsPanel } from '@/components/inbox/AIInsightsPanel';
import { AIResponseSuggestions } from '@/components/inbox/AIResponseSuggestions';
import format from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArchiveBoxIcon,
  TrashIcon,
  StarIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';
import DOMPurify from 'dompurify';
import { useEffect, useRef } from 'react';

interface EmailViewerProps {
  thread: EmailThread;
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  onReply: (email: EmailMessage) => void;
  onForward: (email: EmailMessage) => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onStar: (emailId: string, starred: boolean) => void;
  onStatusChange?: (threadId: string, status: 'active' | 'waiting' | 'resolved' | 'archived') => void;
  onAssignmentChange?: (threadId: string, assignedTo: string | null) => void;
  onPriorityChange?: (priority: 'low' | 'normal' | 'high' | 'urgent') => void;
  onCategoryChange?: (category: string, assignee?: string) => void;
  organizationId: string;
  teamMembers?: Array<{
    id: string;
    userId: string;
    displayName: string;
    email: string;
  }>;
  showAI?: boolean;
}

interface EmailContentRendererProps {
  htmlContent?: string;
  textContent: string;
  allowExternalImages?: boolean;
}

/**
 * Enhanced Email Content Renderer with HTML sanitization
 */
function EmailContentRenderer({ htmlContent, textContent, allowExternalImages = false }: EmailContentRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Configure DOMPurify
  const sanitizeHtml = (html: string): string => {
    // Configure allowed tags and attributes for email content
    const config = {
      ALLOWED_TAGS: [
        'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 'a', 'img',
        'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'td', 'th', 'pre', 'code'
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'alt', 'src', 'width', 'height', 'style', 'class',
        'target', 'rel', 'colspan', 'rowspan'
      ],
      ALLOW_DATA_ATTR: false,
      FORBID_SCRIPTS: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
      KEEP_CONTENT: true,
      // Handle external images
      SANITIZE_DOM: true
    };

    // Add hook to handle external images
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'IMG' && !allowExternalImages) {
        const src = node.getAttribute('src');
        if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
          // Replace external images with placeholder or proxy through our server
          node.setAttribute('src', `/api/image-proxy?url=${encodeURIComponent(src)}`);
          node.setAttribute('loading', 'lazy');
        }
      }
      
      // Make all links open in new tab for security
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return DOMPurify.sanitize(html, config);
  };

  // Handle link clicks to prevent navigation issues
  useEffect(() => {
    const handleLinkClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        const href = target.getAttribute('href');
        if (href && href.startsWith('mailto:')) {
          e.preventDefault();
          // Handle mailto links if needed
          console.log('Mailto link clicked:', href);
        }
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleLinkClick);
      return () => contentElement.removeEventListener('click', handleLinkClick);
    }
  }, [htmlContent]);

  if (htmlContent) {
    const sanitizedHtml = sanitizeHtml(htmlContent);
    return (
      <div 
        ref={contentRef}
        className="prose prose-sm max-w-none email-content"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  // Fallback to plain text with basic formatting
  return (
    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
      {textContent}
    </div>
  );
}

export function EmailViewer({
  thread,
  emails,
  selectedEmail,
  onReply,
  onForward,
  onArchive,
  onDelete,
  onStar,
  onStatusChange,
  onAssignmentChange,
  onPriorityChange,
  onCategoryChange,
  organizationId,
  teamMembers,
  showAI = true
}: EmailViewerProps) {
  if (!selectedEmail || emails.length === 0) {
    return null;
  }

  const latestEmail = emails[emails.length - 1];

  // Status-Konfiguration
  const statusConfig = {
    active: {
      label: 'Aktiv',
      icon: ExclamationCircleIcon,
      color: 'blue',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200'
    },
    waiting: {
      label: 'Wartet auf Antwort',
      icon: ClockIcon,
      color: 'yellow',
      bgClass: 'bg-yellow-50',
      textClass: 'text-yellow-700',
      borderClass: 'border-yellow-200'
    },
    resolved: {
      label: 'Abgeschlossen',
      icon: CheckCircleIcon,
      color: 'green',
      bgClass: 'bg-green-50',
      textClass: 'text-green-700',
      borderClass: 'border-green-200'
    },
    archived: {
      label: 'Archiviert',
      icon: ArchiveBoxIcon,
      color: 'gray',
      bgClass: 'bg-gray-50',
      textClass: 'text-gray-700',
      borderClass: 'border-gray-200'
    }
  };

  const currentStatus = thread.status || 'active';
  const statusInfo = statusConfig[currentStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">
                {thread.subject}
              </h2>
              {/* Status Badge */}
              <Badge 
                color={statusInfo.color as any}
                className={clsx(
                  'flex items-center gap-1.5',
                  statusInfo.bgClass,
                  statusInfo.textClass,
                  statusInfo.borderClass,
                  'border'
                )}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStar(latestEmail.id!, !latestEmail.isStarred)}
              className={clsx(
                'p-2 rounded-lg hover:bg-gray-100',
                latestEmail.isStarred ? 'text-yellow-400' : 'text-gray-400'
              )}
            >
              <StarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onArchive(latestEmail.id!)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <ArchiveBoxIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete(latestEmail.id!)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-4">
          <Button 
            onClick={() => onReply(latestEmail)}
            className="bg-[#005fab] hover:bg-[#004a8c] text-white"
          >
            <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
            Antworten
          </Button>
          <Button 
            onClick={() => onForward(latestEmail)}
            plain
          >
            <ArrowUturnRightIcon className="h-4 w-4 mr-2" />
            Weiterleiten
          </Button>
        </div>

        {/* Team & Status Management */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <TeamAssignmentUI
            thread={thread}
            organizationId={organizationId}
            onAssignmentChange={onAssignmentChange}
            compact={false}
          />
          <StatusManager
            thread={thread}
            onStatusChange={onStatusChange}
            showSLA={true}
            showTimers={true}
          />
        </div>
      </div>

      {/* Email Thread */}
      <div className="flex-1 overflow-y-auto">
        {emails.map((email, index) => (
          <div 
            key={email.id}
            className={clsx(
              'border-b',
              index === emails.length - 1 ? 'bg-white' : 'bg-gray-50'
            )}
          >
            {/* Email Header */}
            <div className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium">
                    {email.from.name ? email.from.name[0].toUpperCase() : email.from.email[0].toUpperCase()}
                  </div>
                  
                  {/* Sender info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {email.from.name || email.from.email}
                      </span>
                      <span className="text-sm text-gray-500">
                        &lt;{email.from.email}&gt;
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      an {email.to.map(t => t.name || t.email).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-sm text-gray-500">
                  {email.receivedAt?.toDate?.() 
                    ? format(email.receivedAt.toDate(), 'dd. MMM yyyy, HH:mm')
                    : ''
                  }
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="px-6 pb-6">
              <EmailContentRenderer
                htmlContent={email.htmlContent}
                textContent={email.textContent || ''}
                allowExternalImages={false}
              />

              {/* Attachments */}
              {email.attachments && email.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Anhänge ({email.attachments.length})
                  </p>
                  <div className="space-y-2">
                    {email.attachments.map((attachment) => (
                      <div 
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <PaperClipIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700">{attachment.filename}</span>
                        <span className="text-xs text-gray-500">
                          ({Math.round(attachment.size / 1024)} KB)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reply (nur beim letzten Email) */}
            {index === emails.length - 1 && (
              <div className="px-6 pb-4">
                <button
                  onClick={() => onReply(email)}
                  className="text-sm text-[#005fab] hover:text-[#004a8c] font-medium"
                >
                  Schnellantwort...
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Features */}
      {showAI && selectedEmail && (
        <div className="border-t border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* AI Insights */}
            <AIInsightsPanel
              email={selectedEmail}
              thread={thread}
              context={{
                threadHistory: emails.map(e => e.textContent || e.htmlContent || '').filter(Boolean),
                customerInfo: thread.participants[0]?.name || thread.participants[0]?.email,
                campaignContext: thread.tags?.join(', ')
              }}
              onPriorityChange={onPriorityChange}
              onCategoryChange={onCategoryChange}
              collapsed={false}
            />

            {/* AI Response Suggestions */}
            <AIResponseSuggestions
              email={selectedEmail}
              thread={thread}
              onUseSuggestion={(responseText) => {
                // Create a synthetic email object for reply
                const replyEmail = {
                  ...selectedEmail,
                  textContent: responseText,
                  htmlContent: responseText
                };
                onReply(replyEmail);
              }}
              context={{
                customerName: thread.participants[0]?.name,
                customerHistory: `Vorherige E-Mails in diesem Thread: ${emails.length}`,
                companyInfo: organizationId,
                threadHistory: emails.map(e => e.textContent || e.htmlContent || '').filter(Boolean)
              }}
              collapsed={false}
            />
          </div>
        </div>
      )}

      {/* Internal Notes */}
      <InternalNotes
        threadId={thread.id!}
        emailId={selectedEmail?.id}
        organizationId={organizationId}
        teamMembers={teamMembers}
      />
    </div>
  );
}