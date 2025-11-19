// scripts/fix-mailbox-lowercase.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function fixMailboxes() {
  try {
    // Fix Project Mailboxes
    console.log('🔧 Fixing project mailbox addresses to lowercase...\n');
    const projectSnapshot = await adminDb.collection('inbox_project_mailboxes').get();
    let projectUpdated = 0;
    let projectSkipped = 0;

    for (const doc of projectSnapshot.docs) {
      const data = doc.data();
      const currentAddress = data.inboxAddress;
      const lowercaseAddress = currentAddress.toLowerCase();

      if (currentAddress !== lowercaseAddress) {
        await doc.ref.update({ inboxAddress: lowercaseAddress });
        console.log(`✅ Project: ${currentAddress} → ${lowercaseAddress}`);
        projectUpdated++;
      } else {
        projectSkipped++;
      }
    }

    console.log(`\n✅ Project mailboxes: Updated ${projectUpdated}, Skipped ${projectSkipped}\n`);

    // Fix Domain Mailboxes
    console.log('🔧 Fixing domain mailbox addresses to lowercase...\n');
    const domainSnapshot = await adminDb.collection('inbox_domain_mailboxes').get();
    let domainUpdated = 0;
    let domainSkipped = 0;

    for (const doc of domainSnapshot.docs) {
      const data = doc.data();
      const currentAddress = data.inboxAddress;
      const lowercaseAddress = currentAddress.toLowerCase();

      if (currentAddress !== lowercaseAddress) {
        await doc.ref.update({ inboxAddress: lowercaseAddress });
        console.log(`✅ Domain: ${currentAddress} → ${lowercaseAddress}`);
        domainUpdated++;
      } else {
        domainSkipped++;
      }
    }

    console.log(`\n✅ Domain mailboxes: Updated ${domainUpdated}, Skipped ${domainSkipped}`);
    console.log(`\n🎉 Total: Updated ${projectUpdated + domainUpdated}, Skipped ${projectSkipped + domainSkipped}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixMailboxes();
