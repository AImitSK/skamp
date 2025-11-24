// src/components/inbox/EmailViewer.tsx
"use client";

import { EmailMessage, EmailThread } from '@/types/inbox-enhanced';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InternalNotes } from '@/components/inbox/InternalNotes';
import format from 'date-fns/format';
import { de } from 'date-fns/locale/de';
import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  TrashIcon,
  PaperClipIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import DOMPurify from 'dompurify';
import { useEffect, useRef } from 'react';
import { toastService } from '@/lib/utils/toast';

interface EmailViewerProps {
  thread: EmailThread;
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  onReply: (email: EmailMessage) => void;
  onForward: (email: EmailMessage) => void;
  onDelete: (emailId: string) => void;
  onStar: (emailId: string, starred: boolean) => void;
  onMarkAsRead?: (emailId: string) => void;
  onStatusChange?: (threadId: string, status: 'active' | 'waiting' | 'resolved' | 'archived') => void;
  organizationId: string;
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
          // Füge loading-Klasse hinzu (wird per onLoad entfernt)
          node.setAttribute('class', 'loading');
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

  // Handle image loading to remove skeleton loader
  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    const images = contentElement.querySelectorAll('img[src*="image-proxy"]');

    const handleImageLoad = (e: Event) => {
      const img = e.target as HTMLImageElement;
      img.classList.remove('loading');
    };

    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      img.classList.remove('loading');
      console.warn('Image failed to load:', img.src);
    };

    images.forEach((img) => {
      // Wenn Bild bereits geladen ist, entferne loading-Klasse sofort
      if ((img as HTMLImageElement).complete) {
        img.classList.remove('loading');
      } else {
        img.addEventListener('load', handleImageLoad);
        img.addEventListener('error', handleImageError);
      }
    });

    // Cleanup
    return () => {
      images.forEach((img) => {
        img.removeEventListener('load', handleImageLoad);
        img.removeEventListener('error', handleImageError);
      });
    };
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
  onDelete,
  onStar,
  onMarkAsRead,
  onStatusChange,
  organizationId
}: EmailViewerProps) {
  
  // Mark email as read when selected (but only if it's unread and has an ID)
  useEffect(() => {
    if (selectedEmail && selectedEmail.id && !selectedEmail.isRead && onMarkAsRead) {
      // Add a small delay to avoid marking as read immediately when just browsing
      const timer = setTimeout(() => {
        onMarkAsRead(selectedEmail.id!);
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timer);
    }
  }, [selectedEmail?.id, selectedEmail?.isRead, onMarkAsRead]);
  
  if (!selectedEmail || emails.length === 0) {
    return null;
  }

  const latestEmail = emails[emails.length - 1];

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden">
      {/* Compact Header - Single Line */}
      <div className="border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Subject */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {thread.subject}
            </h2>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onReply(latestEmail)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-[#005fab]"
              title="Antworten"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onForward(latestEmail)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
              title="Weiterleiten"
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
              onClick={() => onStar(latestEmail.id!, !latestEmail.isStarred)}
              className={clsx(
                'p-1.5 rounded hover:bg-gray-100',
                latestEmail.isStarred ? 'text-yellow-500' : 'text-gray-400'
              )}
              title="Markieren"
            >
              <StarIconSolid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(latestEmail.id!)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400"
              title="Löschen"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {/* Email Thread */}
        <div className="pb-4">
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
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        download={attachment.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50 hover:border-[#005fab] transition-colors group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <PaperClipIcon className="h-5 w-5 text-gray-400 group-hover:text-[#005fab] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 group-hover:text-[#005fab] truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {Math.round(attachment.size / 1024)} KB
                              {attachment.inline && ' • Inline'}
                            </p>
                          </div>
                        </div>
                        <ArrowDownTrayIcon className="h-5 w-5 text-gray-400 group-hover:text-[#005fab] flex-shrink-0" />
                      </a>
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
      </div>

      {/* Internal Notes - Sticky Bottom */}
      <InternalNotes
        threadId={thread.id!}
        emailId={selectedEmail?.id}
        organizationId={organizationId}
      />
    </div>
  );
}