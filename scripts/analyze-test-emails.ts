// scripts/analyze-test-emails.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function analyzeTestEmails() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('📊 Detaillierte Test-Email Analyse\n');
  console.log('='.repeat(80));

  const snap = await adminDb
    .collection('email_messages')
    .where('organizationId', '==', orgId)
    .get();

  // Gruppiere nach Test-Nummer
  const tests = new Map<string, any[]>();

  snap.forEach(doc => {
    const data = doc.data();
    const subject = data.subject || '';

    // Extrahiere Test-Nummer (1.1, 1.2, 2.1, 2.2, 3.1)
    const match = subject.match(/TEST\s+(\d+\.\d+)/i) || subject.match(/(\d+\.\d+)/);
    if (match) {
      const testNum = match[1];
      if (!tests.has(testNum)) {
        tests.set(testNum, []);
      }
      tests.get(testNum)!.push({
        docId: doc.id,
        subject: data.subject,
        from: data.from?.email,
        messageId: data.messageId,
        mailboxType: data.mailboxType,
        projectId: data.projectId,
        domainId: data.domainId,
        created: data.createdAt?.toDate?.()
      });
    }
  });

  // Sortiere und zeige an
  const sorted = Array.from(tests.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  sorted.forEach(([testNum, emails]) => {
    console.log(`\n📧 TEST ${testNum}:`);
    console.log(`   Anzahl Emails: ${emails.length}`);

    // Gruppiere nach Mailbox-Typ
    const inProject = emails.filter(e => e.mailboxType === 'project');
    const inDomain = emails.filter(e => e.mailboxType === 'domain');

    console.log(`   - Project Mailbox: ${inProject.length}`);
    console.log(`   - Domain Mailbox: ${inDomain.length}`);

    if (inProject.length > 1 || inDomain.length > 1) {
      console.log(`   ⚠️  DUPLIKAT GEFUNDEN!`);
    }

    emails.forEach((email, i) => {
      console.log(`\n   ${i + 1}. ${email.mailboxType.toUpperCase()}`);
      console.log(`      Doc-ID: ${email.docId}`);
      console.log(`      Subject: ${email.subject}`);
      console.log(`      MessageId: ${email.messageId}`);
      console.log(`      ProjectId: ${email.projectId || 'none'}`);
      console.log(`      DomainId: ${email.domainId || 'none'}`);
      console.log(`      Created: ${email.created}`);
    });

    console.log('');
  });

  console.log('='.repeat(80));

  // Zusammenfassung
  console.log('\n📊 ZUSAMMENFASSUNG:\n');

  sorted.forEach(([testNum, emails]) => {
    const inProject = emails.filter(e => e.mailboxType === 'project').length;
    const inDomain = emails.filter(e => e.mailboxType === 'domain').length;

    let status = '✅';
    let note = '';

    if (testNum === '1.1') {
      // Nur A (Project)
      if (inProject === 1 && inDomain === 0) {
        note = 'Korrekt: Nur Project';
      } else if (inProject > 0 && inDomain > 0) {
        status = '❌';
        note = `FALSCH: Sollte nur Project sein (ist: ${inProject}x Project, ${inDomain}x Domain)`;
      }
    } else if (testNum === '1.2') {
      // Nur B (Domain)
      if (inProject === 0 && inDomain === 1) {
        note = 'Korrekt: Nur Domain';
      } else if (inProject > 0 && inDomain > 0) {
        status = '❌';
        note = `FALSCH: Sollte nur Domain sein (ist: ${inProject}x Project, ${inDomain}x Domain)`;
      }
    } else if (testNum === '2.1' || testNum === '2.2' || testNum === '3.1') {
      // Beide Mailboxen
      if (inProject === 1 && inDomain === 1) {
        note = 'Korrekt: Beide Mailboxen (1x Project, 1x Domain)';
      } else {
        status = '❌';
        note = `FALSCH: Sollte in beiden sein (ist: ${inProject}x Project, ${inDomain}x Domain)`;
      }
    }

    console.log(`   ${status} TEST ${testNum}: ${note}`);
  });

  console.log('\n' + '='.repeat(80));
}

analyzeTestEmails()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });
