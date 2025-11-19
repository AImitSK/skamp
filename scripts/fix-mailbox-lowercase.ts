// scripts/fix-mailbox-lowercase.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function fixMailboxes() {
  try {
    console.log('🔧 Fixing all project mailbox addresses to lowercase...\n');

    const snapshot = await adminDb.collection('inbox_project_mailboxes').get();

    let updated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentAddress = data.inboxAddress;
      const lowercaseAddress = currentAddress.toLowerCase();

      if (currentAddress !== lowercaseAddress) {
        await doc.ref.update({ inboxAddress: lowercaseAddress });
        console.log(`✅ Updated: ${currentAddress} → ${lowercaseAddress}`);
        updated++;
      } else {
        console.log(`⏭️  Skipped: ${currentAddress} (already lowercase)`);
        skipped++;
      }
    }

    console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixMailboxes();
