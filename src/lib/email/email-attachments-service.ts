// src/lib/email/email-attachments-service.ts
// Service für Email-Anhänge - Integration mit Media-System für Storage-Tracking

import { adminStorage, adminDb } from '@/lib/firebase/admin-init';
import { nanoid } from 'nanoid';
import { EmailAttachment } from '@/types/inbox-enhanced';
import { FieldValue } from 'firebase-admin/firestore';

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
 * Cache für Email-Attachments Ordner IDs pro Organization
 * Verhindert mehrfache Firestore-Queries
 */
const emailAttachmentsFolderCache = new Map<string, string>();

/**
 * Holt oder erstellt den "Email-Anhänge" Ordner für eine Organization
 * Dieser Ordner wird im Media Center angezeigt
 */
async function getOrCreateEmailAttachmentsFolder(organizationId: string): Promise<string> {
  // Prüfe Cache
  const cached = emailAttachmentsFolderCache.get(organizationId);
  if (cached) {
    return cached;
  }

  try {
    // Suche nach existierendem Ordner
    const foldersRef = adminDb.collection('media_folders');
    const query = foldersRef
      .where('organizationId', '==', organizationId)
      .where('name', '==', 'Email-Anhänge')
      .limit(1);

    const snapshot = await query.get();

    if (!snapshot.empty) {
      const folderId = snapshot.docs[0].id;
      emailAttachmentsFolderCache.set(organizationId, folderId);
      console.log(`[EmailAttachments] Found existing folder: ${folderId}`);
      return folderId;
    }

    // Ordner existiert nicht - erstelle ihn
    const folderData = {
      organizationId,
      name: 'Email-Anhänge',
      description: 'Automatisch gespeicherte Email-Anhänge',
      createdBy: organizationId, // Verwende organizationId statt 'system' für korrekte UI-Anzeige
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      color: '#005fab', // Gleiche Farbe wie Projekte/Branding
    };

    const docRef = await foldersRef.add(folderData);
    const folderId = docRef.id;

    emailAttachmentsFolderCache.set(organizationId, folderId);
    console.log(`[EmailAttachments] Created new folder: ${folderId}`);

    return folderId;

  } catch (error: any) {
    console.error('[EmailAttachments] Failed to get/create folder:', error);
    throw new Error(`Failed to create Email-Anhänge folder: ${error.message}`);
  }
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

  // Bereinige messageId für Storage-Path (entferne @, <, >, etc.)
  const cleanMessageId = messageId.replace(/[^a-zA-Z0-9-]/g, '_');

  // Bereinige Content-ID (entferne < > falls vorhanden)
  const cleanContentId = contentId ? contentId.replace(/^<|>$/g, '') : undefined;

  console.log('📎 Upload attachment:', {
    originalMessageId: messageId,
    cleanMessageId,
    originalFilename: filename,
    cleanFilename,
    contentId: contentId,
    cleanContentId: cleanContentId,
    inline: inline
  });

  // Storage-Path: Integration mit Media-System für Storage-Tracking
  const storagePath = `organizations/${organizationId}/media/email-attachments/${cleanMessageId}/${timestamp}_${cleanFilename}`;

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
        ...(cleanContentId && { contentId: cleanContentId })
      }
    });

    // Generiere Signed URL (gültig für 1 Jahr)
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 Jahr
    });

    const publicUrl = signedUrl;

    // Erstelle EmailAttachment-Objekt (nur definierte Werte)
    const attachmentId = nanoid();
    const attachment: EmailAttachment = {
      id: attachmentId,
      filename: filename,
      contentType,
      size: file.length,
      url: publicUrl,
      inline: inline || false,
      ...(cleanContentId && { contentId: cleanContentId }) // Bereinigt, nur wenn definiert
    };

    // ✅ NEU: Erstelle media_assets Eintrag für Media Center Integration
    try {
      const folderId = await getOrCreateEmailAttachmentsFolder(organizationId);

      const mediaAssetData = {
        organizationId,
        fileName: filename,
        fileType: contentType,
        storagePath,
        downloadUrl: publicUrl,
        folderId,
        createdBy: 'system:email',
        metadata: {
          fileSize: file.length,
          // Email-spezifische Metadaten
          isEmailAttachment: true,
          emailMessageId: messageId,
          inline: inline || false,
          ...(cleanContentId && { contentId: cleanContentId }),
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const mediaAssetRef = await adminDb.collection('media_assets').add(mediaAssetData);
      console.log(`[EmailAttachments] Created media_asset: ${mediaAssetRef.id} for ${filename}`);

      // Speichere media_asset ID im Attachment für späteres Cleanup
      (attachment as any).mediaAssetId = mediaAssetRef.id;

    } catch (mediaError: any) {
      // Fehler bei media_assets sollte Upload nicht blockieren
      console.error('[EmailAttachments] Failed to create media_asset:', mediaError);
      // Attachment wird trotzdem zurückgegeben
    }

    return attachment;

  } catch (error: any) {
    console.error('[EmailAttachmentsService] Upload failed:', error);
    throw new Error(`Failed to upload attachment: ${error.message}`);
  }
}

/**
 * Löscht alle Anhänge einer Email-Message
 * Wird aufgerufen, wenn eine Email gelöscht wird
 *
 * ✅ NEU: Löscht auch media_assets Einträge im Media Center
 */
export async function deleteEmailAttachments(
  organizationId: string,
  messageId: string
): Promise<void> {
  try {
    // 1. Lösche Files aus Firebase Storage
    const bucket = adminStorage.bucket();
    const prefix = `organizations/${organizationId}/media/email-attachments/${messageId}/`;

    await bucket.deleteFiles({
      prefix,
    });

    console.log(`[EmailAttachmentsService] Deleted storage files for message ${messageId}`);

    // 2. ✅ NEU: Lösche media_assets Einträge
    try {
      const assetsRef = adminDb.collection('media_assets');
      const query = assetsRef
        .where('organizationId', '==', organizationId)
        .where('metadata.emailMessageId', '==', messageId)
        .where('metadata.isEmailAttachment', '==', true);

      const snapshot = await query.get();

      if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`[EmailAttachmentsService] Deleted ${snapshot.size} media_assets for message ${messageId}`);
      }

    } catch (mediaError: any) {
      console.error('[EmailAttachmentsService] Failed to delete media_assets:', mediaError);
      // Nicht werfen - Storage wurde bereits gelöscht
    }

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
 *
 * WICHTIG: Content-IDs können mit/ohne < > kommen:
 * - Outlook: <abc123@outlook.com>
 * - Gmail: abc123@gmail.com
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
    if (!image.contentId || !image.url) continue;

    // Bereinige Content-ID (entferne < > falls vorhanden)
    const cleanCid = image.contentId.replace(/^<|>$/g, '');

    // Ersetze BEIDE Varianten: mit und ohne < >
    // Outlook: src="cid:abc123" oder src="cid:<abc123>"
    const patterns = [
      new RegExp(`cid:${escapeRegex(cleanCid)}`, 'gi'),
      new RegExp(`cid:<${escapeRegex(cleanCid)}>`, 'gi'),
      new RegExp(`cid:${escapeRegex(image.contentId)}`, 'gi'), // Original
    ];

    for (const pattern of patterns) {
      updatedHtml = updatedHtml.replace(pattern, image.url);
    }

    console.log(`[replaceInlineImageCIDs] Replaced CID ${cleanCid} with URL`);
  }

  return updatedHtml;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
