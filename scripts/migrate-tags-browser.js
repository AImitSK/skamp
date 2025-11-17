/**
 * CRM Tags Migration Script - Browser Console Version
 *
 * EINFACHSTE METHODE:
 * 1. In der App einloggen (als User der Ziel-Organization)
 * 2. Browser Console öffnen (F12)
 * 3. Dieses Script kopieren und einfügen
 * 4. Enter drücken
 *
 * Das Script nutzt deine aktuelle Auth-Session!
 */

(async function migrateTags() {
  console.log('🏷️  CRM Tags Migration (Browser Console)\n');

  // Firebase aus der App holen
  const { db } = await import('/src/lib/firebase/config.ts');
  const { collection, getDocs, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

  // Ziel-organizationId aus localStorage
  const targetOrgId = localStorage.getItem('currentOrganizationId');

  if (!targetOrgId) {
    console.error('❌ Keine currentOrganizationId im localStorage gefunden!');
    console.log('   Bitte sicherstellen, dass du eingeloggt bist.\n');
    return;
  }

  console.log(`🎯 Ziel-Organization: ${targetOrgId}\n`);
  console.log('🔍 Analysiere Tags...\n');

  try {
    // Lade alle Tags
    const tagsSnapshot = await getDocs(collection(db, 'tags'));
    const plans = [];

    tagsSnapshot.forEach((docSnap) => {
      const tag = { id: docSnap.id, ...docSnap.data() };
      const orgId = tag.organizationId;

      // Prüfe ob organizationId aussieht wie eine userId
      const looksLikeUserId = orgId &&
        !orgId.startsWith('org_') &&
        !orgId.startsWith('organization_') &&
        orgId.length > 20;

      if (looksLikeUserId) {
        plans.push({
          tag,
          currentOrgId: orgId,
          reason: 'userId als organizationId gefunden'
        });
      }
    });

    if (plans.length === 0) {
      console.log('✅ Keine Tags gefunden, die migriert werden müssen!\n');
      return;
    }

    console.log(`📊 Gefunden: ${plans.length} Tags zum Migrieren:\n`);
    plans.forEach((plan, i) => {
      console.log(`${i + 1}. "${plan.tag.name}" (${plan.tag.color})`);
      console.log(`   Von: ${plan.currentOrgId}`);
      console.log(`   Nach: ${targetOrgId}\n`);
    });

    // Bestätigung
    const confirmed = confirm(`Möchtest du ${plans.length} Tags zu Organization "${targetOrgId}" migrieren?`);

    if (!confirmed) {
      console.log('❌ Migration abgebrochen.\n');
      return;
    }

    // Migration durchführen
    console.log('🚀 Starte Migration...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const plan of plans) {
      try {
        const tagRef = doc(db, 'tags', plan.tag.id);
        await updateDoc(tagRef, {
          organizationId: targetOrgId,
          updatedAt: serverTimestamp(),
          _migratedFrom: plan.currentOrgId,
          _migratedAt: serverTimestamp()
        });

        console.log(`✅ "${plan.tag.name}" migriert`);
        successCount++;
      } catch (error) {
        console.error(`❌ Fehler bei "${plan.tag.name}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Migration abgeschlossen:`);
    console.log(`   Erfolgreich: ${successCount}`);
    console.log(`   Fehler: ${errorCount}\n`);

    if (successCount > 0) {
      console.log('💡 Lade die Seite neu, um die migrierten Tags zu sehen!\n');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    console.error('\nDetails:', error.message);
    console.error('\nStack:', error.stack);
  }
})();
