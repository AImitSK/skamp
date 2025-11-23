// scripts/check-campaign-emails.ts
// Prüft wie Campaign Reply-To Adressen generiert werden

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkCampaignEmails(orgId: string) {
  console.log(`\n📧 Campaign Email-Analyse für Organization: ${orgId}\n`);

  // Lade Email-Adressen
  const emailAddresses = await db.collection('email_addresses')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`📧 Email-Adressen: ${emailAddresses.size}\n`);

  const emailMap = new Map();
  emailAddresses.forEach(doc => {
    const data = doc.data();
    emailMap.set(doc.id, data);
    console.log(`   ${data.email} (ID: ${doc.id})`);
    console.log(`   Domain ID: ${data.domainId || 'MISSING'}`);
    console.log(`   Display Name: ${data.displayName || 'Keine'}\n`);
  });

  // Lade Campaigns
  const campaigns = await db.collection('campaigns')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`\n📬 Campaigns: ${campaigns.size}\n`);

  campaigns.forEach(doc => {
    const campaign = doc.data();
    console.log(`Campaign: ${campaign.name || 'Unbenannt'}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Projekt ID: ${campaign.projectId || 'MISSING'}`);
    console.log(`   Von Email: ${campaign.fromEmail || 'MISSING'}`);
    console.log(`   Von Name: ${campaign.fromName || 'MISSING'}`);
    console.log(`   Reply-To: ${campaign.replyTo || 'MISSING'}`);
    console.log(`   Status: ${campaign.status || 'draft'}`);

    // Analysiere Reply-To Format
    if (campaign.replyTo) {
      const replyTo = campaign.replyTo;
      const parts = replyTo.split('@');
      if (parts.length === 2) {
        const localPart = parts[0];
        const domain = parts[1];

        console.log(`\n   📊 Reply-To Analyse:`);
        console.log(`      Local Part: ${localPart}`);
        console.log(`      Domain: ${domain}`);

        // Prüfe ob es ein generiertes Format ist
        if (localPart.includes('-')) {
          const segments = localPart.split('-');
          console.log(`      Segmente: ${segments.join(' | ')}`);
        }
      }
    }
    console.log('');
  });

  // Lade Projekt-Mailboxes
  console.log(`\n📬 Projekt-Mailboxes:\n`);

  const projectMailboxes = await db.collection('inbox_project_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  projectMailboxes.forEach(doc => {
    const mb = doc.data();
    console.log(`   ${mb.inboxAddress}`);
    console.log(`   Projekt ID: ${mb.projectId}`);
    console.log(`   Email Address ID: ${mb.emailAddressId || 'MISSING'}`);
    console.log(`   Domain ID: ${mb.domainId || 'MISSING'}\n`);
  });
}

const orgId = process.argv[2] || 'hJ4gTE9Gm35epoub0zIU';
checkCampaignEmails(orgId).then(() => process.exit(0));
