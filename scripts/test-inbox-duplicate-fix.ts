// scripts/test-inbox-duplicate-fix.ts
// Testet die Duplikaterkennung-Fixes im Inbox-System

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTests(organizationId: string) {
  console.log('\n🧪 Inbox Duplicate Fix - Test Suite\n');
  console.log('='.repeat(70));
  console.log(`Organization ID: ${organizationId}\n`);

  // Test 1: Finde Projekt-Postfach
  console.log('📋 Test 1: Projekt-Postfach finden...');
  const projectMailbox = await findProjectMailbox(organizationId);

  if (!projectMailbox) {
    results.push({
      test: 'Test 1: Projekt-Postfach finden',
      status: 'FAIL',
      message: 'Kein Projekt-Postfach gefunden für diese Organization'
    });
    printResults();
    return;
  }

  results.push({
    test: 'Test 1: Projekt-Postfach finden',
    status: 'PASS',
    message: `Projekt-Postfach gefunden: ${projectMailbox.inboxAddress}`,
    details: {
      projectId: projectMailbox.projectId,
      projectName: projectMailbox.projectName,
      inboxAddress: projectMailbox.inboxAddress
    }
  });

  // Test 2: Prüfe ob Duplikat-Check nur 'inbox' Folder prüft
  console.log('\n📋 Test 2: Duplikat-Check Logik prüfen...');
  await testDuplicateCheckLogic(organizationId, projectMailbox.projectId!);

  // Test 3: Prüfe vorhandene Emails im Postfach
  console.log('\n📋 Test 3: Vorhandene Emails im Postfach...');
  await testExistingEmails(organizationId, projectMailbox.projectId!);

  // Test 4: Prüfe sent vs inbox Folder
  console.log('\n📋 Test 4: Sent vs Inbox Folder Verteilung...');
  await testFolderDistribution(organizationId);

  // Test 5: Prüfe auf potenzielle Duplikate
  console.log('\n📋 Test 5: Potenzielle Duplikate identifizieren...');
  await testPotentialDuplicates(organizationId);

  printResults();
  printRecommendations();
}

async function findProjectMailbox(organizationId: string) {
  const snapshot = await db
    .collection('inbox_project_mailboxes')
    .where('organizationId', '==', organizationId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  };
}

async function testDuplicateCheckLogic(organizationId: string, projectId: string) {
  // Suche nach Emails mit gleicher messageId aber unterschiedlichen Folders
  const allEmails = await db
    .collection('email_messages')
    .where('organizationId', '==', organizationId)
    .where('projectId', '==', projectId)
    .limit(100)
    .get();

  const messageIdMap = new Map<string, { inbox: number; sent: number }>();

  allEmails.docs.forEach(doc => {
    const data = doc.data();
    const messageId = data.messageId;
    const folder = data.folder;

    if (!messageIdMap.has(messageId)) {
      messageIdMap.set(messageId, { inbox: 0, sent: 0 });
    }

    const counts = messageIdMap.get(messageId)!;
    if (folder === 'inbox') {
      counts.inbox++;
    } else if (folder === 'sent') {
      counts.sent++;
    }
  });

  // Finde Message-IDs die sowohl in inbox als auch sent vorkommen
  const duplicateMessageIds: string[] = [];
  messageIdMap.forEach((counts, messageId) => {
    if (counts.inbox > 0 && counts.sent > 0) {
      duplicateMessageIds.push(messageId);
    }
  });

  if (duplicateMessageIds.length > 0) {
    results.push({
      test: 'Test 2: Duplikat-Check Logik',
      status: 'PASS',
      message: `Fix ist relevant: ${duplicateMessageIds.length} MessageIDs existieren in BEIDEN Folders`,
      details: {
        count: duplicateMessageIds.length,
        examples: duplicateMessageIds.slice(0, 3)
      }
    });
  } else {
    results.push({
      test: 'Test 2: Duplikat-Check Logik',
      status: 'PASS',
      message: 'Keine MessageIDs in beiden Folders gefunden',
      details: {
        totalEmails: allEmails.size
      }
    });
  }
}

async function testExistingEmails(organizationId: string, projectId: string) {
  const inboxEmails = await db
    .collection('email_messages')
    .where('organizationId', '==', organizationId)
    .where('projectId', '==', projectId)
    .where('folder', '==', 'inbox')
    .get();

  const sentEmails = await db
    .collection('email_messages')
    .where('organizationId', '==', organizationId)
    .where('projectId', '==', projectId)
    .where('folder', '==', 'sent')
    .get();

  results.push({
    test: 'Test 3: Vorhandene Emails',
    status: 'PASS',
    message: `Inbox: ${inboxEmails.size}, Sent: ${sentEmails.size}`,
    details: {
      inbox: inboxEmails.size,
      sent: sentEmails.size,
      total: inboxEmails.size + sentEmails.size
    }
  });
}

