// scripts/restore-email-addresses.ts
// Stellt die email_addresses Collection wieder her

import { adminDb } from '../src/lib/firebase/admin-init';

async function restoreEmailAddresses() {
  try {
    console.log('🔄 Starte Wiederherstellung der email_addresses Collection...\n');

    const organizationId = 'celeropress';

    // 1. Haupt-Email-Adresse für celeropress.de
    console.log('📧 Erstelle E-Mail-Adresse: info@celeropress.de');

    const emailAddress1 = {
      email: 'info@celeropress.de',
      displayName: 'CeleroPress Info',
      organizationId: organizationId,
      userId: 'admin',
      isActive: true,
      isDefault: true,
      isPrimary: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      domain: 'celeropress.de',
      type: 'business',
      settings: {
        signature: '',
        autoReply: false,
        forwardingEnabled: false
      },
      // SMTP/IMAP Settings (für SendGrid)
      provider: 'sendgrid',
      smtpSettings: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey'
        }
      }
    };

    const ref1 = await adminDb.collection('email_addresses').add(emailAddress1);
    console.log('✅ Erstellt mit ID:', ref1.id);

    // 2. Zweite Email-Adresse für sk-online-marketing.de
    console.log('\n📧 Erstelle E-Mail-Adresse: kontakt@sk-online-marketing.de');

    const emailAddress2 = {
      email: 'kontakt@sk-online-marketing.de',
      displayName: 'SK Online Marketing',
      organizationId: organizationId,
      userId: 'admin',
      isActive: true,
      isDefault: false,
      isPrimary: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      domain: 'sk-online-marketing.de',
      type: 'business',
      settings: {
        signature: '',
        autoReply: false,
        forwardingEnabled: false
      },
      provider: 'sendgrid',
      smtpSettings: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey'
        }
      }
    };

    const ref2 = await adminDb.collection('email_addresses').add(emailAddress2);
    console.log('✅ Erstellt mit ID:', ref2.id);

    console.log('\n✅ Wiederherstellung abgeschlossen!');
    console.log('\n📝 Wiederhergestellte E-Mail-Adressen:');
    console.log('   ✓ info@celeropress.de (Standard)');
    console.log('   ✓ kontakt@sk-online-marketing.de');
    console.log('\n📬 Die Postfächer sollten jetzt in der Inbox sichtbar sein!');

  } catch (error) {
    console.error('❌ Fehler bei der Wiederherstellung:', error);
    throw error;
  }
}

restoreEmailAddresses()
  .then(() => {
    console.log('\n✨ Script erfolgreich beendet');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script fehlgeschlagen:', error);
    process.exit(1);
  });
