// Temporäres Script um die korrupten Timestamp-Felder in Approvals zu reparieren
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, Timestamp, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  // Firebase config hier einfügen
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixApprovalTimestamps() {
  try {
    console.log('🔧 Starte Reparatur der Approval Timestamps...');
    
    const approvalsRef = collection(db, 'approvals');
    const snapshot = await getDocs(approvalsRef);
    
    console.log(`📊 Gefunden: ${snapshot.docs.length} Approvals`);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const needsUpdate = {};
      
      // Prüfe createdAt
      if (data.createdAt === 'toimestamp' || typeof data.createdAt === 'string') {
        needsUpdate.createdAt = Timestamp.now(); // Setze auf jetzt als Fallback
        console.log(`🔧 Repariere createdAt für ${docSnap.id}`);
      }
      
      // Prüfe updatedAt
      if (data.updatedAt === 'toimestamp' || typeof data.updatedAt === 'string') {
        needsUpdate.updatedAt = Timestamp.now();
        console.log(`🔧 Repariere updatedAt für ${docSnap.id}`);
      }
      
      // Update nur wenn nötig
      if (Object.keys(needsUpdate).length > 0) {
        await updateDoc(doc(db, 'approvals', docSnap.id), needsUpdate);
        console.log(`✅ ${docSnap.id} aktualisiert`);
      }
    }
    
    console.log('🎉 Alle Approval Timestamps repariert!');
  } catch (error) {
    console.error('❌ Fehler beim Reparieren:', error);
  }
}

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
  fixApprovalTimestamps().then(() => process.exit(0));
}

module.exports = { fixApprovalTimestamps };