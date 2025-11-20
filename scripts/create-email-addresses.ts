// scripts/create-email-addresses.ts
import { adminDb } from '../src/lib/firebase/admin-init';

async function createEmailAddresses() {
  const orgId = 'kqUJumpKKVPQIY87GP1cgO0VaKC3';

  console.log('📧 Erstelle E-Mail-Adressen...\n');

  const emailAddresses = [
    {
      email: 'info@sk-online-marketing.de',
      displayName: 'SK Online Marketing - Info',
      isDefault: true,
      isPrimary: true
    },
    {
      email: 'kontakt@sk-online-marketing.de',
      displayName: 'SK Online Marketing - Kontakt',
      isDefault: false,
      isPrimary: false
    },
    {
      email: 'presse@sk-online-marketing.de',
      displayName: 'SK Online Marketing - Presse',
      isDefault: false,
      isPrimary: false
    }
  ];

  // Erst löschen falls vorhanden
  const existing = await adminDb
    .collection('email_addresses')
    .where('organizationId', '==', orgId)
    .get();

  console.log(`Lösche ${existing.size} existierende E-Mail-Adressen...\n`);
  for (const doc of existing.docs) {
    await doc.ref.delete();
  }

  // Neue erstellen
  for (const addr of emailAddresses) {
    const data = {
      ...addr,
      organizationId: orgId,
      userId: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      domain: 'sk-online-marketing.de',
      type: 'business',
      provider: 'sendgrid',
      settings: {
        signature: '',
        autoReply: false,
        forwardingEnabled: false
      },
      smtpSettings: {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey'
        }
      }
    };

    const ref = await adminDb.collection('email_addresses').add(data);
    console.log(`✅ ${addr.email} (${ref.id})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ E-Mail-Adressen erstellt!');
  console.log('🔄 Lade Inbox neu (Strg+Shift+R)');
  console.log('='.repeat(60));
}

createEmailAddresses()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌', err);
    process.exit(1);
  });
