import { adminDb } from '../src/lib/firebase/admin-init';

(async () => {
  const folderId = 'eGCEgZmWi4ws8XLfYxg3';
  const correctColor = '#005fab'; // Gleiche Farbe wie Projekte/Branding

  await adminDb.collection('media_folders').doc(folderId).update({
    color: correctColor
  });

  console.log(`✅ Email-Anhänge Ordner Farbe geändert: ${correctColor}`);
  console.log('   (Gleiche Farbe wie Projekte/Branding)');

  process.exit(0);
})();