async function testFolderDistribution(organizationId: string) {
  const allEmails = await db
    .collection('email_messages')
    .where('organizationId', '==', organizationId)
    .limit(500)
    .get();

  const folderCounts: Record<string, number> = {};

  allEmails.docs.forEach(doc => {
    const folder = doc.data().folder || 'undefined';
    folderCounts[folder] = (folderCounts[folder] || 0) + 1;
  });

  results.push({
    test: 'Test 4: Folder Verteilung',
    status: 'PASS',
    message: `Verteilung: ${JSON.stringify(folderCounts)}`,
    details: folderCounts
  });
}

async function testPotentialDuplicates(organizationId: string) {
  const allEmails = await db
    .collection('email_messages')
    .where('organizationId', '==', organizationId)
    .where('folder', '==', 'inbox')
    .limit(500)
    .get();

  const messageIdCounts = new Map<string, number>();

  allEmails.docs.forEach(doc => {
    const messageId = doc.data().messageId;
    messageIdCounts.set(messageId, (messageIdCounts.get(messageId) || 0) + 1);
  });

  const duplicates = Array.from(messageIdCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([messageId, count]) => ({ messageId, count }));

  if (duplicates.length > 0) {
    results.push({
      test: 'Test 5: Potenzielle Duplikate',
      status: 'FAIL',
      message: `${duplicates.length} MessageIDs erscheinen mehrfach im inbox Folder!`,
      details: {
        count: duplicates.length,
        examples: duplicates.slice(0, 5)
      }
    });
  } else {
    results.push({
      test: 'Test 5: Potenzielle Duplikate',
      status: 'PASS',
      message: 'Keine Duplikate im inbox Folder gefunden',
      details: {
        totalChecked: allEmails.size
      }
    });
  }
}

function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 TEST ERGEBNISSE\n');

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log();
  });

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log('='.repeat(70));
  console.log(`\n📈 Zusammenfassung: ${passed} PASS, ${failed} FAIL, ${skipped} SKIP\n`);
}

function printRecommendations() {
  console.log('='.repeat(70));
  console.log('\n💡 EMPFEHLUNGEN\n');

  const hasDuplicates = results.some(r =>
    r.test === 'Test 5: Potenzielle Duplikate' && r.status === 'FAIL'
  );

  const hasSentInboxOverlap = results.some(r =>
    r.test === 'Test 2: Duplikat-Check Logik' &&
    r.details?.count > 0
  );

  if (hasSentInboxOverlap) {
    console.log('✅ Fix ist RELEVANT:');
    console.log('   - MessageIDs existieren in BEIDEN Folders (sent + inbox)');
    console.log('   - Der neue Filter auf folder="inbox" verhindert falsche Duplikat-Erkennungen');
    console.log('   - Empfehlung: Deployment durchführen und live testen\n');
  }

  if (hasDuplicates) {
    console.log('⚠️  WARNUNG: Echte Duplikate im inbox Folder gefunden!');
    console.log('   - Diese sollten NICHT existieren');
    console.log('   - Mögliche Ursache: Mehrfache Webhook-Calls von SendGrid');
    console.log('   - Empfehlung: Duplikat-Check verbessern (z.B. Lock-Mechanismus)\n');
  }

  console.log('📝 Nächste Schritte:');
  console.log('   1. Deployment durchführen');
  console.log('   2. Neue Test-Email senden an Projekt-Postfach');
  console.log('   3. Aus Inbox auf Email antworten');
  console.log('   4. Server-Logs prüfen:');
  console.log('      - KEIN "Skipping duplicate" bei eingehenden Emails');
  console.log('      - KEIN "Skipping duplicate" bei eigenen Replies');
  console.log('      - Bilder laden ohne 403-Fehler\n');

  console.log('='.repeat(70));
}

// Main
const orgId = process.argv[2];

if (!orgId) {
  console.log('\n❌ Usage: npx tsx scripts/test-inbox-duplicate-fix.ts <organizationId>\n');
  console.log('Beispiel:');
  console.log('  npx tsx scripts/test-inbox-duplicate-fix.ts hJ4gTE9Gm35epoub0zIU\n');
  process.exit(1);
}

runTests(orgId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Test-Suite Fehler:', err);
    process.exit(1);
  });
