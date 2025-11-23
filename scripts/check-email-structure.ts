// scripts/check-email-structure.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT!);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkEmailStructure() {
  const snap = await db.collection('email_addresses')
    .where('email', '==', 'hj4gte9g@celeropress.com')
    .limit(1)
    .get();

  if (!snap.empty) {
    const data = snap.docs[0].data();
    console.log(JSON.stringify(data, null, 2));
  }
}

checkEmailStructure().then(() => process.exit(0));
