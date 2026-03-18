// Detaillierte Analyse der GCRL Datenqualität
import { adminDb } from '../src/lib/firebase/admin-init';

const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

async function analyze() {
  console.log('═'.repeat(60));
  console.log('   DETAILLIERTE DATENQUALITÄTS-ANALYSE');
  console.log('═'.repeat(60) + '\n');

  // ═══════════════════════════════════════════════════════════
  // COMPANIES
  // ═══════════════════════════════════════════════════════════
  const companies = await adminDb.collection('companies_enhanced').where('tagIds', 'array-contains', TAG_ID).get();

  console.log('┌' + '─'.repeat(58) + '┐');
  console.log('│ COMPANIES: ' + companies.size.toString().padEnd(46) + '│');
  console.log('└' + '─'.repeat(58) + '┘');

  const companyCities: Record<string, number> = {};
  let companiesWithWebsite = 0;
  let companiesWithEmail = 0;
  let companiesWithPhone = 0;

  for (const doc of companies.docs) {
    const data = doc.data();
    const city = data.mainAddress?.city || 'Unbekannt';
    companyCities[city] = (companyCities[city] || 0) + 1;
    if (data.website) companiesWithWebsite++;
    if (data.emails?.length > 0) companiesWithEmail++;
    if (data.phones?.length > 0) companiesWithPhone++;
  }

  console.log(`\n  Mit Website:  ${companiesWithWebsite}/${companies.size} (${Math.round(companiesWithWebsite/companies.size*100)}%)`);
  console.log(`  Mit Email:    ${companiesWithEmail}/${companies.size} (${Math.round(companiesWithEmail/companies.size*100)}%)`);
  console.log(`  Mit Telefon:  ${companiesWithPhone}/${companies.size} (${Math.round(companiesWithPhone/companies.size*100)}%)`);

  console.log('\n  Städte-Verteilung:');
  Object.entries(companyCities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([city, count]) => {
      console.log(`    ${city}: ${count}`);
    });

  // ═══════════════════════════════════════════════════════════
  // PUBLICATIONS
  // ═══════════════════════════════════════════════════════════
  const publications = await adminDb.collection('publications').where('tagIds', 'array-contains', TAG_ID).get();

  console.log('\n┌' + '─'.repeat(58) + '┐');
  console.log('│ PUBLICATIONS: ' + publications.size.toString().padEnd(43) + '│');
  console.log('└' + '─'.repeat(58) + '┘');

  let pubsWithWebsite = 0;
  let pubsWithCirculation = 0;
  let pubsWithPageViews = 0;
  let pubsWithFrequency = 0;
  const pubTypes: Record<string, number> = {};

  const pubsWithWebsiteList: string[] = [];
  const pubsWithCirculationList: { name: string; circulation: number }[] = [];
  const pubsWithPageViewsList: { name: string; pageViews: number }[] = [];

  for (const doc of publications.docs) {
    const data = doc.data();

    // Type zählen
    const type = data.type || 'unknown';
    pubTypes[type] = (pubTypes[type] || 0) + 1;

    // Website
    if (data.website) {
      pubsWithWebsite++;
      pubsWithWebsiteList.push(`${data.title}: ${data.website}`);
    }

    // Circulation (Print)
    const circulation = data.metrics?.print?.circulation || data.circulation;
    if (circulation) {
      pubsWithCirculation++;
      pubsWithCirculationList.push({ name: data.title, circulation });
    }

    // Page Views (Online)
    const pageViews = data.metrics?.online?.monthlyPageViews;
    if (pageViews) {
      pubsWithPageViews++;
      pubsWithPageViewsList.push({ name: data.title, pageViews });
    }

    // Frequency
    if (data.metrics?.frequency) {
      pubsWithFrequency++;
    }
  }

  console.log(`\n  Vollständigkeit:`);
  console.log(`    Mit Website:      ${pubsWithWebsite}/${publications.size} (${Math.round(pubsWithWebsite/publications.size*100)}%)`);
  console.log(`    Mit Frequenz:     ${pubsWithFrequency}/${publications.size} (${Math.round(pubsWithFrequency/publications.size*100)}%)`);
  console.log(`    Mit Auflage:      ${pubsWithCirculation}/${publications.size} (${Math.round(pubsWithCirculation/publications.size*100)}%)`);
  console.log(`    Mit Page Views:   ${pubsWithPageViews}/${publications.size} (${Math.round(pubsWithPageViews/publications.size*100)}%)`);

  console.log(`\n  Typen-Verteilung:`);
  Object.entries(pubTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

  if (pubsWithWebsiteList.length > 0) {
    console.log(`\n  Publications MIT Website (${pubsWithWebsiteList.length}):`);
    pubsWithWebsiteList.slice(0, 10).forEach(p => console.log(`    ✓ ${p}`));
    if (pubsWithWebsiteList.length > 10) console.log(`    ... und ${pubsWithWebsiteList.length - 10} weitere`);
  }

  if (pubsWithCirculationList.length > 0) {
    console.log(`\n  Publications MIT Auflage (${pubsWithCirculationList.length}):`);
    pubsWithCirculationList
      .sort((a, b) => b.circulation - a.circulation)
      .slice(0, 10)
      .forEach(p => console.log(`    ✓ ${p.name}: ${p.circulation.toLocaleString('de-DE')} Exemplare`));
  }

  if (pubsWithPageViewsList.length > 0) {
    console.log(`\n  Publications MIT Page Views (${pubsWithPageViewsList.length}):`);
    pubsWithPageViewsList
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 10)
      .forEach(p => console.log(`    ✓ ${p.name}: ${p.pageViews.toLocaleString('de-DE')} Views/Monat`));
  }

  // ═══════════════════════════════════════════════════════════
  // CONTACTS
  // ═══════════════════════════════════════════════════════════
  const contacts = await adminDb.collection('contacts_enhanced').where('tagIds', 'array-contains', TAG_ID).get();

  console.log('\n┌' + '─'.repeat(58) + '┐');
  console.log('│ CONTACTS: ' + contacts.size.toString().padEnd(47) + '│');
  console.log('└' + '─'.repeat(58) + '┘');

  let contactsWithEmail = 0;
  let contactsWithPhone = 0;
  let contactsWithPosition = 0;
  const contactsWithEmailList: { name: string; email: string; company: string }[] = [];

  for (const doc of contacts.docs) {
    const data = doc.data();
    const hasEmail = data.emails?.length > 0 && data.emails[0].email;
    const hasPhone = data.phones?.length > 0 && data.phones[0].number;
    const hasPosition = !!data.position;

    if (hasEmail) {
      contactsWithEmail++;
      contactsWithEmailList.push({
        name: data.displayName,
        email: data.emails[0].email,
        company: data.companyName || 'Unbekannt'
      });
    }
    if (hasPhone) contactsWithPhone++;
    if (hasPosition) contactsWithPosition++;
  }

  console.log(`\n  Vollständigkeit:`);
  console.log(`    Mit Email:     ${contactsWithEmail}/${contacts.size} (${Math.round(contactsWithEmail/contacts.size*100)}%)`);
  console.log(`    Mit Telefon:   ${contactsWithPhone}/${contacts.size} (${Math.round(contactsWithPhone/contacts.size*100)}%)`);
  console.log(`    Mit Position:  ${contactsWithPosition}/${contacts.size} (${Math.round(contactsWithPosition/contacts.size*100)}%)`);

  console.log(`\n  Kontakte MIT Email (${contactsWithEmailList.length}):`);
  contactsWithEmailList.forEach(c => {
    console.log(`    ✓ ${c.name}`);
    console.log(`      ${c.email} @ ${c.company}`);
  });

  // ═══════════════════════════════════════════════════════════
  // ZUSAMMENFASSUNG
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('   ZUSAMMENFASSUNG');
  console.log('═'.repeat(60));

  const totalItems = companies.size + publications.size + contacts.size;
  console.log(`\n  Gesamt importiert: ${totalItems} Datensätze`);
  console.log(`    - ${companies.size} Unternehmen`);
  console.log(`    - ${publications.size} Publikationen`);
  console.log(`    - ${contacts.size} Kontakte`);

  console.log(`\n  Datenqualität:`);
  console.log(`    - Publications mit Website: ${Math.round(pubsWithWebsite/publications.size*100)}%`);
  console.log(`    - Publications mit Auflage: ${Math.round(pubsWithCirculation/publications.size*100)}%`);
  console.log(`    - Publications mit PageViews: ${Math.round(pubsWithPageViews/publications.size*100)}%`);
  console.log(`    - Contacts mit Email: ${Math.round(contactsWithEmail/contacts.size*100)}%`);
}

analyze().catch(console.error);
