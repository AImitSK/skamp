// scripts/test-mailbox-query.ts
/**
 * Test Script: Simuliert die Query der TeamFolderSidebar
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade Environment-Variablen aus .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT Umgebungsvariable nicht gefunden');
  }
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function testMailboxQuery() {
  console.log('🔍 Teste Mailbox-Query für alle Organizations...\n');

  try {
    // Hole alle eindeutigen organizationIds
    const allMailboxes = await db.collection('inbox_domain_mailboxes').get();
    const orgIds = new Set<string>();

    allMailboxes.docs.forEach(doc => {
      const data = doc.data();
      if (data.organizationId) {
        orgIds.add(data.organizationId);
      }
    });

    console.log(`📊 Gefundene Organizations: ${orgIds.size}\n`);

    // Teste Query für jede Organization (wie TeamFolderSidebar)
    for (const orgId of orgIds) {
      console.log(`${'='.repeat(80)}`);
      console.log(`🏢 Organization ID: ${orgId}`);
      console.log(`${'='.repeat(80)}\n`);

      // EXAKT die gleiche Query wie in TeamFolderSidebar (Zeile 66-71)
      const domainQuery = await db.collection('inbox_domain_mailboxes')
        .where('organizationId', '==', orgId)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'asc')
        .get();

      console.log(`✅ Aktive Domain-Postfächer: ${domainQuery.size}`);

      if (domainQuery.size > 0) {
        domainQuery.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`\n${index + 1}. ${data.domain}`);
          console.log(`   Inbox: ${data.inboxAddress}`);
          console.log(`   Status: ${data.status}`);
          console.log(`   Unread: ${data.unreadCount}`);
        });
      } else {
        console.log('   ⚠️  Keine aktiven Postfächer gefunden!\n');

        // Zeige auch inactive Postfächer für diese Org
        const inactiveQuery = await db.collection('inbox_domain_mailboxes')
          .where('organizationId', '==', orgId)
          .where('status', '==', 'inactive')
          .get();

        if (inactiveQuery.size > 0) {
          console.log(`   ℹ️  Aber ${inactiveQuery.size} INACTIVE Postfächer gefunden:`);
          inactiveQuery.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`   ${index + 1}. ${data.domain} (inactive)`);
          });
        }
      }

      console.log('\n');
    }

    console.log(`${'='.repeat(80)}\n`);
    console.log('💡 TIPP: Kopiere die Organization ID, die du im Browser verwendest,');
    console.log('   und prüfe oben, ob für diese Org AKTIVE Postfächer existieren.\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
    process.exit(1);
  }
}

testMailboxQuery();
