// src/components/inbox/ComposeEmail.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Field, Label } from '@/components/fieldset';
import { RichTextEditor } from '@/components/RichTextEditor';
import { EmailMessage } from '@/types/inbox-enhanced';
import { XMarkIcon, PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/20/solid';

interface ComposeEmailProps {
  organizationId: string;
  mode: 'new' | 'reply' | 'forward';
  replyToEmail?: EmailMessage | null;
  onClose: () => void;
  onSend: (data: any) => void;
}

export function ComposeEmail({
  organizationId,
  mode,
  replyToEmail,
  onClose,
  onSend
}: ComposeEmailProps) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  // Initialize fields based on mode
  useEffect(() => {
    if (mode === 'reply' && replyToEmail) {
      setTo(replyToEmail.from.email);
      setSubject(`Re: ${replyToEmail.subject.replace(/^Re:\s*/i, '')}`);
      
      // Quote original message
      const quote = `
<br><br>
<div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px; color: #666;">
  <p>Am ${new Date(replyToEmail.receivedAt.toDate()).toLocaleDateString('de-DE')} schrieb ${replyToEmail.from.name || replyToEmail.from.email}:</p>
  ${replyToEmail.htmlContent || `<p>${replyToEmail.textContent}</p>`}
</div>`;
      setContent(quote);
    } else if (mode === 'forward' && replyToEmail) {
      setSubject(`Fwd: ${replyToEmail.subject.replace(/^Fwd:\s*/i, '')}`);
      
      // Forward original message
      const forward = `
<br><br>
---------- Weitergeleitete Nachricht ----------<br>
Von: ${replyToEmail.from.name || replyToEmail.from.email} &lt;${replyToEmail.from.email}&gt;<br>
Datum: ${new Date(replyToEmail.receivedAt.toDate()).toLocaleDateString('de-DE')}<br>
Betreff: ${replyToEmail.subject}<br>
An: ${replyToEmail.to.map(t => `${t.name || t.email} <${t.email}>`).join(', ')}<br>
<br>
${replyToEmail.htmlContent || `<p>${replyToEmail.textContent}</p>`}`;
      setContent(forward);
    }
  }, [mode, replyToEmail]);

  const handleSend = async () => {
    if (!to || !subject || !content) {
      alert('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    setSending(true);
    
    try {
      await onSend({
        to: to.split(',').map(email => email.trim()),
        cc: cc ? cc.split(',').map(email => email.trim()) : [],
        bcc: bcc ? bcc.split(',').map(email => email.trim()) : [],
        subject,
        htmlContent: content,
        textContent: content.replace(/<[^>]*>/g, ''), // Simple HTML strip
        replyToMessageId: mode === 'reply' ? replyToEmail?.messageId : undefined,
        threadId: replyToEmail?.threadId
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Fehler beim Senden der E-Mail');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="sm:max-w-4xl">
      <div className="flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {mode === 'new' && 'Neue E-Mail'}
            {mode === 'reply' && 'Antworten'}
            {mode === 'forward' && 'Weiterleiten'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <Field>
              <Label>An</Label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="empfaenger@beispiel.de"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>CC</Label>
                <Input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Kopie an..."
                />
              </Field>

              <Field>
                <Label>BCC</Label>
                <Input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Blindkopie an..."
                />
              </Field>
            </div>

            <Field>
              <Label>Betreff</Label>
              <Input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Betreff eingeben..."
                required
              />
            </Field>

            <Field>
              <Label>Nachricht</Label>
              <RichTextEditor
                content={content}
                onChange={setContent}
              />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-600">
              <PaperClipIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Button plain onClick={onClose}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sending}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            >
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              {sending ? 'Wird gesendet...' : 'Senden'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}