// Test ob domainServiceEnhanced.getAll() funktioniert
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testDomainService(orgId: string) {
  console.log(`\n🧪 Test: domainServiceEnhanced.getAll('${orgId}')\n`);

  try {
    // Import the service (client-side)
    const { domainServiceEnhanced } = await import('../src/lib/firebase/domain-service-enhanced');

    const domains = await domainServiceEnhanced.getAll(orgId);

    console.log(`✅ Erfolgreich! Gefunden: ${domains.length} Domain(s)\n`);

    domains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.domain}`);
      console.log(`   ID: ${domain.id}`);
      console.log(`   Status: ${domain.status}`);
      console.log(`   Verifiziert: ${domain.verifiedAt ? 'JA' : 'Nein'}`);
      console.log(`   Standard: ${domain.isDefault ? 'JA' : 'Nein'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Fehler beim Laden:', error);
  }
}

const orgId = process.argv[2] || 'hJ4gTE9Gm35epoub0zIU';
testDomainService(orgId).then(() => process.exit(0));
