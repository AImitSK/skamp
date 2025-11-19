// scripts/check-project-mailbox.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db = getFirestore();

async function checkProjectMailbox() {
  try {
    const projectId = 'BeePy8kt5v9hoDVVf5o9';

    console.log(`🔍 Searching for project mailbox with projectId: ${projectId}`);

    const snapshot = await db
      .collection('inbox_project_mailboxes')
      .where('projectId', '==', projectId)
      .get();

    if (snapshot.empty) {
      console.log('❌ No mailbox found!');
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('\n✅ Found mailbox:');
      console.log('Document ID:', doc.id);
      console.log('Project ID:', data.projectId);
      console.log('Inbox Address:', data.inboxAddress);
      console.log('Organization ID:', data.organizationId);
      console.log('Status:', data.status);
      console.log('\nFull data:', JSON.stringify(data, null, 2));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProjectMailbox();
