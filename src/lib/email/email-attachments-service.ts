// src/lib/email/email-attachments-service.ts
// Service für Email-Anhänge - Integration mit Media-System für Storage-Tracking

import { adminStorage } from '@/lib/firebase/admin-init';
import { nanoid } from 'nanoid';
import { EmailAttachment } from '@/types/inbox-enhanced';

export interface UploadAttachmentParams {
  file: Buffer;
  filename: string;
  contentType: string;
  organizationId: string;
  messageId: string;
  inline?: boolean;
  contentId?: string;
}

/**
 * Lädt einen Email-Anhang in Firebase Storage hoch
 * Storage-Path: organizations/{orgId}/media/email-attachments/{messageId}/{filename}
 *
 * WICHTIG: Integration mit Media-System für automatisches Storage-Tracking
 */
export async function uploadEmailAttachment(
  params: UploadAttachmentParams
): Promise<EmailAttachment> {
  const { file, filename, contentType, organizationId, messageId, inline, contentId } = params;

  // Bereinige Dateiname (entferne Sonderzeichen)
  const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();

  // Storage-Path: Integration mit Media-System für Storage-Tracking
  const storagePath = `organizations/${organizationId}/media/email-attachments/${messageId}/${timestamp}_${cleanFilename}`;

  try {
    // Upload zu Firebase Storage (Admin SDK)
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(storagePath);

    await fileRef.save(file, {
      contentType,
      metadata: {
        'Access-Control-Allow-Origin': '*',
        organizationId,
        messageId,
        originalFilename: filename,
        uploadedAt: new Date().toISOString(),
        isEmailAttachment: 'true',
        ...(inline && { inline: 'true' }),
        ...(contentId && { contentId })
      }
    });

    // Generiere Signed URL (gültig für 1 Jahr)
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 Jahr
    });

    const publicUrl = signedUrl;

    // Erstelle EmailAttachment-Objekt (nur definierte Werte)
    const attachment: EmailAttachment = {
      id: nanoid(),
      filename: filename,
      contentType,
      size: file.length,
      url: publicUrl,
      inline: inline || false,
      ...(contentId && { contentId }) // Nur wenn definiert
    };

    return attachment;

  } catch (error: any) {
    console.error('[EmailAttachmentsService] Upload failed:', error);
    throw new Error(`Failed to upload attachment: ${error.message}`);
  }
}

/**
 * Löscht alle Anhänge einer Email-Message
 * Wird aufgerufen, wenn eine Email gelöscht wird
 */
export async function deleteEmailAttachments(
  organizationId: string,
  messageId: string
): Promise<void> {
  try {
    const bucket = adminStorage.bucket();
    const prefix = `organizations/${organizationId}/media/email-attachments/${messageId}/`;

    // Lösche alle Files mit diesem Prefix
    await bucket.deleteFiles({
      prefix,
    });

    console.log(`[EmailAttachmentsService] Deleted attachments for message ${messageId}`);
  } catch (error: any) {
    console.error('[EmailAttachmentsService] Delete failed:', error);
    // Nicht werfen - Email soll trotzdem gelöscht werden können
  }
}

/**
 * Parst attachment-info JSON von SendGrid
 */
export function parseAttachmentInfo(attachmentInfoStr: string): Record<string, {
  filename: string;
  name: string;
  type: string;
  'content-id'?: string;
}> {
  try {
    return JSON.parse(attachmentInfoStr);
  } catch (error) {
    console.error('[EmailAttachmentsService] Failed to parse attachment-info:', error);
    return {};
  }
}

/**
 * Extrahiert Attachment-Files aus SendGrid FormData
 */
export async function extractAttachmentsFromFormData(
  formData: FormData,
  organizationId: string,
  messageId: string
): Promise<EmailAttachment[]> {
  const attachments: EmailAttachment[] = [];

  // Parse attachment-info JSON
  const attachmentInfoStr = formData.get('attachment-info');
  if (!attachmentInfoStr || typeof attachmentInfoStr !== 'string') {
    return attachments; // Keine Attachments
  }

  const attachmentInfo = parseAttachmentInfo(attachmentInfoStr);

  // Extrahiere Files
  for (const [key, metadata] of Object.entries(attachmentInfo)) {
    const file = formData.get(key);

    if (!file || typeof file === 'string') {
      console.warn(`[EmailAttachmentsService] Attachment ${key} not found in formData`);
      continue;
    }

    try {
      // Konvertiere File/Blob zu Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Prüfe ob inline image (hat content-id)
      const isInline = !!metadata['content-id'];

      // Upload zu Storage
      const attachment = await uploadEmailAttachment({
        file: buffer,
        filename: metadata.filename || metadata.name,
        contentType: metadata.type,
        organizationId,
        messageId,
        inline: isInline,
        contentId: metadata['content-id']
      });

      attachments.push(attachment);
      console.log(`[EmailAttachmentsService] Uploaded attachment: ${attachment.filename} (${attachment.size} bytes)`);

    } catch (error: any) {
      console.error(`[EmailAttachmentsService] Failed to process attachment ${key}:`, error);
      // Weiter mit nächstem Attachment
    }
  }

  return attachments;
}

/**
 * Ersetzt CID-Links in HTML mit echten URLs
 * Beispiel: <img src="cid:abc123"> -> <img src="https://storage.googleapis.com/...">
 */
export function replaceInlineImageCIDs(
  htmlContent: string,
  attachments: EmailAttachment[]
): string {
  if (!htmlContent || !attachments.length) {
    return htmlContent;
  }

  let updatedHtml = htmlContent;

  // Finde alle inline images
  const inlineImages = attachments.filter(a => a.inline && a.contentId);

  for (const image of inlineImages) {
    // Ersetze cid:xxx mit echter URL
    const cidPattern = new RegExp(`cid:${image.contentId}`, 'gi');
    updatedHtml = updatedHtml.replace(cidPattern, image.url || '');
  }

  return updatedHtml;
}
