/**
 * Debug Script: Check Storage Usage
 *
 * Zeigt detaillierte Storage-Nutzung für eine Organization
 *
 * Usage: npx tsx scripts/check-storage-usage.ts YOUR_ORG_ID
 */

import * as admin from 'firebase-admin';

// Firebase Admin initialisieren
const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
if (!serviceAccount) {
  throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable not set');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

async function checkStorageUsage(organizationId: string) {
  console.log(`\n📊 Checking storage usage for organization: ${organizationId}\n`);

  try {
    // Liste alle Files
    const [files] = await bucket.getFiles({
      prefix: `organizations/${organizationId}/`,
    });

    console.log(`📁 Total files found: ${files.length}\n`);

    if (files.length === 0) {
      console.log('⚠️  No files found in storage for this organization.\n');
      return;
    }

    // Gruppiere nach Ordner
    const filesByFolder: Record<string, Array<{ name: string; size: number }>> = {};
    let totalBytes = 0;

    for (const file of files) {
      const size = parseInt(file.metadata.size || '0', 10);
      totalBytes += size;

      // Extrahiere Ordner-Pfad
      const pathParts = file.name.split('/');
      const folder = pathParts.slice(0, -1).join('/') || 'root';

      if (!filesByFolder[folder]) {
        filesByFolder[folder] = [];
      }

      filesByFolder[folder].push({
        name: file.name,
        size,
      });
    }

    // Zeige Ergebnisse
    console.log('📂 Files by folder:\n');
    for (const [folder, files] of Object.entries(filesByFolder)) {
      const folderSize = files.reduce((sum, f) => sum + f.size, 0);
      console.log(`  ${folder}/`);
      console.log(`    Files: ${files.length}`);
      console.log(`    Size: ${formatBytes(folderSize)}`);

      // Zeige Top 5 größte Files
      const topFiles = files.sort((a, b) => b.size - a.size).slice(0, 5);
      console.log(`    Top files:`);
      topFiles.forEach(f => {
        const fileName = f.name.split('/').pop() || f.name;
        console.log(`      - ${fileName}: ${formatBytes(f.size)}`);
      });
      console.log('');
    }

    // Zusammenfassung
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Total Storage Usage:\n`);
    console.log(`  Bytes:      ${totalBytes.toLocaleString('de-DE')}`);
    console.log(`  KB:         ${(totalBytes / 1024).toFixed(2)}`);
    console.log(`  MB:         ${(totalBytes / (1024 ** 2)).toFixed(2)}`);
    console.log(`  GB:         ${(totalBytes / (1024 ** 3)).toFixed(2)}`);
    console.log(`  Files:      ${files.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Vergleich mit Firestore
    const usageDoc = await admin.firestore()
      .collection('organizations')
      .doc(organizationId)
      .collection('usage')
      .doc('current')
      .get();

    if (usageDoc.exists) {
      const storedUsage = usageDoc.data()?.storageUsed || 0;
      console.log(`💾 Firestore stored usage: ${formatBytes(storedUsage)}`);

      if (storedUsage !== totalBytes) {
        console.log(`⚠️  MISMATCH: Firestore shows ${formatBytes(storedUsage)}, but actual is ${formatBytes(totalBytes)}`);
        console.log(`   Difference: ${formatBytes(Math.abs(totalBytes - storedUsage))}`);
      } else {
        console.log(`✅ Firestore usage matches actual storage!`);
      }
    } else {
      console.log(`⚠️  No usage document found in Firestore.`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main
const organizationId = process.argv[2];

if (!organizationId) {
  console.error('❌ Usage: npx tsx scripts/check-storage-usage.ts YOUR_ORG_ID');
  process.exit(1);
}

checkStorageUsage(organizationId)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
