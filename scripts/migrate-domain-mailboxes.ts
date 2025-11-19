// scripts/migrate-domain-mailboxes.ts
/**
 * Migration Script: Erstellt Domain-Postfächer für alle bestehenden Domains
 *
 * Dieses Script lädt alle Domains aus email_domains und erstellt
 * automatisch die entsprechenden Postfächer in inbox_domain_mailboxes.
 *
 * Ausführen mit: npx tsx scripts/migrate-domain-mailboxes.ts
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

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
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  isDefault?: boolean;
  isShared?: boolean;
}

async function migrateDomainMailboxes() {
  console.log('🚀 Starte Migration: Domain-Postfächer erstellen\n');

  try {
    // 1. Alle Domains laden
    console.log('📥 Lade alle Domains aus email_domains...');
    const domainsSnapshot = await getDocs(collection(db, 'email_domains'));
    const domains: EmailDomain[] = domainsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as EmailDomain));

    console.log(`✅ ${domains.length} Domains gefunden\n`);

    // 2. Bestehende Mailboxen laden
    console.log('📥 Lade bestehende Domain-Postfächer...');
    const mailboxesSnapshot = await getDocs(collection(db, 'inbox_domain_mailboxes'));
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: 'system-migration'
        };

        // Spezial-Behandlung für celeropress.com
        if (domain.domain === 'celeropress.com') {
          mailboxData.isDefault = true;
          mailboxData.isShared = true;
        }

        await addDoc(collection(db, 'inbox_domain_mailboxes'), mailboxData);

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
