// Debug script to check Firestore data
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit, where } = require('firebase/firestore');

// Firebase config from .env
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function debugFirestore() {
  try {
    console.log('🔧 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('\n📧 Checking email_addresses collection...');
    const emailAddressesRef = collection(db, 'email_addresses');
    const emailAddressesSnap = await getDocs(query(emailAddressesRef, limit(5)));
    
    if (emailAddressesSnap.empty) {
      console.log('❌ No email addresses found');
    } else {
      console.log(`✅ Found ${emailAddressesSnap.size} email addresses:`);
      emailAddressesSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.email} (org: ${data.organizationId})`);
      });
    }
    
    console.log('\n📨 Checking email_messages collection...');
    const emailMessagesRef = collection(db, 'email_messages');
    const emailMessagesSnap = await getDocs(query(emailMessagesRef, limit(5)));
    
    if (emailMessagesSnap.empty) {
      console.log('❌ No email messages found');
    } else {
      console.log(`✅ Found ${emailMessagesSnap.size} email messages:`);
      emailMessagesSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: "${data.subject}" (org: ${data.organizationId})`);
        console.log(`    textContent: ${data.textContent ? data.textContent.substring(0, 50) + '...' : 'MISSING'}`);
        console.log(`    htmlContent: ${data.htmlContent ? 'present' : 'MISSING'}`);
        console.log(`    folder: ${data.folder}`);
      });
    }
    
    console.log('\n🧵 Checking email_threads collection...');
    const emailThreadsRef = collection(db, 'email_threads');
    const emailThreadsSnap = await getDocs(query(emailThreadsRef, limit(5)));
    
    if (emailThreadsSnap.empty) {
      console.log('❌ No email threads found');
    } else {
      console.log(`✅ Found ${emailThreadsSnap.size} email threads:`);
      emailThreadsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: "${data.subject}" (org: ${data.organizationId})`);
        console.log(`    messageCount: ${data.messageCount}`);
        console.log(`    unreadCount: ${data.unreadCount}`);
      });
    }
    
    // Check for specific organization
    const orgId = 'wVa3cJ7YhYUCQcbwZLLVB6w5Xs23';
    console.log(`\n🏢 Checking data for organization: ${orgId}...`);
    
    const orgEmailsSnap = await getDocs(query(
      collection(db, 'email_messages'),
      where('organizationId', '==', orgId),
      limit(3)
    ));
    
    if (orgEmailsSnap.empty) {
      console.log('❌ No email messages found for this organization');
    } else {
      console.log(`✅ Found ${orgEmailsSnap.size} emails for organization:`);
      orgEmailsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: "${data.subject}"`);
        console.log(`    textContent: ${data.textContent ? data.textContent.substring(0, 100) + '...' : 'MISSING'}`);
        console.log(`    htmlContent: ${data.htmlContent ? 'present (' + data.htmlContent.length + ' chars)' : 'MISSING'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugFirestore();