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
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [emailAddresses, setEmailAddresses] = useState<any[]>([]);
  const [selectedEmailAddressId, setSelectedEmailAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('');
  const [signaturePosition, setSignaturePosition] = useState<'above' | 'below'>('below');
  const [loadingSignatures, setLoadingSignatures] = useState(true);

  // Load email addresses and signatures
  useEffect(() => {
    const loadEmailData = async () => {
      try {
        if (!user?.uid) {
          console.error('No user available for loading email data');
          return;
        }
        
        // Load email addresses
        const addresses = await emailAddressService.getByOrganization(organizationId, user?.uid || '');
        console.log('📧 Loaded email addresses:', addresses);
        setEmailAddresses(addresses);
        
        // Select default address
        const defaultAddress = addresses.find(addr => addr.isDefault) || addresses[0];
        if (defaultAddress && defaultAddress.id) {
          setSelectedEmailAddressId(defaultAddress.id);
        }
        
        // Load signatures
        const sigs = await emailSignatureService.getByOrganization(organizationId);
        console.log('✍️ Loaded signatures:', sigs);
        setSignatures(sigs);
        
        // Auto-select signature based on email address or default
        if (defaultAddress && defaultAddress.id) {
          const addressSignatures = sigs.filter(sig => 
            sig.emailAddressIds?.includes(defaultAddress.id!)
          );
          
          if (addressSignatures.length > 0) {
            setSelectedSignatureId(addressSignatures[0].id!);
          } else {
            const defaultSignature = sigs.find(sig => sig.isDefault);
            if (defaultSignature) {
              setSelectedSignatureId(defaultSignature.id!);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load email data:', error);
      } finally {
        setLoadingAddresses(false);
        setLoadingSignatures(false);
      }
    };

    if (user?.uid) {
      loadEmailData();
    }
  }, [organizationId, user?.uid]);

  // Auto-update signature when email address changes
  useEffect(() => {
    if (selectedEmailAddressId && signatures.length > 0) {
      // Find signatures for this email address
      const addressSignatures = signatures.filter(sig => 
        sig.emailAddressIds?.includes(selectedEmailAddressId)
      );
      
      if (addressSignatures.length > 0) {
        setSelectedSignatureId(addressSignatures[0].id!);
      } else {
        // Use default signature if no address-specific signature
        const defaultSignature = signatures.find(sig => sig.isDefault);
        if (defaultSignature) {
          setSelectedSignatureId(defaultSignature.id!);
        }
      }
    }
  }, [selectedEmailAddressId, signatures]);

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
    
    if (signaturePosition === 'above') {
      return signatureHtml + '<br>' + baseContent;
    } else {
      return baseContent + signatureHtml;
    }
  };

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
      
      // Quote original message (without signature for now)
      const quote = `
<br><br>
<div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px; color: #666;">
  <p>Am ${new Date(replyToEmail.receivedAt.toDate()).toLocaleDateString('de-DE')} schrieb ${replyToEmail.from.name || replyToEmail.from.email}:</p>
  ${replyToEmail.htmlContent || `<p>${replyToEmail.textContent}</p>`}
</div>`;
      setContent(quote);
    } else if (mode === 'forward' && replyToEmail) {
      setSubject(`Fwd: ${replyToEmail.subject.replace(/^Fwd:\s*/i, '')}`);
      
      // Forward original message (without signature for now)
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
  }, [mode, replyToEmail, emailAddresses, signaturePosition]);

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
      
      // Debug-Logging
      console.log('🔍 Debug Reply-To Generation:', {
        selectedEmailAddressId,
        fromAddress,
        organizationId,
        mode
      });
      
      // Hole die kurze ID der E-Mail-Adresse für die Reply-To
      if (!selectedEmailAddressId || !fromAddress) {
        console.error('❌ Missing required data for Reply-To generation');
        alert('Fehler: Keine E-Mail-Adresse ausgewählt');
        return;
      }
      
      const shortEmailAddressId = selectedEmailAddressId.substring(0, 8).toLowerCase();
      const domain = fromAddress.email.split('@')[1];
      const localPart = fromAddress.email.split('@')[0];
      
      console.log('📝 Reply-To components:', {
        shortEmailAddressId,
        domain,
        localPart,
        fullOrganizationId: organizationId,
        shortOrganizationId: organizationId.toLowerCase()
      });
      
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

      // Merge signature with content before sending
      const finalContent = mergeSignatureWithContent(content, selectedSignatureId);
      
      const emailData = {
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
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
          emailAddressId: selectedEmailAddressId,
          replyToMessageId: mode === 'reply' ? replyToEmail?.messageId : undefined,
          // WICHTIG: Reply-To Adresse für PR-Kampagnen
          replyTo: replyToAddress,
          // Thread-ID und Campaign-ID für korrekte Zuordnung
          threadId: replyToEmail?.threadId,
          campaignId: replyToEmail?.campaignId,
          // Zusätzliche Daten für Server-Side Thread-Erstellung und Speicherung
          organizationId,
          userId: user?.uid || organizationId,
          signatureId: selectedSignatureId || undefined,
          mode,
          domainId: replyToEmail?.domainId,
          projectId: replyToEmail?.projectId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      const result = await response.json();
      console.log('📧 Email sent successfully:', result);

      // Thread-Erstellung und E-Mail-Speicherung erfolgt jetzt in der API
      console.log('✅ Thread and email saved by API:', {
        threadId: result.threadId,
        messageId: result.messageId
      });

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
      alert(`Fehler beim Senden der E-Mail: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} className="sm:max-w-4xl">
      <div className="flex flex-col h-[80vh]">
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
            {/* From selector */}
            <div className="grid grid-cols-2 gap-4">
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
            
            {selectedSignatureId && (
              <Field>
                <Label>Signatur-Position</Label>
                <Select
                  value={signaturePosition}
                  onChange={(e) => setSignaturePosition(e.target.value as 'above' | 'below')}
                >
                  <option value="below">Unter der Nachricht</option>
                  <option value="above">Über der Nachricht</option>
                </Select>
              </Field>
            )}

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
              <EmailEditor
                content={content}
                onChange={setContent}
                placeholder="Ihre Nachricht..."
                minHeight="300px"
              />
              {selectedSignatureId && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Signatur-Vorschau:</span>
                    <span className="text-xs text-gray-500">
                      Position: {signaturePosition === 'above' ? 'Oben' : 'Unten'}
                    </span>
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