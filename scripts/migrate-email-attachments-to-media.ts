// scripts/migrate-email-attachments-to-media.ts
// Migriert existierende Email-Attachments ins Media Center

import { adminDb, adminStorage } from '../src/lib/firebase/admin-init';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Cache für Email-Attachments Ordner IDs
 */
const folderCache = new Map<string, string>();

/**
 * Holt oder erstellt den "Email-Anhänge" Ordner für eine Organization
 */
async function getOrCreateFolder(organizationId: string): Promise<string> {
  const cached = folderCache.get(organizationId);
  if (cached) return cached;

  const foldersRef = adminDb.collection('media_folders');
  const query = foldersRef
    .where('organizationId', '==', organizationId)
    .where('name', '==', 'Email-Anhänge')
    .limit(1);

  const snapshot = await query.get();

  if (!snapshot.empty) {
    const folderId = snapshot.docs[0].id;
    folderCache.set(organizationId, folderId);
    return folderId;
  }

  // Erstelle Ordner
  const docRef = await foldersRef.add({
    organizationId,
    name: 'Email-Anhänge',
    description: 'Automatisch gespeicherte Email-Anhänge',
    createdBy: 'system',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    color: '#3B82F6',
  });

  const folderId = docRef.id;
  folderCache.set(organizationId, folderId);
  console.log(`✅ Created folder for ${organizationId}: ${folderId}`);
  return folderId;
}

/**
 * Migriert Email-Attachments ins Media Center
 */
async function migrateEmailAttachments() {
  console.log('🔄 Starting Email-Attachments Migration...\n');

  try {
    // 1. Hole alle Emails mit Attachments
    const emailsRef = adminDb.collection('inbox_emails');
    const emailsSnapshot = await emailsRef
      .where('attachments', '!=', null)
      .get();

    if (emailsSnapshot.empty) {
      console.log('❌ No emails with attachments found');
      return;
    }

    console.log(`📧 Found ${emailsSnapshot.size} emails with attachments\n`);

    let processedCount = 0;
    let createdAssetsCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. Verarbeite jede Email
    for (const emailDoc of emailsSnapshot.docs) {
      const email = emailDoc.data();
      const emailId = emailDoc.id;
      const organizationId = email.organizationId;
      const messageId = email.messageId || emailId;
      const attachments = email.attachments || [];

      if (attachments.length === 0) {
        skippedCount++;
        continue;
      }

      console.log(`📨 Processing Email: ${emailId}`);
      console.log(`   Organization: ${organizationId}`);
      console.log(`   Attachments: ${attachments.length}`);

      try {
        // Hole Ordner
        const folderId = await getOrCreateFolder(organizationId);

        // 3. Erstelle media_assets für jeden Attachment
        for (const attachment of attachments) {
          try {
            // Prüfe ob bereits migriert
            const existingQuery = await adminDb.collection('media_assets')
              .where('organizationId', '==', organizationId)
              .where('fileName', '==', attachment.filename)
              .where('metadata.emailMessageId', '==', messageId)
              .limit(1)
              .get();

            if (!existingQuery.empty) {
              console.log(`   ⏭️  Skipped (already exists): ${attachment.filename}`);
              skippedCount++;
              continue;
            }

            // Erstelle media_asset
            const mediaAssetData = {
              organizationId,
              fileName: attachment.filename,
              fileType: attachment.contentType || 'application/octet-stream',
              storagePath: attachment.url.includes('firebasestorage')
                ? extractStoragePath(attachment.url)
                : `organizations/${organizationId}/media/email-attachments/${messageId}/${attachment.filename}`,
              downloadUrl: attachment.url,
              folderId,
              createdBy: 'system:email',
              metadata: {
                fileSize: attachment.size || 0,
                isEmailAttachment: true,
                emailMessageId: messageId,
                inline: attachment.inline || false,
                ...(attachment.contentId && { contentId: attachment.contentId }),
                migratedAt: new Date().toISOString(),
              },
              createdAt: email.receivedAt || FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
            };

            await adminDb.collection('media_assets').add(mediaAssetData);
            createdAssetsCount++;
            console.log(`   ✅ Created: ${attachment.filename} (${attachment.size} bytes)`);

          } catch (attachmentError: any) {
            errorCount++;
            console.error(`   ❌ Failed to migrate attachment ${attachment.filename}:`, attachmentError.message);
          }
        }

        processedCount++;

      } catch (emailError: any) {
        errorCount++;
        console.error(`❌ Failed to process email ${emailId}:`, emailError.message);
      }

      console.log(''); // Leerzeile
    }

    // 4. Zusammenfassung
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Emails processed: ${processedCount}`);
    console.log(`✅ Assets created: ${createdAssetsCount}`);
    console.log(`⏭️  Assets skipped (already exist): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Extrahiert Storage-Path aus Firebase Storage URL
 */
function extractStoragePath(url: string): string {
  try {
    const match = url.match(/\/o\/([^?]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return url;
  } catch {
    return url;
  }
}

// Run Migration
migrateEmailAttachments()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
