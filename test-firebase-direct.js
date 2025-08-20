// test-firebase-direct.js - Direkter Test der Firebase Services ohne Next.js
const path = require('path');

// Simuliere Next.js environment
process.env.NODE_ENV = 'development';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "AIzaSyBORAYQIgv1lqIW3XgdD8ZCw9Ls-b8vq3Q";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = "skamp-prod.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "skamp-prod";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = "skamp-prod.firebasestorage.app";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "717270007067";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = "1:717270007067:web:8f6c3b8b8a8e4e4a";

console.log('🧪 DIREKTER FIREBASE-SERVICE TEST');
console.log('📋 Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  hasFirebaseConfig: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  hasStorageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
});

async function testFirebaseServices() {
  try {
    console.log('\n🔥 Importiere Firebase Config...');
    
    // Teste Firebase Config Import
    const { db, storage } = require('./src/lib/firebase/config.ts');
    console.log('✅ Firebase Config erfolgreich importiert');
    console.log('✅ Database:', !!db);
    console.log('✅ Storage:', !!storage);
    
    console.log('\n📤 Teste Media Service...');
    const { mediaService } = require('./src/lib/firebase/media-service.ts');
    console.log('✅ Media Service erfolgreich importiert');
    
    // Teste Buffer Upload (mit kleinem Test-Buffer)
    console.log('\n📊 Teste Buffer Upload...');
    const testBuffer = Buffer.from('Test PDF Content - This is a mock PDF for testing', 'utf8');
    const fileName = 'test-direct-firebase.pdf';
    const organizationId = 'test_org_456';
    
    console.log('📋 Upload Parameter:', {
      bufferSize: testBuffer.length,
      fileName,
      organizationId,
      contentType: 'application/pdf'
    });
    
    const uploadResult = await mediaService.uploadBuffer(
      testBuffer,
      fileName,
      'application/pdf',
      organizationId,
      'pdf-versions',
      { userId: 'test_user_789' }
    );
    
    console.log('✅ Buffer Upload erfolgreich!');
    console.log('📋 Upload Result:', {
      downloadUrl: uploadResult.downloadUrl,
      fileSize: uploadResult.fileSize,
      fileName: uploadResult.fileName
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Firebase Service Test fehlgeschlagen:', error);
    console.error('❌ Error Details:', error.message);
    if (error.stack) {
      console.error('❌ Stack Trace:', error.stack);
    }
    return false;
  }
}

// Test ausführen
testFirebaseServices().then((success) => {
  if (success) {
    console.log('\n🎉 ALLE FIREBASE TESTS ERFOLGREICH!');
    console.log('➡️  PDF-API sollte jetzt funktionieren');
    process.exit(0);
  } else {
    console.log('\n❌ FIREBASE TESTS FEHLGESCHLAGEN!');
    console.log('➡️  PDF-API wird nicht funktionieren');
    process.exit(1);
  }
}).catch((error) => {
  console.error('\n💥 UNERWARTETER FEHLER:', error);
  process.exit(1);
});