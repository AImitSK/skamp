// src/components/inbox/ComposeEmail.tsx
"use client";

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Label } from '@/components/ui/fieldset';
import EmailEditor from '@/components/pr/email/EmailEditor';
import { EmailMessage } from '@/types/inbox-enhanced';
import { emailAddressService } from '@/lib/email/email-address-service';
import { emailSignatureService } from '@/lib/email/email-signature-service';
import { XMarkIcon, PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { EmailSignature } from '@/types/email-enhanced';
import { InboxAssetSelectorModal } from '@/components/inbox/InboxAssetSelectorModal';
import { CampaignAssetAttachment } from '@/types/pr';
import { toastService } from '@/lib/utils/toast';

interface ComposeEmailProps {
  organizationId: string;
  mode: 'new' | 'reply' | 'forward';
  replyToEmail?: EmailMessage | null;
  currentMailboxEmail?: string;
  onClose: () => void;
  onSend: (data: any) => void;
}

export function ComposeEmail({
  organizationId,
  mode,
  replyToEmail,
  currentMailboxEmail,
  onClose,
  onSend
}: ComposeEmailProps) {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  // Postfächer statt Email-Adressen
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string>('');
  const [loadingMailboxes, setLoadingMailboxes] = useState(true);

  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('');
  const [loadingSignatures, setLoadingSignatures] = useState(true);

  // Attachments state
  const [attachments, setAttachments] = useState<CampaignAssetAttachment[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);

  // Load mailboxes and signatures
  useEffect(() => {
    const loadMailboxData = async () => {
      try {
        if (!user?.uid) {
          console.error('No user available for loading mailbox data');
          return;
        }

        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/firebase-init');

        const allMailboxes: any[] = [];

        // 1. Load Domain-Mailboxes (gefiltert - keine Default-Domains)
        const domainMailboxesRef = collection(db, 'inbox_domain_mailboxes');
        const domainQuery = query(
          domainMailboxesRef,
          where('organizationId', '==', organizationId),
          where('status', '==', 'active')
        );
        const domainSnapshot = await getDocs(domainQuery);

        for (const doc of domainSnapshot.docs) {
          const data = doc.data();
          // Filter: Ignoriere Default-Domains (celeropress.com, sk-online-marketing.de)
          if (data.inboxAddress?.includes('celeropress.com@') ||
              data.inboxAddress?.includes('sk-online-marketing.de@')) {
            console.log('⏭️  Skipping default domain mailbox:', data.inboxAddress);
            continue;
          }

          allMailboxes.push({
            id: doc.id,
            type: 'domain',
            label: `${data.domain} (Domain)`,
            inboxAddress: data.inboxAddress,
            domain: data.domain,
            ...data
          });
        }

        // 2. Load Projekt-Mailboxes
        const projectMailboxesRef = collection(db, 'inbox_project_mailboxes');
        const projectQuery = query(
          projectMailboxesRef,
          where('organizationId', '==', organizationId),
          where('status', 'in', ['active', 'completed'])
        );
        const projectSnapshot = await getDocs(projectQuery);

        for (const doc of projectSnapshot.docs) {
          const data = doc.data();
          allMailboxes.push({
            id: doc.id,
            type: 'project',
            label: `${data.projectName} (Projekt)`,
            inboxAddress: data.inboxAddress,
            projectName: data.projectName,
            ...data
          });
        }

        console.log('📬 Loaded mailboxes:', allMailboxes);
        setMailboxes(allMailboxes);

        // Select current mailbox if available
        if (currentMailboxEmail) {
          const currentMailbox = allMailboxes.find(
            mb => mb.inboxAddress?.toLowerCase() === currentMailboxEmail.toLowerCase()
          );
          if (currentMailbox) {
            setSelectedMailboxId(currentMailbox.id);
            console.log('✅ Pre-selected current mailbox:', currentMailbox.label);
          }
        } else {
          // Fallback: Select first mailbox
          if (allMailboxes.length > 0) {
            setSelectedMailboxId(allMailboxes[0].id);
          }
        }

        // Load signatures
        const sigs = await emailSignatureService.getByOrganization(organizationId);
        console.log('✍️ Loaded signatures:', sigs);
        setSignatures(sigs);

        // Auto-select default signature
        const defaultSignature = sigs.find(sig => sig.isDefault);
        if (defaultSignature) {
          setSelectedSignatureId(defaultSignature.id!);
        }
      } catch (error) {
        console.error('Failed to load mailbox data:', error);
      } finally {
        setLoadingMailboxes(false);
        setLoadingSignatures(false);
      }
    };

    if (user?.uid) {
      loadMailboxData();
    }
  }, [organizationId, user?.uid, currentMailboxEmail]);


  // Helper function to merge signature with content
  const mergeSignatureWithContent = (baseContent: string, signatureId: string): string => {
    if (!signatureId || signatures.length === 0) {
      return baseContent;
    }
    
    const signature = signatures.find(sig => sig.id === signatureId);
    if (!signature) {
      return baseContent;
    }
    
    const signatureHtml = `
<div class="signature" style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
  ${signature.content || ''}
</div>`;

    // Signatur wird immer unter der Nachricht eingefügt
    return baseContent + signatureHtml;
  };

  // Initialize fields based on mode
  useEffect(() => {
    if (mode === 'reply' && replyToEmail) {
      setTo(replyToEmail.from.email);
      setSubject(`Re: ${replyToEmail.subject.replace(/^Re:\s*/i, '')}`);

      // Postfach ist bereits vorausgewählt (über currentMailboxEmail)
      // Keine weitere Logik nötig

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
    } else if (mode === 'new') {
      // For new emails, start with empty content (signature will be added on send)
      setContent('');
    }
  }, [mode, replyToEmail]);

  const handleSend = async () => {
    if (!to || !subject || !content || !selectedMailboxId) {
      toastService.error('Bitte füllen Sie alle Pflichtfelder aus und wählen Sie ein Postfach');
      return;
    }

    setSending(true);

    try {
      // Get selected mailbox
      const selectedMailbox = mailboxes.find(mb => mb.id === selectedMailboxId);
      if (!selectedMailbox) {
        throw new Error('Kein Postfach ausgewählt');
      }

      console.log('📬 Selected mailbox:', selectedMailbox);

      // Load email address for this mailbox
      const { emailAddressService } = await import('@/lib/email/email-address-service');
      let fromAddress: any;

      if (selectedMailbox.type === 'domain') {
        // Domain-Postfach: Lade Default-Email-Adresse für diese Domain
        const addresses = await emailAddressService.getByOrganization(organizationId, user?.uid || '');
        fromAddress = addresses.find(addr => addr.domain === selectedMailbox.domain) || addresses[0];
      } else {
        // Projekt-Postfach: Lade Email-Adresse für dieses Projekt
        // TODO: Projekt hat emailAddressId? Wenn nicht, nutze Default
        const addresses = await emailAddressService.getByOrganization(organizationId, user?.uid || '');
        fromAddress = addresses[0]; // Fallback: Erste verfügbare Adresse
      }

      if (!fromAddress) {
        throw new Error('Keine Absender-Adresse gefunden');
      }

      console.log('📧 From address:', fromAddress.email);

      // Parse recipients - stelle sicher dass name nie undefined ist
      const toAddresses = to.split(',').map(email => ({
        email: email.trim(),
        name: ''
      }));

      // Prepare email data - nur EmailAddressInfo konforme Felder
      const fromData = {
        email: fromAddress.email,
        name: fromAddress.displayName || ''
      };

      // WICHTIG: Reply-To ist die Inbox-Adresse des gewählten Postfachs
      const replyToAddress = selectedMailbox.inboxAddress;
      console.log('📬 Reply-To:', replyToAddress);

      // Merge signature with content before sending
      const finalContent = mergeSignatureWithContent(content, selectedSignatureId);

      const emailData = {
        to: toAddresses,
        from: fromData,
        subject,
        htmlContent: finalContent,
        textContent: finalContent.replace(/<[^>]*>/g, ''), // Simple HTML strip
      };

      // Send email via API - replyToAddress separat übergeben
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...emailData,
          emailAddressId: fromAddress.id,
          mailboxId: selectedMailbox.id,
          mailboxType: selectedMailbox.type,
          replyToMessageId: mode === 'reply' ? replyToEmail?.messageId : undefined,
          // WICHTIG: Reply-To Adresse = Inbox-Adresse des gewählten Postfachs
          replyTo: replyToAddress,
          // Thread-ID und Campaign-ID für korrekte Zuordnung
          threadId: replyToEmail?.threadId,
          campaignId: replyToEmail?.campaignId,
          // Zusätzliche Daten für Server-Side Thread-Erstellung und Speicherung
          organizationId,
          userId: user?.uid || organizationId,
          signatureId: selectedSignatureId || undefined,
          mode,
          domainId: selectedMailbox.type === 'domain' ? selectedMailbox.domainId : replyToEmail?.domainId,
          projectId: selectedMailbox.type === 'project' ? selectedMailbox.projectId : replyToEmail?.projectId,
          // Attachments
          attachments: attachments.map(att => ({
            filename: att.metadata?.fileName || 'attachment',
            path: att.metadata?.thumbnailUrl || '',
            contentType: att.metadata?.fileType || 'application/octet-stream'
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Extrahiere bessere Fehlermeldung aus SendGrid Error
        const errorMessage = error.error || error.message || 'Failed to send email';
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('📧 Email sent successfully:', result);

      // Thread-Erstellung und E-Mail-Speicherung erfolgt jetzt in der API
      console.log('✅ Thread and email saved by API:', {
        threadId: result.threadId,
        messageId: result.messageId
      });

      // Success Toast
      toastService.success('E-Mail erfolgreich versendet');

      // Call parent onSend callback
      onSend({
        success: true,
        messageId: result.messageId,
        threadId: result.threadId
      });

      // Close dialog
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      toastService.error(`Fehler beim Senden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="sm:max-w-4xl">
      <div className="flex flex-col h-[70vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {mode === 'new' && 'Neue E-Mail'}
            {mode === 'reply' && 'Antworten'}
            {mode === 'forward' && 'Weiterleiten'}
          </h2>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Mailbox selector */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <Label>Absender-Postfach</Label>
                <Select
                  value={selectedMailboxId}
                  onChange={(e) => setSelectedMailboxId(e.target.value)}
                  disabled={loadingMailboxes || mailboxes.length === 0}
                >
                  {loadingMailboxes ? (
                    <option>Lade Postfächer...</option>
                  ) : mailboxes.length === 0 ? (
                    <option>Keine Postfächer verfügbar</option>
                  ) : (
                    <>
                      {/* Domain-Postfächer */}
                      {mailboxes.filter(mb => mb.type === 'domain').length > 0 && (
                        <optgroup label="Domain-Postfächer">
                          {mailboxes.filter(mb => mb.type === 'domain').map(mb => (
                            <option key={mb.id} value={mb.id}>
                              {mb.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {/* Projekt-Postfächer */}
                      {mailboxes.filter(mb => mb.type === 'project').length > 0 && (
                        <optgroup label="Projekt-Postfächer">
                          {mailboxes.filter(mb => mb.type === 'project').map(mb => (
                            <option key={mb.id} value={mb.id}>
                              {mb.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </Select>
              </Field>

              <Field>
                <Label>Signatur</Label>
                <Select
                  value={selectedSignatureId}
                  onChange={(e) => setSelectedSignatureId(e.target.value)}
                  disabled={loadingSignatures || signatures.length === 0}
                >
                  <option value="">Keine Signatur</option>
                  {loadingSignatures ? (
                    <option>Lade Signaturen...</option>
                  ) : (
                    signatures.map(sig => (
                      <option key={sig.id} value={sig.id}>
                        {sig.name} {sig.isDefault ? '(Standard)' : ''}
                      </option>
                    ))
                  )}
                </Select>
              </Field>
            </div>

            {/* An-Feld */}
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="An"
              required
            />

            {/* Betreff */}
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Betreff"
              required
            />

            {/* Nachricht - kein Label für kompakteres Design */}
            <div>
              <EmailEditor
                content={content}
                onChange={setContent}
                placeholder="Nachricht"
                minHeight="300px"
              />

              {/* Attachments Liste */}
              {attachments.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Anhänge:</span>
                    <span className="text-xs text-gray-500">{attachments.length} Datei{attachments.length !== 1 ? 'en' : ''}</span>
                  </div>
                  <div className="space-y-1">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <div className="flex items-center gap-2 min-w-0">
                          <PaperClipIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700 truncate">{attachment.metadata?.fileName || 'Unbekannte Datei'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSignatureId && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-700">Signatur-Vorschau (wird unter der Nachricht eingefügt):</span>
                  </div>
                  <div className="text-sm text-gray-600 border-t pt-2">
                    {(() => {
                      const signature = signatures.find(sig => sig.id === selectedSignatureId);
                      if (signature) {
                        return (
                          <div 
                            dangerouslySetInnerHTML={{ 
                              __html: signature.content || '' 
                            }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAssetModal(true)}
              className="p-2 hover:bg-gray-200 rounded-lg text-gray-600"
              title="Anhänge hinzufügen"
            >
              <PaperClipIcon className="h-5 w-5" />
            </button>
            {attachments.length > 0 && (
              <span className="text-sm text-gray-600">
                {attachments.length} Anhang{attachments.length !== 1 ? 'e' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button plain onClick={onClose}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || mailboxes.length === 0}
              className="bg-[#005fab] hover:bg-[#004a8c] text-white"
            >
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              {sending ? 'Wird gesendet...' : 'Senden'}
            </Button>
          </div>
        </div>
      </div>

      {/* Neues Inbox Asset Selector Modal */}
      {showAssetModal && (
        <InboxAssetSelectorModal
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          organizationId={organizationId}
          userId={user?.uid}
          onAssetsSelected={(assets) => {
            setAttachments([...attachments, ...assets]);
            setShowAssetModal(false);
          }}
        />
      )}
    </Dialog>
  );
}