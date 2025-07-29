// src/components/inbox/ComposeEmail.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Field, Label } from '@/components/fieldset';
import { RichTextEditor } from '@/components/RichTextEditor';
import { EmailMessage } from '@/types/inbox-enhanced';
import { emailAddressService } from '@/lib/email/email-address-service';
import { emailMessageService } from '@/lib/email/email-message-service';
import { threadMatcherService } from '@/lib/email/thread-matcher-service-flexible';
import { XMarkIcon, PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/20/solid';
import { Select } from '@/components/select';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

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
  const [emailAddresses, setEmailAddresses] = useState<any[]>([]);
  const [selectedEmailAddressId, setSelectedEmailAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Load email addresses
  useEffect(() => {
    const loadEmailAddresses = async () => {
      try {
        const addresses = await emailAddressService.getByOrganization(organizationId, organizationId);
        setEmailAddresses(addresses);
        
        // Select default address
        const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
        if (defaultAddress && defaultAddress.id) {
          setSelectedEmailAddressId(defaultAddress.id);
        }
      } catch (error) {
        console.error('Failed to load email addresses:', error);
      } finally {
        setLoadingAddresses(false);
      }
    };

    loadEmailAddresses();
  }, [organizationId]);

  // Initialize fields based on mode
  useEffect(() => {
    if (mode === 'reply' && replyToEmail) {
      setTo(replyToEmail.from.email);
      setSubject(`Re: ${replyToEmail.subject.replace(/^Re:\s*/i, '')}`);
      
      // WICHTIG: Setze die richtige E-Mail-Adresse für Antworten
      // Finde die E-Mail-Adresse, an die die ursprüngliche E-Mail ging
      const recipientAddress = emailAddresses.find(addr => {
        // Prüfe ob die E-Mail an eine unserer Adressen ging
        const wasDirectRecipient = replyToEmail.to.some(to => to.email === addr.email);
        
        // WICHTIG: Prüfe ob es eine Reply-To-Adresse gibt (z.B. pr-reply-xxx@domain.de)
        // Diese wird bei PR-Kampagnen verwendet
        if (replyToEmail.replyTo?.email) {
          // Wenn die Reply-To zu unserer Domain gehört, finde die passende E-Mail-Adresse
          const replyToDomain = replyToEmail.replyTo.email.split('@')[1];
          const addressDomain = addr.email.split('@')[1];
          
          // Verwende die E-Mail-Adresse mit der gleichen Domain wie die Reply-To
          if (replyToDomain === addressDomain) {
            console.log('📧 Using email address matching reply-to domain:', addr.email);
            return true;
          }
        }
        
        return wasDirectRecipient;
      });
      
      if (recipientAddress && recipientAddress.id) {
        setSelectedEmailAddressId(recipientAddress.id);
        console.log('✅ Selected email address for reply:', recipientAddress.email);
      }
      
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
  }, [mode, replyToEmail, emailAddresses]);

  const handleSend = async () => {
    if (!to || !subject || !content || !selectedEmailAddressId) {
      alert('Bitte füllen Sie alle Pflichtfelder aus und wählen Sie eine Absender-Adresse');
      return;
    }

    setSending(true);
    
    try {
      // Get selected email address
      const fromAddress = emailAddresses.find(addr => addr.id === selectedEmailAddressId);
      if (!fromAddress) {
        throw new Error('Keine Absender-Adresse ausgewählt');
      }

      // Parse recipients - stelle sicher dass name nie undefined ist
      const toAddresses = to.split(',').map(email => ({
        email: email.trim(),
        name: ''
      }));
      const ccAddresses = cc ? cc.split(',').map(email => ({
        email: email.trim(),
        name: ''
      })) : [];
      const bccAddresses = bcc ? bcc.split(',').map(email => ({
        email: email.trim(),
        name: ''
      })) : [];

      // Prepare email data - nur EmailAddressInfo konforme Felder
      const fromData = {
        email: fromAddress.email,
        name: fromAddress.displayName || ''
      };

      // WICHTIG: Generiere Reply-To für ALLE E-Mails (für Inbound Parse)
      let replyToAddress: string | undefined;
      
      // Hole die kurze ID der E-Mail-Adresse für die Reply-To
      const shortEmailAddressId = selectedEmailAddressId.substring(0, 8).toLowerCase();
      const domain = fromAddress.email.split('@')[1];
      const localPart = fromAddress.email.split('@')[0];
      
      if (mode === 'reply' && replyToEmail?.replyTo?.email) {
        // Prüfe ob die ursprüngliche E-Mail eine PR-Kampagnen Reply-To hatte
        const originalReplyTo = replyToEmail.replyTo.email;
        const replyToPattern = /^(.+)-([a-zA-Z0-9]+)-([a-zA-Z0-9]+)@inbox\.(.+)$/;
        const match = originalReplyTo.match(replyToPattern);
        
        if (match) {
          // Es ist eine PR-Kampagne! Verwende das gleiche Format
          const [, prefix, userId, campaignId, ] = match;
          // Verwende die echte E-Mail-Adress-ID statt einer zufälligen
          replyToAddress = `${localPart}-${organizationId.toLowerCase()}-${shortEmailAddressId}@inbox.${domain}`;
          console.log('🎯 Generated PR campaign reply-to:', replyToAddress);
        } else {
          // Normale Antwort - verwende E-Mail-Adress-ID
          replyToAddress = `${localPart}-${organizationId.toLowerCase()}-${shortEmailAddressId}@inbox.${domain}`;
          console.log('📧 Generated standard reply-to:', replyToAddress);
        }
      } else if (mode === 'new' || mode === 'forward') {
        // NEUE E-Mail oder Weiterleitung - verwende E-Mail-Adress-ID
        replyToAddress = `${localPart}-${organizationId.toLowerCase()}-${shortEmailAddressId}@inbox.${domain}`;
        console.log('📮 Generated new email reply-to:', replyToAddress);
      }

      const emailData = {
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
        from: fromData,
        subject,
        htmlContent: content,
        textContent: content.replace(/<[^>]*>/g, ''), // Simple HTML strip
      };

      // Send email via API - replyToAddress separat übergeben
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...emailData,
          emailAddressId: selectedEmailAddressId,
          replyToMessageId: mode === 'reply' ? replyToEmail?.messageId : undefined,
          // WICHTIG: Reply-To Adresse für PR-Kampagnen
          replyTo: replyToAddress,
          // Thread-ID und Campaign-ID für korrekte Zuordnung
          threadId: replyToEmail?.threadId,
          campaignId: replyToEmail?.campaignId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      const result = await response.json();
      console.log('📧 Email sent successfully:', result);

      // Create or find thread
      let threadId = replyToEmail?.threadId;
      
      if (!threadId) {
        // Create new thread for new emails
        const threadResult = await threadMatcherService.findOrCreateThread({
          messageId: result.messageId,
          subject,
          from: fromData,
          to: toAddresses,
          organizationId,
          inReplyTo: mode === 'reply' ? replyToEmail?.messageId : null,
          references: mode === 'reply' && replyToEmail ? [replyToEmail.messageId] : []
        });
        
        threadId = threadResult.threadId || threadResult.thread?.id;
        console.log('📨 Thread created/found:', threadId);
      }

      // Save sent email to database
      const emailMessageData: any = {
        messageId: result.messageId,
        threadId: threadId || `thread_${Date.now()}`,
        from: fromData,
        to: toAddresses,
        subject,
        textContent: emailData.textContent,
        htmlContent: emailData.htmlContent,
        snippet: emailData.textContent.substring(0, 150),
        folder: 'sent' as const,
        isRead: true,
        isStarred: false,
        isArchived: false,
        isDraft: false,
        labels: [],
        importance: 'normal' as const,
        emailAccountId: selectedEmailAddressId,
        organizationId,
        userId: organizationId,
        receivedAt: serverTimestamp() as Timestamp,
        sentAt: serverTimestamp() as Timestamp,
        attachments: []
      };

      // Nur hinzufügen wenn nicht undefined oder leer
      if (ccAddresses.length > 0) {
        emailMessageData.cc = ccAddresses;
      }
      if (bccAddresses.length > 0) {
        emailMessageData.bcc = bccAddresses;
      }
      
      // Optionale Felder für Reply/Forward
      if (mode === 'reply' && replyToEmail) {
        emailMessageData.inReplyTo = replyToEmail.messageId;
        emailMessageData.references = [replyToEmail.messageId];
      }
      
      // Headers als leeres Objekt
      emailMessageData.headers = {};

      console.log('💾 Saving email to database:', emailMessageData);
      await emailMessageService.create(emailMessageData);
      console.log('✅ Email saved successfully');

      // Call parent onSend callback
      onSend({
        success: true,
        messageId: result.messageId
      });

      // Close dialog
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert(`Fehler beim Senden der E-Mail: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
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
            {/* From selector */}
            <Field>
              <Label>Von</Label>
              <Select
                value={selectedEmailAddressId}
                onChange={(e) => setSelectedEmailAddressId(e.target.value)}
                disabled={loadingAddresses || emailAddresses.length === 0}
              >
                {loadingAddresses ? (
                  <option>Lade E-Mail-Adressen...</option>
                ) : emailAddresses.length === 0 ? (
                  <option>Keine E-Mail-Adressen verfügbar</option>
                ) : (
                  emailAddresses.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.displayName} &lt;{addr.email}&gt;
                    </option>
                  ))
                )}
              </Select>
            </Field>

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
              disabled={sending || emailAddresses.length === 0}
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