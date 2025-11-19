// scripts/migrate-domain-mailboxes.ts
/**
 * Migration Script: Erstellt Domain-Postfächer für alle bestehenden Domains
 *
 * Dieses Script lädt alle Domains aus email_domains und erstellt
 * automatisch die entsprechenden Postfächer in inbox_domain_mailboxes.
 *
 * Ausführen mit: npx tsx scripts/migrate-domain-mailboxes.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade Environment-Variablen aus .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Firebase Admin SDK initialisieren
if (!admin.apps.length) {
  // Verwende Service Account aus Umgebungsvariable
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT Umgebungsvariable nicht gefunden');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin SDK erfolgreich initialisiert\n');
}

const db = admin.firestore();

interface EmailDomain {
  id: string;
  domain: string;
  organizationId: string;
  status: string;
  [key: string]: any;
}

interface DomainMailbox {
  domainId: string;
  domain: string;
  inboxAddress: string;
  organizationId: string;
  status: 'active' | 'inactive';
  unreadCount: number;
  threadCount: number;
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
  createdBy: string;
  isDefault?: boolean;
  isShared?: boolean;
}

async function migrateDomainMailboxes() {
  console.log('🚀 Starte Migration: Domain-Postfächer erstellen\n');

  try {
    // 1. Alle Domains laden (prüfe beide Collections)
    console.log('📥 Lade Domains aus email_domains_enhanced...');
    let domainsSnapshot = await db.collection('email_domains_enhanced').get();
    let domains: EmailDomain[] = domainsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EmailDomain));

    // Fallback zu email_domains falls enhanced leer ist
    if (domains.length === 0) {
      console.log('⚠️  email_domains_enhanced ist leer, versuche email_domains...');
      domainsSnapshot = await db.collection('email_domains').get();
      domains = domainsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmailDomain));
    }

    console.log(`✅ ${domains.length} Domains gefunden\n`);

    if (domains.length === 0) {
      console.log('⚠️  Keine Domains gefunden. Migration wird übersprungen.');
      process.exit(0);
    }

    // 2. Bestehende Mailboxen laden
    console.log('📥 Lade bestehende Domain-Postfächer...');
    const mailboxesSnapshot = await db.collection('inbox_domain_mailboxes').get();
    const existingMailboxes = new Set(
      mailboxesSnapshot.docs.map(doc => doc.data().domainId)
    );

    console.log(`✅ ${existingMailboxes.size} bestehende Postfächer gefunden\n`);

    // 3. Für jede Domain ein Postfach erstellen (falls nicht vorhanden)
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const domain of domains) {
      try {
        // Prüfen ob Postfach bereits existiert
        if (existingMailboxes.has(domain.id)) {
          console.log(`⏭️  Überspringe: ${domain.domain} (Postfach existiert bereits)`);
          skipped++;
          continue;
        }

        // Postfach erstellen
        const inboxAddress = `${domain.domain}@inbox.sk-online-marketing.de`;

        const mailboxData: DomainMailbox = {
          domainId: domain.id,
          domain: domain.domain,
          inboxAddress: inboxAddress,
          organizationId: domain.organizationId,
          status: domain.status === 'verified' ? 'active' : 'inactive',
          unreadCount: 0,
          threadCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system-migration'
        };

        // Spezial-Behandlung für celeropress.com
        if (domain.domain === 'celeropress.com') {
          mailboxData.isDefault = true;
          mailboxData.isShared = true;
        }

        await db.collection('inbox_domain_mailboxes').add(mailboxData);

        console.log(`✅ Erstellt: ${domain.domain} → ${inboxAddress}`);
        created++;

      } catch (error) {
        console.error(`❌ Fehler bei ${domain.domain}:`, error);
        errors++;
      }
    }

    // 4. Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migrations-Zusammenfassung:');
    console.log('='.repeat(60));
    console.log(`✅ Erfolgreich erstellt: ${created}`);
    console.log(`⏭️  Übersprungen:        ${skipped}`);
    console.log(`❌ Fehler:              ${errors}`);
    console.log(`📊 Gesamt:              ${domains.length}`);
    console.log('='.repeat(60));

    if (errors > 0) {
      console.log('\n⚠️  Es gab Fehler bei der Migration. Bitte Logs prüfen.');
      process.exit(1);
    } else {
      console.log('\n🎉 Migration erfolgreich abgeschlossen!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Kritischer Fehler bei der Migration:', error);
    process.exit(1);
  }
}

// Script ausführen
migrateDomainMailboxes();
