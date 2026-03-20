// Fixt alle fehlenden Felder in Publications

require('../src/genkit-loader.js');

import { adminDb } from '../src/lib/firebase/admin-init';

async function fix() {
  const TAG_ID = 'ymY4Gh9R7F150Js9R2xt';

  const snapshot = await adminDb.collection('publications')
    .where('tagIds', 'array-contains', TAG_ID)
    .get();

  console.log('Fixe', snapshot.size, 'Publications...\n');

  let fixed = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates: Record<string, any> = {};

    // 1. geographicScope hinzufügen
    if (!data.geographicScope) {
      const distribution = (data.metrics?.targetAudience || '').toLowerCase();
      if (distribution.includes('national') || distribution.includes('deutschland')) {
        updates.geographicScope = 'national';
      } else if (distribution.includes('lokal') || distribution.includes('stadt')) {
        updates.geographicScope = 'local';
      } else {
        updates.geographicScope = 'regional';
      }
    }

    // 2. socialMediaUrls aus socialMedia erstellen
    if (!data.socialMediaUrls && data.socialMedia && data.socialMedia.length > 0) {
      updates.socialMediaUrls = data.socialMedia.map((sm: any) => ({
        platform: sm.platform,
        url: sm.url,
      }));
    }

    // 3. verified Flag falls fehlend
    if (data.verified === undefined) {
      updates.verified = false;
    }

    // 4. isDeleted Flag falls fehlend
    if (data.isDeleted === undefined) {
      updates.isDeleted = false;
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log('✓', data.title);
      console.log('  Updates:', Object.keys(updates).join(', '));
      fixed++;
    }
  }

  console.log('\n═══════════════════════════════');
  console.log('Gefixt:', fixed, 'Publications');
}

fix().then(() => process.exit(0));
