// scripts/debug-media-folders.ts
// Debug-Script um zu sehen, welche Ordner in Firestore existieren

import { adminDb } from '../src/lib/firebase/admin-init';

async function debugMediaFolders() {
  console.log('🔍 Debugging Media Folders...\n');

  try {
    // Hole ALLE media_folders
    const foldersRef = adminDb.collection('media_folders');
    const snapshot = await foldersRef.get();

    console.log(`📁 Total folders in database: ${snapshot.size}\n`);

    // Gruppiere nach Organization
    const byOrg = new Map<string, any[]>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const orgId = data.organizationId || 'unknown';

      if (!byOrg.has(orgId)) {
        byOrg.set(orgId, []);
      }

      byOrg.get(orgId)!.push({
        id: doc.id,
        name: data.name,
        createdBy: data.createdBy,
        parentFolderId: data.parentFolderId,
        color: data.color,
      });
    });

    // Zeige pro Organization
    for (const [orgId, folders] of byOrg.entries()) {
      console.log(`\n📦 Organization: ${orgId}`);
      console.log(`   Folders: ${folders.length}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      folders.forEach(folder => {
        console.log(`   📁 ${folder.name}`);
        console.log(`      ID: ${folder.id}`);
        console.log(`      createdBy: ${folder.createdBy}`);
        console.log(`      parentFolderId: ${folder.parentFolderId || '(root)'}`);
        console.log(`      color: ${folder.color || '(none)'}`);
        console.log('');
      });
    }

    // Suche speziell nach "Email-Anhänge"
    console.log('\n🔍 Searching for "Email-Anhänge" folders...');
    const emailFoldersQuery = await foldersRef
      .where('name', '==', 'Email-Anhänge')
      .get();

    if (emailFoldersQuery.empty) {
      console.log('❌ No "Email-Anhänge" folders found!');
    } else {
      console.log(`✅ Found ${emailFoldersQuery.size} "Email-Anhänge" folder(s):`);
      emailFoldersQuery.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   📁 ${doc.id}`);
        console.log(`      Organization: ${data.organizationId}`);
        console.log(`      createdBy: ${data.createdBy}`);
        console.log(`      parentFolderId: ${data.parentFolderId || '(root)'}`);
        console.log('');
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run
debugMediaFolders()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
