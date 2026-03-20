// Prüft die importierten Kontakte auf Email/Phone

require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

async function check() {
  const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

  const snapshot = await adminDb.collection('contacts_enhanced')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  console.log('═'.repeat(70));
  console.log('IMPORTIERTE KONTAKTE - Email/Phone Analyse');
  console.log('═'.repeat(70));
  console.log('Gesamt:', snapshot.size, 'Kontakte\n');

  let withEmail = 0;
  let withPhone = 0;
  let journalists = 0;
  let functional = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const emails = data.emails || [];
    const phones = data.phones || [];
    const hasEmail = emails.length > 0 && emails[0]?.email;
    const hasPhone = phones.length > 0 && phones[0]?.number;

    if (hasEmail) withEmail++;
    if (hasPhone) withPhone++;
    if (data.isJournalist) journalists++;
    if (data.contactType === 'function') functional++;

    const icon = hasEmail || hasPhone ? '✓' : '❌';
    console.log(`${icon} ${data.firstName || ''} ${data.lastName || data.functionName || 'Unbekannt'}`);
    console.log(`    Type: ${data.contactType || 'person'} | isJournalist: ${data.isJournalist}`);
    console.log(`    Email: ${hasEmail ? emails[0].email : '—'}`);
    console.log(`    Phone: ${hasPhone ? phones[0].number : '—'}`);
    console.log(`    Company: ${data.companyName || '—'}`);
    console.log('');
  }

  console.log('═'.repeat(70));
  console.log('STATISTIK:');
  console.log('─'.repeat(70));
  console.log(`Journalisten (isJournalist=true): ${journalists}`);
  console.log(`Funktionskontakte (contactType=function): ${functional}`);
  console.log(`Mit Email: ${withEmail} (${Math.round(withEmail/snapshot.size*100)}%)`);
  console.log(`Mit Telefon: ${withPhone} (${Math.round(withPhone/snapshot.size*100)}%)`);
  console.log('═'.repeat(70));
}

check().then(() => process.exit(0));
