// scripts/verify-domain-mailboxes.ts
/**
 * Verify Script: Zeigt alle erstellten Domain-Postfächer an
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

async function verifyDomainMailboxes() {
  console.log('🔍 Überprüfe Domain-Postfächer...\n');

  try {
    // Alle Domain-Postfächer laden
    const mailboxesSnapshot = await db.collection('inbox_domain_mailboxes').get();

    console.log(`📊 Gefundene Postfächer: ${mailboxesSnapshot.size}\n`);

    if (mailboxesSnapshot.size === 0) {
      console.log('⚠️  Keine Postfächer gefunden!');
      process.exit(0);
    }

    // Gruppiere nach organizationId
    const byOrg: Record<string, any[]> = {};

    mailboxesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const orgId = data.organizationId || 'KEINE';

      if (!byOrg[orgId]) {
        byOrg[orgId] = [];
      }

      byOrg[orgId].push({
        id: doc.id,
        domain: data.domain,
        inboxAddress: data.inboxAddress,
        status: data.status,
        isDefault: data.isDefault,
        unreadCount: data.unreadCount,
        threadCount: data.threadCount
      });
    });

    // Ausgabe
    Object.entries(byOrg).forEach(([orgId, mailboxes]) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📁 Organization ID: ${orgId}`);
      console.log(`${'='.repeat(80)}`);

      mailboxes.forEach((mailbox, index) => {
        console.log(`\n${index + 1}. ${mailbox.domain}`);
        console.log(`   ID:           ${mailbox.id}`);
        console.log(`   Inbox:        ${mailbox.inboxAddress}`);
        console.log(`   Status:       ${mailbox.status}`);
        console.log(`   Is Default:   ${mailbox.isDefault || false}`);
        console.log(`   Unread:       ${mailbox.unreadCount}`);
        console.log(`   Threads:      ${mailbox.threadCount}`);
      });
    });

    console.log(`\n${'='.repeat(80)}\n`);

    // Statistik
    console.log('📊 Zusammenfassung:');
    console.log(`   Organizations: ${Object.keys(byOrg).length}`);
    console.log(`   Gesamt Postfächer: ${mailboxesSnapshot.size}`);

    Object.entries(byOrg).forEach(([orgId, mailboxes]) => {
      console.log(`   - ${orgId}: ${mailboxes.length} Postfächer`);
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler beim Überprüfen:', error);
    process.exit(1);
  }
}

verifyDomainMailboxes();
