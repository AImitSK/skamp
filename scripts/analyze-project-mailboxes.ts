// scripts/analyze-project-mailboxes.ts
// Analysiert Projekt-Postfächer und vergleicht mit Campaign-Emails

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function analyzeProjectMailboxes(orgId: string) {
  console.log(`\n📊 Analyse Projekt-Postfächer für Organization: ${orgId}\n`);

  // 1. Lade alle Projekte
  const projects = await db.collection('projects')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`📁 Gefundene Projekte: ${projects.size}\n`);

  // 2. Lade alle Projekt-Mailboxes
  const projectMailboxes = await db.collection('inbox_project_mailboxes')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`📬 Gefundene Projekt-Mailboxes: ${projectMailboxes.size}\n`);

  // 3. Gruppiere Mailboxes nach Projekt
  const mailboxesByProject = new Map<string, any[]>();

  projectMailboxes.forEach(doc => {
    const data = doc.data();
    const projectId = data.projectId;

    if (!mailboxesByProject.has(projectId)) {
      mailboxesByProject.set(projectId, []);
    }

    mailboxesByProject.get(projectId)!.push({
      id: doc.id,
      ...data
    });
  });

  // 4. Analysiere jedes Projekt
  for (const projectDoc of projects.docs) {
    const project = projectDoc.data();
    const projectId = projectDoc.id;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 Projekt: ${project.name}`);
    console.log(`   ID: ${projectId}`);
    console.log(`${'='.repeat(60)}\n`);

    // Lade Campaigns
    const campaigns = await db.collection('campaigns')
      .where('projectId', '==', projectId)
      .get();

    console.log(`📧 Campaigns: ${campaigns.size}`);

    // Zeige Campaign Email-Adressen
    campaigns.forEach(doc => {
      const campaign = doc.data();
      console.log(`\n   Campaign: ${campaign.name || 'Unbenannt'}`);
      console.log(`   Von: ${campaign.fromEmail || 'Keine'}`);
      console.log(`   Reply-To: ${campaign.replyTo || 'Keine'}`);
    });

    // Zeige Projekt-Mailboxes
    const mailboxes = mailboxesByProject.get(projectId) || [];
    console.log(`\n📬 Projekt-Mailboxes: ${mailboxes.length}\n`);

    mailboxes.forEach((mb, index) => {
      console.log(`   ${index + 1}. ${mb.inboxAddress}`);
      console.log(`      Email Address ID: ${mb.emailAddressId || 'MISSING'}`);
      console.log(`      Domain ID: ${mb.domainId || 'MISSING'}`);
      console.log(`      Unread: ${mb.unreadCount || 0}`);
    });

    if (mailboxes.length === 0) {
      console.log('   ⚠️  KEINE Mailboxes für dieses Projekt!');
    }
  }

  // 5. Finde Mailboxes ohne Projekt
  console.log(`\n\n${'='.repeat(60)}`);
  console.log('🔍 Mailboxes ohne zugewiesenes Projekt:');
  console.log(`${'='.repeat(60)}\n`);

  let orphanCount = 0;
  projectMailboxes.forEach(doc => {
    const data = doc.data();
    const projectExists = projects.docs.some(p => p.id === data.projectId);

    if (!projectExists) {
      orphanCount++;
      console.log(`❌ ${data.inboxAddress}`);
      console.log(`   Projekt ID: ${data.projectId} (existiert nicht)`);
      console.log(`   Email Address ID: ${data.emailAddressId || 'MISSING'}\n`);
    }
  });

  if (orphanCount === 0) {
    console.log('✅ Alle Mailboxes haben gültige Projekte\n');
  } else {
    console.log(`⚠️  ${orphanCount} verwaiste Mailboxes gefunden\n`);
  }
}

const orgId = process.argv[2] || 'hJ4gTE9Gm35epoub0zIU';
analyzeProjectMailboxes(orgId).then(() => process.exit(0));
